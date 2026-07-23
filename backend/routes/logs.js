const express = require('express');
const router = express.Router();
const { bulkUploadLogs, getLogs, getStats } = require('../controllers/logController');

router.route('/stats')
    .get(getStats);

router.route('/')
    .get(getLogs);

router.route('/bulk')
    .post(bulkUploadLogs);

module.exports = router;
