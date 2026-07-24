const Log = require('../models/Log');

// Helper to check if organization ID is present
const checkOrgId = (req, res) => {
    const orgId = req.headers['x-organization-id'];
    if (!orgId) {
        res.status(400).json({ success: false, message: 'Organization ID is required in headers (x-organization-id)' });
        return null;
    }
    return orgId;
};

// @desc    Bulk upload logs
// @route   POST /api/logs/bulk
// @access  Private
const bulkUploadLogs = async (req, res) => {
    const orgId = checkOrgId(req, res);
    if (!orgId) return;

    try {
        let logs = req.body;

        if (!Array.isArray(logs) || logs.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid data format. Expected a non-empty array of logs.' });
        }

        // Add organizationId to each log
        logs = logs.map(log => ({ ...log, organizationId: orgId }));

        const CHUNK_SIZE = 2000;
        let insertedCount = 0;
        const allErrors = [];

        for (let i = 0; i < logs.length; i += CHUNK_SIZE) {
            const chunk = logs.slice(i, i + CHUNK_SIZE);
            try {
                const result = await Log.insertMany(chunk, { ordered: false });
                insertedCount += result.length;
            } catch (error) {
                if (error.name === 'BulkWriteError' || error.code === 11000) {
                    insertedCount += error.result.nInserted;
                    const mappedErrors = error.writeErrors.map(e => ({
                        index: i + e.index,
                        message: e.errmsg
                    }));
                    allErrors.push(...mappedErrors);
                } else {
                    throw error;
                }
            }
        }

        if (allErrors.length > 0) {
            return res.status(207).json({
                success: true,
                message: 'Partial success. Some logs failed validation.',
                insertedCount,
                errors: allErrors
            });
        }
        
        res.status(201).json({
            success: true,
            message: `Successfully inserted ${insertedCount} logs.`,
            count: insertedCount
        });
    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ success: false, message: 'Server error during bulk upload' });
    }
};

// @desc    Get logs with filtering, sorting, pagination and search
// @route   GET /api/logs
// @access  Private
const getLogs = async (req, res) => {
    const orgId = checkOrgId(req, res);
    if (!orgId) return;

    try {
        const { 
            page = 1, 
            limit = 50, 
            severity, 
            status, 
            resolution,
            search,
            sortBy = 'timestamp',
            sortOrder = 'desc'
        } = req.query;

        // Build query object with orgId isolation
        const query = { organizationId: orgId };
        const andConditions = [];

        if (severity) query.severity = severity;
        if (status) query.status = status;

        if (resolution === 'UNRESOLVED') {
            andConditions.push({
                $or: [
                    { resolution: 'UNRESOLVED' },
                    { resolution: { $exists: false } },
                    { resolution: null }
                ]
            });
        } else if (resolution) {
            query.resolution = resolution;
        }

        if (search) {
            andConditions.push({
                $or: [
                    { actor: { $regex: search, $options: 'i' } },
                    { resource: { $regex: search, $options: 'i' } },
                    { action: { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (andConditions.length) {
            query.$and = andConditions;
        }

        const pageNum = parseInt(page, 10);
        const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
        const skip = (pageNum - 1) * limitNum;

        const allowedSort = new Set(['timestamp', 'action', 'actor', 'severity', 'status', 'resolution', 'resource']);
        const sortField = allowedSort.has(sortBy) ? sortBy : 'timestamp';
        const sortOptions = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

        const logsPromise = Log.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum)
            .lean();

        const countPromise = Log.countDocuments(query);

        const [logs, totalRecords] = await Promise.all([logsPromise, countPromise]);

        const totalPages = Math.ceil(totalRecords / limitNum) || 1;

        res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                totalRecords,
                totalPages,
                currentPage: pageNum,
                limit: limitNum
            }
        });

    } catch (error) {
        console.error('Fetch logs error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching logs' });
    }
};

// @desc    Get dashboard analytics stats
// @route   GET /api/logs/stats
// @access  Private
const getStats = async (req, res) => {
    const orgId = checkOrgId(req, res);
    if (!orgId) return;

    try {
        // Must cast orgId to ObjectId for aggregate pipeline
        const mongoose = require('mongoose');
        const matchStage = { $match: { organizationId: new mongoose.Types.ObjectId(orgId) } };

        const stats = await Log.aggregate([
            matchStage,
            {
                $facet: {
                    totalEvents: [{ $count: "count" }],
                    criticalHigh: [
                        { $match: { severity: { $in: ["CRITICAL", "HIGH"] } } },
                        { $count: "count" }
                    ],
                    failedEvents: [
                        { $match: { status: "FAILURE" } },
                        { $count: "count" }
                    ],
                    severityBreakdown: [
                        { $group: { _id: "$severity", count: { $sum: 1 } } }
                    ]
                }
            }
        ]);

        const result = {
            totalEvents: stats[0].totalEvents[0]?.count || 0,
            criticalHigh: stats[0].criticalHigh[0]?.count || 0,
            failedEvents: stats[0].failedEvents[0]?.count || 0,
            severityBreakdown: stats[0].severityBreakdown.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {})
        };

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching stats' });
    }
};

// @desc    Bulk update logs (e.g. mark as FIXED)
// @route   PUT /api/logs/bulk-update
// @access  Private
const bulkUpdateLogs = async (req, res) => {
    const orgId = checkOrgId(req, res);
    if (!orgId) return;

    try {
        const { logIds, updateData } = req.body; // e.g. updateData: { resolution: 'FIXED' }
        if (!Array.isArray(logIds) || logIds.length === 0) {
            return res.status(400).json({ success: false, message: 'logIds array is required' });
        }

        const result = await Log.updateMany(
            { _id: { $in: logIds }, organizationId: orgId },
            { $set: updateData }
        );

        res.json({ success: true, message: `Updated ${result.modifiedCount} logs` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error updating logs' });
    }
};

// @desc    Bulk delete logs
// @route   DELETE /api/logs/bulk-delete
// @access  Private
const bulkDeleteLogs = async (req, res) => {
    const orgId = checkOrgId(req, res);
    if (!orgId) return;

    try {
        const { logIds } = req.body;
        if (!Array.isArray(logIds) || logIds.length === 0) {
            return res.status(400).json({ success: false, message: 'logIds array is required' });
        }

        const result = await Log.deleteMany({
            _id: { $in: logIds },
            organizationId: orgId
        });

        res.json({ success: true, message: `Deleted ${result.deletedCount} logs` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error deleting logs' });
    }
};

// @desc    Move logs to another organization/folder
// @route   POST /api/logs/move
// @access  Private
const moveLogs = async (req, res) => {
    const orgId = checkOrgId(req, res);
    if (!orgId) return;

    try {
        const { logIds, targetOrganizationId } = req.body;
        if (!Array.isArray(logIds) || logIds.length === 0 || !targetOrganizationId) {
            return res.status(400).json({ success: false, message: 'logIds array and targetOrganizationId are required' });
        }

        const result = await Log.updateMany(
            { _id: { $in: logIds }, organizationId: orgId },
            { $set: { organizationId: targetOrganizationId } }
        );

        res.json({ success: true, message: `Moved ${result.modifiedCount} logs` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error moving logs' });
    }
};

module.exports = {
    bulkUploadLogs,
    getLogs,
    getStats,
    bulkUpdateLogs,
    bulkDeleteLogs,
    moveLogs
};
