const mongoose = require('mongoose');

const conversationContextSchema = new mongoose.Schema({
  participantsHash: { type: String, unique: true, required: true },
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ],
  productId: { type: String, default: null },
  productName: { type: String, default: '' },
  productImage: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

conversationContextSchema.index({ participantsHash: 1 }, { unique: true });

module.exports = mongoose.model('ConversationContext', conversationContextSchema);

