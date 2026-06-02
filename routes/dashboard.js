// routes/dashboard.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboardController');

// Landing page for unauthenticated users
router.get('/', (req, res) => {
  if (req.session.userId) {
    // Logged in - show dashboard
    return ctrl.getDashboard(req, res, (err) => {
      if (err) res.status(500).render('error', { title: 'Error', code: 500, message: err.message });
    });
  } else {
    // Not logged in - show landing page
    res.render('landing', {
      title: 'ZEROSCOPE — Web3 Opportunity Dashboard',
    });
  }
});

module.exports = router;
