import { z } from "zod";

export const configSchema = z.object({
  PORT: z.string().default("8080"),
  DB_DSN: z.string(),
  MENU_SVC: z.string().url(),
  CUST_SVC: z.string().url(),
  PAY_SVC: z.string().url(),
  DELIV_SVC: z.string().url(),
  DELIVERY_FEE: z.string().default("40.0"),
  HTTP_TIMEOUT_MS: z.string().default("2500"),
  HTTP_RETRIES: z.string().default("2"),
  CIRCUIT_FAILURES: z.string().default("5"),
  CIRCUIT_RESET_MS: z.string().default("20000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type AppConfig = z.infer<typeof configSchema>;
