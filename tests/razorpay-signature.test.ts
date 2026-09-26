import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidPaymentSignature, isValidWebhookSignature } from "@/lib/razorpay-signature";

const secret = "test_secret";

describe("Razorpay signatures", () => {
  it("accepts a correct checkout signature and rejects tampering", () => {
    const sig = createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
    expect(isValidPaymentSignature("order_1", "pay_1", sig, secret)).toBe(true);
    expect(isValidPaymentSignature("order_1", "pay_2", sig, secret)).toBe(false);
    expect(isValidPaymentSignature("order_1", "pay_1", sig, "other_secret")).toBe(false);
    expect(isValidPaymentSignature("order_1", "pay_1", "not-hex", secret)).toBe(false);
    expect(isValidPaymentSignature("order_1", "pay_1", undefined, secret)).toBe(false);
  });

  it("verifies webhook bodies byte-for-byte", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    expect(isValidWebhookSignature(body, sig, secret)).toBe(true);
    expect(isValidWebhookSignature(`${body} `, sig, secret)).toBe(false);
  });
});
