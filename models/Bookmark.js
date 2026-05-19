const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  opportunityId: {
    type: String,
    required: true,
  },
  walletAddress: {
    type: String,
    default: 'anonymous',
    index: true,
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: {
    type: String,
    enum: ['bounty', 'grant', 'job', 'event', 'other'],
    default: 'bounty',
  },
  source: { type: String, default: 'Zero Authority DAO' },
  sourceUrl: { type: String, default: '' },
  reward: { type: String, default: 'TBD' },
  rewardToken: { type: String, default: 'USD' },
  deadline: { type: Date, default: null },
  tags: [{ type: String }],
  status: {
    type: String,
    enum: ['active', 'applied', 'won', 'expired'],
    default: 'active',
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate',
  },
  externalData: { type: mongoose.Schema.Types.Mixed, default: {} },
  savedAt: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

// Prevent duplicate bookmarks per wallet
bookmarkSchema.index({ opportunityId: 1, walletAddress: 1 }, { unique: true });

bookmarkSchema.virtual('isExpired').get(function () {
  if (!this.deadline) return false;
  return new Date() > new Date(this.deadline);
});

bookmarkSchema.virtual('daysLeft').get(function () {
  if (!this.deadline) return null;
  const diff = new Date(this.deadline) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

bookmarkSchema.set('toJSON', { virtuals: true });
bookmarkSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
