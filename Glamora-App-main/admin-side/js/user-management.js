// User Management page specific functionality

class UserManagementManager {
    constructor() {
        this.refreshInterval = null; // Auto-refresh interval
        this.allUsers = []; // Cache of all users
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserManagement();
        this.startAutoRefresh();
    }

    startAutoRefresh() {
        // Clear any existing interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Auto-refresh users every 5 seconds
        this.refreshInterval = setInterval(async () => {
            await this.loadUserManagement();
            // Also refresh metrics
            await AdminUtils.updateMetrics();
        }, 5000); // Refresh every 5 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
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
        try {
            const data = await api.getUsers({ limit: 1000 });
            this.allUsers = data.users || [];
            this.renderUsersTable(this.allUsers);
        } catch (error) {
            console.error('❌ Error loading users:', error);
            // Show empty table on error, not mock data
            this.allUsers = [];
            this.renderUsersTable([]);
            if (error.isConnectionError) {
                AdminUtils.showMessage('Cannot connect to backend server', 'error');
            }
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No users found</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            // Backend user structure: _id, name, email, role, isActive
            const status = user.isActive !== false ? 'active' : 'inactive';
            const userName = user.name || 'Unknown';
            const userEmail = user.email || 'No email';
            const userRole = user.role || 'user';
            
            row.innerHTML = `
                <td>${userName}</td>
                <td>${userEmail}</td>
                <td>${userRole}</td>
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

        let filteredUsers = this.allUsers.filter(user => {
            const userName = (user.name || '').toLowerCase();
            const userEmail = (user.email || '').toLowerCase();
            const matchesSearch = userName.includes(searchTerm) || userEmail.includes(searchTerm);
            const matchesRole = roleFilter === 'all' || (user.role || 'user') === roleFilter;
            const userStatus = user.isActive !== false ? 'active' : 'inactive';
            const matchesStatus = statusFilter === 'all' || userStatus === statusFilter;

            return matchesSearch && matchesRole && matchesStatus;
        });

        this.renderUsersTable(filteredUsers);
    }

    async viewUser(userId) {
        try {
            // Fetch user details from backend
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

            // Update deactivate button
            const deactivateBtn = document.getElementById('deactivateBtn');
            if (status === 'active') {
                deactivateBtn.textContent = 'Deactivate account';
                deactivateBtn.className = 'deactivate-btn';
            } else {
                deactivateBtn.textContent = 'Activate account';
                deactivateBtn.className = 'activate-btn';
            }

            // Store current user ID for actions
            deactivateBtn.onclick = () => this.toggleUserStatus(userId);

            document.getElementById('userModal').style.display = 'block';
        } catch (error) {
            console.error('❌ Error loading user details:', error);
            AdminUtils.showMessage('Error loading user details', 'error');
        }
    }

    async toggleUserStatus(userId) {
        try {
            const user = this.allUsers.find(u => u._id === userId);
            if (!user) {
                AdminUtils.showMessage('User not found', 'error');
                return;
            }

            const newStatus = user.isActive !== false ? false : true;
            
            // Update user via API
            await api.request(`/api/admin/users/${userId}`, {
                method: 'PUT',
                body: { isActive: newStatus }
            });

            // Refresh users list
            await this.loadUserManagement();
            await AdminUtils.updateMetrics();
            
            document.getElementById('userModal').style.display = 'none';
            
            const action = newStatus ? 'activated' : 'deactivated';
            AdminUtils.showMessage(`User ${action} successfully`, 'success');
        } catch (error) {
            console.error('❌ Error toggling user status:', error);
            AdminUtils.showMessage('Failed to update user status', 'error');
        }
    }
}

// Initialize user management manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.userManagement = new UserManagementManager();
});
