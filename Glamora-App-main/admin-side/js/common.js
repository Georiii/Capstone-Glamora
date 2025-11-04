// Common JavaScript functionality shared across all pages

// API Configuration - Dynamically detect environment
const getApiBaseUrl = () => {
  // If running on Netlify (production), use Render backend
  if (window.location.hostname.includes('netlify.app') || window.location.hostname.includes('glamoraapp')) {
    return 'https://glamora-g5my.onrender.com';
  }
  
  // IMPORTANT: Admin dashboard should use Render backend to see items posted by mobile app
  // Mobile app uses Render backend, so admin must use the same backend to see pending items
  return 'https://glamora-g5my.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();
console.log('🔗 Admin API Base URL:', API_BASE_URL);

// API Helper Functions
const api = {
    // Get authentication token (for admin authentication)
    getAuthToken: async () => {
        let token = localStorage.getItem('adminToken');
        
        // If no token or token is invalid placeholder/mock, attempt login
        if (!token || token === 'admin_token_placeholder' || token === 'mock-token' || token.includes('mock')) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: 'admin',
                        password: 'admin123'
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.token) {
                        token = data.token;
                        localStorage.setItem('adminToken', token);
                        if (data.user) {
                            localStorage.setItem('adminUser', JSON.stringify(data.user));
                        }
                        console.log('✅ Admin auto-login successful');
                    } else {
                        console.error('❌ Admin login failed: No token in response');
                        return null;
                    }
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
                    console.error('❌ Admin login failed:', errorData.message || response.statusText);
                    return null;
                }
            } catch (error) {
                console.error('❌ Admin login error:', error);
                return null;
            }
        }
        
        return token;
    },

    // Make authenticated API requests
    request: async (endpoint, options = {}) => {
        const url = `${API_BASE_URL}${endpoint}`;
        
        // Get authentication token
        let token = await api.getAuthToken();
        if (!token) {
            const error = new Error('Authentication failed: Please log in to continue');
            error.status = 401;
            error.needsLogin = true;
            throw error;
        }
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const config = { ...defaultOptions, ...options };
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    const text = await response.text();
                    errorData = { message: text || `HTTP error! status: ${response.status}` };
                }
                
                // If token is invalid, clear it and retry once
                if (response.status === 401 && localStorage.getItem('adminToken')) {
                    console.log('🔄 Token expired or invalid, refreshing...');
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminUser');
                    const newToken = await api.getAuthToken();
                    if (newToken) {
                        config.headers['Authorization'] = `Bearer ${newToken}`;
                        const retryResponse = await fetch(url, config);
                        if (!retryResponse.ok) {
                            const retryErrorData = await retryResponse.json().catch(() => ({ message: 'Request failed' }));
                            const error = new Error(retryErrorData.message || 'API request failed');
                            error.status = retryResponse.status;
                            error.response = retryErrorData;
                            throw error;
                        }
                        const retryData = await retryResponse.json();
                        return retryData;
                    }
                }
                
                const error = new Error(errorData.message || 'API request failed');
                error.status = response.status;
                error.statusText = response.statusText;
                error.response = errorData;
                throw error;
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            // Handle network/connection errors gracefully
            if (error.name === 'AbortError' || error.message.includes('Failed to fetch') || 
                error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('network')) {
                const friendlyError = new Error('Cannot connect to backend server. Please ensure the server is running.');
                friendlyError.isConnectionError = true;
                friendlyError.originalError = error;
                throw friendlyError;
            }
            throw error;
        }
    },

    // Fetch reports from backend (FIXED: use correct endpoint)
    getReports: async () => {
        try {
            const data = await api.request('/api/admin/reports?limit=1000');
            // Backend returns { reports: [...], total, ... }
            return Array.isArray(data.reports) ? data.reports : [];
        } catch (error) {
            console.error('❌ Failed to fetch reports from API:', error);
            // NO MOCK DATA FALLBACK - return empty array
            return [];
        }
    },

    // Fetch metrics from backend
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
            console.error('❌ Failed to fetch metrics:', error);
            // NO MOCK DATA FALLBACK - return zeros
            return {
                totalUsers: 0,
                totalReports: 0,
                activeListings: 0,
                pendingPosts: 0
            };
        }
    },

    // Fetch users from backend
    getUsers: async (options = {}) => {
        try {
            const { page = 1, limit = 100, search = '', role = 'all', status = 'all' } = options;
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search,
                role,
                status
            });
            const data = await api.request(`/api/admin/users?${params}`);
            return {
                users: Array.isArray(data.users) ? data.users : [],
                total: data.total || 0,
                totalPages: data.totalPages || 1,
                currentPage: data.currentPage || page
            };
        } catch (error) {
            console.error('❌ Failed to fetch users:', error);
            // NO MOCK DATA FALLBACK - return empty
            return { users: [], total: 0, totalPages: 0, currentPage: 1 };
        }
    },

    // Fetch analytics from backend
    getAnalytics: async (period = '6months') => {
        try {
            const data = await api.request(`/api/admin/analytics?period=${period}`);
            return data;
        } catch (error) {
            console.error('❌ Failed to fetch analytics:', error);
            // NO MOCK DATA FALLBACK - return empty structure
            return {
                userRegistrations: [],
                marketplaceActivity: [],
                reportsOverTime: [],
                topCategories: [],
                period
            };
        }
    },

    // Test API connection
    testConnection: async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(`${API_BASE_URL}/health`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return false;
        }
    },

    // Restrict user account
    restrictUser: async (reportId, restrictionDuration, restrictionReason) => {
        try {
            const data = await api.request(`/api/admin/reports/${reportId}/restrict`, {
                method: 'PUT',
                body: {
                    restrictionDuration,
                    restrictionReason
                }
            });
            return data;
        } catch (error) {
            console.error('❌ Failed to restrict user:', error);
            throw error;
        }
    },

    // Get pending marketplace items for moderation
    getPendingMarketplaceItems: async () => {
        try {
            const data = await api.request('/api/admin/marketplace/pending');
            const items = data.items || [];
            return items;
        } catch (error) {
            // Check if it's a connection error
            if (error.isConnectionError || error.message.includes('Cannot connect to backend')) {
                console.warn('⚠️ Cannot connect to backend server. Returning empty array.');
                return [];
            }
            console.error('❌ Failed to fetch pending items:', error);
            return [];
        }
    },

    // Approve marketplace item
    approveMarketplaceItem: async (itemId) => {
        try {
            const data = await api.request(`/api/admin/marketplace/${itemId}/approve`, {
                method: 'PUT'
            });
            return data;
        } catch (error) {
            console.error('❌ Failed to approve item:', error);
            throw error;
        }
    },

    // Reject marketplace item
    rejectMarketplaceItem: async (itemId, reason) => {
        try {
            const data = await api.request(`/api/admin/marketplace/${itemId}/reject`, {
                method: 'PUT',
                body: { reason }
            });
            return data;
        } catch (error) {
            console.error('❌ Failed to reject item:', error);
            throw error;
        }
    }
};

