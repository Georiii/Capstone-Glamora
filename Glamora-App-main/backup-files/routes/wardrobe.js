const express = require('express');
const jwt = require('jsonwebtoken');
const WardrobeItem = require('../models/WardrobeItem');
const User = require('../models/User');
const MarketplaceItem = require('../models/MarketplaceItem');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Use environment variable in production

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

// Add wardrobe item
router.post('/add', auth, async (req, res) => {
  try {
    const { imageUrl, clothName, description, categories, occasions, category } = req.body;
    if (!imageUrl || !clothName) {
      return res.status(400).json({ message: 'imageUrl and clothName are required.' });
    }
    const item = new WardrobeItem({
      userId: req.userId,
      imageUrl,
      clothName,
      description,
      categories,
      occasions,
      category,
    });
    await item.save();
    res.status(201).json({ message: 'Wardrobe item saved.', item });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save item.', error: err.message });
  }
});

// Get all wardrobe items for user
router.get('/', auth, async (req, res) => {
  try {
    const items = await WardrobeItem.find({ userId: req.userId });
    res.json({ items });
  } catch (err) {
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