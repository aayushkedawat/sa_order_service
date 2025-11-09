#!/bin/bash

# Test script for Order Service
HOST=${1:-http://localhost:8080}

echo "=== Testing Order Service ==="
echo "Host: $HOST"
echo ""

# Health check
echo "1. Health Check"
curl -s "$HOST/v1/orders/health" | jq .
echo -e "\n"

# Create order with idempotency
IDK=$(uuidgen)
echo "2. Create Order (Idempotency-Key: $IDK)"
curl -i -X POST "$HOST/v1/orders" \
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
      "method": "COD"
    },
    "note": "Extra spicy"
  }'
echo -e "\n"

# Retry with same key (should return cached response)
echo "3. Retry with Same Idempotency Key (should return same response)"
curl -i -X POST "$HOST/v1/orders" \
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
      "method": "COD"
    },
    "note": "Extra spicy"
  }'
echo -e "\n"

# List orders
echo "4. List Orders"
curl -s "$HOST/v1/orders" | jq .
echo -e "\n"

# Metrics
echo "5. Prometheus Metrics (first 20 lines)"
curl -s "$HOST/metrics" | head -20
echo ""
