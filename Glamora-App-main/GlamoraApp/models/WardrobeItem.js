const mongoose = require('mongoose');

const wardrobeItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  clothName: { type: String, required: true },
  description: { type: String },
  categories: [{ type: String }],
  occasions: [{ type: String }],
  category: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WardrobeItem', wardrobeItemSchema); 