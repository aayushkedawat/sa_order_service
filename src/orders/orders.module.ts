import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { IdempotencyKey } from "./entities/idempotency-key.entity";
import { OutboxEvent } from "./entities/outbox-event.entity";
import { MetricsModule } from "../common/observability/metrics.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, IdempotencyKey, OutboxEvent]),
    MetricsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
