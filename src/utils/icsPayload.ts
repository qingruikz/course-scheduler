import type {
  SemesterOption,
  CourseDays,
  ClassesPerWeek,
  ClassSlot,
  DayOfWeek,
  DeliveryMode,
  IcsExportOptions,
  CalendarEventsIcsOptions,
} from "../types";

/** URL に載せる科目 ICS 用ペイロード */
export interface ScheduleIcsPayload {
  type: "schedule";
  year: number;
  semester: SemesterOption;
  courseDays: CourseDays;
  classesPerWeek: ClassesPerWeek;
  classSlots: ClassSlot[];
  icsExportOptions: IcsExportOptions;
}

/** URL に載せる学年暦 ICS 用ペイロード */
export interface CalendarIcsPayload {
  type: "calendar";
  year: number;
  calendarIcsOptions: CalendarEventsIcsOptions;
}

export type IcsPayload = ScheduleIcsPayload | CalendarIcsPayload;

/** 文字列を base64url にエンコード（UTF-8 対応） */
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url を UTF-8 文字列にデコード */
function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** JSON を base64url にエンコード（+ / を - _ に置換） */
export function encodePayload(payload: IcsPayload): string {
  return base64UrlEncode(JSON.stringify(payload));
}

/** v1 形式の schedule ペイロードを classSlots に変換 */
function migrateSchedulePayloadToV2(d: unknown): ScheduleIcsPayload {
  const p = d as Record<string, unknown>;
  if (Array.isArray(p.classSlots) && p.classSlots.length > 0) {
    return d as ScheduleIcsPayload;
  }
  const days = (p.selectedDaysOfWeek ?? [1]) as DayOfWeek[];
  const modes = (p.deliveryModes ?? {}) as Record<DayOfWeek, DeliveryMode>;
  const perWeek = (p.classesPerWeek ?? 1) as ClassesPerWeek;
  const classSlots: ClassSlot[] = days.slice(0, perWeek).map((dow) => ({
    deliveryType: (modes[dow] ?? "face-to-face") as DeliveryMode,
    dayOfWeek: dow,
    period: 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7,
  }));
  return { ...p, classSlots } as ScheduleIcsPayload;
}

/** base64url をデコードしてペイロードを返す。不正な場合は null */
export function decodePayload(q: string): IcsPayload | null {
  try {
    const json = base64UrlDecode(q);
    const data = JSON.parse(json) as unknown;
    if (!data || typeof data !== "object") return null;
    const type = (data as { type?: string }).type;
    if (type === "schedule") return migrateSchedulePayloadToV2(data);
    if (type === "calendar") return data as CalendarIcsPayload;
    return null;
  } catch {
    return null;
  }
}
