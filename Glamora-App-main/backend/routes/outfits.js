const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/database');
const Outfit = require('../models/Outfit');
const WardrobeItem = require('../models/WardrobeItem');
const User = require('../models/User');

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

// POST /api/outfits - Create a new outfit
router.post('/', auth, async (req, res) => {
  try {
    const { outfitName, outfitItems, occasion, weather, notes, wornDate } = req.body;
    
    if (!outfitName || !outfitItems || outfitItems.length === 0) {
      return res.status(400).json({ message: 'Outfit name and items are required.' });
    }

    // Validate that all wardrobe items exist and belong to the user
    for (const item of outfitItems) {
      const wardrobeItem = await WardrobeItem.findOne({ 
        _id: item.wardrobeItemId, 
        userId: req.userId 
      });
      
      if (!wardrobeItem) {
        return res.status(400).json({ 
          message: `Wardrobe item ${item.itemName} not found or doesn't belong to you.` 
        });
      }
    }

    const outfit = new Outfit({
      userId: req.userId,
      outfitName,
      outfitItems,
      occasion,
      weather,
      notes,
      wornDate: wornDate ? new Date(wornDate) : new Date()
    });

    await outfit.save();
    
    // Populate the outfit items for response
    await outfit.populate('outfitItems.wardrobeItemId');
    
    res.status(201).json({ 
      message: 'Outfit created successfully.', 
      outfit 
    });
  } catch (err) {
    console.error('Error creating outfit:', err);
    res.status(500).json({ message: 'Failed to create outfit.', error: err.message });
  }
});

// GET /api/outfits - Get all outfits for the current user
router.get('/', auth, async (req, res) => {
  try {
    const outfits = await Outfit.find({ userId: req.userId })
      .populate('outfitItems.wardrobeItemId')
      .sort({ wornDate: -1, createdAt: -1 });

    res.json({ outfits });
  } catch (err) {
    console.error('Error fetching outfits:', err);
    res.status(500).json({ message: 'Failed to fetch outfits.', error: err.message });
  }
});

// GET /api/outfits/:id - Get a specific outfit
router.get('/:id', auth, async (req, res) => {
  try {
    const outfit = await Outfit.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    }).populate('outfitItems.wardrobeItemId');

    if (!outfit) {
      return res.status(404).json({ message: 'Outfit not found.' });
    }

    res.json({ outfit });
  } catch (err) {
    console.error('Error fetching outfit:', err);
    res.status(500).json({ message: 'Failed to fetch outfit.', error: err.message });
  }
});

// PUT /api/outfits/:id - Update an outfit
router.put('/:id', auth, async (req, res) => {
  try {
    const { outfitName, outfitItems, occasion, weather, notes, wornDate, isFavorite } = req.body;
    
    const outfit = await Outfit.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!outfit) {
      return res.status(404).json({ message: 'Outfit not found.' });
    }

    // Update fields if provided
    if (outfitName !== undefined) outfit.outfitName = outfitName;
    if (outfitItems !== undefined) outfit.outfitItems = outfitItems;
    if (occasion !== undefined) outfit.occasion = occasion;
    if (weather !== undefined) outfit.weather = weather;
    if (notes !== undefined) outfit.notes = notes;
    if (wornDate !== undefined) outfit.wornDate = new Date(wornDate);
    if (isFavorite !== undefined) outfit.isFavorite = isFavorite;

    await outfit.save();
    
    // Populate the outfit items for response
    await outfit.populate('outfitItems.wardrobeItemId');
    
    res.json({ 
      message: 'Outfit updated successfully.', 
      outfit 
    });
  } catch (err) {
    console.error('Error updating outfit:', err);
    res.status(500).json({ message: 'Failed to update outfit.', error: err.message });
  }
});

// DELETE /api/outfits/:id - Delete an outfit
router.delete('/:id', auth, async (req, res) => {
  try {
    const outfit = await Outfit.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!outfit) {
      return res.status(404).json({ message: 'Outfit not found.' });
    }

    res.json({ message: 'Outfit deleted successfully.' });
  } catch (err) {
    console.error('Error deleting outfit:', err);
    res.status(500).json({ message: 'Failed to delete outfit.', error: err.message });
  }
});

// GET /api/outfits/favorites - Get favorite outfits
router.get('/favorites/list', auth, async (req, res) => {
  try {
    const outfits = await Outfit.find({ 
      userId: req.userId, 
      isFavorite: true 
    })
      .populate('outfitItems.wardrobeItemId')
      .sort({ wornDate: -1, createdAt: -1 });

    res.json({ outfits });
  } catch (err) {
    console.error('Error fetching favorite outfits:', err);
    res.status(500).json({ message: 'Failed to fetch favorite outfits.', error: err.message });
  }
});

// PUT /api/outfits/:id/favorite - Toggle favorite status
router.put('/:id/favorite', auth, async (req, res) => {
  try {
    const outfit = await Outfit.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!outfit) {
      return res.status(404).json({ message: 'Outfit not found.' });
    }

    outfit.isFavorite = !outfit.isFavorite;
    await outfit.save();
    
    res.json({ 
      message: `Outfit ${outfit.isFavorite ? 'added to' : 'removed from'} favorites.`, 
      outfit 
    });
  } catch (err) {
    console.error('Error toggling favorite:', err);
    res.status(500).json({ message: 'Failed to toggle favorite.', error: err.message });
  }
});

module.exports = router;
