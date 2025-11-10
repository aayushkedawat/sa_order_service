#!/bin/sh
set -e

echo "🔍 Waiting for database to be ready..."

# Wait for database to be ready
until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DB_DSN });
client.connect()
  .then(() => { console.log('✅ Database is ready'); client.end(); process.exit(0); })
  .catch(() => { console.log('⏳ Waiting for database...'); process.exit(1); });
" 2>/dev/null; do
  sleep 2
done

echo "🚀 Running database migrations..."
npm run migration:run

echo "✅ Migrations completed successfully!"

echo "🎯 Starting application..."
exec node dist/main.js
