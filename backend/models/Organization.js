const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  logo: { type: String },
  industry: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Auto-generate unique slug from name if not provided
organizationSchema.pre('save', async function () {
  if (!this.slug) {
    const base = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    this.slug = `${base}-${Date.now().toString(36)}`;
  }
});

module.exports = mongoose.model('Organization', organizationSchema);
