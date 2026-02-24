import type { CalendarData, YearData } from "../types";
import type {
  ScheduleIcsPayload,
  CalendarIcsPayload,
  IcsPayload,
} from "./icsPayload";
import { generateSchedule } from "./scheduleGenerator";
import {
  buildScheduleIcsBlob,
  buildCalendarIcsBlob,
  sanitizeFilename,
} from "./export";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * ペイロードとカレンダーデータから ICS blob を構築し、ダウンロードを実行する。
 * MainApp の download-ics ハンドラで使用。ペイロードとカレンダーデータから ICS を構築しダウンロードする。
 */
export function downloadIcsFromPayload(
  payload: IcsPayload,
  calendarData: CalendarData | null
): boolean {
  if (!calendarData) return false;

  if (payload.type === "schedule") {
    const p = payload as ScheduleIcsPayload;
    const yearData = calendarData.years[String(p.year)] as YearData | undefined;
    if (!yearData) return false;

    const schedule = generateSchedule(
      yearData,
      p.semester,
      p.courseDays,
      p.classSlots
    );

    const blob = buildScheduleIcsBlob(
      schedule,
      p.icsExportOptions,
      p.semester
    );

    const name = p.icsExportOptions.subjectName?.trim()
      ? `${sanitizeFilename(p.icsExportOptions.subjectName)}.ics`
      : "schedule.ics";

    triggerDownload(blob, name);
    return true;
  } else {
    const p = payload as CalendarIcsPayload;
    const yearData = calendarData.years[String(p.year)] as YearData | undefined;
    const events = yearData?.events ?? [];

    const blob = buildCalendarIcsBlob(
      events,
      p.calendarIcsOptions,
      p.year
    );

    triggerDownload(blob, `学年暦_${p.year}.ics`);
    return true;
  }
}
