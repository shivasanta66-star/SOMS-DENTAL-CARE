import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import { isRazorpayConfigured, razorpayKeyId } from "@/lib/razorpay";
import { getConsultationFeePaise } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [services, feePaise] = await Promise.all([
      query<{ id: number; name: string }>("SELECT id, name FROM services WHERE is_active ORDER BY display_order, id"),
      getConsultationFeePaise(),
    ]);
    return NextResponse.json({
      services: services.rows,
      feePaise,
      razorpayKeyId: razorpayKeyId(),
      paymentsEnabled: isRazorpayConfigured(),
    });
  } catch (err) {
    console.error("booking config failed", err);
    return jsonError(503, "Online booking is temporarily unavailable.");
  }
}
