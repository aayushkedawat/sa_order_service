import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

interface CircuitState {
  failures: number;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  nextAttempt: number;
}

@Injectable()
export class HttpService {
  private readonly logger = new Logger(HttpService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly circuitFailures: number;
  private readonly circuitResetMs: number;
  private circuits: Map<string, CircuitState> = new Map();

  constructor(private configService: ConfigService) {
    this.timeout = parseInt(
      this.configService.get("HTTP_TIMEOUT_MS", "2500"),
      10
    );
    this.retries = parseInt(this.configService.get("HTTP_RETRIES", "2"), 10);
    this.circuitFailures = parseInt(
      this.configService.get("CIRCUIT_FAILURES", "5"),
      10
    );
    this.circuitResetMs = parseInt(
      this.configService.get("CIRCUIT_RESET_MS", "20000"),
      10
    );

    this.axiosInstance = axios.create({
      timeout: this.timeout,
    });
  }

  private getCircuit(host: string): CircuitState {
    if (!this.circuits.has(host)) {
      this.circuits.set(host, { failures: 0, state: "CLOSED", nextAttempt: 0 });
    }
    return this.circuits.get(host)!;
  }

  private checkCircuit(host: string): void {
    const circuit = this.getCircuit(host);
    const now = Date.now();

    if (circuit.state === "OPEN") {
      if (now >= circuit.nextAttempt) {
        circuit.state = "HALF_OPEN";
        this.logger.log(`Circuit HALF_OPEN for ${host}`);
      } else {
        throw new Error(`Circuit breaker OPEN for ${host}`);
      }
    }
  }

  private recordSuccess(host: string): void {
    const circuit = this.getCircuit(host);
    circuit.failures = 0;
    circuit.state = "CLOSED";
  }

  private recordFailure(host: string): void {
    const circuit = this.getCircuit(host);
    circuit.failures++;

    if (circuit.failures >= this.circuitFailures) {
      circuit.state = "OPEN";
      circuit.nextAttempt = Date.now() + this.circuitResetMs;
      this.logger.warn(
        `Circuit OPEN for ${host} after ${circuit.failures} failures`
      );
    }
  }

  private async retryWithJitter<T>(
    fn: () => Promise<T>,
    attempts: number
  ): Promise<T> {
    for (let i = 0; i <= attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === attempts) throw error;
        const jitter = Math.random() * 200 + 100; // 100-300ms
        await new Promise((resolve) => setTimeout(resolve, jitter));
      }
    }
    throw new Error("Retry exhausted");
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const host = new URL(url).host;
    this.checkCircuit(host);

    try {
      const response: any = await this.retryWithJitter(
        () => this.axiosInstance.get<T>(url, config),
        this.retries
      );
      this.recordSuccess(host);
      return response.data;
    } catch (error) {
      this.recordFailure(host);
      throw error;
    }
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const host = new URL(url).host;
    this.checkCircuit(host);

    try {
      const response: any = await this.retryWithJitter(
        () => this.axiosInstance.post<T>(url, data, config),
        this.retries
      );
      this.recordSuccess(host);
      return response.data;
    } catch (error) {
      this.recordFailure(host);
      throw error;
    }
  }
}
