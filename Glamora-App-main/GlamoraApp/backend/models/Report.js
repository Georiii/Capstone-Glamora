const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  reportedUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  marketplaceItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketplaceItem',
    default: null
  },
  reason: { 
    type: String, 
    required: true 
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  evidencePhotos: {
    type: [
      {
        url: { type: String, required: true },
        filename: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'resolved'], 
    default: 'pending' 
  },
  adminNotes: { 
    type: String 
  },
  resolvedAt: { 
    type: Date 
  }
});

// Create index for efficient querying
reportSchema.index({ reportedUserId: 1, status: 1, timestamp: -1 });

module.exports = mongoose.model('Report', reportSchema); 