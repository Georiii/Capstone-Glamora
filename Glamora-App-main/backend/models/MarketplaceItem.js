const mongoose = require('mongoose');

const marketplaceItemSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String },
  userEmail: { type: String },
  userProfilePicture: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'] }, // No default - legacy items won't have this field
  rejectionReason: { type: String },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'marketplaceitems' // Explicitly set collection name to match database
});

module.exports = mongoose.model('MarketplaceItem', marketplaceItemSchema); 