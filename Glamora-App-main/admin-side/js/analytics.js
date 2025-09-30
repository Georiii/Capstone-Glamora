// Analytics page specific functionality

class AnalyticsManager {
    constructor() {
        this.analyticsChart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAnalytics();
    }

    setupEventListeners() {
        // Generate report button
        const generateReportBtn = document.querySelector('.generate-report-btn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generateReport());
        }
    }

    loadAnalytics() {
        this.renderChart();
    }

    renderChart() {
        const ctx = document.getElementById('analyticsChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.analyticsChart) {
            this.analyticsChart.destroy();
        }

        this.analyticsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: mockData.analytics.months,
                datasets: [
                    {
                        label: 'User login',
                        data: mockData.analytics.userLogins,
                        backgroundColor: '#3498db',
                        borderColor: '#2980b9',
                        borderWidth: 1
                    },
                    {
                        label: 'no. of times they generate',
                        data: mockData.analytics.outfitGeneration,
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
