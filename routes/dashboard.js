// routes/dashboard.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboardController');

router.get('/', ctrl.getDashboard);

module.exports = router;
