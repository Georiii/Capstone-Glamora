// Login page specific functionality

class LoginManager {
    constructor() {
        this.loading = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    setupEventListeners() {
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }
        
        // Enter key on inputs
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (usernameInput) {
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
    }

    async checkExistingAuth() {
        const token = localStorage.getItem('adminToken');
        
        // If token exists and is not mock, verify it's valid
        if (token && token !== 'mock-token' && !token.includes('mock')) {
            try {
                // Try to validate token by fetching metrics
                const response = await fetch(`${API_BASE_URL}/api/admin/metrics`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    // Token is valid, redirect to analytics
                    window.location.href = 'analytics.html';
                } else {
                    // Token is invalid, clear it
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminUser');
                }
            } catch (error) {
                // If backend is not reachable, still allow login
                // Don't redirect if we can't verify the token
                console.warn('Could not verify existing token:', error);
            }
        } else if (token) {
            // Mock token exists, clear it
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
        }
    }

    async handleLogin() {
        if (this.loading) return; // Prevent double submission
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const loginBtn = document.getElementById('loginBtn');
        
        if (!usernameInput || !passwordInput) return;
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        // Validate inputs
        if (!username || !password) {
            AdminUtils.showMessage('Please enter both username and password.', 'error');
            return;
        }

        // Set loading state
        this.loading = true;
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';
        }

        try {
            // Call the real API for authentication
            const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.token) {
                    // Store the real token from backend
                    localStorage.setItem('adminToken', data.token);
                    if (data.user) {
                        localStorage.setItem('adminUser', JSON.stringify(data.user));
                    }
                    
                    AdminUtils.showMessage('Login successful!', 'success');
                    
                    // Redirect to analytics page after short delay
                    setTimeout(() => {
                        window.location.href = 'analytics.html';
                    }, 500);
                } else {
                    AdminUtils.showMessage('Login failed: No token received.', 'error');
                    this.loading = false;
                    if (loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Login';
                    }
                }
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Invalid credentials' }));
                AdminUtils.showMessage(errorData.message || 'Invalid credentials.', 'error');
                this.loading = false;
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Login';
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            AdminUtils.showMessage('Unable to connect to server. Please try again.', 'error');
            this.loading = false;
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
        }
    }
}

// Initialize login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
