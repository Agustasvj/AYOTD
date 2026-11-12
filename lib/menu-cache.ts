import { demoMenu, demoCategories } from "./demo-menu";
import { getFromCache, setToCache, invalidatePrefix } from "./fast-cache";

export interface MenuCacheEntry {
  items: any[];
  categories: any[];
  demo: boolean;
  cachedAt: number;
}

const MENU_KEY = "menu:public";
const MENU_TTL_MS = 60 * 1000; // 60s fresh
const MENU_STALE_MS = 10 * 60 * 1000; // 10 minutes stale

export function getCachedMenu(includeUnavailable: boolean): {
  data: MenuCacheEntry | null;
  status: "FRESH" | "STALE" | "MISS";
} {
  if (includeUnavailable) {
    return { data: null, status: "MISS" };
  }
  const result = getFromCache<MenuCacheEntry>(MENU_KEY);
  return {
    data: result.data,
    status: result.status
  };
}

export function setCachedMenu(entry: Omit<MenuCacheEntry, "cachedAt">) {
  const fullEntry: MenuCacheEntry = {
    ...entry,
    cachedAt: Date.now()
  };
  setToCache(MENU_KEY, fullEntry, MENU_TTL_MS, MENU_STALE_MS);
}

export function getStaleMenu(): MenuCacheEntry {
  const cached = getFromCache<MenuCacheEntry>(MENU_KEY);
  if (cached.data) return cached.data;
  return {
    items: demoMenu,
    categories: demoCategories,
    demo: false,
    cachedAt: Date.now()
  };
}

export function invalidateMenuCache() {
  invalidatePrefix("menu:");
}
