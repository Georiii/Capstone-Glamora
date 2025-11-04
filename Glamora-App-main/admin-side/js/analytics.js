// Analytics page specific functionality

class AnalyticsManager {
    constructor() {
        this.analyticsChart = null;
        this.refreshInterval = null; // Auto-refresh interval
        this.currentPeriod = '6months';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAnalytics();
        this.startAutoRefresh();
    }

    startAutoRefresh() {
        // Clear any existing interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Auto-refresh analytics every 5 seconds
        this.refreshInterval = setInterval(async () => {
            await this.loadAnalytics();
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
        // Generate report button
        const generateReportBtn = document.querySelector('.generate-report-btn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generateReport());
        }
    }

    async loadAnalytics() {
        try {
            const analyticsData = await api.getAnalytics(this.currentPeriod);
            this.renderChart(analyticsData);
        } catch (error) {
            console.error('❌ Error loading analytics:', error);
            // Render empty chart on error
            this.renderChart({
                userRegistrations: [],
                marketplaceActivity: [],
                reportsOverTime: [],
                topCategories: [],
                period: this.currentPeriod
            });
            if (error.isConnectionError) {
                AdminUtils.showMessage('Cannot connect to backend server', 'error');
            }
        }
    }

    renderChart(analyticsData) {
        const ctx = document.getElementById('analyticsChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.analyticsChart) {
            this.analyticsChart.destroy();
        }

        // Transform backend data into chart format
        const months = [];
        const userLogins = [];
        const outfitGeneration = [];

        // Process user registrations data
        if (analyticsData.userRegistrations && analyticsData.userRegistrations.length > 0) {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                              'July', 'August', 'September', 'October', 'November', 'December'];
            
            analyticsData.userRegistrations.forEach(item => {
                const monthIndex = item._id.month - 1;
                const monthName = monthNames[monthIndex] || `Month ${item._id.month}`;
                months.push(monthName);
                userLogins.push(item.count || 0);
            });

            // Process marketplace activity
            if (analyticsData.marketplaceActivity && analyticsData.marketplaceActivity.length > 0) {
                analyticsData.marketplaceActivity.forEach(item => {
                    const monthIndex = item._id.month - 1;
                    outfitGeneration.push(item.count || 0);
                });
            } else {
                // Fill with zeros if no marketplace activity
                userLogins.forEach(() => outfitGeneration.push(0));
            }
        }

        // If no data, use empty arrays
        if (months.length === 0) {
            months.push('No Data');
            userLogins.push(0);
            outfitGeneration.push(0);
        }

        this.analyticsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'User login',
                        data: userLogins,
                        backgroundColor: '#3498db',
                        borderColor: '#2980b9',
                        borderWidth: 1
                    },
                    {
                        label: 'no. of times they generate',
                        data: outfitGeneration,
                        backgroundColor: '#2ecc71',
                        borderColor: '#27ae60',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 60,
                        ticks: {
                            stepSize: 10,
                            callback: function(value) {
                                return value;
                            }
                        },
                        grid: {
                            color: '#f0f0f0'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // We have custom legend
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20,
                        left: 20,
                        right: 20
                    }
                }
            }
        });
    }

    async generateReport() {
        AdminUtils.showMessage('Generating report...', 'info');
        
        try {
            // Fetch current metrics and analytics
            const metrics = await api.getMetrics();
            const analytics = await api.getAnalytics(this.currentPeriod);
            const users = await api.getUsers({ limit: 1000 });
            const reports = await api.getReports();

            const reportData = {
                totalUsers: metrics.totalUsers || 0,
                activeUsers: users.users.filter(u => u.isActive !== false).length,
                totalReports: metrics.totalReports || 0,
                pendingPosts: metrics.pendingPosts || 0,
                date: new Date().toLocaleDateString()
            };

            const reportText = `
GLAMORA ADMIN REPORT
Generated: ${reportData.date}

SUMMARY:
- Total Users: ${reportData.totalUsers}
- Active Users: ${reportData.activeUsers}
- Total Reports: ${reportData.totalReports}
- Pending Posts: ${reportData.pendingPosts}

ANALYTICS:
- User Registrations: ${analytics.userRegistrations?.length || 0} months tracked
- Marketplace Activity: ${analytics.marketplaceActivity?.length || 0} months tracked
- Reports Over Time: ${analytics.reportsOverTime?.length || 0} months tracked

RECOMMENDATIONS:
- Review pending posts for content moderation
- Monitor user reports for platform safety
- Consider user engagement strategies
            `;

            // Create and download report
            const blob = new Blob([reportText], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `glamora-report-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            AdminUtils.showMessage('Report generated and downloaded successfully', 'success');
        } catch (error) {
            console.error('❌ Error generating report:', error);
            AdminUtils.showMessage('Failed to generate report', 'error');
        }
    }
}

// Initialize analytics manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnalyticsManager();
});
