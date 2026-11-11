"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { kes } from "@/lib/money";
import {
  Search,
  CheckCircle2,
  Clock,
  ChefHat,
  PackageCheck,
  Bike,
  Sparkles,
  Phone,
  MessageCircle,
  AlertCircle,
  RefreshCw,
  Loader2
} from "lucide-react";

const STAGES = [
  { key: "PENDING", label: "Order Received", desc: "Sent to AYOTD kitchen team", icon: Clock },
  { key: "ACCEPTED", label: "Order Accepted", desc: "Confirmed by kitchen supervisor", icon: CheckCircle2 },
  { key: "PREPARING", label: "Chef Preparing", desc: "Cooking fresh on the grill & stoves", icon: ChefHat },
  { key: "READY", label: "Packed & Ready", desc: "Ready for rider dispatch or collection", icon: PackageCheck },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", desc: "Rider on the way to your campus spot", icon: Bike },
  { key: "COMPLETED", label: "Order Fulfilled", desc: "Delivered & enjoyed", icon: Sparkles }
];

function TrackOrderContent() {
  const params = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get("order") || "");
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchStatus(refToLookup?: string) {
    const target = (refToLookup || orderNumber).trim();
    if (!target) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(target)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Order not found. Please check your reference.");
      }
      setOrderData(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to look up order.");
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initial = params.get("order");
    if (initial) {
      fetchStatus(initial);
    }
  }, [params]);

  const currentStageIndex = orderData
    ? STAGES.findIndex((s) => s.key === orderData.status)
    : -1;

  return (
    <div className="container-shell py-14 max-w-3xl">
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="eyebrow">Real-Time Kitchen & Delivery Radar</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2">
          Track Your Order
        </h1>
        <p className="text-zinc-400 text-sm mt-2">
          Enter your AYOTD order reference below to check exact preparation and delivery
          status.
        </p>

        {/* Search Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchStatus();
          }}
          className="panel p-2 mt-6 flex items-center gap-2 border-zinc-800 shadow-lg"
        >
          <input
            type="text"
            placeholder="e.g. AYOTD-98124011"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="bg-transparent border-0 px-4 text-sm font-mono uppercase tracking-wider focus:ring-0"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary text-xs font-bold px-6 py-3 shrink-0 flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            Track
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2 text-left">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {orderData && (
        <div className="panel p-6 sm:p-8 space-y-8 animate-fade-in border-zinc-800 shadow-2xl">
          {/* Top Order Badge Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block">
                ORDER REFERENCE
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-white">
                {orderData.order_number}
              </span>
              <div className="text-xs text-zinc-400 mt-1">
                Placed on {new Date(orderData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Fulfilment:{" "}
                <strong className="text-zinc-200">{orderData.fulfilment_type}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchStatus()}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5"
                title="Refresh live status"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
              </button>

              <div className="text-right">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-semibold">
                  PAYMENT STATUS
                </span>
                <span
                  className={`inline-block text-xs font-bold px-3 py-1 rounded-full mt-0.5 ${
                    orderData.payment_status === "PAID"
                      ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                      : "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                  }`}
                >
                  {orderData.payment_status} ({orderData.payment_method})
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div>
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-6">
              Order Lifecycle
            </h2>
            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-800">
              {STAGES.map((stage, idx) => {
                const Icon = stage.icon;
                const isCurrent = orderData.status === stage.key;
                const isPast = currentStageIndex > idx;
                const isFuture = currentStageIndex < idx;

                // Skip out-for-delivery stage if customer chose PICKUP
                if (orderData.fulfilment_type === "PICKUP" && stage.key === "OUT_FOR_DELIVERY") {
                  return null;
                }

                return (
                  <div key={stage.key} className="relative flex items-start gap-4">
                    {/* Node Indicator */}
                    <div
                      className={`absolute -left-6 top-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? "bg-red-600 ring-4 ring-red-950 text-white"
                          : isPast
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-800 text-zinc-600"
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-sm ${
                            isCurrent
                              ? "text-red-400"
                              : isPast
                              ? "text-zinc-200"
                              : "text-zinc-600"
                          }`}
                        >
                          {stage.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-red-950 text-red-300 border border-red-800/50 px-2 py-0.5 rounded-full font-semibold animate-pulse">
                            Active Stage
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs mt-0.5 ${
                          isCurrent
                            ? "text-zinc-300"
                            : isPast
                            ? "text-zinc-500"
                            : "text-zinc-600"
                        }`}
                      >
                        {stage.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Destination & Rider Info */}
          {orderData.fulfilment_type === "DELIVERY" && (
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Bike size={16} className="text-red-400" />
                <span>Campus Destination:</span>
                <strong className="text-white">
                  {orderData.delivery_address || "Campus Spot"}
                </strong>
              </div>

              {orderData.rider && (
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-500 block">Assigned Delivery Rider</span>
                    <span className="font-bold text-white text-sm">
                      {orderData.rider.name}
                    </span>
                  </div>
                  {orderData.rider.phone && (
                    <a
                      href={`tel:${orderData.rider.phone}`}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <Phone size={12} className="text-red-400" /> Call Rider
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Order Items List */}
          {orderData.items && orderData.items.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Meals Ordered
              </h3>
              <div className="divide-y divide-zinc-800/80 border-t border-b border-zinc-800">
                {orderData.items.map((item: any, i: number) => (
                  <div key={i} className="py-2.5 flex justify-between text-xs sm:text-sm">
                    <span className="text-zinc-200">
                      {item.quantity} × {item.item_name}
                    </span>
                    <span className="font-semibold text-zinc-400">
                      {kes(item.unit_price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-3 font-bold text-base text-white">
                <span>Grand Total</span>
                <span className="text-red-400">{kes(orderData.total_amount)}</span>
              </div>
            </div>
          )}

          {/* WhatsApp Support Button */}
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MessageCircle size={20} className="text-emerald-400 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-zinc-200">Need help with your order?</div>
                <div className="text-zinc-400">
                  Reach AYOTD kitchen support directly on WhatsApp.
                </div>
              </div>
            </div>
            <a
              href={`https://wa.me/254700000000?text=${encodeURIComponent(
                `Hello AYOTD Support, I am inquiring about my order ref ${orderData.order_number}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-xs px-4 py-2 flex items-center gap-2 hover:text-emerald-400"
            >
              <MessageCircle size={14} className="text-emerald-400" /> WhatsApp Support
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Suspense
          fallback={
            <div className="container-shell py-20 text-center text-zinc-500">
              <Loader2 size={24} className="animate-spin mx-auto mb-3" />
              Loading order tracking...
            </div>
          }
        >
          <TrackOrderContent />
        </Suspense>
      </main>
    </>
  );
}
