const Organization = require('../models/Organization');
const Member = require('../models/Member');

// @desc    Create a new organization
// @route   POST /api/orgs
// @access  Private
const createOrg = async (req, res) => {
    try {
        const { name, industry } = req.body;
        
        const org = new Organization({
            name,
            industry,
            createdBy: req.user._id
        });
        
        await org.save();
        
        // Make creator an owner
        const member = new Member({
            userId: req.user._id,
            organizationId: org._id,
            role: 'Owner',
            status: 'Active'
        });
        await member.save();
        
        res.status(201).json({ success: true, data: org });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error creating organization' });
    }
};

// @desc    Get all organizations for logged in user
// @route   GET /api/orgs
// @access  Private
const getMyOrgs = async (req, res) => {
    try {
        const memberships = await Member.find({ userId: req.user._id, status: 'Active' })
            .populate('organizationId');
            
        const orgs = memberships.map(m => m.organizationId);
        res.json({ success: true, data: orgs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching organizations' });
    }
};

module.exports = { createOrg, getMyOrgs };
