"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  ChefHat,
  Truck,
  UtensilsCrossed,
  CreditCard,
  MessageCircle,
  Users,
  BarChart3,
  PlusCircle,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Bell
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Orders Queue", href: "/admin/orders", icon: ClipboardList },
  { name: "Kitchen Board", href: "/admin/kitchen", icon: ChefHat },
  { name: "Deliveries & Riders", href: "/admin/deliveries", icon: Truck },
  { name: "Menu & Pricing", href: "/admin/menu", icon: UtensilsCrossed },
  { name: "WhatsApp Inbox", href: "/admin/whatsapp", icon: MessageCircle },
  { name: "Payments & M-Pesa", href: "/admin/payments", icon: CreditCard },
  { name: "Customer Directory", href: "/admin/customers", icon: Users },
  { name: "Analytics & Reports", href: "/admin/analytics", icon: BarChart3 }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full border border-red-600 bg-red-950 flex items-center justify-center text-red-500 font-bold text-xs">
            AY
          </div>
          <div>
            <span className="font-bold text-sm tracking-wider">AYOTD</span>
            <span className="text-[10px] text-red-400 block font-semibold">OPS CENTER</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders/new"
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <PlusCircle size={14} /> + Order
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Sidebar for Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800/80 p-5 flex flex-col justify-between transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Logo & Role Badge */}
          <div className="flex items-center justify-between pb-6 border-b border-zinc-800/80">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-red-600 bg-red-950/40 flex items-center justify-center text-red-500 font-bold text-sm">
                AY
              </div>
              <div>
                <div className="font-bold text-sm tracking-wider text-white">AYOTD</div>
                <div className="text-[10px] tracking-widest text-red-400 font-semibold">
                  OPERATIONS
                </div>
              </div>
            </Link>
            <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-800/50 px-2 py-0.5 rounded-full font-bold">
              ADMIN
            </span>
          </div>

          {/* Quick Action Button */}
          <div className="mt-5 mb-5">
            <Link
              href="/admin/orders/new"
              onClick={() => setMobileOpen(false)}
              className="btn-primary w-full flex items-center justify-center gap-2 text-xs py-2.5 shadow-sm shadow-red-950"
            >
              <PlusCircle size={15} /> Record Manual Order
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-red-700 text-white font-bold shadow-md shadow-red-950"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-zinc-800/80 text-xs text-zinc-500 space-y-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between text-zinc-400 hover:text-white py-1"
          >
            <span className="flex items-center gap-1.5">
              <ExternalLink size={13} /> View Live Storefront
            </span>
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck size={13} className="text-red-400" />
            <span>Role: SUPER_ADMIN</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

