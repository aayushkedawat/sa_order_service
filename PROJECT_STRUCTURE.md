# Order Service - Project Structure

## Directory Layout

```
order-svc/
├── src/
│   ├── app.module.ts                    # Root module with TypeORM, middleware
│   ├── main.ts                          # Bootstrap, validation pipe, OpenAPI
│   ├── common/
│   │   ├── http/
│   │   │   ├── http.module.ts           # Global HTTP module
│   │   │   └── http.service.ts          # Axios + retries + circuit breaker
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts   # Request/response logging
│   │   ├── middleware/
│   │   │   └── correlation.middleware.ts # x-correlation-id generation
│   │   ├── observability/
│   │   │   ├── metrics.module.ts
│   │   │   ├── metrics.controller.ts    # GET /metrics
│   │   │   └── metrics.service.ts       # Prometheus metrics
│   │   └── util/
│   │       ├── errors.ts                # Error helpers, BusinessException
│   │       └── idempotency.ts           # SHA-256 hashing, round2()
│   ├── config/
│   │   ├── config.module.ts             # Global config module
│   │   ├── schema.ts                    # Zod validation schema
│   │   └── data-source.ts               # TypeORM CLI data source
│   └── orders/
│       ├── orders.module.ts             # Orders feature module
│       ├── orders.controller.ts         # REST endpoints
│       ├── orders.service.ts            # Business logic
│       ├── dto/
│       │   └── create-order.dto.ts      # Request validation
│       └── entities/
│           ├── order.entity.ts          # Order table
│           ├── order-item.entity.ts     # Order items table
│           ├── idempotency-key.entity.ts # Idempotency tracking
│           └── outbox-event.entity.ts   # Event sourcing (optional)
├── migrations/
│   └── 1700000000000-InitialSchema.ts   # Database schema
├── k8s/
│   ├── order-config.yaml                # ConfigMap + Secret
│   └── order-deploy.yaml                # Deployment + Service
├── package.json                         # Dependencies
├── tsconfig.json                        # TypeScript config
├── nest-cli.json                        # NestJS CLI config
├── Dockerfile                           # Multi-stage build
├── docker-compose.yml                   # Local dev setup
├── .env.example                         # Environment template
├── .gitignore
├── setup.sh                             # Quick setup script
├── test-order.sh                        # API test script
└── README.md                            # Full documentation
```

## Key Components

### 1. HTTP Client (`common/http/http.service.ts`)

- Axios with configurable timeout (2.5s default)
- Automatic retries with jitter (2 retries, 100-300ms backoff)
- Per-host circuit breaker (5 failures → OPEN, 20s reset)
- Generic `get<T>()` and `post<T>()` methods

### 2. Idempotency (`orders/orders.service.ts`)

- SHA-256 hash of canonical JSON request body
- Store: `idempotencyKey`, `requestHash`, `responseBody`, `statusCode`
- On duplicate key: validate hash match, return cached response
- On hash mismatch: 409 IDEMPOTENCY_MISMATCH

### 3. Business Logic Flow

```
POST /v1/orders
  ↓
Check idempotency key
  ↓
Fetch restaurant (MENU_SVC) → validate is_open
  ↓
Fetch menu items (MENU_SVC) → validate is_available
  ↓
Fetch address (CUST_SVC) → validate city match
  ↓
Compute server totals → validate client totals
  ↓
Start transaction
  ↓
Create order + items
  ↓
If non-COD: call Payment (PAY_SVC)
  ↓
If payment success: call Delivery (DELIV_SVC)
  ↓
Commit transaction
  ↓
Store idempotency response
  ↓
Return 201 Created
```

### 4. State Machine

- **CREATED**: Initial state, can be cancelled
- **CONFIRMED**: Payment successful, delivery assigned
- **CANCELLED**: Cancelled by user (only from CREATED)

### 5. Observability

**Metrics** (`/metrics`):

- `http_requests_total{path,method,status}`
- `http_request_duration_seconds{path,method}`
- `orders_placed_total`
- `payments_failed_total`
- `delivery_assignment_latency_ms`

**Logging**:

- Pino JSON logs (pretty in dev)
- Correlation ID in all logs
- Request/response interceptor

