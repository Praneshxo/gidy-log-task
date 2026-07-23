const Log = require('../models/Log');

// @desc    Bulk upload logs
// @route   POST /api/logs/bulk
// @access  Public
const bulkUploadLogs = async (req, res) => {
    try {
        const logs = req.body;

        if (!Array.isArray(logs) || logs.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid data format. Expected a non-empty array of logs.' });
        }

        // Process in chunks to prevent massive memory spikes on the DB
        const CHUNK_SIZE = 2000;
        let insertedCount = 0;
        const allErrors = [];

        for (let i = 0; i < logs.length; i += CHUNK_SIZE) {
            const chunk = logs.slice(i, i + CHUNK_SIZE);
            try {
                // ordered: false allows valid documents in the chunk to pass even if some fail
                const result = await Log.insertMany(chunk, { ordered: false });
                insertedCount += result.length;
            } catch (error) {
                if (error.name === 'BulkWriteError' || error.code === 11000) {
                    insertedCount += error.result.nInserted;
                    
                    // Remap the error index to the global array index
                    const mappedErrors = error.writeErrors.map(e => ({
                        index: i + e.index,
                        message: e.errmsg
                    }));
                    allErrors.push(...mappedErrors);
                } else {
                    throw error; // Unexpected error, break loop
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
// @access  Public
const getLogs = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            severity, 
            status, 
            search,
            sortBy = 'timestamp',
            sortOrder = 'desc'
        } = req.query;

        // Build query object
        const query = {};

        // Filtering
        if (severity) query.severity = severity;
        if (status) query.status = status;

        // Text Search on actor or resource (requires text index on those fields)
        if (search) {
            query.$text = { $search: search };
        }

        // Pagination setup
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        // Sorting setup
        const sortOptions = {};
        if (search) {
            // If searching, sort by relevance score first, then fallback
            sortOptions.score = { $meta: 'textScore' };
        }
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with lean() for better performance (bypasses Mongoose hydration)
        const logsPromise = Log.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Get total count for pagination metadata
        const countPromise = Log.countDocuments(query);

        const [logs, totalRecords] = await Promise.all([logsPromise, countPromise]);

        const totalPages = Math.ceil(totalRecords / limitNum);

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
// @access  Public
const getStats = async (req, res) => {
    try {
        const stats = await Log.aggregate([
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

module.exports = {
    bulkUploadLogs,
    getLogs,
    getStats
};
