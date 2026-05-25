const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username:       { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 32 },
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:       { type: String, required: true, minlength: 6 },
  avatar:         { type: String, default: '' },
  walletAddress:  { type: String, default: '' },

  // Personalization
  skills:         { type: [String], default: [] },       // e.g. ['React', 'UI/UX', 'Content']
  experienceLevel:{ type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'intermediate' },
  preferredCategories: { type: [String], default: [] },  // e.g. ['bounty', 'job']

  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
