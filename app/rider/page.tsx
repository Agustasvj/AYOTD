"use client";

import { useEffect, useState } from "react";
import { kes } from "@/lib/money";
import {
  Bike,
  Phone,
  MessageCircle,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ArrowLeft,
  Printer
} from "lucide-react";
import Link from "next/link";

export default function RiderPortalPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function loadMyDeliveries() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders?limit=50");
      const data = await res.json();
      const list = (data.orders || []).filter(
        (o: any) =>
          o.fulfilment_type === "DELIVERY" &&
          ["READY", "OUT_FOR_DELIVERY"].includes(o.status)
      );
      setDeliveries(list);
    } catch {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyDeliveries();
  }, []);

  async function updateStatus(orderId: string, status: string) {
    setBusy(orderId);
    try {
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      await loadMyDeliveries();
    } finally {
      setBusy(null);
    }
  }

  async function promptSTK(orderId: string, phone: string, amount: number) {
    setBusy(orderId);
    try {
      const res = await fetch("/api/payments/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, phone, amount })
      });
      const data = await res.json();
      alert(data.message || (data.success ? "STK Push sent!" : data.error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-lg mx-auto pb-16">
      {/* Mobile Rider Top Bar */}
      <div className="flex items-center justify-between py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-red-950 border border-red-600 flex items-center justify-center text-red-500">
            <Bike size={18} />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide">AYOTD RUNNER</div>
            <div className="text-[10px] text-zinc-400">Campus Delivery Screen</div>
          </div>
        </div>

        <button
          onClick={() => loadMyDeliveries()}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs flex items-center gap-1 text-zinc-300"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="mt-4">
        <h1 className="text-xl font-bold text-white">Active Runs ({deliveries.length})</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Deliver meals to students & faculty promptly.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-500 text-xs">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
          Loading assigned orders...
        </div>
      ) : deliveries.length === 0 ? (
        <div className="panel p-8 text-center border-zinc-800 mt-6">
          <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-400" />
          <h2 className="font-bold text-white text-base">All Deliveries Complete</h2>
          <p className="text-xs text-zinc-500 mt-1">
            No pending runs at the moment. Take a break!
          </p>
        </div>
      ) : (
        <div className="space-y-4 mt-5">
          {deliveries.map((o) => {
            const isOut = o.status === "OUT_FOR_DELIVERY";

            return (
              <div
                key={o.id}
                className="panel p-5 border-zinc-800 bg-zinc-950 space-y-4 shadow-lg"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="font-mono font-bold text-sm text-red-400">
                    {o.order_number}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      isOut
                        ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                        : "bg-purple-950 text-purple-300 border border-purple-800"
                    }`}
                  >
                    {o.status.replace("_", " ")}
                  </span>
                </div>

                {/* Customer Location */}
                <div className="space-y-2 text-xs">
                  <div className="text-sm font-bold text-white flex items-center gap-1.5 text-red-300">
                    <MapPin size={16} className="shrink-0 text-red-500" />
                    <span>{o.delivery_address || "Campus Spot"}</span>
                  </div>

                  <div className="text-zinc-300 font-medium pt-1">
                    Customer: <strong className="text-white">{o.customer?.full_name}</strong>
                  </div>

                  {o.instructions && (
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                      <strong>Note:</strong> {o.instructions}
                    </div>
                  )}
                </div>

                {/* Call / WhatsApp Customer Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`tel:${o.customer?.phone}`}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white flex items-center justify-center gap-1.5 hover:bg-zinc-800"
                  >
                    <Phone size={13} className="text-red-400" /> Call Customer
                  </a>
                  <a
                    href={`https://wa.me/${o.customer?.phone?.replace(/[\+\s]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 hover:bg-emerald-900"
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                </div>

                {/* Payment status & Doorstep STK trigger */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">AMOUNT DUE</span>
                    <span className="font-bold text-white text-base">
                      {kes(o.total_amount)}
                    </span>
                  </div>

                  {o.payment_status === "PAID" ? (
                    <span className="text-emerald-400 font-bold text-xs bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full">
                      ✓ PAID
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        promptSTK(o.id, o.customer?.phone, o.total_amount)
                      }
                      disabled={busy === o.id}
                      className="btn-secondary text-[11px] py-1.5 px-3 text-emerald-400 border-emerald-800 flex items-center gap-1"
                    >
                      <CreditCard size={12} /> Prompt STK
                    </button>
                  )}
                </div>

                {/* Print Docket Link */}
                <div className="pt-1">
                  <Link
                    href={`/admin/orders/${o.id}/print`}
                    target="_blank"
                    className="w-full p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5 hover:text-white"
                  >
                    <Printer size={13} /> View / Print Delivery Docket (PDF)
                  </Link>
                </div>

                {/* Action button */}
                {!isOut ? (
                  <button
                    onClick={() => updateStatus(o.id, "OUT_FOR_DELIVERY")}
                    disabled={busy === o.id}
                    className="btn-primary w-full bg-indigo-700 hover:bg-indigo-600 text-xs py-3 flex items-center justify-center gap-2 font-bold"
                  >
                    <Bike size={15} /> Start Moving to Hostel
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus(o.id, "COMPLETED")}
                    disabled={busy === o.id}
                    className="btn-primary w-full bg-emerald-700 hover:bg-emerald-600 text-xs py-3 flex items-center justify-center gap-2 font-bold"
                  >
                    <CheckCircle2 size={15} /> Confirm Handed Over to Student
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-400">
          ← Return to Admin Operations
        </Link>
      </div>
    </div>
  );
}

