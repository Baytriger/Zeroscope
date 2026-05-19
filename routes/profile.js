const express = require('express');
const router = express.Router();
const multer = require('multer');
const UserProfile = require('../models/UserProfile');

// Store file in memory so we can convert to base64
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// GET /profile
router.get('/', async (req, res) => {
  let profile = null;
  if (req.session.walletAddress) {
    profile = await UserProfile.findOne({ walletAddress: req.session.walletAddress }).lean({ virtuals: true });
  }
  res.render('profile', {
    title: 'Profile — ZEROSCOPE',
    profile,
    walletAddress: req.session.walletAddress || null,
    unreadCount: (req.session.notifications || []).filter(n => !n.read).length,
  });
});

// POST /profile/update — save username + uploaded avatar
router.post('/update', upload.single('avatar'), async (req, res) => {
  if (!req.session.walletAddress) {
    return res.status(401).json({ success: false, message: 'Wallet not connected' });
  }
  const { displayName } = req.body;
  const updateData = { displayName: displayName?.trim() || '' };

  // If a new image was uploaded, convert to base64 data URI
  if (req.file) {
    const base64 = req.file.buffer.toString('base64');
    updateData.avatar = `data:${req.file.mimetype};base64,${base64}`;
  }

  try {
    const profile = await UserProfile.findOneAndUpdate(
      { walletAddress: req.session.walletAddress },
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
