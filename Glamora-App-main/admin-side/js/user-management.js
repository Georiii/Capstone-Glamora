// User Management page specific functionality

class UserManagementManager {
    constructor() {
        this.users = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserManagement();
        
        // Set up auto-refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadUserManagement().catch(err => {
                console.error('Failed to refresh users:', err);
            });
        }, 30000);
    }

    setupEventListeners() {
        // Search and filters
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
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading users...</td></tr>';
        }

        try {
            const data = await api.request('/api/admin/users?page=1&limit=50');
            this.users = data.users || [];
            this.renderUsersTable(this.users);
        } catch (error) {
            console.error('Error loading users:', error);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: red;">Error loading users. Please try again.</td></tr>';
            }
            AdminUtils.showMessage('Failed to load users. Please check your connection.', 'error');
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.role || 'user'}</td>
                <td><span class="status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'active' : 'inactive'}</span></td>
                <td>
                    <button class="view-user-btn" onclick="userManagement.viewUser('${user._id || user.id}')">
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

        let filteredUsers = this.users.filter(user => {
            const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm) || 
                                (user.email || '').toLowerCase().includes(searchTerm);
            const matchesRole = roleFilter === 'all' || (user.role || 'user') === roleFilter;
            const matchesStatus = statusFilter === 'all' || 
                                (statusFilter === 'active' && user.isActive) ||
                                (statusFilter === 'inactive' && !user.isActive);

            return matchesSearch && matchesRole && matchesStatus;
        });

        this.renderUsersTable(filteredUsers);
    }

    async viewUser(userId) {
        try {
            const userData = await api.request(`/api/admin/users/${userId}`);
            const user = userData.user;

            if (!user) {
                AdminUtils.showMessage('User not found', 'error');
                return;
            }

            document.getElementById('modalUserName').textContent = user.name || 'N/A';
            document.getElementById('modalUserEmail').textContent = user.email || 'N/A';
            document.getElementById('modalUserRole').value = user.role || 'user';
            
            const statusEl = document.getElementById('modalUserStatus');
            statusEl.textContent = user.isActive ? 'active' : 'inactive';
            statusEl.className = `status-${user.isActive ? 'active' : 'inactive'}`;

            // Update deactivate button
            const deactivateBtn = document.getElementById('deactivateBtn');
            if (user.isActive) {
                deactivateBtn.textContent = 'Deactivate account';
                deactivateBtn.className = 'deactivate-btn';
            } else {
                deactivateBtn.textContent = 'Activate account';
                deactivateBtn.className = 'activate-btn';
            }

            // Store current user ID for actions
            deactivateBtn.onclick = () => this.toggleUserStatus(userId, !user.isActive);

            document.getElementById('userModal').style.display = 'block';
        } catch (error) {
            console.error('Error loading user details:', error);
            AdminUtils.showMessage('Failed to load user details', 'error');
        }
    }

    async toggleUserStatus(userId, newStatus) {
        try {
            await api.request(`/api/admin/users/${userId}`, {
                method: 'PUT',
                body: {
                    isActive: newStatus
                }
            });

            // Update local users array
            const user = this.users.find(u => (u._id || u.id) === userId);
            if (user) {
                user.isActive = newStatus;
            }

            AdminUtils.updateMetrics().catch(err => console.error('Failed to update metrics:', err));
            this.loadUserManagement();
            document.getElementById('userModal').style.display = 'none';
            
            const action = newStatus ? 'activated' : 'deactivated';
            AdminUtils.showMessage(`User ${action} successfully`, 'success');
        } catch (error) {
            console.error('Error updating user status:', error);
            AdminUtils.showMessage('Failed to update user status', 'error');
        }
    }
}

// Initialize user management manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.userManagement = new UserManagementManager();
});
