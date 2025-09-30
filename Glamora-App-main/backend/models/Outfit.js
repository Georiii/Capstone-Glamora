const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  outfitName: { type: String, required: true }, // e.g., "Outfit 1", "Casual Friday"
  outfitItems: [{
    wardrobeItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'WardrobeItem', required: true },
    itemName: { type: String, required: true },
    itemDescription: { type: String },
    itemImageUrl: { type: String },
    itemCategory: { type: String }, // e.g., "Tops", "Bottoms", "Shoes", "Accessories"
  }],
  occasion: { type: String }, // e.g., "Casual", "Work", "Party", "Formal"
  weather: { type: String }, // e.g., "Sunny", "Rainy", "Cold", "Warm"
  notes: { type: String }, // User's personal notes about the outfit
  isFavorite: { type: Boolean, default: false },
  wornDate: { type: Date, default: Date.now }, // When the outfit was worn
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
outfitSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Outfit', outfitSchema);
