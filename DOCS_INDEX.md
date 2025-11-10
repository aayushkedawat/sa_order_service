# Documentation Index

Quick reference to all documentation files in this project.

## 🚀 Getting Started

### [QUICKSTART.md](./QUICKSTART.md)

**Start here!** One-command setup guide.

- Single `docker-compose up --build` command
- Verification steps
- Basic troubleshooting

### [README.md](./README.md)

**Complete documentation** for the Order Service.

- Architecture overview
- All API endpoints with examples
- Business rules and validation
- Observability and monitoring
- Environment configuration

## 📊 Database

### [DATABASE_SETUP.md](./DATABASE_SETUP.md)

**Database setup guide** with detailed instructions.

- Schema overview
- Migration commands
- Verification queries
- Troubleshooting database issues

### [DATA_EXPLORATION.md](./DATA_EXPLORATION.md)

**Explore the seeded data** (300 orders, 856 items).

- API query examples
- SQL queries for analysis
- Customer and restaurant insights
- Sample data points

### [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md)

**Schema changes documentation**.

- Before/After comparison
- UUID → Integer migration
- Breaking changes
- Benefits of new structure

## 🔧 API Reference

### [API_HEADERS.md](./API_HEADERS.md)

**HTTP headers documentation**.

- `Idempotency-Key` header (required for POST)
- `x-correlation-id` header (optional)
- Header flow and propagation
- Best practices

### [API_UPDATES.md](./API_UPDATES.md)

**API changes documentation**.

- OpenAPI spec updates (UUID → Integer)
- Postman collection updates
- Before/After examples
- Breaking changes and migration guide

### [openapi.yaml](./openapi.yaml)

**OpenAPI 3.0 specification**.

- Machine-readable API spec
- Integer-based IDs
- All 7 order statuses
- Import into Swagger/Postman

### [postman_collection.json](./postman_collection.json)

**Postman collection** for testing.

- 12 pre-configured requests
- Integer IDs with seeded data
- Auto-generated UUIDs for idempotency
- Multiple filter examples

## 📁 Project Structure

```
order-svc/
├── QUICKSTART.md              ⭐ Start here
├── README.md                  📖 Main documentation
├── DATABASE_SETUP.md          🗄️ Database guide
├── DATA_EXPLORATION.md        🔍 Data queries
├── CHANGES_SUMMARY.md         📝 Schema changes
├── API_HEADERS.md             🔑 Header reference
├── DOCS_INDEX.md              📚 This file
│
├── docker-compose.yml         🐳 Docker setup
├── Dockerfile                 🐳 Container image
├── docker-entrypoint.sh       🚀 Startup script
├── package.json               📦 Dependencies
│
├── src/                       💻 Source code
│   ├── main.ts
│   ├── orders/
│   ├── common/
│   └── config/
│
├── migrations/                🔄 Database migrations
│   ├── 1700000000000-InitialSchema.ts
│   └── 1700000000001-SeedInitialData.ts
│
├── initial_data/              📊 CSV seed data
│   ├── orders.csv             (300 orders)
│   └── order_items.csv        (856 items)
│
├── k8s/                       ☸️ Kubernetes manifests
│   ├── order-config.yaml
│   └── order-deploy.yaml
│
└── postman_collection.json    🧪 API tests
```

## 🎯 Quick Links by Task

### I want to...

**Get started quickly**
→ [QUICKSTART.md](./QUICKSTART.md)

**Understand the full system**
→ [README.md](./README.md)

**Set up the database**
→ [DATABASE_SETUP.md](./DATABASE_SETUP.md)

**Explore the data**
→ [DATA_EXPLORATION.md](./DATA_EXPLORATION.md)

**Understand what changed**
→ [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md)

**Learn about API headers**
→ [API_HEADERS.md](./API_HEADERS.md)

**Understand API changes**
→ [API_UPDATES.md](./API_UPDATES.md)

**Test the API**
→ Import [postman_collection.json](./postman_collection.json)

**See the API spec**
→ [openapi.yaml](./openapi.yaml) or http://localhost:8085/api

## 📞 Common Commands

```bash
# Start everything
docker-compose up --build

# View logs
docker-compose logs -f order-svc

# Stop everything
docker-compose down

# Clean restart (removes data)
docker-compose down -v && docker-compose up --build

# Connect to database
docker exec -it order-svc-order-db-1 psql -U order_user -d orderdb

# Run migrations manually
npm run migration:run

# Check health
curl http://localhost:8085/v1/orders/health

# Get orders
curl http://localhost:8085/v1/orders?limit=10
```

## 🏗️ Architecture Highlights

- **Database-per-service**: PostgreSQL with TypeORM
- **Idempotency**: SHA-256 request hashing
- **Resilient HTTP**: Timeouts, retries, circuit breaker
- **Observability**: Prometheus metrics, Pino logs
- **12-factor**: Environment-based config
- **State machine**: Order lifecycle management
- **Integer IDs**: Simple, performant, CSV-compatible

## 📈 Data Overview

- **300 orders** (IDs 1-300)
- **856 order items**
- **60 customers**
- **40 restaurants**
- **81 addresses**
- **Date range**: 2022-2025
- **7 order statuses**: CREATED → CONFIRMED → PREPARING → READY → DISPATCHED → DELIVERED (or CANCELLED)
- **3 payment statuses**: PENDING, SUCCESS, FAILED

## 🆘 Need Help?

1. Check [QUICKSTART.md](./QUICKSTART.md) for setup issues
2. See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for database problems
3. Review [README.md](./README.md) for detailed documentation
4. Explore [DATA_EXPLORATION.md](./DATA_EXPLORATION.md) for data queries
5. Check logs: `docker-compose logs -f order-svc`
