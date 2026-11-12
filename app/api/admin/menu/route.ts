import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { menuItemSchema, categorySchema } from "@/lib/validation";
import { invalidateMenuCache } from "@/lib/menu-cache";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const type = body?.type; // 'category' or 'item'
  const db = getSupabaseAdmin();

  if (!db) {
    return NextResponse.json({
      success: true,
      message: "Item saved (demo mode)"
    });
  }

  try {
    if (type === "category") {
      const parsed = categorySchema.safeParse(body.data);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid category data", details: parsed.error.flatten() }, { status: 400 });
      }

      const { data, error } = await db
        .from("categories")
        .insert({
          name: parsed.data.name,
          description: parsed.data.description || null,
          sort_order: parsed.data.sortOrder
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, category: data });
    } else {
      const parsed = menuItemSchema.safeParse(body.data);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid meal data", details: parsed.error.flatten() }, { status: 400 });
      }

      const { data, error } = await db
        .from("menu_items")
        .insert({
          name: parsed.data.name,
          description: parsed.data.description || null,
          price: parsed.data.price,
          category_id: parsed.data.categoryId,
          image_url: parsed.data.imageUrl || null,
          is_available: parsed.data.isAvailable
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      invalidateMenuCache();
      return NextResponse.json({ success: true, item: data });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create menu item." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const { id, is_available, price, name, description, is_active } = body || {};

  if (!id) {
    return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ success: true, message: "Updated in demo mode" });
  }

  try {
    const updatePayload: any = {};
    if (typeof is_available === "boolean") updatePayload.is_available = is_available;
    if (typeof is_active === "boolean") updatePayload.is_active = is_active;
    if (typeof price === "number") updatePayload.price = price;
    if (typeof name === "string") updatePayload.name = name;
    if (typeof description === "string") updatePayload.description = description;

    const { error } = await db
      .from("menu_items")
      .update(updatePayload)
      .eq("id", id);

    if (error) throw new Error(error.message);

    invalidateMenuCache();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update menu item." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const type = url.searchParams.get("type") || "item";

  if (!id) {
    return NextResponse.json({ error: "Item ID is required for deletion" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    invalidateMenuCache();
    return NextResponse.json({ success: true, id, message: "Deleted (demo mode)" });
  }

  try {
    const table = type === "category" ? "categories" : "menu_items";
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);

    invalidateMenuCache();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete item." },
      { status: 500 }
    );
  }
}

