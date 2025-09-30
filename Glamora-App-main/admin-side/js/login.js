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
        if (token) {
            // Already logged in, redirect to analytics
            window.location.href = 'analytics.html';
        }
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Simple authentication (in real app, this would be server-side)
        if (username === 'admin' && password === 'admin123') {
            localStorage.setItem('adminToken', 'mock-token');
            AdminUtils.showMessage('Login successful!', 'success');
            
            // Redirect to analytics page after short delay
            setTimeout(() => {
                window.location.href = 'analytics.html';
            }, 1000);
        } else {
            AdminUtils.showMessage('Invalid credentials. Use admin/admin123', 'error');
        }
    }
}

// Initialize login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
