// Analytics page specific functionality

class AnalyticsManager {
  constructor() {
    this.analyticsChart = null;
    this.refreshInterval = null;
    this.currentPeriod = '6months';
    this.lastAnalyticsSnapshot = null;
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
      const snapshot = AdminUtils ? AdminUtils.serializeData(analyticsData) : JSON.stringify(analyticsData);

      if (this.lastAnalyticsSnapshot && snapshot === this.lastAnalyticsSnapshot) {
        return;
      }

      this.lastAnalyticsSnapshot = snapshot;
      this.renderChart(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      if (!this.analyticsChart) {
        this.renderChart({
          userRegistrations: [],
          marketplaceActivity: [],
          reportsOverTime: [],
          topCategories: [],
          period: this.currentPeriod
        });
      }
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
      const pdfLib = window.jspdf;
      if (!pdfLib || !pdfLib.jsPDF) {
        throw new Error('PDF generator is not available. Please refresh the page and try again.');
      }

      const metrics = await api.getMetrics();
      const analytics = await api.getAnalytics(this.currentPeriod);
      const users = await api.getUsers({ limit: 1000 });
      const reports = await api.getReports();

      const activeUsers = Array.isArray(users?.users)
        ? users.users.filter((u) => u.isActive !== false).length
        : 0;

      const reportData = {
        totalUsers: metrics.totalUsers || 0,
        activeUsers,
        totalReports: metrics.totalReports || 0,
        pendingPosts: metrics.pendingPosts || 0,
        date: new Date().toLocaleString()
      };

      const { jsPDF } = pdfLib;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 48;
      let cursorY = margin;

      const ensureSpace = (increment) => {
        if (cursorY + increment > pageHeight - margin) {
          doc.addPage();
          cursorY = margin;
        }
      };

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Glamora Admin Report', margin, cursorY);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(12);
      cursorY += 24;
      doc.text(`Generated: ${reportData.date}`, margin, cursorY);

      const chartCanvas = document.getElementById('analyticsChart');
      if (chartCanvas && chartCanvas.toDataURL) {
        try {
          const chartDataUrl = chartCanvas.toDataURL('image/png', 1.0);
          const imgProps = doc.getImageProperties(chartDataUrl);
          const maxWidth = pageWidth - margin * 2;
          const aspectRatio = imgProps.width ? imgProps.height / imgProps.width : 0.6;
          const targetHeight = Math.min(aspectRatio * maxWidth, 280);

          cursorY += 20;
          ensureSpace(targetHeight + 24);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(14);
          doc.text('Activity Chart Snapshot', margin, cursorY);
          cursorY += 16;
          doc.addImage(chartDataUrl, 'PNG', margin, cursorY, maxWidth, targetHeight);
          cursorY += targetHeight;
        } catch (chartError) {
          console.warn('Unable to embed chart image:', chartError);
          cursorY += 24;
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(14);
          doc.text('Activity Chart Snapshot', margin, cursorY);
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(12);
          cursorY += 16;
          doc.text('Chart preview unavailable. Please regenerate while connected.', margin, cursorY);
        }
      }

      const addSection = (title, lines) => {
        cursorY += 28;
        ensureSpace(0);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(title, margin, cursorY);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(12);
        cursorY += 16;

        const maxWidth = pageWidth - margin * 2;
        lines.forEach((line) => {
          const wrapped = doc.splitTextToSize(line, maxWidth);
          wrapped.forEach((part) => {
            ensureSpace(16);
            doc.text(part, margin, cursorY);
            cursorY += 16;
          });
        });
      };

      addSection('Summary', [
        `• Total Users: ${reportData.totalUsers}`,
        `• Active Users: ${reportData.activeUsers}`,
        `• Total Reports: ${reportData.totalReports}`,
        `• Pending Marketplace Posts: ${reportData.pendingPosts}`
      ]);

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const userRegistrationLines = [];
      if (Array.isArray(analytics?.userRegistrations) && analytics.userRegistrations.length) {
        analytics.userRegistrations.forEach((entry) => {
          const monthIndex = (entry._id?.month || 1) - 1;
          const monthLabel = monthNames[monthIndex] || `Month ${entry._id?.month || 1}`;
          userRegistrationLines.push(`• ${monthLabel}: ${entry.count || 0} user logins`);
        });
      } else {
        userRegistrationLines.push('• No user login data available for the selected period.');
      }

      addSection('User Login Activity', userRegistrationLines);

      const marketplaceLines = [];
      if (Array.isArray(analytics?.marketplaceActivity) && analytics.marketplaceActivity.length) {
        analytics.marketplaceActivity.forEach((entry, index) => {
          const label = analytics.userRegistrations?.[index]?._id?.month
            ? monthNames[(analytics.userRegistrations[index]._id.month || 1) - 1]
            : `Entry ${index + 1}`;
          marketplaceLines.push(`• ${label}: ${entry.count || 0} generated actions`);
        });
      } else {
        marketplaceLines.push('• No marketplace activity data available for the selected period.');
      }

      addSection('Marketplace Activity', marketplaceLines);

      const reportInsights = [];
      reportInsights.push(`• Reports recorded: ${Array.isArray(reports) ? reports.length : 0}`);
      if (Array.isArray(reports) && reports.length) {
        const reasonCounts = reports.reduce((acc, report) => {
          const key = (report.reason || 'Others').toString();
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        reportInsights.push('• Report reasons:');
        Object.entries(reasonCounts).forEach(([reason, count]) => {
          reportInsights.push(`  - ${reason}: ${count}`);
        });
      }

      addSection('Report Insights', reportInsights);

      addSection('Recommendations', [
        '• Review pending marketplace posts for moderation opportunities.',
        '• Monitor user reports closely to maintain platform safety.',
        '• Evaluate engagement strategies to encourage active participation.'
      ]);

      const fileName = `glamora-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      AdminUtils.showMessage('Report generated and downloaded successfully', 'success');
    } catch (error) {
      console.error('Failed to generate report:', error);
      AdminUtils.showMessage(error.message || 'Failed to generate report', 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AnalyticsManager();
});
