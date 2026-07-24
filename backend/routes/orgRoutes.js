const express = require('express');
const router = express.Router();
const { createOrg, getMyOrgs } = require('../controllers/orgController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createOrg)
    .get(protect, getMyOrgs);

module.exports = router;
