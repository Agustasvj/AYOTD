"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ShieldCheck, Lock, ArrowLeft, KeyRound, AlertCircle, Loader2 } from "lucide-react";

interface StaffPasscodeGateProps {
  children: React.ReactNode;
  portalTitle?: string;
  portalSubtitle?: string;
}

export function StaffPasscodeGate({
  children,
  portalTitle = "AYOTD Operations Center",
  portalSubtitle = "Restricted Staff Access — Orders Queue, Kitchen & Pricing"
}: StaffPasscodeGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check existing session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/auth/status");
        const data = await res.json();
        setIsAuthenticated(Boolean(data.authenticated));
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  // Auto-focus input when gate is shown
  useEffect(() => {
    if (isAuthenticated === false) {
      inputRef.current?.focus();
    }
  }, [isAuthenticated]);

  async function handleVerify(codeToTest?: string) {
    const code = (codeToTest ?? passcode).trim();
    if (!code) {
      setError("Please enter the staff passcode.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: code })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setPasscode("");
      } else {
        setError(data.error || "Incorrect staff passcode.");
        setPasscode("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Connection error. Could not verify passcode.");
    } finally {
      setIsVerifying(false);
    }
  }

  // Handle keypad clicks (0-9, Backspace, Submit)
  function handleKeypadClick(digit: string) {
    if (isVerifying) return;
    setError(null);

    if (digit === "CLEAR") {
      setPasscode("");
      return;
    }

    if (digit === "ENTER") {
      handleVerify();
      return;
    }

    const nextCode = passcode + digit;
    setPasscode(nextCode);

    // If 4-digit PIN is reached, auto-submit for effortless mobile entry
    if (nextCode.length === 4) {
      handleVerify(nextCode);
    }
  }

  // Loading state while checking cookie
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <span className="text-xs font-medium tracking-wide">Verifying AYOTD Staff Credentials...</span>
      </div>
    );
  }

  // Authenticated - render admin app
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Unauthenticated - render Staff Passcode Gate
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-red-950/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-red-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-md">
        {/* Brand Icon & Shield Header */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-3">
            <div className="h-16 w-16 rounded-2xl bg-zinc-900 border-2 border-red-600/80 flex items-center justify-center text-red-500 shadow-lg shadow-red-950/60 mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-red-600 text-white rounded-full p-1 border-2 border-zinc-950">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <h1 className="text-lg font-bold text-white tracking-wide">{portalTitle}</h1>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{portalSubtitle}</p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">
              Staff Passcode / PIN
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                maxLength={10}
                value={passcode}
                onChange={(e) => {
                  setError(null);
                  setPasscode(e.target.value);
                }}
                placeholder="••••"
                className={`w-full bg-zinc-900 border text-center text-xl tracking-[0.3em] font-mono py-3 px-4 rounded-xl text-white placeholder-zinc-600 outline-none transition ${
                  error
                    ? "border-red-500 ring-1 ring-red-500 bg-red-950/20"
                    : "border-zinc-700/80 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                }`}
                disabled={isVerifying}
              />
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {error && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg p-2 animate-shake">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isVerifying || !passcode}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white font-bold text-xs tracking-wider uppercase transition shadow-md shadow-red-950/60 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
              </>
            ) : (
              <>Unlock Staff Portal</>
            )}
          </button>
        </form>

        {/* Touch Keypad for Fast Runner & Counter Terminal Access */}
        <div className="mt-6 pt-5 border-t border-zinc-900">
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLEAR", "0", "ENTER"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeypadClick(key)}
                disabled={isVerifying}
                className={`py-2.5 rounded-lg text-xs font-semibold transition active:scale-95 border ${
                  key === "ENTER"
                    ? "bg-red-700 hover:bg-red-600 text-white border-red-800"
                    : key === "CLEAR"
                    ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800"
                    : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border-zinc-800/80"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Customer Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
