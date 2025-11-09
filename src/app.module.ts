import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AppConfigModule } from "./config/config.module";
import { HttpModule } from "./common/http/http.module";
import { MetricsModule } from "./common/observability/metrics.module";
import { OrdersModule } from "./orders/orders.module";
import { CorrelationMiddleware } from "./common/middleware/correlation.middleware";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { Order } from "./orders/entities/order.entity";
import { OrderItem } from "./orders/entities/order-item.entity";
import { IdempotencyKey } from "./orders/entities/idempotency-key.entity";
import { OutboxEvent } from "./orders/entities/outbox-event.entity";

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.get("DB_DSN"),
        entities: [Order, OrderItem, IdempotencyKey, OutboxEvent],
        synchronize: false,
        logging: config.get("NODE_ENV") === "development",
      }),
    }),
    HttpModule,
    MetricsModule,
    OrdersModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes("*");
  }
}
