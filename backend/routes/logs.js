const express = require('express');
const router = express.Router();
const { 
    bulkUploadLogs, 
    getLogs, 
    getStats,
    bulkUpdateLogs,
    bulkDeleteLogs,
    moveLogs
} = require('../controllers/logController');
const { protect } = require('../middleware/authMiddleware');

// All log routes are protected
router.use(protect);

router.route('/stats')
    .get(getStats);

router.route('/')
    .get(getLogs);

router.route('/bulk')
    .post(bulkUploadLogs);

router.route('/bulk-update')
    .put(bulkUpdateLogs);

router.route('/bulk-delete')
    .delete(bulkDeleteLogs);

router.route('/move')
    .post(moveLogs);

module.exports = router;
