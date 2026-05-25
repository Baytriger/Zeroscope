const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const User     = require('../models/User');
const UserProfile = require('../models/UserProfile');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only'));
    cb(null, true);
  },
});

// GET /profile
router.get('/', async (req, res) => {
  let profile = null;
  let loggedInUser = null;

  if (req.session.walletAddress) {
    profile = await UserProfile.findOne({ walletAddress: req.session.walletAddress }).lean({ virtuals: true });
  }
  if (req.session.userId) {
    loggedInUser = await User.findById(req.session.userId).lean();
  }

  res.render('profile', {
    title: 'Profile — ZEROSCOPE',
    profile,
    loggedInUser,
    walletAddress: req.session.walletAddress || null,
    unreadCount: (req.session.notifications || []).filter(n => !n.read).length,
  });
});

// POST /profile/update — save avatar + username (wallet profile)
router.post('/update', upload.single('avatar'), async (req, res) => {
  if (!req.session.walletAddress) {
    return res.status(401).json({ success: false, message: 'Wallet not connected' });
  }
  const { displayName } = req.body;
  const updateData = { displayName: displayName?.trim() || '' };
  if (req.file) {
    updateData.avatar = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
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

// POST /profile/skills — save skills + experience level for logged-in user
router.post('/skills', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Not logged in' });
  }
  try {
    const { skills, experienceLevel, preferredCategories } = req.body;

    // Parse skills — accept comma-separated string or array
    let skillsArr = [];
    if (typeof skills === 'string') {
      skillsArr = skills.split(',').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(skills)) {
      skillsArr = skills.map(s => s.trim()).filter(Boolean);
    }

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      {
        $set: {
          skills: skillsArr,
          experienceLevel: experienceLevel || 'intermediate',
          preferredCategories: Array.isArray(preferredCategories)
            ? preferredCategories
            : (preferredCategories ? [preferredCategories] : []),
        },
      },
      { new: true }
    );

    // Update session
    req.session.username = user.username;
    res.json({ success: true, skills: user.skills, experienceLevel: user.experienceLevel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
