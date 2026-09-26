import "server-only";
import { isValidPaymentSignature, isValidWebhookSignature } from "./razorpay-signature";

const API = "https://api.razorpay.com/v1";

export function razorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay keys are not configured");
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

async function razorpayPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) {
    throw new Error(`Razorpay ${path} failed (${res.status}): ${data.error?.description ?? "unknown error"}`);
  }
  return data;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

export function createOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
  return razorpayPost<RazorpayOrder>("/orders", { amount: amountPaise, currency: "INR", receipt, notes });
}

export type RazorpayRefund = { id: string; amount: number; status: "pending" | "processed" | "failed" };

export function refundPayment(paymentId: string, notes: Record<string, string>) {
  // Full refund at normal speed (no extra Razorpay fee).
  return razorpayPost<RazorpayRefund>(`/payments/${encodeURIComponent(paymentId)}/refund`, { speed: "normal", notes });
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: unknown) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(secret) && isValidPaymentSignature(orderId, paymentId, signature, secret as string);
}

export function verifyWebhookSignature(rawBody: string, signature: unknown) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  return Boolean(secret) && isValidWebhookSignature(rawBody, signature, secret as string);
}
