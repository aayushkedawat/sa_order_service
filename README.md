# Order Service - Online Food Delivery

NestJS-based Order Service with database-per-service architecture, idempotency, observability, and microservices integration.

## ✨ Features

- **Database-per-service**: PostgreSQL with TypeORM, no cross-DB joins
- **Flexible ID Support**: Supports both integer IDs and MongoDB ObjectIDs
- **Idempotency**: SHA-256 request hashing with stored responses
- **Resilient HTTP**: Axios with timeouts (2.5s), retries with jitter, circuit breaker
- **Production Observability**:
  - Pino JSON structured logging
  - Prometheus metrics collection
  - Correlation ID tracing
  - HTTP request instrumentation
- **OpenAPI**: Swagger docs at `/api`
- **12-factor config**: Environment-based configuration
- **State machine**: CREATED → CONFIRMED → CANCELLED
- **Business rules**: Restaurant open check, item availability, city matching, server-side total validation
- **Microservices Integration**: Restaurant, Customer, Payment, Delivery services

## Tech Stack

- NestJS + TypeScript
- TypeORM + PostgreSQL
- Zod + class-validator
- Prometheus + Pino
- Docker + Kubernetes

## Quick Start

### Docker Compose (Recommended - One Command!)

```bash
cd order-svc
docker-compose up --build
```

That's it! This will:

1. ✅ Start PostgreSQL database
2. ✅ Build the application
3. ✅ Run migrations (create tables)
4. ✅ Seed initial data (300 orders + 856 order items from CSV)
5. ✅ Start the order service

Service available at `http://localhost:8086`

**Additional services started:**

- Prometheus: `http://localhost:9092`
- Swagger UI: `http://localhost:8086/api`
- Metrics: `http://localhost:8086/metrics`

### Local Development

```bash
# Install dependencies
cd order-svc
npm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL
docker-compose up order-db -d

# Run migrations and seed data
npm run migration:run

# Start service
npm run start:dev
```

Service runs on `http://localhost:8080`

### Kubernetes (Minikube)

```bash
# Start Minikube
minikube start

# Build image
docker build -t order-svc:latest .

# Load image into Minikube
minikube image load order-svc:latest

# Apply manifests
kubectl apply -f k8s/order-config.yaml
kubectl apply -f k8s/order-deploy.yaml

# Port forward
kubectl port-forward svc/order-svc 8080:8080
```

## API Endpoints

### Health Check

```bash
curl http://localhost:8080/v1/orders/health
```

### Create Order (Idempotent)

**With MongoDB ObjectIDs (Customer Service):**

```bash
IDK=$(uuidgen)
curl -i -X POST http://localhost:8086/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDK" \
  -H "x-correlation-id: my-trace-123" \
  -d '{
    "customerId": "69121597eb9d0be310631f65",
    "restaurantId": 1,
    "addressId": "69121597eb9d0be310631fa3",
    "items": [
      {"itemId": 1, "quantity": 2}
    ],
    "clientTotals": {
      "subtotal": 481.72,
      "tax": 24.09,
      "deliveryFee": 40.00,
      "total": 545.81
    },
    "payment": {
      "method": "COD"
    },
    "note": "Extra spicy"
  }'
```

**With Integer IDs (Legacy/Backward Compatible):**

```bash
IDK=$(uuidgen)
curl -i -X POST http://localhost:8086/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDK" \
  -d '{
    "customerId": "54",
    "restaurantId": 36,
    "addressId": "73",
    "items": [
      {"itemId": 317, "quantity": 2},
      {"itemId": 316, "quantity": 1}
    ],
    "clientTotals": {
      "subtotal": 420.00,
      "tax": 21.00,
      "deliveryFee": 40.00,
      "total": 481.00
    },
    "payment": {
      "method": "CARD",
      "reference": "tok_123"
    },
    "note": "Extra spicy"
  }'
```

### Retry with Same Idempotency Key (Returns cached response)

```bash
curl -i -X POST http://localhost:8080/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDK" \
  -d '{ ... same body ... }'
```

### List Orders

