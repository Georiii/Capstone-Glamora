const mongoose = require('mongoose');

const policyHistorySchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const policySchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  history: {
    type: [policyHistorySchema],
    default: [],
  },
});

const DEFAULT_POLICIES = [
  {
    key: 'terms',
    title: 'Terms and Conditions',
    content:
      'Welcome to Glamora! Replace this placeholder with the official Terms and Conditions text.',
  },
  {
    key: 'privacy',
    title: 'Privacy Policy',
    content:
      'Welcome to Glamora! Replace this placeholder with the official Privacy Policy text.',
  },
];

policySchema.statics.ensureDefaults = async function ensureDefaults() {
  for (const policy of DEFAULT_POLICIES) {
    await this.findOneAndUpdate(
      { key: policy.key },
      {
        $setOnInsert: {
          title: policy.title,
          content: policy.content,
          updatedAt: new Date(),
          updatedBy: null,
        },
      },
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('Policy', policySchema);

