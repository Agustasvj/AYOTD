"use client";

import { useEffect, useState } from "react";
import { kes } from "@/lib/money";
import {
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  DollarSign,
  Phone,
  ShieldCheck
} from "lucide-react";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadPayments() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (methodFilter !== "ALL") q.set("method", methodFilter);
      if (statusFilter !== "ALL") q.set("status", statusFilter);

      const res = await fetch(`/api/admin/payments?${q.toString()}`);
      const data = await res.json();
      setPayments(data.payments || []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, [methodFilter, statusFilter]);

  async function confirmCash(paymentId: string, orderId: string) {
    setBusyId(paymentId);
    try {
      const res = await fetch("/api/admin/payments/cash/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, orderId, staffName: "Admin Supervisor" })
      });
      if (res.ok) {
        await loadPayments();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function retrySTK(orderId: string, phone: string, amount: number) {
    if (!phone) {
      alert("No phone available for this customer.");
      return;
    }
    setBusyId(orderId);
    try {
      const res = await fetch("/api/payments/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, phone, amount })
      });
      const data = await res.json();
      alert(data.message || (data.success ? "STK Push sent!" : data.error));
    } finally {
      setBusyId(null);
    }
  }

  const totalCollected = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = payments
    .filter((p) => p.status === "PENDING" || p.status === "PROCESSING")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-emerald-400">
            <DollarSign size={14} /> Financial Reconciliation
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            Payments & Collections
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Monitor Safaricom M-Pesa STK callbacks, reconcile cash collected by runners, and handle retries.
          </p>
        </div>

        <button
          onClick={() => loadPayments()}
          className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Ledger
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="panel p-5 border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Total Paid Collections
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2">
            {kes(totalCollected)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Verified M-Pesa receipts & confirmed cash
          </div>
        </div>

        <div className="panel p-5 border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Outstanding Unpaid Balance
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-2">
            {kes(pendingAmount)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Pending STK prompts or cash on delivery
          </div>
        </div>

        <div className="panel p-5 border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Integrations Status
          </div>
          <div className="flex items-center gap-2 mt-3">
            <ShieldCheck size={18} className="text-red-400" />
            <span className="font-bold text-white text-sm">Daraja STK Callback Route Active</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Endpoints guarded against duplicate callbacks
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="panel p-4 border-zinc-800 flex flex-wrap items-center gap-3">
        <div className="w-44">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="text-xs py-2 rounded-xl bg-zinc-900 border-zinc-800"
          >
            <option value="ALL">All Methods</option>
            <option value="MPESA">M-Pesa STK</option>
            <option value="CASH">Cash Collection</option>
          </select>
        </div>

        <div className="w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 rounded-xl bg-zinc-900 border-zinc-800"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <section className="panel overflow-hidden border-zinc-800">
        {loading ? (
          <div className="p-16 text-center text-zinc-500 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading payments ledger...
          </div>
        ) : payments.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <CreditCard size={36} className="mx-auto mb-2 text-zinc-600" />
            <h3 className="font-bold text-white">No payment records found</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Payments from customer checkout will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                  <th className="p-4 font-semibold">Order</th>
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">Method</th>
                  <th className="p-4 font-semibold">Reference / Receipt</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Amount</th>
                  <th className="p-4 font-semibold text-right">Reconciliation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {payments.map((p) => {
                  const isBusy = busyId === p.id || busyId === p.order_id;

                  return (
                    <tr key={p.id} className="hover:bg-zinc-900/40 transition">
                      <td className="p-4 font-mono font-bold text-white">
                        {p.order_number || "Order"}
                        <div className="text-[10px] text-zinc-500 font-sans font-normal mt-0.5">
                          {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-zinc-200">
                          {p.customer_name || "Customer"}
                        </div>
                        <div className="text-xs text-zinc-500 font-mono">
                          {p.customer_phone || ""}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {p.method}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-xs">
                        {p.transaction_reference || p.mpesa?.receipt_number || (
                          <span className="text-zinc-600">Pending callback</span>
                        )}
                        {p.mpesa?.checkout_request_id && (
                          <div className="text-[10px] text-zinc-500 truncate max-w-[140px]">
                            {p.mpesa.checkout_request_id}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            p.status === "PAID"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : p.status === "FAILED"
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="p-4 text-right font-bold text-white">
                        {kes(p.amount)}
                      </td>

                      <td className="p-4 text-right">
                        {p.status !== "PAID" && p.method === "CASH" && (
                          <button
                            onClick={() => confirmCash(p.id, p.order_id)}
                            disabled={isBusy}
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs"
                          >
                            ✓ Confirm Cash
                          </button>
                        )}

                        {p.status !== "PAID" && p.method === "MPESA" && (
                          <button
                            onClick={() =>
                              retrySTK(p.order_id, p.customer_phone, p.amount)
                            }
                            disabled={isBusy}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-red-300 text-xs"
                          >
                            Retry STK Prompt
                          </button>
                        )}

                        {p.status === "PAID" && (
                          <span className="text-xs text-zinc-500">Reconciled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

