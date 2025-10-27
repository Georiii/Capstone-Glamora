// User Management page specific functionality

class UserManagementManager {
    constructor() {
        this.users = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserManagement();
        this.setupRealtimeUpdates();
    }

    setupEventListeners() {
        // Search and filters
        const userSearch = document.getElementById('userSearch');
        const roleFilter = document.getElementById('roleFilter');
        const statusFilter = document.getElementById('statusFilter');

        if (userSearch) {
            userSearch.addEventListener('input', () => this.loadUserManagement());
        }
        if (roleFilter) {
            roleFilter.addEventListener('change', () => this.loadUserManagement());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.loadUserManagement());
        }
    }

    setupRealtimeUpdates() {
        // Listen for real-time user updates via Socket.IO
        if (window.adminSocket) {
            window.adminSocket.on('user:updated', (data) => {
                console.log('👤 User updated in real-time:', data);
                this.loadUserManagement();
            });

            window.adminSocket.on('user:registered', (data) => {
                console.log('👤 New user registered:', data);
                this.loadUserManagement();
            });
        }
    }

    async loadUserManagement() {
        try {
            const searchTerm = document.getElementById('userSearch')?.value || '';
            const roleFilter = document.getElementById('roleFilter')?.value || 'all';
            const statusFilter = document.getElementById('statusFilter')?.value || 'all';

            // Fetch users from backend
            const data = await api.request(`/api/admin/users?page=${this.currentPage}&limit=50&search=${searchTerm}&role=${roleFilter}&status=${statusFilter}`);
            
            this.users = data.users || [];
            this.totalPages = data.totalPages || 1;
            
            console.log('✅ Users loaded from backend:', this.users.length);
            this.renderUsersTable(this.users);
        } catch (error) {
            console.error('❌ Failed to load users from backend:', error);
            // Fallback to mock data
            this.users = mockData.users;
            this.renderUsersTable(this.users);
            AdminUtils.showMessage('Failed to load users. Using cached data.', 'warning');
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No users found</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            const status = user.isActive ? 'active' : 'inactive';
            const profilePicUrl = user.profilePicture?.url || 'img/avatar.svg';
            
            row.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${profilePicUrl}" alt="${user.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" onerror="this.src='img/avatar.svg'">
                        <span>${user.name}</span>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.role}</td>
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

    async viewUser(userId) {
        try {
            // Fetch detailed user info from backend
            const response = await api.request(`/api/admin/users/${userId}`);
            const user = response.user;
            const stats = response.stats;

            if (!user) {
                AdminUtils.showMessage('User not found', 'error');
                return;
            }

            const status = user.isActive ? 'active' : 'inactive';
            const profilePicUrl = user.profilePicture?.url || 'img/avatar.svg';

            document.getElementById('modalUserName').textContent = user.name;
            document.getElementById('modalUserEmail').textContent = user.email;
            document.getElementById('modalUserRole').value = user.role;
            document.getElementById('modalUserStatus').textContent = status;
            document.getElementById('modalUserStatus').className = `status-${status}`;

            // Display profile picture if available
            const profilePicContainer = document.getElementById('modalUserProfilePic');
            if (profilePicContainer) {
                profilePicContainer.innerHTML = `<img src="${profilePicUrl}" alt="${user.name}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;" onerror="this.src='img/avatar.svg'">`;
            }

            // Display user statistics
            const statsContainer = document.getElementById('modalUserStats');
            if (statsContainer && stats) {
                statsContainer.innerHTML = `
                    <p><strong>Wardrobe Items:</strong> ${stats.wardrobeItems || 0}</p>
                    <p><strong>Marketplace Items:</strong> ${stats.marketplaceItems || 0}</p>
                    <p><strong>Reports Received:</strong> ${stats.reportsReceived || 0}</p>
                    <p><strong>Reports Submitted:</strong> ${stats.reportsSubmitted || 0}</p>
                    <p><strong>Joined:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
                `;
            }

            // Update deactivate button
            const deactivateBtn = document.getElementById('deactivateBtn');
            if (user.isActive) {
                deactivateBtn.textContent = 'Deactivate Account';
                deactivateBtn.className = 'deactivate-btn';
            } else {
                deactivateBtn.textContent = 'Activate Account';
                deactivateBtn.className = 'activate-btn';
            }

            // Store current user ID for actions
            deactivateBtn.onclick = () => this.toggleUserStatus(userId, user.isActive);

            document.getElementById('userModal').style.display = 'block';
        } catch (error) {
            console.error('❌ Failed to load user details:', error);
            AdminUtils.showMessage('Failed to load user details', 'error');
        }
    }

    async toggleUserStatus(userId, currentStatus) {
        try {
            const newStatus = !currentStatus;
            const action = newStatus ? 'activate' : 'deactivate';
            
            if (!confirm(`Are you sure you want to ${action} this user account?`)) {
                return;
            }

            // Update user status in backend
            const response = await api.request(`/api/admin/users/${userId}`, {
                method: 'PUT',
                body: { isActive: newStatus }
            });

            if (response.message) {
                AdminUtils.showMessage(response.message, 'success');
            } else {
                AdminUtils.showMessage(`User account ${action}d successfully`, 'success');
            }

            // Emit real-time update
            if (window.adminSocket) {
                window.adminSocket.emit('user:status:changed', { userId, isActive: newStatus });
            }

            // Refresh data
            AdminUtils.updateMetrics();
            this.loadUserManagement();
            document.getElementById('userModal').style.display = 'none';
        } catch (error) {
            console.error('❌ Failed to toggle user status:', error);
            AdminUtils.showMessage('Failed to update user status', 'error');
        }
    }
}

// Initialize user management manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.userManagement = new UserManagementManager();
});
