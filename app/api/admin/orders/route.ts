import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  getFromCache,
  setToCache,
  shouldRevalidate,
  finishRevalidation
} from "@/lib/fast-cache";

function getFallbackOrders() {
  return [
    {
      id: "order-demo-1",
      order_number: "AYOTD-98124011",
      source: "WHATSAPP_GROUP",
      status: "READY",
      fulfilment_type: "DELIVERY",
      delivery_address: "Hall 4 (Moi), 3rd Floor, Room 314",
      instructions: "Call on arrival at hostel entrance",
      subtotal: 620,
      delivery_fee: 50,
      total_amount: 670,
      payment_status: "PAID",
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      customer: { full_name: "Kevin Otieno", phone: "0712345678" },
      items: [
        { item_name: "Coastal Chicken Pilau", quantity: 2, unit_price: 250, subtotal: 500 },
        { item_name: "Fresh Tropical Passion & Mango Blend", quantity: 1, unit_price: 120, subtotal: 120 }
      ],
      payments: [{ method: "MPESA", amount: 670, status: "PAID" }]
    },
    {
      id: "order-demo-2",
      order_number: "AYOTD-98124012",
      source: "WEBSITE",
      status: "OUT_FOR_DELIVERY",
      fulfilment_type: "DELIVERY",
      delivery_address: "Hall 2 (Block C), Room 204",
      instructions: "Knock on room 204; please provide change for 1000 if possible",
      subtotal: 500,
      delivery_fee: 50,
      total_amount: 550,
      payment_status: "PENDING",
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      customer: { full_name: "Mercy Wanjiku", phone: "0723456789" },
      items: [
        { item_name: "Swahili Chicken Biryani", quantity: 1, unit_price: 320, subtotal: 320 },
        { item_name: "AYOTD Sizzling Chips Masala", quantity: 1, unit_price: 180, subtotal: 180 }
      ],
      payments: [{ method: "CASH", amount: 550, status: "PENDING" }]
    },
    {
      id: "order-demo-3",
      order_number: "AYOTD-98124013",
      source: "WHATSAPP_DM",
      status: "OUT_FOR_DELIVERY",
      fulfilment_type: "DELIVERY",
      delivery_address: "Science Complex, Lecture Hall 3",
      instructions: "Hand over at corridor during 10-minute break",
      subtotal: 380,
      delivery_fee: 50,
      total_amount: 430,
      payment_status: "PAID",
      created_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      customer: { full_name: "David Kimani", phone: "0734567890" },
      items: [
        { item_name: "Slow-Braised Beef Stew & Fluffy Rice", quantity: 1, unit_price: 280, subtotal: 280 },
        { item_name: "Crispy Beef Samosas (Pair)", quantity: 1, unit_price: 100, subtotal: 100 }
      ],
      payments: [{ method: "MPESA", amount: 430, status: "PAID" }]
    },
    {
      id: "order-demo-4",
      order_number: "AYOTD-98124014",
      source: "WEBSITE",
      status: "READY",
      fulfilment_type: "DELIVERY",
      delivery_address: "Hall 6 (Ladies Hostel), 1st Floor, Room 112",
      instructions: "Call runner phone when nearby",
      subtotal: 250,
      delivery_fee: 50,
      total_amount: 300,
      payment_status: "PENDING",
      created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      customer: { full_name: "Sharon Chebet", phone: "0745678901" },
      items: [
        { item_name: "Double Chapati with Rich Yellow Beans", quantity: 1, unit_price: 150, subtotal: 150 },
        { item_name: "Chilled Hibiscus (Zobo) Iced Tea", quantity: 1, unit_price: 100, subtotal: 100 }
      ],
      payments: [{ method: "CASH", amount: 300, status: "PENDING" }]
    },
    {
      id: "order-demo-5",
      order_number: "AYOTD-98124015",
      source: "PHONE_CALL",
      status: "ACCEPTED",
      fulfilment_type: "DELIVERY",
      delivery_address: "Technology Block, Computer Lab 4B",
      instructions: "Leave with security desk if lab is locked",
      subtotal: 560,
      delivery_fee: 50,
      total_amount: 610,
      payment_status: "PAID",
      created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      customer: { full_name: "Brian Mwangi", phone: "0756789012" },
      items: [
        { item_name: "AYOTD Sizzling Chips Masala", quantity: 2, unit_price: 180, subtotal: 360 },
        { item_name: "Crispy Beef Samosas (Pair)", quantity: 2, unit_price: 100, subtotal: 200 }
      ],
      payments: [{ method: "MPESA", amount: 610, status: "PAID" }]
    }
  ];
}

async function fetchFreshOrders(
  status: string | null,
  source: string | null,
  search: string | undefined,
  limit: number
) {
  const db = getSupabaseAdmin();
  if (!db) return getFallbackOrders();

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
      deliveries(id, status, rider_id, picked_up_at, profiles(full_name)),
      payments(id, method, amount, status, transaction_reference)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "ALL") {
    if (status === "ACTIVE") {
      query = query.in("status", ["PENDING", "ACCEPTED", "PREPARING", "READY"]);
    } else {
      query = query.eq("status", status);
    }
  }
  if (source && source !== "ALL") {
    query = query.eq("source", source);
  }
  if (search) {
    query = query.or(`order_number.ilike.%${search}%,delivery_address.ilike.%${search}%`);
  }

  const { data: orders, error } = await query;
  if (error) throw new Error(error.message);

  return (orders || []).map((o: any) => ({
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
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const search = url.searchParams.get("search")?.trim();
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);

  const cacheKey = `orders:${status || "ALL"}:${source || "ALL"}:${search || ""}:${limit}`;

  // 1. Instant Cache Check (< 1ms)
  const { data: cached, status: cacheStatus } = getFromCache<{ orders: any[] }>(cacheKey);

  if (cached) {
    // If stale, trigger background revalidation
    if (cacheStatus === "STALE" && shouldRevalidate(`reval:${cacheKey}`)) {
      fetchFreshOrders(status, source, search, limit)
        .then((fresh) => {
          setToCache(cacheKey, { orders: fresh }, 5000, 60000);
        })
        .catch((err) => console.warn("Background order reval failed:", err))
        .finally(() => finishRevalidation(`reval:${cacheKey}`));
    }

    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "private, max-age=3, stale-while-revalidate=15",
        "X-AYOTD-Cache": cacheStatus
      }
    });
  }

  // 2. Cache Miss: Fetch from Supabase with 3.5s timeout
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase query timeout (3500ms)")), 3500)
    );

    const fresh = await Promise.race([
      fetchFreshOrders(status, source, search, limit),
      timeoutPromise
    ]);

    const payload = { orders: fresh };
    setToCache(cacheKey, payload, 5000, 60000);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=3, stale-while-revalidate=15",
        "X-AYOTD-Cache": "MISS"
      }
    });
  } catch (err) {
    console.warn("Falling back to demo orders:", err instanceof Error ? err.message : err);
    return NextResponse.json({ orders: getFallbackOrders() });
  }
}

