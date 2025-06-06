const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  }
}, {
  timestamps: true, // This replaces manual createdAt
  collection: 'suppliers' // Explicitly set collection name
});

// Add indexes for better performance
supplierSchema.index({ email: 1 });
supplierSchema.index({ name: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
