import type {
  CalendarData,
  ScheduleItem,
  SemesterOption,
  CourseDays,
  ClassesPerWeek,
  DayOfWeek,
  DeliveryMode,
} from "../types";

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
const DAY_NAMES_FULL = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dayOfWeek = DAY_NAMES[date.getDay()];
  return `${year}年${month}月${day}日（${dayOfWeek}）`;
}

export function formatDateShort(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] ?? 2025;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(year, month - 1, day);
}

export function getDayOfWeek(date: Date): DayOfWeek {
  return date.getDay() as DayOfWeek;
}

export function isHoliday(
  date: Date,
  calendarData: CalendarData
): { isHoliday: boolean; reason?: string } {
  const dateStr = formatDateShort(date);

  for (const vacation of calendarData.vacations) {
    if (vacation.dates.includes(dateStr)) {
      return { isHoliday: true, reason: vacation.name };
    }
  }

  return { isHoliday: false };
}

export function generateSchedule(
  calendarData: CalendarData,
  semester: SemesterOption,
  courseDays: CourseDays,
  classesPerWeek: ClassesPerWeek,
  dayOfWeek: DayOfWeek | DayOfWeek[],
  deliveryModes?: Record<DayOfWeek, DeliveryMode>
): ScheduleItem[] {
  // 学期のキーを取得（マッピングがある場合は使用）
  let semesterKey: string = semester;

  // 直接キーが存在しない場合、マッピングを確認
  if (!calendarData.semesters[semesterKey]) {
    // マッピングを使って変換を試みる
    const mappedKey = calendarData.semester_mapping?.[semesterKey];
    if (mappedKey) {
      semesterKey = mappedKey;
    }
  }

  const semesterPeriod = calendarData.semesters[semesterKey];
  if (!semesterPeriod) {
    console.warn(`学期期間が見つかりません: ${semester} -> ${semesterKey}`);
    return [];
  }

  const startDate = parseDate(semesterPeriod[0]);
  const endDate = parseDate(semesterPeriod[1]);

  const schedule: ScheduleItem[] = [];
  let classNumber = 0;

  // 曜日の配列を作成
  const daysOfWeek: DayOfWeek[] = Array.isArray(dayOfWeek)
    ? dayOfWeek
    : [dayOfWeek];

  // 各曜日についてスケジュールを生成
  const dateQueues: Array<{ date: Date; dayOfWeek: DayOfWeek }> = [];

  for (const dow of daysOfWeek) {
    let currentDate = new Date(startDate);
    // 最初の該当曜日を見つける
    while (currentDate <= endDate && getDayOfWeek(currentDate) !== dow) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    if (currentDate <= endDate) {
      dateQueues.push({ date: currentDate, dayOfWeek: dow });
    }
  }

  // 日付順にソート
  dateQueues.sort((a, b) => a.date.getTime() - b.date.getTime());

  // スケジュールを生成
  while (classNumber < courseDays) {
    // キューが空で、まだ授業回数が足りない場合は終了
    if (dateQueues.length === 0) {
      break;
    }

    // 最も早い日付を取得
    const { date: currentDate, dayOfWeek: dow } = dateQueues.shift()!;

    if (currentDate > endDate) {
      continue;
    }

    const holidayInfo = isHoliday(currentDate, calendarData);
    const currentDayOfWeek = getDayOfWeek(currentDate);
    const dayOfWeekName = DAY_NAMES_FULL[currentDayOfWeek] ?? "不明";

    if (holidayInfo.isHoliday) {
      // 休日の場合
      schedule.push({
        date: new Date(currentDate),
        dateStr: formatDate(currentDate),
        dayOfWeek: dayOfWeekName,
        isHoliday: true,
        holidayReason: holidayInfo.reason,
      });
    } else {
      // 通常の授業日
      classNumber++;
      const deliveryMode = deliveryModes?.[dow] || "face-to-face";
      schedule.push({
        date: new Date(currentDate),
        dateStr: formatDate(currentDate),
        dayOfWeek: dayOfWeekName,
        classNumber,
        isHoliday: false,
        deliveryMode,
      });
    }

    // 次の同じ曜日を計算してキューに追加
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 7);
    if (nextDate <= endDate) {
      dateQueues.push({ date: nextDate, dayOfWeek: dow });
      // 日付順にソート
      dateQueues.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
  }

  // 日付順にソート
  schedule.sort((a, b) => a.date.getTime() - b.date.getTime());

  return schedule;
}

export function getDayOfWeekFromName(dayName: string): DayOfWeek {
  const index = DAY_NAMES_FULL.indexOf(dayName);
  return index >= 0 ? (index as DayOfWeek) : 1; // デフォルトは月曜日
}
