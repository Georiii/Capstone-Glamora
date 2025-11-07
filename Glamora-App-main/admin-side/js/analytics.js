// Analytics page specific functionality

class AnalyticsManager {
  constructor() {
    this.analyticsChart = null;
    this.refreshInterval = null;
    this.currentPeriod = '6months';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadAnalytics();
    this.startAutoRefresh();
  }

  setupEventListeners() {
    const generateReportBtn = document.querySelector('.generate-report-btn');
    if (generateReportBtn) {
      generateReportBtn.addEventListener('click', () => this.generateReport());
    }
  }

  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(async () => {
      await this.loadAnalytics();
      await AdminUtils.updateMetrics();
    }, 5000);
  }

  async loadAnalytics() {
    try {
      const analyticsData = await api.getAnalytics(this.currentPeriod);
      this.renderChart(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
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

    if (this.analyticsChart) {
      this.analyticsChart.destroy();
    }

    const monthLabels = [];
    const userRegistrations = [];
    const marketplaceActivity = [];

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (Array.isArray(analyticsData.userRegistrations) && analyticsData.userRegistrations.length) {
      analyticsData.userRegistrations.forEach((entry) => {
        const monthIndex = (entry._id?.month || 1) - 1;
        monthLabels.push(monthNames[monthIndex] || `Month ${entry._id?.month || 1}`);
        userRegistrations.push(entry.count || 0);
      });
    }

    if (Array.isArray(analyticsData.marketplaceActivity) && analyticsData.marketplaceActivity.length) {
      analyticsData.marketplaceActivity.forEach((entry) => {
        marketplaceActivity.push(entry.count || 0);
      });
    }

    if (!monthLabels.length) {
      monthLabels.push('No Data');
      userRegistrations.push(0);
      marketplaceActivity.push(0);
    } else if (marketplaceActivity.length !== userRegistrations.length) {
      while (marketplaceActivity.length < userRegistrations.length) {
        marketplaceActivity.push(0);
      }
    }

    this.analyticsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'User login',
            data: userRegistrations,
            backgroundColor: '#3498db',
            borderColor: '#2980b9',
            borderWidth: 1
          },
          {
            label: 'no. of times they generate',
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
            ticks: {
              stepSize: 10
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
          legend: { display: false }
        },
        layout: {
          padding: { top: 20, bottom: 20, left: 20, right: 20 }
        }
      }
    });
  }

  async generateReport() {
    AdminUtils.showMessage('Generating report...', 'info');

    try {
      const metrics = await api.getMetrics();
      const analytics = await api.getAnalytics(this.currentPeriod);
      const users = await api.getUsers({ limit: 1000 });
      const reports = await api.getReports();

      const reportData = {
        totalUsers: metrics.totalUsers || 0,
        activeUsers: users.users.filter((u) => u.isActive !== false).length,
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

      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `glamora-report-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      AdminUtils.showMessage('Report generated and downloaded successfully', 'success');
    } catch (error) {
      console.error('Failed to generate report:', error);
      AdminUtils.showMessage('Failed to generate report', 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AnalyticsManager();
});
