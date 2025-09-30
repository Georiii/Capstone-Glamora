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
  reason: { 
    type: String, 
    required: true 
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