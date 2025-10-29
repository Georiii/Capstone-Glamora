const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/database');
const WardrobeItem = require('../models/WardrobeItem');
const User = require('../models/User');
const MarketplaceItem = require('../models/MarketplaceItem');

// Auth middleware
function auth(req, res, next) {
  console.log('🔐 Auth middleware called');
  console.log('📝 Headers:', req.headers);
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('❌ No authorization header');
    return res.status(401).json({ message: 'No token provided.' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('❌ No token in authorization header');
    return res.status(401).json({ message: 'Invalid token.' });
  }
  
  console.log('🔑 Token received:', token.substring(0, 20) + '...');
  console.log('🔑 JWT_SECRET:', JWT_SECRET);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verified successfully:', decoded);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    console.log('❌ Token verification failed:', err.message);
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// Add wardrobe item (simple version without Cloudinary)
router.post('/add', auth, async (req, res) => {
  try {
    console.log('🔍 Adding wardrobe item (simple version)...');
    console.log('📝 Request body:', req.body);
    console.log('👤 User ID:', req.userId);
    
    const { imageUrl, clothName, description, categories, occasions, category } = req.body;
    
    if (!imageUrl || !clothName) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'imageUrl and clothName are required.' });
    }

    console.log('💾 Creating WardrobeItem...');
    const item = new WardrobeItem({
      userId: req.userId,
      imageUrl: imageUrl, // Use original imageUrl
      clothName,
      description,
      categories,
      occasions,
      category,
    });
    
    console.log('💾 Saving to database...');
    await item.save();
    console.log('✅ Wardrobe item saved successfully:', item._id);
    
    res.status(201).json({ message: 'Wardrobe item saved.', item });
  } catch (err) {
    console.error('❌ Error saving wardrobe item:', err);
    res.status(500).json({ message: 'Failed to save item.', error: err.message });
  }
});

// Get all wardrobe items for user
router.get('/', auth, async (req, res) => {
  try {
    console.log('🔍 Fetching wardrobe items...');
    console.log('👤 User ID:', req.userId);
    
    const items = await WardrobeItem.find({ userId: req.userId });
    console.log(`📊 Found ${items.length} wardrobe items for user`);
    
    res.json({ items });
  } catch (err) {
    console.error('❌ Error fetching wardrobe items:', err);
    res.status(500).json({ message: 'Failed to fetch items.', error: err.message });
  }
});

// Delete wardrobe item
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('🗑️ Deleting wardrobe item...');
    console.log('📝 Item ID:', req.params.id);
    console.log('👤 User ID:', req.userId);
    
    const item = await WardrobeItem.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!item) {
      console.log('❌ Item not found or doesn\'t belong to user');
      return res.status(404).json({ message: 'Item not found' });
    }
    
    console.log('✅ Wardrobe item deleted successfully:', item._id);
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting wardrobe item:', err);
    res.status(500).json({ message: 'Failed to delete item.', error: err.message });
  }
});

