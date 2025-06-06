const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/inventory_db?authSource=admin';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection with Mongoose
async function connectToMongoDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            maxPoolSize: 10,
            minPoolSize: 5
        });
        
        console.log('Connected to MongoDB successfully via Mongoose');
        
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
        const Product = require('./models/Product');
        const Inventory = require('./models/Inventory');
        
        const productsCount = await Product.countDocuments();
        
        if (productsCount === 0) {
            console.log('Creating sample products...');
            
            const sampleProducts = [
                {
                    sku: 'PROD-001',
                    name: 'iPhone 14',
                    description: 'Latest Apple smartphone',
                    category: { main: 'Electronics', sub: 'Mobile Phones' },
                    pricing: { cost: 800.00, retail: 999.99 },
                    status: 'active'
                },
                {
                    sku: 'PROD-002',
                    name: 'Samsung Galaxy S23',
                    description: 'Premium Android smartphone',
                    category: { main: 'Electronics', sub: 'Mobile Phones' },
                    pricing: { cost: 700.00, retail: 899.99 },
                    status: 'active'
                }
            ];
            
            const createdProducts = await Product.insertMany(sampleProducts);
            console.log('Sample products created:', createdProducts.length);
            
            // Create inventory for these products
            const sampleInventory = [
                {
                    product_id: createdProducts[0]._id,
                    sku: createdProducts[0].sku,
                    warehouses: [{
                        warehouse_name: 'Main Warehouse',
                        location: 'A1-B2-C3',
                        quantity: 50,
                        reserved: 0,
                        available: 50
                    }],
                    total_stock: 50,
                    total_available: 50,
                    reorder_point: 10,
                    max_stock: 100,
                    stock_alerts: { low_stock: false, out_of_stock: false, overstock: false }
                },
                {
                    product_id: createdProducts[1]._id,
                    sku: createdProducts[1].sku,
                    warehouses: [{
                        warehouse_name: 'Main Warehouse',
                        location: 'A2-B3-C4',
                        quantity: 5,
                        reserved: 0,
                        available: 5
                    }],
                    total_stock: 5,
                    total_available: 5,
                    reorder_point: 10,
                    max_stock: 100,
                    stock_alerts: { low_stock: true, out_of_stock: false, overstock: false }
                }
            ];
            
            await Inventory.insertMany(sampleInventory);
            console.log('Sample inventory created');
        }
    } catch (error) {
        console.error('Error initializing sample data:', error);
    }
}

// Middleware to check database connection
function requireDB(req, res, next) {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ 
            error: 'Database not available. Please try again later.',
            database_status: 'disconnected'
        });
    }
    next();
}

// Start connection
connectToMongoDB();

// Import routes
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const aggregationRoutes = require('./routes/aggregations');

// Use routes
app.use('/api/products', requireDB, productRoutes);
app.use('/api/inventory', requireDB, inventoryRoutes);
app.use('/api/aggregations', requireDB, aggregationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
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
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
    }
    process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
