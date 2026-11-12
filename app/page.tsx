"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { FoodCard } from "@/components/food-card";
import { FoodModal } from "@/components/food-modal";
import { CartDrawer } from "@/components/cart-drawer";
import { FloatingCart } from "@/components/floating-cart";
import type { CartLine, MenuItem, Category } from "@/lib/types";
import { demoMenu, demoCategories } from "@/lib/demo-menu";
import { kes } from "@/lib/money";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  Sparkles,
  Zap,
  Clock,
  ShieldCheck,
  MessageCircle,
  Truck,
  Flame,
  CheckCircle2,
  Utensils
} from "lucide-react";

export default function HomePage() {
  // Pre-initialize with default catalog for instant 0ms First Contentful Paint
  const [menu, setMenu] = useState<MenuItem[]>(demoMenu);
  const [categories, setCategories] = useState<Category[]>(demoCategories);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MenuItem | null>(null);

  useEffect(() => {
    // Silently fetch and sync real-time database updates in the background
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => {
        if (d.items && d.items.length > 0) {
          setMenu(d.items);
        }
        if (d.categories && d.categories.length > 0) {
          setCategories(d.categories);
        }
      })
      .catch(() => {});
  }, []);

  // Category pills list
  const categoryNames = useMemo(() => {
    const list = ["All"];
    if (categories.length > 0) {
      categories.forEach((c) => list.push(c.name));
    } else {
      const fromItems = Array.from(new Set(menu.map((x) => x.category || "Main Meals")));
      list.push(...fromItems);
    }
    return Array.from(new Set(list));
  }, [categories, menu]);

  // Filtered menu items
  const filteredMeals = useMemo(() => {
    return menu.filter((item) => {
      const matchesCategory =
        activeCategory === "All" ||
        item.category === activeCategory ||
        item.category_id === activeCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menu, activeCategory, searchQuery]);

  // Cart operations
  function addToCart(item: MenuItem, qty = 1) {
    setCart((prev) => {
      const existing = prev.find((x) => x.item.id === item.id);
      if (existing) {
        return prev.map((x) =>
          x.item.id === item.id ? { ...x, quantity: x.quantity + qty } : x
        );
      }
      return [...prev, { item, quantity: qty }];
    });
  }

  function updateQuantity(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((x) => (x.item.id === id ? { ...x, quantity: x.quantity + delta } : x))
        .filter((x) => x.quantity > 0)
    );
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((x) => x.item.id !== id));
  }

  function clearCart() {
    setCart([]);
  }

  const cartCount = cart.reduce((s, x) => s + x.quantity, 0);

  return (
    <>
      <SiteHeader cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />

      <main className="min-h-screen">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(185,28,53,.22),transparent_50%)]" />

          <div className="container-shell relative py-20 md:py-32 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/60 border border-red-800/50 text-red-300 text-xs font-semibold mb-6">
                <Flame size={14} className="text-red-400" />
                <span>Campus Delicacies • Fast Delivery to Hostels & Labs</span>
              </div>

              <h1 className="font-[Playfair_Display] text-4xl sm:text-6xl lg:text-7xl leading-[1.06] text-white">
                Fresh flavours,
                <br />
                <span className="text-red-500 italic">crafted daily</span>
                <br />
                for your campus.
              </h1>

              <p className="text-zinc-400 mt-6 max-w-xl text-base sm:text-lg leading-relaxed">
                Welcome to <strong>A Year or Two Delicacies (AYOTD)</strong>. Hearty pilau,
                slow-simmered beef, crispy chapati madondo, and student-favourite bites
                delivered hot right to your room or ready for collection.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-8">
                <a href="#menu" className="btn-primary inline-flex items-center gap-2 text-sm px-6 py-3.5 w-full sm:w-auto justify-center">
                  Explore Today&apos;s Menu <ArrowRight size={17} />
                </a>
                <Link
                  href="/track"
                  className="btn-secondary inline-flex items-center gap-2 text-sm px-5 py-3.5 hover:border-zinc-500 w-full sm:w-auto justify-center"
                >
                  <Clock size={16} className="text-red-400" /> Track My Order
                </Link>
              </div>

              {/* Value Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-8 mt-8 border-t border-zinc-800/80 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-red-400 shrink-0" />
                  <span>15–30 min campus delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-red-400 shrink-0" />
                  <span>M-Pesa STK & Cash</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle size={16} className="text-red-400 shrink-0" />
                  <span>WhatsApp orders synced</span>
                </div>
              </div>
            </div>

            {/* Hero Visual Card */}
            <div className="relative">
              <div className="panel p-3 border border-red-950/60 shadow-[0_0_50px_rgba(185,28,53,0.15)] rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900">
                  <img
                    src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=900&q=80"
                    alt="AYOTD Coastal Special"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                  {/* Highlight pill */}
                  <div className="absolute bottom-5 inset-x-5 p-4 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 flex justify-between items-center">
                    <div>
                      <div className="text-[11px] text-red-400 font-bold uppercase tracking-wider">
                        Today&apos;s Chef Special
                      </div>
                      <div className="text-lg font-bold text-white mt-0.5">
                        Swahili Chicken Biryani
                      </div>
                      <div className="text-xs text-zinc-400">Layered basmati & kachumbari</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-red-400">{kes(320)}</div>
                      <a
                        href="#menu"
                        className="text-xs font-semibold text-zinc-300 hover:text-white underline mt-0.5 inline-block"
                      >
                        Order now →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROMO / CAMPUS COMBOS BANNER */}
        <section className="bg-red-950/30 border-b border-red-900/30 py-6">
          <div className="container-shell flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-full bg-red-900/60 text-red-300 shrink-0">
                <Sparkles size={18} />
              </span>
              <div>
                <h4 className="font-bold text-sm text-white">
                  Student Budget Combo: Chapati Madondo + Fresh Juice
                </h4>
                <p className="text-xs text-zinc-400">
                  Only KES 250! Fuel up for revision and classes with our daily student deals.
                </p>
              </div>
            </div>
            <a href="#menu" className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1">
              View All Combos <ArrowRight size={14} />
            </a>
          </div>
        </section>

        {/* MENU SECTION */}
        <section id="menu" className="container-shell py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="eyebrow">Taste & Quality</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
                Explore Our Campus Menu
              </h2>
              <p className="text-zinc-400 text-sm mt-2 max-w-xl">
                Freshly prepared authentic Swahili and student-favourite dishes, cooked daily and
                delivered warm to your hostel or ready for collection.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search meals, snacks, drinks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm py-2.5 rounded-full bg-zinc-900/90 border-zinc-800"
              />
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar mb-8">
            {categoryNames.map((catName) => (
              <button
                key={catName}
                onClick={() => setActiveCategory(catName)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all border ${
                  activeCategory === catName
                    ? "bg-red-700 border-red-600 text-white shadow-md shadow-red-950/60"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                {catName}
              </button>
            ))}
          </div>

          {/* Meals Grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="panel p-5 animate-pulse space-y-4">
                  <div className="aspect-[16/10] bg-zinc-900 rounded-xl" />
                  <div className="h-5 bg-zinc-900 rounded w-2/3" />
                  <div className="h-4 bg-zinc-900 rounded w-full" />
                </div>
              ))}
            </div>
          ) : filteredMeals.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeals.map((item) => (
                <FoodCard
                  key={item.id}
                  item={item}
                  onAdd={addToCart}
                  onSelect={(m) => setSelectedMeal(m)}
                />
              ))}
            </div>
          ) : (
            <div className="panel p-12 text-center text-zinc-500 max-w-md mx-auto">
              <Utensils size={36} className="mx-auto mb-3 text-zinc-600" />
              <h3 className="font-bold text-zinc-300">No dishes found</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Try searching for something else or switch to another category.
              </p>
              <button
                onClick={() => {
                  setActiveCategory("All");
                  setSearchQuery("");
                }}
                className="mt-4 text-xs text-red-400 underline font-semibold"
              >
                Reset filters
              </button>
            </div>
          )}
        </section>

        {/* HOW TO ORDER & CAMPUS DELIVERY */}
        <section id="about" className="border-t border-zinc-900 bg-zinc-950/80 py-20">
          <div className="container-shell">
            <div className="max-w-2xl mx-auto text-center mb-16">
              <div className="eyebrow">Seamless Campus Living</div>
              <h2 className="text-3xl sm:text-4xl font-bold mt-2">How AYOTD Works</h2>
              <p className="text-zinc-400 text-sm mt-3">
                Whether you order from this website or our WhatsApp channels, our central kitchen
                coordinates your order without confusion.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="panel p-6 border-zinc-800">
                <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-800/40 flex items-center justify-center text-red-400 font-black text-lg mb-4">
                  1
                </div>
                <h3 className="font-bold text-lg text-white">Pick Your Delicacies</h3>
                <p className="text-zinc-400 text-xs sm:text-sm mt-2 leading-relaxed">
                  Browse our daily menu, add meals to your basket, or order directly via WhatsApp.
                  Prices are locked in KES.
                </p>
              </div>

              <div className="panel p-6 border-zinc-800">
                <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-800/40 flex items-center justify-center text-red-400 font-black text-lg mb-4">
                  2
                </div>
                <h3 className="font-bold text-lg text-white">M-Pesa or Cash at Door</h3>
                <p className="text-zinc-400 text-xs sm:text-sm mt-2 leading-relaxed">
                  Choose Safaricom M-Pesa STK Push for instant prompt on your phone, or pay cash
                  when picking up or upon hostel delivery.
                </p>
              </div>

              <div className="panel p-6 border-zinc-800">
                <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-800/40 flex items-center justify-center text-red-400 font-black text-lg mb-4">
                  3
                </div>
                <h3 className="font-bold text-lg text-white">Real-Time Order Tracking</h3>
                <p className="text-zinc-400 text-xs sm:text-sm mt-2 leading-relaxed">
                  Get live status updates: Kitchen Accepted, Cooking, Ready, and Rider Dispatch.
                  No guessing if your food is on its way.
                </p>
              </div>
            </div>

            {/* Direct WhatsApp Ordering Card */}
            <div className="mt-14 panel p-8 border-red-900/40 bg-gradient-to-r from-red-950/40 to-zinc-950 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                  <MessageCircle size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    Prefer ordering via WhatsApp?
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-lg">
                    Send your meal name and hostel room to our official AYOTD WhatsApp line.
                    Our system imports your message into our central kitchen queue!
                  </p>
                </div>
              </div>

              <a
                href="https://wa.me/254700000000?text=Hello%20AYOTD,%20I%20would%20like%20to%20order%20food"
                target="_blank"
                rel="noreferrer"
                className="btn-primary bg-emerald-600 hover:bg-emerald-500 whitespace-nowrap text-sm px-6 py-3 flex items-center gap-2"
              >
                <MessageCircle size={17} /> Chat with AYOTD on WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-black py-12 text-zinc-500 text-xs">
        <div className="container-shell grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="font-bold tracking-[.15em] text-white text-sm">
              A YEAR OR TWO
            </div>
            <div className="text-[10px] tracking-[.3em] text-red-500 font-semibold mb-3">
              DELICACIES
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Serving the university community with clean, hot, and tasty delicacies.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-zinc-200 mb-3 uppercase tracking-wider text-[11px]">
              Campus Deliveries
            </h4>
            <ul className="space-y-1.5 text-zinc-400">
              <li>All Student Hostels</li>
              <li>Faculty Lecture Halls</li>
              <li>University Labs & Library</li>
              <li>Campus Collection Counter</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-zinc-200 mb-3 uppercase tracking-wider text-[11px]">
              Quick Links
            </h4>
            <ul className="space-y-1.5 text-zinc-400">
              <li><a href="#menu" className="hover:text-white">Today&apos;s Menu</a></li>
              <li><Link href="/track" className="hover:text-white">Track Your Order</Link></li>
              <li><a href="#about" className="hover:text-white">Campus Delivery Info</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-zinc-200 mb-3 uppercase tracking-wider text-[11px]">
              Operating Hours
            </h4>
            <p className="text-zinc-400 leading-relaxed">
              Monday – Sunday:
              <br />
              <strong className="text-zinc-200">9:00 AM – 10:30 PM</strong>
              <br />
              Accepting M-Pesa & Cash
            </p>
          </div>
        </div>

        <div className="container-shell pt-6 border-t border-zinc-900 flex flex-wrap justify-between items-center gap-3">
          <span>© {new Date().getFullYear()} A Year or Two Delicacies (AYOTD). All rights reserved.</span>
          <span>Made for university food lovers.</span>
        </div>
      </footer>

      {/* Slide-out Basket Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
      />

      {/* Floating Bottom Basket Bar for Mobile */}
      <FloatingCart cart={cart} onOpenCart={() => setIsCartOpen(true)} />

      {/* Food Details Modal */}
      <FoodModal
        item={selectedMeal}
        onClose={() => setSelectedMeal(null)}
        onAddToCart={addToCart}
      />
    </>
  );
}
