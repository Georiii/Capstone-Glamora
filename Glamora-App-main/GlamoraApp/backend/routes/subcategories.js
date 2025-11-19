const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/database');
const CustomSubcategory = require('../models/CustomSubcategory');
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

// POST /api/subcategories - Create a new custom subcategory
router.post('/', auth, async (req, res) => {
  try {
    console.log('🔍 Creating custom subcategory...');
    console.log('📝 Request body:', req.body);
    console.log('👤 User ID:', req.userId);

    const { categoryType, name, type, imageUrl } = req.body;

    if (!categoryType || !name || !type || !imageUrl) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'categoryType, name, type, and imageUrl are required.' });
    }

    // Validate categoryType
    const validCategoryTypes = ['Tops', 'Bottoms', 'Shoes', 'Accessories'];
    if (!validCategoryTypes.includes(categoryType)) {
      return res.status(400).json({ message: 'Invalid categoryType. Must be one of: Tops, Bottoms, Shoes, Accessories.' });
    }

    // Check if subcategory with same type already exists for this user and category
    const existing = await CustomSubcategory.findOne({
      userId: req.userId,
      categoryType: categoryType,
      type: type
    });

    if (existing) {
      return res.status(409).json({ message: 'A subcategory with this type already exists for this category.' });
    }

    // If it's a local image URL, upload to Cloudinary first
    let optimizedImageUrl = imageUrl;
    if (imageUrl.startsWith('file://') || imageUrl.startsWith('data:') || imageUrl.startsWith('content://')) {
      try {
        console.log('☁️ Uploading subcategory image to Cloudinary...');
        const result = await cloudinary.uploader.upload(imageUrl, {
          folder: 'glamora/subcategories',
          transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'center' },
            { quality: 'auto' }
          ]
        });
        optimizedImageUrl = result.secure_url;
        console.log('✅ Cloudinary upload successful:', optimizedImageUrl);
      } catch (uploadErr) {
        console.error('❌ Cloudinary upload failed:', uploadErr);
        return res.status(500).json({ message: 'Failed to upload image.', error: uploadErr.message });
      }
    }

    console.log('💾 Creating CustomSubcategory...');
    const subcategory = new CustomSubcategory({
      userId: req.userId,
      categoryType,
      name,
      type,
      imageUrl: optimizedImageUrl,
    });

    console.log('💾 Saving to database...');
    await subcategory.save();
    console.log('✅ Custom subcategory saved successfully:', subcategory._id);

    res.status(201).json({ message: 'Custom subcategory created successfully.', subcategory });
  } catch (err) {
    console.error('❌ Error creating custom subcategory:', err);
    res.status(500).json({ message: 'Failed to create subcategory.', error: err.message });
  }
});

// GET /api/subcategories/:categoryType - Get all custom subcategories for a category
router.get('/:categoryType', auth, async (req, res) => {
  try {
    console.log('🔍 Fetching custom subcategories...');
    console.log('📝 Category Type:', req.params.categoryType);
    console.log('👤 User ID:', req.userId);

    const { categoryType } = req.params;

    // Validate categoryType
    const validCategoryTypes = ['Tops', 'Bottoms', 'Shoes', 'Accessories'];
    if (!validCategoryTypes.includes(categoryType)) {
      return res.status(400).json({ message: 'Invalid categoryType. Must be one of: Tops, Bottoms, Shoes, Accessories.' });
    }

    const subcategories = await CustomSubcategory.find({
      userId: req.userId,
      categoryType: categoryType
    }).sort({ createdAt: -1 });

    console.log(`📊 Found ${subcategories.length} custom subcategories for ${categoryType}`);

    res.json({ subcategories });
  } catch (err) {
    console.error('❌ Error fetching custom subcategories:', err);
    res.status(500).json({ message: 'Failed to fetch subcategories.', error: err.message });
  }
});

// DELETE /api/subcategories/:id - Delete a custom subcategory
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('🗑️ Deleting custom subcategory...');
    console.log('📝 Subcategory ID:', req.params.id);
    console.log('👤 User ID:', req.userId);

    const subcategory = await CustomSubcategory.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!subcategory) {
      console.log('❌ Subcategory not found or doesn\'t belong to user');
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    console.log('✅ Custom subcategory deleted successfully:', subcategory._id);
    res.json({ message: 'Subcategory deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting custom subcategory:', err);
    res.status(500).json({ message: 'Failed to delete subcategory.', error: err.message });
  }
});

module.exports = router;

