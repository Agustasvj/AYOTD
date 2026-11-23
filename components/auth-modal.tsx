"use client";

import { useState } from "react";
import {
  X,
  User,
  Lock,
  Phone,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  UserX
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "signup" | "guest";
  onSuccess: (user: {
    id: string;
    name: string;
    phone: string;
    address?: string;
    addresses?: string[];
    isGuest: boolean;
  }) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  defaultTab = "login",
  onSuccess
}: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "signup" | "guest">(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState(""); // Name or phone
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupAddress, setSignupAddress] = useState("");

  if (!isOpen) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: loginIdentifier,
          password: loginPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          phone: signupPhone,
          password: signupPassword,
          address: signupAddress
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }

      setSuccessMsg("Account created! Logging you in...");
      setTimeout(() => {
        onSuccess(data.user);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestContinue() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Guest session could not be created.");
      }

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Could not continue as guest.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-red-400">
              AYOTD Session Access
            </div>
            <h2 className="text-lg font-black text-white mt-0.5">
              {tab === "login"
                ? "Sign In to Your Account"
                : tab === "signup"
                ? "Create AYOTD Account"
                : "Continue as Guest"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 border-b border-zinc-800/80 bg-zinc-900/40 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError("");
            }}
            className={`py-3 text-center transition-all ${
              tab === "login"
                ? "text-red-400 border-b-2 border-red-500 bg-zinc-900/60"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setError("");
            }}
            className={`py-3 text-center transition-all ${
              tab === "signup"
                ? "text-red-400 border-b-2 border-red-500 bg-zinc-900/60"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("guest");
              setError("");
            }}
            className={`py-3 text-center transition-all ${
              tab === "guest"
                ? "text-red-400 border-b-2 border-red-500 bg-zinc-900/60"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Guest
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Login Form */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Full Name or Phone Number
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    required
                    type="text"
                    placeholder="e.g. Kevin Otieno or 0712345678"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="pl-10 text-sm py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    required
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10 text-sm py-2.5"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-sm py-3 mt-2 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Sign In to Account"}
              </button>

              <div className="pt-2 text-center text-xs text-zinc-400">
                New to AYOTD?{" "}
                <button
                  type="button"
                  onClick={() => setTab("signup")}
                  className="text-red-400 hover:underline font-semibold"
                >
                  Create an account
                </button>
              </div>
            </form>
          )}

          {/* 2. Signup Form */}
          {tab === "signup" && (
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    required
                    type="text"
                    placeholder="e.g. Kevin Otieno"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="pl-10 text-sm py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Phone Number (for M-Pesa payments) *
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    required
                    type="tel"
                    placeholder="0712345678 or 0112345678"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    className="pl-10 text-sm py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    required
                    type="password"
                    placeholder="Create a secure password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="pl-10 text-sm py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Campus Delivery Address (Can change anytime)
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="e.g. Hall 4 (Moi), 2nd Floor Room 218"
                    value={signupAddress}
                    onChange={(e) => setSignupAddress(e.target.value)}
                    className="pl-10 text-sm py-2.5"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-sm py-3 mt-3 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Sign Up & Auto-Fill Details"}
              </button>

              <div className="pt-2 text-center text-xs text-zinc-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setTab("login")}
                  className="text-red-400 hover:underline font-semibold"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* 3. Guest Form */}
          {tab === "guest" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <UserX size={15} className="text-amber-400" />
                  <span>Temporary Guest Session</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  You receive a unique temporary Guest ID for this order. It automatically expires when your meal is delivered, but remains logged for customer accountability in case of any issues.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGuestContinue}
                disabled={loading}
                className="btn-primary w-full text-sm py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Sparkles size={16} /> Continue as Guest
                  </>
                )}
              </button>

              <div className="text-center text-xs text-zinc-500">
                Or want your details saved?{" "}
                <button
                  type="button"
                  onClick={() => setTab("signup")}
                  className="text-red-400 hover:underline font-semibold"
                >
                  Create account instead
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

