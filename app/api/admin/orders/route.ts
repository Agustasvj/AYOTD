import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const search = url.searchParams.get("search")?.trim();
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);

  const db = getSupabaseAdmin();
  if (!db) {
    // Return sample rich orders for demo view
    return NextResponse.json({
      orders: [
        {
          id: "order-demo-1",
          order_number: "AYOTD-98124011",
          source: "WHATSAPP_GROUP",
          status: "PENDING",
          fulfilment_type: "DELIVERY",
          delivery_address: "Hall 4, 3rd Floor, Room 314",
          total_amount: 550,
          payment_status: "PENDING",
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          customer: { full_name: "Kevin Otieno", phone: "0712345678" },
          items: [
            { item_name: "Coastal Chicken Pilau", quantity: 2, unit_price: 250, subtotal: 500 }
          ]
        },
        {
          id: "order-demo-2",
          order_number: "AYOTD-98123990",
          source: "WEBSITE",
          status: "PREPARING",
          fulfilment_type: "DELIVERY",
          delivery_address: "Science Complex, Lab 2",
          total_amount: 330,
          payment_status: "PAID",
          created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          customer: { full_name: "Mercy Wanjiku", phone: "0723456789" },
          items: [
            { item_name: "Beef Stew & Rice", quantity: 1, unit_price: 280, subtotal: 280 }
          ]
        },
        {
          id: "order-demo-3",
          order_number: "AYOTD-98123880",
          source: "PHONE_CALL",
          status: "READY",
          fulfilment_type: "PICKUP",
          delivery_address: null,
          total_amount: 150,
          payment_status: "PAID",
          created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          customer: { full_name: "David Kimani", phone: "0734567890" },
          items: [
            { item_name: "Chapati & Beans", quantity: 1, unit_price: 150, subtotal: 150 }
          ]
        }
      ]
    });
  }

  try {
    let query = db
      .from("orders")
      .select(`
        id,
        order_number,
        source,
        status,
        fulfilment_type,
        delivery_address,
        instructions,
        subtotal,
        delivery_fee,
        total_amount,
        payment_status,
        created_at,
        customers(id, full_name, phone),
        order_items(id, item_name, quantity, unit_price, subtotal),
        deliveries(id, status, rider_id, profiles(full_name)),
        payments(id, method, amount, status, transaction_reference)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }
    if (source && source !== "ALL") {
      query = query.eq("source", source);
    }
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,delivery_address.ilike.%${search}%`);
    }

    const { data: orders, error } = await query;
    if (error) throw new Error(error.message);

    const formatted = (orders || []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      source: o.source,
      status: o.status,
      fulfilment_type: o.fulfilment_type,
      delivery_address: o.delivery_address,
      instructions: o.instructions,
      subtotal: Number(o.subtotal),
      delivery_fee: Number(o.delivery_fee),
      total_amount: Number(o.total_amount),
      payment_status: o.payment_status,
      created_at: o.created_at,
      customer: o.customers,
      items: o.order_items,
      delivery: o.deliveries?.[0] || null,
      payments: o.payments || []
    }));

    return NextResponse.json({ orders: formatted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load orders." },
      { status: 500 }
    );
  }
}

