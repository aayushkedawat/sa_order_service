# Order Service - Online Food Delivery

NestJS-based Order Service with database-per-service architecture, idempotency, observability, and microservices integration.

## Features

- **Database-per-service**: PostgreSQL with TypeORM, no cross-DB joins
- **Idempotency**: SHA-256 request hashing with stored responses
- **Resilient HTTP**: Axios with timeouts (2.5s), retries with jitter, circuit breaker
- **Observability**: Prometheus metrics, Pino JSON logs, correlation IDs
- **OpenAPI**: Swagger docs at `/api`
- **12-factor config**: Environment-based configuration
- **State machine**: CREATED → CONFIRMED → CANCELLED
- **Business rules**: Restaurant open check, item availability, city matching, server-side total validation

## Tech Stack

- NestJS + TypeScript
- TypeORM + PostgreSQL
- Zod + class-validator
- Prometheus + Pino
- Docker + Kubernetes

## Quick Start

### Local Development

```bash
# Install dependencies
cd order-svc
npm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL
docker-compose up order-db -d

# Run migrations
npm run migration:run

# Start service
npm run start:dev
```

Service runs on `http://localhost:8080`

### Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Service available at http://localhost:8085
```

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

```bash
IDK=$(uuidgen)
curl -i -X POST http://localhost:8080/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDK" \
  -d '{
    "customerId": "c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1",
    "restaurantId": "r1r1r1r1-r1r1-r1r1-r1r1-r1r1r1r1r1r1",
    "addressId": "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1",
    "items": [
      {"itemId": "i1i1i1i1-i1i1-i1i1-i1i1-i1i1i1i1i1i1", "quantity": 2},
      {"itemId": "i2i2i2i2-i2i2-i2i2-i2i2-i2i2i2i2i2i2", "quantity": 1}
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
curl http://localhost:8080/v1/orders

# Filter by customer
curl "http://localhost:8080/v1/orders?customerId=c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1"

# Cursor pagination
curl "http://localhost:8080/v1/orders?limit=10&cursor=2024-01-01T00:00:00.000Z"
```

### Get Order

```bash
curl http://localhost:8080/v1/orders/{orderId}
```

### Cancel Order

```bash
curl -X DELETE http://localhost:8080/v1/orders/{orderId}
```

### Prometheus Metrics

```bash
curl http://localhost:8080/metrics
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

## Observability

### Metrics (Prometheus)

- `http_requests_total{path,method,status}` - Request counter
- `http_request_duration_seconds{path,method}` - Request latency histogram
- `orders_placed_total` - Business metric: orders created
- `payments_failed_total` - Business metric: payment failures
- `delivery_assignment_latency_ms` - Delivery service call latency

### Logging (Pino)

- JSON structured logs in production
- Pretty logs in development
- Correlation ID in all logs
- Request/response logging via interceptor

### Tracing

- `x-correlation-id` header propagation
- Basic OpenTelemetry trace header passthrough

## Database Schema

### orders

- `orderId` (uuid, PK)
- `customerId`, `restaurantId`, `addressId` (uuid)
- `orderStatus` (enum: CREATED|CONFIRMED|CANCELLED)
- `paymentStatus` (enum: PENDING|SUCCESS|FAILED|NA)
- `subtotalAmount`, `taxAmount`, `deliveryFee`, `orderTotal` (numeric 12,2)
- `currency` (varchar, default 'INR')
- Projections: `restaurantName`, `restaurantCity`, `deliveryCity`, `paymentMethod`, `note`
- Timestamps: `createdAt`, `updatedAt`

### order_items

- `orderItemId` (uuid, PK)
- `orderId` (uuid, FK → orders)
- `itemId` (uuid)
- `itemName`, `unitPrice`, `quantity` (≤5), `lineTotal`

### idempotency_keys

- `idempotencyKey` (text, PK)
- `requestHash` (text, SHA-256)
- `responseBody` (jsonb)
- `statusCode` (int)
- `createdAt`

### outbox_events

- `eventId` (uuid, PK)
- `aggregateType`, `aggregateId`, `eventType`
- `payload` (jsonb)
- `published` (boolean)
- `createdAt`

## Environment Variables

See `.env.example` for all configuration options.

Key variables:

- `DB_DSN`: PostgreSQL connection string
- `MENU_SVC`, `CUST_SVC`, `PAY_SVC`, `DELIV_SVC`: External service URLs
- `DELIVERY_FEE`: Default delivery fee (40.0)
- `HTTP_TIMEOUT_MS`: Request timeout (2500)
- `HTTP_RETRIES`: Retry attempts (2)
- `CIRCUIT_FAILURES`: Circuit breaker threshold (5)
- `CIRCUIT_RESET_MS`: Circuit breaker reset time (20000)

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

## OpenAPI Documentation

- Swagger UI: `http://localhost:8080/api`
- OpenAPI spec: Generated at `./openapi.yaml` on startup

## Architecture Notes

- **No shared database**: Each service owns its tables
- **API-based integration**: Call external services via HTTP
- **Data snapshots**: Store denormalized data (restaurant name, item prices) in Order DB
- **Idempotency**: All POST operations require `Idempotency-Key` header
- **Derived idempotency keys**: Each downstream service call gets a unique derived key (SHA-256 of `baseKey:scope`) to prevent key collision across services
- **Bounded retries**: 2 retries with 100-300ms jitter
- **Circuit breaker**: Per-host state tracking
- **Transactional consistency**: Order + items created in single transaction
- **Outbox pattern**: Optional event publishing for eventual consistency
