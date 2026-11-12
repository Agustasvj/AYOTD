"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import type { MenuItem } from "@/lib/types";
import { kes, KES_DELIVERY_FEE } from "@/lib/money";
import { validateKenyanPhone } from "@/lib/validation";
import {
  ArrowLeft,
  Truck,
  Store,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  PhoneCall,
  Loader2,
  Check
} from "lucide-react";

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => setMenu(d.items || []))
      .catch(() => setMenu([]))
      .finally(() => setMenuLoading(false));
  }, []);

  // Parse items from query param
  const items = useMemo(() => {
    const raw = params.get("items") || "";
    if (!raw) return [];
    return raw
      .split(",")
      .filter(Boolean)
      .map((part) => {
        const [id, qty] = part.split(":");
        const item = menu.find((x) => x.id === id);
        return item
          ? { item, quantity: Math.max(1, Number(qty) || 1) }
          : null;
      })
      .filter((x): x is { item: MenuItem; quantity: number } => Boolean(x));
  }, [params, menu]);

  const subtotal = items.reduce((s, x) => s + x.item.price * x.quantity, 0);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    fulfilmentType: "DELIVERY" as "DELIVERY" | "PICKUP",
    address: "",
    instructions: "",
    paymentMethod: "MPESA" as "MPESA" | "CASH"
  });

  const deliveryFee = form.fulfilmentType === "DELIVERY" ? KES_DELIVERY_FEE : 0;
  const grandTotal = subtotal + deliveryFee;

  const phoneValidation = useMemo(
    () => (form.phone.trim() ? validateKenyanPhone(form.phone) : null),
    [form.phone]
  );

  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [stkPromptMessage, setStkPromptMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMessage("");
    setStkPromptMessage("");

    if (items.length === 0) {
      setErrorMessage("Your basket is empty. Please select food from the menu.");
      setBusy(false);
      return;
    }

    const phoneCheck = validateKenyanPhone(form.phone);
    if (!phoneCheck.isValid) {
      setErrorMessage(
        phoneCheck.error || "Please enter a valid Kenyan mobile number (e.g. 0712345678 or 0112345678)."
      );
      setBusy(false);
      return;
    }

    if (form.fulfilmentType === "DELIVERY" && !form.address.trim()) {
      setErrorMessage("Please enter your campus delivery location (e.g., Hostel & Room).");
      setBusy(false);
      return;
    }

    const payload = {
      ...form,
      phone: phoneCheck.normalized,
      items: items.map((x) => ({
        menuItemId: x.item.id,
        quantity: x.quantity
      }))
    };

    try {
      // 1. Submit order to server
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to place order.");
      }

      const orderNumber = data.orderNumber;
      const orderId = data.orderId;

      // 2. If M-Pesa is selected, initiate Daraja STK Push
      if (form.paymentMethod === "MPESA") {
        setStkPromptMessage("Initiating M-Pesa STK push prompt to your phone...");
        try {
          const stkRes = await fetch("/api/payments/stk-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: orderId.startsWith("demo-") ? "00000000-0000-0000-0000-000000000000" : orderId,
              phone: form.phone,
              amount: grandTotal
            })
          });
          const stkData = await stkRes.json();
          if (stkData.message) {
            setStkPromptMessage(stkData.message);
          }
        } catch {
          // STK push trigger fail shouldn't break order creation; customer can retry on tracking page
        }
      }

      // Small delay so user can read message, then navigate to tracking
      setTimeout(() => {
        router.push(`/track?order=${encodeURIComponent(orderNumber)}`);
      }, 1500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="container-shell py-12 max-w-5xl">
      <Link
        href="/#menu"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft size={14} /> Back to Menu
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="eyebrow">Checkout & Order Placement</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mt-1">
            Confirm Your Meal
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Guest checkout active. No registration or password required.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1.5 rounded-full">
          <ShieldCheck size={14} /> Server verified pricing in KES
        </div>
      </div>

      {menuLoading ? (
        <div className="py-20 text-center text-zinc-500">
          <Loader2 className="animate-spin mx-auto mb-3" size={24} />
          Loading your order items...
        </div>
      ) : items.length === 0 ? (
        <div className="panel p-12 text-center text-zinc-400 my-12 max-w-md mx-auto">
          <h2 className="text-xl font-bold text-white mb-2">No Items in Checkout</h2>
          <p className="text-xs text-zinc-500 mb-6">
            Please choose your meals from the menu first.
          </p>
          <Link href="/#menu" className="btn-primary text-xs px-6 py-3">
            Explore Our Menu
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 mt-8">
          {/* Form Column */}
          <form onSubmit={handleSubmit} className="panel p-6 sm:p-8 space-y-6">
            {/* Customer Information */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4">
                1. Your Contact Details
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Kevin Otieno"
                    value={form.customerName}
                    onChange={(e) =>
                      setForm({ ...form, customerName: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Kenyan Phone Number *
                    </label>
                    {phoneValidation && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          phoneValidation.isValid
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                            : "bg-rose-950/80 text-rose-300 border border-rose-900/60"
                        }`}
                      >
                        {phoneValidation.isValid ? (
                          <>
                            <Check size={11} /> {phoneValidation.carrier} ({phoneValidation.formatted})
                          </>
                        ) : (
                          phoneValidation.error || "Invalid number"
                        )}
                      </span>
                    )}
                  </div>
                  <input
                    required
                    type="tel"
                    placeholder="0712345678 or 0112345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={`text-sm ${
                      phoneValidation
                        ? phoneValidation.isValid
                          ? "border-emerald-600/80 focus:border-emerald-500"
                          : "border-rose-600/80 focus:border-rose-500"
                        : ""
                    }`}
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Accepts Safaricom & Airtel formats: 07XX, 01XX, or +254.
                  </p>
                </div>
              </div>
            </div>

            {/* Fulfilment Selection */}
            <div className="pt-4 border-t border-zinc-800">
              <h2 className="text-lg font-bold text-white mb-4">
                2. Delivery or Campus Collection
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, fulfilmentType: "DELIVERY" })}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    form.fulfilmentType === "DELIVERY"
                      ? "border-red-600 bg-red-950/40 text-white shadow-sm"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <Truck size={20} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-white">Campus Delivery</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      +{kes(KES_DELIVERY_FEE)} to hostel / room
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, fulfilmentType: "PICKUP" })}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    form.fulfilmentType === "PICKUP"
                      ? "border-red-600 bg-red-950/40 text-white shadow-sm"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <Store size={20} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-white">Counter Collection</div>
                    <div className="text-xs text-zinc-400 mt-0.5">Free at AYOTD counter</div>
                  </div>
                </button>
              </div>

              {form.fulfilmentType === "DELIVERY" && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      Delivery Address / Campus Landmark *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. Hall 4 (Moi), 2nd Floor, Room 218, or Science Lab Block B"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Delivery Instructions / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call when outside, leave at security desk..."
                  value={form.instructions}
                  onChange={(e) =>
                    setForm({ ...form, instructions: e.target.value })
                  }
                  className="text-sm"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="pt-4 border-t border-zinc-800">
              <h2 className="text-lg font-bold text-white mb-4">
                3. Payment Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paymentMethod: "MPESA" })}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    form.paymentMethod === "MPESA"
                      ? "border-red-600 bg-red-950/40 text-white"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <CreditCard size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-white">M-Pesa STK Push</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Instant PIN prompt on phone
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, paymentMethod: "CASH" })}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    form.paymentMethod === "CASH"
                      ? "border-red-600 bg-red-950/40 text-white"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <Banknote size={20} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-white">Cash Payment</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Pay on delivery / collection
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Status / Errors */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {stkPromptMessage && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{stkPromptMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full text-sm py-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Processing Order...
                </>
              ) : (
                <>Place Order ({kes(grandTotal)})</>
              )}
            </button>
          </form>

          {/* Order Summary Column */}
          <aside className="panel p-6 sm:p-8 h-fit space-y-6">
            <h2 className="font-bold text-lg text-white">Order Summary</h2>

            <div className="divide-y divide-zinc-800/80">
              {items.map((x) => (
                <div key={x.item.id} className="py-3 flex justify-between gap-3 text-sm">
                  <div>
                    <div className="font-medium text-white">{x.item.name}</div>
                    <div className="text-xs text-zinc-500">
                      {x.quantity} × {kes(x.item.price)}
                    </div>
                  </div>
                  <span className="font-bold text-zinc-200">
                    {kes(x.item.price * x.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-zinc-800 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Food Subtotal</span>
                <span>{kes(subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Fulfilment ({form.fulfilmentType})</span>
                <span>{deliveryFee > 0 ? kes(deliveryFee) : "Free"}</span>
              </div>
              <div className="pt-3 border-t border-zinc-800 flex justify-between font-bold text-xl text-white">
                <span>Grand Total</span>
                <span className="text-red-400">{kes(grandTotal)}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 space-y-2">
              <div className="font-bold text-zinc-300">AYOTD Order Promise</div>
              <p>
                Prices are guaranteed against database records. You can track your kitchen
                and delivery status in real-time right after confirming.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Suspense
          fallback={
            <div className="container-shell py-20 text-center text-zinc-500">
              <Loader2 size={24} className="animate-spin mx-auto mb-3" />
              Loading checkout...
            </div>
          }
        >
          <CheckoutContent />
        </Suspense>
      </main>
    </>
  );
}
