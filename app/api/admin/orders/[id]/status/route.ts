import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { updateOrderStatusSchema } from "@/lib/validation";
import { dispatchOrderStatusNotification } from "@/lib/notifications";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = updateOrderStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid status update data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status, note, cancellationReason } = parsed.data;
  const db = getSupabaseAdmin();

  if (!db) {
    return NextResponse.json({
      success: true,
      message: `Status updated to ${status} (demo mode)`
    });
  }

  try {
    // 1. Get current order details
    const { data: order, error: orderErr } = await db
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total_amount,
        fulfilment_type,
        delivery_address,
        customers(full_name, phone)
      `)
      .eq("id", id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const oldStatus = order.status;

    // 2. Update order status
    const updateData: any = {
      status,
      cancellation_reason: status === "CANCELLED" ? cancellationReason || note : null
    };
    if (status === "COMPLETED") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateErr } = await db
      .from("orders")
      .update(updateData)
      .eq("id", id);

    if (updateErr) {
      throw new Error(updateErr.message);
    }

    // 3. Record in order_status_history
    await db.from("order_status_history").insert({
      order_id: id,
      old_status: oldStatus,
      new_status: status,
      note: note || `Status changed from ${oldStatus} to ${status}`
    });

    // 4. If delivery order, sync delivery record status
    if (order.fulfilment_type === "DELIVERY") {
      if (status === "OUT_FOR_DELIVERY") {
        await db
          .from("deliveries")
          .update({ status: "IN_TRANSIT", picked_up_at: new Date().toISOString() })
          .eq("order_id", id);
      } else if (status === "COMPLETED") {
        await db
          .from("deliveries")
          .update({ status: "DELIVERED", delivered_at: new Date().toISOString() })
          .eq("order_id", id);
      } else if (status === "DELIVERY_FAILED") {
        await db
          .from("deliveries")
          .update({ status: "FAILED", failure_reason: note || "Delivery unsuccessful" })
          .eq("order_id", id);
      }
    }

    // 5. Send automated customer WhatsApp update
    const customer = (order as any).customers;
    if (customer?.phone) {
      dispatchOrderStatusNotification({
        orderNumber: order.order_number,
        customerName: customer.full_name,
        customerPhone: customer.phone,
        status,
        totalAmount: Number(order.total_amount),
        fulfilmentType: order.fulfilment_type,
        deliveryAddress: order.delivery_address,
        appUrl: process.env.NEXT_PUBLIC_APP_URL
      }).catch((e) => console.error("Notification trigger error:", e));
    }

    return NextResponse.json({
      success: true,
      orderId: id,
      previousStatus: oldStatus,
      newStatus: status
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update order status." },
      { status: 500 }
    );
  }
}