```bash
# All orders
curl http://localhost:8086/v1/orders

# Filter by customer (supports both integer and MongoDB ObjectID)
curl "http://localhost:8086/v1/orders?customerId=54"
curl "http://localhost:8086/v1/orders?customerId=69121597eb9d0be310631f65"

# Filter by restaurant
curl "http://localhost:8086/v1/orders?restaurantId=36"

# Filter by status
curl "http://localhost:8086/v1/orders?status=DELIVERED"

# Cursor pagination
curl "http://localhost:8086/v1/orders?limit=10&cursor=2024-01-01T00:00:00.000Z"

# Combined filters
curl "http://localhost:8086/v1/orders?customerId=54&status=DELIVERED&limit=20"
```

### Get Order

```bash
# Get order by ID (integer)
curl http://localhost:8086/v1/orders/1

# Example response shows order with items
curl http://localhost:8086/v1/orders/150

# New orders with MongoDB ObjectIDs
curl http://localhost:8086/v1/orders/301
```

### Cancel Order

```bash
# Cancel order by ID
curl -X DELETE http://localhost:8086/v1/orders/1
```

### Prometheus Metrics

```bash
# View all metrics
curl http://localhost:8086/metrics

# Access Prometheus UI
open http://localhost:9092
```

## Business Rules

1. **Restaurant validation**: Must be `is_open=true`
2. **Item validation**: All items must be `is_available=true`
3. **Limits**: Max 20 line items, each quantity ≤ 5
4. **City matching**: Delivery address city must match restaurant city
5. **Server-side totals**:
   - `subtotal = Σ(price × qty)`
   - `tax = subtotal × 0.05`
   - `deliveryFee` from env (default 40.00)
   - `total = subtotal + tax + deliveryFee`
6. **Total validation**: Client totals must exactly match server calculation (409 TOTAL_MISMATCH)
7. **Payment**:
   - COD: `paymentStatus=PENDING`
   - CARD/UPI/WALLET: Call Payment service, set SUCCESS or FAILED
8. **State machine**: CREATED → CONFIRMED → CANCELLED (cancel only from CREATED)

## Idempotency Key Derivation

To prevent idempotency key collisions across services, we use **derived keys** for downstream calls:

```typescript
// Client sends: Idempotency-Key: "550e8400-e29b-41d4-a716-446655440000"

// Order Service uses original key for order creation
const orderKey = "550e8400-e29b-41d4-a716-446655440000";

// Payment Service gets derived key
const paymentKey = deriveIdempotencyKey(orderKey, "payment");
// → "a1b2c3d4e5f6..." (SHA-256 of "550e8400...:payment")

// Delivery Service gets different derived key
const deliveryKey = deriveIdempotencyKey(orderKey, "delivery");
// → "f6e5d4c3b2a1..." (SHA-256 of "550e8400...:delivery")
```

**Why this matters:**

- ✅ Each service operation has its own idempotency scope
- ✅ Retrying order creation also retries payment/delivery with correct keys
- ✅ No key collision between services
- ✅ Deterministic: same base key + scope always produces same derived key

## Error Responses

All errors return:

```json
{
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "correlationId": "uuid",
  "details": {}
}
```

Common error codes:

- `IDEMPOTENCY_MISMATCH` (409): Request body differs from original
- `RESTAURANT_CLOSED` (422): Restaurant not open
- `ITEM_UNAVAILABLE` (422): Menu item not available
- `CITY_MISMATCH` (409): Delivery city ≠ restaurant city
- `TOTAL_MISMATCH` (409): Client totals don't match server
- `PAYMENT_FAILED` (409): Payment processing failed
- `CANNOT_CANCEL` (409): Order not in CREATED status

## 📊 Observability

### Metrics (Prometheus)

**Prometheus UI:** http://localhost:9092

**Available Metrics:**

- `http_requests_total{path,method,status}` - Request counter
- `http_request_duration_seconds{path,method}` - Request latency histogram
- `orders_placed_total` - Business metric: orders created
- `payments_failed_total` - Business metric: payment failures
- `delivery_assignment_latency_ms` - Delivery service call latency
- Node.js runtime metrics (CPU, memory, GC, event loop)

