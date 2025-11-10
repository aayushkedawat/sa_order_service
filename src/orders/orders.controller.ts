import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiExcludeEndpoint,
} from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { BusinessException } from "../common/util/errors";

@ApiTags("orders")
@Controller("v1/orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("health")
  @ApiOperation({ summary: "Health check" })
  health() {
    return { status: "ok" };
  }

  @Get()
  @ApiOperation({ summary: "List orders with cursor pagination" })
  async findAll(
    @Query("customerId") customerId?: string,
    @Query("restaurantId") restaurantId?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: number,
    @Query("cursor") cursor?: string
  ) {
    return this.ordersService.findAll(
      customerId ? parseInt(customerId) : undefined,
      restaurantId ? parseInt(restaurantId) : undefined,
      status,
      limit,
      cursor
    );
  }

  @Get(":orderId")
  @ApiOperation({ summary: "Get order by ID" })
  async findOne(@Param("orderId") orderId: string) {
    return this.ordersService.findOne(parseInt(orderId));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create new order" })
  @ApiResponse({ status: 201, description: "Order created" })
  @ApiResponse({ status: 400, description: "Missing Idempotency-Key header" })
  @ApiResponse({
    status: 409,
    description:
      "Business conflict (idempotency mismatch, total mismatch, payment failed, etc.)",
  })
  @ApiResponse({
    status: 422,
    description:
      "Unprocessable entity (restaurant closed, item unavailable, etc.)",
  })
  async create(
    @Body() dto: CreateOrderDto,
    @Headers("idempotency-key") idempotencyKey: string
  ) {
    if (!idempotencyKey) {
      throw new BusinessException(
        "MISSING_IDEMPOTENCY_KEY",
        "Idempotency-Key header required",
        HttpStatus.BAD_REQUEST
      );
    }

    const result = await this.ordersService.createOrder(dto, idempotencyKey);
    return result.body;
  }

  @Delete(":orderId")
  @ApiOperation({ summary: "Cancel order" })
  async cancel(@Param("orderId") orderId: string) {
    return this.ordersService.cancelOrder(parseInt(orderId));
  }
}
