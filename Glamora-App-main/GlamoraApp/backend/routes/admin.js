// Admin API Backend Routes
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Report = require('../models/Report');
const MarketplaceItem = require('../models/MarketplaceItem');
const WardrobeItem = require('../models/WardrobeItem');
const ChatMessage = require('../models/Chat');
const { JWT_SECRET } = require('../config/database');

const router = express.Router();

// Admin Authentication Middleware
const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if user is admin
        const user = await User.findById(decoded.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        req.adminId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Admin Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Simple admin authentication (in production, use proper password hashing)
        if (username === 'admin' && password === 'admin123') {
            // Find or create admin user
            let adminUser = await User.findOne({ email: 'admin@glamora.com' });
            
            if (!adminUser) {
                adminUser = new User({
                    name: 'Admin',
                    email: 'admin@glamora.com',
                    passwordHash: 'hashed_password', // In production, hash this
                    role: 'admin',
                    isActive: true
                });
                await adminUser.save();
            }

            const token = jwt.sign(
                { userId: adminUser._id, role: 'admin' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: adminUser._id,
                    name: adminUser.name,
                    email: adminUser.email,
                    role: adminUser.role
                }
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Dashboard Metrics
router.get('/metrics', adminAuth, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
        const totalReports = await Report.countDocuments();
        const activeListings = await MarketplaceItem.countDocuments({ status: 'active' });
        const pendingPosts = await MarketplaceItem.countDocuments({ status: 'pending' });

        const metrics = {
            totalUsers,
            activeUsers,
            totalReports,
            activeListings,
            pendingPosts
        };

        // Emit real-time metrics update to admin dashboard
        if (req.app.get('io')) {
            req.app.get('io').to('admin-room').emit('metrics:update', metrics);
        }

        res.json(metrics);
    } catch (error) {
        console.error('Get metrics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Lightweight granular counters for fast Promise.all() calls
router.get('/total-users', adminAuth, async (req, res) => {
    try {
        const count = await User.countDocuments({ role: 'user' });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/active-listings', adminAuth, async (req, res) => {
    try {
        const count = await MarketplaceItem.countDocuments({ status: 'active' });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/reports-today', adminAuth, async (req, res) => {
    try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const count = await Report.countDocuments({ timestamp: { $gte: start, $lte: end } });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// User Management Routes
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', role = 'all', status = 'all' } = req.query;
        
        let query = { role: 'user' };
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (role !== 'all') {
            query.role = role;
        }
        
        if (status !== 'all') {
            query.isActive = status === 'active';
        }

        const users = await User.find(query)
            .select('-passwordHash')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/users/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-passwordHash');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get user statistics
        const userStats = {
            wardrobeItems: await WardrobeItem.countDocuments({ userId: user._id }),
            marketplaceItems: await MarketplaceItem.countDocuments({ userId: user._id }),
            reportsReceived: await Report.countDocuments({ reportedUserId: user._id }),
            reportsSubmitted: await Report.countDocuments({ reporterId: user._id })
        };

        res.json({ user, stats: userStats });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/users/:id', adminAuth, async (req, res) => {
    try {
        const { role, isActive } = req.body;
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (role) user.role = role;
        if (typeof isActive === 'boolean') user.isActive = isActive;

        await user.save();

        // Emit real-time event to admin dashboard
        if (req.app.get('io')) {
            req.app.get('io').to('admin-room').emit('user:updated', {
                userId: user._id,
                name: user.name,
                email: user.email,
                isActive: user.isActive,
                role: user.role,
                timestamp: new Date()
            });
            console.log('✅ Emitted user:updated event for:', user.email);
        }

        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/users/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Soft delete - deactivate user instead of hard delete
        user.isActive = false;
        await user.save();

        res.json({ message: 'User deactivated successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Content Moderation Routes
router.get('/reports', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10, status = 'all' } = req.query;
        
        let query = {};
        if (status !== 'all') {
            query.status = status;
        }

        const reports = await Report.find(query)
            .populate('reporterId', 'name email')
            .populate('reportedUserId', 'name email')
            .populate('marketplaceItemId', 'name description')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Report.countDocuments(query);

        res.json({
            reports,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/reports/:id', adminAuth, async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        
        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        report.status = status;
        report.adminNotes = adminNotes;
        report.resolvedBy = req.adminId;
        report.resolvedAt = new Date();

        await report.save();

        res.json({ message: 'Report updated successfully', report });
    } catch (error) {
        console.error('Update report error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/marketplace/pending', adminAuth, async (req, res) => {
    try {
        const pendingItems = await MarketplaceItem.find({ status: 'pending' })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.json({ items: pendingItems });
    } catch (error) {
        console.error('Get pending items error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/marketplace/:id/approve', adminAuth, async (req, res) => {
    try {
        const item = await MarketplaceItem.findById(req.params.id).populate('userId');
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        item.status = 'active';
        item.approvedBy = req.adminId;
        item.approvedAt = new Date();

        await item.save();

        // Emit real-time event to notify user
        if (req.app.get('io')) {
            req.app.get('io').emit('marketplace:item:approved', {
                itemId: item._id,
                userId: item.userId._id,
                itemName: item.name,
                timestamp: new Date()
            });
            console.log('✅ Emitted marketplace:item:approved event for:', item.name);
        }

        res.json({ message: 'Item approved successfully', item });
    } catch (error) {
        console.error('Approve item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/marketplace/:id/reject', adminAuth, async (req, res) => {
    try {
        const { reason } = req.body;
        
        const item = await MarketplaceItem.findById(req.params.id).populate('userId');
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        item.status = 'rejected';
        item.rejectionReason = reason;
        item.rejectedBy = req.adminId;
        item.rejectedAt = new Date();

        await item.save();

        // Emit real-time event to notify user
        if (req.app.get('io')) {
            req.app.get('io').emit('marketplace:item:rejected', {
                itemId: item._id,
                userId: item.userId._id,
                itemName: item.name,
                reason: reason,
                timestamp: new Date()
            });
            console.log('✅ Emitted marketplace:item:rejected event for:', item.name);
        }

        res.json({ message: 'Item rejected successfully', item });
    } catch (error) {
        console.error('Reject item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Analytics Routes
router.get('/analytics', adminAuth, async (req, res) => {
    try {
        const { period = '6months' } = req.query;
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        
        switch (period) {
            case '1month':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case '3months':
                startDate.setMonth(endDate.getMonth() - 3);
                break;
            case '6months':
                startDate.setMonth(endDate.getMonth() - 6);
                break;
            case '1year':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
        }

        // User registrations over time
        const userRegistrations = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    role: 'user'
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Marketplace activity
        const marketplaceActivity = await MarketplaceItem.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Reports over time
        const reportsOverTime = await Report.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Top categories
        const topCategories = await WardrobeItem.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            userRegistrations,
            marketplaceActivity,
            reportsOverTime,
            topCategories,
            period
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Restrict user account
router.put('/reports/:id/restrict', adminAuth, async (req, res) => {
    try {
        const { restrictionDuration, restrictionReason } = req.body;
        const reportId = req.params.id;

        if (!restrictionDuration || !restrictionReason) {
            return res.status(400).json({ message: 'restrictionDuration and restrictionReason are required.' });
        }

        // Get the report
        const report = await Report.findById(reportId).populate('reportedUserId');
        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        const reportedUser = report.reportedUserId;
        const now = new Date();
        
        // Calculate restriction end date based on duration
        let restrictionEndDate;
        switch (restrictionDuration) {
            case '1 day':
                restrictionEndDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                break;
            case '10 days':
                restrictionEndDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
                break;
            case '20 days':
                restrictionEndDate = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
                break;
            case '1 month':
                restrictionEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                return res.status(400).json({ message: 'Invalid restriction duration.' });
        }

        // Update user account status
        reportedUser.accountStatus = {
            isActive: true,
            isRestricted: true,
            restrictionReason: restrictionReason,
            restrictionStartDate: now,
            restrictionEndDate: restrictionEndDate,
            restrictionDuration: restrictionDuration,
            restrictedBy: req.userId
        };

        await reportedUser.save();

        // Update report status
        report.status = 'resolved';
        report.resolvedAt = now;
        report.adminNotes = `User restricted for ${restrictionDuration}. Reason: ${restrictionReason}`;
        await report.save();

        res.json({ 
            message: 'User account restricted successfully.', 
            restrictionEndDate: restrictionEndDate,
            restrictionDuration: restrictionDuration
        });
    } catch (error) {
        console.error('Error restricting user:', error);
        res.status(500).json({ message: 'Failed to restrict user.', error: error.message });
    }
});

// Marketplace Management Routes
router.get('/marketplace/categories', adminAuth, async (req, res) => {
    try {
        const categories = await WardrobeItem.distinct('category');
        const subcategories = await WardrobeItem.distinct('subcategory');
        
        res.json({ categories, subcategories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/marketplace/items', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10, status = 'all', category = 'all' } = req.query;
        
        let query = {};
        if (status !== 'all') {
            query.status = status;
        }
        if (category !== 'all') {
            query.category = category;
        }

        const items = await MarketplaceItem.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await MarketplaceItem.countDocuments(query);

        res.json({
            items,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get marketplace items error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// System Settings Routes
router.get('/settings', adminAuth, async (req, res) => {
    try {
        // In a real application, these would be stored in a settings collection
        const settings = {
            communityGuidelines: "Welcome to Glamora! Please follow these guidelines...",
            maxFileSize: "10MB",
            allowedFileTypes: ["jpg", "jpeg", "png", "gif"],
            autoModerationEnabled: true,
            reportThreshold: 3
        };

        res.json({ settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/settings', adminAuth, async (req, res) => {
    try {
        const { communityGuidelines, autoModerationEnabled, reportThreshold } = req.body;
        
        // In a real application, update settings in database
        const updatedSettings = {
            communityGuidelines,
            autoModerationEnabled,
            reportThreshold,
            updatedBy: req.adminId,
            updatedAt: new Date()
        };

        res.json({ message: 'Settings updated successfully', settings: updatedSettings });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

