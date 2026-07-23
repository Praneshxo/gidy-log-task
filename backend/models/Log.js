const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        trim: true
    },
    actor: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        trim: true
    },
    resource: {
        type: String,
        required: true,
        trim: true
    },
    resourceType: {
        type: String,
        trim: true
    },
    ipAddress: {
        type: String,
        trim: true
    },
    region: {
        type: String,
        trim: true
    },
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'INFO'],
        default: 'INFO'
    },
    status: {
        type: String,
        enum: ['SUCCESS', 'FAILURE', 'PENDING'],
        default: 'SUCCESS'
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    timestamps: true 
});

// Indexes for performance (as requested in the plan)
logSchema.index({ timestamp: -1 });
logSchema.index({ severity: 1 });
logSchema.index({ status: 1 });
// Compound indexes for common SecOps queries ("High severity, newest first")
logSchema.index({ severity: 1, timestamp: -1 });
logSchema.index({ status: 1, timestamp: -1 });
logSchema.index({ severity: 1, status: 1, timestamp: -1 });

// Text index for search functionality on actor and resource
logSchema.index({ actor: 'text', resource: 'text' });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
