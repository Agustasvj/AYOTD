"use client";

import type { MenuItem } from "@/lib/types";
import { kes } from "@/lib/money";
import { Plus, Check, Eye } from "lucide-react";
import { useState } from "react";

interface FoodCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  onSelect?: (item: MenuItem) => void;
}

export function FoodCard({ item, onAdd, onSelect }: FoodCardProps) {
  const [added, setAdded] = useState(false);

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (!item.is_available) return;
    onAdd(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  }

  const fallbackImage =
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";

  return (
    <div
      onClick={() => onSelect && onSelect(item)}
      className="panel group overflow-hidden flex flex-col justify-between cursor-pointer border border-zinc-800/80 hover:border-red-900/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] bg-zinc-950/60"
    >
      <div>
        {/* Meal Image with Overlays */}
        <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
          <img
            src={item.image_url || fallbackImage}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

          {/* Availability Badge */}
          <div className="absolute top-3 left-3 flex gap-2">
            {item.is_available ? (
              <span className="bg-zinc-950/80 backdrop-blur-md text-[11px] font-semibold text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-900/40">
                Fresh & Ready
              </span>
            ) : (
              <span className="bg-zinc-950/90 text-[11px] font-semibold text-rose-400 px-2.5 py-1 rounded-full border border-rose-900/40">
                Sold Out Today
              </span>
            )}
          </div>

          {/* Quick View Pill */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-zinc-950/80 backdrop-blur-md text-[11px] text-zinc-300 px-2 py-1 rounded-full flex items-center gap-1 border border-zinc-700">
              <Eye size={12} /> View
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-lg text-white group-hover:text-red-300 transition-colors">
              {item.name}
            </h3>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-2 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Footer Price & Add Action */}
      <div className="p-5 pt-0 flex items-center justify-between border-t border-zinc-900/80 mt-4">
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
            Price
          </span>
          <span className="text-lg font-bold text-white tracking-tight">
            {kes(item.price)}
          </span>
        </div>

        <button
          onClick={handleAdd}
          disabled={!item.is_available}
          className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full transition-all ${
            !item.is_available
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : added
              ? "bg-emerald-600 text-white"
              : "bg-red-700 hover:bg-red-600 text-white shadow-sm shadow-red-950"
          }`}
        >
          {added ? (
            <>
              <Check size={14} /> Added
            </>
          ) : (
            <>
              <Plus size={14} /> Add
            </>
          )}
        </button>
      </div>
    </div>
  );
}
