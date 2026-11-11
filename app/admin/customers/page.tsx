"use client";

import { useEffect, useState } from "react";
import { kes } from "@/lib/money";
import { Users, Search, Phone, RefreshCw, ShoppingBag, DollarSign } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <Users size={14} /> CRM & Campus Patrons
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            Customer Directory
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Registered customer records, order frequency, and lifetime campus spend.
          </p>
        </div>

        <button
          onClick={() => loadCustomers()}
          className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="panel p-4 border-zinc-800">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by customer name or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-xs sm:text-sm py-2.5 rounded-xl bg-zinc-900 border-zinc-800"
          />
        </div>
      </div>

      {/* Table */}
      <section className="panel overflow-hidden border-zinc-800">
        {loading ? (
          <div className="p-16 text-center text-zinc-500 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading customer records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <Users size={36} className="mx-auto mb-2 text-zinc-600" />
            <h3 className="font-bold text-white">No customers found</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">Phone Number</th>
                  <th className="p-4 font-semibold">Total Orders</th>
                  <th className="p-4 font-semibold">Lifetime Spend</th>
                  <th className="p-4 font-semibold text-right">Customer Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-900/40 transition">
                    <td className="p-4 font-bold text-white">
                      {c.full_name}
                    </td>

                    <td className="p-4 font-mono text-zinc-300">
                      <a href={`tel:${c.phone}`} className="hover:underline flex items-center gap-1.5">
                        <Phone size={12} className="text-red-400" />
                        {c.phone}
                      </a>
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-200">
                        {c.order_count} orders
                      </span>
                    </td>

                    <td className="p-4 font-bold text-red-400">
                      {kes(c.total_spent)}
                    </td>

                    <td className="p-4 text-right text-zinc-500 text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

