import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

@Entity("idempotency_keys")
export class IdempotencyKey {
  @PrimaryColumn({ type: "text" })
  idempotencyKey: string;

  @Column({ type: "text" })
  requestHash: string;

  @Column({ type: "jsonb" })
  responseBody: any;

  @Column({ type: "int" })
  statusCode: number;

  @CreateDateColumn()
  createdAt: Date;
}