**Example Queries:**

```promql
# Request rate per second
rate(http_requests_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Orders per minute
rate(orders_placed_total[1m]) * 60
```

### Logging (Pino)

**Features:**

- JSON structured logs in production
- Pretty-printed colored logs in development
- Correlation ID in all logs
- Automatic HTTP request/response logging
- Error tracking with full stack traces
- Configurable log levels

**Example Log:**

```json
{
  "level": "info",
  "time": "2025-11-10T17:04:19.520Z",
  "type": "http_request",
  "method": "POST",
  "path": "/v1/orders",
  "status": 201,
  "latency_ms": 121,
  "correlation_id": "test-flow-1"
}
```

**View Logs:**

```bash
# Follow logs
docker-compose logs -f order-svc

# Filter by correlation ID
docker-compose logs order-svc | grep "my-trace-123"
```

### Tracing

- `x-correlation-id` header propagation
- Auto-generated if not provided
- Included in all logs and responses
- Passed to downstream services
- Use for distributed tracing across microservices

**Example:**

```bash
curl -H "x-correlation-id: my-trace-123" \
  http://localhost:8086/v1/orders/1
```

### Testing Observability

Run the automated test suite:

```bash
./test-observability.sh
./test-complete-flow.sh
```

## Database Schema

### orders

- `order_id` (SERIAL, PK) - Auto-incrementing integer ID
- `customer_id` (TEXT) - Customer reference (supports integer and MongoDB ObjectID)
- `restaurant_id` (INT) - Restaurant reference
- `address_id` (TEXT) - Delivery address reference (supports integer and MongoDB ObjectID)
- `order_status` (ENUM) - CREATED | CONFIRMED | PREPARING | READY | DISPATCHED | DELIVERED | CANCELLED
- `order_total` (NUMERIC 12,2) - Total order amount
- `payment_status` (ENUM) - PENDING | SUCCESS | FAILED
- `created_at` (TIMESTAMP) - Order creation timestamp

**Indexes:**

- `idx_orders_customer` on `customer_id`
- `idx_orders_restaurant` on `restaurant_id`
- `idx_orders_status` on `order_status`
- `idx_orders_created` on `created_at`

### order_items

- `order_item_id` (SERIAL, PK) - Auto-incrementing integer ID
- `order_id` (INT, FK → orders) - Foreign key to orders table
- `item_id` (INT) - Menu item reference
- `quantity` (INT) - Item quantity (1-5)
- `price` (NUMERIC 12,2) - Item price at time of order

**Indexes:**

- `idx_order_items_order` on `order_id`
- `idx_order_items_item` on `item_id`

### idempotency_keys

- `idempotency_key` (TEXT, PK) - Unique idempotency key
- `request_hash` (TEXT) - SHA-256 hash of request body
- `response_body` (JSONB) - Cached response
- `status_code` (INT) - HTTP status code
- `created_at` (TIMESTAMP) - Key creation time

### outbox_events

- `event_id` (UUID, PK) - Unique event identifier
- `aggregate_type` (VARCHAR 50) - Entity type (e.g., 'Order')
- `aggregate_id` (INT) - Entity ID (integer)
- `event_type` (VARCHAR 100) - Event name (e.g., 'OrderCreated')
- `payload` (JSONB) - Event data
- `published` (BOOLEAN) - Publication status
- `created_at` (TIMESTAMP) - Event creation time

**Indexes:**

- `idx_outbox_published` on `published, created_at`

## Initial Data

The database comes pre-loaded with:

- **300+ orders** spanning various statuses and dates (2022-2025)
- **856+ order items** with realistic pricing
- Data loaded from `initial_data/orders.csv` and `initial_data/order_items.csv`
- Supports both integer IDs (legacy data) and MongoDB ObjectIDs (new orders)

### Order Status Distribution

The initial data includes orders in all lifecycle stages:

