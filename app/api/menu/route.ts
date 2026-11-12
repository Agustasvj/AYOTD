import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { demoMenu, demoCategories } from "@/lib/demo-menu";
import { getCachedMenu, setCachedMenu, getStaleMenu } from "@/lib/menu-cache";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeUnavailable = url.searchParams.get("all") === "true";

  // 1. Instant In-Memory Cache Hit (< 1ms response)
  const cached = getCachedMenu(includeUnavailable);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-AYOTD-Cache": "HIT"
      }
    });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { items: demoMenu, categories: demoCategories, demo: true },
      { headers: { "X-AYOTD-Cache": "FALLBACK-NO-DB" } }
    );
  }

  try {
    // 2. Query Supabase with a 3.5s timeout promise so cold starts never hang for 50s
    const fetchPromise = (async () => {
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
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase query timeout (3500ms)")), 3500)
    );

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    // Store in cache
    if (!includeUnavailable) {
      setCachedMenu(result);
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-AYOTD-Cache": "MISS"
      }
    });
  } catch (err) {
    console.warn("Fast fallback triggered on /api/menu:", err instanceof Error ? err.message : err);

    // If we have any previous stale cache, return it
    const stale = getStaleMenu();
    if (stale) {
      return NextResponse.json(stale, {
        headers: { "X-AYOTD-Cache": "STALE-ON-ERROR" }
      });
    }

    return NextResponse.json(
      { items: demoMenu, categories: demoCategories, demo: true },
      { headers: { "X-AYOTD-Cache": "DEMO-FALLBACK" } }
    );
  }
}
