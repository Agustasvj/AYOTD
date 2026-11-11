import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const confirmCashSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
  orderId: z.string().uuid("Invalid order ID"),
  staffName: z.string().optional()
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = confirmCashSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payment confirmation request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { paymentId, orderId, staffName } = parsed.data;
  const db = getSupabaseAdmin();

  if (!db) {
    return NextResponse.json({
      success: true,
      message: "Cash payment confirmed (demo mode)"
    });
  }

  try {
    const now = new Date().toISOString();

    // 1. Update payment record
    const { error: payErr } = await db
      .from("payments")
      .update({
        status: "PAID",
        paid_at: now,
        transaction_reference: `CASH-${Date.now().toString().slice(-6)}`
      })
      .eq("id", paymentId);

    if (payErr) {
      throw new Error(payErr.message);
    }

    // 2. Update order payment status
    await db
      .from("orders")
      .update({ payment_status: "PAID" })
      .eq("id", orderId);

    // 3. Log event
    await db.from("payment_events").insert({
      payment_id: paymentId,
      event_type: "CASH_CONFIRMED_BY_STAFF",
      payload: {
        confirmedAt: now,
        confirmedBy: staffName || "Staff Member"
      }
    });

    return NextResponse.json({
      success: true,
      message: "Cash payment received and reconciled successfully."
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to confirm cash payment." },
      { status: 500 }
    );
  }
}

