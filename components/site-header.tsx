"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, UtensilsCrossed, Menu, X, Clock, MapPin, Phone } from "lucide-react";

interface SiteHeaderProps {
  cartCount?: number;
  onOpenCart?: () => void;
}

export function SiteHeader({ cartCount = 0, onOpenCart }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Campus Top Announcement Bar */}
      <div className="bg-red-950/70 border-b border-red-900/40 text-xs text-red-200 py-1.5 px-4">
        <div className="container-shell flex justify-between items-center text-[11px] sm:text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Delivering across all campus hostels & faculty blocks</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-zinc-300">
            <span className="flex items-center gap-1"><Clock size={13} className="text-red-400" /> Open 9:00 AM – 10:30 PM</span>
            <span className="flex items-center gap-1"><Phone size={13} className="text-red-400" /> WhatsApp Orders: 07XX-AYOTD</span>
          </div>
        </div>
      </div>

      <header className="border-b border-white/10 sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl">
        <div className="container-shell h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-full border-2 border-red-600 bg-red-950/40 flex items-center justify-center text-red-500 group-hover:scale-105 transition shadow-[0_0_15px_rgba(185,28,53,0.3)]">
              <UtensilsCrossed size={21} />
            </div>
            <div>
              <div className="font-bold tracking-[.15em] text-sm text-white group-hover:text-red-200 transition">
                A YEAR OR TWO
              </div>
              <div className="text-[10px] tracking-[.35em] text-red-400 font-semibold">
                DELICACIES
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <Link href="/#menu" className="hover:text-white transition">
              Menu & Specials
            </Link>
            <Link href="/#about" className="hover:text-white transition">
              About AYOTD
            </Link>
            <Link href="/track" className="hover:text-white transition flex items-center gap-1.5">
              <MapPin size={15} className="text-red-400" />
              Track Order
            </Link>
          </nav>

          {/* Cart & Mobile Trigger */}
          <div className="flex items-center gap-3">
            {onOpenCart ? (
              <button
                onClick={onOpenCart}
                className="btn-primary relative flex items-center gap-2 text-sm px-4 py-2.5 shadow-md shadow-red-950/50"
              >
                <ShoppingBag size={17} />
                <span className="hidden sm:inline">My Basket</span>
                {cartCount > 0 && (
                  <span className="bg-white text-red-700 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                    {cartCount}
                  </span>
                )}
              </button>
            ) : (
              <Link
                href="/#menu"
                className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5"
              >
                <ShoppingBag size={17} />
                <span>Order Now</span>
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-5 py-6 space-y-4">
            <Link
              href="/#menu"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-zinc-200 py-1"
            >
              Menu & Specials
            </Link>
            <Link
              href="/track"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-zinc-200 py-1"
            >
              Track Existing Order
            </Link>
            <Link
              href="/#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-zinc-200 py-1"
            >
              About & Campus Delivery
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
