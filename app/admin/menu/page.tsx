"use client";

import { useEffect, useState } from "react";
import type { MenuItem, Category } from "@/lib/types";
import { kes } from "@/lib/money";
import {
  UtensilsCrossed,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  RefreshCw,
  FolderPlus,
  DollarSign,
  AlertCircle,
  Trash2
} from "lucide-react";

export default function MenuManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Modal State for New Meal
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);
  const [newMeal, setNewMeal] = useState({
    name: "",
    description: "",
    price: 250,
    categoryId: "",
    imageUrl: "",
    isAvailable: true
  });

  // Modal State for New Category
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [newCat, setNewCat] = useState({
    name: "",
    description: "",
    sortOrder: 1
  });

  async function loadMenu() {
    setLoading(true);
    try {
      const res = await fetch("/api/menu?all=true");
      const data = await res.json();
      setItems(data.items || []);
      setCategories(data.categories || []);
      if (data.categories?.length > 0 && !newMeal.categoryId) {
        setNewMeal((prev) => ({ ...prev, categoryId: data.categories[0].id }));
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenu();
  }, []);

  async function toggleAvailability(id: string, current: boolean) {
    setBusyId(id);
    try {
      await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_available: !current })
      });
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, is_available: !current } : it))
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handlePriceUpdate(id: string, currentPrice: number) {
    const input = prompt("Enter new price in KES:", String(currentPrice));
    if (!input) return;
    const price = Number(input);
    if (isNaN(price) || price <= 0) {
      alert("Invalid price.");
      return;
    }

    setBusyId(id);
    try {
      await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, price })
      });
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, price } : it))
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateMeal(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "item", data: newMeal })
      });
      if (res.ok) {
        setIsAddMealOpen(false);
        setNewMeal({
          name: "",
          description: "",
          price: 250,
          categoryId: categories[0]?.id || "",
          imageUrl: "",
          isAvailable: true
        });
        await loadMenu();
      }
    } catch (err) {
      alert("Failed to create meal.");
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", data: newCat })
      });
      if (res.ok) {
        setIsAddCatOpen(false);
        setNewCat({ name: "", description: "", sortOrder: categories.length + 1 });
        await loadMenu();
      }
    } catch (err) {
      alert("Failed to create category.");
    }
  }

  async function handleDeleteMeal(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}" from the menu?`)) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/menu?id=${encodeURIComponent(id)}&type=item`, {
        method: "DELETE"
      });
      if (res.ok) {
        setItems((prev) => prev.filter((x) => x.id !== id));
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Failed to delete meal.");
      }
    } catch {
      alert("Network error deleting meal.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Dishes in this category will remain unassigned.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/menu?id=${encodeURIComponent(id)}&type=category`, {
        method: "DELETE"
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((x) => x.id !== id));
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Failed to delete category.");
      }
    } catch {
      alert("Network error deleting category.");
    }
  }

  const filteredItems = items.filter((it) => {
    const matchesCategory =
      activeCategory === "ALL" ||
      it.category === activeCategory ||
      it.category_id === activeCategory;
    const matchesSearch =
      search.trim() === "" ||
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <UtensilsCrossed size={14} /> Catalog Management
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            Menu Items & Pricing
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Set meal availability during rushes, adjust prices, and introduce new campus specials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddCatOpen(true)}
            className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <FolderPlus size={14} /> + Category
          </button>
          <button
            onClick={() => setIsAddMealOpen(true)}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold"
          >
            <Plus size={14} /> + Add Meal
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel p-4 border-zinc-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search meal by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-xs sm:text-sm py-2.5 rounded-xl bg-zinc-900 border-zinc-800"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="text-xs sm:text-sm py-2.5 rounded-xl bg-zinc-900 border-zinc-800"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Meals Table */}
      <section className="panel overflow-hidden border-zinc-800">
        {loading ? (
          <div className="p-16 text-center text-zinc-500 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading catalog...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <UtensilsCrossed size={36} className="mx-auto mb-2 text-zinc-600" />
            <h3 className="font-bold text-white">No meals found</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Add a new meal dish or reset your search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                  <th className="p-4 font-semibold">Dish</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Price (KES)</th>
                  <th className="p-4 font-semibold">Kitchen Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredItems.map((it) => {
                  const isBusy = busyId === it.id;

                  return (
                    <tr key={it.id} className="hover:bg-zinc-900/40 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {it.image_url ? (
                            <img
                              src={it.image_url}
                              alt={it.name}
                              className="w-12 h-12 rounded-lg object-cover bg-zinc-900 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-600 shrink-0 font-bold text-xs">
                              AY
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white text-sm">
                              {it.name}
                            </div>
                            <div className="text-xs text-zinc-400 truncate max-w-sm line-clamp-1">
                              {it.description}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {it.category || "Meal"}
                        </span>
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => handlePriceUpdate(it.id, it.price)}
                          className="font-bold text-white hover:text-red-400 flex items-center gap-1.5"
                          title="Click to edit price"
                        >
                          <span>{kes(it.price)}</span>
                          <Edit2 size={12} className="text-zinc-500" />
                        </button>
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => toggleAvailability(it.id, it.is_available)}
                          disabled={isBusy}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                            it.is_available
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800 hover:bg-emerald-900"
                              : "bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900"
                          }`}
                        >
                          {it.is_available ? (
                            <>
                              <CheckCircle2 size={12} /> Available
                            </>
                          ) : (
                            <>
                              <XCircle size={12} /> Sold Out
                            </>
                          )}
                        </button>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleAvailability(it.id, it.is_available)}
                            disabled={isBusy}
                            className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition"
                          >
                            {it.is_available ? "Mark Sold Out" : "Mark Ready"}
                          </button>
                          <button
                            onClick={() => handleDeleteMeal(it.id, it.name)}
                            disabled={isBusy}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/50 border border-transparent hover:border-rose-900/60 transition"
                            title={`Delete "${it.name}"`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Meal Modal */}
      {isAddMealOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateMeal}
            className="panel p-6 max-w-lg w-full border-zinc-800 space-y-4"
          >
            <h2 className="font-bold text-lg text-white">Add New Meal Dish</h2>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Meal Name *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Swahili Coconut Fish with Rice"
                value={newMeal.name}
                onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={newMeal.categoryId}
                  onChange={(e) =>
                    setNewMeal({ ...newMeal, categoryId: e.target.value })
                  }
                  className="text-xs sm:text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Price in KES *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={newMeal.price}
                  onChange={(e) =>
                    setNewMeal({ ...newMeal, price: Number(e.target.value) })
                  }
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Brief ingredients and serving details..."
                value={newMeal.description}
                onChange={(e) =>
                  setNewMeal({ ...newMeal, description: e.target.value })
                }
                className="text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Image URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={newMeal.imageUrl}
                onChange={(e) =>
                  setNewMeal({ ...newMeal, imageUrl: e.target.value })
                }
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsAddMealOpen(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs px-5 py-2 font-bold">
                Save Meal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateCategory}
            className="panel p-6 max-w-md w-full border-zinc-800 space-y-4"
          >
            <h2 className="font-bold text-lg text-white">Create Food Category</h2>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Category Name *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Campus Breakfasts"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                className="text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Description
              </label>
              <input
                type="text"
                placeholder="Short description..."
                value={newCat.description}
                onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsAddCatOpen(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs px-5 py-2 font-bold">
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

