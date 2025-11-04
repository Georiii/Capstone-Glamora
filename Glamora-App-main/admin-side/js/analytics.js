// Analytics page specific functionality

class AnalyticsManager {
    constructor() {
        this.analyticsChart = null;
        this.analyticsData = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAnalytics();
        
        // Set up auto-refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadAnalytics().catch(err => {
                console.error('Failed to refresh analytics:', err);
            });
        }, 30000);
    }

    setupEventListeners() {
        // Generate report button
        const generateReportBtn = document.querySelector('.generate-report-btn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generateReport());
        }
    }

    async loadAnalytics() {
        const ctx = document.getElementById('analyticsChart');
        if (!ctx) return;

        // Show loading state without destroying canvas
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'analyticsLoading';
        loadingDiv.style.cssText = 'text-align: center; padding: 40px; position: absolute; width: 100%; z-index: 10;';
        loadingDiv.textContent = 'Loading analytics data...';
        ctx.parentElement.style.position = 'relative';
        ctx.parentElement.insertBefore(loadingDiv, ctx);
        ctx.style.opacity = '0.3';

        try {
            console.log('📊 Fetching analytics from API...');
            const data = await api.request('/api/admin/analytics');
            console.log('✅ Analytics API response:', data);
            this.analyticsData = data;
            
            // Remove loading indicator
            const loading = document.getElementById('analyticsLoading');
            if (loading) loading.remove();
            ctx.style.opacity = '1';
            
            this.renderChart(data);
        } catch (error) {
            console.error('❌ Error loading analytics:', error);
            const loading = document.getElementById('analyticsLoading');
            if (loading) {
                const errorMessage = error.needsLogin 
                    ? 'Authentication required. Redirecting to login...' 
                    : (error.message || 'Error loading analytics data. Please try again.');
                loading.textContent = errorMessage;
                loading.style.color = 'red';
            }
            ctx.style.opacity = '1';
            AdminUtils.showMessage(error.message || 'Failed to load analytics data', 'error');
            
            // Redirect to login if authentication is required
            if (error.needsLogin || error.status === 401) {
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
        }
    }

    renderChart(data) {
        const ctx = document.getElementById('analyticsChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.analyticsChart) {
            this.analyticsChart.destroy();
        }

        // Transform backend data to chart format
        // Backend returns userRegistrations, marketplaceActivity, reportsOverTime as arrays with {_id: {year, month}, count}
        // We need to convert to simple arrays for the chart

        // Get last 5 months of data
        const months = [];
        const userLogins = [];
        const outfitGeneration = [];

        // Process user registrations (use as user logins)
        if (data.userRegistrations && data.userRegistrations.length > 0) {
            const last5Months = data.userRegistrations.slice(-5);
            last5Months.forEach(item => {
                const monthName = new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', { month: 'short' });
                months.push(monthName);
                userLogins.push(item.count || 0);
            });
        }

        // Process marketplace activity (use as outfit generation)
        if (data.marketplaceActivity && data.marketplaceActivity.length > 0) {
            const last5Months = data.marketplaceActivity.slice(-5);
            outfitGeneration.length = 0; // Reset
            last5Months.forEach(item => {
                outfitGeneration.push(item.count || 0);
            });
        }

        // If no data, use defaults
        if (months.length === 0) {
            const today = new Date();
            for (let i = 4; i >= 0; i--) {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                months.push(date.toLocaleDateString('en-US', { month: 'short' }));
                userLogins.push(0);
                outfitGeneration.push(0);
            }
        }

        this.analyticsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months.length > 0 ? months : ['April', 'May', 'June', 'July', 'August'],
                datasets: [
                    {
                        label: 'User login',
                        data: userLogins.length > 0 ? userLogins : [0, 0, 0, 0, 0],
                        backgroundColor: '#3498db',
                        borderColor: '#2980b9',
                        borderWidth: 1
                    },
                    {
                        label: 'no. of times they generate',
                        data: outfitGeneration.length > 0 ? outfitGeneration : [0, 0, 0, 0, 0],
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
            // Fetch all necessary data for the report
            const [metrics, usersData, reportsData] = await Promise.all([
                api.request('/api/admin/metrics'),
                api.request('/api/admin/users?page=1&limit=1000'),
                api.request('/api/admin/reports?page=1&limit=1000')
            ]);

            const reportData = {
                totalUsers: metrics.totalUsers || 0,
                activeUsers: usersData.users ? usersData.users.filter(u => u.isActive).length : 0,
                totalReports: metrics.totalReports || (reportsData.reports ? reportsData.reports.length : 0),
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
            console.error('Error generating report:', error);
            AdminUtils.showMessage('Failed to generate report', 'error');
        }
    }
}

// Initialize analytics manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnalyticsManager();
});
