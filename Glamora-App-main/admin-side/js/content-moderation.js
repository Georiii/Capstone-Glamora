/**
 * Content Moderation Manager v6.0
 * Optimized for sub-1s performance
 * Created: 2025-10-27
 */

class ContentModerationManager {
    constructor() {
        this.currentView = 'pending';
        this.currentReportId = null;
        this.selectedRestrictionDuration = null;
        this.init();
    }

    init() {
        console.log('🚀 Initializing Content Moderation Manager v6.0');
        this.setupEventListeners();
        this.renderPendingModeration();
        this.setupSocketListeners();
    }

    setupEventListeners() {
        // Aliases for legacy inline handlers in HTML
        // These methods are kept for backward compatibility with existing markup
        this.switchToReports = this.switchToReports.bind(this);
        this.switchToPending = this.switchToPending.bind(this);
        this.backToReports = this.backToReports.bind(this);

        // Buttons with explicit IDs may not exist on the page; guard access
        const showReportsBtn = document.getElementById('showReportsBtn');
        const showPendingBtn = document.getElementById('showPendingBtn');
        const backToReportsBtn = document.getElementById('backToReportsBtn');

        if (showReportsBtn) showReportsBtn.addEventListener('click', () => this.showReportsView());
        if (showPendingBtn) showPendingBtn.addEventListener('click', () => this.showPendingView());
        if (backToReportsBtn) backToReportsBtn.addEventListener('click', () => this.showReportsView());
    }

    setupSocketListeners() {
        const attach = () => {
            if (typeof adminSocket === 'undefined' || !adminSocket) {
                console.warn('⚠️ Socket not available, real-time updates disabled');
                return;
            }

            adminSocket.on('report:created', (data) => {
                console.log('📢 New report received:', data);
                if (this.currentView === 'reports') this.renderReportsTable();
            });

            adminSocket.on('marketplace:item:created', (data) => {
                console.log('📢 New marketplace item:', data);
                if (this.currentView === 'pending') this.renderPendingModeration();
            });

            adminSocket.on('marketplace:item:approved', (data) => {
                console.log('✅ Item approved:', data);
                if (this.currentView === 'pending') this.renderPendingModeration();
            });

            adminSocket.on('marketplace:item:rejected', (data) => {
                console.log('❌ Item rejected:', data);
                if (this.currentView === 'pending') this.renderPendingModeration();
            });
        };

        // Attach now if socket is already ready; otherwise wait for readiness event
        if (typeof adminSocket !== 'undefined' && adminSocket) attach();
        document.addEventListener('adminSocket:ready', attach, { once: true });
    }

    showReportsView() {
        this.currentView = 'reports';
        const reportsView = document.getElementById('reportsView');
        const pendingView = document.getElementById('pendingView');
        const detailView = document.getElementById('reportDetailView');
        if (reportsView) reportsView.style.display = 'block';
        if (pendingView) pendingView.style.display = 'none';
        if (detailView) detailView.style.display = 'none';
        this.renderReportsTable();
    }

    showPendingView() {
        this.currentView = 'pending';
        const reportsView = document.getElementById('reportsView');
        const pendingView = document.getElementById('pendingView');
        const detailView = document.getElementById('reportDetailView');
        if (reportsView) reportsView.style.display = 'none';
        if (pendingView) pendingView.style.display = 'block';
        if (detailView) detailView.style.display = 'none';
        this.renderPendingModeration();
    }

    async renderReportsTable() {
        const tbody = document.getElementById('reportsTableBody');
        if (!tbody) return;

        const startTime = Date.now();
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">⚡ Loading reports...</td></tr>';

        try {
            console.log('⚡ Fast fetching reports...');
            
            const cached = api.getFromCache('reports', 5000);
            if (cached) {
                const cacheTime = Date.now() - startTime;
                console.log(`⚡ Cache hit! Loaded in ${cacheTime}ms`);
                this.displayReports(cached, tbody);
            }

            // Always fetch real data; no hard 800ms race
            const reports = await api.getReports(false);
            const fetchTime = Date.now() - startTime;
            console.log(`⚡ Fetched ${reports.length} reports in ${fetchTime}ms`);
            
            api.setCache('reports', reports);
            this.displayReports(reports, tbody);

        } catch (error) {
            console.error('❌ Error loading reports:', error);
            const fallback = api.getFromCache('reports', 300000);
            if (fallback) {
                console.log('📦 Using stale cache as fallback');
                this.displayReports(fallback, tbody);
            } else {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #e74c3c;">⚠️ Failed to load reports. Please refresh.</td></tr>';
            }
        }
    }

