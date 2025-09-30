const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  text: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  read: { 
    type: Boolean, 
    default: false 
  },
  productId: { 
    type: String, 
    required: false 
  },
  productName: { 
    type: String, 
    required: false 
  }
});

// Create compound index for efficient querying of conversations
chatMessageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema); 