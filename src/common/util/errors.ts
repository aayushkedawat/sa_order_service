import { HttpException, HttpStatus } from "@nestjs/common";

export interface ErrorResponse {
  code: string;
  message: string;
  correlationId?: string;
  details?: any;
}

export function makeError(
  code: string,
  message: string,
  details?: any,
  correlationId?: string
): ErrorResponse {
  return {
    code,
    message,
    ...(correlationId && { correlationId }),
    ...(details && { details }),
  };
}

export class BusinessException extends HttpException {
  constructor(
    code: string,
    message: string,
    status: HttpStatus = HttpStatus.CONFLICT,
    details?: any
  ) {
    super(makeError(code, message, details), status);
  }
}
