const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  warehouses: [{
    warehouse_name: { type: String, required: true },
    location: String,
    quantity: { type: Number, required: true, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    available: { type: Number, required: true, min: 0 }
  }],
  total_stock: { type: Number, required: true, min: 0 },
  total_available: { type: Number, required: true, min: 0 },
  reorder_point: { type: Number, default: 10, min: 0 },
  max_stock: { type: Number, default: 1000, min: 0 },
  last_restock: Date,
  stock_alerts: {
    low_stock: { type: Boolean, default: false },
    out_of_stock: { type: Boolean, default: false },
    overstock: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Update alerts before saving
inventorySchema.pre('save', function(next) {
  this.stock_alerts.out_of_stock = this.total_available === 0;
  this.stock_alerts.low_stock = this.total_available > 0 && this.total_available <= this.reorder_point;
  this.stock_alerts.overstock = this.total_stock > this.max_stock;
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);
