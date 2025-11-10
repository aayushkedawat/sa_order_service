import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create orders table matching CSV structure
    await queryRunner.query(`
      CREATE TYPE order_status_enum AS ENUM (
        'CREATED', 'CONFIRMED', 'PREPARING', 'READY', 
        'DISPATCHED', 'DELIVERED', 'CANCELLED'
      );
      CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

      CREATE TABLE orders (
        order_id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL,
        restaurant_id INT NOT NULL,
        address_id INT NOT NULL,
        order_status order_status_enum NOT NULL DEFAULT 'CREATED',
        order_total NUMERIC(12,2) NOT NULL,
        payment_status payment_status_enum NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_orders_customer ON orders(customer_id);
      CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
      CREATE INDEX idx_orders_status ON orders(order_status);
      CREATE INDEX idx_orders_created ON orders(created_at);
    `);

    // Create order_items table matching CSV structure
    await queryRunner.query(`
      CREATE TABLE order_items (
        order_item_id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        item_id INT NOT NULL,
        quantity INT NOT NULL CHECK (quantity >= 1 AND quantity <= 5),
        price NUMERIC(12,2) NOT NULL
      );

      CREATE INDEX idx_order_items_order ON order_items(order_id);
      CREATE INDEX idx_order_items_item ON order_items(item_id);
    `);

    // Create idempotency_keys table for API idempotency
    await queryRunner.query(`
      CREATE TABLE idempotency_keys (
        idempotency_key TEXT PRIMARY KEY,
        request_hash TEXT NOT NULL,
        response_body JSONB NOT NULL,
        status_code INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create outbox_events table for event sourcing
    await queryRunner.query(`
      CREATE TABLE outbox_events (
        event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        aggregate_type VARCHAR(50) NOT NULL,
        aggregate_id INT NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        published BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_outbox_published ON outbox_events(published, created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS outbox_events CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS idempotency_keys CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_items CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_status_enum;`);
  }
}
