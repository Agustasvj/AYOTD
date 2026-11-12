"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { MenuItem } from "@/lib/types";
import { demoMenu } from "@/lib/demo-menu";
import { kes, KES_DELIVERY_FEE } from "@/lib/money";
import { validateKenyanPhone } from "@/lib/validation";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  CreditCard,
  Banknote,
  Loader2,
  Check
} from "lucide-react";

function ManualOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [menu, setMenu] = useState<MenuItem[]>(demoMenu);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [source, setSource] = useState(searchParams.get("source") || "WHATSAPP_GROUP");
  const [fulfilmentType, setFulfilmentType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [address, setAddress] = useState(searchParams.get("location") || "");
  const [instructions, setInstructions] = useState(searchParams.get("notes") || "");
  const [paymentMethod, setPaymentMethod] = useState<"MPESA" | "CASH">("MPESA");

  // Selected Order Lines: { menuItemId, quantity }
  const [orderLines, setOrderLines] = useState<
    { menuItemId: string; quantity: number }[]
  >([]);

  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => {
        const items = d.items || [];
        if (items.length > 0) {
          setMenu(items);
        }
      })
      .catch(() => {});
  }, []);

  function addLine() {
    if (menu.length === 0) return;
    setOrderLines([...orderLines, { menuItemId: menu[0].id, quantity: 1 }]);
  }

  function updateLine(index: number, menuItemId: string, quantity: number) {
    const updated = [...orderLines];
    updated[index] = { menuItemId, quantity };
    setOrderLines(updated);
  }

  function removeLine(index: number) {
    setOrderLines(orderLines.filter((_, i) => i !== index));
  }

  // Calculate Subtotals
  const subtotal = orderLines.reduce((sum, line) => {
    const m = menu.find((x) => x.id === line.menuItemId);
    return sum + (m ? m.price * line.quantity : 0);
  }, 0);

  const deliveryFee = fulfilmentType === "DELIVERY" ? KES_DELIVERY_FEE : 0;
  const grandTotal = subtotal + deliveryFee;

  const phoneCheck = useMemo(
    () => (phone.trim() ? validateKenyanPhone(phone) : null),
    [phone]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatusMessage(null);

    if (orderLines.length === 0) {
      setStatusMessage({ type: "error", text: "Please add at least one meal to the order." });
      setBusy(false);
      return;
    }

    const validatedPhone = validateKenyanPhone(phone);
    if (!validatedPhone.isValid) {
      setStatusMessage({
        type: "error",
        text: validatedPhone.error || "Please enter a valid Kenyan phone number (e.g. 0712345678)."
      });
      setBusy(false);
      return;
    }

    if (fulfilmentType === "DELIVERY" && !address.trim()) {
      setStatusMessage({ type: "error", text: "Delivery location is required for campus delivery." });
      setBusy(false);
      return;
    }

    const payload = {
      customerName,
      phone: validatedPhone.normalized,
      source,
      fulfilmentType,
      address: fulfilmentType === "DELIVERY" ? address : undefined,
      instructions: instructions || undefined,
      paymentMethod,
      items: orderLines
    };

    try {
      const res = await fetch("/api/admin/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to record manual order.");
      }

      setStatusMessage({
        type: "success",
        text: `Order ${data.orderNumber} successfully recorded! Redirecting to orders queue...`
      });

      // If converted from WhatsApp message, optionally mark as processed
      const waMsgId = searchParams.get("waMsgId");
      if (waMsgId) {
        fetch("/api/admin/whatsapp", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: waMsgId,
            status: "PROCESSED",
            linkedOrderId: data.orderId
          })
        }).catch(() => {});
      }

      setTimeout(() => {
        router.push("/admin/orders");
      }, 1200);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to record manual order."
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Back button & Title */}
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white mb-4"
        >
          <ArrowLeft size={14} /> Back to Orders
        </Link>
        <div className="eyebrow">Manual Order Capture</div>
        <h1 className="text-3xl font-extrabold text-white mt-1">
          Record Outside Order
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm mt-1">
          Enter customer orders received from WhatsApp groups, direct DMs, phone calls, or walk-ins.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source & Customer Details */}
        <div className="panel p-6 border-zinc-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            1. Channel & Customer
          </h2>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                Order Origin / Source *
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="text-xs sm:text-sm"
              >
                <option value="WHATSAPP_GROUP">WhatsApp Group</option>
                <option value="WHATSAPP_DM">WhatsApp Direct Message</option>
                <option value="PHONE_CALL">Phone Call</option>
                <option value="WALK_IN">Walk-in Counter</option>
                <option value="ADMIN_MANUAL">Staff Manual Entry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                Customer Full Name *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Dennis Mwangi"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                Customer Phone *
              </label>
              <input
                required
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="07XXXXXXXX or 01XXXXXXXX"
                value={phone}
                onChange={(e) => {
                  let digits = e.target.value.replace(/\D/g, "");
                  if (digits.startsWith("254")) {
                    digits = "0" + digits.slice(3);
                  }
                  setPhone(digits.slice(0, 10));
                }}
                className={`text-xs sm:text-sm ${
                  phone.length === 10
                    ? phoneCheck?.isValid
                      ? "border-emerald-600/80"
                      : "border-rose-600/80"
                    : ""
                }`}
              />
              <div className="min-h-[18px] mt-1">
                {!phone ? (
                  <p className="text-[11px] text-zinc-500">
                    10-digit number (e.g. 0712345678 or 0112345678)
                  </p>
                ) : phone.length < 10 ? (
                  <p className="text-[11px] text-amber-400 font-medium">
                    Number is too short ({phone.length}/10 digits)
                  </p>
                ) : phoneCheck?.isValid ? (
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <Check size={11} /> {phoneCheck.carrier} ({phoneCheck.formatted})
                  </p>
                ) : (
                  <p className="text-[11px] text-rose-400 font-medium">
                    {phoneCheck?.error || "Must start with 07 or 01"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Item Meal Picker */}
        <div className="panel p-6 border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Order Dishes & Quantities
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Add each meal ordered by the customer. Prices are automatically verified.
              </p>
            </div>
            <button
              type="button"
              onClick={addLine}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <Plus size={14} /> Add Meal
            </button>
          </div>

          {loadingMenu ? (
            <div className="py-6 text-center text-zinc-500 text-xs">Loading menu items...</div>
          ) : (
            <div className="space-y-3">
              {orderLines.map((line, idx) => {
                const selectedItem = menu.find((x) => x.id === line.menuItemId);

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    {/* Meal selector */}
                    <div className="flex-1 min-w-[200px]">
                      <select
                        value={line.menuItemId}
                        onChange={(e) => updateLine(idx, e.target.value, line.quantity)}
                        className="text-xs sm:text-sm py-2"
                      >
                        {menu.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} — {kes(m.price)} ({m.category || "Meal"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateLine(idx, line.menuItemId, Math.max(1, line.quantity - 1))
                        }
                        className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateLine(idx, line.menuItemId, line.quantity + 1)
                        }
                        className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* Line total */}
                    <div className="text-sm font-bold text-white w-24 text-right">
                      {kes((selectedItem?.price || 0) * line.quantity)}
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={orderLines.length === 1}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 disabled:opacity-20"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fulfilment & Payment */}
        <div className="panel p-6 border-zinc-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            3. Delivery & Payment Information
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                Fulfilment Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfilmentType("DELIVERY")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                    fulfilmentType === "DELIVERY"
                      ? "border-red-600 bg-red-950/40 text-white"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  <Truck size={14} /> Campus Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setFulfilmentType("PICKUP")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                    fulfilmentType === "PICKUP"
                      ? "border-red-600 bg-red-950/40 text-white"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  <Store size={14} /> Counter Collection
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("MPESA")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                    paymentMethod === "MPESA"
                      ? "border-red-600 bg-red-950/40 text-white"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  <CreditCard size={14} /> M-Pesa
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                    paymentMethod === "CASH"
                      ? "border-red-600 bg-red-950/40 text-white"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  <Banknote size={14} /> Cash
                </button>
              </div>
            </div>
          </div>

          {fulfilmentType === "DELIVERY" && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">
                Delivery Location (Hostel / Room / Landmark) *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Hall 4 Room 218"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2">
              Kitchen Instructions / Customer Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Extra kachumbari, call upon arrival"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Pricing Summary & Submit */}
        <div className="panel p-6 border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-xs">
            <div className="text-zinc-400">
              Food Subtotal: <strong className="text-white">{kes(subtotal)}</strong>
              {deliveryFee > 0 && ` + Delivery: ${kes(deliveryFee)}`}
            </div>
            <div className="text-xl font-bold text-white">
              Total Order Amount: <span className="text-red-400">{kes(grandTotal)}</span>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full sm:w-auto text-xs px-8 py-3.5 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Recording Order...
                </>
              ) : (
                <>Create Order ({kes(grandTotal)})</>
              )}
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-950/60 border border-emerald-800/80 text-emerald-300"
                : "bg-rose-950/60 border border-rose-800/80 text-rose-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </form>
    </div>
  );
}

export default function ManualOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-zinc-500">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          Loading manual order entry...
        </div>
      }
    >
      <ManualOrderContent />
    </Suspense>
  );
}
