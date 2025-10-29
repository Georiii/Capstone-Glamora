const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { JWT_SECRET } = require('../config/database');
const WardrobeItem = require('../models/WardrobeItem');
const User = require('../models/User');
const MarketplaceItem = require('../models/MarketplaceItem');

console.log('📦 wardrobe-simple.js module loaded');
console.log('📦 MarketplaceItem model:', MarketplaceItem ? 'LOADED' : 'NOT LOADED');

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

// POST /api/marketplace - add a new marketplace item
router.post('/marketplace', auth, async (req, res) => {
  try {
    const { imageUrl, name, description, price } = req.body;
    if (!imageUrl || !name || !price) return res.status(400).json({ message: 'Missing required fields' });
    
    // Get user information from database
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const item = new MarketplaceItem({
      imageUrl,
      name,
      description,
      price,
      userId: req.userId,
      userName: user.name || '',
      userEmail: user.email || '',
    });
    await item.save();
    res.status(201).json({ message: 'Marketplace item posted', item });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/marketplace - list all marketplace items (with optional search)
console.log('🔧 Registering GET /marketplace route');
router.get('/marketplace', async (req, res) => {
  console.log('🎯 === MARKETPLACE ENDPOINT HIT ===');
  try {
    console.log('🔍 Fetching marketplace items...');
    console.log('📊 Query params:', req.query);
    
    const search = req.query.search || '';
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    
    // Get database info
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log('🌐 Connected DB:', dbName);
    
    // Check collection using native MongoDB driver
    const collectionName = 'marketplaceitems';
    const nativeCount = await db.collection(collectionName).countDocuments();
    console.log('📊 Native MongoDB count:', nativeCount);
    
    // Try Mongoose query first
    const items = await MarketplaceItem.find(query).sort({ createdAt: -1 });
    console.log('✅ Mongoose found items:', items.length);
    
    // If Mongoose returns empty but native has data, use native driver
    let finalItems = items;
    if (items.length === 0 && nativeCount > 0) {
      console.log('⚠️ Mongoose returned empty, using native MongoDB driver as fallback');
      finalItems = await db.collection(collectionName).find(query).sort({ createdAt: -1 }).toArray();
      console.log('✅ Native driver found items:', finalItems.length);
    }
    
    res.json({ items: finalItems });
  } catch (err) {
    console.error('❌ Error fetching marketplace items:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /marketplace/user - get user's own marketplace items (requires auth)
console.log('🔧 Registering GET /marketplace/user route');
router.get('/marketplace/user', auth, async (req, res) => {
  console.log('🎯 === MARKETPLACE USER ENDPOINT HIT ===');
  try {
    console.log('🔍 Fetching user marketplace items...');
    console.log('👤 User ID:', req.userId);
    
    const items = await MarketplaceItem.find({ userId: req.userId }).sort({ createdAt: -1 });
    console.log('✅ Found user marketplace items:', items.length);
    
    res.json({ items });
  } catch (err) {
    console.error('❌ Error fetching user marketplace items:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /marketplace/:id - update marketplace item (requires auth)
console.log('🔧 Registering PUT /marketplace/:id route');
router.put('/marketplace/:id', auth, async (req, res) => {
  console.log('🎯 === UPDATE MARKETPLACE ITEM ENDPOINT HIT ===');
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;
    
    console.log('📝 Updating marketplace item:', id);
    console.log('👤 User ID:', req.userId);
    console.log('📦 Update data:', { name, description, price });
    
    // Find the item and verify ownership
    const item = await MarketplaceItem.findById(id);
    
    if (!item) {
      console.log('❌ Item not found');
      return res.status(404).json({ message: 'Item not found' });
    }
    
    if (item.userId.toString() !== req.userId) {
      console.log('❌ Unauthorized: User does not own this item');
      return res.status(403).json({ message: 'Unauthorized to update this item' });
    }
    
    // Update the item
    item.name = name || item.name;
    item.description = description || item.description;
    item.price = price !== undefined ? price : item.price;
    
    await item.save();
    console.log('✅ Marketplace item updated successfully');
    
    res.json({ message: 'Item updated successfully', item });
  } catch (err) {
    console.error('❌ Error updating marketplace item:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /marketplace/:id - delete marketplace item (requires auth)
console.log('🔧 Registering DELETE /marketplace/:id route');
router.delete('/marketplace/:id', auth, async (req, res) => {
  console.log('🎯 === DELETE MARKETPLACE ITEM ENDPOINT HIT ===');
  try {
    const { id } = req.params;
    
    console.log('🗑️ Deleting marketplace item:', id);
    console.log('👤 User ID:', req.userId);
    
    // Find the item and verify ownership
    const item = await MarketplaceItem.findById(id);
    
    if (!item) {
      console.log('❌ Item not found');
      return res.status(404).json({ message: 'Item not found' });
    }
    
    if (item.userId.toString() !== req.userId) {
      console.log('❌ Unauthorized: User does not own this item');
      return res.status(403).json({ message: 'Unauthorized to delete this item' });
    }
    
    // Delete the item
    await MarketplaceItem.findByIdAndDelete(id);
    console.log('✅ Marketplace item deleted successfully');
    
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting marketplace item:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

console.log('✅ wardrobe-simple.js: All routes registered, exporting router');
module.exports = router;
