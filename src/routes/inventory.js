const express = require('express');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const router = express.Router();

// READ - Get all inventory with product details
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.low_stock === 'true') filter['stock_alerts.low_stock'] = true;
    if (req.query.out_of_stock === 'true') filter['stock_alerts.out_of_stock'] = true;
    
    const inventory = await Inventory.find(filter)
      .populate('product_id', 'name sku category pricing')
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 });
    
    const total = await Inventory.countDocuments(filter);
    
    res.json({
      success: true,
      data: inventory,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// UPDATE - Add stock to warehouse
router.post('/:id/add-stock', async (req, res) => {
  try {
    const { warehouse_name, location, quantity } = req.body;
    
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory not found'
      });
    }
    
    // Find or create warehouse entry
    let warehouse = inventory.warehouses.find(w => w.warehouse_name === warehouse_name);
    
    if (warehouse) {
      warehouse.quantity += quantity;
      warehouse.available += quantity;
    } else {
      inventory.warehouses.push({
        warehouse_name,
        location: location || '',
        quantity,
        reserved: 0,
        available: quantity
      });
    }
    
    // Update totals
    inventory.total_stock += quantity;
    inventory.total_available += quantity;
    inventory.last_restock = new Date();
    
    await inventory.save();
    
    res.json({
      success: true,
      message: 'Stock added successfully',
      data: inventory
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// UPDATE - Reserve stock
router.post('/:id/reserve', async (req, res) => {
  try {
    const { warehouse_name, quantity } = req.body;
    
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory not found'
      });
    }
    
    const warehouse = inventory.warehouses.find(w => w.warehouse_name === warehouse_name);
    if (!warehouse || warehouse.available < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock available'
      });
    }
    
    warehouse.reserved += quantity;
    warehouse.available -= quantity;
    inventory.total_available -= quantity;
    
    await inventory.save();
    
    res.json({
      success: true,
      message: 'Stock reserved successfully',
      data: inventory
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// UPDATE - Update inventory settings (reorder points, max stock, etc.)
router.put('/:id', async (req, res) => {
  try {
    const { reorder_point, max_stock, warehouse_updates } = req.body;
    
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory not found'
      });
    }
    
    // Update basic settings
    if (reorder_point !== undefined) inventory.reorder_point = reorder_point;
    if (max_stock !== undefined) inventory.max_stock = max_stock;
    
    // Update specific warehouses if provided
    if (warehouse_updates && Array.isArray(warehouse_updates)) {
      warehouse_updates.forEach(update => {
        const warehouse = inventory.warehouses.find(w => w.warehouse_name === update.warehouse_name);
        if (warehouse) {
          if (update.quantity !== undefined) {
            const diff = update.quantity - warehouse.quantity;
            warehouse.quantity = update.quantity;
            warehouse.available += diff;
            inventory.total_stock += diff;
            inventory.total_available += diff;
          }
          if (update.location !== undefined) warehouse.location = update.location;
        }
      });
    }
    
    await inventory.save();
    
    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: inventory
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// UPDATE - Remove stock from warehouse
router.post('/:id/remove-stock', async (req, res) => {
  try {
    const { warehouse_name, quantity, reason = 'Manual adjustment' } = req.body;
    
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory not found'
      });
    }
    
    const warehouse = inventory.warehouses.find(w => w.warehouse_name === warehouse_name);
    if (!warehouse || warehouse.available < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock available'
      });
    }
    
    warehouse.quantity -= quantity;
    warehouse.available -= quantity;
    inventory.total_stock -= quantity;
    inventory.total_available -= quantity;
    
    await inventory.save();
    
    res.json({
      success: true,
      message: `Stock removed successfully (${reason})`,
      data: inventory
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE - Remove warehouse from inventory
router.delete('/:id/warehouse/:warehouseName', async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory not found'
      });
    }
    
    const warehouseIndex = inventory.warehouses.findIndex(
      w => w.warehouse_name === req.params.warehouseName
    );
    
    if (warehouseIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Warehouse not found'
      });
    }
    
    const warehouse = inventory.warehouses[warehouseIndex];
    
    // Update totals
    inventory.total_stock -= warehouse.quantity;
    inventory.total_available -= warehouse.available;
    
    // Remove warehouse
    inventory.warehouses.splice(warehouseIndex, 1);
    
    await inventory.save();
    
    res.json({
      success: true,
      message: 'Warehouse removed from inventory',
      data: inventory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
