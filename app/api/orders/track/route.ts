import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getFromCache, setToCache } from "@/lib/fast-cache";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const number = url.searchParams.get("orderNumber")?.trim();

  if (!number || !/^AYOTD-[A-Z0-9-]{4,30}$/i.test(number)) {
    return NextResponse.json(
      { error: "Please enter a valid order reference (e.g. AYOTD-12345678)." },
      { status: 400 }
    );
  }

  const cacheKey = `track:${number.toUpperCase()}`;
  const { data: cached } = getFromCache<{ order?: any; error?: string }>(cacheKey);
  if (cached) {
    const isErr = Boolean(cached.error);
    return NextResponse.json(cached, {
      status: isErr ? 404 : 200,
      headers: {
        "Cache-Control": "private, max-age=2, stale-while-revalidate=10",
        "X-AYOTD-Cache": "HIT"
      }
    });
  }

  const db = getSupabaseAdmin();

  // If DB not connected or it's a demo order number, provide realistic demo tracker
  if (!db || number.startsWith("AYOTD-DEMO") || number.startsWith("AYOTD-MAN-")) {
    return NextResponse.json({
      order: {
        order_number: number,
        status: "PREPARING",
        fulfilment_type: "DELIVERY",
        delivery_address: "Hostel 3, Room B12",
        total_amount: 380,
        payment_status: "PAID",
        payment_method: "MPESA",
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        dispatched_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        items: [
          { item_name: "Swahili Chicken Biryani", quantity: 1, unit_price: 320 },
          { item_name: "Fresh Tropical Passion & Mango Blend", quantity: 1, unit_price: 120 }
        ],
        rider: {
          name: "Kevin (AYOTD Express Rider)",
          phone: "0712 345 678"
        },
        history: [
          { status: "PENDING", created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
          { status: "ACCEPTED", created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
          { status: "PREPARING", created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString() }
        ]
      }
    });
  }

  try {
    const { data: order, error } = await db
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        fulfilment_type,
        delivery_address,
        instructions,
        subtotal,
        delivery_fee,
        total_amount,
        payment_status,
        created_at,
        order_items(id, item_name, quantity, unit_price, subtotal),
        deliveries(id, status, rider_id, picked_up_at, profiles(full_name, id)),
        payments(id, method, amount, status),
        order_status_history(old_status, new_status, note, created_at)
      `)
      .eq("order_number", number)
      .maybeSingle();

    if (error || !order) {
      const notFoundPayload = {
        error: "We could not find an order matching that reference. Please check and try again."
      };
      setToCache(cacheKey, notFoundPayload, 5000, 15000);
      return NextResponse.json(notFoundPayload, {
        status: 404,
        headers: {
          "Cache-Control": "private, max-age=5",
          "X-AYOTD-Cache": "MISS-404"
        }
      });
    }

    const riderProfile = (order.deliveries as any)?.[0]?.profiles;
    const dispatchHistory = (order.order_status_history || []).find(
      (h: any) => h.new_status === "OUT_FOR_DELIVERY"
    );
    const dispatchedAt =
      (order.deliveries as any)?.[0]?.picked_up_at ||
      dispatchHistory?.created_at ||
      null;

    const payload = {
      order: {
        order_number: order.order_number,
        status: order.status,
        fulfilment_type: order.fulfilment_type,
        delivery_address: order.delivery_address,
        instructions: order.instructions,
        total_amount: Number(order.total_amount),
        delivery_fee: Number(order.delivery_fee),
        payment_status: order.payment_status,
        payment_method: (order.payments as any)?.[0]?.method || "MPESA",
        created_at: order.created_at,
        dispatched_at: dispatchedAt,
        items: order.order_items || [],
        rider: riderProfile
          ? {
              name: riderProfile.full_name,
              phone: "Campus Dispatch"
            }
          : null,
        history: (order.order_status_history || []).map((h: any) => ({
          status: h.new_status,
          note: h.note,
          created_at: h.created_at
        }))
      }
    };

    setToCache(cacheKey, payload, 3000, 30000);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=2, stale-while-revalidate=10",
        "X-AYOTD-Cache": "MISS"
      }
    });
  } catch (err) {
    return NextResponse.json(
      { error: "An unexpected error occurred while looking up your order." },
      { status: 500 }
    );
  }
}
