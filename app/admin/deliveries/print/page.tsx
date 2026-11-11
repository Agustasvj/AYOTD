"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { kes, formatDisplayPhone } from "@/lib/money";
import {
  Printer,
  ArrowLeft,
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter
} from "lucide-react";

export default function MasterDeliveryPrintPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [runnerName, setRunnerName] = useState<string>("");
  const [printDate, setPrintDate] = useState<string>("");

  async function loadDeliveryOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders?limit=100");
      const data = await res.json();
      const rawOrders = data.orders || [];

      // Filter only delivery orders
      const deliveries = rawOrders.filter(
        (o: any) => o.fulfilment_type === "DELIVERY"
      );

      setOrders(deliveries);

      // Select all by default
      const initialSelected: Record<string, boolean> = {};
      deliveries.forEach((o: any) => {
        initialSelected[o.id] = true;
      });
      setSelectedIds(initialSelected);
    } catch (e) {
      console.error("Failed to load delivery orders", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeliveryOrders();
    const now = new Date();
    setPrintDate(
      now.toLocaleDateString("en-KE", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    );
  }, []);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (statusFilter === "ACTIVE") {
        if (!["READY", "OUT_FOR_DELIVERY", "ACCEPTED", "PENDING"].includes(o.status)) {
          return false;
        }
      } else if (statusFilter === "DISPATCH_READY") {
        if (!["READY", "OUT_FOR_DELIVERY"].includes(o.status)) {
          return false;
        }
      } else if (statusFilter !== "ALL" && o.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = o.customer?.full_name?.toLowerCase().includes(q);
        const matchesPhone = o.customer?.phone?.toLowerCase().includes(q);
        const matchesAddress = o.delivery_address?.toLowerCase().includes(q);
        const matchesOrderNo = o.order_number?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesAddress && !matchesOrderNo) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // Orders selected for printing
  const printOrders = useMemo(() => {
    return filteredOrders.filter((o) => selectedIds[o.id] !== false);
  }, [filteredOrders, selectedIds]);

  // Totals calculations
  const stats = useMemo(() => {
    let totalCashToCollect = 0;
    let totalPrepaid = 0;
    let totalMealsCount = 0;

    printOrders.forEach((o) => {
      const isPaid = o.payment_status === "PAID";
      if (isPaid) {
        totalPrepaid += Number(o.total_amount) || 0;
      } else {
        totalCashToCollect += Number(o.total_amount) || 0;
      }

      (o.items || []).forEach((it: any) => {
        totalMealsCount += Number(it.quantity) || 1;
      });
    });

    return { totalCashToCollect, totalPrepaid, totalMealsCount };
  }, [printOrders]);

  function toggleSelectAll(selectAll: boolean) {
    const updated = { ...selectedIds };
    filteredOrders.forEach((o) => {
      updated[o.id] = selectAll;
    });
    setSelectedIds(updated);
  }

  function toggleOrder(id: string) {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  }

  function handleTriggerPrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 print:bg-white print:text-black">
      {/* ------------------------------------------------------------- */}
      {/* ON-SCREEN CONTROL BAR (Hidden when printing or saving as PDF) */}
      {/* ------------------------------------------------------------- */}
      <header className="print:hidden sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 px-4 sm:px-8 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/deliveries"
              className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
              title="Return to Deliveries Board"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-crimson-400 bg-crimson-950/80 px-2 py-0.5 rounded border border-crimson-800/60">
                  <Bike size={12} /> Delivery Operations
                </span>
                <span className="text-zinc-500 text-xs">• Run Sheet</span>
              </div>
              <h1 className="text-xl font-black text-white">
                Master Delivery Dispatch Run Sheet
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadDeliveryOrders}
              disabled={loading}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>

            <button
              onClick={handleTriggerPrint}
              disabled={printOrders.length === 0}
              className="px-5 py-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-crimson-950/60 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={16} /> Print / Save PDF ({printOrders.length})
            </button>
          </div>
        </div>

        {/* Filter and Selection Controls */}
        <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800">
              <Filter size={13} className="text-zinc-400" />
              <span className="text-zinc-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-white font-medium outline-none cursor-pointer"
              >
                <option value="ACTIVE" className="bg-zinc-900">Active (Pending/Ready/Out)</option>
                <option value="DISPATCH_READY" className="bg-zinc-900">Ready for Runner</option>
                <option value="OUT_FOR_DELIVERY" className="bg-zinc-900">Out for Delivery Only</option>
                <option value="ALL" className="bg-zinc-900">All Delivery Orders</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800 min-w-[220px]">
              <Search size={13} className="text-zinc-400" />
              <input
                type="text"
                placeholder="Search hostel, room, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white placeholder-zinc-500 outline-none w-full text-xs"
              />
            </div>

            {/* Runner Name (Optional for print header) */}
            <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800">
              <span className="text-zinc-400">Runner:</span>
              <input
                type="text"
                placeholder="e.g. Dennis (Bike #2)"
                value={runnerName}
                onChange={(e) => setRunnerName(e.target.value)}
                className="bg-transparent text-white placeholder-zinc-500 outline-none w-36 text-xs"
              />
            </div>
          </div>

          {/* Quick Select Toggles */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">
              Selected: <strong className="text-white">{printOrders.length}</strong> of {filteredOrders.length}
            </span>
            <button
              onClick={() => toggleSelectAll(true)}
              className="text-crimson-400 hover:text-crimson-300 underline font-medium"
            >
              Select All
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => toggleSelectAll(false)}
              className="text-zinc-400 hover:text-zinc-200 underline font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* THE PRINTABLE RUN SHEET (Designed for Paper & Screen)          */}
      {/* ------------------------------------------------------------- */}
      <main className="max-w-6xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        {loading ? (
          <div className="py-24 text-center text-zinc-500 print:hidden">
            <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-crimson-500" />
            <p className="font-semibold">Compiling delivery batch manifest...</p>
          </div>
        ) : printOrders.length === 0 ? (
          <div className="py-20 text-center border border-zinc-800 rounded-2xl bg-zinc-900/50 p-8 max-w-lg mx-auto print:hidden">
            <Bike size={44} className="mx-auto mb-3 text-zinc-600" />
            <h3 className="text-lg font-bold text-white">No delivery orders match your filters</h3>
            <p className="text-xs text-zinc-400 mt-1 mb-4">
              Change the status filter above or verify that customers have placed delivery orders.
            </p>
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setSearchQuery("");
                toggleSelectAll(true);
              }}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="bg-white text-zinc-950 p-6 sm:p-8 rounded-2xl shadow-2xl print:shadow-none print:p-0 print:rounded-none">
            {/* 1. DOCUMENT HEADER */}
            <div className="border-b-2 border-zinc-950 pb-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                      AYOTD Campus Dispatch
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      CONFIDENTIAL / RUNNER COPY
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 mt-1">
                    A YEAR OR TWO DELICACIES
                  </h1>
                  <p className="text-xs text-zinc-600 font-medium">
                    Master Delivery Run Sheet & Fulfillment Manifest
                  </p>
                </div>

                <div className="text-left sm:text-right text-xs">
                  <div className="font-bold text-zinc-900">
                    Date & Time: <span className="font-mono font-normal">{printDate || "Generated Now"}</span>
                  </div>
                  <div className="text-zinc-600 mt-0.5">
                    Assigned Runner:{" "}
                    <strong className="text-zinc-900 font-mono">
                      {runnerName.trim() ? runnerName : "___________________________"}
                    </strong>
                  </div>
                  <div className="text-zinc-500 text-[11px] mt-0.5">
                    Batch Total: <strong>{printOrders.length} Drops</strong> ({stats.totalMealsCount} meals)
                  </div>
                </div>
              </div>

              {/* 2. DISPATCH FINANCIAL SUMMARY STRIP */}
              <div className="mt-4 grid grid-cols-3 gap-3 bg-zinc-100 p-3 rounded-lg border border-zinc-300 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    Total Stops / Orders
                  </div>
                  <div className="text-base font-black text-zinc-900">
                    {printOrders.length} Deliveries
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    Total Pre-paid (M-Pesa)
                  </div>
                  <div className="text-base font-black text-emerald-800">
                    {kes(stats.totalPrepaid)}
                  </div>
                </div>

                <div className="bg-amber-100/70 -m-1 p-2 rounded border border-amber-300">
                  <div className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">
                    💵 Cash to Collect at Door
                  </div>
                  <div className="text-base font-black text-amber-950">
                    {kes(stats.totalCashToCollect)}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. CONSOLIDATED ORDERS LIST */}
            <div className="space-y-4">
              {printOrders.map((order, index) => {
                const isPaid = order.payment_status === "PAID";
                const isSelected = selectedIds[order.id] !== false;

                return (
                  <div
                    key={order.id}
                    className="border-2 border-zinc-300 rounded-xl p-4 break-inside-avoid page-break-inside-avoid relative hover:border-zinc-400 transition"
                  >
                    {/* On-screen Checkbox to include/exclude */}
                    <div className="print:hidden absolute top-3 right-3 flex items-center gap-2">
                      <label className="text-xs text-zinc-600 flex items-center gap-1.5 cursor-pointer bg-zinc-100 px-2 py-1 rounded border border-zinc-200">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOrder(order.id)}
                          className="rounded text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <span>Include</span>
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-zinc-200">
                      {/* Left: Stop Number & Order Number */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 text-white font-black text-sm flex items-center justify-center shrink-0">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-base text-zinc-950 tracking-tight">
                              {order.order_number}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-200 text-zinc-800 px-1.5 py-0.5 rounded">
                              {order.status}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-500">
                            Ordered: {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>

                      {/* Right: Payment Status Badge */}
                      <div className="sm:text-right pr-0 sm:pr-24 print:pr-0">
                        {isPaid ? (
                          <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md">
                            <CheckCircle2 size={13} />
                            <span>PAID (M-PESA) — {kes(order.total_amount)}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-950 bg-amber-200 border-2 border-amber-400 px-3 py-1 rounded-md animate-pulse print:animate-none">
                            <AlertTriangle size={13} className="text-amber-800" />
                            <span>⚠️ COLLECT CASH: {kes(order.total_amount)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle Grid: Customer, Location, and Order Details */}
                    <div className="grid md:grid-cols-12 gap-4 mt-3 text-xs">
                      {/* Customer Details: Name & Phone (4 cols) */}
                      <div className="md:col-span-4 space-y-1.5 border-b md:border-b-0 md:border-r border-zinc-200 pb-3 md:pb-0 md:pr-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Customer
                        </div>
                        <div className="font-black text-sm text-zinc-950 flex items-center gap-1.5">
                          <User size={14} className="text-zinc-700 shrink-0" />
                          <span>{order.customer?.full_name || "Guest Customer"}</span>
                        </div>
                        <div className="font-mono font-bold text-sm text-red-700 flex items-center gap-1.5">
                          <Phone size={14} className="text-zinc-700 shrink-0" />
                          <span>{formatDisplayPhone(order.customer?.phone || "")}</span>
                        </div>
                      </div>

                      {/* Delivery Location & Instructions (4 cols) */}
                      <div className="md:col-span-4 space-y-1 border-b md:border-b-0 md:border-r border-zinc-200 pb-3 md:pb-0 md:pr-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                          <MapPin size={11} /> Delivery Location
                        </div>
                        <div className="font-black text-sm text-zinc-950 leading-snug">
                          {order.delivery_address || "No address provided"}
                        </div>
                        {order.instructions && (
                          <div className="text-[11px] font-medium text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                            <strong>Note:</strong> &ldquo;{order.instructions}&rdquo;
                          </div>
                        )}
                      </div>

                      {/* What was ordered (4 cols) */}
                      <div className="md:col-span-4 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                          <ShoppingBag size={11} /> What Was Ordered
                        </div>
                        <ul className="space-y-1 mt-1">
                          {(order.items || []).map((item: any, idx: number) => (
                            <li
                              key={idx}
                              className="flex items-start justify-between gap-2 text-xs font-semibold text-zinc-900 bg-zinc-50 p-1 rounded"
                            >
                              <span>
                                <strong className="text-red-700 font-mono">{item.quantity}x</strong>{" "}
                                {item.item_name}
                              </span>
                              <span className="font-mono text-zinc-600 text-[11px] shrink-0">
                                {kes(item.subtotal || item.unit_price * item.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <div className="pt-1.5 border-t border-zinc-200 flex justify-between items-center text-xs font-black text-zinc-950">
                          <span>Grand Total:</span>
                          <span className="font-mono text-sm">{kes(order.total_amount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Handover & Signature Section for Runner */}
                    <div className="mt-3 pt-2.5 border-t border-dashed border-zinc-300 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 rounded text-zinc-900" />
                          <span>Dropped off to customer</span>
                        </label>
                        {!isPaid && (
                          <label className="flex items-center gap-1.5 font-bold text-amber-900 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded text-amber-900" />
                            <span>Cash received ({kes(order.total_amount)})</span>
                          </label>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500">Delivered Time: ____:____</span>
                        <span className="text-zinc-500">
                          Customer Sig / Room verify: ________________________
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 4. DOCUMENT FOOTER */}
            <div className="mt-8 pt-4 border-t-2 border-zinc-950 text-xs text-zinc-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <strong>Runner Instructions:</strong> Please call customer before knocking. If phone is unreachable, wait 5 minutes before logging note.
              </div>
              <div className="text-right font-mono text-[11px]">
                AYOTD Kitchen Hotline: <strong>0700 000 000</strong>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Print-specific CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header,
          nav,
          footer,
          .print\\:hidden {
            display: none !important;
          }
          .page-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
