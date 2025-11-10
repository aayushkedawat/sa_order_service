import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateIdColumnsToText1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update customer_id and address_id to TEXT to support MongoDB ObjectIDs
    await queryRunner.query(`
      ALTER TABLE orders 
      ALTER COLUMN customer_id TYPE TEXT USING customer_id::TEXT,
      ALTER COLUMN address_id TYPE TEXT USING address_id::TEXT;
    `);

    // Update indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_orders_customer;
      CREATE INDEX idx_orders_customer ON orders(customer_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to INT (this will fail if there are non-integer values)
    await queryRunner.query(`
      ALTER TABLE orders 
      ALTER COLUMN customer_id TYPE INT USING customer_id::INT,
      ALTER COLUMN address_id TYPE INT USING address_id::INT;
    `);

    // Recreate indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_orders_customer;
      CREATE INDEX idx_orders_customer ON orders(customer_id);
    `);
  }
}
