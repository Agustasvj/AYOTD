"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  PlusCircle,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

export default function WhatsAppInboxPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadMessages() {
    setLoading(true);
    try {
      const q = activeFilter !== "ALL" ? `?status=${activeFilter}` : "";
      const res = await fetch(`/api/admin/whatsapp${q}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
  }, [activeFilter]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      await fetch("/api/admin/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      await loadMessages();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-emerald-400">
            <MessageCircle size={14} /> Meta WhatsApp Cloud API Ingestion
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            WhatsApp Order Queue
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Review incoming WhatsApp messages and convert clear customer requests into verified orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadMessages()}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Inbox
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {["ALL", "REVIEW_REQUIRED", "PROCESSED", "IGNORED"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
              activeFilter === tab
                ? "bg-emerald-800 border-emerald-600 text-white shadow-md shadow-emerald-950"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <section className="panel overflow-hidden border-zinc-800">
        {loading ? (
          <div className="p-16 text-center text-zinc-500 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading WhatsApp messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <MessageCircle size={36} className="mx-auto mb-2 text-zinc-600" />
            <h3 className="font-bold text-white">No messages in this queue</h3>
            <p className="text-xs text-zinc-500 mt-1">
              When customers send orders to the AYOTD WhatsApp number, they will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {messages.map((m) => {
              const isBusy = busyId === m.id;
              const isReviewed = m.processing_status === "REVIEW_REQUIRED";

              // Clean phone number for URL
              const cleanPhone = m.sender_phone?.replace(/[\+\s]/g, "");

              return (
                <div
                  key={m.id}
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:bg-zinc-900/40 ${
                    isReviewed ? "bg-emerald-950/10" : ""
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-white">
                        {m.sender_phone}
                      </span>
                      {m.sender_name && (
                        <span className="text-xs text-zinc-300 font-semibold">
                          ({m.sender_name})
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.processing_status === "REVIEW_REQUIRED"
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : m.processing_status === "PROCESSED"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {m.processing_status.replace("_", " ")}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {new Date(m.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
                      &ldquo;{m.message_body}&rdquo;
                    </div>

                    <div className="text-[10px] text-zinc-500 font-mono">
                      Msg ID: {m.external_message_id}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Convert to Order Button: pre-populates manual order form! */}
                    <Link
                      href={`/admin/orders/new?source=WHATSAPP_DM&phone=${encodeURIComponent(
                        m.sender_phone
                      )}&waMsgId=${m.id}&notes=${encodeURIComponent(m.message_body)}`}
                      className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold"
                    >
                      <PlusCircle size={14} /> Convert to Order
                    </Link>

                    {m.processing_status === "REVIEW_REQUIRED" ? (
                      <button
                        onClick={() => updateStatus(m.id, "IGNORED")}
                        disabled={isBusy}
                        className="btn-secondary text-xs px-3 py-2 text-zinc-400 hover:text-zinc-200"
                      >
                        Ignore
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(m.id, "REVIEW_REQUIRED")}
                        disabled={isBusy}
                        className="btn-secondary text-xs px-3 py-2 text-zinc-400 hover:text-zinc-200"
                      >
                        Reopen
                      </button>
                    )}

                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 hover:text-emerald-300"
                      title="Reply directly on WhatsApp"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

