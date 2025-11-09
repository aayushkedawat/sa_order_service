import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { OrderItem } from "./order-item.entity";

export enum OrderStatus {
  CREATED = "CREATED",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  NA = "NA",
}

@Entity("orders")
@Index(["customerId"])
@Index(["createdAt"])
export class Order {
  @PrimaryGeneratedColumn("uuid")
  orderId: string;

  @Column({ type: "uuid" })
  customerId: string;

  @Column({ type: "uuid" })
  restaurantId: string;

  @Column({ type: "uuid" })
  addressId: string;

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.CREATED,
  })
  orderStatus: OrderStatus;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  subtotalAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  taxAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  deliveryFee: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  orderTotal: number;

  @Column({ type: "varchar", length: 3, default: "INR" })
  currency: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  restaurantName: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  restaurantCity: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  deliveryCity: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  paymentMethod: string;

  @Column({ type: "text", nullable: true })
  note: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
