# Observability Setup

## JSON Structured Logging (Pino)

The service uses Pino for structured JSON logging with the following features:

### Log Format

- **Production**: JSON format for easy parsing by log aggregators
- **Development**: Pretty-printed colored output for readability

### Log Fields

All logs include:

- `level`: Log level (info, error, warn, debug, trace)
- `time`: ISO 8601 timestamp
- `type`: Event type (http_request, startup, etc.)
- `correlation_id`: Request correlation ID for distributed tracing

### HTTP Request Logs

```json
{
  "level": "info",
  "time": "2024-11-10T12:00:00.000Z",
  "type": "http_request",
  "method": "POST",
  "path": "/v1/orders",
  "status": 201,
  "latency_ms": 145,
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Configuration

Set via environment variables:

- `LOG_LEVEL`: Log level (default: info)
- `NODE_ENV`: development (pretty) or production (JSON)

## Prometheus Metrics

### Endpoints

- **Metrics**: `http://localhost:8086/metrics`
- **Prometheus UI**: `http://localhost:9092`

### Available Metrics

#### Default Node.js Metrics

- `process_cpu_user_seconds_total`
- `process_cpu_system_seconds_total`
- `process_resident_memory_bytes`
- `process_heap_bytes`
- `nodejs_eventloop_lag_seconds`
- `nodejs_gc_duration_seconds`

#### Custom Application Metrics

**HTTP Metrics:**

- `http_requests_total{path, method, status}` - Total HTTP requests
- `http_request_duration_seconds{path, method}` - Request duration histogram

**Business Metrics:**

- `orders_placed_total` - Total orders successfully placed
- `payments_failed_total` - Total payment failures
- `delivery_assignment_latency_ms` - Delivery assignment latency histogram

### Prometheus Queries

**Request rate (per second):**

```promql
rate(http_requests_total[5m])
```

**95th percentile latency:**

```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Error rate:**

```promql
rate(http_requests_total{status=~"5.."}[5m])
```

**Orders per minute:**

```promql
rate(orders_placed_total[1m]) * 60
```

## Running with Docker Compose

```bash
# Start all services including Prometheus
docker-compose up -d

# View logs (JSON in production)
docker-compose logs -f order-svc

# Access Prometheus
open http://localhost:9092

# Check metrics endpoint
curl http://localhost:8086/metrics
```

## Correlation IDs

Every request gets a correlation ID for distributed tracing:

- Auto-generated if not provided
- Pass via `x-correlation-id` header
- Included in all logs and responses
- Use for tracing requests across services

Example:

```bash
curl -H "x-correlation-id: my-trace-123" http://localhost:8086/v1/orders/1
```
