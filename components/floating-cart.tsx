"use client";

import type { CartLine } from "@/lib/types";
import { kes } from "@/lib/money";
import { ShoppingBag, ArrowRight } from "lucide-react";

interface FloatingCartProps {
  cart: CartLine[];
  onOpenCart: () => void;
}

export function FloatingCart({ cart, onOpenCart }: FloatingCartProps) {
  if (cart.length === 0) return null;

  const count = cart.reduce((s, x) => s + x.quantity, 0);
  const total = cart.reduce((s, x) => s + x.item.price * x.quantity, 0);

  return (
    <div className="fixed bottom-5 inset-x-4 z-30 sm:hidden">
      <button
        onClick={onOpenCart}
        className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-red-500/40 backdrop-blur-md active:scale-[0.99] transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center font-bold text-sm">
            {count}
          </div>
          <div className="text-left">
            <div className="text-xs text-red-200">Basket Total</div>
            <div className="text-base font-extrabold">{kes(total)}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-black/20 px-3 py-1.5 rounded-full">
          <span>View Basket</span>
          <ArrowRight size={14} />
        </div>
      </button>
    </div>
  );
}

