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
  Filter,
  SlidersHorizontal
} from "lucide-react";

export default function MasterDeliveryPrintPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [runnerName, setRunnerName] = useState<string>("");
  const [printDate, setPrintDate] = useState<string>("");
  const [printOrientation, setPrintOrientation] = useState<"landscape" | "portrait">("landscape");

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
      <header className="print:hidden sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 px-3 sm:px-6 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-crimson-400 bg-crimson-950/80 px-2 py-0.5 rounded border border-crimson-800/60">
                  <Bike size={12} /> Campus Logistics
                </span>
                <span className="text-zinc-500 text-xs hidden sm:inline">• Run Sheet</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white">
                Delivery Run Sheet (Compact Single-Page PDF)
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 text-xs">
              <span className="text-zinc-400">Page:</span>
              <button
                type="button"
                onClick={() => setPrintOrientation("landscape")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  printOrientation === "landscape"
                    ? "bg-crimson-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Landscape (Table)
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation("portrait")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  printOrientation === "portrait"
                    ? "bg-crimson-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Portrait
              </button>
            </div>

            <button
              onClick={loadDeliveryOrders}
              disabled={loading}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>

            <button
              onClick={handleTriggerPrint}
              disabled={printOrders.length === 0}
              className="px-4 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-crimson-950/60 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Printer size={15} /> Print / Save PDF ({printOrders.length})
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
              <Filter size={12} className="text-zinc-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-white font-medium outline-none cursor-pointer text-xs"
              >
                <option value="ACTIVE" className="bg-zinc-900">Active (Pending/Ready/Out)</option>
                <option value="DISPATCH_READY" className="bg-zinc-900">Ready for Runner</option>
                <option value="OUT_FOR_DELIVERY" className="bg-zinc-900">Out for Delivery</option>
                <option value="ALL" className="bg-zinc-900">All Today</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 flex-1 sm:flex-initial min-w-[180px]">
              <Search size={12} className="text-zinc-400" />
              <input
                type="text"
                placeholder="Search hostel or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white placeholder-zinc-500 outline-none w-full text-xs"
              />
            </div>

            <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
              <span className="text-zinc-400 text-[11px]">Runner:</span>
              <input
                type="text"
                placeholder="Runner name..."
                value={runnerName}
                onChange={(e) => setRunnerName(e.target.value)}
                className="bg-transparent text-white placeholder-zinc-500 outline-none w-28 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-zinc-400 text-[11px]">
            <span>
              Selected: <strong className="text-white">{printOrders.length}</strong> of {filteredOrders.length}
            </span>
            <span className="text-zinc-700">|</span>
            <button onClick={() => toggleSelectAll(true)} className="text-crimson-400 hover:underline">
              Select All
            </button>
            <span className="text-zinc-700">|</span>
            <button onClick={() => toggleSelectAll(false)} className="hover:underline">
              Deselect All
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* COMPACT PRINTABLE RUN SHEET (Table Format - 1 Page Capacity)   */}
      {/* ------------------------------------------------------------- */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 print:p-0 print:max-w-none">
        {loading ? (
          <div className="py-20 text-center text-zinc-500 print:hidden">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-crimson-500" />
            <p className="text-xs font-semibold">Loading delivery orders...</p>
          </div>
        ) : printOrders.length === 0 ? (
          <div className="py-16 text-center border border-zinc-800 rounded-xl bg-zinc-900/50 p-6 max-w-md mx-auto print:hidden">
            <Bike size={36} className="mx-auto mb-2 text-zinc-600" />
            <h3 className="text-sm font-bold text-white">No delivery orders found</h3>
            <p className="text-xs text-zinc-400 mt-1 mb-3">
              No orders match the selected filter.
            </p>
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setSearchQuery("");
                toggleSelectAll(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="bg-white text-zinc-950 p-4 sm:p-5 rounded-xl shadow-xl print:shadow-none print:p-0 print:rounded-none">
            {/* 1. TIGHT PRINT HEADER (Takes ~25mm on Paper) */}
            <div className="border-b-2 border-zinc-950 pb-2 mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                      AYOTD CAMPUS DISPATCH
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      DELIVERY RUN SHEET
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-zinc-950 mt-0.5">
                    A YEAR OR TWO DELICACIES
                  </h1>
                </div>

                <div className="text-right text-[11px] leading-tight">
                  <div>
                    <strong className="text-zinc-900">Date:</strong>{" "}
                    <span className="font-mono">{printDate || "Today"}</span>
                  </div>
                  <div className="mt-0.5">
                    <strong className="text-zinc-900">Runner:</strong>{" "}
                    <span className="font-mono font-bold text-zinc-950">
                      {runnerName.trim() ? runnerName : "_____________________"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. COMPACT SUMMARY STRIP (Single Line) */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 bg-zinc-100 px-2.5 py-1.5 rounded border border-zinc-300 text-[11px]">
                <div className="flex items-center gap-4">
                  <span>
                    Stops: <strong className="text-zinc-950 font-bold">{printOrders.length} Drops</strong> ({stats.totalMealsCount} meals)
                  </span>
                  <span className="text-zinc-400">|</span>
                  <span>
                    Pre-paid (M-Pesa): <strong className="text-emerald-800 font-bold">{kes(stats.totalPrepaid)}</strong>
                  </span>
                </div>

                <div className="bg-amber-200/80 px-2 py-0.5 rounded border border-amber-400 font-extrabold text-amber-950">
                  💵 Cash to Collect at Door: {kes(stats.totalCashToCollect)}
                </div>
              </div>
            </div>

            {/* 3. ULTRA-DENSE RUN SHEET TABLE (Squeezes all orders onto 1 page) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-zinc-400 text-[11px] leading-snug">
                <thead>
                  <tr className="bg-zinc-200 text-zinc-900 font-black uppercase text-[10px] tracking-wider border-b-2 border-zinc-400">
                    <th className="p-1.5 border border-zinc-400 w-8 text-center print:hidden">
                      <input
                        type="checkbox"
                        checked={printOrders.length === filteredOrders.length}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="rounded"
                        title="Toggle selection"
                      />
                    </th>
                    <th className="p-1.5 border border-zinc-400 w-8 text-center">#</th>
                    <th className="p-1.5 border border-zinc-400 w-28">Order #</th>
                    <th className="p-1.5 border border-zinc-400 w-44">Customer & Phone</th>
                    <th className="p-1.5 border border-zinc-400">Delivery Location & Room</th>
                    <th className="p-1.5 border border-zinc-400 w-52">Items Ordered</th>
                    <th className="p-1.5 border border-zinc-400 w-40 text-center">Payment Status / Due</th>
                    <th className="p-1.5 border border-zinc-400 w-36 text-center">Fulfillment Sign-off</th>
                  </tr>
                </thead>
                <tbody>
                  {printOrders.map((order, idx) => {
                    const isPaid = order.payment_status === "PAID";
                    const isSelected = selectedIds[order.id] !== false;

                    // Concise items summary: e.g. "2x Pilau, 1x Juice"
                    const itemsText = (order.items || [])
                      .map((it: any) => `${it.quantity}x ${it.item_name}`)
                      .join("; ");

                    return (
                      <tr
                        key={order.id}
                        className={`border-b border-zinc-300 page-break-inside-avoid hover:bg-zinc-50 ${
                          !isPaid ? "bg-amber-50/40" : ""
                        }`}
                      >
                        {/* Checkbox (Screen only) */}
                        <td className="p-1.5 border border-zinc-300 text-center print:hidden">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOrder(order.id)}
                            className="rounded text-red-600 cursor-pointer"
                          />
                        </td>

                        {/* Stop # */}
                        <td className="p-1.5 border border-zinc-300 text-center font-black text-xs text-zinc-900">
                          {idx + 1}
                        </td>

                        {/* Order Number & Time */}
                        <td className="p-1.5 border border-zinc-300">
                          <div className="font-mono font-black text-zinc-950 text-[11px]">
                            {order.order_number}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        </td>

                        {/* Customer & Phone */}
                        <td className="p-1.5 border border-zinc-300">
                          <div className="font-bold text-zinc-950 text-xs">
                            {order.customer?.full_name || "Customer"}
                          </div>
                          <div className="font-mono font-bold text-red-700 text-[11px]">
                            {formatDisplayPhone(order.customer?.phone || "")}
                          </div>
                        </td>

                        {/* Location & Instructions */}
                        <td className="p-1.5 border border-zinc-300">
                          <div className="font-black text-zinc-950 text-xs">
                            {order.delivery_address || "Campus Spot"}
                          </div>
                          {order.instructions && (
                            <div className="text-[10px] text-zinc-600 italic mt-0.5">
                              Note: &ldquo;{order.instructions}&rdquo;
                            </div>
                          )}
                        </td>

                        {/* What was ordered */}
                        <td className="p-1.5 border border-zinc-300">
                          <div className="font-medium text-zinc-900 text-[11px] leading-tight">
                            {itemsText || "Standard portion"}
                          </div>
                        </td>

                        {/* Payment Status & Amount Due */}
                        <td className="p-1.5 border border-zinc-300 text-center">
                          {isPaid ? (
                            <div className="inline-block bg-emerald-100 border border-emerald-300 text-emerald-900 font-extrabold px-2 py-0.5 rounded text-[10px]">
                              ✓ PAID ({kes(order.total_amount)})
                            </div>
                          ) : (
                            <div className="inline-block bg-amber-200 border-2 border-amber-400 text-amber-950 font-black px-2 py-0.5 rounded text-[10px]">
                              💵 COLLECT: {kes(order.total_amount)}
                            </div>
                          )}
                        </td>

                        {/* Runner Handover / Sign-off Column */}
                        <td className="p-1.5 border border-zinc-300 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block w-3.5 h-3.5 border border-zinc-600 rounded-sm" />
                            <span className="text-zinc-600 font-medium">Delivered</span>
                          </div>
                          <div className="text-zinc-400 text-[9px] mt-0.5">
                            Sign: ____________
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4. COMPACT FOOTER */}
            <div className="mt-3 pt-2 border-t border-zinc-400 text-[10px] text-zinc-600 flex justify-between items-center">
              <div>
                <strong>Runner Instructions:</strong> Call customer when arriving. Collect exact cash for unpaid orders.
              </div>
              <div className="font-mono">
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
            size: ${printOrientation === "landscape" ? "A4 landscape" : "A4 portrait"};
            margin: 6mm;
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
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>
    </div>
  );
}
