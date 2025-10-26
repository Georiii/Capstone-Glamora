// Common JavaScript functionality shared across all pages

// API Configuration
const API_BASE_URL = 'https://glamora-g5my.onrender.com';

// API Helper Functions
const api = {
    // Get authentication token (for admin authentication)
    getAuthToken: async () => {
        let token = localStorage.getItem('adminToken');
        
        // If no token or token is placeholder, login as admin
        if (!token || token === 'admin_token_placeholder') {
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
                    token = data.token;
                    localStorage.setItem('adminToken', token);
                    console.log('Admin login successful');
                } else {
                    console.error('Admin login failed');
                    return null;
                }
            } catch (error) {
                console.error('Admin login error:', error);
                return null;
            }
        }
        
        return token;
    },

    // Make authenticated API requests
    request: async (endpoint, options = {}) => {
        const url = `${API_BASE_URL}${endpoint}`;
        
        // Get authentication token
        const token = await api.getAuthToken();
        
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
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                // If token is invalid, clear it and retry
                if (response.status === 401 && localStorage.getItem('adminToken')) {
                    console.log('Token expired or invalid, refreshing...');
                    localStorage.removeItem('adminToken');
                    const newToken = await api.getAuthToken();
                    config.headers['Authorization'] = `Bearer ${newToken}`;
                    const retryResponse = await fetch(url, config);
                    const retryData = await retryResponse.json();
                    if (!retryResponse.ok) {
                        throw new Error(retryData.message || 'API request failed');
                    }
                    return retryData;
                }
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // In-memory cache for API responses
    _cache: new Map(),
    _cacheTimestamps: new Map(),
    
    // Get cached data or fetch fresh
    getFromCache: (key, maxAge = 30000) => { // 30 second cache by default
        const cached = api._cache.get(key);
        const timestamp = api._cacheTimestamps.get(key);
        
        if (cached && timestamp && (Date.now() - timestamp) < maxAge) {
            console.log(`📦 Using cached data for ${key}`);
            return cached;
        }
        
        return null;
    },
    
    setCache: (key, data) => {
        api._cache.set(key, data);
        api._cacheTimestamps.set(key, Date.now());
    },
    
    clearCache: (key) => {
        api._cache.delete(key);
        api._cacheTimestamps.delete(key);
    },
    
    // Fetch reports from backend with caching
    getReports: async (useCache = true) => {
        const cacheKey = 'reports';
        
        // Check cache first
        if (useCache) {
            const cached = api.getFromCache(cacheKey, 30000); // 30 second cache
            if (cached) {
                return cached;
            }
        }
        
        try {
            const data = await api.request('/api/report/list');
            console.log('Fetched reports from API:', data);
            // API returns { reports: [...] }, so extract the reports array
            const reports = Array.isArray(data.reports) ? data.reports : [];
            
            // Cache the results
            api.setCache(cacheKey, reports);
            
            return reports;
        } catch (error) {
            console.error('Failed to fetch reports from API, using mock data:', error);
            // Fallback to mock data if API fails
            return mockData.reports;
        }
    },

    // Test API connection
    testConnection: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            return response.ok;
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    },

    // Restrict user account
    restrictUser: async (reportId, restrictionDuration, restrictionReason) => {
        try {
            const data = await api.request(`/api/report/${reportId}/restrict`, {
                method: 'PUT',
                body: {
                    restrictionDuration,
                    restrictionReason
                }
            });
            return data;
        } catch (error) {
            console.error('Failed to restrict user:', error);
            throw error;
        }
    }
};

