import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const method = url.searchParams.get("method");
  const status = url.searchParams.get("status");
  const db = getSupabaseAdmin();

  if (!db) {
    return NextResponse.json({
      payments: [
        {
          id: "pay-demo-1",
          order_id: "order-1",
          order_number: "AYOTD-98124011",
          customer_name: "Kevin Otieno",
          customer_phone: "0712345678",
          method: "MPESA",
          amount: 550,
          status: "PENDING",
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          mpesa: {
            checkout_request_id: "ws_CO_1204202619001",
            receipt_number: null
          }
        },
        {
          id: "pay-demo-2",
          order_id: "order-2",
          order_number: "AYOTD-98123990",
          customer_name: "Mercy Wanjiku",
          customer_phone: "0723456789",
          method: "MPESA",
          amount: 330,
          status: "PAID",
          transaction_reference: "SHB892KL90",
          created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          mpesa: {
            checkout_request_id: "ws_CO_1204202618451",
            receipt_number: "SHB892KL90"
          }
        },
        {
          id: "pay-demo-3",
          order_id: "order-3",
          order_number: "AYOTD-98123880",
          customer_name: "David Kimani",
          customer_phone: "0734567890",
          method: "CASH",
          amount: 150,
          status: "PAID",
          transaction_reference: "CASH-CONFIRMED",
          created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
        }
      ]
    });
  }

  try {
    let query = db
      .from("payments")
      .select(`
        id,
        order_id,
        method,
        amount,
        status,
        transaction_reference,
        paid_at,
        created_at,
        orders(
          order_number,
          customers(full_name, phone)
        ),
        mpesa_transactions(
          checkout_request_id,
          receipt_number,
          phone_number,
          result_code,
          result_description
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (method && method !== "ALL") query = query.eq("method", method);
    if (status && status !== "ALL") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const formatted = (data || []).map((p: any) => ({
      id: p.id,
      order_id: p.order_id,
      order_number: p.orders?.order_number,
      customer_name: p.orders?.customers?.full_name,
      customer_phone: p.orders?.customers?.phone,
      method: p.method,
      amount: Number(p.amount),
      status: p.status,
      transaction_reference: p.transaction_reference,
      paid_at: p.paid_at,
      created_at: p.created_at,
      mpesa: p.mpesa_transactions?.[0] || null
    }));

    return NextResponse.json({ payments: formatted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load payments." },
      { status: 500 }
    );
  }
}

