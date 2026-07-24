const express = require('express');
const router = express.Router();
const {
    createOrg,
    getMyOrgs,
    getOrgMembers,
    addOrgMember,
    removeOrgMember,
    deleteOrg
} = require('../controllers/orgController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createOrg)
    .get(protect, getMyOrgs);

router.route('/:id')
    .delete(protect, deleteOrg);

router.route('/:id/members')
    .get(protect, getOrgMembers)
    .post(protect, addOrgMember);

router.route('/:id/members/:memberId')
    .delete(protect, removeOrgMember);

module.exports = router;
