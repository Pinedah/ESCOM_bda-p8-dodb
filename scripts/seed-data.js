const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const Inventory = require('../src/models/Inventory');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/inventory_db?authSource=admin';

const sampleProducts = [
  {
    sku: "PHONE-001",
    name: "Samsung Galaxy S21",
    description: "Smartphone con pantalla AMOLED de 6.2 pulgadas",
    category: {
      main: "Electronics",
      sub: "Mobile Phones"
    },
    specifications: {
      brand: "Samsung",
      model: "Galaxy S21",
      color: "Black",
      storage: "128GB",
      technical: {
        screen: "6.2 inches AMOLED",
        camera: "64MP Triple Camera",
        battery: "4000mAh"
      }
    },
    pricing: {
      cost: 450.00,
      retail: 699.99,
      wholesale: 550.00,
      currency: "USD"
    },
    tags: ["smartphone", "android", "samsung"],
    status: "active"
  },
  {
    sku: "LAPTOP-001",
    name: "MacBook Air M2",
    description: "Laptop ultradelgada con chip M2",
    category: {
      main: "Electronics",
      sub: "Laptops"
    },
    specifications: {
      brand: "Apple",
      model: "MacBook Air",
      color: "Silver",
      storage: "256GB SSD",
      technical: {
        screen: "13.6 inches Retina",
        processor: "Apple M2",
        ram: "8GB"
      }
    },
    pricing: {
      cost: 900.00,
      retail: 1199.99,
      wholesale: 1000.00,
      currency: "USD"
    },
    tags: ["laptop", "apple", "macbook"],
    status: "active"
  },
  {
    sku: "TABLET-001",
    name: "iPad Pro 12.9",
    description: "Tablet profesional con chip M2",
    category: {
      main: "Electronics",
      sub: "Tablets"
    },
    specifications: {
      brand: "Apple",
      model: "iPad Pro",
      color: "Space Gray",
      storage: "128GB",
      technical: {
        screen: "12.9 inches Liquid Retina",
        processor: "Apple M2",
        camera: "12MP Pro camera system"
      }
    },
    pricing: {
      cost: 750.00,
      retail: 1099.99,
      wholesale: 850.00,
      currency: "USD"
    },
    tags: ["tablet", "apple", "ipad"],
    status: "active"
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    console.log('Cleared existing data');

    // Insert products
    const products = await Product.insertMany(sampleProducts);
    console.log(`Inserted ${products.length} products`);

    // Create inventory for each product
    for (const product of products) {
      const inventory = new Inventory({
        product_id: product._id,
        sku: product.sku,
        warehouses: [
          {
            warehouse_name: "Main Warehouse",
            location: `${product.category.main.substring(0,1)}${Math.floor(Math.random() * 9) + 1}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 9) + 1}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 9) + 1}`,
            quantity: Math.floor(Math.random() * 200) + 50,
            reserved: Math.floor(Math.random() * 30),
            available: 0 // Will be calculated
          }
        ],
        reorder_point: Math.floor(Math.random() * 50) + 10,
        max_stock: Math.floor(Math.random() * 500) + 200
      });

      // Calculate available stock
      inventory.warehouses[0].available = inventory.warehouses[0].quantity - inventory.warehouses[0].reserved;
      inventory.total_stock = inventory.warehouses[0].quantity;
      inventory.total_available = inventory.warehouses[0].available;
      inventory.last_restock = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within last 30 days

      await inventory.save();
    }

    console.log('Database seeded successfully!');
    console.log('\nSample operations you can try:');
    console.log('1. Visit http://localhost:3000 for the web interface');
    console.log('2. GET /api/products - List all products');
    console.log('3. GET /api/inventory - List all inventory');
    console.log('4. GET /api/aggregations/inventory-value-by-category - Category analysis');
    console.log('5. GET /api/aggregations/top-products-analysis - Top products');
    console.log('6. GET /api/aggregations/warehouse-dashboard - Warehouse dashboard');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