- CREATED - New orders
- CONFIRMED - Accepted by restaurant
- PREPARING - Being prepared
- READY - Ready for pickup
- DISPATCHED - Out for delivery
- DELIVERED - Successfully delivered
- CANCELLED - Cancelled orders

### Payment Status Distribution

- SUCCESS - Successful payments
- PENDING - Awaiting payment (COD orders)
- FAILED - Failed payment attempts

### Exploring the Seeded Data

```bash
# Get all orders for customer 54 (integer ID)
curl "http://localhost:8086/v1/orders?customerId=54"

# Get orders for MongoDB ObjectID customer
curl "http://localhost:8086/v1/orders?customerId=69121597eb9d0be310631f65"

# Get all orders from restaurant 36
curl "http://localhost:8086/v1/orders?restaurantId=36"

# Get all delivered orders
curl "http://localhost:8086/v1/orders?status=DELIVERED"

# Get a specific order with items (legacy)
curl "http://localhost:8086/v1/orders/1"

# Get a new order with MongoDB IDs
curl "http://localhost:8086/v1/orders/301"

# Query database directly
docker exec -it order-svc-order-db-1 psql -U order_user -d orderdb
```

**Useful SQL queries:**

```sql
-- Order status breakdown
SELECT order_status, COUNT(*) FROM orders GROUP BY order_status;

-- Payment status breakdown
SELECT payment_status, COUNT(*) FROM orders GROUP BY payment_status;

-- Orders by customer
SELECT * FROM orders WHERE customer_id = 54;

-- Orders with item counts
SELECT o.order_id, o.order_total, COUNT(oi.order_item_id) as item_count
FROM orders o
LEFT JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY o.order_id
LIMIT 10;

-- Top customers by order count
SELECT customer_id, COUNT(*) as order_count
FROM orders
GROUP BY customer_id
ORDER BY order_count DESC
LIMIT 10;

-- Average order value by status
SELECT order_status, AVG(order_total) as avg_total
FROM orders
GROUP BY order_status;
```

## Environment Variables

See `.env.example` for all configuration options.

Key variables:

- `DB_DSN`: PostgreSQL connection string
- `MENU_SVC`, `CUST_SVC`, `PAY_SVC`, `DELIV_SVC`: External service URLs (use `host.docker.internal` for cross-container)
- `DELIVERY_FEE`: Default delivery fee (40.0)
- `HTTP_TIMEOUT_MS`: Request timeout (2500)
- `HTTP_RETRIES`: Retry attempts (2)
- `CIRCUIT_FAILURES`: Circuit breaker threshold (5)
- `CIRCUIT_RESET_MS`: Circuit breaker reset time (20000)
- `NODE_ENV`: Environment (development/production) - affects log format
- `LOG_LEVEL`: Log level (info/debug/error)

## Development

```bash
# Generate migration
npm run migration:generate -- migrations/MigrationName

# Run migrations
npm run migration:run

# Build
npm run build

# Production
npm run start:prod
```

## 📚 Documentation

- **Swagger UI:** `http://localhost:8086/api`
- **OpenAPI spec:** Generated at `./openapi.yaml` on startup
- **Observability Guide:** See `OBSERVABILITY.md`
- **Success Summary:** See `SUCCESS_SUMMARY.md`
- **Postman Collection:** `postman_collection.json`

## 🧪 Testing

Run automated test suites:

```bash
# Test observability features
./test-observability.sh

# Test complete order flow
./test-complete-flow.sh
```

**Manual Testing:**

```bash
# Create order with MongoDB ObjectIDs
curl -X POST http://localhost:8086/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "x-correlation-id: manual-test-123" \
  -d '{
    "customerId": "69121597eb9d0be310631f65",
    "restaurantId": 1,
    "addressId": "69121597eb9d0be310631fa3",
    "items": [{"itemId": 1, "quantity": 2}],
    "clientTotals": {
      "subtotal": 481.72,
      "tax": 24.09,
      "deliveryFee": 40.00,
      "total": 545.81
    },
    "payment": {"method": "COD"}
  }'

# Check logs for correlation ID
docker-compose logs order-svc | grep "manual-test-123"

# View metrics
curl http://localhost:8086/metrics | grep orders_placed_total
```

