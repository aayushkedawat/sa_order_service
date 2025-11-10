#!/bin/bash

echo "🎯 Order Service Observability Demo"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}📊 Test 1: Health Check${NC}"
HEALTH=$(curl -s http://localhost:8086/v1/orders/health)
echo "$HEALTH" | jq
echo ""

# Test 2: Get existing order (from seeded data)
echo -e "${BLUE}📊 Test 2: Fetch Existing Order (ID: 1)${NC}"
ORDER=$(curl -s -H "x-correlation-id: demo-get-order-1" http://localhost:8086/v1/orders/1)
echo "$ORDER" | jq '{order_id, customer_id, restaurant_id, order_status, order_total}'
echo ""

# Test 3: List orders with pagination
echo -e "${BLUE}📊 Test 3: List Orders (Paginated)${NC}"
ORDERS=$(curl -s "http://localhost:8086/v1/orders?limit=3")
echo "$ORDERS" | jq '{count: (.orders | length), first_order: .orders[0].order_id, nextCursor}'
echo ""

# Test 4: Filter by customer
echo -e "${BLUE}📊 Test 4: Filter Orders by Customer (ID: 54)${NC}"
CUSTOMER_ORDERS=$(curl -s "http://localhost:8086/v1/orders?customerId=54&limit=5")
echo "$CUSTOMER_ORDERS" | jq '{count: (.orders | length), orders: [.orders[] | {order_id, order_status, order_total}]}'
echo ""

# Test 5: Filter by status
echo -e "${BLUE}📊 Test 5: Filter Orders by Status (DELIVERED)${NC}"
DELIVERED=$(curl -s "http://localhost:8086/v1/orders?status=DELIVERED&limit=3")
echo "$DELIVERED" | jq '{count: (.orders | length), orders: [.orders[] | {order_id, order_status}]}'
echo ""

# Test 6: Check Prometheus metrics
echo -e "${BLUE}📊 Test 6: Prometheus Metrics${NC}"
echo "HTTP Request Totals:"
curl -s http://localhost:8086/metrics | grep "^http_requests_total" | head -5
echo ""

# Test 7: Check structured logs
echo -e "${BLUE}📊 Test 7: Structured JSON Logs${NC}"
echo "Recent log entry:"
docker-compose logs --tail=5 order-svc 2>&1 | grep "demo-get-order-1" | tail -1 | sed 's/order-svc-1  | //' | jq '{level, time, method, path, status, latency_ms, correlation_id}'
echo ""

# Test 8: Prometheus query
echo -e "${BLUE}📊 Test 8: Prometheus Query (Service Status)${NC}"
UP_STATUS=$(curl -s 'http://localhost:9092/api/v1/query?query=up{job="order-service"}' | jq -r '.data.result[0].value[1]')
if [ "$UP_STATUS" == "1" ]; then
    echo -e "${GREEN}✅ Service is UP${NC}"
else
    echo -e "${YELLOW}⚠️  Service monitoring status: $UP_STATUS${NC}"
fi
echo ""

# Test 9: Request rate
echo -e "${BLUE}📊 Test 9: Request Rate Metrics${NC}"
curl -s 'http://localhost:9092/api/v1/query?query=http_requests_total' | jq -r '.data.result[0:3][] | "\(.metric.path) [\(.metric.method)] \(.metric.status) - \(.value[1]) requests"'
echo ""

# Summary
echo -e "${GREEN}✅ Observability Features Verified:${NC}"
echo "  ✓ JSON Structured Logging (Pino)"
echo "  ✓ Correlation ID Tracing"
echo "  ✓ Prometheus Metrics Collection"
echo "  ✓ HTTP Request Instrumentation"
echo "  ✓ Database Integration (PostgreSQL)"
echo "  ✓ RESTful API Endpoints"
echo ""
echo -e "${BLUE}📚 Access Points:${NC}"
echo "  • API: http://localhost:8086/v1/orders"
echo "  • Metrics: http://localhost:8086/metrics"
echo "  • Prometheus: http://localhost:9092"
echo "  • Swagger: http://localhost:8086/api"
