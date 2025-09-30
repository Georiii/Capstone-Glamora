const mongoose = require('mongoose');

const wardrobeItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  clothName: { type: String, required: true },
  description: { type: String },
  categories: [{ type: String }],
  occasions: [{ type: String }],
  category: { type: String },
  // New fields for AI recommendations
  weather: { type: String, enum: ['Sunny', 'Rainy', 'Cold', 'Warm', 'Cloudy'] },
  color: { type: String },
  style: { type: String, enum: ['Casual', 'Formal', 'Sporty', 'Vintage', 'Minimalist', 'Streetwear'] },
  // Additional metadata for better recommendations
  season: { type: String, enum: ['Spring', 'Summer', 'Fall', 'Winter', 'All'] },
  fabric: { type: String },
  fit: { type: String, enum: ['Loose', 'Regular', 'Fitted'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
wardrobeItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('WardrobeItem', wardrobeItemSchema); 