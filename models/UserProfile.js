const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, default: '' },
  avatar: { type: String, default: '' },
  walletType: { type: String, enum: ['metamask', 'phantom', 'walletconnect', 'unknown'], default: 'unknown' },

  // Reputation
  reputationScore: { type: Number, default: 0 },
  totalBounties: { type: Number, default: 0 },
  wonBounties: { type: Number, default: 0 },
  totalGrants: { type: Number, default: 0 },
  bookmarkCount: { type: Number, default: 0 },

  // Badges
  badges: [{
    id: String,
    name: String,
    description: String,
    icon: String,
    earnedAt: { type: Date, default: Date.now },
  }],

  // Activity
  lastActive: { type: Date, default: Date.now },
  joinedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Compute badge tier based on reputation
userProfileSchema.virtual('tier').get(function () {
  if (this.reputationScore >= 1000) return { name: 'Top Contributor', color: '#FFD700', icon: '👑' };
  if (this.reputationScore >= 500) return { name: 'Active Hunter', color: '#00E5FF', icon: '🎯' };
  if (this.reputationScore >= 200) return { name: 'Builder', color: '#7C4DFF', icon: '🏗️' };
  if (this.reputationScore >= 50) return { name: 'Explorer', color: '#00BFA5', icon: '🔭' };
  return { name: 'Newcomer', color: '#78909C', icon: '🌱' };
});

userProfileSchema.set('toJSON', { virtuals: true });
userProfileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('UserProfile', userProfileSchema);
