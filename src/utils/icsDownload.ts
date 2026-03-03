import type {
  CalendarData,
  YearData,
  ScheduleItem,
} from "../types";
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
    let schedule: ScheduleItem[];
    const isIntensiveBySlots =
      p.icsExportOptions?.slots?.length &&
      p.icsExportOptions.slots[0]?.dateStr != null;

    if (p.intensiveSchedule?.length) {
      schedule = p.intensiveSchedule.map(
        (item: ScheduleItem & { date?: Date | string }) => ({
          ...item,
          date:
            item.date instanceof Date
              ? item.date
              : new Date((item as { dateStr: string }).dateStr),
        }),
      ) as ScheduleItem[];
    } else if (isIntensiveBySlots) {
      /* URL 短縮で intensiveSchedule を省略した場合。ICS は slots のみで生成 */
      schedule = [];
    } else {
      const yearData = calendarData.years[String(p.year)] as
        | YearData
        | undefined;
      if (!yearData) return false;
      schedule = generateSchedule(
        yearData,
        p.semester,
        p.courseDays,
        p.classSlots,
      );
    }

    const blob = buildScheduleIcsBlob(
      schedule,
      p.icsExportOptions,
      p.semester,
      p.classSlots,
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
