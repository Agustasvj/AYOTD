"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { kes } from "@/lib/money";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ChefHat,
  Bike,
  PackageCheck,
  CreditCard,
  Phone,
  MapPin,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  UserCheck,
  Printer
} from "lucide-react";

const STATUS_TABS = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED"
] as const;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [riders, setRiders] = useState<any[]>([]);
  const [assignRiderId, setAssignRiderId] = useState("");

  async function loadOrders() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (activeTab !== "ALL") q.set("status", activeTab);
      if (sourceFilter !== "ALL") q.set("source", sourceFilter);
      if (search.trim()) q.set("search", search.trim());

      const res = await fetch(`/api/admin/orders?${q.toString()}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    // Fetch delivery riders list for quick assignment
    fetch("/api/admin/riders")
      .then((r) => r.json())
      .then((d) => setRiders(d.riders || []))
      .catch(() => {});
  }, [activeTab, sourceFilter]);

  async function handleStatusChange(orderId: string, newStatus: string, note?: string) {
    setActionBusy(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          note: note || `Order updated to ${newStatus} by admin`,
          cancellationReason: newStatus === "CANCELLED" ? note : undefined
        })
      });
      if (res.ok) {
        await loadOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
        }
      }
    } finally {
      setActionBusy(null);
      setCancelModalOrder(null);
      setCancelReason("");
    }
  }

  async function handleAssignRider(orderId: string, riderId: string) {
    if (!riderId) return;
    setActionBusy(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId })
      });
      if (res.ok) {
        await loadOrders();
      }
    } finally {
      setActionBusy(null);
    }
  }

  async function handleConfirmCash(paymentId: string, orderId: string) {
    setActionBusy(orderId);
    try {
      const res = await fetch("/api/admin/payments/cash/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, orderId, staffName: "Admin Staff" })
      });
      if (res.ok) {
        await loadOrders();
      }
    } finally {
      setActionBusy(null);
    }
  }

  async function handleTriggerSTK(orderId: string, phone: string, amount: number) {
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="eyebrow">Central Queue</div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            Order Management
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Accept, prepare, assign campus riders, and track payments across all channels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadOrders()}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5"
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <Link
            href="/admin/orders/new"
            className="btn-primary text-xs px-4 py-2.5 flex items-center gap-1.5 font-bold"
          >
            <PlusCircle size={15} /> + Record Manual Order
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
              activeTab === tab
                ? "bg-red-700 border-red-600 text-white shadow-md shadow-red-950"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Search & Channel Filter Bar */}
      <div className="panel p-4 border-zinc-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by order number (AYOTD-...) or delivery location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadOrders()}
            className="pl-10 text-xs sm:text-sm py-2.5 rounded-xl bg-zinc-900 border-zinc-800"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-xs sm:text-sm py-2.5 rounded-xl bg-zinc-900 border-zinc-800"
          >
            <option value="ALL">All Sources</option>
            <option value="WEBSITE">Website Orders</option>
            <option value="WHATSAPP_GROUP">WhatsApp Groups</option>
            <option value="WHATSAPP_DM">WhatsApp Direct</option>
            <option value="PHONE_CALL">Phone Call</option>
            <option value="WALK_IN">Walk-In Customer</option>
          </select>
        </div>

        <button
          onClick={() => loadOrders()}
          className="btn-secondary text-xs px-4 py-2.5 whitespace-nowrap"
        >
          Search
        </button>
      </div>

      {/* Orders Table */}
      <section className="panel overflow-hidden border-zinc-800">
        {loading ? (
          <div className="p-16 text-center text-zinc-500 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading orders queue...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <CheckCircle2 size={36} className="mx-auto mb-3 text-zinc-600" />
            <h3 className="font-bold text-zinc-300">No orders in this view</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Select another status tab or record a manual order.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                  <th className="p-4 font-semibold">Order</th>
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">Fulfilment</th>
                  <th className="p-4 font-semibold">Items</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Payment</th>
                  <th className="p-4 font-semibold text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {orders.map((o) => {
                  const isBusy = actionBusy === o.id;
                  const payment = o.payments?.[0];

                  return (
                    <tr key={o.id} className="hover:bg-zinc-900/40 transition">
                      {/* Order Ref & Source */}
                      <td className="p-4">
                        <div className="font-mono font-bold text-white">
                          {o.order_number}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{" "}
                          <span className="text-red-400 font-semibold">{o.source.replace("_", " ")}</span>
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="p-4">
                        <div className="font-medium text-zinc-200">
                          {o.customer?.full_name || "Guest Customer"}
                        </div>
                        <div className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
                          <Phone size={11} className="text-zinc-500" />
                          <a href={`tel:${o.customer?.phone}`} className="hover:underline">
                            {o.customer?.phone || "No phone"}
                          </a>
                        </div>
                      </td>

                      {/* Fulfilment */}
                      <td className="p-4">
                        <div className="font-semibold text-xs text-white">
                          {o.fulfilment_type}
                        </div>
                        {o.fulfilment_type === "DELIVERY" && (
                          <div className="text-xs text-zinc-400 truncate max-w-xs flex items-center gap-1 mt-0.5" title={o.delivery_address || ""}>
                            <MapPin size={11} className="text-red-400 shrink-0" />
                            <span>{o.delivery_address || "Campus Spot"}</span>
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="p-4">
                        <div className="text-xs text-zinc-300">
                          {o.items && o.items.length > 0 ? (
                            o.items.map((it: any, i: number) => (
                              <div key={i} className="truncate max-w-[200px]">
                                {it.quantity} × {it.item_name}
                              </div>
                            ))
                          ) : (
                            <span className="text-zinc-500">1 meal package</span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-red-400 mt-1">
                          {kes(o.total_amount)}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            o.status === "PENDING"
                              ? "bg-amber-950/80 text-amber-300 border border-amber-800/60 animate-pulse"
                              : o.status === "ACCEPTED"
                              ? "bg-blue-950/80 text-blue-300 border border-blue-800/60"
                              : o.status === "PREPARING"
                              ? "bg-orange-950/80 text-orange-300 border border-orange-800/60"
                              : o.status === "READY"
                              ? "bg-purple-950/80 text-purple-300 border border-purple-800/60"
                              : o.status === "OUT_FOR_DELIVERY"
                              ? "bg-indigo-950/80 text-indigo-300 border border-indigo-800/60"
                              : o.status === "COMPLETED"
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {o.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold ${
                              o.payment_status === "PAID"
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }`}
                          >
                            {o.payment_status}
                          </span>
                        </div>
                        {payment && (
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            {payment.method} {payment.transaction_reference && `(${payment.transaction_reference})`}
                          </div>
                        )}
                        {o.payment_status !== "PAID" && payment?.method === "CASH" && (
                          <button
                            onClick={() => handleConfirmCash(payment.id, o.id)}
                            disabled={isBusy}
                            className="mt-1 text-[11px] text-emerald-400 hover:underline block font-semibold"
                          >
                            ✓ Confirm Cash
                          </button>
                        )}
                        {o.payment_status !== "PAID" && o.customer?.phone && (
                          <button
                            onClick={() =>
                              handleTriggerSTK(o.id, o.customer.phone, o.total_amount)
                            }
                            disabled={isBusy}
                            className="mt-0.5 text-[11px] text-red-400 hover:underline block"
                          >
                            Prompt M-Pesa STK
                          </button>
                        )}
                      </td>

                      {/* Fast Action Buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {o.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleStatusChange(o.id, "ACCEPTED")}
                                disabled={isBusy}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => setCancelModalOrder(o)}
                                disabled={isBusy}
                                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-rose-950 text-rose-300 text-xs"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {o.status === "ACCEPTED" && (
                            <button
                              onClick={() => handleStatusChange(o.id, "PREPARING")}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg bg-orange-700 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1"
                            >
                              <ChefHat size={13} /> Start Prep
                            </button>
                          )}

                          {o.status === "PREPARING" && (
                            <button
                              onClick={() => handleStatusChange(o.id, "READY")}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1"
                            >
                              <PackageCheck size={13} /> Mark Ready
                            </button>
                          )}

                          {o.status === "READY" && o.fulfilment_type === "DELIVERY" && (
                            <div className="flex items-center gap-1">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAssignRider(o.id, e.target.value);
                                    handleStatusChange(o.id, "OUT_FOR_DELIVERY");
                                  }
                                }}
                                className="text-xs py-1 px-2 rounded-lg bg-zinc-800 border-zinc-700 text-zinc-300"
                              >
                                <option value="" disabled>Assign Rider</option>
                                {riders.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.full_name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleStatusChange(o.id, "OUT_FOR_DELIVERY")}
                                disabled={isBusy}
                                className="px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-1"
                              >
                                <Bike size={13} /> Dispatch
                              </button>
                            </div>
                          )}

                          {o.status === "READY" && o.fulfilment_type === "PICKUP" && (
                            <button
                              onClick={() => handleStatusChange(o.id, "COMPLETED")}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
                            >
                              <CheckCircle2 size={13} /> Customer Collected
                            </button>
                          )}

                          {o.status === "OUT_FOR_DELIVERY" && (
                            <button
                              onClick={() => handleStatusChange(o.id, "COMPLETED")}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
                            >
                              <CheckCircle2 size={13} /> Delivered
                            </button>
                          )}

                          {/* Print Delivery Slip Link */}
                          <Link
                            href={`/admin/orders/${o.id}/print`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                            title="Print Delivery Slip / PDF"
                          >
                            <Printer size={13} />
                          </Link>

                          {/* Cancellation Button for active orders */}
                          {!["COMPLETED", "CANCELLED", "REJECTED"].includes(o.status) && (
                            <button
                              onClick={() => setCancelModalOrder(o)}
                              className="p-1 rounded text-zinc-500 hover:text-rose-400"
                              title="Cancel order"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cancel Order Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="panel p-6 max-w-md w-full border-zinc-800 space-y-4">
            <h3 className="font-bold text-lg text-white">
              Cancel Order {cancelModalOrder.order_number}
            </h3>
            <p className="text-xs text-zinc-400">
              Provide a reason for the cancellation. This is recorded in the status audit log.
            </p>
            <textarea
              required
              rows={3}
              placeholder="e.g. Out of stock, customer requested cancellation, unreachable phone..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  handleStatusChange(
                    cancelModalOrder.id,
                    "CANCELLED",
                    cancelReason || "Cancelled by admin"
                  )
                }
                className="btn-primary bg-rose-700 hover:bg-rose-600 text-xs px-4 py-2"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