// Common utility functions
class AdminUtils {
    static showMessage(message, type = 'info', duration = 5000) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;

        // Insert at top of main content or body
        const mainContent = document.querySelector('.main-content') || document.body;
        mainContent.insertBefore(messageEl, mainContent.firstChild);

        // Auto remove after duration
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, duration);
    }

    static checkAuthentication() {
        const token = localStorage.getItem('adminToken');
        
        // Check if we're already on the login page to prevent redirect loops
        if (window.location.pathname.includes('login.html')) {
            return false;
        }
        
        // If no token or token is mock/placeholder, redirect to login
        if (!token || token === 'mock-token' || token.includes('mock') || token === 'admin_token_placeholder') {
            // Only redirect if not already on login page
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

    // UPDATED: Fetch metrics from backend instead of using mock data
    static async updateMetrics() {
        const totalUsersEl = document.getElementById('totalUsers');
        const reportsTodayEl = document.getElementById('reportsToday');
        const activeListingEl = document.getElementById('activeListing');

        // Show loading state
        if (totalUsersEl) totalUsersEl.textContent = '...';
        if (reportsTodayEl) reportsTodayEl.textContent = '...';
        if (activeListingEl) activeListingEl.textContent = '...';

        try {
            // Fetch metrics from backend
            const metrics = await api.getMetrics();
            
            // Update UI with real data
            if (totalUsersEl) totalUsersEl.textContent = metrics.totalUsers || 0;
            
            // Calculate reports today (reports created today)
            if (reportsTodayEl) {
                try {
                    const reports = await api.getReports();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const reportsToday = reports.filter(report => {
                        const reportDate = new Date(report.createdAt || report.date);
                        reportDate.setHours(0, 0, 0, 0);
                        return reportDate.getTime() === today.getTime();
                    }).length;
                    reportsTodayEl.textContent = reportsToday;
                } catch (err) {
                    console.error('Error fetching reports today:', err);
                    reportsTodayEl.textContent = metrics.totalReports || 0;
                }
            }
            
            if (activeListingEl) activeListingEl.textContent = metrics.activeListings || metrics.pendingPosts || 0;
        } catch (error) {
            console.error('❌ Error updating metrics:', error);
            // Show zeros instead of mock data
            if (totalUsersEl) totalUsersEl.textContent = '0';
            if (reportsTodayEl) reportsTodayEl.textContent = '0';
            if (activeListingEl) activeListingEl.textContent = '0';
        }
    }

    static setupModalHandlers() {
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Close modal with X button
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });
    }

    static setupLogoutHandler() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }
}

// Initialize common functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Only run on dashboard pages (not login)
    if (!window.location.pathname.includes('login.html')) {
        // Check authentication before proceeding
        const isAuthenticated = AdminUtils.checkAuthentication();
        
        if (isAuthenticated) {
            // Only initialize dashboard if authenticated
            try {
                await AdminUtils.updateMetrics();
                AdminUtils.setupModalHandlers();
                AdminUtils.setupLogoutHandler();
                
                // Auto-refresh metrics every 5 seconds
                setInterval(async () => {
                    await AdminUtils.updateMetrics();
                }, 5000);
            } catch (error) {
                console.error('Error initializing dashboard:', error);
                // If there's an error, don't redirect - just log it
                // The authentication check already happened, so we're good
            }
        }
        // If not authenticated, checkAuthentication() already handled the redirect
    }
});
