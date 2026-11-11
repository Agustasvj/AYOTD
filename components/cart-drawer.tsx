"use client";

import type { CartLine } from "@/lib/types";
import { kes, KES_DELIVERY_FEE } from "@/lib/money";
import { X, Minus, Plus, Trash2, ArrowRight, ShoppingBag, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartLine[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart
}: CartDrawerProps) {
  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const checkoutItemsParam = cart
    .map((line) => `${line.item.id}:${line.quantity}`)
    .join(",");

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-950/60 border border-red-800/50 flex items-center justify-center text-red-400">
                <ShoppingBag size={16} />
              </div>
              <h2 className="font-bold text-lg text-white">Your Basket</h2>
              <span className="text-xs bg-zinc-900 px-2 py-0.5 rounded-full text-zinc-400 border border-zinc-800">
                {cart.reduce((s, x) => s + x.quantity, 0)} items
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 text-zinc-600">
                  <ShoppingBag size={28} />
                </div>
                <h3 className="font-bold text-zinc-300">Your basket is empty</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                  Discover our freshly prepared meals and student favourites on the menu.
                </p>
                <button
                  onClick={onClose}
                  className="mt-5 text-xs text-red-400 hover:underline"
                >
                  ← Browse Today&apos;s Menu
                </button>
              </div>
            ) : (
              cart.map((line) => (
                <div
                  key={line.item.id}
                  className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-white truncate">
                      {line.item.name}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {kes(line.item.price)} each
                    </div>
                    <div className="text-xs font-bold text-red-400 mt-1">
                      Subtotal: {kes(line.item.price * line.quantity)}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(line.item.id, -1)}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(line.item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition"
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      onClick={() => onRemoveItem(line.item.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition ml-1"
                      title="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-zinc-800 bg-zinc-950 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Food Subtotal</span>
                  <span className="font-semibold text-white">{kes(subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Est. Campus Delivery</span>
                  <span className="text-xs text-zinc-300">
                    +{kes(KES_DELIVERY_FEE)} (Free for Collection)
                  </span>
                </div>
                <div className="pt-2 border-t border-zinc-800/80 flex justify-between font-bold text-lg text-white">
                  <span>Order Subtotal</span>
                  <span className="text-red-400">{kes(subtotal)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Link
                  href={`/checkout?items=${encodeURIComponent(checkoutItemsParam)}`}
                  onClick={onClose}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-3 text-center"
                >
                  Proceed to Checkout <ArrowRight size={16} />
                </Link>
                <button
                  onClick={onClearCart}
                  className="w-full text-center text-xs text-zinc-500 hover:text-zinc-400 py-1"
                >
                  Clear all items
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                <ShieldCheck size={14} className="text-red-400" />
                <span>Verified prices. Guest checkout (no account needed).</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

