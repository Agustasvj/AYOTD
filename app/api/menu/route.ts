import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { demoMenu, demoCategories } from "@/lib/demo-menu";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeUnavailable = url.searchParams.get("all") === "true";
  const db = getSupabaseAdmin();

  if (!db) {
    return NextResponse.json({
      items: demoMenu,
      categories: demoCategories,
      demo: true
    });
  }

  try {
    const categoriesQuery = db
      .from("categories")
      .select("id, name, description, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    let menuQuery = db
      .from("menu_items")
      .select("id, name, description, price, image_url, is_available, is_active, category_id, categories(id, name)")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (!includeUnavailable) {
      menuQuery = menuQuery.eq("is_available", true);
    }

    const [categoriesRes, menuRes] = await Promise.all([categoriesQuery, menuQuery]);

    if (categoriesRes.error || menuRes.error) {
      // If tables don't exist yet, fall back gracefully to demo
      return NextResponse.json({
        items: demoMenu,
        categories: demoCategories,
        demo: true
      });
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

    return NextResponse.json({
      items: items.length > 0 ? items : demoMenu,
      categories: categories.length > 0 ? categories : demoCategories,
      demo: false
    });
  } catch {
    return NextResponse.json({
      items: demoMenu,
      categories: demoCategories,
      demo: true
    });
  }
}
