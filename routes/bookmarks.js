const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bookmarkController');

router.get('/',              ctrl.getBookmarks);
router.post('/',             ctrl.saveBookmark);
router.delete('/:id',        ctrl.deleteBookmark);
router.patch('/:id/status',  ctrl.updateStatus);

module.exports = router;
