const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// Mark all as read
router.post('/read-all', async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress || 'anonymous';
    await Notification.updateMany(
      { $or: [{ walletAddress }, { walletAddress: 'global' }] },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Mark one as read
router.post('/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Delete one
router.delete('/:id', async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
