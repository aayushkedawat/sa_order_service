import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

@Entity("idempotency_keys")
export class IdempotencyKey {
  @PrimaryColumn({ type: "text", name: "idempotency_key" })
  idempotencyKey: string;

  @Column({ type: "text", name: "request_hash" })
  requestHash: string;

  @Column({ type: "jsonb", name: "response_body" })
  responseBody: any;

  @Column({ type: "int", name: "status_code" })
  statusCode: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
