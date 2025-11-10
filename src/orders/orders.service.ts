import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Order, OrderStatus, PaymentStatus } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { IdempotencyKey } from "./entities/idempotency-key.entity";
import { CreateOrderDto } from "./dto/create-order.dto";
import { HttpService } from "../common/http/http.service";
import { BusinessException } from "../common/util/errors";
import {
  hashRequest,
  round2,
  deriveIdempotencyKey,
} from "../common/util/idempotency";
import { MetricsService } from "../common/observability/metrics.service";
import { HttpStatus } from "@nestjs/common";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(IdempotencyKey)
    private idempotencyRepo: Repository<IdempotencyKey>,
    private dataSource: DataSource,
    private httpService: HttpService,
    private configService: ConfigService,
    private metricsService: MetricsService
  ) {}

  async createOrder(dto: CreateOrderDto, idempotencyKey: string): Promise<any> {
    const requestHash = hashRequest(dto);

    // Check idempotency
    const existing = await this.idempotencyRepo.findOne({
      where: { idempotencyKey },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new BusinessException(
          "IDEMPOTENCY_MISMATCH",
          "Request body differs from original"
        );
      }
      return { body: existing.responseBody, statusCode: existing.statusCode };
    }

    // Fetch restaurant
    const menuSvc = this.configService.get("MENU_SVC");
    const restaurant: any = await this.httpService.get(
      `${menuSvc}/restaurants/${dto.restaurantId}`
    );
    if (!restaurant.isOpen && !restaurant.is_open && !restaurant.open) {
      throw new BusinessException(
        "RESTAURANT_CLOSED",
        "Restaurant is not open",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    // Fetch menu items from restaurant menu
    const menuItems: any[] = await this.httpService.get(
      `${menuSvc}/restaurants/${dto.restaurantId}/menu`
    );
    const itemMap = new Map(
      menuItems.map((item: any) => [parseInt(item.id), item])
    );

    for (const reqItem of dto.items) {
      const menuItem: any = itemMap.get(reqItem.itemId);
      if (!menuItem) {
        throw new BusinessException(
          "ITEM_UNAVAILABLE",
          `Item ${reqItem.itemId} not available`,
          HttpStatus.UNPROCESSABLE_ENTITY
        );
      }
      // Check availability
      if (menuItem.available === false) {
        throw new BusinessException(
          "ITEM_UNAVAILABLE",
          `Item ${reqItem.itemId} not available`,
          HttpStatus.UNPROCESSABLE_ENTITY
        );
      }
    }

    // Fetch address
    const custSvc = this.configService.get("CUST_SVC");
    const address: any = await this.httpService.get(
      `${custSvc}/addresses/${dto.addressId}`
    );
    if (address.city !== restaurant.city) {
      throw new BusinessException(
        "CITY_MISMATCH",
        "Delivery city must match restaurant city"
      );
    }

    // Compute totals
    const subtotal = round2(
      dto.items.reduce((sum, item) => {
        const menuItem: any = itemMap.get(item.itemId);
        return sum + menuItem.price * item.quantity;
      }, 0)
    );
    const tax = round2(subtotal * 0.05);
    const deliveryFee = parseFloat(
      this.configService.get("DELIVERY_FEE", "40.0")
    );
    const total = round2(subtotal + tax + deliveryFee);

    if (
      round2(dto.clientTotals.subtotal) !== subtotal ||
      round2(dto.clientTotals.tax) !== tax ||
      round2(dto.clientTotals.deliveryFee) !== deliveryFee ||
      round2(dto.clientTotals.total) !== total
    ) {
      throw new BusinessException(
        "TOTAL_MISMATCH",
        "Client totals do not match server calculation"
      );
    }

    // Create order in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = this.orderRepo.create({
        customer_id: dto.customerId,
        restaurant_id: dto.restaurantId,
        address_id: dto.addressId,
        order_status: OrderStatus.CREATED,
        payment_status:
          dto.payment.method === "COD"
            ? PaymentStatus.PENDING
            : PaymentStatus.PENDING,
        order_total: total,
      } as any);

      const savedOrder = (await queryRunner.manager.save(
        order
      )) as unknown as Order;

      const items = dto.items.map((item) => {
        const menuItem: any = itemMap.get(item.itemId);
        return this.orderItemRepo.create({
          order_id: savedOrder.order_id,
          item_id: item.itemId,
          quantity: item.quantity,
          price: menuItem.price,
        } as any);
      });

      await queryRunner.manager.save(items);

      // Handle payment
      if (dto.payment.method !== "COD") {
        const paySvc = this.configService.get("PAY_SVC");
        try {
          // Derive unique idempotency key for payment service
          const paymentIdempotencyKey = deriveIdempotencyKey(
            idempotencyKey,
            "payment"
          );

          await this.httpService.post(
            `${paySvc}/payments/charge`,
            {
              orderId: savedOrder.order_id,
              amount: total,
              currency: "INR",
              method: dto.payment.method,
              reference: dto.payment.reference,
            },
            { headers: { "Idempotency-Key": paymentIdempotencyKey } }
          );

          savedOrder.payment_status = PaymentStatus.SUCCESS;
          savedOrder.order_status = OrderStatus.CONFIRMED;
          await queryRunner.manager.save(savedOrder);

          // Assign delivery
          const delivSvc = this.configService.get("DELIV_SVC");
          const delivStart = Date.now();

          // Derive unique idempotency key for delivery service
          const deliveryIdempotencyKey = deriveIdempotencyKey(
            idempotencyKey,
            "delivery"
          );

          await this.httpService.post(
            `${delivSvc}/deliveries/assign`,
            {
              orderId: savedOrder.order_id,
              restaurantId: dto.restaurantId,
              addressId: dto.addressId,
            },
            { headers: { "Idempotency-Key": deliveryIdempotencyKey } }
          );
          this.metricsService.observeDeliveryLatency(Date.now() - delivStart);
        } catch (error) {
          this.logger.error(`Payment failed: ${error.message}`);
          savedOrder.payment_status = PaymentStatus.FAILED;
          await queryRunner.manager.save(savedOrder);
          this.metricsService.incrementPaymentsFailed();
          await queryRunner.commitTransaction();

          const responseBody = {
            orderId: savedOrder.order_id,
            status: "PAYMENT_FAILED",
          };
          await this.idempotencyRepo.save({
            idempotencyKey,
            requestHash,
            responseBody,
            statusCode: HttpStatus.CONFLICT,
          });

          throw new BusinessException(
            "PAYMENT_FAILED",
            "Payment processing failed"
          );
        }
      }

      await queryRunner.commitTransaction();

      this.metricsService.incrementOrdersPlaced();

      const responseBody = {
        orderId: savedOrder.order_id,
        status: savedOrder.order_status,
        paymentStatus: savedOrder.payment_status,
        total: savedOrder.order_total,
      };

      await this.idempotencyRepo.save({
        idempotencyKey,
        requestHash,
        responseBody,
        statusCode: HttpStatus.CREATED,
      });

      return { body: responseBody, statusCode: HttpStatus.CREATED };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    customerId?: string,
    restaurantId?: number,
    status?: string,
    limit = 20,
    cursor?: string
  ) {
    const qb = this.orderRepo.createQueryBuilder("order");

    if (customerId)
      qb.andWhere("order.customer_id = :customerId", { customerId });
    if (restaurantId)
      qb.andWhere("order.restaurant_id = :restaurantId", { restaurantId });
    if (status) qb.andWhere("order.order_status = :status", { status });
    if (cursor)
      qb.andWhere("order.created_at < :cursor", { cursor: new Date(cursor) });

    qb.orderBy("order.created_at", "DESC").limit(limit);

    const orders = await qb.getMany();
    const nextCursor =
      orders.length === limit
        ? orders[orders.length - 1].created_at.toISOString()
        : null;

    return { orders, nextCursor };
  }

  async findOne(orderId: number) {
    const order = await this.orderRepo.findOne({
      where: { order_id: orderId },
      relations: ["items"],
    });

    if (!order) {
      throw new BusinessException(
        "ORDER_NOT_FOUND",
        "Order not found",
        HttpStatus.NOT_FOUND
      );
    }

    return order;
  }

  async cancelOrder(orderId: number) {
    const order = await this.findOne(orderId);

    if (order.order_status !== OrderStatus.CREATED) {
      throw new BusinessException(
        "CANNOT_CANCEL",
        "Can only cancel orders in CREATED status"
      );
    }

    order.order_status = OrderStatus.CANCELLED;
    await this.orderRepo.save(order);

    return { orderId, status: order.order_status };
  }
}
