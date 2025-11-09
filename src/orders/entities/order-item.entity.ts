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
@Index(["orderId"])
@Check('"quantity" <= 5')
export class OrderItem {
  @PrimaryGeneratedColumn("uuid")
  orderItemId: string;

  @Column({ type: "uuid" })
  orderId: string;

  @Column({ type: "uuid" })
  itemId: string;

  @Column({ type: "varchar", length: 255 })
  itemName: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  lineTotal: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "orderId" })
  order: Order;
}
