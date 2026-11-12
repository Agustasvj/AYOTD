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
  Calendar,
  Bookmark,
  History,
  Trash2,
  Check
} from "lucide-react";

interface SavedManifestSnapshot {
  id: string;
  savedAt: string;
  title: string;
  dateLabel: string;
  runnerName: string;
  orderIds: string[];
  stopsCount: number;
  mealsCount: number;
  cashToCollect: number;
  prepaid: number;
}

export default function MasterDeliveryPrintPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRiderId, setSelectedRiderId] = useState<string>("ALL");
  const [runnerName, setRunnerName] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("TODAY");
  const [customDate, setCustomDate] = useState<string>("");
  const [printDateFormatted, setPrintDateFormatted] = useState<string>("");
  const [printOrientation, setPrintOrientation] = useState<"landscape" | "portrait">("landscape");
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [savedManifests, setSavedManifests] = useState<SavedManifestSnapshot[]>([]);
  const [saveToast, setSaveToast] = useState(false);

  // Format date helper: "dd/mm/yy:0000hrs"
  function getTimestampFormatted(d = new Date()) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return {
      display: `${dd}/${mm}/${yy}:${hh}${min}hrs`,
      filename: `${dd}-${mm}-${yy}_${hh}${min}hrs`
    };
  }

  async function loadData() {
    setLoading(true);
    try {
      const [ordersRes, ridersRes] = await Promise.all([
        fetch("/api/admin/orders?limit=100"),
        fetch("/api/admin/riders")
      ]);

      const ordersData = await ordersRes.json();
      const ridersData = await ridersRes.json();

      const rawOrders = ordersData.orders || [];
      const deliveries = rawOrders.filter(
        (o: any) => o.fulfilment_type === "DELIVERY"
      );

      setOrders(deliveries);
      setRiders(ridersData.riders || []);

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
    loadData();
    const stamps = getTimestampFormatted();
    setPrintDateFormatted(stamps.display);

    // Load saved manifests from localStorage
    try {
      const stored = localStorage.getItem("ayotd_saved_manifests");
      if (stored) {
        setSavedManifests(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Filtered orders list (Screen view)
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    return orders.filter((o) => {
      // 1. Date filter
      const orderDateStr = o.created_at ? o.created_at.slice(0, 10) : "";
      if (dateFilter === "TODAY") {
        // If demo data or today, keep if matches todayStr or demo
        if (orderDateStr && orderDateStr !== todayStr) {
          // Allow fallback orders if testing today
          const isRecent = Math.abs(Date.now() - new Date(o.created_at).getTime()) < 24 * 3600 * 1000;
          if (!isRecent) return false;
        }
      } else if (dateFilter === "YESTERDAY") {
        if (orderDateStr !== yesterdayStr) return false;
      } else if (dateFilter === "CUSTOM" && customDate) {
        if (orderDateStr !== customDate) return false;
      }

      // 2. Rider filter
      if (selectedRiderId !== "ALL") {
        const orderRiderId = o.delivery?.rider_id;
        if (orderRiderId && orderRiderId !== selectedRiderId) {
          return false;
        }
      }

      // 3. Status filter
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

      // 4. Search query
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
  }, [orders, dateFilter, customDate, selectedRiderId, statusFilter, searchQuery]);

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
      [id]: prev[id] === false ? true : false
    }));
  }

  function handleRiderChange(riderId: string) {
    setSelectedRiderId(riderId);
    if (riderId === "ALL") {
      setRunnerName("");
    } else {
      const found = riders.find((r) => r.id === riderId);
      if (found) {
        setRunnerName(found.full_name);
      }
    }
  }

  // Trigger Print with sanitized filename: dd-mm-yy_0000hrs
  function handleTriggerPrint() {
    const stamps = getTimestampFormatted();
    setPrintDateFormatted(stamps.display);

    const prevTitle = document.title;
    // Set document.title so browser Save as PDF uses this exact filename
    document.title = stamps.filename;
    window.print();

    // Revert page title after print dialog closes
    setTimeout(() => {
      document.title = prevTitle;
    }, 1500);
  }

  // Save current manifest snapshot to system archive
  function saveManifestSnapshot() {
    const stamps = getTimestampFormatted();
    const effectiveRunner = runnerName.trim() || (selectedRiderId !== "ALL" ? riders.find(r => r.id === selectedRiderId)?.full_name : "All Active Runners");

    const newSnapshot: SavedManifestSnapshot = {
      id: `manifest-${Date.now()}`,
      savedAt: new Date().toISOString(),
      title: `${effectiveRunner} — ${stamps.display}`,
      dateLabel: stamps.display,
      runnerName: effectiveRunner || "Campus Runner",
      orderIds: printOrders.map((o) => o.id),
      stopsCount: printOrders.length,
      mealsCount: stats.totalMealsCount,
      cashToCollect: stats.totalCashToCollect,
      prepaid: stats.totalPrepaid
    };

    const updated = [newSnapshot, ...savedManifests.slice(0, 49)];
    setSavedManifests(updated);
    try {
      localStorage.setItem("ayotd_saved_manifests", JSON.stringify(updated));
    } catch {}

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  }

  function restoreManifestSnapshot(snap: SavedManifestSnapshot) {
    const targetSet = new Set(snap.orderIds);
    const updated: Record<string, boolean> = {};
    orders.forEach((o) => {
      updated[o.id] = targetSet.has(o.id);
    });
    setSelectedIds(updated);
    setRunnerName(snap.runnerName);
    setArchiveModalOpen(false);
  }

  function deleteManifestSnapshot(id: string) {
    const updated = savedManifests.filter((m) => m.id !== id);
    setSavedManifests(updated);
    try {
      localStorage.setItem("ayotd_saved_manifests", JSON.stringify(updated));
    } catch {}
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
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
                <span className="text-zinc-500 text-xs hidden sm:inline">• Run Sheet & Manifest</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white">
                Delivery Run Sheet (Compact Single-Page PDF)
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setArchiveModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition"
              title="View saved past manifests"
            >
              <History size={14} className="text-amber-400" /> Saved Runs ({savedManifests.length})
            </button>

            <button
              type="button"
              onClick={saveManifestSnapshot}
              disabled={printOrders.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              title="Save current runner manifest to system archive"
            >
              <Bookmark size={14} className="text-crimson-400" /> Save Snapshot
            </button>

            <div className="hidden sm:flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 text-xs">
              <span className="text-zinc-400">Layout:</span>
              <button
                type="button"
                onClick={() => setPrintOrientation("landscape")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  printOrientation === "landscape"
                    ? "bg-crimson-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Landscape
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
              onClick={loadData}
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

        {/* Filters Bar: Date, Runner, Status, Search */}
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Selector */}
            <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
              <Calendar size={12} className="text-zinc-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-white font-medium outline-none cursor-pointer text-xs"
              >
                <option value="TODAY" className="bg-zinc-900">Today</option>
                <option value="YESTERDAY" className="bg-zinc-900">Yesterday</option>
                <option value="ALL" className="bg-zinc-900">All Dates</option>
                <option value="CUSTOM" className="bg-zinc-900">Pick Date...</option>
              </select>
              {dateFilter === "CUSTOM" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="bg-zinc-900 text-white border border-zinc-700 rounded px-1.5 py-0.5 text-xs outline-none"
                />
              )}
            </div>

            {/* Runner Dropdown */}
            <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
              <Bike size={12} className="text-zinc-400" />
              <select
                value={selectedRiderId}
                onChange={(e) => handleRiderChange(e.target.value)}
                className="bg-transparent text-white font-medium outline-none cursor-pointer text-xs max-w-[150px] truncate"
              >
                <option value="ALL" className="bg-zinc-900">All Runners</option>
                {riders.map((r) => (
                  <option key={r.id} value={r.id} className="bg-zinc-900">
                    {r.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Runner Custom Name Override (for print sheet) */}
            <div className="hidden lg:flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
              <span className="text-zinc-400 text-[11px]">Runner Label:</span>
              <input
                type="text"
                placeholder="Runner name..."
                value={runnerName}
                onChange={(e) => setRunnerName(e.target.value)}
                className="bg-transparent text-white placeholder-zinc-500 outline-none w-28 text-xs"
              />
            </div>

            {/* Status Filter */}
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
                <option value="ALL" className="bg-zinc-900">All Statuses</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 flex-1 sm:flex-initial min-w-[170px]">
              <Search size={12} className="text-zinc-400" />
              <input
                type="text"
                placeholder="Search hostel or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white placeholder-zinc-500 outline-none w-full text-xs"
              />
            </div>
          </div>

          {/* Selection counter & toggles */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-zinc-400 text-[11px]">
            <span>
              Printing: <strong className="text-white">{printOrders.length}</strong> of {filteredOrders.length}
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

        {/* Snapshot Save Toast */}
        {saveToast && (
          <div className="max-w-7xl mx-auto mt-2 bg-emerald-950/90 border border-emerald-800 text-emerald-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 animate-fade-in">
            <Check size={14} /> Manifest snapshot saved to system archive! You can refer back to it anytime.
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* SAVED MANIFESTS MODAL / DRAWER                                 */}
      {/* ------------------------------------------------------------- */}
      {archiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark size={18} className="text-crimson-400" />
                <h3 className="font-bold text-white text-base">Saved Manifest History</h3>
              </div>
              <button
                onClick={() => setArchiveModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {savedManifests.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs">
                  <Bookmark size={32} className="mx-auto mb-2 text-zinc-600" />
                  <p>No saved runner sheets yet.</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Click &ldquo;Save Snapshot&rdquo; on any run sheet to archive it for follow ups.
                  </p>
                </div>
              ) : (
                savedManifests.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{snap.runnerName}</span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          ({snap.dateLabel})
                        </span>
                      </div>
                      <div className="text-zinc-400 text-[11px] mt-1 flex items-center gap-3">
                        <span>{snap.stopsCount} stops ({snap.mealsCount} meals)</span>
                        <span className="text-emerald-400 font-medium">Prepaid: {kes(snap.prepaid)}</span>
                        <span className="text-amber-400 font-medium">Cash: {kes(snap.cashToCollect)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => restoreManifestSnapshot(snap)}
                        className="px-2.5 py-1.5 rounded-lg bg-crimson-900/60 hover:bg-crimson-800 text-crimson-200 font-semibold text-xs transition"
                      >
                        Load Sheet
                      </button>
                      <button
                        onClick={() => deleteManifestSnapshot(snap.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition"
                        title="Delete snapshot"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setArchiveModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* COMPACT PRINTABLE RUN SHEET (Isolated in #printable-manifest)   */}
      {/* ------------------------------------------------------------- */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 print:p-0 print:max-w-none">
        {loading ? (
          <div className="py-20 text-center text-zinc-500 print:hidden">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-crimson-500" />
            <p className="text-xs font-semibold">Loading delivery orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center border border-zinc-800 rounded-xl bg-zinc-900/50 p-6 max-w-md mx-auto print:hidden">
            <Bike size={36} className="mx-auto mb-2 text-zinc-600" />
            <h3 className="text-sm font-bold text-white">No delivery orders found</h3>
            <p className="text-xs text-zinc-400 mt-1 mb-3">
              No orders match the selected filters (Date: {dateFilter}, Runner: {selectedRiderId === "ALL" ? "All" : runnerName}).
            </p>
            <button
              onClick={() => {
                setDateFilter("ALL");
                setSelectedRiderId("ALL");
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
          <div
            id="printable-manifest"
            className="bg-white text-zinc-950 p-4 sm:p-5 rounded-xl shadow-xl print:shadow-none print:p-0 print:rounded-none"
          >
            {/* 1. TIGHT PRINT HEADER (Takes ~22mm on Paper) */}
            <div className="border-b-2 border-zinc-950 pb-2 mb-2.5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                      AYOTD CAMPUS DISPATCH
                    </span>
                    <span className="text-[10px] text-zinc-700 font-mono font-bold">
                      DELIVERY RUN SHEET
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-zinc-950 mt-0.5">
                    A YEAR OR TWO DELICACIES
                  </h1>
                </div>

                <div className="text-right text-[11px] leading-tight">
                  <div>
                    <strong className="text-zinc-900">Time:</strong>{" "}
                    <span className="font-mono font-bold text-zinc-950">{printDateFormatted}</span>
                  </div>
                  <div className="mt-0.5">
                    <strong className="text-zinc-900">Runner:</strong>{" "}
                    <span className="font-mono font-black text-zinc-950 uppercase">
                      {runnerName.trim()
                        ? runnerName
                        : selectedRiderId !== "ALL"
                        ? riders.find((r) => r.id === selectedRiderId)?.full_name || "Campus Runner"
                        : "Campus Runner Team"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. COMPACT SUMMARY STRIP (Single Line) */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 bg-zinc-100 px-2.5 py-1 rounded border border-zinc-300 text-[11px]">
                <div className="flex items-center gap-4">
                  <span>
                    Stops: <strong className="text-zinc-950 font-bold">{printOrders.length} Drops</strong> ({stats.totalMealsCount} meals)
                  </span>
                  <span className="text-zinc-400">|</span>
                  <span>
                    Pre-paid (M-Pesa): <strong className="text-emerald-800 font-bold">{kes(stats.totalPrepaid)}</strong>
                  </span>
                </div>

                <div className="bg-amber-200/90 px-2.5 py-0.5 rounded border border-amber-400 font-black text-amber-950">
                  💵 Cash to Collect at Door: {kes(stats.totalCashToCollect)}
                </div>
              </div>
            </div>

            {/* 3. ULTRA-DENSE RUN SHEET TABLE (Squeezes orders cleanly onto 1 page) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-zinc-400 text-[11px] leading-tight">
                <thead>
                  <tr className="bg-zinc-200 text-zinc-900 font-black uppercase text-[10px] tracking-wider border-b-2 border-zinc-400">
                    <th className="p-1 border border-zinc-400 w-8 text-center print:hidden">
                      <input
                        type="checkbox"
                        checked={printOrders.length === filteredOrders.length}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="rounded"
                        title="Toggle all for PDF"
                      />
                    </th>
                    <th className="p-1 border border-zinc-400 w-8 text-center">#</th>
                    <th className="p-1 border border-zinc-400 w-28">Order #</th>
                    <th className="p-1 border border-zinc-400 w-48">Customer & Phone</th>
                    <th className="p-1 border border-zinc-400">Delivery Location & Room</th>
                    <th className="p-1 border border-zinc-400 w-56">Items Ordered</th>
                    <th className="p-1 border border-zinc-400 w-44 text-center">Payment Status / Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, idx) => {
                    const isPaid = order.payment_status === "PAID";
                    const isSelected = selectedIds[order.id] !== false;

                    // Concise items summary: e.g. "2x Pilau, 1x Juice"
                    const itemsText = (order.items || [])
                      .map((it: any) => `${it.quantity}x ${it.item_name}`)
                      .join("; ");

                    return (
                      <tr
                        key={order.id}
                        className={`border-b border-zinc-300 page-break-inside-avoid ${
                          !isSelected
                            ? "opacity-35 bg-zinc-100/70 text-zinc-400 print:hidden"
                            : !isPaid
                            ? "bg-amber-50/40 hover:bg-zinc-50"
                            : "hover:bg-zinc-50"
                        }`}
                      >
                        {/* Checkbox (Screen only: Unchecking omits from PDF without vanishing from screen) */}
                        <td className="p-1 border border-zinc-300 text-center print:hidden">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOrder(order.id)}
                            className="rounded text-red-600 cursor-pointer"
                            title={isSelected ? "Uncheck to omit from PDF" : "Check to include in PDF"}
                          />
                        </td>

                        {/* Stop # */}
                        <td className="p-1 border border-zinc-300 text-center font-black text-xs text-zinc-900">
                          {idx + 1}
                        </td>

                        {/* Order Number & Time */}
                        <td className="p-1 border border-zinc-300">
                          <div className="font-mono font-black text-zinc-950 text-[11px]">
                            {order.order_number}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-medium">
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        </td>

                        {/* Customer & Phone */}
                        <td className="p-1 border border-zinc-300">
                          <div className="font-bold text-zinc-950 text-xs">
                            {order.customer?.full_name || "Customer"}
                          </div>
                          <div className="font-mono font-bold text-red-700 text-[11px]">
                            {formatDisplayPhone(order.customer?.phone || "")}
                          </div>
                        </td>

                        {/* Location & Instructions */}
                        <td className="p-1 border border-zinc-300">
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
                        <td className="p-1 border border-zinc-300">
                          <div className="font-medium text-zinc-900 text-[11px] leading-tight">
                            {itemsText || "Standard portion"}
                          </div>
                        </td>

                        {/* Payment Status & Amount Due */}
                        <td className="p-1 border border-zinc-300 text-center">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4. COMPACT FOOTER */}
            <div className="mt-2.5 pt-1.5 border-t border-zinc-400 text-[10px] text-zinc-600 flex justify-between items-center">
              <div>
                <strong>Runner Instructions:</strong> Call customer upon arrival. Collect exact cash for unpaid orders.
              </div>
              <div className="font-mono">
                AYOTD Kitchen Hotline: <strong>0700 000 000</strong>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Print-specific CSS: Isolates ONLY #printable-manifest without page chrome */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${printOrientation === "landscape" ? "A4 landscape" : "A4 portrait"};
            margin: 6mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-manifest,
          #printable-manifest * {
            visibility: visible;
          }
          #printable-manifest {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          header,
          nav,
          footer,
          button,
          .print\\:hidden {
            display: none !important;
          }
          table {
            width: 100% !important;
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
