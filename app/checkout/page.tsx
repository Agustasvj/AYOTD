"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import type { MenuItem } from "@/lib/types";
import { demoMenu } from "@/lib/demo-menu";
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
  Check,
  UserCheck,
  PlusCircle,
  MapPin,
  Trash2,
  User,
  Sparkles,
  LogOut,
  Settings
} from "lucide-react";
import { AuthModal } from "@/components/auth-modal";
import { EditProfileModal } from "@/components/edit-profile-modal";

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  // Initialize with demoMenu so checkout items resolve instantly
  const [menu, setMenu] = useState<MenuItem[]>(demoMenu);
  const [menuLoading, setMenuLoading] = useState(false);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => {
        if (d.items && d.items.length > 0) {
          setMenu(d.items);
        }
      })
      .catch(() => {});
  }, []);

  // Restore items from localStorage if direct URL access without query param
  const [cachedCart, setCachedCart] = useState<{ item: MenuItem; quantity: number }[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ayotd_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCachedCart(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Parse items from query param or fallback to persisted cart
  const items = useMemo(() => {
    const raw = params.get("items") || "";
    if (raw) {
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
    }
    return cachedCart;
  }, [params, menu, cachedCart]);

  const subtotal = items.reduce((s, x) => s + x.item.price * x.quantity, 0);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    fulfilmentType: "DELIVERY" as "DELIVERY" | "PICKUP",
    address: "",
    instructions: "",
    paymentMethod: "MPESA" as "MPESA" | "CASH"
  });

  // Cached customer profile & saved addresses
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [hasCachedProfile, setHasCachedProfile] = useState(false);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState("");

  // Customer Auth Session state
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    phone: string;
    address?: string;
    addresses?: string[];
    isGuest: boolean;
  } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<"login" | "signup" | "guest">("login");

  // Fetch verified customer session from server
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          applyCustomerSession(d.user);
        } else {
          // Fallback to local storage cache if user previously saved
          try {
            const stored = localStorage.getItem("ayotd_customer_profile");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.phone || parsed.customerName) {
                setHasCachedProfile(true);
                setForm((prev) => ({
                  ...prev,
                  customerName: parsed.customerName || prev.customerName,
                  phone: parsed.phone || prev.phone,
                  address: parsed.address || (parsed.addresses && parsed.addresses[0]) || prev.address
                }));
              }
              if (Array.isArray(parsed.addresses)) {
                setSavedAddresses(parsed.addresses);
              }
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  function applyCustomerSession(user: {
    id: string;
    name: string;
    phone: string;
    address?: string;
    addresses?: string[];
    isGuest: boolean;
  }) {
    setCurrentUser(user);
    setHasCachedProfile(true);
    const primaryAddr = user.address || (user.addresses && user.addresses[0]) || "";
    setForm((prev) => ({
      ...prev,
      customerName: user.isGuest ? prev.customerName : (user.name || prev.customerName),
      phone: user.phone || prev.phone,
      address: primaryAddr || prev.address
    }));
    if (user.addresses && user.addresses.length > 0) {
      setSavedAddresses(user.addresses);
    } else if (primaryAddr) {
      setSavedAddresses([primaryAddr]);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/me", { method: "POST" });
    setCurrentUser(null);
    setHasCachedProfile(false);
    setForm((prev) => ({ ...prev, customerName: "", phone: "", address: "" }));
    setSavedAddresses([]);
    try {
      localStorage.removeItem("ayotd_customer_profile");
    } catch {}
  }

  // Save profile and address list helper
  function saveProfile(name: string, phone: string, address: string, allAddresses: string[]) {
    try {
      const cleanAddresses = Array.from(new Set([address, ...allAddresses].map((a) => a.trim()).filter(Boolean)));
      localStorage.setItem(
        "ayotd_customer_profile",
        JSON.stringify({
          customerName: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          addresses: cleanAddresses
        })
      );
      setSavedAddresses(cleanAddresses);
      setHasCachedProfile(true);
    } catch {
      // ignore
    }
  }

  function handleAddAddress(addr: string) {
    const trimmed = addr.trim();
    if (!trimmed) return;
    const updated = Array.from(new Set([...savedAddresses, trimmed]));
    setSavedAddresses(updated);
    setForm((prev) => ({ ...prev, address: trimmed }));
    setNewAddressInput("");
    saveProfile(form.customerName, form.phone, trimmed, updated);
  }

  function handleRemoveAddress(addrToRemove: string) {
    const updated = savedAddresses.filter((a) => a !== addrToRemove);
    setSavedAddresses(updated);
    if (form.address === addrToRemove) {
      setForm((prev) => ({ ...prev, address: updated[0] || "" }));
    }
    saveProfile(form.customerName, form.phone, form.address === addrToRemove ? (updated[0] || "") : form.address, updated);
  }

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
      guestId: currentUser?.isGuest ? currentUser.id : undefined,
      customerId: currentUser && !currentUser.isGuest ? currentUser.id : undefined,
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

      // Save customer profile and chosen address to cache
      saveProfile(form.customerName, form.phone, form.address, savedAddresses);

      // Clear persisted cart once order is confirmed
      try {
        localStorage.removeItem("ayotd_cart");
      } catch {
        // ignore
      }

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
            Enter your delivery details and choose your preferred payment method.
          </p>
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
            {/* Session / Account Status Card */}
            <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {currentUser && !currentUser.isGuest ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Signed in as {currentUser.name}</span>
                      <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                        Saved Account
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Your details and saved addresses are automatically filled.
                    </div>
                  </div>
                </div>
              ) : currentUser && currentUser.isGuest ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Ordering as Guest</span>
                      <span className="text-[10px] font-mono bg-zinc-800 text-amber-300 px-2 py-0.5 rounded-full">
                        ID: {currentUser.id}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Traceable guest session. Expires once fulfilled.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    <User size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-200">
                      Have an account or want to save your details?
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Sign in or create an account for 1-click orders and address book.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 shrink-0">
                {currentUser ? (
                  <div className="flex items-center gap-2">
                    {!currentUser.isGuest && (
                      <button
                        type="button"
                        onClick={() => setEditProfileOpen(true)}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition px-2 py-1 bg-red-950/40 border border-red-800/60 rounded-lg"
                      >
                        <Settings size={13} /> Edit Profile
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 transition px-2 py-1"
                    >
                      <LogOut size={13} /> Switch Account / Guest
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthDefaultTab("login");
                        setAuthModalOpen(true);
                      }}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthDefaultTab("guest");
                        setAuthModalOpen(true);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1"
                    >
                      Guest Checkout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  1. Your Contact Details
                </h2>
                {hasCachedProfile && (
                  <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <UserCheck size={12} /> Auto-filled from your profile
                  </span>
                )}
              </div>
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, customerName: val });
                      if (val.trim() && form.phone.trim()) {
                        saveProfile(val, form.phone, form.address, savedAddresses);
                      }
                    }}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Phone Number *
                  </label>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="0712345678 or 0112345678"
                    value={form.phone}
                    onChange={(e) => {
                      let digits = e.target.value.replace(/\D/g, "");
                      if (digits.startsWith("254")) {
                        digits = "0" + digits.slice(3);
                      }
                      const normalized = digits.slice(0, 10);
                      setForm({ ...form, phone: normalized });
                      if (form.customerName.trim() && normalized.length === 10) {
                        saveProfile(form.customerName, normalized, form.address, savedAddresses);
                      }
                    }}
                    className={`text-sm ${
                      form.phone.length === 10
                        ? phoneValidation?.isValid
                          ? "border-emerald-600/80 focus:border-emerald-500"
                          : "border-rose-600/80 focus:border-rose-500"
                        : ""
                    }`}
                  />
                  <div className="min-h-[18px] mt-1">
                    {!form.phone ? (
                      <p className="text-[11px] text-zinc-500">
                        Enter 10-digit number (e.g. 0712345678 or 0112345678)
                      </p>
                    ) : form.phone.length < 10 ? (
                      <p className="text-[11px] text-amber-400 font-medium">
                        Number is too short ({form.phone.length}/10 digits)
                      </p>
                    ) : phoneValidation?.isValid ? (
                      <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <Check size={12} /> {phoneValidation.carrier} ({phoneValidation.formatted})
                      </p>
                    ) : (
                      <p className="text-[11px] text-rose-400 font-medium">
                        {phoneValidation?.error || "Must start with 07 or 01"}
                      </p>
                    )}
                  </div>
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                        Delivery Address *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddressManager(!showAddressManager)}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                      >
                        <MapPin size={12} />
                        {showAddressManager ? "Close Address Book" : savedAddresses.length > 0 ? "Saved Addresses" : "Save Multiple Addresses"}
                      </button>
                    </div>

                    {/* Saved address selector pills */}
                    {savedAddresses.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {savedAddresses.map((addr) => (
                          <button
                            key={addr}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, address: addr });
                              saveProfile(form.customerName, form.phone, addr, savedAddresses);
                            }}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all text-left flex items-center gap-1.5 ${
                              form.address === addr
                                ? "border-red-600 bg-red-950/60 text-white font-medium"
                                : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700"
                            }`}
                          >
                            <span className="truncate max-w-[200px]">{addr}</span>
                            {form.address === addr && <Check size={12} className="text-red-400 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}

                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. Hall 4 (Moi), 2nd Floor, Room 218, or Science Lab Block B"
                      value={form.address}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm({ ...form, address: val });
                      }}
                      onBlur={() => {
                        if (form.address.trim()) {
                          saveProfile(form.customerName, form.phone, form.address, savedAddresses);
                        }
                      }}
                      className="text-sm"
                    />

                    {/* Multiple address manager accordion */}
                    {showAddressManager && (
                      <div className="mt-3 p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                        <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                          <MapPin size={13} className="text-red-400" />
                          <span>Manage Saved Delivery Addresses</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add another address (e.g. Science Lab B)"
                            value={newAddressInput}
                            onChange={(e) => setNewAddressInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddAddress(newAddressInput);
                              }
                            }}
                            className="text-xs py-2 flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddAddress(newAddressInput)}
                            className="btn-secondary text-xs px-3 py-2 shrink-0 flex items-center gap-1"
                          >
                            <PlusCircle size={13} /> Add
                          </button>
                        </div>
                        {savedAddresses.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {savedAddresses.map((addr) => (
                              <div
                                key={addr}
                                className="flex items-center justify-between text-xs p-2 rounded-lg bg-zinc-950 border border-zinc-850"
                              >
                                <span className="text-zinc-300 truncate max-w-[240px] sm:max-w-[340px]">
                                  {addr}
                                </span>
                                <div className="flex items-center gap-2">
                                  {form.address !== addr && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setForm({ ...form, address: addr });
                                        saveProfile(form.customerName, form.phone, addr, savedAddresses);
                                      }}
                                      className="text-red-400 hover:underline text-[11px]"
                                    >
                                      Use
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAddress(addr)}
                                    className="text-zinc-500 hover:text-red-400 p-1"
                                    title="Delete address"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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

      {/* Customer Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authDefaultTab}
        onSuccess={(user) => {
          applyCustomerSession(user);
        }}
      />

      {/* Edit Profile Modal */}
      {currentUser && !currentUser.isGuest && (
        <EditProfileModal
          isOpen={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          currentUser={currentUser}
          onSuccess={(updated) => {
            applyCustomerSession({
              ...currentUser,
              ...updated
            });
          }}
        />
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
