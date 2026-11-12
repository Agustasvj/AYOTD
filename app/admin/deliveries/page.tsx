"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { kes } from "@/lib/money";
import {
  Bike,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Banknote,
  UserCheck,
  MessageCircle,
  Clock,
  Send,
  Printer
} from "lucide-react";

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [ordersRes, ridersRes] = await Promise.all([
        fetch("/api/admin/orders?limit=100"),
        fetch("/api/admin/riders")
      ]);

      const ordersData = await ordersRes.json();
      const ridersData = await ridersRes.json();

      setRiders(ridersData.riders || []);

      // Filter delivery orders only
      const delOrders = (ordersData.orders || []).filter(
        (o: any) => o.fulfilment_type === "DELIVERY"
      );
      setDeliveries(delOrders);
    } catch {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAssignRider(orderId: string, riderId: string) {
    setActionBusy(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId })
      });
      if (res.ok) {
        await loadData();
      }
    } finally {
      setActionBusy(null);
    }
  }

  async function handleStatusChange(orderId: string, status: string, note?: string) {
    setActionBusy(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note })
      });
      if (res.ok) {
        await loadData();
      }
    } finally {
      setActionBusy(null);
    }
  }

  async function handleDoorstepSTK(orderId: string, phone: string, amount: number) {
    setActionBusy(orderId);
    try {
      const res = await fetch("/api/payments/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, phone, amount })
      });
      const data = await res.json();
      alert(data.message || (data.success ? "STK Push sent!" : data.error));
    } finally {
      setActionBusy(null);
    }
  }

  async function handleConfirmCashAndComplete(orderId: string) {
    if (!confirm("Confirm that cash has been received from the customer and mark this order completed?")) {
      return;
    }
    setActionBusy(orderId);
    try {
      const res = await fetch("/api/admin/payments/cash/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          markCompleted: true,
          staffName: "Dispatch Admin"
        })
      });
      if (res.ok) {
        await loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to confirm cash.");
      }
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <Bike size={14} /> Campus Logistics
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            Deliveries & Rider Dispatch
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Assign campus runners, coordinate hostel drops, and collect doorstep payments.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/admin/deliveries/print"
            className="p-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-crimson-950/40 transition active:scale-95"
          >
            <Printer size={14} /> Print Run Sheet (PDF)
          </Link>
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Deliveries
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-zinc-500 text-xs">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
          Loading campus deliveries...
        </div>
      ) : deliveries.length === 0 ? (
        <div className="panel p-16 text-center border-zinc-800 max-w-md mx-auto">
          <Bike size={44} className="mx-auto mb-3 text-zinc-600" />
          <h3 className="font-bold text-white">No active delivery orders</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Campus delivery orders will show up here as soon as customers place them.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {deliveries.map((o) => {
            const isBusy = actionBusy === o.id;
            const isDelivered = o.status === "COMPLETED";
            const isOut = o.status === "OUT_FOR_DELIVERY";

            return (
              <div
                key={o.id}
                className={`panel p-6 border-zinc-800 flex flex-col justify-between space-y-4 ${
                  isOut ? "border-indigo-600/60 bg-indigo-950/10" : ""
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                    <div>
                      <span className="text-xs font-mono font-bold text-white block">
                        {o.order_number}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        isDelivered
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : isOut
                          ? "bg-indigo-950 text-indigo-300 border border-indigo-800 animate-pulse"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {o.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Customer & Location */}
                  <div className="py-4 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="text-zinc-400">Customer:</span>
                      <span className="font-bold text-white text-right">
                        {o.customer?.full_name || "Guest Customer"}
                      </span>
                    </div>

                    <div className="flex justify-between items-start">
                      <span className="text-zinc-400">Phone:</span>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${o.customer?.phone}`}
                          className="font-mono text-zinc-200 hover:underline flex items-center gap-1"
                        >
                          <Phone size={12} className="text-red-400" />
                          {o.customer?.phone || "No phone"}
                        </a>
                        {o.customer?.phone && (
                          <a
                            href={`https://wa.me/${o.customer.phone.replace(/[\+\s]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:text-emerald-300"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-start pt-1">
                      <span className="text-zinc-400">Destination:</span>
                      <span className="font-bold text-red-300 text-right max-w-xs flex items-center gap-1 justify-end">
                        <MapPin size={12} className="shrink-0" />
                        {o.delivery_address || "Campus Spot"}
                      </span>
                    </div>

                    {o.instructions && (
                      <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 mt-2">
                        <strong className="text-red-400">Note:</strong> {o.instructions}
                      </div>
                    )}
                  </div>

                  {/* Rider Assignment */}
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-zinc-500 block text-[11px]">Assigned Rider</span>
                      <span className="font-bold text-white">
                        {o.delivery?.profiles?.full_name || "Unassigned"}
                      </span>
                    </div>

                    {!isDelivered && (
                      <select
                        defaultValue=""
                        onChange={(e) => handleAssignRider(o.id, e.target.value)}
                        disabled={isBusy}
                        className="text-xs py-1.5 px-3 rounded-lg bg-zinc-800 border-zinc-700 text-zinc-200"
                      >
                        <option value="" disabled>Change Rider</option>
                        {riders.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.full_name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Outstanding Amount & Delivery Actions */}
                <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-zinc-500">Order Bill:</span>
                      <span className="font-bold text-white text-sm ml-1.5">
                        {kes(o.total_amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Payment:</span>
                      <span
                        className={`font-bold ${
                          o.payment_status === "PAID"
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {o.payment_status}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/orders/${o.id}/print`}
                      target="_blank"
                      className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5 text-zinc-300 hover:text-white"
                      title="Print Delivery Docket / PDF"
                    >
                      <Printer size={13} /> Print Slip
                    </Link>

                    {o.payment_status !== "PAID" && !isDelivered && (
                      <button
                        onClick={() => handleConfirmCashAndComplete(o.id)}
                        disabled={isBusy}
                        className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs py-2 px-3 flex items-center justify-center gap-1.5 font-bold shadow-md shadow-emerald-950/60"
                        title="Collect Cash & Complete Order"
                      >
                        <Banknote size={14} /> Cash Received & Done
                      </button>
                    )}

                    {o.payment_status !== "PAID" && o.customer?.phone && (
                      <button
                        onClick={() =>
                          handleDoorstepSTK(o.id, o.customer.phone, o.total_amount)
                        }
                        disabled={isBusy}
                        className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5 text-emerald-400 border-emerald-900/60 hover:bg-emerald-950/40"
                      >
                        <CreditCard size={13} /> Prompt STK
                      </button>
                    )}

                    {o.status !== "OUT_FOR_DELIVERY" && !isDelivered && (
                      <button
                        onClick={() => handleStatusChange(o.id, "OUT_FOR_DELIVERY")}
                        disabled={isBusy}
                        className="btn-primary flex-1 bg-indigo-700 hover:bg-indigo-600 text-xs py-2 flex items-center justify-center gap-1.5 font-bold"
                      >
                        <Bike size={14} /> Dispatch Rider
                      </button>
                    )}

                    {o.status === "OUT_FOR_DELIVERY" && (
                      <button
                        onClick={() => handleStatusChange(o.id, "COMPLETED")}
                        disabled={isBusy}
                        className="btn-primary flex-1 bg-emerald-700 hover:bg-emerald-600 text-xs py-2 flex items-center justify-center gap-1.5 font-bold"
                      >
                        <CheckCircle2 size={14} /> Mark Delivered
                      </button>
                    )}

                    {!isDelivered && (
                      <button
                        onClick={() => {
                          const reason = prompt("Enter failure reason:");
                          if (reason) handleStatusChange(o.id, "DELIVERY_FAILED", reason);
                        }}
                        disabled={isBusy}
                        className="p-2 rounded-lg bg-zinc-900 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 text-xs"
                        title="Report Delivery Failure"
                      >
                        <AlertTriangle size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

