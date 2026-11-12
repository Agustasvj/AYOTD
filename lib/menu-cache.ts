export interface MenuCacheEntry {
  items: any[];
  categories: any[];
  demo: boolean;
  cachedAt: number;
}

let cachedPublicMenu: MenuCacheEntry | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60s in-memory cache

export function getCachedMenu(includeUnavailable: boolean): MenuCacheEntry | null {
  if (includeUnavailable) return null;
  if (cachedPublicMenu && Date.now() - cachedPublicMenu.cachedAt < CACHE_TTL_MS) {
    return cachedPublicMenu;
  }
  return null;
}

export function setCachedMenu(entry: Omit<MenuCacheEntry, "cachedAt">) {
  cachedPublicMenu = {
    ...entry,
    cachedAt: Date.now()
  };
}

export function getStaleMenu(): MenuCacheEntry | null {
  return cachedPublicMenu;
}

export function invalidateMenuCache() {
  cachedPublicMenu = null;
}

