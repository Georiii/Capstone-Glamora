const express = require('express');
const jwt = require('jsonwebtoken');
const Report = require('../models/Report');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/database');

const router = express.Router();

// Auth middleware
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided.' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid token.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// POST /api/report - Submit a user report
router.post('/', auth, async (req, res) => {
  try {
    const { reportedUserId, reason, marketplaceItemId, description, evidencePhotos } = req.body;
    const reporterId = req.userId;

    if (!reportedUserId || !reason) {
      return res.status(400).json({ message: 'reportedUserId and reason are required.' });
    }

    // Check if reported user exists
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ message: 'Reported user not found.' });
    }

    // Check if user is trying to report themselves
    if (reporterId === reportedUserId) {
      return res.status(400).json({ message: 'You cannot report yourself.' });
    }

    // Check if this user has already reported the same user (allow up to 3 reports)
    const reportCount = await Report.countDocuments({
      reporterId,
      reportedUserId,
      status: { $in: ['pending', 'reviewed'] }
    });

    if (reportCount >= 3) {
      return res.status(400).json({ message: 'You have already reported this user 3 times. Maximum reports reached.' });
    }

    const sanitizedDescription = typeof description === 'string' ? description.trim() : '';
    const sanitizedPhotos = Array.isArray(evidencePhotos)
      ? evidencePhotos
          .map((photo) => {
            if (!photo) return null;
            if (typeof photo === 'string') {
              return { url: photo, filename: null };
            }
            if (photo.url) {
              return {
                url: photo.url,
                filename: photo.filename || null,
                uploadedAt: photo.uploadedAt ? new Date(photo.uploadedAt) : undefined,
              };
            }
            return null;
          })
          .filter(Boolean)
      : [];

    const report = new Report({
      reporterId,
      reportedUserId,
      marketplaceItemId: marketplaceItemId || null,
      reason,
      description: sanitizedDescription,
      evidencePhotos: sanitizedPhotos,
      timestamp: new Date(),
      status: 'pending'
    });

    await report.save();

    // Populate reporter and reported user info for response
    await report.populate('reporterId', 'name email');
    await report.populate('reportedUserId', 'name email');

    res.status(201).json({ 
      message: 'Report submitted successfully.', 
      report: report 
    });
  } catch (err) {
    console.error('Error submitting report:', err);
    res.status(500).json({ message: 'Failed to submit report.', error: err.message });
  }
});

// GET /api/report/list - Get all reports (admin only)
router.get('/list', auth, async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporterId', 'name email')
      .populate('reportedUserId', 'name email')
      .sort({ timestamp: -1 });

    res.json({ reports });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ message: 'Failed to fetch reports.', error: err.message });
  }
});

// PUT /api/report/:reportId/status - Update report status (admin only)
router.put('/:reportId/status', auth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;

    if (!status || !['pending', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required.' });
    }

    const updateData = { status };
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    const report = await Report.findByIdAndUpdate(
      reportId,
      updateData,
      { new: true }
    ).populate('reporterId', 'name email')
     .populate('reportedUserId', 'name email');

    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    res.json({ message: 'Report status updated successfully.', report });
  } catch (err) {
    console.error('Error updating report status:', err);
    res.status(500).json({ message: 'Failed to update report status.', error: err.message });
  }
});

// GET /api/report/stats - Get report statistics (admin only)
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    res.json({
      stats,
      totalReports,
      pendingReports
    });
  } catch (err) {
    console.error('Error fetching report stats:', err);
    res.status(500).json({ message: 'Failed to fetch report stats.', error: err.message });
  }
});

module.exports = router; 