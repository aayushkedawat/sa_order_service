import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

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
            method,
            path: url,
            status: res.statusCode,
            latency,
            correlationId,
          });
        },
        error: (error) => {
          const latency = Date.now() - start;
          this.logger.error({
            method,
            path: url,
            status: error.status || 500,
            latency,
            correlationId,
            error: error.message,
          });
        },
      })
    );
  }
}
