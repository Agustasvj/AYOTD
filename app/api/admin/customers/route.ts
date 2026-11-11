import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const db = getSupabaseAdmin();

  if (!db) {
    return NextResponse.json({
      customers: [
        {
          id: "cust-demo-1",
          full_name: "Kevin Otieno",
          phone: "0712345678",
          order_count: 8,
          total_spent: 2450,
          created_at: new Date(Date.now() - 30 * 86400000).toISOString()
        },
        {
          id: "cust-demo-2",
          full_name: "Mercy Wanjiku",
          phone: "0723456789",
          order_count: 5,
          total_spent: 1650,
          created_at: new Date(Date.now() - 14 * 86400000).toISOString()
        },
        {
          id: "cust-demo-3",
          full_name: "David Kimani",
          phone: "0734567890",
          order_count: 12,
          total_spent: 3100,
          created_at: new Date(Date.now() - 45 * 86400000).toISOString()
        }
      ]
    });
  }

  try {
    const { data: customers, error } = await db
      .from("customers")
      .select(`
        id,
        full_name,
        phone,
        created_at,
        orders(id, total_amount, status)
      `)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const formatted = (customers || []).map((c: any) => {
      const orders = c.orders || [];
      const totalSpent = orders
        .filter((o: any) => o.status !== "CANCELLED" && o.status !== "REJECTED")
        .reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

      return {
        id: c.id,
        full_name: c.full_name,
        phone: c.phone,
        created_at: c.created_at,
        order_count: orders.length,
        total_spent: totalSpent
      };
    });

    return NextResponse.json({ customers: formatted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load customers." },
      { status: 500 }
    );
  }
}

