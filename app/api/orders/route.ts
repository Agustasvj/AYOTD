import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createOrderSchema } from "@/lib/validation";
import { demoMenu } from "@/lib/demo-menu";
import { KES_DELIVERY_FEE } from "@/lib/money";
import { dispatchOrderStatusNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const parsed = createOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your order details.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const db = getSupabaseAdmin();

  // If Supabase is not configured, generate a simulated order response
  if (!db) {
    const orderNumber = `AYOTD-${Date.now().toString().slice(-8)}`;
    const lineTotal = input.items.reduce((acc, it) => {
      const match = demoMenu.find((m) => m.id === it.menuItemId);
      return acc + (match ? match.price * it.quantity : 200 * it.quantity);
    }, 0);
    const fee = input.fulfilmentType === "DELIVERY" ? KES_DELIVERY_FEE : 0;
    const grandTotal = lineTotal + fee;

    return NextResponse.json({
      orderNumber,
      orderId: "demo-" + orderNumber,
      total: grandTotal,
      message: "Order placed in demo mode. Configure Supabase for live storage."
    });
  }

  const ids = input.items.map((i) => i.menuItemId);
  const { data: menu, error: menuError } = await db
    .from("menu_items")
    .select("id, name, price, is_available")
    .in("id", ids);

  let verifiedMenu = menu;
  if (!verifiedMenu || verifiedMenu.length === 0) {
    // Check if matching demo IDs
    verifiedMenu = demoMenu.filter((m) => ids.includes(m.id));
  }

  if (!verifiedMenu || verifiedMenu.length !== new Set(ids).size) {
    return NextResponse.json(
      { error: "One or more selected menu items could not be found." },
      { status: 400 }
    );
  }

  const lookup = new Map(verifiedMenu.map((m) => [m.id, m]));
  let subtotal = 0;

  const lines = input.items.map((i) => {
    const m = lookup.get(i.menuItemId);
    if (!m || !m.is_available) {
      throw new Error(`The meal "${m?.name || i.menuItemId}" is currently unavailable.`);
    }
    const price = Number(m.price);
    const lineTotal = price * i.quantity;
    subtotal += lineTotal;
    return {
      menu_item_id: m.id.startsWith("meal-") ? null : m.id,
      item_name: m.name,
      quantity: i.quantity,
      unit_price: price,
      subtotal: lineTotal
    };
  });

  const deliveryFee = input.fulfilmentType === "DELIVERY" ? KES_DELIVERY_FEE : 0;
  const grandTotal = subtotal + deliveryFee;

  try {
    // 1. Upsert customer
    const { data: customer, error: customerError } = await db
      .from("customers")
      .upsert(
        { full_name: input.customerName, phone: input.phone },
        { onConflict: "phone" }
      )
      .select("id")
      .single();

    if (customerError || !customer) {
      throw new Error("Could not save customer details.");
    }

    const orderNumber = `AYOTD-${Date.now().toString().slice(-8)}`;

    // 2. Insert order
    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customer.id,
        source: "WEBSITE",
        status: "PENDING",
        fulfilment_type: input.fulfilmentType,
        delivery_address: input.fulfilmentType === "DELIVERY" ? input.address : null,
        instructions: input.instructions || null,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        total_amount: grandTotal,
        payment_status: "PENDING"
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message || "Could not create order.");
    }

    // 3. Insert order items
    const { error: linesError } = await db.from("order_items").insert(
      lines.map((x) => ({
        ...x,
        order_id: order.id
      }))
    );

    if (linesError) {
      await db.from("orders").delete().eq("id", order.id);
      throw new Error("Could not save order items.");
    }

    // 4. Initial status history
    await db.from("order_status_history").insert({
      order_id: order.id,
      old_status: null,
      new_status: "PENDING",
      note: "Order placed online via website guest checkout"
    });

    // 5. Payment record
    const { error: paymentError } = await db.from("payments").insert({
      order_id: order.id,
      method: input.paymentMethod,
      amount: grandTotal,
      status: "PENDING"
    });

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
    }

    // 6. Delivery record if delivery
    if (input.fulfilmentType === "DELIVERY") {
      await db.from("deliveries").insert({
        order_id: order.id,
        status: "UNASSIGNED"
      });
    }

    // Fire non-blocking WhatsApp alert if configured
    dispatchOrderStatusNotification({
      orderNumber: order.order_number,
      customerName: input.customerName,
      customerPhone: input.phone,
      status: "ACCEPTED",
      totalAmount: grandTotal,
      fulfilmentType: input.fulfilmentType,
      deliveryAddress: input.address,
      appUrl: process.env.NEXT_PUBLIC_APP_URL
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      orderId: order.id,
      total: grandTotal
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unable to create order." },
      { status: 400 }
    );
  }
}
