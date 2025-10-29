const express = require('express');
const router = express.Router();

const User = require('../models/User');
const MarketplaceItem = require('../models/MarketplaceItem');
const ChatMessage = require('../models/Chat');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/database');

// Reuse simple auth + admin check
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

async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (user && user.role === 'admin') return next();
    return res.status(403).json({ message: 'Admin access required' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
}

// Metrics used by admin dashboard
router.get('/total-users', async (req, res) => {
  try {
    const total = await User.countDocuments();
    res.json({ total });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/active-listings', async (req, res) => {
  try {
    const count = await MarketplaceItem.countDocuments({
      $or: [
        { status: 'Approved' },
        { status: { $exists: false } }
      ],
    });
    res.json({ total: count });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Pending moderation list (admin only)
router.get('/pending-moderation', auth, requireAdmin, async (req, res) => {
  try {
    const items = await MarketplaceItem.find({ status: 'Pending' })
      .sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve item (admin only)
router.put('/marketplace/:id/approve', auth, requireAdmin, async (req, res) => {
  try {
    const item = await MarketplaceItem.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved', approvedAt: new Date(), rejectionReason: null },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item approved', item });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject item (admin only)
router.put('/marketplace/:id/reject', auth, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const item = await MarketplaceItem.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected', rejectedAt: new Date(), rejectionReason: reason || 'Not specified' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    // Optional notify seller (best-effort)
    try {
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        await ChatMessage.create({
          senderId: adminUser._id,
          receiverId: item.userId,
          text: `Your marketplace post "${item.name}" was rejected. Reason: ${reason || 'Not specified'}. Please review the community guidelines and submit again.`,
          timestamp: new Date(),
          read: false,
        });
      }
    } catch {}
    
    res.json({ message: 'Item rejected', item });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


