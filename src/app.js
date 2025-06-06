const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/inventory_db';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
let db;
let client;

async function connectToMongoDB() {
    try {
        client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });
        
        await client.connect();
        db = client.db();
        console.log('Connected to MongoDB successfully');
        
        // Create sample data if collections are empty
        await initializeSampleData();
        
    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Retry connection after 5 seconds
        setTimeout(connectToMongoDB, 5000);
    }
}

async function initializeSampleData() {
    try {
        const productsCount = await db.collection('products').countDocuments();
        const inventoryCount = await db.collection('inventory').countDocuments();
        
        if (productsCount === 0) {
            console.log('Creating sample products...');
            const sampleProducts = [
                {
                    sku: 'PROD-001',
                    name: 'iPhone 14',
                    description: 'Latest Apple smartphone',
                    category: { main: 'Electronics', sub: 'Mobile Phones' },
                    pricing: { cost: 800.00, retail: 999.99 },
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    sku: 'PROD-002',
                    name: 'Samsung Galaxy S23',
                    description: 'Premium Android smartphone',
                    category: { main: 'Electronics', sub: 'Mobile Phones' },
                    pricing: { cost: 700.00, retail: 899.99 },
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ];
            
            const productResult = await db.collection('products').insertMany(sampleProducts);
            console.log('Sample products created:', productResult.insertedIds);
            
            // Create inventory for these products
            const sampleInventory = [
                {
                    product_id: productResult.insertedIds[0],
                    warehouse: { name: 'Main Warehouse', location: 'New York' },
                    stock_levels: { current_stock: 50, minimum_stock: 10, maximum_stock: 100 },
                    stock_alerts: { low_stock: false, out_of_stock: false },
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    product_id: productResult.insertedIds[1],
                    warehouse: { name: 'Main Warehouse', location: 'New York' },
                    stock_levels: { current_stock: 5, minimum_stock: 10, maximum_stock: 100 },
                    stock_alerts: { low_stock: true, out_of_stock: false },
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ];
            
            await db.collection('inventory').insertMany(sampleInventory);
            console.log('Sample inventory created');
        }
    } catch (error) {
        console.error('Error initializing sample data:', error);
    }
}

// Middleware to check database connection
function requireDB(req, res, next) {
    if (!db) {
        return res.status(503).json({ 
            error: 'Database not available. Please try again later.',
            database_status: 'disconnected'
        });
    }
    next();
}

// Start connection
connectToMongoDB();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Products endpoints
app.get('/api/products', requireDB, async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * parseInt(limit);
        let query = {};
        
        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { sku: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            };
        }
        
        const products = await db.collection('products')
            .find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();
            
        const total = await db.collection('products').countDocuments(query);
        
        res.json({
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total_items: total,
                total_pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Products GET error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', requireDB, async (req, res) => {
    try {
        const product = {
            ...req.body,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        const result = await db.collection('products').insertOne(product);
        
        // Create initial inventory entry for the new product
        const inventoryEntry = {
            product_id: result.insertedId,
            warehouse: { name: 'Main Warehouse', location: 'Default' },
            stock_levels: { current_stock: 0, minimum_stock: 10, maximum_stock: 100 },
            stock_alerts: { low_stock: true, out_of_stock: true },
            created_at: new Date(),
            updated_at: new Date()
        };
        
        await db.collection('inventory').insertOne(inventoryEntry);
        
        res.status(201).json({ 
            message: 'Product created successfully',
            product_id: result.insertedId,
            inventory_id: inventoryEntry._id
        });
    } catch (error) {
        console.error('Products POST error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', requireDB, async (req, res) => {
    try {
        const product = await db.collection('products')
            .findOne({ _id: new ObjectId(req.params.id) });
            
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({ data: product });
    } catch (error) {
        console.error('Product GET by ID error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Inventory endpoints
app.get('/api/inventory', requireDB, async (req, res) => {
    try {
        const { low_stock, warehouse } = req.query;
        let pipeline = [
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } }
        ];
        
        if (low_stock === 'true') {
            pipeline.push({
                $match: {
                    'stock_alerts.low_stock': true
                }
            });
        }
        
        if (warehouse) {
            pipeline.push({
                $match: {
                    'warehouse.name': warehouse
                }
            });
        }
        
        const inventory = await db.collection('inventory').aggregate(pipeline).toArray();
        res.json({ data: inventory });
    } catch (error) {
        console.error('Inventory GET error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/inventory/:id/add-stock', requireDB, async (req, res) => {
    try {
        const { warehouse_name, quantity } = req.body;
        
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid inventory ID format' });
        }
        
        const inventoryItem = await db.collection('inventory')
            .findOne({ _id: new ObjectId(req.params.id) });
            
        if (!inventoryItem) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }
        
        const newStock = inventoryItem.stock_levels.current_stock + quantity;
        const minStock = inventoryItem.stock_levels.minimum_stock || 10;
        
        const result = await db.collection('inventory').updateOne(
            { _id: new ObjectId(req.params.id) },
            {
                $set: { 
                    'stock_levels.current_stock': newStock,
                    'warehouse.name': warehouse_name,
                    'stock_alerts.low_stock': newStock < minStock,
                    'stock_alerts.out_of_stock': newStock === 0,
                    updated_at: new Date()
                }
            }
        );
        
        res.json({ 
            message: 'Stock updated successfully',
            new_stock_level: newStock,
            low_stock_alert: newStock < minStock
        });
    } catch (error) {
        console.error('Add stock error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Aggregation endpoints
app.get('/api/aggregations/inventory-value-by-category', async (req, res) => {
    try {
        const pipeline = [
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
                    _id: '$product.category.main',
                    total_value: {
                        $sum: {
                            $multiply: [
                                '$stock_levels.current_stock',
                                '$product.pricing.cost'
                            ]
                        }
                    },
                    total_items: { $sum: '$stock_levels.current_stock' }
                }
            },
            { $sort: { total_value: -1 } }
        ];
        
        const result = await db.collection('inventory').aggregate(pipeline).toArray();
        res.json({ data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/aggregations/top-products-analysis', async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        const pipeline = [
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
                $project: {
                    product_name: '$product.name',
                    category: '$product.category.main',
                    current_stock: '$stock_levels.current_stock',
                    value: {
                        $multiply: [
                            '$stock_levels.current_stock',
                            '$product.pricing.retail'
                        ]
                    }
                }
            },
            { $sort: { value: -1 } },
            { $limit: parseInt(limit) }
        ];
        
        const result = await db.collection('inventory').aggregate(pipeline).toArray();
        res.json({ data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/aggregations/warehouse-dashboard', async (req, res) => {
    try {
        const pipeline = [
            {
                $group: {
                    _id: '$warehouse.name',
                    total_items: { $sum: '$stock_levels.current_stock' },
                    low_stock_items: {
                        $sum: {
                            $cond: ['$stock_alerts.low_stock', 1, 0]
                        }
                    },
                    warehouses_count: { $sum: 1 }
                }
            }
        ];
        
        const result = await db.collection('inventory').aggregate(pipeline).toArray();
        res.json({ data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    if (client) {
        await client.close();
    }
    process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
