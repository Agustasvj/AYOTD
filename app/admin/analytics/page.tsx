"use client";

import { useEffect, useState } from "react";
import { kes } from "@/lib/money";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Flame,
  CreditCard,
  Banknote,
  RefreshCw
} from "lucide-react";

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders?limit=100");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;
  const cancelledOrders = orders.filter(
    (o) => o.status === "CANCELLED" || o.status === "REJECTED"
  ).length;

  const validOrders = orders.filter(
    (o) => o.status !== "CANCELLED" && o.status !== "REJECTED"
  );
  const totalGrossRevenue = validOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const averageOrderValue =
    validOrders.length > 0 ? Math.round(totalGrossRevenue / validOrders.length) : 0;

  // Revenue by payment method
  let mpesaRevenue = 0;
  let cashRevenue = 0;
  validOrders.forEach((o) => {
    const pay = o.payments?.[0];
    if (pay?.method === "CASH") cashRevenue += o.total_amount;
    else mpesaRevenue += o.total_amount;
  });

  // Orders by source
  const sourceCounts: Record<string, number> = {};
  orders.forEach((o) => {
    const src = o.source || "WEBSITE";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });

  // Top Items
  const itemCounts: Record<string, { name: string; count: number; totalRevenue: number }> = {};
  orders.forEach((o) => {
    if (o.status !== "CANCELLED" && o.items) {
      o.items.forEach((it: any) => {
        const key = it.item_name;
        if (!itemCounts[key]) {
          itemCounts[key] = { name: key, count: 0, totalRevenue: 0 };
        }
        itemCounts[key].count += it.quantity;
        itemCounts[key].totalRevenue += it.subtotal || it.unit_price * it.quantity;
      });
    }
  });

  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-red-400">
            <BarChart3 size={14} /> Performance & Financial Insights
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            Analytics & Reports
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Analyze daily volumes, channel distributions, and customer food preferences.
          </p>
        </div>

        <button
          onClick={() => loadData()}
          className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Analytics
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-5 border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Gross Sales
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            {kes(totalGrossRevenue)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Confirmed active & completed orders
          </div>
        </div>

        <div className="panel p-5 border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Average Order Value
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-400 mt-2">
            {kes(averageOrderValue)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Per customer transaction
          </div>
        </div>

        <div className="panel p-5 border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Fulfillment Rate
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2">
            {totalOrders > 0
              ? `${Math.round((completedOrders / totalOrders) * 100)}%`
              : "0%"}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {completedOrders} completed of {totalOrders} total
          </div>
        </div>

        <div className="panel p-5 border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Cancellations
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 mt-2">
            {cancelledOrders}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Out-of-stock or customer changes
          </div>
        </div>
      </div>

      {/* Charts & Distributions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue by Payment Method */}
        <div className="panel p-6 border-zinc-800 space-y-4">
          <h2 className="font-bold text-base text-white">
            Revenue by Payment Method
          </h2>
          <p className="text-xs text-zinc-400">
            Split between Safaricom Daraja STK Push and physical cash collected.
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CreditCard size={14} /> M-Pesa Collections
                </span>
                <span className="text-white font-bold">{kes(mpesaRevenue)}</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      totalGrossRevenue > 0
                        ? Math.round((mpesaRevenue / totalGrossRevenue) * 100)
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Banknote size={14} /> Cash on Delivery / Counter
                </span>
                <span className="text-white font-bold">{kes(cashRevenue)}</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      totalGrossRevenue > 0
                        ? Math.round((cashRevenue / totalGrossRevenue) * 100)
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Orders by Source Breakdown */}
        <div className="panel p-6 border-zinc-800 space-y-4">
          <h2 className="font-bold text-base text-white">
            Orders by Channel Source
          </h2>
          <p className="text-xs text-zinc-400">
            Track whether customers order via Website, WhatsApp Groups, or Phone.
          </p>

          <div className="space-y-3 pt-2">
            {Object.entries(sourceCounts).map(([src, count]) => {
              const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;

              return (
                <div key={src}>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-zinc-300">{src.replace("_", " ")}</span>
                    <span className="text-zinc-400 font-bold">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-red-600 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Best-Selling Meals Ranking */}
      <section className="panel p-6 border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-white">
              Campus Best-Selling Delicacies
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Top requested dishes ranked by order frequency.
            </p>
          </div>
          <Flame size={20} className="text-red-500" />
        </div>

        {topItems.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs">
            No meal sales recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60 pt-2">
            {topItems.map((it, idx) => (
              <div
                key={it.name}
                className="py-3 flex items-center justify-between text-xs sm:text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-950 border border-red-800 flex items-center justify-center font-bold text-red-400 text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="font-bold text-white block">{it.name}</span>
                    <span className="text-xs text-zinc-400">{it.count} plates ordered</span>
                  </div>
                </div>
                <div className="font-bold text-red-400">
                  {kes(it.totalRevenue)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

