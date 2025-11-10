#!/bin/bash

echo "🚀 Starting Order Service with Docker Compose..."
echo ""
echo "This will:"
echo "  1. Start PostgreSQL database"
echo "  2. Build the application"
echo "  3. Run migrations and seed initial data"
echo "  4. Start the order service"
echo ""

docker-compose up --build