// Mock data for the admin dashboard (fallback)
const mockData = {
    users: [
        { id: 1, name: 'John Doe', email: 'john.doe@gmail.com', role: 'user', status: 'active', joinDate: '2024-01-15' },
        { id: 2, name: 'Jane Smith', email: 'jane.smith@gmail.com', role: 'admin', status: 'active', joinDate: '2024-01-10' },
        { id: 3, name: 'Mike Johnson', email: 'mike.johnson@gmail.com', role: 'user', status: 'inactive', joinDate: '2024-01-20' },
        { id: 4, name: 'Sarah Wilson', email: 'sarah.wilson@gmail.com', role: 'user', status: 'active', joinDate: '2024-01-25' },
        { id: 5, name: 'David Brown', email: 'david.brown@gmail.com', role: 'user', status: 'active', joinDate: '2024-02-01' },
        { id: 6, name: 'Lisa Davis', email: 'lisa.davis@gmail.com', role: 'user', status: 'inactive', joinDate: '2024-02-05' },
        { id: 7, name: 'Tom Miller', email: 'tom.miller@gmail.com', role: 'user', status: 'active', joinDate: '2024-02-10' },
        { id: 8, name: 'Amy Garcia', email: 'amy.garcia@gmail.com', role: 'user', status: 'active', joinDate: '2024-02-15' }
    ],
    reports: [
        { 
            id: 1, 
            userId: 3, 
            userName: 'Mike Johnson', 
            userEmail: 'mike.johnson@gmail.com', 
            reason: 'Seller scammed me by requesting payment outside the app and never shipped the item.', 
            description: 'User reported for attempting to sell fake designer items', 
            evidencePhotos: [
                { url: 'https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=Evidence+1', filename: 'evidence_1.jpg' },
                { url: 'https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=Evidence+2', filename: 'evidence_2.jpg' }
            ],
            date: '2024-02-20' 
        },
        { 
            id: 2, 
            userId: 6, 
            userName: 'Lisa Davis', 
            userEmail: 'lisa.davis@gmail.com', 
            reason: 'Seller falsely claimed the item was authentic when it wasn\'t.', 
            description: 'User posted misleading information about product authenticity', 
            evidencePhotos: [
                { url: 'https://via.placeholder.com/300x200/45B7D1/FFFFFF?text=Evidence+3', filename: 'evidence_3.jpg' }
            ],
            date: '2024-02-19' 
        },
        { 
            id: 3, 
            userId: 2, 
            userName: 'Jane Smith', 
            userEmail: 'jane.smith@gmail.com', 
            reason: 'Seller made inappropriate/unprofessional comments during the transaction.', 
            description: 'User used offensive language in marketplace comments', 
            evidencePhotos: [],
            date: '2024-02-18' 
        }
    ],
    posts: [
        { id: 1, userId: 1, userName: 'John Doe', content: 'Beautiful vintage dress for sale', status: 'pending' },
        { id: 2, userId: 4, userName: 'Sarah Wilson', content: 'Designer handbag collection', status: 'pending' },
        { id: 3, userId: 5, userName: 'David Brown', content: 'Summer clothing bundle', status: 'pending' },
        { id: 4, userId: 7, userName: 'Tom Miller', content: 'Formal wear collection', status: 'pending' }
    ],
    analytics: {
        userLogins: [3, 12, 25, 20, 22],
        outfitGeneration: [8, 4, 15, 12, 18],
        months: ['April', 'May', 'June', 'July', 'August']
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
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    static handleLogout() {
        localStorage.removeItem('adminToken');
        window.location.href = 'login.html';
    }

    static async updateMetrics() {
        const totalUsersEl = document.getElementById('totalUsers');
        const reportsTodayEl = document.getElementById('reportsToday');
        const activeListingEl = document.getElementById('activeListing');

        try {
            // Fetch real-time metrics from backend
            const data = await api.request('/api/admin/metrics');
            
            if (totalUsersEl) totalUsersEl.textContent = data.totalUsers || 0;
            if (reportsTodayEl) reportsTodayEl.textContent = data.totalReports || 0;
            if (activeListingEl) activeListingEl.textContent = data.activeListings || 0;
            
            console.log('✅ Metrics updated from backend:', data);
        } catch (error) {
            console.error('❌ Failed to fetch metrics, using fallback:', error);
            // Fallback to mock data if API fails
            if (totalUsersEl) totalUsersEl.textContent = mockData.users.length;
            if (reportsTodayEl) reportsTodayEl.textContent = mockData.reports.length;
            if (activeListingEl) activeListingEl.textContent = mockData.posts.length;
        }
    }

    static updateMetricsDisplay(data) {
        const totalUsersEl = document.getElementById('totalUsers');
        const reportsTodayEl = document.getElementById('reportsToday');
        const activeListingEl = document.getElementById('activeListing');

        if (totalUsersEl && data.totalUsers !== undefined) {
            totalUsersEl.textContent = data.totalUsers;
        }
        if (reportsTodayEl && data.totalReports !== undefined) {
            reportsTodayEl.textContent = data.totalReports;
        }
        if (activeListingEl && data.activeListings !== undefined) {
            activeListingEl.textContent = data.activeListings;
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

// Socket.IO Real-Time Connection
let adminSocket = null;

class AdminSocketManager {
    static connect() {
        if (adminSocket && adminSocket.connected) {
            console.log('🔌 Socket already connected');
            return adminSocket;
        }

        try {
            // Initialize Socket.IO connection
            adminSocket = io(API_BASE_URL, {
                auth: {
                    token: localStorage.getItem('adminToken')
                },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });

            adminSocket.on('connect', () => {
                console.log('✅ Admin dashboard connected to real-time server');
            });

            adminSocket.on('disconnect', () => {
                console.log('❌ Admin dashboard disconnected from server');
            });

            // Listen for real-time metric updates
            adminSocket.on('metrics:update', (data) => {
                console.log('📊 Real-time metrics update:', data);
                AdminUtils.updateMetricsDisplay(data);
            });

            // Listen for new user registrations
            adminSocket.on('user:registered', (data) => {
                console.log('👤 New user registered:', data);
                AdminUtils.updateMetrics();
            });

            // Listen for new reports
            adminSocket.on('report:created', (data) => {
                console.log('🚨 New report submitted:', data);
                AdminUtils.updateMetrics();
                if (typeof window.loadReports === 'function') {
                    window.loadReports();
                }
            });

            // Listen for marketplace item submissions
            adminSocket.on('marketplace:item:created', (data) => {
                console.log('🛍️ New marketplace item posted:', data);
                AdminUtils.updateMetrics();
                if (typeof window.loadPendingItems === 'function') {
                    window.loadPendingItems();
                }
            });

            // Listen for marketplace item approvals/rejections
            adminSocket.on('marketplace:item:updated', (data) => {
                console.log('✅ Marketplace item updated:', data);
                AdminUtils.updateMetrics();
            });

            return adminSocket;
        } catch (error) {
            console.error('❌ Socket connection error:', error);
            return null;
        }
    }

    static disconnect() {
        if (adminSocket) {
            adminSocket.disconnect();
            adminSocket = null;
            console.log('🔌 Socket disconnected');
        }
    }

    static emit(event, data) {
        if (adminSocket && adminSocket.connected) {
            adminSocket.emit(event, data);
        } else {
            console.warn('⚠️ Socket not connected, cannot emit event:', event);
        }
    }
}

// Initialize common functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only run on dashboard pages (not login)
    if (!window.location.pathname.includes('login.html')) {
        AdminUtils.checkAuthentication();
        AdminUtils.updateMetrics();
        AdminUtils.setupModalHandlers();
        AdminUtils.setupLogoutHandler();
        
        // Connect to real-time server
        AdminSocketManager.connect();
        
        // Refresh metrics every 30 seconds as backup
        setInterval(() => AdminUtils.updateMetrics(), 30000);
    }
});

// API Integration Functions (for future backend connection)
class AdminAPI {
    static baseURL = 'https://glamora-g5my.onrender.com/api/admin';

    static async login(credentials) {
        try {
            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials)
            });
            return await response.json();
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    static async getUsers() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.baseURL}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Get users error:', error);
            throw error;
        }
    }

    static async updateUser(userId, updates) {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.baseURL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
            return await response.json();
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    }

    static async getReports() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.baseURL}/reports`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Get reports error:', error);
            throw error;
        }
    }

    static async getAnalytics() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.baseURL}/analytics`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Get analytics error:', error);
            throw error;
        }
    }
}
