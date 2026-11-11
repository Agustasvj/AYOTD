import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { kes } from "@/lib/money";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  MessageCircle,
  Truck,
  ArrowRight,
  Flame,
  CreditCard,
  Banknote,
  AlertCircle
} from "lucide-react";

export default async function AdminDashboardPage() {
  const db = getSupabaseAdmin();

  let orders: any[] = [];
  let totalRevenue = 0;
  let mpesaRevenue = 0;
  let cashRevenue = 0;
  let totalOrderCount = 0;

  if (db) {
    try {
      const { data: oList, count } = await db
        .from("orders")
        .select(`
          id,
          order_number,
          source,
          status,
          total_amount,
          payment_status,
          created_at,
          customers(full_name, phone),
          payments(method, amount, status)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(20);

      orders = oList || [];
      totalOrderCount = count || orders.length;

      // Calculate totals
      for (const ord of orders) {
        const amt = Number(ord.total_amount) || 0;
        if (ord.payment_status === "PAID") {
          totalRevenue += amt;
          const pay = (ord.payments as any)?.[0];
          if (pay?.method === "MPESA") {
            mpesaRevenue += amt;
          } else {
            cashRevenue += amt;
          }
        }
      }
    } catch {
      // fallback
    }
  } else {
    // Demo metrics for preview
    orders = [
      {
        id: "demo-1",
        order_number: "AYOTD-98124011",
        source: "WHATSAPP_GROUP",
        status: "PENDING",
        total_amount: 550,
        payment_status: "PENDING",
        created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        customers: { full_name: "Kevin Otieno", phone: "0712345678" }
      },
      {
        id: "demo-2",
        order_number: "AYOTD-98123990",
        source: "WEBSITE",
        status: "PREPARING",
        total_amount: 330,
        payment_status: "PAID",
        created_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
        customers: { full_name: "Mercy Wanjiku", phone: "0723456789" }
      },
      {
        id: "demo-3",
        order_number: "AYOTD-98123880",
        source: "PHONE_CALL",
        status: "READY",
        total_amount: 150,
        payment_status: "PAID",
        created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
        customers: { full_name: "David Kimani", phone: "0734567890" }
      }
    ];
    totalOrderCount = 28;
    totalRevenue = 7450;
    mpesaRevenue = 5850;
    cashRevenue = 1600;
  }

  const pendingCount = orders.filter((x) => x.status === "PENDING").length;
  const activeCount = orders.filter((x) =>
    ["ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(x.status)
  ).length;
  const completedCount = orders.filter((x) => x.status === "COMPLETED").length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner / Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="eyebrow">Executive Operations Center</div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            Business Overview
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Real-time status of university orders, revenue collection, and kitchen throughput.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders/new"
            className="btn-primary text-xs px-4 py-2.5 font-bold shadow-md shadow-red-950 flex items-center gap-1.5"
          >
            + New Manual Order
          </Link>
        </div>
      </div>

      {!db && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>
              <strong>Supabase environment variables not detected.</strong> The system is
              running in preview mode with simulated data. Run the database migration and add
              credentials in <code className="text-amber-200">.env.local</code> to activate
              live storage.
            </span>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-5 border-zinc-800">
          <div className="flex justify-between items-start text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Revenue
            </span>
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
            {kes(totalRevenue)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400">
            <span className="text-emerald-400 font-bold">M-Pesa: {kes(mpesaRevenue)}</span>
            <span>•</span>
            <span className="text-amber-400">Cash: {kes(cashRevenue)}</span>
          </div>
        </div>

        <div className="panel p-5 border-zinc-800">
          <div className="flex justify-between items-start text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending Approval
            </span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
            {pendingCount}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-2">
            Requires kitchen acceptance
          </div>
        </div>

        <div className="panel p-5 border-zinc-800">
          <div className="flex justify-between items-start text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              In Kitchen / Transit
            </span>
            <Flame size={16} className="text-red-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
            {activeCount}
          </div>
          <div className="text-[11px] text-red-400/80 mt-2">
            Currently being prepared or dispatched
          </div>
        </div>

        <div className="panel p-5 border-zinc-800">
          <div className="flex justify-between items-start text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Recorded Orders
            </span>
            <ShoppingBag size={16} className="text-zinc-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
            {totalOrderCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-2">
            All channels combined
          </div>
        </div>
      </div>

      {/* Quick Ops Shortcuts */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link
          href="/admin/kitchen"
          className="panel p-5 border-zinc-800 hover:border-red-900/60 transition group flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-semibold text-zinc-400">Kitchen Display (KDS)</div>
            <div className="text-base font-bold text-white group-hover:text-red-300 mt-1">
              Active Cooking Orders →
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-950/60 flex items-center justify-center text-red-400">
            <Flame size={20} />
          </div>
        </Link>

        <Link
          href="/admin/deliveries"
          className="panel p-5 border-zinc-800 hover:border-red-900/60 transition group flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-semibold text-zinc-400">Hostel Deliveries</div>
            <div className="text-base font-bold text-white group-hover:text-red-300 mt-1">
              Rider Dispatch Board →
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-300">
            <Truck size={20} />
          </div>
        </Link>

        <Link
          href="/admin/whatsapp"
          className="panel p-5 border-zinc-800 hover:border-red-900/60 transition group flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-semibold text-zinc-400">WhatsApp Ingestion</div>
            <div className="text-base font-bold text-white group-hover:text-red-300 mt-1">
              Incoming WhatsApp Orders →
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 flex items-center justify-center text-emerald-400">
            <MessageCircle size={20} />
          </div>
        </Link>
      </div>

      {/* Recent Orders Table */}
      <section className="panel overflow-hidden border-zinc-800">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-white">Recent Orders Queue</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live incoming customer orders from Website, WhatsApp & Walk-ins.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-semibold text-red-400 hover:underline flex items-center gap-1"
          >
            Manage All Orders <ArrowRight size={13} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-zinc-400 bg-zinc-950/40">
                <th className="p-4 font-semibold">Reference</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Channel</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Payment</th>
                <th className="p-4 font-semibold text-right">Amount</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-900/40 transition">
                  <td className="p-4 font-mono font-bold text-white">
                    {o.order_number}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-zinc-200">
                      {o.customers?.full_name || "Guest Customer"}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      {o.customers?.phone || "No phone"}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {o.source.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        o.status === "PENDING"
                          ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                          : o.status === "COMPLETED"
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                          : "bg-red-950/80 text-red-300 border border-red-800/60"
                      }`}
                    >
                      {o.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-xs font-semibold ${
                        o.payment_status === "PAID"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-white">
                    {kes(o.total_amount)}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/admin/orders`}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
