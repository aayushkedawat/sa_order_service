import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create orders table
    await queryRunner.query(`
      CREATE TYPE order_status_enum AS ENUM ('CREATED', 'CONFIRMED', 'CANCELLED');
      CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'NA');

      CREATE TABLE orders (
        "orderId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "customerId" UUID NOT NULL,
        "restaurantId" UUID NOT NULL,
        "addressId" UUID NOT NULL,
        "orderStatus" order_status_enum NOT NULL DEFAULT 'CREATED',
        "paymentStatus" payment_status_enum NOT NULL DEFAULT 'PENDING',
        "subtotalAmount" NUMERIC(12,2) NOT NULL,
        "taxAmount" NUMERIC(12,2) NOT NULL,
        "deliveryFee" NUMERIC(12,2) NOT NULL,
        "orderTotal" NUMERIC(12,2) NOT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
        "restaurantName" VARCHAR(255),
        "restaurantCity" VARCHAR(100),
        "deliveryCity" VARCHAR(100),
        "paymentMethod" VARCHAR(50),
        "note" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_orders_customer ON orders("customerId");
      CREATE INDEX idx_orders_created ON orders("createdAt");
    `);

    // Create order_items table
    await queryRunner.query(`
      CREATE TABLE order_items (
        "orderItemId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderId" UUID NOT NULL REFERENCES orders("orderId") ON DELETE CASCADE,
        "itemId" UUID NOT NULL,
        "itemName" VARCHAR(255) NOT NULL,
        "unitPrice" NUMERIC(12,2) NOT NULL,
        "quantity" INT NOT NULL CHECK (quantity <= 5),
        "lineTotal" NUMERIC(12,2) NOT NULL
      );

      CREATE INDEX idx_order_items_order ON order_items("orderId");
    `);

    // Create idempotency_keys table
    await queryRunner.query(`
      CREATE TABLE idempotency_keys (
        "idempotencyKey" TEXT PRIMARY KEY,
        "requestHash" TEXT NOT NULL,
        "responseBody" JSONB NOT NULL,
        "statusCode" INT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create outbox_events table
    await queryRunner.query(`
      CREATE TABLE outbox_events (
        "eventId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "aggregateType" VARCHAR(50) NOT NULL,
        "aggregateId" UUID NOT NULL,
        "eventType" VARCHAR(100) NOT NULL,
        "payload" JSONB NOT NULL,
        "published" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_outbox_published ON outbox_events("published", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS outbox_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS idempotency_keys;`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_status_enum;`);
  }
}
