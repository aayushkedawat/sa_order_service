import { MigrationInterface, QueryRunner } from "typeorm";
import * as fs from "fs";
import * as path from "path";

export class SeedInitialData1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Read CSV files using process.cwd() which works in both CommonJS and ES modules
    const ordersCSV = fs.readFileSync(
      path.join(process.cwd(), "initial_data/orders.csv"),
      "utf-8"
    );
    const orderItemsCSV = fs.readFileSync(
      path.join(process.cwd(), "initial_data/order_items.csv"),
      "utf-8"
    );

    // Parse orders CSV
    const orderLines = ordersCSV.split("\n").slice(1); // Skip header
    const orders = orderLines
      .filter((line) => line.trim())
      .map((line) => {
        const [
          order_id,
          customer_id,
          restaurant_id,
          address_id,
          order_status,
          order_total,
          payment_status,
          created_at,
        ] = line.split(",");

        return {
          order_id: parseInt(order_id),
          customer_id: parseInt(customer_id),
          restaurant_id: parseInt(restaurant_id),
          address_id: parseInt(address_id),
          order_status: order_status.trim(),
          order_total: parseFloat(order_total),
          payment_status: payment_status.trim(),
          created_at: created_at.trim(),
        };
      });

    // Parse order items CSV
    const itemLines = orderItemsCSV.split("\n").slice(1); // Skip header
    const orderItems = itemLines
      .filter((line) => line.trim())
      .map((line) => {
        const [order_item_id, order_id, item_id, quantity, price] =
          line.split(",");

        return {
          order_item_id: parseInt(order_item_id),
          order_id: parseInt(order_id),
          item_id: parseInt(item_id),
          quantity: parseInt(quantity),
          price: parseFloat(price),
        };
      });

    console.log(`Seeding ${orders.length} orders...`);

    // Insert orders in batches
    const batchSize = 50;
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      const values = batch
        .map(
          (order) =>
            `(${order.order_id}, ${order.customer_id}, ${order.restaurant_id}, ${order.address_id}, '${order.order_status}', ${order.order_total}, '${order.payment_status}', '${order.created_at}')`
        )
        .join(",");

      await queryRunner.query(`
        INSERT INTO orders (order_id, customer_id, restaurant_id, address_id, order_status, order_total, payment_status, created_at)
        VALUES ${values}
      `);
    }

    console.log(`Seeding ${orderItems.length} order items...`);

    // Insert order items in batches
    for (let i = 0; i < orderItems.length; i += batchSize) {
      const batch = orderItems.slice(i, i + batchSize);
      const values = batch
        .map(
          (item) =>
            `(${item.order_item_id}, ${item.order_id}, ${item.item_id}, ${item.quantity}, ${item.price})`
        )
        .join(",");

      await queryRunner.query(`
        INSERT INTO order_items (order_item_id, order_id, item_id, quantity, price)
        VALUES ${values}
      `);
    }

    // Update sequences to continue from max ID
    await queryRunner.query(`
      SELECT setval('orders_order_id_seq', (SELECT MAX(order_id) FROM orders));
    `);
    await queryRunner.query(`
      SELECT setval('order_items_order_item_id_seq', (SELECT MAX(order_item_id) FROM order_items));
    `);

    console.log("Initial data seeded successfully!");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM order_items;`);
    await queryRunner.query(`DELETE FROM orders;`);
    await queryRunner.query(
      `ALTER SEQUENCE orders_order_id_seq RESTART WITH 1;`
    );
    await queryRunner.query(
      `ALTER SEQUENCE order_items_order_item_id_seq RESTART WITH 1;`
    );
  }
}
