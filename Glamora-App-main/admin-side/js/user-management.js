// User Management page specific functionality

class UserManagementManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserManagement();
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

    loadUserManagement() {
        this.renderUsersTable(mockData.users);
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td><span class="status-${user.status}">${user.status}</span></td>
                <td>
                    <button class="view-user-btn" onclick="userManagement.viewUser(${user.id})">
                        View Details
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterUsers() {
        const searchTerm = document.getElementById('userSearch').value.toLowerCase();
        const roleFilter = document.getElementById('roleFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        let filteredUsers = mockData.users.filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchTerm) || 
                                user.email.toLowerCase().includes(searchTerm);
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

            return matchesSearch && matchesRole && matchesStatus;
        });

        this.renderUsersTable(filteredUsers);
    }

    viewUser(userId) {
        const user = mockData.users.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('modalUserName').textContent = user.name;
        document.getElementById('modalUserEmail').textContent = user.email;
        document.getElementById('modalUserRole').value = user.role;
        document.getElementById('modalUserStatus').textContent = user.status;
        document.getElementById('modalUserStatus').className = `status-${user.status}`;

        // Update deactivate button
        const deactivateBtn = document.getElementById('deactivateBtn');
        if (user.status === 'active') {
            deactivateBtn.textContent = 'Deactivate account';
            deactivateBtn.className = 'deactivate-btn';
        } else {
            deactivateBtn.textContent = 'Activate account';
            deactivateBtn.className = 'activate-btn';
        }

        // Store current user ID for actions
        deactivateBtn.onclick = () => this.toggleUserStatus(userId);

        document.getElementById('userModal').style.display = 'block';
    }

    toggleUserStatus(userId) {
        const user = mockData.users.find(u => u.id === userId);
        if (!user) return;

        user.status = user.status === 'active' ? 'inactive' : 'active';
        AdminUtils.updateMetrics();
        this.loadUserManagement();
        document.getElementById('userModal').style.display = 'none';
        
        const action = user.status === 'active' ? 'activated' : 'deactivated';
        AdminUtils.showMessage(`User ${action} successfully`, 'success');
    }
}

// Initialize user management manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.userManagement = new UserManagementManager();
});
