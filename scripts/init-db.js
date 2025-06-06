// MongoDB initialization script
db = db.getSiblingDB('inventory_db');

// Create products collection with validation
db.createCollection('products', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sku", "name", "category", "pricing", "status"],
      properties: {
        sku: {
          bsonType: "string",
          description: "SKU is required and must be a string"
        },
        name: {
          bsonType: "string",
          description: "Product name is required"
        },
        category: {
          bsonType: "object",
          required: ["main", "sub"],
          properties: {
            main: { bsonType: "string" },
            sub: { bsonType: "string" },
            path: { bsonType: "string" }
          }
        },
        pricing: {
          bsonType: "object",
          required: ["cost", "retail"],
          properties: {
            cost: { bsonType: "number", minimum: 0 },
            retail: { bsonType: "number", minimum: 0 },
            wholesale: { bsonType: "number", minimum: 0 }
          }
        },
        status: {
          bsonType: "string",
          enum: ["active", "inactive", "discontinued"]
        }
      }
    }
  }
});

// Create inventory collection
db.createCollection('inventory', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["product_id", "sku", "total_stock"],
      properties: {
        product_id: { bsonType: "objectId" },
        sku: { bsonType: "string" },
        total_stock: { bsonType: "number", minimum: 0 },
        total_available: { bsonType: "number", minimum: 0 },
        reorder_point: { bsonType: "number", minimum: 0 }
      }
    }
  }
});

// Create other collections
db.createCollection('suppliers');
db.createCollection('categories');
db.createCollection('transactions');
db.createCollection('warehouses');

// Create indexes
db.products.createIndex({ "sku": 1 }, { unique: true });
db.products.createIndex({ "category.main": 1, "category.sub": 1 });
db.products.createIndex({ "status": 1 });
db.products.createIndex({ "tags": 1 });

db.inventory.createIndex({ "product_id": 1 }, { unique: true });
db.inventory.createIndex({ "sku": 1 }, { unique: true });
db.inventory.createIndex({ "total_available": 1 });

db.suppliers.createIndex({ "company_name": 1 });
db.transactions.createIndex({ "created_at": 1 });

print("Database initialization completed successfully!");
