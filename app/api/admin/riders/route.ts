import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const db = getSupabaseAdmin();

  if (!db) {
    return NextResponse.json({
      riders: [
        { id: "rider-1", full_name: "Kevin (Campus Rider #1)", role: "DELIVERY", phone: "0711000111" },
        { id: "rider-2", full_name: "Samuel (Campus Rider #2)", role: "DELIVERY", phone: "0722000222" }
      ]
    });
  }

  try {
    const { data: riders, error } = await db
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("is_active", true)
      .in("role", ["DELIVERY", "ADMIN", "SUPER_ADMIN"]);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      riders: riders && riders.length > 0 ? riders : [
        { id: "mock-rider-1", full_name: "AYOTD Express Rider", role: "DELIVERY" }
      ]
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load delivery personnel." },
      { status: 500 }
    );
  }
}

