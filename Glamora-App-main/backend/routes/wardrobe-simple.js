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

module.exports = router;
