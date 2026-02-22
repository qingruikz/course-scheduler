import * as XLSX from "xlsx";
import type {
  ScheduleItem,
  IcsExportOptions,
  IcsSlot,
  SemesterOption,
  DayOfWeek,
  CalendarEvent,
  CalendarEventsIcsOptions,
} from "../types";
import { PERIOD_TIMES_MAP } from "./periodTimes";

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
/** RRULE BYDAY 用（0=日〜6=土） */
const BYDAY_ICS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function exportToExcel(
  schedule: ScheduleItem[],
  filename: string = "schedule.xlsx",
) {
  const data = schedule.map((item) => {
    if (item.isHoliday) {
      return {
        日付: item.dateStr,
        曜日: item.dayOfWeek,
        授業回数: "",
        実施方法: "",
        備考: `（休講）${item.holidayReason}`,
      };
    } else {
      const deliveryModeText =
        item.deliveryMode === "online" ? "オンライン" : "対面";
      return {
        日付: item.dateStr,
        曜日: item.dayOfWeek,
        授業回数: `第${item.classNumber}回`,
        実施方法: deliveryModeText,
        備考: "",
      };
    }
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "授業日程");

  XLSX.writeFile(wb, filename);
}

export function exportToTXT(
  schedule: ScheduleItem[],
  filename: string = "schedule.txt",
) {
  const lines = schedule.map((item) => {
    if (item.isHoliday) {
      return `${item.dateStr} （休講）${item.holidayReason}`;
    } else {
      const deliveryModeText =
        item.deliveryMode === "online" ? "オンライン" : "対面";
      return `${item.dateStr} 第${item.classNumber}回 ${deliveryModeText}`;
    }
  });

  const content = lines.join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToMarkdown(
  schedule: ScheduleItem[],
  filename: string = "schedule.md",
) {
  const lines = schedule.map((item) => {
    if (item.isHoliday) {
      return `- ${item.dateStr} （休講）${item.holidayReason}`;
    } else {
      const deliveryModeText =
        item.deliveryMode === "online" ? "オンライン" : "対面";
      return `- ${item.dateStr} 第${item.classNumber}回 ${deliveryModeText}`;
    }
  });

  const content = `# 授業日程\n\n${lines.join("\n")}\n`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(
  schedule: ScheduleItem[],
  filename: string = "schedule.json",
) {
  const data = schedule.map((item) => ({
    date: item.dateStr,
    dayOfWeek: item.dayOfWeek,
    classNumber: item.classNumber || null,
    isHoliday: item.isHoliday,
    holidayReason: item.holidayReason || null,
    deliveryMode: item.deliveryMode || null,
  }));

  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** ICS の値で改行・バックスラッシュをエスケープ */
function escapeIcsValue(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

/** 長い行を RFC 5545 に従い折り返す（75 文字ごと）。\\n の途中で切らない */
function foldLine(line: string): string {
  const max = 75;
  if (line.length <= max) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    let end = Math.min(i + max, line.length);
    if (end < line.length && line[end - 1] === "\\") {
      end -= 1;
    }
    parts.push(line.slice(i, end));
    i = end;
  }
  return parts.join("\r\n ");
}

/** DESCRIPTION 用：改行を \\n にし、折り返しは改行の直後のみ（\\n を壊さない） */
function formatDescriptionFolded(descriptionBody: string): string {
  const escaped = escapeIcsValue(descriptionBody);
  const segments = escaped.split("\\n");
  if (segments.length === 1) return foldLine(`DESCRIPTION:${escaped}`);
  const first = `DESCRIPTION:${segments[0]}`;
  const rest = segments.slice(1).map((s) => " \\n" + s);
  return [first, ...rest].join("\r\n");
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date と HH:mm から YYYYMMDDTHHmmss を生成（ローカル） */
function formatIcsDateTime(d: Date, timeStr: string): string {
  const parts = timeStr.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}${pad2(mo)}${pad2(day)}T${pad2(h)}${pad2(m)}00`;
}

function getStartEndForSlot(slot: IcsSlot): { start: string; end: string } {
  const fromMap =
    slot.period !== null ? PERIOD_TIMES_MAP[slot.period] : undefined;
  if (fromMap) {
    return fromMap;
  }
  return {
    start: slot.customStart ?? "09:00",
    end: slot.customEnd ?? "10:30",
  };
}

/** スロットの「火4限（15:00～16:40）」形式ラベル */
function slotTimeLabel(slot: IcsSlot): string {
  const { start, end } = getStartEndForSlot(slot);
  const dayShort = DAY_NAMES[slot.dayOfWeek];
  const periodStr = slot.period !== null ? `${slot.period}限` : "カスタム";
  return `${dayShort}${periodStr}（${start}～${end}）`;
}

/** LOCATION 「（火4）教室」形式 */
function slotLocationPart(slot: IcsSlot): string {
  const dayShort = DAY_NAMES[slot.dayOfWeek];
  const periodStr = slot.period !== null ? String(slot.period) : "?";
  return `（${dayShort}${periodStr}）${slot.room}`;
}

/** VALARM の TRIGGER 文字列（開始前） */
function alarmTrigger(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440);
    return `-P${days}D`;
  }
  return `-PT${minutes}M`;
}

/** ファイル名に使えない文字を除去 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "").trim() || "schedule";
}

/** 課表 ICS の Blob を生成（ダウンロード頁・デスクトップ共用） */
export function buildScheduleIcsBlob(
  schedule: ScheduleItem[],
  options: IcsExportOptions,
  semester: SemesterOption,
): Blob {
  const classItems = schedule.filter((item) => !item.isHoliday);
  const slots = options.slots;
  const locationLine = slots.map(slotLocationPart).join(", ");
  const timeLimitLine = slots.map(slotTimeLabel).join("+");
  const descriptionBody = [
    "【講義情報】",
    `科目名　　：${options.subjectName}`,
    `曜日・時限：${semester}${timeLimitLine}`,
    `教室　　　：${locationLine}`,
  ].join("\n");

  const holidayItems = schedule.filter((item) => item.isHoliday);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Course Scheduler//JA",
    "CALSCALE:GREGORIAN",
  ];

  for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    const slot = slots[slotIndex];
    if (!slot) continue;
    const dow = slot.dayOfWeek;
    const classDatesForSlot = classItems.filter(
      (item) => (item.date.getDay() as DayOfWeek) === dow,
    );
    if (classDatesForSlot.length === 0) continue;

    const firstDate = classDatesForSlot[0]!.date;
    const lastDate = classDatesForSlot[classDatesForSlot.length - 1]!.date;
    const { start, end } = getStartEndForSlot(slot);

    const dtStart = formatIcsDateTime(firstDate, start);
    const dtEnd = formatIcsDateTime(firstDate, end);
    const untilStr = formatIcsDateTime(lastDate, start);
    const byDay = BYDAY_ICS[dow];
    const rrule = `FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${untilStr}`;

    const exdates = holidayItems
      .filter((item) => (item.date.getDay() as DayOfWeek) === dow)
      .map((item) => formatIcsDateTime(item.date, start));

    const uid = `course-scheduler-${options.subjectName}-${dow}-${slotIndex}`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`RRULE:${rrule}`);
    for (const ex of exdates) {
      lines.push(`EXDATE:${ex}`);
    }
    lines.push(`SUMMARY:${escapeIcsValue(options.subjectName)}`);
    lines.push(`LOCATION:${escapeIcsValue(locationLine)}`);
    const descFolded = formatDescriptionFolded(descriptionBody);
    lines.push(...descFolded.split("\r\n"));

    const reminders = [
      options.reminder1Minutes,
      options.reminder2Minutes != null && options.reminder2Minutes !== undefined
        ? options.reminder2Minutes
        : null,
    ].filter((m): m is number => typeof m === "number");
    for (const min of reminders) {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`TRIGGER:${alarmTrigger(min)}`);
      lines.push("END:VALARM");
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const raw = lines.join("\r\n");
  const folded = raw
    .split("\r\n")
    .map((line) => foldLine(line))
    .join("\r\n");

  return new Blob(["\uFEFF" + folded], {
    type: "text/calendar;charset=utf-8",
  });
}

export function exportToICS(
  schedule: ScheduleItem[],
  options: IcsExportOptions,
  semester: SemesterOption,
  filename?: string,
): void {
  const classItems = schedule.filter((item) => !item.isHoliday);
  if (classItems.length === 0) return;

  const baseName = options.subjectName?.trim();
  const defaultFilename = baseName
    ? `${sanitizeFilename(baseName)}.ics`
    : "schedule.ics";
  const finalFilename = filename ?? defaultFilename;

  const blob = buildScheduleIcsBlob(schedule, options, semester);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = finalFilename;
  a.click();
  URL.revokeObjectURL(url);
}

/** YYYY-MM-DD の翌日を YYYYMMDD で返す（終日イベントの DTEND は排他的） */
function nextDayYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const next = new Date(y!, m! - 1, (d ?? 0) + 1);
  const ny = next.getFullYear();
  const nm = String(next.getMonth() + 1).padStart(2, "0");
  const nd = String(next.getDate()).padStart(2, "0");
  return `${ny}${nm}${nd}`;
}

function toYmd(ymd: string): string {
  return ymd.replace(/-/g, "");
}

/** 学年暦 ICS の Blob を生成（ダウンロード頁・デスクトップ共用） */
export function buildCalendarIcsBlob(
  events: CalendarEvent[],
  options: CalendarEventsIcsOptions,
  year: number,
): Blob {
  const includeTypes = new Set(options.includeTypes);
  const onlyNoClass = options.classesHeldFilter === "false";
  const filtered: CalendarEvent[] = [];
  for (const ev of events) {
    const typeOk = ev.type != null ? includeTypes.has(ev.type) : false;
    if (!typeOk) continue;
    if (onlyNoClass && ev.classes_held !== false) continue;
    filtered.push(ev);
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Course Scheduler//JA",
    "CALSCALE:GREGORIAN",
  ];

  let uidIndex = 0;
  for (const ev of filtered) {
    if (ev.start != null && ev.end != null) {
      const dtStart = toYmd(ev.start);
      const dtEnd = nextDayYmd(ev.end);
      const uid = `course-scheduler-calendar-${year}-${uidIndex++}`;
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcsValue(ev.name)}`);
      if (options.reminderMinutes != null && options.reminderMinutes > 0) {
        lines.push("BEGIN:VALARM");
        lines.push("ACTION:DISPLAY");
        lines.push(`TRIGGER:${alarmTrigger(options.reminderMinutes)}`);
        lines.push("END:VALARM");
      }
      lines.push("END:VEVENT");
    } else {
      for (const dateStr of ev.dates) {
        const dtStart = toYmd(dateStr);
        const dtEnd = nextDayYmd(dateStr);
        const uid = `course-scheduler-calendar-${year}-${uidIndex++}`;
        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${uid}`);
        lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
        lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
        lines.push(`SUMMARY:${escapeIcsValue(ev.name)}`);
        if (options.reminderMinutes != null && options.reminderMinutes > 0) {
          lines.push("BEGIN:VALARM");
          lines.push("ACTION:DISPLAY");
          lines.push(`TRIGGER:${alarmTrigger(options.reminderMinutes)}`);
          lines.push("END:VALARM");
        }
        lines.push("END:VEVENT");
      }
    }
  }

  lines.push("END:VCALENDAR");

  const raw = lines.join("\r\n");
  const folded = raw
    .split("\r\n")
    .map((line) => foldLine(line))
    .join("\r\n");

  return new Blob(["\uFEFF" + folded], {
    type: "text/calendar;charset=utf-8",
  });
}

/** 学年暦イベントを終日 VEVENT として ICS に出力 */
export function exportCalendarEventsToIcs(
  events: CalendarEvent[],
  options: CalendarEventsIcsOptions,
  year: number,
  filename?: string,
): void {
  const blob = buildCalendarIcsBlob(events, options, year);
  const name = filename ?? `学年暦_${year}.ics`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