// POST /api/wardrobe/marketplace - Create new marketplace item
router.post('/marketplace', auth, async (req, res) => {
  try {
    console.log('📦 Creating marketplace item...');
    const { imageUrl, name, description, price } = req.body;
    
    if (!imageUrl || !name || !price) {
      return res.status(400).json({ message: 'Missing required fields: imageUrl, name, price' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const item = new MarketplaceItem({
      imageUrl,
      name,
      description,
      price,
      userId: req.userId,
      userName: user.name || '',
      userEmail: user.email || '',
      userProfilePicture: user.profilePicture?.url || '',
      status: 'Pending', // New items are pending by default
    });
    
    await item.save();
    console.log('✅ Marketplace item created:', item._id);
    console.log('📊 Item status:', item.status);
    console.log('📊 Item saved to collection: marketplaceitems');
    console.log('📊 Full item data:', JSON.stringify({
      _id: item._id,
      name: item.name,
      status: item.status,
      userId: item.userId,
      createdAt: item.createdAt
    }, null, 2));
    
    // Verify item was saved correctly by querying the database directly
    const savedItem = await MarketplaceItem.findById(item._id);
    if (savedItem) {
      console.log('🔍 Verification - Saved item status:', savedItem.status);
      console.log('🔍 Verification - Saved item has status field:', savedItem.status !== undefined && savedItem.status !== null);
    } else {
      console.error('❌ Verification FAILED - Item NOT FOUND in database!');
    }
    
    res.status(201).json({ 
      message: 'Your item is pending review. It will be visible once approved by the admin.', 
      item,
      pending: true 
    });
  } catch (err) {
    console.error('❌ Error creating marketplace item:', err);
    res.status(500).json({ message: 'Failed to create marketplace item.', error: err.message });
  }
});

// GET /api/wardrobe/marketplace - Get approved marketplace items
// Returns ALL approved items visible to EVERYONE (no userId filter)
router.get('/marketplace', async (req, res) => {
  try {
    console.log('📦 Fetching marketplace items (public feed - all users)...');
    const search = req.query.search || '';
    
    // First, check total count in collection
    const totalCount = await MarketplaceItem.countDocuments({});
    console.log(`📊 Total items in marketplaceitems collection: ${totalCount}`);
    
    // Check status breakdown
    const pendingCount = await MarketplaceItem.countDocuments({ status: 'Pending' });
    const approvedCount = await MarketplaceItem.countDocuments({ status: 'Approved' });
    const rejectedCount = await MarketplaceItem.countDocuments({ status: 'Rejected' });
    const noStatusCount = await MarketplaceItem.countDocuments({ status: { $exists: false } });
    console.log(`📊 Status breakdown: Pending=${pendingCount}, Approved=${approvedCount}, Rejected=${rejectedCount}, NoStatus=${noStatusCount}`);
    
    // Build query: Approved items OR items without status (legacy items)
    // Must combine with search filter if provided
    const statusFilter = {
      $or: [
        { status: 'Approved' },
        { status: { $exists: false } } // Legacy items posted before approval system
      ]
    };
    
    // Combine search with status filter
    const query = search 
      ? { $and: [{ name: { $regex: search, $options: 'i' } }, statusFilter] }
      : statusFilter;
    
    console.log('🔍 Query:', JSON.stringify(query));
    const items = await MarketplaceItem.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'profilePicture name email');
    
    console.log(`✅ Found ${items.length} approved marketplace items (visible to all users)`);
    console.log(`📊 Returned items breakdown: Approved=${items.filter(i => i.status === 'Approved').length}, Legacy=${items.filter(i => !i.status).length}`);
    
    res.json({ items });
  } catch (err) {
    console.error('❌ Error fetching marketplace items:', err);
    res.status(500).json({ message: 'Failed to fetch marketplace items.', error: err.message });
  }
});

// GET /api/wardrobe/marketplace/user - Get user's own marketplace items (all statuses)
router.get('/marketplace/user', auth, async (req, res) => {
  try {
    console.log('📦 Fetching user marketplace items...');
    console.log('👤 User ID:', req.userId);
    
    const items = await MarketplaceItem.find({ userId: req.userId })
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${items.length} items for user`);
    
    // Log status breakdown for debugging
    const statusBreakdown = {
      pending: items.filter(i => i.status === 'Pending').length,
      approved: items.filter(i => i.status === 'Approved').length,
      rejected: items.filter(i => i.status === 'Rejected').length,
      noStatus: items.filter(i => !i.status).length
    };
    console.log(`📊 User items status breakdown:`, statusBreakdown);
    
    res.json({ items });
  } catch (err) {
    console.error('❌ Error fetching user marketplace items:', err);
    res.status(500).json({ message: 'Failed to fetch user marketplace items.', error: err.message });
  }
});

// PUT /api/wardrobe/marketplace/:id - Update user's marketplace item
router.put('/marketplace/:id', auth, async (req, res) => {
  try {
    console.log('✏️ Updating marketplace item...');
    const { name, description, price } = req.body;
    
    const item = await MarketplaceItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Verify ownership
    if (item.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'You can only edit your own items' });
    }
    
    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = price;
    
    await item.save();
    console.log('✅ Marketplace item updated:', item._id);
    res.json({ message: 'Item updated successfully', item });
  } catch (err) {
    console.error('❌ Error updating marketplace item:', err);
    res.status(500).json({ message: 'Failed to update marketplace item.', error: err.message });
  }
});

// DELETE /api/wardrobe/marketplace/:id - Delete user's marketplace item
router.delete('/marketplace/:id', auth, async (req, res) => {
  try {
    console.log('🗑️ Deleting marketplace item...');
    const item = await MarketplaceItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Verify ownership
    if (item.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'You can only delete your own items' });
    }
    
    await MarketplaceItem.findByIdAndDelete(req.params.id);
    console.log('✅ Marketplace item deleted:', req.params.id);
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting marketplace item:', err);
    res.status(500).json({ message: 'Failed to delete marketplace item.', error: err.message });
  }
});

module.exports = router;
