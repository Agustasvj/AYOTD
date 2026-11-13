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
  AlertCircle,
  AlertTriangle,
  Trash2,
  X,
  Loader2,
  Layers,
  DollarSign
} from "lucide-react";

export default function MenuManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }

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

  // Modal State for Deleting Meal
  const [mealToDelete, setMealToDelete] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Modal State for Editing Existing Meal
  const [editingMeal, setEditingMeal] = useState<MenuItem | null>(null);
  const [isUpdatingMeal, setIsUpdatingMeal] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal State for Quick Price Update
  const [priceEditingMeal, setPriceEditingMeal] = useState<{ id: string; name: string; price: number } | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<number>(0);

  // Modal State for Categories Management
  const [isManageCatsOpen, setIsManageCatsOpen] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

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
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_available: !current })
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, is_available: !current } : it))
        );
        showToast(!current ? "Marked as Available" : "Marked as Sold Out");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDeleteMeal() {
    if (!mealToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/menu?id=${encodeURIComponent(mealToDelete.id)}&type=item`, {
        method: "DELETE"
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setItems((prev) => prev.filter((x) => x.id !== mealToDelete.id));
        showToast(`"${mealToDelete.name}" was deleted successfully.`);
        setMealToDelete(null);
        if (editingMeal?.id === mealToDelete.id) {
          setEditingMeal(null);
        }
      } else {
        setDeleteError(data.error || "Failed to delete meal.");
      }
    } catch {
      setDeleteError("Network error: Could not reach the server.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSavePrice(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!priceEditingMeal || newPriceValue <= 0) return;

    const { id, name } = priceEditingMeal;
    setBusyId(id);

    try {
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, price: Number(newPriceValue) })
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, price: Number(newPriceValue) } : it))
        );
        showToast(`Price for "${name}" updated to ${kes(newPriceValue)}.`);
        setPriceEditingMeal(null);
      } else {
        showToast("Failed to update price.", "error");
      }
    } catch {
      showToast("Network error updating price.", "error");
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
        showToast("New meal dish added to catalog.");
        await loadMenu();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Failed to create meal.");
      }
    } catch {
      alert("Network error creating meal.");
    }
  }

  async function handleUpdateMeal(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMeal) return;

    setIsUpdatingMeal(true);
    setEditError(null);

    try {
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMeal.id,
          name: editingMeal.name,
          price: Number(editingMeal.price),
          description: editingMeal.description,
          category_id: editingMeal.category_id,
          image_url: editingMeal.image_url,
          is_available: editingMeal.is_available
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setItems((prev) =>
          prev.map((it) => (it.id === editingMeal.id ? { ...editingMeal } : it))
        );
        showToast(`"${editingMeal.name}" updated successfully.`);
        setEditingMeal(null);
        await loadMenu();
      } else {
        setEditError(data.error || "Failed to update meal.");
      }
    } catch {
      setEditError("Network error updating meal.");
    } finally {
      setIsUpdatingMeal(false);
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
        showToast("New category created.");
        await loadMenu();
      }
    } catch {
      alert("Failed to create category.");
    }
  }

  async function confirmDeleteCategory(id: string, name: string) {
    setDeletingCatId(id);
    try {
      const res = await fetch(`/api/admin/menu?id=${encodeURIComponent(id)}&type=category`, {
        method: "DELETE"
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setCategories((prev) => prev.filter((x) => x.id !== id));
        showToast(`Category "${name}" removed.`);
        await loadMenu();
      } else {
        showToast(data.error || "Failed to delete category.", "error");
      }
    } catch {
      showToast("Network error deleting category.", "error");
    } finally {
      setDeletingCatId(null);
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
    <div className="space-y-6 animate-fade-in pb-16 relative">
      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold backdrop-blur-md transition-all ${
            toast.type === "success"
              ? "bg-zinc-900/95 text-emerald-300 border-emerald-500/50 shadow-emerald-950/40"
              : "bg-zinc-900/95 text-red-300 border-red-500/50 shadow-red-950/40"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

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
            Set meal availability during rushes, adjust prices, edit dishes, or remove items from the catalog.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsManageCatsOpen(true)}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
            title="View & manage food categories"
          >
            <Layers size={14} /> Categories ({categories.length})
          </button>
          <button
            onClick={() => setIsAddCatOpen(true)}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
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
            <option value="ALL">All Categories ({items.length})</option>
            {categories.map((c) => {
              const count = items.filter(
                (it) => it.category === c.name || it.category_id === c.id
              ).length;
              return (
                <option key={c.id} value={c.name}>
                  {c.name} ({count})
                </option>
              );
            })}
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
                  <th className="p-4 font-semibold text-right min-w-[240px]">Actions</th>
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
                          type="button"
                          onClick={() => {
                            setPriceEditingMeal({ id: it.id, name: it.name, price: it.price });
                            setNewPriceValue(it.price);
                          }}
                          className="font-bold text-white hover:text-red-400 flex items-center gap-1.5 transition cursor-pointer group"
                          title="Click to edit price"
                        >
                          <span>{kes(it.price)}</span>
                          <Edit2 size={12} className="text-zinc-500 group-hover:text-red-400" />
                        </button>
                      </td>

                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => toggleAvailability(it.id, it.is_available)}
                          disabled={isBusy}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
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

                      <td className="p-4 text-right whitespace-nowrap min-w-[240px]">
                        <div className="flex items-center justify-end gap-2 shrink-0">
                          {/* Toggle availability fast button */}
                          <button
                            type="button"
                            onClick={() => toggleAvailability(it.id, it.is_available)}
                            disabled={isBusy}
                            className="text-xs text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
                          >
                            {it.is_available ? "Mark Out" : "Mark Ready"}
                          </button>

                          {/* Edit Dish Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMeal({ ...it });
                              setEditError(null);
                            }}
                            disabled={isBusy}
                            className="text-xs text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 flex items-center gap-1 transition cursor-pointer"
                            title={`Edit "${it.name}"`}
                          >
                            <Edit2 size={12} /> Edit
                          </button>

                          {/* Delete Dish Button - prominent in red */}
                          <button
                            type="button"
                            onClick={() => {
                              setMealToDelete(it);
                              setDeleteError(null);
                            }}
                            disabled={isBusy}
                            className="text-xs font-semibold text-rose-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 border border-rose-900/60 hover:border-rose-700 flex items-center gap-1.5 transition active:scale-95 shadow-sm shadow-rose-950/40 cursor-pointer"
                            title={`Delete "${it.name}"`}
                          >
                            <Trash2 size={13} className="text-rose-400" /> Delete
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

      {/* ========================================================================= */}
      {/* 1. In-App Delete Confirmation Modal (NO native browser confirm)            */}
      {/* ========================================================================= */}
      {mealToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="panel p-6 max-w-md w-full border-rose-900/60 bg-zinc-950 shadow-2xl relative">
            <button
              onClick={() => {
                if (!isDeleting) setMealToDelete(null);
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Delete Meal from Menu</h3>
                <p className="text-xs text-zinc-400">This action permanently removes the dish from the active catalog.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 mb-4 space-y-1.5">
              <div className="font-bold text-white text-sm flex items-center justify-between">
                <span>{mealToDelete.name}</span>
                <span className="text-emerald-400 font-mono">{kes(mealToDelete.price)}</span>
              </div>
              <div className="text-xs text-zinc-400">
                Category: <span className="text-zinc-200">{mealToDelete.category || "Main"}</span>
              </div>
              {mealToDelete.description && (
                <div className="text-[11px] text-zinc-500 line-clamp-2">
                  {mealToDelete.description}
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/30 text-amber-300 text-xs flex items-start gap-2 mb-4">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
              <span>
                Customers will no longer see this dish on the storefront. Past customer receipts and sales reports will remain intact.
              </span>
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-300 text-xs flex items-start gap-2 mb-4">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMealToDelete(null)}
                disabled={isDeleting}
                className="btn-secondary text-xs px-4 py-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMeal}
                disabled={isDeleting}
                className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-950 transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Yes, Delete Meal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Edit Meal Modal                                                        */}
      {/* ========================================================================= */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleUpdateMeal}
            className="panel p-6 max-w-lg w-full border-zinc-800 space-y-4 relative bg-zinc-950 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setEditingMeal(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900"
            >
              <X size={18} />
            </button>

            <h2 className="font-bold text-lg text-white">Edit Meal Dish</h2>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Meal Name *
              </label>
              <input
                required
                type="text"
                value={editingMeal.name}
                onChange={(e) => setEditingMeal({ ...editingMeal, name: e.target.value })}
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
                  value={editingMeal.category_id || ""}
                  onChange={(e) =>
                    setEditingMeal({ ...editingMeal, category_id: e.target.value })
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
                  value={editingMeal.price}
                  onChange={(e) =>
                    setEditingMeal({ ...editingMeal, price: Number(e.target.value) })
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
                value={editingMeal.description}
                onChange={(e) =>
                  setEditingMeal({ ...editingMeal, description: e.target.value })
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
                value={editingMeal.image_url || ""}
                onChange={(e) =>
                  setEditingMeal({ ...editingMeal, image_url: e.target.value })
                }
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="editAvailable"
                checked={editingMeal.is_available}
                onChange={(e) =>
                  setEditingMeal({ ...editingMeal, is_available: e.target.checked })
                }
                className="rounded border-zinc-700 bg-zinc-900 text-red-600 h-4 w-4"
              />
              <label htmlFor="editAvailable" className="text-xs text-zinc-300">
                Available for ordering on customer storefront
              </label>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{editError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              {/* Secondary Delete option from edit modal */}
              <button
                type="button"
                onClick={() => {
                  setMealToDelete(editingMeal);
                }}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 transition cursor-pointer"
              >
                <Trash2 size={14} /> Delete this Dish
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMeal(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingMeal}
                  className="btn-primary text-xs px-5 py-2 font-bold flex items-center gap-1.5"
                >
                  {isUpdatingMeal ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. In-App Quick Price Editor Modal (replaces window.prompt)               */}
      {/* ========================================================================= */}
      {priceEditingMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSavePrice}
            className="panel p-6 max-w-sm w-full border-zinc-800 space-y-4 bg-zinc-950 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setPriceEditingMeal(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900"
            >
              <X size={18} />
            </button>

            <div>
              <div className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">
                Edit Dish Price
              </div>
              <h3 className="font-bold text-white text-base">{priceEditingMeal.name}</h3>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                New Price (KES)
              </label>
              <div className="relative">
                <input
                  autoFocus
                  required
                  type="number"
                  min="10"
                  step="5"
                  value={newPriceValue}
                  onChange={(e) => setNewPriceValue(Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-3 text-lg font-bold font-mono bg-zinc-900 border border-zinc-700 rounded-xl text-white outline-none focus:border-red-500"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                  KES
                </span>
              </div>
            </div>

            {/* Quick +/- 50 buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewPriceValue((prev) => Math.max(10, prev - 50))}
                className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
              >
                -50
              </button>
              <button
                type="button"
                onClick={() => setNewPriceValue((prev) => Math.max(10, prev - 10))}
                className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => setNewPriceValue((prev) => prev + 10)}
                className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => setNewPriceValue((prev) => prev + 50)}
                className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
              >
                +50
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPriceEditingMeal(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs px-5 py-2 font-bold cursor-pointer"
              >
                Save Price
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Category Management Modal                                              */}
      {/* ========================================================================= */}
      {isManageCatsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="panel p-6 max-w-lg w-full border-zinc-800 bg-zinc-950 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsManageCatsOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900"
            >
              <X size={18} />
            </button>

            <div className="mb-4">
              <h2 className="font-bold text-lg text-white">Food Categories</h2>
              <p className="text-xs text-zinc-400">View catalog groupings or remove obsolete categories.</p>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 divide-y divide-zinc-900">
              {categories.map((c) => {
                const count = items.filter(
                  (it) => it.category === c.name || it.category_id === c.id
                ).length;
                const isDeletingThis = deletingCatId === c.id;

                return (
                  <div key={c.id} className="pt-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                        <span>{c.name}</span>
                        <span className="text-[10px] font-semibold bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-800">
                          {count} {count === 1 ? "dish" : "dishes"}
                        </span>
                      </div>
                      {c.description && (
                        <div className="text-[11px] text-zinc-500">{c.description}</div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => confirmDeleteCategory(c.id, c.name)}
                      disabled={isDeletingThis}
                      className="px-2.5 py-1 text-xs text-rose-400 hover:text-white bg-rose-950/30 hover:bg-rose-900/60 border border-rose-900/40 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      title={`Delete category "${c.name}"`}
                    >
                      {isDeletingThis ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-zinc-800 mt-4">
              <button
                onClick={() => {
                  setIsManageCatsOpen(false);
                  setIsAddCatOpen(true);
                }}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
              >
                <FolderPlus size={13} /> Add Category
              </button>
              <button
                onClick={() => setIsManageCatsOpen(false)}
                className="btn-primary text-xs px-4 py-1.5 font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Add Meal Modal                                                         */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 6. Add Category Modal                                                     */}
      {/* ========================================================================= */}
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
