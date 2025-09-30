const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/database');
const WardrobeItem = require('../models/WardrobeItem');
const Outfit = require('../models/Outfit');

const router = express.Router();

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

// POST /api/clothing-usage/track
router.post('/track', auth, async (req, res) => {
  try {
    const { outfitId } = req.body || {};
    
    if (!outfitId) {
      return res.status(400).json({ message: 'Outfit ID is required' });
    }
    
    // Find the outfit and update its wornDate to track usage
    const outfit = await Outfit.findOne({ _id: outfitId, userId: req.userId });
    if (!outfit) {
      return res.status(404).json({ message: 'Outfit not found' });
    }
    
    // Update the worn date to track usage
    outfit.wornDate = new Date();
    await outfit.save();
    
    console.log(`✅ Clothing usage tracked for outfit: ${outfit.outfitName}`);
    res.json({ message: 'Usage tracked successfully', outfitId });
  } catch (err) {
    console.error('Error tracking clothing usage:', err);
    res.status(500).json({ message: 'Failed to track usage' });
  }
});

// GET /api/clothing-usage/frequent-data?timeRange=week|month|year
router.get('/frequent-data', async (req, res) => {
  try {
    const timeRange = (req.query.timeRange || 'week').toString().toLowerCase();
    const userId = req.headers.authorization ? 
      jwt.verify(req.headers.authorization.split(' ')[1], JWT_SECRET).userId : 
      null;
    
    if (!userId) {
      return res.json({ categories: [], timeRange });
    }
    
    // Calculate date range based on timeRange
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    // Get outfits worn in the specified time range
    const outfits = await Outfit.find({
      userId: userId,
      wornDate: { $gte: startDate, $lte: now }
    }).populate('outfitItems.wardrobeItemId');
    
    // Count usage by category
    const categoryUsage = {};
    
    outfits.forEach(outfit => {
      outfit.outfitItems.forEach(item => {
        const category = item.itemCategory || 'Other';
        if (!categoryUsage[category]) {
          categoryUsage[category] = {};
        }
        
        const itemKey = item.itemName || item.wardrobeItemId?.clothName || 'Unknown';
        if (!categoryUsage[category][itemKey]) {
          categoryUsage[category][itemKey] = {
            id: item.wardrobeItemId?._id || itemKey,
            name: itemKey,
            category: category,
            usageCount: 0,
            maxUsage: 10 // Default max usage
          };
        }
        
        categoryUsage[category][itemKey].usageCount++;
      });
    });
    
    // Convert to frontend expected format
    const categories = Object.keys(categoryUsage).map(category => ({
      category: category,
      items: Object.values(categoryUsage[category])
    }));
    
    console.log(`📊 Frequent data for ${timeRange}: ${categories.length} categories, ${outfits.length} outfits`);
    
    res.json({ categories, timeRange });
  } catch (err) {
    console.error('Error fetching frequent data:', err);
    res.status(500).json({ message: 'Failed to fetch frequent data' });
  }
});

module.exports = router;


