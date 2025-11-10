import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("outbox_events")
@Index(["published", "createdAt"])
export class OutboxEvent {
  @PrimaryGeneratedColumn("uuid", { name: "event_id" })
  eventId: string;

  @Column({ type: "varchar", length: 50, name: "aggregate_type" })
  aggregateType: string;

  @Column({ type: "int", name: "aggregate_id" })
  aggregateId: number;

  @Column({ type: "varchar", length: 100, name: "event_type" })
  eventType: string;

  @Column({ type: "jsonb" })
  payload: any;

  @Column({ type: "boolean", default: false })
  published: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
