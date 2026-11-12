import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { demoMenu, demoCategories } from "@/lib/demo-menu";
import { getCachedMenu, setCachedMenu, getStaleMenu } from "@/lib/menu-cache";
import { shouldRevalidate, finishRevalidation } from "@/lib/fast-cache";

async function fetchFreshMenu(includeUnavailable: boolean) {
  const db = getSupabaseAdmin();
  if (!db) {
    return {
      items: demoMenu,
      categories: demoCategories,
      demo: true
    };
  }

  const categoriesQuery = db
    .from("categories")
    .select("id, name, description, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  let menuQuery = db
    .from("menu_items")
    .select(
      "id, name, description, price, image_url, is_available, is_active, category_id, categories(id, name)"
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (!includeUnavailable) {
    menuQuery = menuQuery.eq("is_available", true);
  }

  const [categoriesRes, menuRes] = await Promise.all([categoriesQuery, menuQuery]);

  if (categoriesRes.error || menuRes.error) {
    throw new Error(categoriesRes.error?.message || menuRes.error?.message);
  }

  const categories = categoriesRes.data || [];
  const items = (menuRes.data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description || "",
    price: Number(item.price),
    image_url: item.image_url || undefined,
    category_id: item.category_id,
    category: item.categories?.name || "Main meals",
    is_available: item.is_available,
    is_active: item.is_active
  }));

  return {
    items: items.length > 0 ? items : demoMenu,
    categories: categories.length > 0 ? categories : demoCategories,
    demo: items.length === 0
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeUnavailable = url.searchParams.get("all") === "true";

  // 1. Instant Cache Check (< 1ms response)
  const { data: cached, status } = getCachedMenu(includeUnavailable);

  if (cached) {
    // If stale, kick off background revalidation without blocking client response
    if (status === "STALE" && shouldRevalidate("reval:menu")) {
      fetchFreshMenu(includeUnavailable)
        .then((fresh) => {
          setCachedMenu(fresh);
        })
        .catch((err) => {
          console.warn("Background menu revalidation error:", err);
        })
        .finally(() => {
          finishRevalidation("reval:menu");
        });
    }

    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
        "X-AYOTD-Cache": status
      }
    });
  }

  // 2. Cache Miss: Synchronous fetch with fast fallback
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase query timeout (3000ms)")), 3000)
    );

    const result = await Promise.race([
      fetchFreshMenu(includeUnavailable),
      timeoutPromise
    ]);

    if (!includeUnavailable) {
      setCachedMenu(result);
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
        "X-AYOTD-Cache": "MISS"
      }
    });
  } catch (err) {
    console.warn("Fallback triggered on /api/menu:", err instanceof Error ? err.message : err);
    const stale = getStaleMenu();
    return NextResponse.json(stale, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60",
        "X-AYOTD-Cache": "FALLBACK-STALE"
      }
    });
  }
}
