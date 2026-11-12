import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getFromCache, setToCache, shouldRevalidate, finishRevalidation } from "@/lib/fast-cache";

const RIDERS_KEY = "riders:active";
const DEFAULT_RIDERS = [
  { id: "rider-1", full_name: "Kevin (Campus Rider #1)", role: "DELIVERY", phone: "0711000111" },
  { id: "rider-2", full_name: "Samuel (Campus Rider #2)", role: "DELIVERY", phone: "0722000222" }
];

async function fetchFreshRiders() {
  const db = getSupabaseAdmin();
  if (!db) return DEFAULT_RIDERS;

  try {
    const { data: riders, error } = await db
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("is_active", true)
      .in("role", ["DELIVERY", "ADMIN", "SUPER_ADMIN"]);

    if (error || !riders || riders.length === 0) {
      return DEFAULT_RIDERS;
    }
    return riders;
  } catch {
    return DEFAULT_RIDERS;
  }
}

export async function GET() {
  const { data: cached, status } = getFromCache<{ riders: any[] }>(RIDERS_KEY);

  if (cached) {
    // If stale, revalidate asynchronously without blocking user response
    if (status === "STALE" && shouldRevalidate("reval:riders")) {
      fetchFreshRiders()
        .then((fresh) => {
          setToCache(RIDERS_KEY, { riders: fresh }, 60000, 600000);
        })
        .finally(() => {
          finishRevalidation("reval:riders");
        });
    }

    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
        "X-AYOTD-Cache": status
      }
    });
  }

  // Cache Miss fallback
  const fresh = await fetchFreshRiders();
  const payload = { riders: fresh };
  setToCache(RIDERS_KEY, payload, 60000, 600000);

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
      "X-AYOTD-Cache": "MISS"
    }
  });
}
