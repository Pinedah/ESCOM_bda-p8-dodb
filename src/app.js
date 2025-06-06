const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/inventory_db?authSource=admin');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Import routes
const productsRouter = require('./routes/products');
const inventoryRouter = require('./routes/inventory');
const aggregationsRouter = require('./routes/aggregations');

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Sistema de Gestión de Inventario - API',
    status: 'active',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      inventory: '/api/inventory',
      aggregations: '/api/aggregations',
      health: '/api/health'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/aggregations', aggregationsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Web Interface: http://localhost:${PORT}`);
    console.log(`API Health: http://localhost:${PORT}/api/health`);
  });
};

startServer();

const Product = require('./models/Product');

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/escom_bda', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Verificar conexión
mongoose.connection.on('connected', () => {
  console.log('Conectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Error de conexión:', err);
});

// Ejemplo de uso
async function createProduct() {
  try {
    const product = new Product({
      sku: 'IPHONE15PRO',
      name: 'iPhone 15 Pro',
      description: 'Latest iPhone model',
      category: {
        main: 'Electronics',
        sub: 'Smartphones'
      },
      specifications: {
        brand: 'Apple',
        model: '15 Pro',
        color: 'Natural Titanium',
        storage: '128GB'
      },
      pricing: {
        cost: 800,
        retail: 999,
        wholesale: 850
      },
      tags: ['smartphone', 'apple', 'premium']
    });

    const savedProduct = await product.save();
    console.log('Producto creado:', savedProduct);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Ejecutar ejemplo
createProduct();
