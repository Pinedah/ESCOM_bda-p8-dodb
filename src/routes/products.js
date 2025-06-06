const express = require('express');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const router = express.Router();

// CREATE - Add new product
router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    
    // Create initial inventory record
    const inventory = new Inventory({
      product_id: product._id,
      sku: product.sku,
      warehouses: [],
      total_stock: 0,
      total_available: 0
    });
    await inventory.save();
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Get all products with pagination and filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.category) filter['category.main'] = req.query.category;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { sku: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ created_at: -1 });
    
    const total = await Product.countDocuments(filter);
    
    res.json({
      success: true,
      data: products,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Get product by ID with inventory
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    const inventory = await Inventory.findOne({ product_id: product._id });
    
    res.json({
      success: true,
      data: {
        product,
        inventory
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// UPDATE - Update product (partial or complete)
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Update SKU in inventory if changed
    if (req.body.sku) {
      await Inventory.findOneAndUpdate(
        { product_id: product._id },
        { sku: product.sku }
      );
    }
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE - Remove product and its inventory
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Delete associated inventory
    await Inventory.findOneAndDelete({ product_id: product._id });
    
    // Delete product
    await Product.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Product and inventory deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