    displayReports(reports, tbody) {
        // Sort by most recent timestamp
        if (Array.isArray(reports)) {
            reports.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));
        }

        if (!reports || reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No reports found</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        reports.forEach(report => {
            const row = document.createElement('tr');
            const createdAt = new Date(report.timestamp || report.createdAt).toLocaleString();
            
            const reporter = `${report.reporterName || 'Anonymous'} / ${report.reporterEmail || ''}`.trim();
            const subject = report.reportedUserName || report.reportedItemId || 'Unknown';
            const reason = report.reason || '—';

            row.innerHTML = `
                <td>${reporter}</td>
                <td>${subject}</td>
                <td>${reason}</td>
                <td>${createdAt}</td>
                <td>
                    <button class="btn-view" onclick="window.contentModeration.viewReport('${report._id}')">View Details</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async viewReport(reportId) {
        console.log('👁️ Viewing report:', reportId);
        this.currentReportId = reportId;
        
        try {
            const report = await api.getReportById(reportId);
            console.log('📄 Report details:', report);
            if (!report) throw new Error('Report not found');

            const safe = (elId) => document.getElementById(elId);
            const rName = safe('reporterName');
            const ruName = safe('reportedUserName');
            const rReason = safe('reportReason');
            const rDesc = safe('reportDescription');
            const rStatus = safe('reportStatus');
            if (rName) rName.textContent = report.reporterName || report.reporterId?.name || 'Anonymous';
            if (ruName) ruName.textContent = report.reportedUserName || report.reportedUserId?.name || 'Unknown';
            // store for message/restriction actions
            this.currentReportedUserId = report.reportedUserId || report.reportedUser?._id || report.reportedUser;
            if (rReason) rReason.textContent = report.reason || 'No reason provided';
            if (rDesc) rDesc.textContent = report.description || 'No additional description provided';
            if (rStatus) {
                rStatus.textContent = report.status || 'pending';
                rStatus.className = `status-badge status-${report.status || 'pending'}`;
            }
            
            const evidenceContainer = document.getElementById('evidencePhotos');
            if (evidenceContainer) {
                const photos = Array.isArray(report.evidencePhotos)
                    ? report.evidencePhotos.map(p => (typeof p === 'string' ? p : (p.url || ''))).filter(Boolean)
                    : [];
                if (photos.length > 0) {
                    evidenceContainer.innerHTML = photos.map(photo => 
                        `<img src="${photo}" alt="Evidence" style="max-width: 200px; margin: 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`
                    ).join('');
                } else {
                    evidenceContainer.innerHTML = '<p>No evidence photos provided</p>';
                }
            }
            
            const reportsView = document.getElementById('reportsView');
            const detailView = document.getElementById('reportDetailView');
            if (reportsView) reportsView.style.display = 'none';
            if (detailView) detailView.style.display = 'block';
            
        } catch (error) {
            console.error('❌ Error loading report details:', error);
            alert('Failed to load report details. Please try again.');
        }
    }

    openRestrictModal() {
        if (!this.currentReportedUserId) {
            alert('No reported user selected.');
            return;
        }
        this.restrictAccount(this.currentReportedUserId);
    }

    async sendMessageToUser(userId) {
        try {
            const textarea = document.getElementById('adminMessageBox');
            const message = textarea?.value.trim();
            if (!message) {
                alert('Please enter a message before sending.');
                return;
            }
            await api.request('/api/admin/send-message', {
                method: 'POST',
                body: { recipientId: userId, sender: 'admin', message }
            });
            alert('Message sent successfully.');
            textarea.value = '';
        } catch (err) {
            console.error('Send message error:', err);
            alert('Failed to send message. Please try again later.');
        }
    }

    async restrictAccount(userId) {
        try {
            const duration = prompt('Select restriction duration: 1 day, 3 days, 7 days, 30 days, permanent');
            if (!duration) return;
            await api.request('/api/admin/restrict-account', {
                method: 'PATCH',
                body: { userId, status: 'restricted', duration }
            });
            alert('Account has been restricted successfully.');
            this.showReportsView();
        } catch (err) {
            console.error('Restrict account error:', err);
            alert('Failed to restrict account. Please try again later.');
        }
    }

    // Backward compatibility aliases for legacy inline handlers
    switchToReports() { this.showReportsView(); }
    switchToPending() { this.showPendingView(); }
    backToReports() { this.showReportsView(); }

    showRestrictionModal(reportId) {
        console.log('🔒 Opening restriction modal for report:', reportId);
        this.currentReportId = reportId;
        
        const modal = document.createElement('div');
        modal.id = 'restrictionModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <h3>Restrict Account</h3>
                <p>Are you sure you want to restrict this account?</p>
                <div style="margin: 20px 0;">
                    <button class="btn-cancel" onclick="window.contentModeration.closeModal()">Cancel</button>
                    <button class="btn-danger" onclick="window.contentModeration.showDurationModal()">Yes</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showDurationModal() {
        this.closeModal();
        
        const modal = document.createElement('div');
        modal.id = 'durationModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <h3>Select Restriction Duration</h3>
                <div style="margin: 20px 0;">
                    <button class="duration-btn" onclick="window.contentModeration.selectDuration('1 day')" style="display: block; width: 100%; margin: 10px 0; padding: 12px; border: 2px solid #ddd; background: white; border-radius: 8px; cursor: pointer; font-size: 16px;">1 Day</button>
                    <button class="duration-btn" onclick="window.contentModeration.selectDuration('3 days')" style="display: block; width: 100%; margin: 10px 0; padding: 12px; border: 2px solid #ddd; background: white; border-radius: 8px; cursor: pointer; font-size: 16px;">3 Days</button>
                    <button class="duration-btn" onclick="window.contentModeration.selectDuration('1 week')" style="display: block; width: 100%; margin: 10px 0; padding: 12px; border: 2px solid #ddd; background: white; border-radius: 8px; cursor: pointer; font-size: 16px;">1 Week</button>
                    <button class="duration-btn" onclick="window.contentModeration.selectDuration('1 month')" style="display: block; width: 100%; margin: 10px 0; padding: 12px; border: 2px solid #ddd; background: white; border-radius: 8px; cursor: pointer; font-size: 16px;">1 Month</button>
                    <button class="duration-btn" onclick="window.contentModeration.selectDuration('permanent')" style="display: block; width: 100%; margin: 10px 0; padding: 12px; border: 2px solid #e74c3c; background: white; border-radius: 8px; cursor: pointer; font-size: 16px; color: #e74c3c; font-weight: bold;">Permanent</button>
                </div>
                <button class="btn-cancel" onclick="window.contentModeration.closeModal()" style="margin-top: 10px;">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    selectDuration(duration) {
        console.log('⏱️ Duration selected:', duration);
        this.selectedRestrictionDuration = duration;
        this.closeModal();
        this.showReasonModal();
    }

    showReasonModal() {
        const modal = document.createElement('div');
        modal.id = 'reasonModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <h3>Enter Restriction Reason</h3>
                <textarea id="restrictionReason" placeholder="Enter reason for restriction..." style="width: 100%; min-height: 120px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; font-family: Arial, sans-serif; resize: vertical; margin: 15px 0;"></textarea>
                <div style="margin-top: 20px;">
                    <button class="btn-cancel" onclick="window.contentModeration.closeModal()">Cancel</button>
                    <button class="btn-danger" onclick="window.contentModeration.confirmRestriction()">Confirm Restriction</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async confirmRestriction() {
        const reasonInput = document.getElementById('restrictionReason');
        const reason = reasonInput ? reasonInput.value.trim() : '';
        
        if (!reason) {
            alert('Please enter a reason for the restriction.');
            return;
        }

        if (!this.currentReportId || !this.selectedRestrictionDuration) {
            alert('Missing restriction details. Please try again.');
            this.closeModal();
            return;
        }

        console.log('✅ Confirming restriction:', {
            reportId: this.currentReportId,
            duration: this.selectedRestrictionDuration,
            reason: reason
        });

        try {
            this.closeModal();
            
            const result = await api.restrictUser(
                this.currentReportId,
                this.selectedRestrictionDuration,
                reason
            );
            
            console.log('✅ Restriction successful:', result);
            alert(`Account restricted successfully for ${this.selectedRestrictionDuration}.`);
            
            this.currentReportId = null;
            this.selectedRestrictionDuration = null;
            
            this.showReportsView();
            
        } catch (error) {
            console.error('❌ Error restricting account:', error);
            alert('Failed to restrict account. Please try again.');
        }
    }

    closeModal() {
        const modals = ['restrictionModal', 'durationModal', 'reasonModal'];
        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) modal.remove();
        });
    }

    async renderPendingModeration() {
        const container = document.getElementById('pendingItemsContainer');
        if (!container) return;

        const startTime = Date.now();
        container.innerHTML = '<div style="text-align: center; padding: 40px;">⚡ Loading pending items...</div>';

        try {
            console.log('⚡ Fast fetching pending items...');
            
            const cached = api.getFromCache('pendingItems', 10000);
            if (cached) {
                const cacheTime = Date.now() - startTime;
                console.log(`⚡ Cache hit! Loaded in ${cacheTime}ms`);
                this.displayPendingItems(cached, container);
                api.getPendingItems().then(fresh => api.setCache('pendingItems', fresh)).catch(e => console.log('Background refresh failed:', e));
                return;
            }

            const fetchPromise = api.getPendingItems();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 800)
            );

            const items = await Promise.race([fetchPromise, timeoutPromise]);
            const fetchTime = Date.now() - startTime;
            console.log(`⚡ Fetched ${items.length} items in ${fetchTime}ms`);
            
            api.setCache('pendingItems', items);
            this.displayPendingItems(items, container);

        } catch (error) {
            console.error('❌ Error loading pending items:', error);
            const fallback = api.getFromCache('pendingItems', 300000);
            if (fallback) {
                console.log('📦 Using stale cache as fallback');
                this.displayPendingItems(fallback, container);
            } else {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;">⚠️ Failed to load items. Please refresh.</div>';
            }
        }
    }

    displayPendingItems(items, container) {
        if (!items || items.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px;">No pending items</div>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="pending-item-card">
                <img src="${item.imageUrl || '/placeholder.png'}" alt="${item.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px 8px 0 0;">
                <div style="padding: 15px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 18px;">${item.name}</h4>
                    <p style="margin: 5px 0; color: #666;"><strong>Category:</strong> ${item.category}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Price:</strong> ₱${item.price}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Seller:</strong> ${item.sellerName || 'Unknown'}</p>
                    <div style="margin-top: 15px; display: flex; gap: 10px;">
                        <button class="btn-approve" onclick="window.contentModeration.approveItem('${item._id}')">✓ Approve</button>
                        <button class="btn-reject" onclick="window.contentModeration.rejectItem('${item._id}')">✗ Reject</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async approveItem(itemId) {
        if (!confirm('Approve this item for marketplace?')) return;

        try {
            console.log('✅ Approving item:', itemId);
            await api.approveMarketplaceItem(itemId);
            alert('Item approved successfully!');
            this.renderPendingModeration();
        } catch (error) {
            console.error('❌ Error approving item:', error);
            alert('Failed to approve item. Please try again.');
        }
    }

    async rejectItem(itemId) {
        const reason = prompt('Enter reason for rejection:');
        if (!reason) return;

        try {
            console.log('❌ Rejecting item:', itemId);
            await api.rejectMarketplaceItem(itemId, reason);
            alert('Item rejected successfully!');
            this.renderPendingModeration();
        } catch (error) {
            console.error('❌ Error rejecting item:', error);
            alert('Failed to reject item. Please try again.');
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.contentModeration = new ContentModerationManager();
    });
} else {
    window.contentModeration = new ContentModerationManager();
}

