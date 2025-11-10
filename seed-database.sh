#!/bin/bash

# Seed Database Script
# This script runs migrations to create tables and load initial data

set -e

echo "🗄️  Starting database setup..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "✅ Environment variables loaded"
else
  echo "❌ .env file not found"
  exit 1
fi

# Check if database is accessible
echo "🔍 Checking database connection..."
if ! psql "$DB_DSN" -c "SELECT 1" > /dev/null 2>&1; then
  echo "❌ Cannot connect to database. Please check DB_DSN in .env"
  exit 1
fi
echo "✅ Database connection successful"

# Run migrations
echo "🚀 Running migrations..."
npm run migration:run

echo "✅ Database setup complete!"
echo ""
echo "📊 Summary:"
psql "$DB_DSN" -c "SELECT COUNT(*) as order_count FROM orders;"
psql "$DB_DSN" -c "SELECT COUNT(*) as order_items_count FROM order_items;"
