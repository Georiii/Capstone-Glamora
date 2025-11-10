// Content Moderation page specific functionality

class ContentModerationManager {
    constructor() {
        this.currentView = 'pending'; // 'pending', 'reports', or 'reportDetail'
        this.currentReportId = null;
        this.refreshInterval = null; // Auto-refresh interval
        this.lastPendingItemsSnapshot = null;
        this.lastReportsSnapshot = null;
        this.reportsData = [];
        this.reportFilters = { status: 'all', type: 'all' };
        this.reportTypeLabels = {
            'scam': 'Scam',
            'fake-product-claim': 'Fake Product',
            'inappropriate-chat-behavior': 'Inappropriate Chat Behavior',
            'bait-and-switching-listing': 'Bait-and-Switch',
            'pressure-tactics': 'Pressure / Rushing Payment',
            'others': 'Others'
        };
        this.defaultAvatar = 'https://randomuser.me/api/portraits/men/32.jpg';
        this.currentReportData = null;
        this.currentReportUserId = null;
        this.messageSendInProgress = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadContentModeration();
        this.startAutoRefresh();
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(async () => {
            if (this.currentView === 'pending') {
                await this.renderPendingPosts();
            } else if (this.currentView === 'reports') {
                await this.renderReportsTable();
            }

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
        // Edit guidelines button
        const editBtn = document.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.editGuidelines());
        }
        
        // Close modal on backdrop click
        const postDetailModal = document.getElementById('postDetailModal');
        if (postDetailModal) {
            postDetailModal.addEventListener('click', (e) => {
                if (e.target === postDetailModal) {
                    this.closePostDetail();
                }
            });
            
            // Prevent modal from closing when clicking inside modal content
            const modalContent = postDetailModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        }
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('postDetailModal');
                if (modal && modal.style.display === 'block') {
                    this.closePostDetail();
                }
            }
        });

        const reportStatusFilter = document.getElementById('reportStatusFilter');
        const reportTypeFilter = document.getElementById('reportTypeFilter');

        if (reportStatusFilter) {
            reportStatusFilter.addEventListener('change', () => {
                this.reportFilters.status = reportStatusFilter.value || 'all';
                this.applyReportFilters();
            });
        }

        if (reportTypeFilter) {
            reportTypeFilter.addEventListener('change', () => {
                this.reportFilters.type = reportTypeFilter.value || 'all';
                this.applyReportFilters();
            });
        }

        const sendBtn = document.getElementById('reportDetailSendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendReportMessage());
        }

        const messageInput = document.getElementById('reportDetailMessageInput');
        if (messageInput) {
            messageInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    this.sendReportMessage();
                }
            });
        }
    }

    async loadContentModeration() {
        console.log('🔄 Loading content moderation...');
        console.log('🌐 Environment:', window.location.hostname);
        console.log('🔗 API Base URL:', typeof api !== 'undefined' ? (await api.getAuthToken() ? 'Available' : 'Not available') : 'API not loaded');
        
        // Ensure pending view is visible
        this.showView('pending');
        
        // Add a small delay to ensure DOM is ready (especially for Netlify)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Double-check container exists
        const container = document.getElementById('pendingPosts');
        if (!container) {
            console.error('❌ Container #pendingPosts STILL not found in DOM after delay!');
            console.error('Available IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
            return;
        }
        
        await this.renderPendingPosts();
        await this.renderReportsTable();
        this.checkIntegrationStatus();
        console.log('✅ Content moderation loaded');
    }

    async checkIntegrationStatus() {
        const statusElement = document.getElementById('integrationStatus');
        if (!statusElement) return;

        try {
            // Test API connection
            const isConnected = await api.testConnection();
            if (isConnected) {
                statusElement.textContent = 'Connected to Backend';
                statusElement.style.color = '#4CAF50';
            } else {
                statusElement.textContent = 'Backend Not Available';
                statusElement.style.color = '#FF6B6B';
                // Don't log as error - it's expected if backend is not running
                console.warn('ℹ️ Backend server not available - this is normal if server is not running');
            }
        } catch (error) {
            statusElement.textContent = 'Backend Not Available';
            statusElement.style.color = '#FF6B6B';
            // Only log non-connection errors as errors
            if (error.message && !error.message.includes('Failed to fetch') && !error.message.includes('ERR_CONNECTION_REFUSED')) {
                console.error('Error checking integration status:', error);
            }
        }
    }

    async renderPendingPosts() {
        const container = document.getElementById('pendingPosts');
        if (!container) {
            console.error('❌ Container #pendingPosts not found in DOM');
            console.error('Current URL:', window.location.href);
            console.error('Available elements with IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id).join(', '));
            return;
        }

        const hadSnapshot = Boolean(this.lastPendingItemsSnapshot);
        if (!hadSnapshot) {
            container.innerHTML = '<div style="text-align: center; padding: 20px;">Loading pending items...</div>';
        }

        try {
            console.log('📦 Fetching pending marketplace items...');
            console.log('🌐 Current hostname:', window.location.hostname);
            console.log('🔗 API should be:', window.location.hostname.includes('netlify.app') ? 'Render backend' : 'Render backend');
            
            const itemsRaw = await api.getPendingMarketplaceItems();
            const items = Array.isArray(itemsRaw) ? itemsRaw : [];
            const snapshot = AdminUtils ? AdminUtils.serializeData(items) : JSON.stringify(items);

            if (hadSnapshot && snapshot === this.lastPendingItemsSnapshot) {
                return;
            }

            this.lastPendingItemsSnapshot = snapshot;
            console.log('✅ Received items:', items);
            console.log('📊 Items count:', items?.length || 0);
            
            if (!items || items.length === 0) {
                console.log('ℹ️ No pending items found');
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📋</div>
                        <div style="font-size: 18px; font-weight: 500; color: #888; margin-bottom: 8px;">No pending items to check</div>
                        <div style="font-size: 14px; color: #aaa;">All items have been moderated. Check back later for new submissions.</div>
                    </div>
                `;
                return;
            }

            console.log('🎨 Rendering', items.length, 'pending items...');
            container.innerHTML = '';
            
            items.forEach((item, index) => {
                console.log(`  Item ${index + 1}:`, item.name || item._id);
                const postElement = document.createElement('div');
                postElement.className = 'post-item-simple';
                postElement.innerHTML = `
                    <div class="post-item-content">
                        <span class="post-type-label">User Post</span>
                        <a href="#" class="view-post-link" onclick="contentModeration.viewPost('${item._id}'); return false;">View post</a>
                    </div>
                    <div class="post-item-actions">
                        <button class="action-icon-btn approve-icon-btn" onclick="contentModeration.approvePost('${item._id}')" title="Approve">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-icon-btn disapprove-icon-btn" onclick="contentModeration.disapprovePost('${item._id}')" title="Disapprove">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                container.appendChild(postElement);
            });
            console.log('✅ Successfully rendered', items.length, 'items');
        } catch (error) {
            console.error('❌ Error loading pending items:', error);
            
            // Check if it's a connection error - show helpful message
            if (error.isConnectionError || error.message.includes('Cannot connect to backend')) {
                if (!hadSnapshot) {
                    container.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">🔌</div>
                        <div style="font-size: 18px; font-weight: 500; color: #888; margin-bottom: 8px;">Backend server not connected</div>
                        <div style="font-size: 14px; color: #aaa; margin-bottom: 12px;">The backend server is not running or not reachable.</div>
                        <div style="font-size: 12px; color: #bbb; font-style: italic;">Please start the backend server to view pending items.</div>
                    </div>
                `;
                }
            } else {
                // Other errors - show error message
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack,
                    response: error.response
                });
                if (!hadSnapshot) {
                    container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: red;">
                        <div style="font-weight: bold; margin-bottom: 10px;">Error loading pending items</div>
                        <div style="font-size: 12px; color: #666;">${error.message || 'Unknown error'}</div>
                        <div style="font-size: 12px; color: #666; margin-top: 10px;">Check browser console for details</div>
                    </div>
                `;
                }
            }
        }
    }


    async viewPost(itemId) {
        try {
            const items = await api.getPendingMarketplaceItems();
            const item = items.find(i => i._id === itemId);
            
            if (!item) {
                AdminUtils.showMessage('Item not found', 'error');
                return;
            }

            // Populate the detail modal matching second screenshot design
            const modal = document.getElementById('postDetailModal');
            const content = document.getElementById('postDetailContent');
            
            if (!modal || !content) {
                console.error('Post detail modal elements not found');
                return;
            }

            content.innerHTML = `
                <div class="post-detail-layout">
                    <div class="post-detail-image-container">
                        <img src="${item.imageUrl || 'https://via.placeholder.com/300'}" alt="${item.name}" class="post-detail-image">
                    </div>
                    <div class="post-detail-info">
                        <div class="post-detail-field">
                            <span class="post-detail-label">Cloth name</span>
                            <span class="post-detail-value post-detail-name">${item.name}</span>
                        </div>
                        <div class="post-detail-field">
                            <span class="post-detail-label">Description</span>
                            <span class="post-detail-value">${item.description || 'No description provided'}</span>
                        </div>
                        <div class="post-detail-field">
                            <span class="post-detail-label">Price</span>
                            <span class="post-detail-value post-detail-price">₱${item.price || 0}</span>
                        </div>
                        <div class="post-detail-actions">
                            <button class="approve-btn-detail" onclick="event.stopPropagation(); contentModeration.approvePost('${item._id}');">
                                Approve
                            </button>
                            <button class="disapprove-btn-detail" onclick="event.stopPropagation(); contentModeration.disapprovePostFromDetail('${item._id}');">
                                Disapprove
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Show modal
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error viewing post:', error);
            AdminUtils.showMessage('Error loading item details', 'error');
        }
    }

    closePostDetail() {
        const modal = document.getElementById('postDetailModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async disapprovePostFromDetail(itemId) {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason === null) return; // User cancelled
        
        try {
            await api.rejectMarketplaceItem(itemId, reason);
            AdminUtils.showMessage('Item rejected successfully', 'success');
            this.closePostDetail();
            await this.renderPendingPosts();
            AdminUtils.updateMetrics();
        } catch (error) {
            console.error('Error rejecting item:', error);
            AdminUtils.showMessage('Failed to reject item', 'error');
        }
    }

    async approvePost(itemId) {
        try {
            await api.approveMarketplaceItem(itemId);
            AdminUtils.showMessage('Item approved successfully', 'success');
            this.closePostDetail(); // Close modal if open
            await this.renderPendingPosts();
            AdminUtils.updateMetrics();
        } catch (error) {
            console.error('Error approving item:', error);
            AdminUtils.showMessage('Failed to approve item', 'error');
        }
    }

    async disapprovePost(itemId) {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason === null) return; // User cancelled
        
        try {
            await api.rejectMarketplaceItem(itemId, reason);
            AdminUtils.showMessage('Item rejected successfully', 'success');
            this.closePostDetail(); // Close modal if open
            await this.renderPendingPosts();
            AdminUtils.updateMetrics();
        } catch (error) {
            console.error('Error rejecting item:', error);
            AdminUtils.showMessage('Failed to reject item', 'error');
        }
    }
    editGuidelines() {
        const newGuidelines = prompt('Enter new community guidelines:', 'Current guidelines...');
        if (newGuidelines) {
            AdminUtils.showMessage('Community guidelines updated successfully', 'success');
        }
    }

    normalizeReportType(reason = '') {
        const value = reason ? reason.toString().toLowerCase().trim() : '';
        if (!value) return 'others';
        if (value.includes('scam')) return 'scam';
        if (value.includes('fake') && value.includes('product')) return 'fake-product-claim';
        if (value.includes('inappropriate') && value.includes('chat')) return 'inappropriate-chat-behavior';
        if (value.includes('bait') && value.includes('switch')) return 'bait-and-switching-listing';
        if (value.includes('pressure')) return 'pressure-tactics';
        return 'others';
    }

    getReportTypeLabel(typeKey, fallback = '') {
        if (this.reportTypeLabels[typeKey]) {
            return this.reportTypeLabels[typeKey];
        }
        if (fallback) {
            return fallback;
        }
        return this.reportTypeLabels['others'];
    }

    formatStatus(status = '') {
        const value = status.toString().toLowerCase();
        if (value === 'resolved') return 'Resolved';
        if (value === 'reviewed') return 'Reviewed';
        return 'Pending';
    }

    isHandledStatus(status = '') {
        const value = status.toString().toLowerCase();
        return value === 'reviewed' || value === 'resolved';
    }

    getReportAvatar(report) {
        const profilePicture = report?.reportedUserId?.profilePicture;
        if (profilePicture && profilePicture.url) {
            return profilePicture.url;
        }
        const fallbackAvatar = report?.reportedUserId?.avatarUrl;
        if (fallbackAvatar) {
            return fallbackAvatar;
        }
        return this.defaultAvatar;
    }

    applyReportFilters() {
        const reportsList = document.getElementById('reportsList');
        if (!reportsList) return;

        const statusFilter = this.reportFilters.status || 'all';
        const typeFilter = this.reportFilters.type || 'all';

        const filteredReports = this.reportsData.filter((report) => {
            const statusKey = (report.status || 'pending').toLowerCase();
            const typeKey = this.normalizeReportType(report.reason);

            const matchesStatus = statusFilter === 'all' || statusKey === statusFilter;
            const matchesType = typeFilter === 'all' || typeKey === typeFilter;

            return matchesStatus && matchesType;
        });

        this.renderReportsList(filteredReports);
    }

    renderReportsList(reports) {
        const reportsList = document.getElementById('reportsList');
        if (!reportsList) return;

        if (!reports || !reports.length) {
            reportsList.innerHTML = `
                <div class="reports-empty-state">
                    <strong>No reports found</strong>
                    <span>Try adjusting the filters to explore other reports.</span>
                </div>
            `;
            return;
        }

        reportsList.innerHTML = '';
        const fragment = document.createDocumentFragment();

        reports.forEach((report) => {
            const userName = report.reportedUserId?.name || 'Unknown User';
            const userEmail = report.reportedUserId?.email || 'No email';
            const typeKey = this.normalizeReportType(report.reason);
            const typeLabel = this.getReportTypeLabel(typeKey, report.reason);
            const statusKey = (report.status || 'pending').toLowerCase();
            const statusLabel = this.formatStatus(statusKey);
            const isHandled = this.isHandledStatus(statusKey);

            const card = document.createElement('div');
            card.className = 'report-card';

            const userCell = document.createElement('div');
            userCell.className = 'report-user-cell';

            const avatar = document.createElement('img');
            avatar.className = 'report-user-avatar';
            avatar.src = this.getReportAvatar(report);
            avatar.alt = `${userName}'s avatar`;
            avatar.referrerPolicy = 'no-referrer';

            const meta = document.createElement('div');
            meta.className = 'report-user-meta';

            const nameEl = document.createElement('span');
            nameEl.className = 'report-user-name';
            nameEl.textContent = userName;

            const emailEl = document.createElement('span');
            emailEl.className = 'report-user-email';
            emailEl.textContent = userEmail;

            meta.appendChild(nameEl);
            meta.appendChild(emailEl);
            userCell.appendChild(avatar);
            userCell.appendChild(meta);

            const typeCell = document.createElement('div');
            typeCell.className = 'report-type-cell';
            const typeBadge = document.createElement('span');
            typeBadge.className = 'report-type-badge';
            typeBadge.dataset.type = typeKey;
            typeBadge.textContent = typeLabel;
            typeCell.appendChild(typeBadge);

            const dateCell = document.createElement('div');
            dateCell.className = 'report-date-cell';
            dateCell.textContent = report.timestamp ? new Date(report.timestamp).toLocaleDateString() : 'No date';

            const statusCell = document.createElement('div');
            statusCell.className = 'report-status-cell';
            const statusWrapper = document.createElement('label');
            statusWrapper.className = 'report-status-checkbox';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.disabled = true;
            checkbox.checked = isHandled;
            const statusText = document.createElement('span');
            statusText.textContent = statusLabel;
            statusWrapper.appendChild(checkbox);
            statusWrapper.appendChild(statusText);
            statusCell.appendChild(statusWrapper);

            const actionCell = document.createElement('div');
            actionCell.className = 'report-action-cell';
            const viewButton = document.createElement('button');
            viewButton.className = 'view-details-btn';
            viewButton.textContent = 'View Details';
            viewButton.onclick = () => this.viewReport(report._id);
            actionCell.appendChild(viewButton);

            card.appendChild(userCell);
            card.appendChild(typeCell);
            card.appendChild(dateCell);
            card.appendChild(statusCell);
            card.appendChild(actionCell);

            fragment.appendChild(card);
        });

        reportsList.appendChild(fragment);
    }

    async renderReportsTable() {
        const listBody = document.getElementById('reportsList');
        if (!listBody) return;

        const hadSnapshot = Boolean(this.lastReportsSnapshot);
        if (!hadSnapshot) {
            listBody.innerHTML = `
                <div class="reports-empty-state">
                    <strong>Loading reports...</strong>
                    <span>This may take a moment.</span>
                </div>
            `;
        }

        try {
            const reportsRaw = await api.getReports();
            const reports = Array.isArray(reportsRaw) ? reportsRaw : [];
            const snapshot = AdminUtils ? AdminUtils.serializeData(reports) : JSON.stringify(reports);

            if (hadSnapshot && snapshot === this.lastReportsSnapshot) {
                return;
            }

            this.lastReportsSnapshot = snapshot;
            this.reportsData = reports;
            this.applyReportFilters();
        } catch (error) {
            console.error('Error loading reports:', error);
            listBody.innerHTML = `
                <div class="reports-empty-state" style="color: #c0392b;">
                    <strong>Unable to load reports</strong>
                    <span>${error?.message || 'An unexpected error occurred.'}</span>
                </div>
            `;
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
                        <button class="confirm-btn" onclick="contentModeration.showDurationModal('${reportId}')">Yes</button>
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

        const durationModal = document.createElement('div');
        durationModal.className = 'modal restriction-flow-modal';

        const durationOptions = [
            { label: '1 Hour', value: '1 hour' },
            { label: '1 Day', value: '1 day' },
            { label: '3 Days', value: '3 days' },
            { label: '1 Week', value: '1 week' },
            { label: '1 Month', value: '1 month' },
            { label: 'Permanent', value: 'permanent' },
        ];

        const optionButtons = durationOptions.map((option, index) => `
            <button type="button" class="duration-option ${index === 1 ? 'selected' : ''}" data-value="${option.value}">
                ${option.label}
            </button>
        `).join('');

        durationModal.innerHTML = `
            <div class="modal-content restriction-modal-content">
                <div class="modal-header">
                    <h3>Select Restriction Duration</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="restriction-options">
                        <div class="duration-grid">
                            ${optionButtons}
                        </div>
                        <label for="restrictionReason" class="restriction-label">Restriction Reason</label>
                        <textarea id="restrictionReason" class="restriction-reason" placeholder="Write a message..."></textarea>
                    </div>
                    <div class="modal-actions">
                        <button class="cancel-btn" type="button">Cancel</button>
                        <button class="confirm-btn" type="button">Confirm</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(durationModal);
        durationModal.style.display = 'block';

        const closeModal = () => {
            if (durationModal.parentNode) {
                durationModal.parentNode.removeChild(durationModal);
            }
        };

        durationModal.querySelector('.close').onclick = closeModal;
        durationModal.querySelector('.cancel-btn').onclick = closeModal;

        durationModal.querySelectorAll('.duration-option').forEach((button) => {
            button.addEventListener('click', () => {
                durationModal.querySelectorAll('.duration-option').forEach((btn) => btn.classList.remove('selected'));
                button.classList.add('selected');
            });
        });

        durationModal.querySelector('.confirm-btn').onclick = () => {
            const selectedButton = durationModal.querySelector('.duration-option.selected');
            const reasonField = durationModal.querySelector('#restrictionReason');
            const durationValue = selectedButton ? selectedButton.dataset.value : null;
            const reasonValue = reasonField ? reasonField.value : '';

            this.confirmRestriction(reportId, durationValue, reasonValue, durationModal);
        };
    }

    async confirmRestriction(reportId, duration, reason, modalRef) {
        if (!duration) {
            alert('Please select a restriction duration');
            return;
        }

        if (!reason || !reason.trim()) {
            alert('Please enter a reason for restriction');
            return;
        }

        try {
            console.log(`Restricting user for report ${reportId} for ${duration}. Reason: ${reason}`);

            await api.restrictUser(reportId, duration, reason);

            AdminUtils.showMessage(`User account restricted for ${duration}`, 'success');

            // Close all modals
            if (modalRef && modalRef.parentNode) {
                modalRef.parentNode.removeChild(modalRef);
            }
            document.querySelectorAll('.modal').forEach(modal => modal.remove());

            if (this.currentView === 'reportDetail') {
                this.backToReports();
            } else {
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
        this.startAutoRefresh();
        await this.renderReportsTable();
    }

    async sendReportMessage() {
        if (this.messageSendInProgress) {
            return;
        }

        const messageInput = document.getElementById('reportDetailMessageInput');
        const sendBtn = document.getElementById('reportDetailSendBtn');

        if (!messageInput || !sendBtn) {
            return;
        }

        if (!this.currentReportUserId) {
            AdminUtils.showMessage('Reported user information is unavailable.', 'error');
            return;
        }

        const messageText = messageInput.value ? messageInput.value.trim() : '';
        if (!messageText) {
            AdminUtils.showMessage('Please enter a message before sending.', 'error');
            messageInput.focus();
            return;
        }

        this.messageSendInProgress = true;
        sendBtn.disabled = true;
        if (!sendBtn.dataset.defaultText) {
            sendBtn.dataset.defaultText = sendBtn.textContent || 'Send';
        }
        sendBtn.textContent = 'Sending...';

        try {
            await api.request('/api/chat/send', {
                method: 'POST',
                body: {
                    receiverId: this.currentReportUserId,
                    text: messageText
                }
            });

            AdminUtils.showMessage('Message sent to the user.', 'success');
            messageInput.value = '';
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage = (error && error.response && error.response.message) || error.message || 'Failed to send message.';
            AdminUtils.showMessage(errorMessage, 'error');
        } finally {
            this.messageSendInProgress = false;
            sendBtn.disabled = false;
            sendBtn.textContent = sendBtn.dataset.defaultText || 'Send';
            messageInput.focus();
        }
    }

    populateReportDetailView(report) {
        console.log('Populating report detail view with:', report);

        this.currentReportData = report;
        this.currentReportUserId = report && report.reportedUserId ? report.reportedUserId._id : null;

        const userName = report?.reportedUserId?.name || 'Unknown User';
        const userEmail = report?.reportedUserId?.email || 'No email';
        const avatarUrl = this.getReportAvatar(report);
        const reportDate = report?.timestamp ? new Date(report.timestamp).toLocaleDateString() : 'No date';
        const normalizedReason = this.normalizeReportType(report.reason);

        const nameEl = document.getElementById('reportDetailUserName');
        if (nameEl) nameEl.textContent = userName;

        const emailEl = document.getElementById('reportDetailUserEmail');
        if (emailEl) emailEl.textContent = userEmail;

        const avatarEl = document.getElementById('reportDetailAvatar');
        if (avatarEl) {
            avatarEl.src = avatarUrl;
            avatarEl.alt = `${userName}'s avatar`;
            avatarEl.referrerPolicy = 'no-referrer';
        }

        const dateEl = document.getElementById('reportDetailDate');
        if (dateEl) dateEl.textContent = reportDate;

        const descriptionEl = document.getElementById('reportDetailDescription');
        if (descriptionEl) {
            descriptionEl.textContent = report.description || 'No additional description provided';
        }

        const messageToEl = document.getElementById('reportDetailMessageTo');
        if (messageToEl) {
            messageToEl.textContent = userName;
        }

        const messageFromEl = document.getElementById('reportDetailMessageFrom');
        if (messageFromEl) {
            messageFromEl.textContent = 'Admin';
        }

        const messageInput = document.getElementById('reportDetailMessageInput');
        if (messageInput) {
            messageInput.value = '';
            if (this.currentReportUserId) {
                messageInput.placeholder = 'Write a message...';
                messageInput.disabled = false;
            } else {
                messageInput.placeholder = 'Reported user details unavailable.';
                messageInput.disabled = true;
            }
        }

        const sendBtn = document.getElementById('reportDetailSendBtn');
        if (sendBtn) {
            if (!sendBtn.dataset.defaultText) {
                sendBtn.dataset.defaultText = sendBtn.textContent || 'Send';
            }
            sendBtn.textContent = sendBtn.dataset.defaultText;
            sendBtn.disabled = !this.currentReportUserId;
        }

        const chipsContainer = document.getElementById('reportDetailReasonChips');
        if (chipsContainer) {
            chipsContainer.innerHTML = '';
            const chipDefinitions = [
                { key: 'scam', label: this.getReportTypeLabel('scam') },
                { key: 'fake-product-claim', label: this.getReportTypeLabel('fake-product-claim') },
                { key: 'inappropriate-chat-behavior', label: this.getReportTypeLabel('inappropriate-chat-behavior') },
                { key: 'bait-and-switching-listing', label: this.getReportTypeLabel('bait-and-switching-listing') },
                { key: 'pressure-tactics', label: this.getReportTypeLabel('pressure-tactics') },
                { key: 'others', label: this.getReportTypeLabel('others') }
            ];

            chipDefinitions.forEach((chip) => {
                const chipEl = document.createElement('span');
                chipEl.className = `reason-chip${chip.key === normalizedReason ? ' active' : ''}`;
                chipEl.textContent = chip.label;
                chipsContainer.appendChild(chipEl);
            });
        }

        const photosContainer = document.getElementById('reportDetailEvidencePhotos');
        if (photosContainer) {
            photosContainer.innerHTML = '';
            if (Array.isArray(report?.evidencePhotos) && report.evidencePhotos.length > 0) {
                report.evidencePhotos.forEach((photo, index) => {
                    const photoDiv = document.createElement('div');
                    photoDiv.className = 'evidence-photo';

                    const imgEl = document.createElement('img');
                    imgEl.src = photo.url;
                    imgEl.alt = `Evidence ${index + 1}`;
                    imgEl.addEventListener('click', () => this.viewPhoto(photo.url));

                    const captionEl = document.createElement('span');
                    captionEl.textContent = `Evidence ${index + 1}`;

                    photoDiv.appendChild(imgEl);
                    photoDiv.appendChild(captionEl);
                    photosContainer.appendChild(photoDiv);
                });
            } else {
                photosContainer.innerHTML = '<p>No evidence photos provided</p>';
            }
        }

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
        this.startAutoRefresh();
        await this.renderReportsTable();
    }

    async switchToPending() {
        this.currentView = 'pending';
        this.showView('pending');
        await this.renderPendingPosts();
        // Restart auto-refresh when switching to pending view
        this.startAutoRefresh();
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
            console.log('✅ Showing pending view');
            // Note: Don't call renderPendingPosts here to avoid recursion
            // It's called separately in loadContentModeration and switchToPending
        } else if (viewName === 'reports' && reportsView) {
            reportsView.style.display = 'block';
        } else if (viewName === 'reportDetail' && reportDetailView) {
            reportDetailView.style.display = 'block';
            this.stopAutoRefresh(); // Stop auto-refresh when viewing report details
        }
    }
}

// Initialize content moderation manager when DOM is loaded
function initContentModeration() {
    if (!window.contentModeration) {
        console.log('🚀 Initializing Content Moderation Manager...');
        window.contentModeration = new ContentModerationManager();
    } else {
        console.log('⚠️ Content Moderation Manager already initialized');
    }
}

// Try initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContentModeration);
} else {
    // DOM is already loaded (common on Netlify with cached pages)
    console.log('📄 DOM already loaded, initializing immediately...');
    initContentModeration();
}

// Fallback: Also try after a short delay (for slow-loading scripts on Netlify)
setTimeout(() => {
    if (!window.contentModeration) {
        console.log('⏰ Fallback initialization after delay...');
        initContentModeration();
    }
}, 500);