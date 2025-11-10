import { Module, Global } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import { MetricsController } from "./metrics.controller";
import { PinoLoggerService } from "./logger.service";

@Global()
@Module({
  providers: [MetricsService, PinoLoggerService],
  controllers: [MetricsController],
  exports: [MetricsService, PinoLoggerService],
})
export class MetricsModule {}
