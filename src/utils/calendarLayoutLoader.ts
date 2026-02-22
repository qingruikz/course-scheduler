import type { CalendarLayout } from "../types";

const layoutModules = import.meta.glob<{ default: CalendarLayout }>(
  "../data/calendar_layout_*.json"
);

const cache = new Map<number, CalendarLayout | null>();

/**
 * 年度を指定してカレンダー布局 JSON を読み込む。JSON は src/data/calendar_layout_YYYY.json に配置する。
 */
export async function loadCalendarLayout(
  year: number
): Promise<CalendarLayout | null> {
  const cached = cache.get(year);
  if (cached !== undefined) return cached;
  const key = Object.keys(layoutModules).find((k) =>
    k.includes(`calendar_layout_${year}.json`)
  );
  if (!key) {
    cache.set(year, null);
    return null;
  }
  try {
    const mod = layoutModules[key];
    if (!mod) {
      cache.set(year, null);
      return null;
    }
    const data = await mod();
    const layout = (data as { default: CalendarLayout }).default;
    cache.set(year, layout);
    return layout;
  } catch {
    cache.set(year, null);
    return null;
  }
}

export function getCalendarLayoutSync(
  year: number
): CalendarLayout | null | undefined {
  return cache.get(year);
}
