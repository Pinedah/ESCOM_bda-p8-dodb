const express = require('express');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const router = express.Router();

// AGGREGATION 1: Inventory Value Analysis by Category
router.get('/inventory-value-by-category', async (req, res) => {
  try {
    const result = await Product.aggregate([
      {
        $lookup: {
          from: 'inventories',
          localField: '_id',
          foreignField: 'product_id',
          as: 'inventory'
        }
      },
      { $unwind: '$inventory' },
      {
        $group: {
          _id: {
            main_category: '$category.main',
            sub_category: '$category.sub'
          },
          total_products: { $sum: 1 },
          total_stock: { $sum: '$inventory.total_stock' },
          total_available: { $sum: '$inventory.total_available' },
          total_value_cost: { 
            $sum: { $multiply: ['$inventory.total_stock', '$pricing.cost'] }
          },
          total_value_retail: { 
            $sum: { $multiply: ['$inventory.total_stock', '$pricing.retail'] }
          },
          avg_stock_per_product: { $avg: '$inventory.total_stock' },
          low_stock_products: {
            $sum: { 
              $cond: [{ $eq: ['$inventory.stock_alerts.low_stock', true] }, 1, 0]
            }
          },
          out_of_stock_products: {
            $sum: { 
              $cond: [{ $eq: ['$inventory.stock_alerts.out_of_stock', true] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          total_products: 1,
          total_stock: 1,
          total_available: 1,
          total_value_cost: { $round: ['$total_value_cost', 2] },
          total_value_retail: { $round: ['$total_value_retail', 2] },
          potential_profit: { 
            $round: [{ $subtract: ['$total_value_retail', '$total_value_cost'] }, 2]
          },
          avg_stock_per_product: { $round: ['$avg_stock_per_product', 2] },
          low_stock_products: 1,
          out_of_stock_products: 1,
          stock_turnover_potential: {
            $cond: [
              { $gt: ['$total_available', 0] },
              { $divide: ['$total_stock', '$total_available'] },
              0
            ]
          }
        }
      },
      { $sort: { 'total_value_retail': -1 } }
    ]);

    res.json({
      success: true,
      message: 'Inventory value analysis by category',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// AGGREGATION 2: Top Performing Products Analysis
router.get('/top-products-analysis', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await Product.aggregate([
      {
        $lookup: {
          from: 'inventories',
          localField: '_id',
          foreignField: 'product_id',
          as: 'inventory'
        }
      },
      { $unwind: '$inventory' },
      {
        $addFields: {
          inventory_value: { 
            $multiply: ['$inventory.total_stock', '$pricing.retail'] 
          },
          profit_margin: {
            $divide: [
              { $subtract: ['$pricing.retail', '$pricing.cost'] },
              '$pricing.retail'
            ]
          },
          stock_efficiency: {
            $cond: [
              { $gt: ['$inventory.total_stock', 0] },
              { $divide: ['$inventory.total_available', '$inventory.total_stock'] },
              0
            ]
          }
        }
      },
      {
        $project: {
          sku: 1,
          name: 1,
          category: 1,
          pricing: 1,
          inventory_value: { $round: ['$inventory_value', 2] },
          profit_margin: { $round: [{ $multiply: ['$profit_margin', 100] }, 2] },
          stock_efficiency: { $round: [{ $multiply: ['$stock_efficiency', 100] }, 2] },
          total_stock: '$inventory.total_stock',
          total_available: '$inventory.total_available',
          stock_alerts: '$inventory.stock_alerts',
          performance_score: {
            $add: [
              { $multiply: ['$inventory_value', 0.4] },
              { $multiply: ['$profit_margin', 100, 0.3] },
              { $multiply: ['$stock_efficiency', 0.3] }
            ]
          }
        }
      },
      { $sort: { performance_score: -1 } },
      { $limit: limit }
    ]);

    res.json({
      success: true,
      message: `Top ${limit} performing products analysis`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// AGGREGATION 3: Warehouse Distribution and Alerts Dashboard
router.get('/warehouse-dashboard', async (req, res) => {
  try {
    const result = await Inventory.aggregate([
      { $unwind: '$warehouses' },
      {
        $lookup: {
          from: 'products',
          localField: 'product_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$warehouses.warehouse_name',
          total_products: { $sum: 1 },
          total_quantity: { $sum: '$warehouses.quantity' },
          total_available: { $sum: '$warehouses.available' },
          total_reserved: { $sum: '$warehouses.reserved' },
          total_value: {
            $sum: { 
              $multiply: ['$warehouses.quantity', '$product.pricing.retail'] 
            }
          },
          categories: { $addToSet: '$product.category.main' },
          products_by_category: {
            $push: {
              category: '$product.category.main',
              sku: '$product.sku',
              name: '$product.name',
              quantity: '$warehouses.quantity',
              value: { 
                $multiply: ['$warehouses.quantity', '$product.pricing.retail'] 
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          warehouse_name: '$_id',
          total_products: 1,
          total_quantity: 1,
          total_available: 1,
          total_reserved: 1,
          total_value: { $round: ['$total_value', 2] },
          utilization_rate: { 
            $round: [
              { $multiply: [
                { $divide: ['$total_reserved', '$total_quantity'] }, 100
              ]}, 2
            ]
          },
          categories_count: { $size: '$categories' },
          categories: 1,
          top_value_products: {
            $slice: [
              { $sortArray: { input: '$products_by_category', sortBy: { value: -1 } } },
              5
            ]
          }
        }
      },
      { $sort: { total_value: -1 } }
    ]);

    // Get overall alerts summary
    const alertsSummary = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          total_products: { $sum: 1 },
          low_stock_count: {
            $sum: { $cond: [{ $eq: ['$stock_alerts.low_stock', true] }, 1, 0] }
          },
          out_of_stock_count: {
            $sum: { $cond: [{ $eq: ['$stock_alerts.out_of_stock', true] }, 1, 0] }
          },
          overstock_count: {
            $sum: { $cond: [{ $eq: ['$stock_alerts.overstock', true] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      message: 'Warehouse distribution and alerts dashboard',
      data: {
        warehouses: result,
        alerts_summary: alertsSummary[0] || {
          total_products: 0,
          low_stock_count: 0,
          out_of_stock_count: 0,
          overstock_count: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
