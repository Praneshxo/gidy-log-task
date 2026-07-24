const crypto = require('crypto');
const Organization = require('../models/Organization');
const Member = require('../models/Member');
const User = require('../models/User');
const Log = require('../models/Log');

const MANAGE_ROLES = ['Owner', 'Admin'];

const getMembership = async (userId, organizationId) => {
    return Member.findOne({ userId, organizationId, status: 'Active' });
};

const requireMembership = async (req, res, orgId) => {
    const membership = await getMembership(req.user._id, orgId);
    if (!membership) {
        res.status(403).json({ success: false, message: 'You are not a member of this organization' });
        return null;
    }
    return membership;
};

const requireManageAccess = async (req, res, orgId) => {
    const membership = await requireMembership(req, res, orgId);
    if (!membership) return null;
    if (!MANAGE_ROLES.includes(membership.role)) {
        res.status(403).json({ success: false, message: 'Only Owner or Admin can manage this organization' });
        return null;
    }
    return membership;
};

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

        // Org creator is Admin
        const member = new Member({
            userId: req.user._id,
            organizationId: org._id,
            role: 'Admin',
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

        const orgs = memberships.map(m => m.organizationId).filter(Boolean);
        res.json({ success: true, data: orgs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching organizations' });
    }
};

// @desc    Get members of an organization
// @route   GET /api/orgs/:id/members
// @access  Private (org member)
const normalizeRole = (role) => (role === 'Owner' ? 'Admin' : role);

const getOrgMembers = async (req, res) => {
    try {
        const orgId = req.params.id;
        const membership = await requireMembership(req, res, orgId);
        if (!membership) return;

        // Legacy: migrate Owner → Admin (creator is admin)
        await Member.updateMany(
            { organizationId: orgId, role: 'Owner' },
            { $set: { role: 'Admin' } }
        );

        if (membership.role === 'Owner') {
            membership.role = 'Admin';
        }

        const members = await Member.find({ organizationId: orgId })
            .populate('userId', 'name email avatar')
            .sort({ createdAt: 1 });

        const data = members
            .filter((m) => m.userId)
            .map((m) => ({
                _id: m._id,
                role: normalizeRole(m.role),
                status: m.status,
                createdAt: m.createdAt,
                user: {
                    _id: m.userId._id,
                    name: m.userId.name,
                    email: m.userId.email,
                    avatar: m.userId.avatar
                }
            }));

        res.json({
            success: true,
            data,
            myRole: normalizeRole(membership.role)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching members' });
    }
};

// @desc    Add a person to org by email (no OTP — grants Active access)
// @route   POST /api/orgs/:id/members
// @access  Private (Owner/Admin)
const addOrgMember = async (req, res) => {
    try {
        const orgId = req.params.id;
        const membership = await requireManageAccess(req, res, orgId);
        if (!membership) return;

        const email = (req.body.email || '').trim().toLowerCase();
        const role = req.body.role || 'Viewer';

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const allowedRoles = ['Admin', 'Security Analyst', 'Viewer'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        let user = await User.findOne({ email });
        let createdUser = false;

        // Create account if missing — no OTP. They set a password via Forgot Password.
        if (!user) {
            const tempPassword = crypto.randomBytes(16).toString('hex');
            const nameFromEmail = email.split('@')[0] || 'User';
            user = new User({
                name: nameFromEmail,
                email,
                password: tempPassword,
                isVerified: true
            });
            await user.save();
            createdUser = true;
        }

        const existing = await Member.findOne({ userId: user._id, organizationId: orgId });
        if (existing) {
            if (existing.status === 'Active') {
                return res.status(400).json({ success: false, message: 'User is already a member of this organization' });
            }
            existing.status = 'Active';
            existing.role = role;
            await existing.save();
        } else {
            await Member.create({
                userId: user._id,
                organizationId: orgId,
                role,
                status: 'Active'
            });
        }

        const message = createdUser
            ? `Access granted to ${email}. They can sign in after setting a password via Forgot Password.`
            : `Access granted to ${email}`;

        res.status(201).json({
            success: true,
            message,
            data: {
                user: { _id: user._id, name: user.name, email: user.email },
                role,
                status: 'Active',
                createdUser
            }
        });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'User is already a member of this organization' });
        }
        res.status(500).json({ success: false, message: 'Server error adding member' });
    }
};

// @desc    Remove a member from organization
// @route   DELETE /api/orgs/:id/members/:memberId
// @access  Private (Owner/Admin)
const removeOrgMember = async (req, res) => {
    try {
        const { id: orgId, memberId } = req.params;
        const membership = await requireManageAccess(req, res, orgId);
        if (!membership) return;

        const target = await Member.findOne({ _id: memberId, organizationId: orgId });
        if (!target) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        if (target.role === 'Owner' || target.role === 'Admin') {
            const org = await Organization.findById(orgId);
            if (org && String(org.createdBy) === String(target.userId)) {
                return res.status(400).json({ success: false, message: 'Cannot remove the organization admin (creator)' });
            }
        }

        if (String(target.userId) === String(req.user._id)) {
            return res.status(400).json({ success: false, message: 'Cannot remove yourself' });
        }

        await target.deleteOne();
        res.json({ success: true, message: 'Member removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error removing member' });
    }
};

// @desc    Delete organization and cascade members + logs
// @route   DELETE /api/orgs/:id
// @access  Private (Admin)
const deleteOrg = async (req, res) => {
    try {
        const orgId = req.params.id;
        const membership = await requireMembership(req, res, orgId);
        if (!membership) return;

        if (!MANAGE_ROLES.includes(membership.role)) {
            return res.status(403).json({ success: false, message: 'Only Admin can delete this organization' });
        }

        const org = await Organization.findById(orgId);
        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        await Promise.all([
            Log.deleteMany({ organizationId: orgId }),
            Member.deleteMany({ organizationId: orgId }),
            Organization.deleteOne({ _id: orgId })
        ]);

        res.json({ success: true, message: 'Organization deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error deleting organization' });
    }
};

module.exports = {
    createOrg,
    getMyOrgs,
    getOrgMembers,
    addOrgMember,
    removeOrgMember,
    deleteOrg
};
