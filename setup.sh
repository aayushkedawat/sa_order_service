#!/bin/bash

echo "=== Order Service Setup ==="

# Install dependencies
echo "Installing dependencies..."
npm install

# Copy env file if not exists
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cp .env.example .env
fi

# Start database
echo "Starting PostgreSQL..."
docker-compose up order-db -d

# Wait for database
echo "Waiting for database to be ready..."
sleep 5

# Run migrations
echo "Running migrations..."
npm run migration:run

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the service:"
echo "  npm run start:dev"
echo ""
echo "To run with Docker Compose:"
echo "  docker-compose up --build"
echo ""
