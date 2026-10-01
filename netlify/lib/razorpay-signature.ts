import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqualHex(expectedHex: string, receivedHex: unknown) {
  if (typeof receivedHex !== "string" || !/^[0-9a-f]+$/i.test(receivedHex)) return false;
  const a = Buffer.from(expectedHex, "hex");
  const b = Buffer.from(receivedHex, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Checkout success handler: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function isValidPaymentSignature(orderId: string, paymentId: string, signature: unknown, keySecret: string) {
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhooks: HMAC_SHA256(raw request body, webhook_secret) in X-Razorpay-Signature. */
export function isValidWebhookSignature(rawBody: string, signature: unknown, webhookSecret: string) {
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
