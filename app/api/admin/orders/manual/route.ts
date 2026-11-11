import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createManualOrderSchema } from "@/lib/validation";
import { demoMenu } from "@/lib/demo-menu";
import { KES_DELIVERY_FEE } from "@/lib/money";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createManualOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid manual order details.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const db = getSupabaseAdmin();

  // If Supabase is not configured (demo/local dev mode), create a local response
  if (!db) {
    const orderNumber = `AYOTD-MAN-${Date.now().toString().slice(-6)}`;
    return NextResponse.json({
      orderNumber,
      message: "Order recorded in demo mode. Connect Supabase for production persistence."
    });
  }

  // 1. Fetch menu items to verify prices and availability
  const itemIds = v.items.map((x: { menuItemId: string }) => x.menuItemId);
  const { data: menu, error: menuErr } = await db
    .from("menu_items")
    .select("id, name, price, is_available")
    .in("id", itemIds);

  let itemsToProcess = menu;
  // If not found in DB but matches demo data, fall back gracefully
  if (!itemsToProcess || itemsToProcess.length === 0) {
    itemsToProcess = demoMenu.filter((m) => itemIds.includes(m.id));
  }

  if (!itemsToProcess || itemsToProcess.length !== new Set(itemIds).size) {
    return NextResponse.json(
      { error: "One or more selected menu items could not be found." },
      { status: 400 }
    );
  }

  let subtotal = 0;
  const lines = v.items.map((i: { menuItemId: string; quantity: number }) => {
    const m = itemsToProcess!.find((x: { id: string }) => x.id === i.menuItemId);
    if (!m?.is_available) {
      throw new Error(`Meal "${m?.name || i.menuItemId}" is currently unavailable.`);
    }
    const unitPrice = Number(m.price);
    const lineTotal = unitPrice * i.quantity;
    subtotal += lineTotal;
    return {
      menu_item_id: m.id.startsWith("meal-") ? null : m.id,
      item_name: m.name,
      quantity: i.quantity,
      unit_price: unitPrice,
      subtotal: lineTotal
    };
  });

  const deliveryFee = v.fulfilmentType === "DELIVERY" ? KES_DELIVERY_FEE : 0;
  const totalAmount = subtotal + deliveryFee;

  try {
    // 2. Upsert customer record
    const { data: customer, error: custErr } = await db
      .from("customers")
      .upsert({ full_name: v.customerName, phone: v.phone }, { onConflict: "phone" })
      .select("id")
      .single();

    if (custErr || !customer) {
      throw new Error("Could not record customer information.");
    }

    const orderNumber = `AYOTD-${Date.now().toString().slice(-8)}`;

    // 3. Create order
    const { data: order, error: orderErr } = await db
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customer.id,
        source: v.source,
        status: "PENDING",
        fulfilment_type: v.fulfilmentType,
        delivery_address: v.fulfilmentType === "DELIVERY" ? v.address : null,
        instructions: v.instructions || null,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        payment_status: "PENDING"
      })
      .select("id, order_number")
      .single();

    if (orderErr || !order) {
      throw new Error(orderErr?.message || "Failed to create order.");
    }

    // 4. Insert order items
    await db.from("order_items").insert(
      lines.map((line) => ({
        ...line,
        order_id: order.id
      }))
    );

    // 5. Initial status history record
    await db.from("order_status_history").insert({
      order_id: order.id,
      old_status: null,
      new_status: "PENDING",
      note: `Manual order created via ${v.source.replace("_", " ")}`
    });

    // 6. Record payment attempt / record
    await db.from("payments").insert({
      order_id: order.id,
      method: v.paymentMethod,
      amount: totalAmount,
      status: "PENDING"
    });

    // 7. If delivery, create delivery record
    if (v.fulfilmentType === "DELIVERY") {
      await db.from("deliveries").insert({
        order_id: order.id,
        status: "UNASSIGNED"
      });
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      orderId: order.id,
      totalAmount
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record manual order." },
      { status: 500 }
    );
  }
}
