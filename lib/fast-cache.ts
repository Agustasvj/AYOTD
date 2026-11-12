import { demoMenu, demoCategories } from "./demo-menu";

interface CacheItem<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
  staleTtlMs: number;
}

const store = new Map<string, CacheItem<any>>();
const activeRevalidations = new Set<string>();

/**
 * Universal in-memory cache with Stale-While-Revalidate (SWR) support.
 * Returns { data, isFresh, isStale, isMissing } in < 1ms.
 */
export function getFromCache<T>(key: string): {
  data: T | null;
  status: "FRESH" | "STALE" | "MISS";
} {
  const item = store.get(key);
  if (!item) {
    return { data: null, status: "MISS" };
  }

  const age = Date.now() - item.cachedAt;
  if (age <= item.ttlMs) {
    return { data: item.data, status: "FRESH" };
  }

  if (age <= item.staleTtlMs) {
    return { data: item.data, status: "STALE" };
  }

  return { data: null, status: "MISS" };
}

export function setToCache<T>(
  key: string,
  data: T,
  ttlMs: number = 30000,
  staleTtlMs: number = 300000
) {
  store.set(key, {
    data,
    cachedAt: Date.now(),
    ttlMs,
    staleTtlMs
  });
}

export function invalidateCache(key: string) {
  store.delete(key);
}

export function invalidatePrefix(prefix: string) {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) {
      store.delete(k);
    }
  }
}

/**
 * Lock helper to ensure only ONE background fetch runs for a key at a time.
 */
export function shouldRevalidate(key: string): boolean {
  if (activeRevalidations.has(key)) {
    return false;
  }
  activeRevalidations.add(key);
  return true;
}

export function finishRevalidation(key: string) {
  activeRevalidations.delete(key);
}

// ---------------------------------------------------------------------------
// Pre-seeding: Initialize instant in-memory defaults on application boot
// ---------------------------------------------------------------------------
setToCache(
  "menu:public",
  {
    items: demoMenu,
    categories: demoCategories,
    demo: false
  },
  60000, // 60s fresh
  600000 // 10m stale
);

setToCache(
  "riders:active",
  {
    riders: [
      { id: "rider-1", full_name: "Kevin (Campus Rider #1)", role: "DELIVERY", phone: "0711000111" },
      { id: "rider-2", full_name: "Samuel (Campus Rider #2)", role: "DELIVERY", phone: "0722000222" }
    ]
  },
  60000, // 60s fresh
  600000 // 10m stale
);

