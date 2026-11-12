import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { assignRiderSchema } from "@/lib/validation";
import { invalidatePrefix } from "@/lib/fast-cache";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = assignRiderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid rider assignment details", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { riderId } = parsed.data;
  const db = getSupabaseAdmin();

  if (!db) {
    return NextResponse.json({
      success: true,
      message: "Rider assigned (demo mode)"
    });
  }

  try {
    // 1. Verify order exists and is a delivery order
    const { data: order, error: orderErr } = await db
      .from("orders")
      .select("id, fulfilment_type, status")
      .eq("id", id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.fulfilment_type !== "DELIVERY") {
      return NextResponse.json(
        { error: "Cannot assign a rider to a pickup/collection order" },
        { status: 400 }
      );
    }

    // 2. Check rider exists
    const { data: rider, error: riderErr } = await db
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", riderId)
      .single();

    if (riderErr || !rider) {
      return NextResponse.json({ error: "Rider profile not found" }, { status: 404 });
    }

    // 3. Upsert into deliveries table
    const { data: delivery, error: delErr } = await db
      .from("deliveries")
      .upsert(
        {
          order_id: id,
          rider_id: riderId,
          status: "ASSIGNED",
          assigned_at: new Date().toISOString()
        },
        { onConflict: "order_id" }
      )
      .select("id")
      .single();

    if (delErr) {
      throw new Error(delErr.message);
    }

    // 4. Log delivery event
    await db.from("delivery_events").insert({
      delivery_id: delivery.id,
      status: "ASSIGNED",
      note: `Delivery assigned to rider ${rider.full_name}`
    });

    // Invalidate cached order lists so assigned rider shows immediately
    invalidatePrefix("orders:");

    return NextResponse.json({
      success: true,
      orderId: id,
      riderName: rider.full_name
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to assign rider." },
      { status: 500 }
    );
  }
}

