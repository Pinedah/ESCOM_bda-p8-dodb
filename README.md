# Sistema de Gestión de Inventario - Base de Datos Orientada a Documentos

## 1. Selección y Descripción del Escenario

### Escenario: Sistema de Gestión de Inventario para E-commerce

Este proyecto implementa un sistema de gestión de inventario para una plataforma de comercio electrónico que maneja múltiples productos, proveedores, categorías y ubicaciones de almacén.

### Justificación del Enfoque Orientado a Documentos

**¿Por qué MongoDB es apropiado para este escenario?**

1. **Flexibilidad de Esquema**: Los productos pueden tener atributos muy diferentes (ropa vs. electrónicos vs. libros)
2. **Documentos Complejos**: Cada producto puede tener especificaciones técnicas, variantes, histórico de precios
3. **Relaciones Jerárquicas**: Categorías y subcategorías se modelan naturalmente como documentos anidados
4. **Escalabilidad**: Capacidad de manejar grandes volúmenes de productos y transacciones
5. **Consultas Complejas**: Framework de agregación para reportes de inventario

### Ventajas del Modelo Documental vs. Tradicional

- **Desnormalización Controlada**: Información frecuentemente consultada junta (producto + stock + proveedor)
- **Atomicidad a Nivel Documento**: Actualizaciones de stock más eficientes
- **Consultas Naturales**: JSON/BSON se mapea directamente a objetos de aplicación
- **Escalamiento Horizontal**: Sharding nativo para grandes catálogos

## 2. Diseño del Modelo de Documentos

### Colecciones Principales

1. **products** - Información de productos y especificaciones
2. **inventory** - Niveles de stock y ubicaciones
3. **suppliers** - Información de proveedores
4. **categories** - Jerarquía de categorías
5. **transactions** - Movimientos de inventario
6. **warehouses** - Almacenes y ubicaciones

### Estructura de Documentos

#### Colección: products
```json
{
  "_id": ObjectId,
  "sku": "PROD-001",
  "name": "Smartphone Samsung Galaxy",
  "description": "Smartphone con pantalla AMOLED...",
  "category": {
    "main": "Electronics",
    "sub": "Mobile Phones",
    "path": "Electronics/Mobile Phones"
  },
  "specifications": {
    "brand": "Samsung",
    "model": "Galaxy S21",
    "color": "Black",
    "storage": "128GB",
    "technical": {
      "screen": "6.2 inches",
      "camera": "64MP",
      "battery": "4000mAh"
    }
  },
  "pricing": {
    "cost": 450.00,
    "retail": 699.99,
    "wholesale": 550.00,
    "currency": "USD"
  },
  "supplier_info": {
    "supplier_id": ObjectId,
    "supplier_name": "Tech Distributors Inc",
    "lead_time_days": 7
  },
  "variants": [
    {
      "sku": "PROD-001-RED",
      "color": "Red",
      "price_modifier": 25.00
    }
  ],
  "tags": ["smartphone", "android", "samsung"],
  "status": "active",
  "created_at": ISODate,
  "updated_at": ISODate
}
```

#### Colección: inventory
```json
{
  "_id": ObjectId,
  "product_id": ObjectId,
  "sku": "PROD-001",
  "warehouses": [
    {
      "warehouse_id": ObjectId,
      "warehouse_name": "Main Warehouse",
      "location": "A1-B2-C3",
      "quantity": 150,
      "reserved": 25,
      "available": 125
    }
  ],
  "total_stock": 150,
  "total_available": 125,
  "reorder_point": 50,
  "max_stock": 500,
  "last_restock": ISODate,
  "stock_alerts": {
    "low_stock": false,
    "out_of_stock": false,
    "overstock": false
  }
}
```

#### Colección: suppliers
```json
{
  "_id": ObjectId,
  "company_name": "Tech Distributors Inc",
  "contact_info": {
    "email": "orders@techdist.com",
    "phone": "+1-555-0123",
    "address": {
      "street": "123 Business Ave",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "USA"
    }
  },
  "terms": {
    "payment_terms": "Net 30",
    "shipping_terms": "FOB Origin",
    "minimum_order": 1000.00
  },
  "performance": {
    "rating": 4.5,
    "on_time_delivery": 0.95,
    "quality_rating": 4.2
  },
  "products_supplied": ["Electronics", "Accessories"],
  "status": "active"
}
```

### Patrones de Diseño Aplicados

1. **One-to-Few Pattern**: Productos con variantes (embebido)
2. **One-to-Many Pattern**: Productos con múltiples ubicaciones de stock
3. **Extended Reference Pattern**: Información básica del proveedor embebida en producto
4. **Computed Pattern**: Totales de stock calculados y almacenados
5. **Schema Versioning**: Control de versiones en documentos

