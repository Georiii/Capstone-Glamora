// Shared admin dashboard utilities

const getApiBaseUrl = () => {
  if (window.location.hostname.includes('netlify.app') || window.location.hostname.includes('glamoraapp')) {
    return 'https://glamora-g5my.onrender.com';
  }
  return 'https://glamora-g5my.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();
console.log('Admin API Base URL:', API_BASE_URL);

const api = {
  getAuthToken: async () => {
    let token = localStorage.getItem('adminToken');

    if (!token || token === 'admin_token_placeholder' || token === 'mock-token' || token.includes('mock')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        if (!response.ok) {
          console.error('Admin auto-login failed with status', response.status);
          return null;
        }

        const data = await response.json();
        if (!data.token) {
          console.error('Admin auto-login failed: no token returned');
          return null;
        }

        token = data.token;
        localStorage.setItem('adminToken', token);
        if (data.user) {
          localStorage.setItem('adminUser', JSON.stringify(data.user));
        }
        console.log('Admin auto-login successful');
      } catch (error) {
        console.error('Admin auto-login error:', error);
        return null;
      }
    }

    return token;
  },

  request: async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;

    let token = await api.getAuthToken();
    if (!token) {
      const err = new Error('Authentication failed: Please log in again.');
      err.status = 401;
      err.needsLogin = true;
      throw err;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, { ...config, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorPayload;
        try {
          errorPayload = await response.json();
        } catch {
          errorPayload = { message: await response.text() };
        }

        if (response.status === 401) {
          console.warn('Token invalid, clearing and retrying...');
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          token = await api.getAuthToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            const retryResponse = await fetch(url, { ...config, headers });
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
            let retryPayload;
            try {
              retryPayload = await retryResponse.json();
            } catch {
              retryPayload = { message: await retryResponse.text() };
            }
            const retryError = new Error(retryPayload.message || 'API request failed');
            retryError.status = retryResponse.status;
            retryError.response = retryPayload;
            throw retryError;
          }
        }

        const error = new Error(errorPayload?.message || 'API request failed');
        error.status = response.status;
        error.response = errorPayload;
        throw error;
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      if (
        error.name === 'AbortError' ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('network')
      ) {
        const friendlyError = new Error('Cannot connect to backend server. Please try again later.');
        friendlyError.isConnectionError = true;
        friendlyError.originalError = error;
        throw friendlyError;
      }
      throw error;
    }
  },

  getReports: async () => {
    try {
      const data = await api.request('/api/admin/reports?limit=1000');
      return Array.isArray(data.reports) ? data.reports : [];
    } catch (error) {
      console.error('Failed to load reports:', error);
      return [];
    }
  },

  getMetrics: async () => {
    try {
      const metrics = await api.request('/api/admin/metrics');
      return {
        totalUsers: metrics.totalUsers || 0,
        totalReports: metrics.totalReports || 0,
        activeListings: metrics.activeListings || 0,
        pendingPosts: metrics.pendingPosts || 0
      };
    } catch (error) {
      console.error('Failed to load metrics:', error);
      return {
        totalUsers: 0,
        totalReports: 0,
        activeListings: 0,
        pendingPosts: 0
      };
    }
  },

  getUsers: async (options = {}) => {
    const { page = 1, limit = 100, search = '', role = 'all', status = 'all' } = options;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search,
      role,
      status
    });

    try {
      const data = await api.request(`/api/admin/users?${params.toString()}`);
      return {
        users: Array.isArray(data.users) ? data.users : [],
        total: data.total || 0,
        totalPages: data.totalPages || 1,
        currentPage: data.currentPage || page
      };
    } catch (error) {
      console.error('Failed to load users:', error);
      return { users: [], total: 0, totalPages: 0, currentPage: 1 };
    }
  },

  getAnalytics: async (period = '6months') => {
    try {
      return await api.request(`/api/admin/analytics?period=${period}`);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      return {
        userRegistrations: [],
        marketplaceActivity: [],
        reportsOverTime: [],
        topCategories: [],
        period
      };
    }
  },

  restrictUser: async (reportId, restrictionDuration, restrictionReason) => {
    return api.request(`/api/admin/reports/${reportId}/restrict`, {
      method: 'PUT',
      body: { restrictionDuration, restrictionReason }
    });
  },

  testConnection: async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  getPendingMarketplaceItems: async () => {
    try {
      const data = await api.request('/api/admin/marketplace/pending');
      return Array.isArray(data.items) ? data.items : [];
    } catch (error) {
      if (error.isConnectionError) {
        console.warn('Marketplace pending items unavailable:', error.message);
        return [];
      }
      console.error('Failed to load pending marketplace items:', error);
      return [];
    }
  },

  approveMarketplaceItem: async (itemId) => {
    return api.request(`/api/admin/marketplace/${itemId}/approve`, { method: 'PUT' });
  },

  rejectMarketplaceItem: async (itemId, reason) => {
    return api.request(`/api/admin/marketplace/${itemId}/reject`, {
      method: 'PUT',
      body: { reason }
    });
  },

  getPolicies: async () => {
    try {
      const data = await api.request('/api/admin/policies');
      return data?.policies || {};
    } catch (error) {
      console.error('Failed to load policies:', error);
      return {};
    }
  },

  updatePolicy: async (key, content) => {
    return api.request(`/api/admin/policies/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { content }
    });
  }
};

class AdminUtils {
  static _lastMetricsSnapshot = null;
  static _lastReportsToday = null;

  static _stableReplacer(key, value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((acc, currentKey) => {
        acc[currentKey] = value[currentKey];
        return acc;
      }, {});
    }
    return value;
  }

  static serializeData(data) {
    try {
      return JSON.stringify(data, AdminUtils._stableReplacer);
    } catch {
      return '';
    }
  }

  static deepEqual(a, b) {
    return AdminUtils.serializeData(a) === AdminUtils.serializeData(b);
  }

  static showMessage(message, type = 'info', duration = 5000) {
    document.querySelectorAll('.message').forEach((msg) => msg.remove());

    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;

    const mainContent = document.querySelector('.main-content') || document.body;
    mainContent.insertBefore(messageEl, mainContent.firstChild);

    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, duration);
  }

  static checkAuthentication() {
    const token = localStorage.getItem('adminToken');
    if (
      !token ||
      token === 'mock-token' ||
      token.includes('mock') ||
      token === 'admin_token_placeholder'
    ) {
      if (!window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
      }
      return false;
    }
    return true;
  }

  static handleLogout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'login.html';
  }

  static async updateMetrics() {
    const totalUsersEl = document.getElementById('totalUsers');
    const reportsTodayEl = document.getElementById('reportsToday');
    const activeListingEl = document.getElementById('activeListing');

    try {
      const metrics = await api.getMetrics();
      const snapshot = {
        totalUsers: metrics?.totalUsers ?? 0,
        totalReports: metrics?.totalReports ?? 0,
        activeListings: metrics?.activeListings ?? metrics?.pendingPosts ?? 0
      };

      if (!AdminUtils._lastMetricsSnapshot || !AdminUtils.deepEqual(AdminUtils._lastMetricsSnapshot, snapshot)) {
        if (totalUsersEl) totalUsersEl.textContent = snapshot.totalUsers;
        if (activeListingEl) activeListingEl.textContent = snapshot.activeListings;
        AdminUtils._lastMetricsSnapshot = snapshot;
      }

      if (reportsTodayEl) {
        let reportsTodayValue = snapshot.totalReports ?? 0;
        try {
          const reports = await api.getReports();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          reportsTodayValue = reports.filter((report) => {
            const reportDate = new Date(report.createdAt || report.date || report.timestamp);
            reportDate.setHours(0, 0, 0, 0);
            return reportDate.getTime() === today.getTime();
          }).length;
        } catch (error) {
          console.error('Failed to compute reports today:', error);
        }

        if (AdminUtils._lastReportsToday !== reportsTodayValue) {
          reportsTodayEl.textContent = reportsTodayValue;
          AdminUtils._lastReportsToday = reportsTodayValue;
        }
      }
    } catch (error) {
      console.error('Error updating metrics:', error);
      if (!AdminUtils._lastMetricsSnapshot) {
        if (totalUsersEl) totalUsersEl.textContent = '0';
        if (activeListingEl) activeListingEl.textContent = '0';
      }
      if (!AdminUtils._lastReportsToday && reportsTodayEl) {
        reportsTodayEl.textContent = '0';
      }
    }
  }

  static setupModalHandlers() {
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
      }
    });

    document.querySelectorAll('.close').forEach((closeBtn) => {
      closeBtn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          modal.style.display = 'none';
        }
      });
    });
  }

  static setupLogoutHandler() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        AdminUtils.handleLogout();
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.location.pathname.includes('login.html')) {
    const isAuthenticated = AdminUtils.checkAuthentication();

    if (isAuthenticated) {
      try {
        await AdminUtils.updateMetrics();
        AdminUtils.setupModalHandlers();
        AdminUtils.setupLogoutHandler();

        setInterval(async () => {
          await AdminUtils.updateMetrics();
        }, 5000);
      } catch (error) {
        console.error('Dashboard initialization error:', error);
      }
    }
  }
});

window.AdminUtils = AdminUtils;
window.api = api;
