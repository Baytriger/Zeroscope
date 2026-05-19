const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/walletController');

router.post('/connect',    ctrl.connectWallet);
router.post('/disconnect', ctrl.disconnectWallet);
router.get('/profile',     ctrl.getProfile);

module.exports = router;
