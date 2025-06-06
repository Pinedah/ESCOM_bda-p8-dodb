const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    main: { type: String, required: true },
    sub: { type: String, required: true },
    path: String
  },
  specifications: {
    brand: String,
    model: String,
    color: String,
    storage: String,
    technical: mongoose.Schema.Types.Mixed
  },
  pricing: {
    cost: { type: Number, required: true, min: 0 },
    retail: { type: Number, required: true, min: 0 },
    wholesale: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' }
  },
  tags: [String],
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Create path automatically
productSchema.pre('save', function(next) {
  if (this.category.main && this.category.sub) {
    this.category.path = `${this.category.main}/${this.category.sub}`;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
