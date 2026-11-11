"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-primary flex items-center gap-2 text-xs px-4 py-2 font-bold shadow-lg"
    >
      <Printer size={15} /> Print / Save as PDF
    </button>
  );
}

