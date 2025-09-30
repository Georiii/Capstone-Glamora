const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/database');
const WardrobeItem = require('../models/WardrobeItem');
const User = require('../models/User');
const MarketplaceItem = require('../models/MarketplaceItem');
const cloudinary = require('../config/cloudinary');

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

// Upload image to Cloudinary
router.post('/upload-image', auth, async (req, res) => {
  try {
    const { imageUrl, folder = 'glamora/wardrobe' } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required.' });
    }

    // Upload to Cloudinary with optimization
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: folder,
      transformation: [
        { width: 400, height: 500, crop: 'fill' },
        { quality: 'auto' }
      ]
    });

    res.json({
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    });

  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ message: 'Failed to upload image.', error: err.message });
  }
});

// Add wardrobe item with Cloudinary optimization
router.post('/add', auth, async (req, res) => {
  try {
    console.log('🔍 Adding wardrobe item...');
    console.log('📝 Request body:', req.body);
    console.log('👤 User ID:', req.userId);
    
    const { imageUrl, clothName, description, categories, occasions, category } = req.body;
    
    if (!imageUrl || !clothName) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'imageUrl and clothName are required.' });
    }

    // If it's a local image URL, upload to Cloudinary first
    let optimizedImageUrl = imageUrl;
    if (imageUrl.startsWith('file://') || imageUrl.startsWith('data:')) {
      try {
        console.log('☁️ Uploading to Cloudinary...');
        const result = await cloudinary.uploader.upload(imageUrl, {
          folder: 'glamora/wardrobe',
          transformation: [
            { width: 400, height: 500, crop: 'fill' },
            { quality: 'auto' }
          ]
        });
        optimizedImageUrl = result.secure_url;
        console.log('✅ Cloudinary upload successful:', optimizedImageUrl);
      } catch (uploadErr) {
        console.error('❌ Cloudinary upload failed:', uploadErr);
        // Continue with original URL if upload fails
      }
    }

    console.log('💾 Creating WardrobeItem...');
    const item = new WardrobeItem({
      userId: req.userId,
      imageUrl: optimizedImageUrl,
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

// DELETE /api/wardrobe/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await WardrobeItem.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    // Optionally: delete image from storage if needed
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
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
router.get('/marketplace', async (req, res) => {
  try {
    const search = req.query.search || '';
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const items = await MarketplaceItem.find(query).sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 