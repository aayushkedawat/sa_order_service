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
  @PrimaryGeneratedColumn("uuid")
  eventId: string;

  @Column({ type: "varchar", length: 50 })
  aggregateType: string;

  @Column({ type: "uuid" })
  aggregateId: string;

  @Column({ type: "varchar", length: 100 })
  eventType: string;

  @Column({ type: "jsonb" })
  payload: any;

  @Column({ type: "boolean", default: false })
  published: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
