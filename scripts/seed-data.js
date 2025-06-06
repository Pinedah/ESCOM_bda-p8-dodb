const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/inventory_db?authSource=admin';

const sampleProducts = [
  {
    sku: "PHONE-001",
    name: "Samsung Galaxy S21",
    description: "Smartphone con pantalla AMOLED de 6.2 pulgadas",
    category: {
      main: "Electronics",
      sub: "Mobile Phones",
      path: "Electronics/Mobile Phones"
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
    status: "active",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    sku: "LAPTOP-001",
    name: "MacBook Air M2",
    description: "Laptop ultradelgada con chip M2",
    category: {
      main: "Electronics",
      sub: "Laptops",
      path: "Electronics/Laptops"
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
    status: "active",
    created_at: new Date(),
    updated_at: new Date()
  }
];

const sampleInventory = [
  {
    sku: "PHONE-001",
    warehouses: [
      {
        warehouse_name: "Main Warehouse",
        location: "A1-B2-C3",
        quantity: 150,
        reserved: 25,
        available: 125
      }
    ],
    total_stock: 150,
    total_available: 125,
    reorder_point: 50,
    max_stock: 500,
    last_restock: new Date(),
    stock_alerts: {
      low_stock: false,
      out_of_stock: false,
      overstock: false
    }
  },
  {
    sku: "LAPTOP-001",
    warehouses: [
      {
        warehouse_name: "Main Warehouse",
        location: "B1-A2-D1",
        quantity: 75,
        reserved: 10,
        available: 65
      }
    ],
    total_stock: 75,
    total_available: 65,
    reorder_point: 20,
    max_stock: 200,
    last_restock: new Date(),
    stock_alerts: {
      low_stock: false,
      out_of_stock: false,
      overstock: false
    }
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    const db = mongoose.connection.db;

    // Clear existing data
    await db.collection('products').deleteMany({});
    await db.collection('inventory').deleteMany({});
    console.log('Cleared existing data');

    // Insert products
    const productResult = await db.collection('products').insertMany(sampleProducts);
    console.log(`Inserted ${productResult.insertedCount} products`);

    // Update inventory with product ObjectIds
    for (let i = 0; i < sampleInventory.length; i++) {
      const product = await db.collection('products').findOne({ sku: sampleInventory[i].sku });
      if (product) {
        sampleInventory[i].product_id = product._id;
      }
    }

    // Insert inventory
    const inventoryResult = await db.collection('inventory').insertMany(sampleInventory);
    console.log(`Inserted ${inventoryResult.insertedCount} inventory records`);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
