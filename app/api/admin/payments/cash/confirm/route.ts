import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const confirmCashSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  paymentId: z.string().optional(),
  staffName: z.string().optional(),
  markCompleted: z.boolean().optional().default(false)
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

  const { orderId, paymentId, staffName, markCompleted } = parsed.data;
  const db = getSupabaseAdmin();

  if (!db) {
    return NextResponse.json({
      success: true,
      message: markCompleted
        ? "Cash confirmed and order completed (demo mode)."
        : "Cash payment confirmed (demo mode)."
    });
  }

  try {
    const now = new Date().toISOString();
    const cashierOrRunner = staffName || "Campus Runner";

    // 1. Fetch current order to get total and status
    const { data: orderData, error: orderFetchErr } = await db
      .from("orders")
      .select("id, status, total_amount, payment_status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderFetchErr) {
      console.warn("Could not fetch order, proceeding with update:", orderFetchErr.message);
    }

    const totalAmount = Number(orderData?.total_amount) || 0;
    const oldStatus = orderData?.status || "OUT_FOR_DELIVERY";

    // 2. Find or Create payment record
    let targetPaymentId = paymentId;

    if (!targetPaymentId) {
      const { data: existingPayment } = await db
        .from("payments")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (existingPayment?.id) {
        targetPaymentId = existingPayment.id;
      }
    }

    if (targetPaymentId) {
      await db
        .from("payments")
        .update({
          method: "CASH",
          status: "PAID",
          paid_at: now,
          transaction_reference: `CASH-${Date.now().toString().slice(-6)}`
        })
        .eq("id", targetPaymentId);
    } else {
      // Create new payment record
      const { data: newPay } = await db
        .from("payments")
        .insert({
          order_id: orderId,
          method: "CASH",
          amount: totalAmount > 0 ? totalAmount : 100,
          status: "PAID",
          paid_at: now,
          transaction_reference: `CASH-${Date.now().toString().slice(-6)}`
        })
        .select("id")
        .maybeSingle();

      if (newPay?.id) {
        targetPaymentId = newPay.id;
      }
    }

    // 3. Update order record (payment status, and optionally order completion)
    const orderUpdates: Record<string, any> = {
      payment_status: "PAID",
      updated_at: now
    };

    if (markCompleted) {
      orderUpdates.status = "COMPLETED";
      orderUpdates.completed_at = now;
    }

    await db.from("orders").update(orderUpdates).eq("id", orderId);

    // 4. If markCompleted, also update deliveries table
    if (markCompleted) {
      await db
        .from("deliveries")
        .update({
          status: "DELIVERED",
          delivered_at: now
        })
        .eq("order_id", orderId);

      // Log status history transition
      await db.from("order_status_history").insert({
        order_id: orderId,
        old_status: oldStatus,
        new_status: "COMPLETED",
        note: `Order completed & cash collected by ${cashierOrRunner}`
      });
    }

    // 5. Log payment event
    if (targetPaymentId) {
      await db.from("payment_events").insert({
        payment_id: targetPaymentId,
        event_type: "CASH_CONFIRMED_AT_DELIVERY",
        payload: {
          confirmedAt: now,
          confirmedBy: cashierOrRunner,
          orderMarkedCompleted: Boolean(markCompleted)
        }
      });
    }

    // 6. Activity log
    await db.from("activity_logs").insert({
      action: markCompleted ? "DELIVERY_COMPLETED_CASH" : "CASH_CONFIRMED",
      entity_type: "ORDER",
      entity_id: orderId,
      metadata: {
        confirmedBy: cashierOrRunner,
        amount: totalAmount
      }
    });

    return NextResponse.json({
      success: true,
      message: markCompleted
        ? "Cash payment confirmed and delivery completed successfully!"
        : "Cash payment received and reconciled successfully."
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to confirm cash payment." },
      { status: 500 }
    );
  }
}
