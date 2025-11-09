import { createHash } from "crypto";

export function hashRequest(body: any): string {
  const canonical = JSON.stringify(body, Object.keys(body).sort());
  return createHash("sha256").update(canonical).digest("hex");
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Derive a unique idempotency key for downstream service calls
 * This ensures each service operation has its own idempotency scope
 *
 * @param baseKey - The original idempotency key from the client
 * @param scope - The operation scope (e.g., 'payment', 'delivery')
 * @returns A derived idempotency key unique to this scope
 *
 * @example
 * const clientKey = "550e8400-e29b-41d4-a716-446655440000";
 * const paymentKey = deriveIdempotencyKey(clientKey, "payment");
 * const deliveryKey = deriveIdempotencyKey(clientKey, "delivery");
 * // paymentKey !== deliveryKey !== clientKey
 */
export function deriveIdempotencyKey(baseKey: string, scope: string): string {
  return createHash("sha256")
    .update(`${baseKey}:${scope}`)
    .digest("hex")
    .substring(0, 36); // Keep it UUID-like length
}
