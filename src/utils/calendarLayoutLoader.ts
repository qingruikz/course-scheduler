import type { CalendarLayout } from "../types";

const layoutModules = import.meta.glob<{ default: CalendarLayout }>(
  "../data/calendar_layout_*.json",
);

const cache = new Map<number, CalendarLayout | null>();

function findLayoutModule(year: number): {
  loader: () => Promise<{ default: CalendarLayout }>;
  preview: boolean;
} | null {
  const entries = Object.entries(layoutModules);
  const standardSuffix = `/calendar_layout_${year}.json`;
  const previewSuffix = `/calendar_layout_${year}_preview.json`;
  const standard = entries.find(([key]) => key.endsWith(standardSuffix));
  const preview = entries.find(([key]) => key.endsWith(previewSuffix));
  const match = standard ?? preview;
  return match ? { loader: match[1], preview: !standard } : null;
}

/** 正式版がなく preview 版が読み込まれる年度かを返す。 */
export function isPreviewCalendarLayoutYear(year: number): boolean {
  return findLayoutModule(year)?.preview ?? false;
}

/**
 * 年度を指定してカレンダー配置 JSON を読み込む。
 * 正式版がない場合は calendar_layout_YYYY_preview.json を使用する。
 */
export async function loadCalendarLayout(
  year: number,
): Promise<CalendarLayout | null> {
  const cached = cache.get(year);
  if (cached !== undefined) return cached;
  const module = findLayoutModule(year);
  if (!module) {
    cache.set(year, null);
    return null;
  }
  try {
    const data = await module.loader();
    const layout = (data as { default: CalendarLayout }).default;
    cache.set(year, layout);
    return layout;
  } catch {
    cache.set(year, null);
    return null;
  }
}

export function getCalendarLayoutSync(
  year: number,
): CalendarLayout | null | undefined {
  return cache.get(year);
}
