const mongoose = require('mongoose');

const marketplaceItemSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String },
  userEmail: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MarketplaceItem', marketplaceItemSchema); 