**Tracing**:

- `x-correlation-id` header propagation

### 6. Database Schema

**orders**:

- Primary key: `orderId` (uuid)
- Foreign keys: `customerId`, `restaurantId`, `addressId`
- Enums: `orderStatus`, `paymentStatus`
- Money: `subtotalAmount`, `taxAmount`, `deliveryFee`, `orderTotal` (numeric 12,2)
- Projections: `restaurantName`, `restaurantCity`, `deliveryCity`, `paymentMethod`
- Indexes: `customerId`, `createdAt`

**order_items**:

- Primary key: `orderItemId` (uuid)
- Foreign key: `orderId` → orders (CASCADE)
- Check: `quantity <= 5`
- Index: `orderId`

**idempotency_keys**:

- Primary key: `idempotencyKey` (text)
- Fields: `requestHash`, `responseBody` (jsonb), `statusCode`

**outbox_events**:

- Primary key: `eventId` (uuid)
- Fields: `aggregateType`, `aggregateId`, `eventType`, `payload` (jsonb), `published`
- Index: `published`, `createdAt`

## API Endpoints

| Method | Path                | Description                             |
| ------ | ------------------- | --------------------------------------- |
| GET    | `/v1/orders/health` | Health check                            |
| GET    | `/v1/orders`        | List orders (cursor pagination)         |
| GET    | `/v1/orders/:id`    | Get order by ID                         |
| POST   | `/v1/orders`        | Create order (requires Idempotency-Key) |
| DELETE | `/v1/orders/:id`    | Cancel order                            |
| GET    | `/metrics`          | Prometheus metrics                      |
| GET    | `/api`              | Swagger UI                              |

## Configuration

All config via environment variables (see `.env.example`):

**Database**:

- `DB_DSN`: PostgreSQL connection string

**External Services**:

- `MENU_SVC`: Restaurant/Menu service URL
- `CUST_SVC`: Customer service URL
- `PAY_SVC`: Payment service URL
- `DELIV_SVC`: Delivery service URL

**Business**:

- `DELIVERY_FEE`: Default delivery fee (40.0)

**HTTP Client**:

- `HTTP_TIMEOUT_MS`: Request timeout (2500)
- `HTTP_RETRIES`: Retry attempts (2)
- `CIRCUIT_FAILURES`: Circuit breaker threshold (5)
- `CIRCUIT_RESET_MS`: Circuit breaker reset time (20000)

## Running the Service

### Local Development

```bash
./setup.sh              # Install deps, start DB, run migrations
npm run start:dev       # Start with hot reload
```

### Docker Compose

```bash
docker-compose up --build
```

### Kubernetes (Minikube)

```bash
minikube start
docker build -t order-svc:latest .
minikube image load order-svc:latest
kubectl apply -f k8s/
kubectl port-forward svc/order-svc 8080:8080
```

### Testing

```bash
./test-order.sh http://localhost:8080
```

## Design Principles

1. **Database-per-service**: No shared tables, API-based integration
2. **Idempotency**: All mutations require idempotency key
3. **Resilience**: Timeouts, retries, circuit breakers
4. **Observability**: Metrics, structured logs, correlation IDs
5. **12-factor**: Environment-based config
6. **Transactional consistency**: Order + items in single transaction
7. **Server-side validation**: Compute and validate all totals
8. **Bounded retries**: 2 retries with jitter, fail fast
9. **State machine**: Clear order lifecycle
10. **OpenAPI**: Self-documenting API

## Error Handling

All errors return structured JSON:

```json
{
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "correlationId": "uuid",
  "details": {}
}
```

HTTP status codes:

- `400`: Bad request (validation)
- `404`: Not found
- `409`: Business conflict (idempotency, totals, state)
- `422`: Unprocessable entity (external resource missing)
- `500`: Internal server error

## Next Steps

1. Add integration tests
2. Implement outbox pattern publisher
3. Add distributed tracing (Jaeger/Zipkin)
4. Add rate limiting
5. Add API authentication/authorization
6. Add database connection pooling config
7. Add graceful shutdown
8. Add health check with DB ping
9. Add request ID to all external calls
10. Add saga pattern for distributed transactions
