import { Injectable, LoggerService } from "@nestjs/common";
import pino from "pino";

@Injectable()
export class PinoLoggerService implements LoggerService {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || "info",
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      ...(process.env.NODE_ENV === "development"
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
              },
            },
          }
        : {}),
    });
  }

  log(message: any, context?: string) {
    if (typeof message === "object") {
      this.logger.info({ ...message, context });
    } else {
      this.logger.info({ message, context });
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (typeof message === "object") {
      this.logger.error({ ...message, trace, context });
    } else {
      this.logger.error({ message, trace, context });
    }
  }

  warn(message: any, context?: string) {
    if (typeof message === "object") {
      this.logger.warn({ ...message, context });
    } else {
      this.logger.warn({ message, context });
    }
  }

  debug(message: any, context?: string) {
    if (typeof message === "object") {
      this.logger.debug({ ...message, context });
    } else {
      this.logger.debug({ message, context });
    }
  }

  verbose(message: any, context?: string) {
    if (typeof message === "object") {
      this.logger.trace({ ...message, context });
    } else {
      this.logger.trace({ message, context });
    }
  }

  getLogger() {
    return this.logger;
  }
}