## 🏗️ Architecture Notes

- **No shared database**: Each service owns its tables
- **API-based integration**: Call external services via HTTP
- **Flexible ID support**: Accepts both integer IDs and MongoDB ObjectIDs
- **Data snapshots**: Store denormalized data (restaurant name, item prices) in Order DB
- **Idempotency**: All POST operations require `Idempotency-Key` header
- **Derived idempotency keys**: Each downstream service call gets a unique derived key (SHA-256 of `baseKey:scope`) to prevent key collision across services
- **Bounded retries**: 2 retries with 100-300ms jitter
- **Circuit breaker**: Per-host state tracking
- **Transactional consistency**: Order + items created in single transaction
- **Outbox pattern**: Optional event publishing for eventual consistency
- **Production observability**: JSON logs, Prometheus metrics, correlation IDs

## 🔗 Service Integration

The order service integrates with:

| Service                 | Port | Purpose                          | Status       |
| ----------------------- | ---- | -------------------------------- | ------------ |
| Restaurant/Menu Service | 8085 | Validate restaurant & menu items | ✅ Connected |
| Customer Service        | 8081 | Validate customer & address      | ✅ Connected |
| Payment Service         | 8004 | Process payments                 | ✅ Connected |
| Delivery Service        | 8085 | Assign delivery                  | ⚠️ Optional  |

**Connection Configuration:**

- Uses `host.docker.internal` for cross-container communication
- Configurable via environment variables
- Automatic retry with exponential backoff
- Circuit breaker for fault tolerance

## 📊 Monitoring & Alerts

**Prometheus Queries for Alerts:**

```promql
# High error rate (>5%)
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05

# High latency (p95 > 1s)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1

# Payment failure rate (>10%)
rate(payments_failed_total[5m]) / rate(orders_placed_total[5m]) > 0.1
```

**Grafana Dashboard:**

- Import Prometheus data source: `http://prometheus:9090`
- Use provided queries for visualization
- Set up alerts based on thresholds

## 🎉 Recent Updates

### November 2025 - Production Observability & ID Flexibility

**Major Features Added:**

1. **Pino JSON Structured Logging**

   - Production-ready JSON logs for log aggregators
   - Pretty-printed logs in development
   - Correlation ID tracking across all requests
   - Automatic HTTP request/response logging
   - Error tracking with full stack traces

2. **Prometheus Monitoring**

   - Comprehensive metrics collection
   - Custom business metrics (orders, payments, delivery)
   - Node.js runtime metrics
   - Prometheus UI on port 9092
   - Ready for Grafana dashboards

3. **Flexible ID Support**

   - Now accepts MongoDB ObjectIDs for customer and address IDs
   - Maintains backward compatibility with integer IDs
   - Database migration applied automatically
   - Supports mixed ID formats in same database

4. **Enhanced Integration**

   - Connected to Restaurant/Menu Service (port 8085)
   - Connected to Customer Service (port 8081)
   - Connected to Payment Service (port 8004)
   - Cross-container communication via `host.docker.internal`

5. **Testing & Documentation**
   - Automated test suites (`test-observability.sh`, `test-complete-flow.sh`)
   - Comprehensive documentation (OBSERVABILITY.md, SUCCESS_SUMMARY.md)
   - Updated Postman collection with MongoDB ObjectID examples
   - All features verified and working

**Breaking Changes:**

- `customer_id` and `address_id` columns changed from INT to TEXT
- Migration runs automatically on startup
- Existing integer IDs still work (stored as strings)

**Verification:**

```bash
# Run complete test suite
./test-complete-flow.sh

# Check Prometheus metrics
curl http://localhost:8086/metrics

# View JSON logs
docker-compose logs -f order-svc
```

## 🤝 Contributing

See individual documentation files for detailed information:

- `OBSERVABILITY.md` - Observability setup and usage
- `SUCCESS_SUMMARY.md` - Complete feature summary
- `FIXES_APPLIED.md` - Detailed changelog

## 📝 License

MIT
