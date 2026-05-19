const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  walletAddress: { type: String, default: 'global', index: true },
  type: {
    type: String,
    enum: ['new_bounty', 'deadline_warning', 'deadline_critical', 'won', 'new_grant', 'new_job', 'system'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  opportunityId: { type: String, default: null },
  opportunityTitle: { type: String, default: null },
  read: { type: Boolean, default: false },
  link: { type: String, default: null },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Notification', notificationSchema);
