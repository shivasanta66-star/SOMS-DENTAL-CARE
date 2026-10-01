// Razorpay REST API (no SDK dependency). RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
// are Netlify environment variables; rzp_test_... keys run in test mode.
import { isValidPaymentSignature, isValidWebhookSignature } from "./razorpay-signature";

const API = "https://api.razorpay.com/v1";

export function razorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function razorpayMode(): "live" | "test" | "not_configured" {
  if (!isRazorpayConfigured()) return "not_configured";
  return razorpayKeyId().startsWith("rzp_live_") ? "live" : "test";
}

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay keys are not configured");
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

async function razorpayRequest<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: authHeader(), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) {
    throw new Error(`Razorpay ${method} ${path} failed (${res.status}): ${data.error?.description ?? "unknown error"}`);
  }
  return data;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

export function createOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
  return razorpayRequest<RazorpayOrder>("POST", "/orders", { amount: amountPaise, currency: "INR", receipt, notes });
}

export type RazorpayPayment = { id: string; order_id: string; status: "created" | "authorized" | "captured" | "refunded" | "failed" };

export async function fetchOrderPayments(orderId: string) {
  const data = await razorpayRequest<{ items?: RazorpayPayment[] }>("GET", `/orders/${encodeURIComponent(orderId)}/payments`);
  return data.items ?? [];
}

export type RazorpayRefund = { id: string; amount: number; status: "pending" | "processed" | "failed" };

export function refundPayment(paymentId: string, notes: Record<string, string>) {
  // Full refund at normal speed (no extra Razorpay fee).
  return razorpayRequest<RazorpayRefund>("POST", `/payments/${encodeURIComponent(paymentId)}/refund`, { speed: "normal", notes });
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: unknown) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(secret) && isValidPaymentSignature(orderId, paymentId, signature, secret as string);
}

export function isWebhookConfigured() {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
}

export function verifyWebhookSignature(rawBody: string, signature: unknown) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  return Boolean(secret) && isValidWebhookSignature(rawBody, signature, secret as string);
}
