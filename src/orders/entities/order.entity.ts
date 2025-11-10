import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { OrderItem } from "./order-item.entity";

export enum OrderStatus {
  CREATED = "CREATED",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  DISPATCHED = "DISPATCHED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

@Entity("orders")
@Index(["customer_id"])
@Index(["restaurant_id"])
@Index(["order_status"])
@Index(["created_at"])
export class Order {
  @PrimaryGeneratedColumn()
  order_id: number;

  @Column({ type: "text" })
  customer_id: string;

  @Column({ type: "int" })
  restaurant_id: number;

  @Column({ type: "text" })
  address_id: string;

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.CREATED,
  })
  order_status: OrderStatus;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  order_total: number;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status: PaymentStatus;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  created_at: Date;
}
