"use client";

import { useEffect, useState } from "react";
import { kes } from "@/lib/money";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  PackageCheck,
  RefreshCw,
  Flame,
  AlertTriangle,
  Store,
  Truck
} from "lucide-react";

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  async function loadKitchenOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders?limit=50");
      const data = await res.json();
      const allOrders = data.orders || [];
      // Filter for active orders to prepare/dispatch
      const active = allOrders.filter((o: any) =>
        ["PENDING", "ACCEPTED", "PREPARING", "READY"].includes(o.status)
      );
      setOrders(active);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKitchenOrders();
    const interval = setInterval(loadKitchenOrders, 15000); // Poll every 15s for new tickets
    return () => clearInterval(interval);
  }, []);

  async function updateStatus(orderId: string, nextStatus: string) {
    setActionBusy(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          note: `Kitchen staff moved ticket to ${nextStatus}`
        })
      });
      if (res.ok) {
        await loadKitchenOrders();
      }
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* KDS Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-orange-400">
            <Flame size={14} /> Kitchen Display System (KDS)
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            Live Cooking Tickets
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Real-time orders ready for cooking. Prepare dishes and mark them ready for packing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadKitchenOrders()}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-red-950/80 border border-red-800 text-red-300">
            {orders.length} ACTIVE TICKETS
          </div>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="p-16 text-center text-zinc-500">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
          Loading active kitchen tickets...
        </div>
      ) : orders.length === 0 ? (
        <div className="panel p-16 text-center border-zinc-800 max-w-md mx-auto">
          <ChefHat size={44} className="mx-auto mb-3 text-zinc-600" />
          <h2 className="text-lg font-bold text-white">All Caught Up!</h2>
          <p className="text-xs text-zinc-500 mt-1">
            There are no orders currently awaiting preparation. New tickets will appear
            automatically.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((o) => {
            const isBusy = actionBusy === o.id;
            const elapsedMins = Math.round(
              (Date.now() - new Date(o.created_at).getTime()) / 60000
            );
            const isUrgent = elapsedMins > 20;

            return (
              <div
                key={o.id}
                className={`panel flex flex-col justify-between border-2 transition-all ${
                  isUrgent
                    ? "border-rose-600/80 bg-rose-950/10 shadow-[0_0_25px_rgba(225,29,72,0.15)]"
                    : o.status === "PREPARING"
                    ? "border-orange-600/80 bg-orange-950/10"
                    : "border-zinc-800 bg-zinc-950"
                }`}
              >
                <div>
                  {/* Ticket Header */}
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-white">
                        {o.order_number}
                      </span>
                      <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                        <Clock size={12} className={isUrgent ? "text-rose-400" : "text-zinc-500"} />
                        <span>{elapsedMins} mins ago</span>
                        {isUrgent && (
                          <span className="text-[10px] bg-rose-900/60 text-rose-300 px-1.5 rounded font-bold">
                            PRIORITY
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        o.status === "PREPARING"
                          ? "bg-orange-950 text-orange-300 border border-orange-800/80 animate-pulse"
                          : "bg-blue-950 text-blue-300 border border-blue-800/80"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>

                  {/* Customer & Fulfilment badge */}
                  <div className="p-4 pb-2 flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-900">
                    <div>Customer: <strong className="text-zinc-200">{o.customer?.full_name || "Guest"}</strong></div>
                    <div className="flex items-center gap-1 font-semibold text-zinc-300">
                      {o.fulfilment_type === "DELIVERY" ? (
                        <>
                          <Truck size={13} className="text-red-400" /> Delivery
                        </>
                      ) : (
                        <>
                          <Store size={13} className="text-red-400" /> Collection
                        </>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Items to Cook
                    </div>
                    <div className="space-y-2">
                      {o.items && o.items.length > 0 ? (
                        o.items.map((it: any, i: number) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-start justify-between gap-2"
                          >
                            <div className="flex-1">
                              <div className="font-bold text-sm text-white">
                                <span className="text-red-400 text-base mr-2">
                                  {it.quantity}×
                                </span>
                                {it.item_name}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-zinc-500">Meal package</div>
                      )}
                    </div>

                    {/* Special Instructions */}
                    {o.instructions && (
                      <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/40 text-xs text-red-200 mt-2">
                        <span className="font-bold block text-[10px] uppercase text-red-400">
                          Special Request:
                        </span>
                        {o.instructions}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Button: Single-step Dispatch */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-950">
                  {o.fulfilment_type === "DELIVERY" ? (
                    <button
                      onClick={() => updateStatus(o.id, "OUT_FOR_DELIVERY")}
                      disabled={isBusy}
                      className="btn-primary w-full bg-crimson-600 hover:bg-crimson-500 text-xs py-3 flex items-center justify-center gap-2 font-bold shadow-lg shadow-crimson-950/60"
                    >
                      <Truck size={16} /> 🚀 Dispatch for Campus Delivery
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(o.id, "COMPLETED")}
                      disabled={isBusy}
                      className="btn-primary w-full bg-emerald-600 hover:bg-emerald-500 text-xs py-3 flex items-center justify-center gap-2 font-bold"
                    >
                      <PackageCheck size={16} /> ✓ Hand Over / Collected
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

