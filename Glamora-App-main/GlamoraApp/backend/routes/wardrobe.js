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

    // Reject file:// URIs - they should be converted to base64 on client side
    if (imageUrl.startsWith('file://') || imageUrl.startsWith('content://')) {
      console.error('❌ Rejected file:// URI in upload-image:', imageUrl.substring(0, 50));
      return res.status(400).json({ 
        message: 'Invalid image format. File URIs must be converted to base64 before upload.' 
      });
    }

    // Upload to Cloudinary with optimization
    // Cloudinary can handle: http/https URLs, data URIs (base64), and file paths (server-side only)
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
    // Provide more specific error messages
    let errorMessage = 'Failed to upload image.';
    if (err.message && err.message.includes('Invalid image file')) {
      errorMessage = 'Invalid image format. Please ensure the image is a valid JPEG or PNG file.';
    } else if (err.message && err.message.includes('API key')) {
      errorMessage = 'Image upload service configuration error. Please contact support.';
    }
    res.status(500).json({ message: errorMessage, error: err.message });
  }
});

// POST /api/wardrobe/signature - Create short-lived signature for direct signed uploads
router.post('/signature', auth, async (req, res) => {
  try {
    const { folder = 'glamora/wardrobe' } = req.body || {};
    const timestamp = Math.floor(Date.now() / 1000);

    // Sign parameters for a standard image upload with folder
    const paramsToSign = { timestamp, folder };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      cloudinary.config().api_secret
    );

    return res.json({
      cloudName: cloudinary.config().cloud_name,
      apiKey: cloudinary.config().api_key,
      timestamp,
      folder,
      signature,
    });
  } catch (err) {
    console.error('Error creating Cloudinary signature:', err);
    return res.status(500).json({ message: 'Failed to create upload signature' });
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

    // Check subscription status and enforce wardrobe limit
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Normalize subscription status
    const subscription = user.subscription || {};
    let isSubscribed = subscription.isSubscribed || false;
    
    // Check if subscription has expired
    if (isSubscribed && subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
      isSubscribed = false;
    }

    // Free users: limit to 10 items per category, PLUS users: unlimited
    const FREE_USER_LIMIT_PER_CATEGORY = 10;
    
    if (!isSubscribed && category) {
      // Count items for this specific category
      const categoryItemCount = await WardrobeItem.countDocuments({ 
        userId: req.userId,
        category: category
      });
      
      if (categoryItemCount >= FREE_USER_LIMIT_PER_CATEGORY) {
        console.log(`❌ Wardrobe limit reached for category ${category}: ${categoryItemCount}/${FREE_USER_LIMIT_PER_CATEGORY}`);
        return res.status(403).json({ 
          message: `You've reached the free wardrobe limit of ${FREE_USER_LIMIT_PER_CATEGORY} items for ${category}. Subscribe to Glamora PLUS for unlimited storage.`,
          limitReached: true
        });
      }
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
    console.log(`🗑️ Delete request for item: ${req.params.id} by user: ${req.userId}`);
    const item = await WardrobeItem.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!item) {
      console.log(`❌ Item not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Item not found' });
    }
    console.log(`✅ Item deleted successfully: ${req.params.id}`);
    // Optionally: delete image from storage if needed
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting item:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/marketplace - add a new marketplace item
router.post('/marketplace', auth, async (req, res) => {
  try {
    const { imageUrl, name, description, price } = req.body;
    if (!imageUrl || !name || !price) return res.status(400).json({ message: 'Missing required fields: imageUrl, name, and price' });
    
    // Reject local file:// URIs - images must be uploaded client-side first
    if (imageUrl.startsWith('file://') || imageUrl.startsWith('content://')) {
      console.error('❌ Rejected local file URI in marketplace submission:', imageUrl.substring(0, 50));
      return res.status(400).json({ 
        message: 'Invalid image URL. Please upload the image first. Local file paths are not supported.' 
      });
    }
    
    // If it's a data URI, try to upload it (base64 images)
    let optimizedImageUrl = imageUrl;
    if (imageUrl.startsWith('data:')) {
      try {
        const result = await cloudinary.uploader.upload(imageUrl, {
          folder: 'glamora/marketplace',
          transformation: [
            { width: 400, height: 500, crop: 'fill' },
            { quality: 'auto' }
          ]
        });
        optimizedImageUrl = result.secure_url;
      } catch (uploadErr) {
        console.error('❌ Cloudinary upload failed (marketplace):', uploadErr);
        return res.status(400).json({ 
          message: 'Failed to upload image. Please try again or use a different image.' 
        });
      }
    }
    
    // Validate that we have a valid web URL (http/https)
    if (!optimizedImageUrl.startsWith('http://') && !optimizedImageUrl.startsWith('https://')) {
      console.error('❌ Invalid image URL format:', optimizedImageUrl.substring(0, 50));
      return res.status(400).json({ 
        message: 'Invalid image URL format. Image must be a web-accessible URL.' 
      });
    }

    // Get user information from database including profile picture
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const item = new MarketplaceItem({
      imageUrl: optimizedImageUrl,
      name,
      description,
      price,
      userId: req.userId,
      userName: user.name || '',
      userEmail: user.email || '',
      userProfilePicture: user.profilePicture?.url || '', // Include seller's profile picture
      status: 'Pending',
    });
    await item.save();
    res.status(201).json({ message: 'Marketplace item posted and pending review', item });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/marketplace - list all marketplace items (with optional search)
router.get('/marketplace', async (req, res) => {
  try {
    const search = req.query.search || '';
    const status = req.query.status || 'Approved';
    // Show only approved items by default. Treat documents without status as Approved for backward compatibility.
    const baseStatusFilter = status === 'all' ? {} : {
      $or: [
        { status: status },
        ...(status === 'Approved' ? [{ status: { $exists: false } }] : [])
      ]
    };

    const textFilter = search ? { name: { $regex: search, $options: 'i' } } : {};
    const query = { ...baseStatusFilter, ...textFilter };

    const items = await MarketplaceItem.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'profilePicture');
    
    // Update each item with the latest profile picture from the user
    const itemsWithUpdatedPictures = items.map(item => {
      const itemObj = item.toObject();
      if (item.userId && item.userId.profilePicture && item.userId.profilePicture.url) {
        itemObj.userProfilePicture = item.userId.profilePicture.url;
      }
      // Remove populated userId to avoid exposing unnecessary data
      delete itemObj.userId;
      return itemObj;
    });
    
    res.json({ items: itemsWithUpdatedPictures });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/marketplace/user - list marketplace items for current user
router.get('/marketplace/user', auth, async (req, res) => {
  try {
    // Return all items for the current user with their moderation status
    const items = await MarketplaceItem.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Admin Moderation Endpoints ---
// Simple admin check using user role; if not admin, 403
async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (user && user.role === 'admin') return next();
    return res.status(403).json({ message: 'Admin access required' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
}

// List pending items for moderation
router.get('/marketplace/moderation/pending', auth, requireAdmin, async (req, res) => {
  try {
    const items = await MarketplaceItem.find({ status: 'Pending' }).sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve an item
router.put('/marketplace/:id/approve', auth, requireAdmin, async (req, res) => {
  try {
    const item = await MarketplaceItem.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved', approvedAt: new Date(), rejectionReason: null },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item approved', item });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject an item and notify user via Chat (if admin exists)
router.put('/marketplace/:id/reject', auth, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const item = await MarketplaceItem.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected', rejectedAt: new Date(), rejectionReason: reason || 'Not specified' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });

    // Attempt to send a system message to the seller
    try {
      const ChatMessage = require('../models/Chat');
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        await ChatMessage.create({
          senderId: adminUser._id,
          receiverId: item.userId,
          text: `Your marketplace post "${item.name}" was rejected. Reason: ${reason || 'Not specified'}. Please review the community guidelines and submit again.`,
          timestamp: new Date(),
          read: false
        });
      }
    } catch (notifyErr) {
      // Do not fail the request if messaging fails
      console.warn('Moderation notification failed:', notifyErr?.message);
    }

    res.json({ message: 'Item rejected', item });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/wardrobe/marketplace/:id - update marketplace item
router.put('/marketplace/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ message: 'Missing required fields: name and price' });
    }

    const item = await MarketplaceItem.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { name, description, price },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found or not authorized' });
    }

    res.json({ message: 'Item updated successfully', item });
  } catch (err) {
    console.error('Error updating marketplace item:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/wardrobe/marketplace/:id - delete marketplace item
router.delete('/marketplace/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await MarketplaceItem.findOneAndDelete({ _id: id, userId: req.userId });
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found or not authorized' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error deleting marketplace item:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 