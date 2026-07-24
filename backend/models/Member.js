const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  role: { 
    type: String, 
    enum: ['Owner', 'Admin', 'Security Analyst', 'Viewer'],
    default: 'Viewer'
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Suspended'],
    default: 'Active'
  }
}, { timestamps: true });

// Ensure a user can only have one membership per organization
memberSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

module.exports = mongoose.model('Member', memberSchema);