### Estrategias de Relaciones

- **Embebido**: Especificaciones técnicas, variantes de producto, información básica de proveedor
- **Referencia**: Relación producto-inventario, transacciones-producto
- **Híbrido**: Información de proveedor (datos básicos embebidos, completos por referencia)

## 3. Configuración del Entorno de Desarrollo

### Arquitectura Docker

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Node.js App   │    │    MongoDB      │    │  Mongo Express  │
│   Port: 3000    │────│   Port: 27017   │────│   Port: 8081    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Comandos de Configuración

```bash
# Clonar y configurar el proyecto
git clone <repository>
cd bda-p8-dodb

# Construir y ejecutar contenedores
docker-compose up -d

# Verificar servicios
docker-compose ps

# Acceder a logs
docker-compose logs app
```

## 4. Implementación de la Base de Datos

### Características Implementadas

- **Schema Validation**: Validación de estructura de documentos
- **Índices Compuestos**: Para consultas eficientes
- **TTL Collections**: Para datos temporales
- **Agregaciones**: Reportes complejos de inventario

### Scripts de Inicialización

- `init-db.js`: Creación de colecciones y esquemas
- `seed-data.js`: Datos de ejemplo
- `create-indexes.js`: Índices para optimización

## 5. Operaciones CRUD y Agregaciones

### Operaciones Implementadas

1. **Productos**
   - Crear producto con especificaciones
   - Buscar por categoría, marca, precio
   - Actualizar precios y especificaciones
   - Gestionar variantes

2. **Inventario**
   - Consultar stock por almacén
   - Actualizar niveles de inventario
   - Alertas de stock bajo
   - Reservar/liberar stock

3. **Agregaciones Complejas**
   - Reporte de valor total de inventario
   - Productos más/menos vendidos
   - Análisis de rotación de inventario

### API Endpoints

```
GET    /api/products              # Listar productos
POST   /api/products              # Crear producto
GET    /api/products/:id          # Obtener producto
PUT    /api/products/:id          # Actualizar producto
DELETE /api/products/:id          # Eliminar producto

GET    /api/inventory             # Estado general del inventario
PUT    /api/inventory/:sku/stock  # Actualizar stock
GET    /api/inventory/alerts      # Alertas de inventario

GET    /api/reports/value         # Valor total del inventario
GET    /api/reports/rotation      # Análisis de rotación
```

## 6. Estructura del Proyecto

```
bda-p8-dodb/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── src/
│   ├── app.js
│   ├── models/
│   │   ├── Product.js
│   │   ├── Inventory.js
│   │   └── Supplier.js
│   ├── routes/
│   │   ├── products.js
│   │   ├── inventory.js
│   │   └── reports.js
│   ├── database/
│   │   ├── connection.js
│   │   ├── init-db.js
│   │   └── seed-data.js
│   └── utils/
│       └── validators.js
├── scripts/
│   └── mongo-queries.js
└── docs/
    ├── api-documentation.md
    └── database-design.md
```

## 7. Tecnologías Utilizadas

- **Base de Datos**: MongoDB 7.0
- **Backend**: Node.js + Express
- **ODM**: Mongoose
- **Contenedores**: Docker + Docker Compose
- **Administración**: Mongo Express
- **Validación**: Joi + Mongoose Schema Validation

## 8. Ventajas de la Implementación

1. **Flexibilidad**: Fácil adición de nuevos tipos de productos
2. **Performance**: Consultas optimizadas con agregaciones
3. **Escalabilidad**: Preparado para sharding horizontal
4. **Mantenibilidad**: Código modular y documentado
5. **Desarrollo Ágil**: Schema flexible permite iteración rápida

## 9. Instalación y Uso

### Prerrequisitos
- Docker
- Docker Compose
- Git

### Pasos de Instalación

1. **Clonar repositorio**
```bash
git clone <repository-url>
cd bda-p8-dodb
```

2. **Ejecutar con Docker**
```bash
docker-compose up -d
```

3. **Acceder a servicios**
- Aplicación: http://localhost:3000
- Mongo Express: http://localhost:8081
- MongoDB: localhost:27017

4. **Inicializar datos**
```bash
docker-compose exec app npm run seed
```

## 10. Consideraciones de Rendimiento

- Índices optimizados para consultas frecuentes
- Desnormalización controlada para reducir JOINs
- Agregaciones pre-calculadas para reportes
- Paginación en listados grandes
- Conexiones de base de datos pooled

---

**Autor**: Desarrollado para el curso de Bases de Datos Avanzadas  
**Fecha**: 2024  
**Tecnología Principal**: MongoDB + Node.js + Docker