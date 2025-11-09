# API Headers Reference

## POST /v1/orders

### Required Headers

#### `Idempotency-Key`

- **Type**: `string` (UUID recommended)
- **Required**: ✅ Yes
- **Purpose**: Ensures idempotent order creation
- **Example**: `550e8400-e29b-41d4-a716-446655440000`

**Behavior:**

- First request with key → Creates order, returns 201
- Retry with same key + same body → Returns cached response (201)
- Retry with same key + different body → Returns 409 IDEMPOTENCY_MISMATCH

**Generation:**

```bash
# Bash
IDK=$(uuidgen)

# Node.js
const { randomUUID } = require('crypto');
const idempotencyKey = randomUUID();

# Python
import uuid
idempotency_key = str(uuid.uuid4())
```

### Optional Headers

#### `x-correlation-id`

- **Type**: `string` (UUID recommended)
- **Required**: ❌ No (auto-generated if not provided)
- **Purpose**: Distributed tracing across services
- **Example**: `7c9e6679-7425-40de-944b-e07fc1f90ae7`

**Behavior:**

- If provided → Used for all logs and downstream service calls
- If not provided → Auto-generated UUID
- Always returned in response headers

**Use Cases:**

- Track a request across multiple services
- Correlate logs from different services
- Debug distributed transactions

### Response Headers

All responses include:

- `x-correlation-id`: The correlation ID used for this request

## Example Request

```bash
curl -X POST http://localhost:8080/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-correlation-id: 7c9e6679-7425-40de-944b-e07fc1f90ae7" \
  -d '{
    "customerId": "c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1",
    "restaurantId": "r1r1r1r1-r1r1-r1r1-r1r1-r1r1r1r1r1r1",
    "addressId": "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1",
    "items": [
      {"itemId": "i1i1i1i1-i1i1-i1i1-i1i1-i1i1i1i1i1i1", "quantity": 2}
    ],
    "clientTotals": {
      "subtotal": 200.00,
      "tax": 10.00,
      "deliveryFee": 40.00,
      "total": 250.00
    },
    "payment": {
      "method": "CARD",
      "reference": "tok_123"
    }
  }'
```

## Downstream Service Calls

When Order Service calls other services, it automatically:

1. **Derives unique idempotency keys** for each service:

   ```
   Payment Service: SHA-256(baseKey + ":payment")
   Delivery Service: SHA-256(baseKey + ":delivery")
   ```

2. **Propagates correlation ID**:
   ```
   All downstream calls include: x-correlation-id: <same-id>
   ```

## Header Flow Diagram

```
Client Request
  ├─ Idempotency-Key: "abc-123"
  └─ x-correlation-id: "xyz-789" (or auto-generated)
       ↓
Order Service
  ├─ Uses "abc-123" for order creation
  ├─ Logs with correlationId: "xyz-789"
  ├─ Calls Payment Service
  │    ├─ Idempotency-Key: SHA-256("abc-123:payment")
  │    └─ x-correlation-id: "xyz-789"
  └─ Calls Delivery Service
       ├─ Idempotency-Key: SHA-256("abc-123:delivery")
       └─ x-correlation-id: "xyz-789"
```

## Error Responses

All errors include the correlation ID:

```json
{
  "code": "MISSING_IDEMPOTENCY_KEY",
  "message": "Idempotency-Key header required",
  "correlationId": "xyz-789"
}
```

## Best Practices

1. **Always generate new Idempotency-Key per operation**

   - ✅ New order = new key
   - ❌ Don't reuse keys across different orders

2. **Use UUIDs for both headers**

   - Ensures uniqueness
   - Standard format

3. **Propagate correlation ID from client**

   - Helps with end-to-end tracing
   - Useful for mobile/web apps

4. **Store idempotency keys on client side**

   - Enables safe retries after network failures
   - Prevents duplicate orders

5. **Set reasonable TTL for idempotency keys**
   - Current implementation: no expiry
   - Recommended: 24-48 hours in production
