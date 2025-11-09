import { Injectable } from "@nestjs/common";
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

@Injectable()
export class MetricsService {
  public readonly registry: Registry;
  private httpRequestsTotal: Counter;
  private httpRequestDuration: Histogram;
  private ordersPlacedTotal: Counter;
  private paymentsFailedTotal: Counter;
  private deliveryAssignmentLatency: Histogram;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestsTotal = new Counter({
      name: "http_requests_total",
      help: "Total HTTP requests",
      labelNames: ["path", "method", "status"],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: "http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["path", "method"],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.ordersPlacedTotal = new Counter({
      name: "orders_placed_total",
      help: "Total orders placed",
      registers: [this.registry],
    });

    this.paymentsFailedTotal = new Counter({
      name: "payments_failed_total",
      help: "Total payment failures",
      registers: [this.registry],
    });

    this.deliveryAssignmentLatency = new Histogram({
      name: "delivery_assignment_latency_ms",
      help: "Delivery assignment latency in milliseconds",
      buckets: [100, 250, 500, 1000, 2500, 5000],
      registers: [this.registry],
    });
  }

  recordRequest(
    path: string,
    method: string,
    status: number,
    duration: number
  ) {
    this.httpRequestsTotal.inc({ path, method, status });
    this.httpRequestDuration.observe({ path, method }, duration / 1000);
  }

  incrementOrdersPlaced() {
    this.ordersPlacedTotal.inc();
  }

  incrementPaymentsFailed() {
    this.paymentsFailedTotal.inc();
  }

  observeDeliveryLatency(latencyMs: number) {
    this.deliveryAssignmentLatency.observe(latencyMs);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
