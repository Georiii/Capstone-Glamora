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
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleLogin());
    }

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (usernameInput) {
      usernameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') this.handleLogin();
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') this.handleLogin();
      });
    }
  }

  async checkExistingAuth() {
    const token = localStorage.getItem('adminToken');

    if (token && token !== 'mock-token' && !token.includes('mock')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/metrics`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          window.location.href = 'analytics.html';
          return;
        }

        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      } catch (error) {
        console.warn('Unable to validate existing admin token:', error);
      }
    } else if (token) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
    }
  }

  async handleLogin() {
    if (this.loading) return;

    const usernameInput = document.getElementById('admin');
    const passwordInput = document.getElementById('admin123');
    const loginBtn = document.getElementById('loginBtn');

    if (!usernameInput || !passwordInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      AdminUtils.showMessage('Please enter both username and password.', 'error');
      return;
    }

    this.loading = true;
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Invalid credentials.' }));
        AdminUtils.showMessage(errorData.message || 'Invalid credentials.', 'error');
        return;
      }

      const data = await response.json();
      if (!data.token) {
        AdminUtils.showMessage('Login failed: no token returned.', 'error');
        return;
      }

      localStorage.setItem('adminToken', data.token);
      if (data.user) {
        localStorage.setItem('adminUser', JSON.stringify(data.user));
      }

      AdminUtils.showMessage('Login successful!', 'success');
      setTimeout(() => {
        window.location.href = 'analytics.html';
      }, 400);
    } catch (error) {
      console.error('Admin login error:', error);
      AdminUtils.showMessage('Unable to reach the server. Please try again.', 'error');
    } finally {
      this.loading = false;
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LoginManager();
});
