// User Management page specific functionality

class UserManagementManager {
  constructor() {
    this.refreshInterval = null;
    this.allUsers = [];
    this.lastUsersSnapshot = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadUserManagement();
    this.startAutoRefresh();
  }

  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(async () => {
      await this.loadUserManagement();
      await AdminUtils.updateMetrics();
    }, 5000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  setupEventListeners() {
    const userSearch = document.getElementById('userSearch');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (userSearch) {
      userSearch.addEventListener('input', () => this.filterUsers());
    }
    if (roleFilter) {
      roleFilter.addEventListener('change', () => this.filterUsers());
    }
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.filterUsers());
    }
  }

  async loadUserManagement() {
    try {
      const data = await api.getUsers({ limit: 1000 });
      const users = Array.isArray(data.users) ? data.users : [];
      const snapshot = AdminUtils ? AdminUtils.serializeData(users) : JSON.stringify(users);

      if (snapshot === this.lastUsersSnapshot) {
        return;
      }

      this.lastUsersSnapshot = snapshot;
      this.allUsers = users;
      this.filterUsers();
    } catch (error) {
      console.error('Failed to load users:', error);
      if (!this.lastUsersSnapshot) {
        this.allUsers = [];
        this.renderUsersTable([]);
      }
      if (error.isConnectionError) {
        AdminUtils.showMessage('Cannot connect to backend server', 'error');
      }
    }
  }

  renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">No users found</td></tr>';
      return;
    }

    users.forEach((user) => {
      const status = user.isActive !== false ? 'active' : 'inactive';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.name || 'Unknown'}</td>
        <td>${user.email || 'No email'}</td>
        <td>${user.role || 'user'}</td>
        <td><span class="status-${status}">${status}</span></td>
        <td>
          <button class="view-user-btn" onclick="userManagement.viewUser('${user._id}')">
            View Details
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  filterUsers() {
    const searchTerm = (document.getElementById('userSearch')?.value || '').toLowerCase();
    const roleFilter = document.getElementById('roleFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';

    const filtered = this.allUsers.filter((user) => {
      const userName = (user.name || '').toLowerCase();
      const userEmail = (user.email || '').toLowerCase();
      const matchesSearch = userName.includes(searchTerm) || userEmail.includes(searchTerm);
      const matchesRole = roleFilter === 'all' || (user.role || 'user') === roleFilter;
      const userStatus = user.isActive !== false ? 'active' : 'inactive';
      const matchesStatus = statusFilter === 'all' || userStatus === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });

    this.renderUsersTable(filtered);
  }

  async viewUser(userId) {
    try {
      const data = await api.request(`/api/admin/users/${userId}`);
      const user = data.user;

      if (!user) {
        AdminUtils.showMessage('User not found', 'error');
        return;
      }

      const status = user.isActive !== false ? 'active' : 'inactive';

      document.getElementById('modalUserName').textContent = user.name || 'Unknown';
      document.getElementById('modalUserEmail').textContent = user.email || 'No email';
      document.getElementById('modalUserRole').value = user.role || 'user';
      document.getElementById('modalUserStatus').textContent = status;
      document.getElementById('modalUserStatus').className = `status-${status}`;

      const deactivateBtn = document.getElementById('deactivateBtn');
      if (deactivateBtn) {
        deactivateBtn.textContent = status === 'active' ? 'Deactivate account' : 'Activate account';
        deactivateBtn.className = status === 'active' ? 'deactivate-btn' : 'activate-btn';
        deactivateBtn.onclick = () => this.toggleUserStatus(userId);
      }

      document.getElementById('userModal').style.display = 'block';
    } catch (error) {
      console.error('Failed to load user details:', error);
      AdminUtils.showMessage('Error loading user details', 'error');
    }
  }

  async toggleUserStatus(userId) {
    try {
      const user = this.allUsers.find((u) => u._id === userId);
      if (!user) {
        AdminUtils.showMessage('User not found', 'error');
        return;
      }

      const newStatus = user.isActive !== false ? false : true;

      await api.request(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: { isActive: newStatus }
      });

      await this.loadUserManagement();
      await AdminUtils.updateMetrics();
      document.getElementById('userModal').style.display = 'none';

      const action = newStatus ? 'activated' : 'deactivated';
      AdminUtils.showMessage(`User ${action} successfully`, 'success');
    } catch (error) {
      console.error('Failed to update user status:', error);
      AdminUtils.showMessage('Failed to update user status', 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.userManagement = new UserManagementManager();
});
