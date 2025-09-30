// Content Moderation page specific functionality

class ContentModerationManager {
    constructor() {
        this.currentView = 'pending'; // 'pending', 'reports', or 'reportDetail'
        this.currentReportId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadContentModeration();
    }

    setupEventListeners() {
        // Edit guidelines button
        const editBtn = document.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.editGuidelines());
        }
    }

    async loadContentModeration() {
        this.renderPendingPosts();
        await this.renderReportsTable();
        this.checkIntegrationStatus();
    }

    async checkIntegrationStatus() {
        const statusElement = document.getElementById('integrationStatus');
        if (!statusElement) return;

        try {
            // Test API connection
            const isConnected = await api.testConnection();
            if (isConnected) {
                statusElement.textContent = 'Connected to Mobile App';
                statusElement.style.color = '#4CAF50';
            } else {
                statusElement.textContent = 'Disconnected - Using Mock Data';
                statusElement.style.color = '#FF6B6B';
            }
        } catch (error) {
            statusElement.textContent = 'Disconnected - Using Mock Data';
            statusElement.style.color = '#FF6B6B';
        }
    }

    renderPendingPosts() {
        const container = document.getElementById('pendingPosts');
        if (!container) return;
        
        container.innerHTML = '';

        mockData.posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'post-item';
            postElement.innerHTML = `
                <div class="post-info">
                    <span>User Post</span>
                    <a href="#" onclick="contentModeration.viewPost(${post.id})">View post</a>
                </div>
                <div class="post-actions">
                    <button class="approve-btn" onclick="contentModeration.approvePost(${post.id})" title="Approve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="disapprove-btn" onclick="contentModeration.disapprovePost(${post.id})" title="Disapprove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            container.appendChild(postElement);
        });
    }


    viewPost(postId) {
        const post = mockData.posts.find(p => p.id === postId);
        if (!post) return;

        alert(`Post Content: ${post.content}\n\nPosted by: ${post.userName}`);
    }

    approvePost(postId) {
        const postIndex = mockData.posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        mockData.posts.splice(postIndex, 1);
        this.renderPendingPosts();
        AdminUtils.updateMetrics();
        AdminUtils.showMessage('Post approved successfully', 'success');
    }

    disapprovePost(postId) {
        const postIndex = mockData.posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        mockData.posts.splice(postIndex, 1);
        this.renderPendingPosts();
        AdminUtils.updateMetrics();
        AdminUtils.showMessage('Post disapproved and removed', 'success');
    }


    restrictUser(userId) {
        const user = mockData.users.find(u => u.id === userId);
        if (!user) return;

        user.status = 'inactive';
        AdminUtils.updateMetrics();
        document.getElementById('reportModal').style.display = 'none';
        AdminUtils.showMessage('User restricted successfully', 'success');
    }


    editGuidelines() {
        const newGuidelines = prompt('Enter new community guidelines:', 'Current guidelines...');
        if (newGuidelines) {
            AdminUtils.showMessage('Community guidelines updated successfully', 'success');
        }
    }

    async renderReportsTable() {
        const tbody = document.getElementById('reportsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Loading reports...</td></tr>';

        try {
            const reports = await api.getReports();
            console.log('Reports from API:', reports);
            
            if (reports.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No reports found</td></tr>';
                return;
            }

            tbody.innerHTML = '';

            reports.forEach(report => {
                console.log('Processing report:', report);
                const row = document.createElement('tr');
                const userName = report.reportedUserId?.name || 'Unknown User';
                const userEmail = report.reportedUserId?.email || 'No email';
                
                row.innerHTML = `
                    <td>
                        <div class="report-user">
                            <div class="report-avatar">${userName.charAt(0)}</div>
                            <div>
                                <div class="user-name">${userName}</div>
                                <div class="user-email">${userEmail}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="report-reason">${report.reason}</div>
                    </td>
                    <td>${report.timestamp ? new Date(report.timestamp).toLocaleDateString() : 'No date'}</td>
                    <td>
                        <button class="view-details-btn" onclick="contentModeration.viewReport('${report._id}')">
                            View Details
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading reports:', error);
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: red;">Error loading reports</td></tr>';
        }
    }

    async viewReport(reportId) {
        try {
            const reports = await api.getReports();
            const report = reports.find(r => r._id === reportId);
            
            if (!report) {
                console.error('Report not found:', reportId);
                AdminUtils.showMessage('Report not found', 'error');
                return;
            }

            // Store current report ID and switch to report detail view
            this.currentReportId = reportId;
            this.currentView = 'reportDetail';
            console.log('Switching to report detail view for report:', reportId);
            this.showView('reportDetail');
            this.populateReportDetailView(report);
        } catch (error) {
            console.error('Error loading report details:', error);
            AdminUtils.showMessage('Error loading report details', 'error');
        }
    }

    populateReportDetail(report) {
        document.getElementById('reportUserName').textContent = report.userName;
        document.getElementById('reportUserEmail').textContent = report.userEmail;
        document.getElementById('reportReason').textContent = report.reason;
        document.getElementById('reportDescription').textContent = report.description;

        // Display evidence photos
        const photosContainer = document.getElementById('evidencePhotos');
        if (photosContainer) {
            photosContainer.innerHTML = '';
            if (report.evidencePhotos && report.evidencePhotos.length > 0) {
                report.evidencePhotos.forEach((photo, index) => {
                    const photoDiv = document.createElement('div');
                    photoDiv.className = 'evidence-photo';
                    photoDiv.innerHTML = `
                        <img src="${photo.url}" alt="Evidence ${index + 1}" onclick="contentModeration.viewPhoto('${photo.url}')">
                        <span>Evidence ${index + 1}</span>
                    `;
                    photosContainer.appendChild(photoDiv);
                });
            } else {
                photosContainer.innerHTML = '<p>No evidence photos provided</p>';
            }
        }

        // Store current report ID for actions
        document.getElementById('restrictBtn').onclick = () => this.showRestrictionModal(reportId);
    }

    viewPhoto(photoUrl) {
        // Create a modal to view the full-size photo
        const photoModal = document.createElement('div');
        photoModal.className = 'photo-modal';
        photoModal.innerHTML = `
            <div class="photo-modal-content">
                <span class="close-photo">&times;</span>
                <img src="${photoUrl}" alt="Evidence Photo" class="full-size-photo">
            </div>
        `;
        document.body.appendChild(photoModal);

        // Close modal functionality
        photoModal.querySelector('.close-photo').onclick = () => {
            document.body.removeChild(photoModal);
        };
        photoModal.onclick = (e) => {
            if (e.target === photoModal) {
                document.body.removeChild(photoModal);
            }
        };
    }

    showRestrictionModal(reportId) {
        console.log('showRestrictionModal called with reportId:', reportId);
        
        // First confirmation modal
        const firstModal = document.createElement('div');
        firstModal.className = 'modal';
        firstModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Restrict Account</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to restrict this account?</p>
                    <div class="modal-actions">
                        <button class="cancel-btn" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="confirm-btn" onclick="contentModeration.showDurationModal(${reportId})">Yes</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(firstModal);
        firstModal.style.display = 'block';

        // Close modal functionality
        firstModal.querySelector('.close').onclick = () => {
            document.body.removeChild(firstModal);
        };
    }

    showDurationModal(reportId) {
        // Remove first modal
        document.querySelectorAll('.modal').forEach(modal => modal.remove());

        // Second modal for duration selection
        const durationModal = document.createElement('div');
        durationModal.className = 'modal';
        durationModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Select Restriction Duration</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="restriction-options">
                        <label>Restriction Duration:</label>
                        <select id="restrictionDuration">
                            <option value="1 day">1 day</option>
                            <option value="10 days">10 days</option>
                            <option value="20 days">20 days</option>
                            <option value="1 month">1 month</option>
                        </select>
                        <label>Reason for Restriction:</label>
                        <textarea id="restrictionReason" placeholder="Enter reason for restriction..."></textarea>
                    </div>
                    <div class="modal-actions">
                        <button class="cancel-btn" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="confirm-btn" onclick="contentModeration.confirmRestriction(${reportId})">Confirm Restriction</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(durationModal);
        durationModal.style.display = 'block';

        // Close modal functionality
        durationModal.querySelector('.close').onclick = () => {
            document.body.removeChild(durationModal);
        };
    }

    async confirmRestriction(reportId) {
        const duration = document.getElementById('restrictionDuration').value;
        const reason = document.getElementById('restrictionReason').value;

        if (!reason.trim()) {
            alert('Please enter a reason for restriction');
            return;
        }

        try {
            console.log(`Restricting user for report ${reportId} for ${duration}. Reason: ${reason}`);
            
            await api.restrictUser(reportId, duration, reason);
            
            AdminUtils.showMessage(`User account restricted for ${duration}`, 'success');
            
            // Close all modals
            document.querySelectorAll('.modal').forEach(modal => modal.remove());
            
            // If we're in report detail view, go back to reports table
            if (this.currentView === 'reportDetail') {
                this.backToReports();
            } else {
                // Refresh the reports table
                this.renderReportsTable();
            }
        } catch (error) {
            console.error('Error restricting user:', error);
            AdminUtils.showMessage('Failed to restrict user account', 'error');
        }
    }

    async backToReports() {
        // Switch back to reports view
        this.currentView = 'reports';
        this.showView('reports');
        await this.renderReportsTable();
    }

    populateReportDetailView(report) {
        console.log('Populating report detail view with:', report);
        
        // Update report detail view elements
        const userName = report.reportedUserId?.name || 'Unknown User';
        const userEmail = report.reportedUserId?.email || 'No email';
        
        document.getElementById('reportDetailUserName').textContent = userName;
        document.getElementById('reportDetailUserEmail').textContent = userEmail;
        document.getElementById('reportDetailReason').textContent = report.reason;
        document.getElementById('reportDetailDescription').textContent = report.description || 'No additional description provided';

        // Display evidence photos
        const photosContainer = document.getElementById('reportDetailEvidencePhotos');
        if (photosContainer) {
            photosContainer.innerHTML = '';
            if (report.evidencePhotos && report.evidencePhotos.length > 0) {
                report.evidencePhotos.forEach((photo, index) => {
                    const photoDiv = document.createElement('div');
                    photoDiv.className = 'evidence-photo';
                    photoDiv.innerHTML = `
                        <img src="${photo.url}" alt="Evidence ${index + 1}" onclick="contentModeration.viewPhoto('${photo.url}')">
                        <span>Evidence ${index + 1}</span>
                    `;
                    photosContainer.appendChild(photoDiv);
                });
            } else {
                photosContainer.innerHTML = '<p>No evidence photos provided</p>';
            }
        }

        // Set up restrict button
        const restrictBtn = document.getElementById('reportDetailRestrictBtn');
        if (restrictBtn) {
            restrictBtn.onclick = () => {
                console.log('Restrict button clicked for report:', this.currentReportId);
                this.showRestrictionModal(this.currentReportId);
            };
        } else {
            console.error('Restrict button not found');
        }
    }

    // View switching methods
    async switchToReports() {
        this.currentView = 'reports';
        this.showView('reports');
        await this.renderReportsTable();
    }

    switchToPending() {
        this.currentView = 'pending';
        this.showView('pending');
        this.renderPendingPosts();
    }

    showView(viewName) {
        // Hide all views
        const pendingView = document.getElementById('pendingView');
        const reportsView = document.getElementById('reportsView');
        const reportDetailView = document.getElementById('reportDetailView');
        
        if (pendingView) pendingView.style.display = 'none';
        if (reportsView) reportsView.style.display = 'none';
        if (reportDetailView) reportDetailView.style.display = 'none';
        
        // Show the selected view
        if (viewName === 'pending' && pendingView) {
            pendingView.style.display = 'block';
        } else if (viewName === 'reports' && reportsView) {
            reportsView.style.display = 'block';
        } else if (viewName === 'reportDetail' && reportDetailView) {
            reportDetailView.style.display = 'block';
        }
    }
}

// Initialize content moderation manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contentModeration = new ContentModerationManager();
});
