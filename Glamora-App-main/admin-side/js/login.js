// Login page specific functionality

class LoginManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    setupEventListeners() {
        // Login button
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        
        // Enter key on inputs
        document.getElementById('username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
    }

    checkExistingAuth() {
        const token = localStorage.getItem('adminToken');
        if (token && token !== 'mock-token') {
            // Validate token by checking if it's a valid JWT
            try {
                // Simple check: JWT tokens have 3 parts separated by dots
                const parts = token.split('.');
                if (parts.length === 3) {
                    // Already logged in with valid token, redirect to analytics
                    window.location.href = 'analytics.html';
                }
            } catch (e) {
                // Invalid token, clear it
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
            }
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            AdminUtils.showMessage('Please enter both username and password', 'error');
            return;
        }

        if (username !== 'admin' || password !== 'admin123') {
            AdminUtils.showMessage('Invalid credentials. Please check your username and password.', 'error');
            return;
        }

        // Show loading state
        const loginBtn = document.getElementById('loginBtn');
        const originalText = loginBtn.textContent;
        loginBtn.textContent = 'Logging in...';
        loginBtn.disabled = true;

        try {
            const API_BASE_URL = getApiBaseUrl ? getApiBaseUrl() : 'https://glamora-g5my.onrender.com';
            
            console.log('🔐 Attempting login to:', `${API_BASE_URL}/api/admin/login`);
            
            const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Failed to parse response:', parseError);
                throw new Error('Invalid response from server. Please check your connection.');
            }

            console.log('📥 Login response:', { status: response.status, ok: response.ok });

            if (response.ok && data.token) {
                // Store the token
                localStorage.setItem('adminToken', data.token);
                
                // Store user info if available
                if (data.user) {
                    localStorage.setItem('adminUser', JSON.stringify(data.user));
                }

                AdminUtils.showMessage('Login successful!', 'success');
                
                // Redirect to analytics page after short delay
                setTimeout(() => {
                    window.location.href = 'analytics.html';
                }, 1000);
            } else {
                // Handle different error scenarios
                const errorMessage = data.message || `Login failed with status ${response.status}`;
                console.error('❌ Login failed:', errorMessage);
                AdminUtils.showMessage(errorMessage || 'Invalid credentials. Please check your username and password.', 'error');
                loginBtn.textContent = originalText;
                loginBtn.disabled = false;
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            let errorMessage = 'Login failed. Please check your connection and try again.';
            
            if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                errorMessage = 'Cannot connect to the server. Please ensure the backend is running.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            AdminUtils.showMessage(errorMessage, 'error');
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
        }
    }
}

// Initialize login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
