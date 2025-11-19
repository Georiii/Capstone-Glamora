const mongoose = require('mongoose');

const customSubcategorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryType: { type: String, required: true, enum: ['Tops', 'Bottoms', 'Shoes', 'Accessories'] },
  name: { type: String, required: true },
  type: { type: String, required: true }, // This is the subcategory type used for filtering
  imageUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
customSubcategorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
customSubcategorySchema.index({ userId: 1, categoryType: 1 });

module.exports = mongoose.model('CustomSubcategory', customSubcategorySchema);

