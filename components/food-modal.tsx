"use client";

import { useState } from "react";
import type { MenuItem } from "@/lib/types";
import { kes } from "@/lib/money";
import { X, Plus, Minus, ShoppingBag, Utensils, Check } from "lucide-react";

interface FoodModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number, instructions?: string) => void;
}

export function FoodModal({ item, onClose, onAddToCart }: FoodModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  if (!item) return null;

  const total = item.price * quantity;
  const fallbackImage =
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";

  function handleAdd() {
    if (!item?.is_available) return;
    onAddToCart(item, quantity, instructions);
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      onClose();
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-zinc-300 hover:text-white hover:bg-black/80 transition"
        >
          <X size={18} />
        </button>

        {/* Meal Image */}
        <div className="relative aspect-[16/9] w-full bg-zinc-900 shrink-0">
          <img
            src={item.image_url || fallbackImage}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-5">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-950/80 border border-red-800/50 text-red-300">
              {item.category || "Main Meals"}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-white">{item.name}</h2>
            <div className="text-red-400 font-bold text-xl mt-1">{kes(item.price)}</div>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <div>
              <span className="text-sm font-semibold text-zinc-200 block">Select Quantity</span>
              <span className="text-xs text-zinc-500">Portions to prepare</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-200 hover:bg-zinc-700"
              >
                <Minus size={14} />
              </button>
              <span className="font-bold text-lg w-6 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-200 hover:bg-zinc-700"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Kitchen Preferences / Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Special Preparation Notes (Optional)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Extra kachumbari, less chilli, pack fork..."
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-zinc-500 block">Total</span>
            <span className="text-xl font-bold text-white">{kes(total)}</span>
          </div>
          <button
            onClick={handleAdd}
            disabled={!item.is_available || justAdded}
            className={`btn-primary flex items-center gap-2 px-6 py-3 text-sm ${
              !item.is_available ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {justAdded ? (
              <>
                <Check size={16} /> Added to Basket
              </>
            ) : (
              <>
                <ShoppingBag size={16} /> Add to Basket ({quantity})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

