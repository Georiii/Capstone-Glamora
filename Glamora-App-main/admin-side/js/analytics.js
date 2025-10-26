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
        this.setupRealtimeUpdates();
    }

    setupEventListeners() {
        // Generate report button
        const generateReportBtn = document.querySelector('.generate-report-btn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generateReport());
        }
    }

    setupRealtimeUpdates() {
        // Listen for real-time updates via Socket.IO
        if (window.adminSocket) {
            window.adminSocket.on('user:registered', () => {
                console.log('👤 New user registered, refreshing analytics');
                this.loadAnalytics();
            });

            window.adminSocket.on('marketplace:item:created', () => {
                console.log('🛍️ New marketplace item, refreshing analytics');
                this.loadAnalytics();
            });
        }
    }

    async loadAnalytics() {
        try {
            // Fetch analytics data from backend
            const data = await api.request('/api/admin/analytics?period=6months');
            this.analyticsData = data;
            console.log('✅ Analytics data loaded:', data);
            this.renderChart();
        } catch (error) {
            console.error('❌ Failed to load analytics:', error);
            // Fallback to mock data
            this.analyticsData = mockData.analytics;
            this.renderChart();
            AdminUtils.showMessage('Failed to load analytics. Using cached data.', 'warning');
        }
    }

    renderChart() {
        const ctx = document.getElementById('analyticsChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.analyticsChart) {
            this.analyticsChart.destroy();
        }

        // Prepare data for chart
        let months = [];
        let userRegistrations = [];
        let marketplaceActivity = [];

        if (this.analyticsData && this.analyticsData.userRegistrations) {
            // Process backend data
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            // Get last 6 months
            const now = new Date();
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push(monthNames[date.getMonth()]);
            }

            // Map backend data to months
            userRegistrations = months.map(() => 0);
            marketplaceActivity = months.map(() => 0);

            this.analyticsData.userRegistrations.forEach(item => {
                const monthIndex = months.indexOf(monthNames[item._id.month - 1]);
                if (monthIndex !== -1) {
                    userRegistrations[monthIndex] = item.count;
                }
            });

            this.analyticsData.marketplaceActivity.forEach(item => {
                const monthIndex = months.indexOf(monthNames[item._id.month - 1]);
                if (monthIndex !== -1) {
                    marketplaceActivity[monthIndex] = item.count;
                }
            });
        } else {
            // Use mock data
            months = mockData.analytics.months;
            userRegistrations = mockData.analytics.userLogins;
            marketplaceActivity = mockData.analytics.outfitGeneration;
        }

        this.analyticsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'User Registrations',
                        data: userRegistrations,
                        backgroundColor: '#3498db',
                        borderColor: '#2980b9',
                        borderWidth: 1
                    },
                    {
                        label: 'Marketplace Items Posted',
                        data: marketplaceActivity,
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

    generateReport() {
        AdminUtils.showMessage('Generating report...', 'info');
        
        // Simulate report generation
        setTimeout(() => {
            const reportData = {
                totalUsers: mockData.users.length,
                activeUsers: mockData.users.filter(u => u.status === 'active').length,
                totalReports: mockData.reports.length,
                pendingPosts: mockData.posts.length,
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
        }, 2000);
    }
}

// Initialize analytics manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnalyticsManager();
});
