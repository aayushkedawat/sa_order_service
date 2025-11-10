import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { PinoLoggerService } from "../observability/logger.service";
import { MetricsService } from "../observability/metrics.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: PinoLoggerService,
    private readonly metrics: MetricsService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const { method, url, correlationId } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const latency = Date.now() - start;
          this.logger.log({
            type: "http_request",
            method,
            path: url,
            status: res.statusCode,
            latency_ms: latency,
            correlation_id: correlationId,
          });
          this.metrics.recordRequest(url, method, res.statusCode, latency);
        },
        error: (error) => {
          const latency = Date.now() - start;
          const status = error.status || 500;
          this.logger.error({
            type: "http_request",
            method,
            path: url,
            status,
            latency_ms: latency,
            correlation_id: correlationId,
            error: error.message,
            stack: error.stack,
          });
          this.metrics.recordRequest(url, method, status, latency);
        },
      })
    );
  }
}
