export const ROUTE_SCROLL_STORAGE_KEY = "route_scroll_positions_v1";
export const ROUTE_HISTORY_STORAGE_KEY = "route_history_stack_v1";
export const ROUTE_RESTORE_TARGET_STORAGE_KEY = "route_restore_target_v1";

export function buildRouteKey(pathname: string, search = "") {
  return search ? `${pathname}?${search}` : pathname;
}

export function readScrollPositions() {
  if (typeof window === "undefined") return {} as Record<string, number>;
  try {
    const raw = sessionStorage.getItem(ROUTE_SCROLL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function writeScrollPositions(value: Record<string, number>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ROUTE_SCROLL_STORAGE_KEY, JSON.stringify(value));
}

export function readRouteHistory() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const raw = sessionStorage.getItem(ROUTE_HISTORY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeRouteHistory(value: string[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ROUTE_HISTORY_STORAGE_KEY, JSON.stringify(value.slice(-40)));
}
