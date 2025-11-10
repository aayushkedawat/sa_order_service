import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from "typeorm";
import { Order } from "./order.entity";

@Entity("order_items")
@Index(["order_id"])
@Index(["item_id"])
@Check('"quantity" >= 1 AND "quantity" <= 5')
export class OrderItem {
  @PrimaryGeneratedColumn()
  order_item_id: number;

  @Column({ type: "int" })
  order_id: number;

  @Column({ type: "int" })
  item_id: number;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  price: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;
}
