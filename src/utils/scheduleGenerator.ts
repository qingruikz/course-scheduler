import type {
  YearData,
  ScheduleItem,
  SemesterOption,
  CourseDays,
  DayOfWeek,
  DeliveryMode,
  ClassSlot,
} from "../types";

/** 授業回数不足などでスケジュール生成を中止するときに使用 */
export class ScheduleGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScheduleGenerationError";
  }
}

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

/**
 * 日付を日本語形式の文字列にフォーマット
 * 例: "2025年04月16日（月）"
 *
 * @param date - フォーマットする日付オブジェクト
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dayOfWeek = DAY_NAMES[date.getDay()];
  return `${year}年${month}月${day}日（${dayOfWeek}）`;
}

/**
 * 日付を短縮形式（YYYY-MM-DD）の文字列にフォーマット
 * 例: "2025-04-16"
 *
 * @param date - フォーマットする日付オブジェクト
 * @returns YYYY-MM-DD形式の日付文字列
 */
export function formatDateShort(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 日付文字列（YYYY-MM-DD形式）をDateオブジェクトに変換
 *
 * @param dateStr - YYYY-MM-DD形式の日付文字列
 * @returns 変換されたDateオブジェクト
 */
export function parseDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);

  // 日付文字列の形式を検証
  if (parts.length !== 3 || parts.some(isNaN)) {
    console.warn(
      `日付文字列の解析に失敗しました: "${dateStr}"。形式は YYYY-MM-DD である必要があります。`,
    );
    // 解析失敗時は現在の日付を返す（エラーを避けるため）
    return new Date();
  }

  const year = parts[0]!; // 既に長さチェック済みのため、非null保証
  const month = parts[1]!;
  const day = parts[2]!;

  // 日付の妥当性を検証
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    console.warn(
      `日付の値が無効です: "${dateStr}" (年: ${year}, 月: ${month}, 日: ${day})`,
    );
  }

  return new Date(year, month - 1, day);
}

/**
 * 日付から曜日を取得（0=日曜日、1=月曜日、...、6=土曜日）
 *
 * @param date - 日付オブジェクト
 * @returns 曜日を表す数値（DayOfWeek型）
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  return date.getDay() as DayOfWeek;
}

/**
 * 指定された日付が休日かどうかを判定
 *
 * @param date - 判定する日付
 * @param yearData - 年度データ（休日情報を含む）
 * @returns 休日かどうかと、休日の理由（休日の場合）
 */
export function isHoliday(
  date: Date,
  yearData: YearData,
): { isHoliday: boolean; reason?: string } {
  const dateStr = formatDateShort(date);

  for (const vacation of yearData.vacations) {
    if (vacation.dates.includes(dateStr)) {
      return { isHoliday: true, reason: vacation.name };
    }
  }

  return { isHoliday: false };
}

/**
 * 授業スケジュールを生成
 *
 * 指定された学期、授業回数、classSlots に基づいて、授業日程を自動生成します。
 * 休日は自動的に検出され、スケジュールに含まれますが、授業回数にはカウントされません。
 * RT（対面・オンライン）と OD（オンデマンド）を区別し、各スロットの曜日に沿って日付を生成します。
 *
 * @param yearData - 年度データ（学期期間、休日情報を含む）
 * @param semester - 選択された学期（例: "1学期"、"前期"など）
 * @param courseDays - 授業回数（7回または14回）
 * @param classSlots - 1週間あたりのスロット設定（実施方法・曜日・時限）
 * @returns 生成された授業スケジュールの配列
 */
export function generateSchedule(
  yearData: YearData,
  semester: SemesterOption,
  courseDays: CourseDays,
  classSlots: ClassSlot[],
): ScheduleItem[] {
  const semesterKey: string = semester;
  const semesterPeriod = yearData.semesters[semesterKey];

  if (!semesterPeriod) {
    console.warn(`学期期間が見つかりません: ${semester}`);
    return [];
  }

  const startDate = parseDate(semesterPeriod[0]);
  const endDate = parseDate(semesterPeriod[1]);

  const schedule: ScheduleItem[] = [];
  let classNumber = 0;

  if (classSlots.length === 0) return [];

  // 日付順で slot を並べる（全 slot とも学期内の該当曜日初日から、互いに独立）
  const sortBySlotOrder = () =>
    dateQueues.sort((a, b) => {
      const ta = a.date.getTime();
      const tb = b.date.getTime();
      if (ta !== tb) return ta - tb;
      return a.slotIndex - b.slotIndex;
    });

  // 日付キュー: 各 slot の次回日を管理
  const dateQueues: Array<{
    date: Date;
    deliveryMode: DeliveryMode;
    slotIndex: number;
  }> = [];

  // 各 slot を学期 startDate から見て、該当曜日の学期内「最初の日」で開始
  for (let i = 0; i < classSlots.length; i++) {
    const slot = classSlots[i]!;
    let currentDate = new Date(startDate);
    while (
      currentDate <= endDate &&
      getDayOfWeek(currentDate) !== slot.dayOfWeek
    ) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    if (currentDate <= endDate) {
      dateQueues.push({
        date: currentDate,
        deliveryMode: slot.deliveryType,
        slotIndex: i,
      });
    }
  }

  sortBySlotOrder();

  const isSameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  while (classNumber < courseDays) {
    if (dateQueues.length === 0) break;

    const { date: currentDate, deliveryMode, slotIndex } = dateQueues.shift()!;

    if (currentDate > endDate) continue;

    const holidayInfo = isHoliday(currentDate, yearData);
    const currentDayOfWeek = getDayOfWeek(currentDate);
    const dayOfWeekName = DAY_NAMES_FULL[currentDayOfWeek] ?? "不明";

    // 休講日：休日行を追加し、同日の全 slot を次週へ（RT/OD 同一扱い）
    if (holidayInfo.isHoliday) {
      schedule.push({
        date: new Date(currentDate),
        dateStr: formatDate(currentDate),
        dayOfWeek: dayOfWeekName,
        isHoliday: true,
        holidayReason: holidayInfo.reason,
      });
      const sameDateEntries: typeof dateQueues = [];
      const restEntries: typeof dateQueues = [];
      for (const e of dateQueues) {
        if (isSameDate(e.date, currentDate)) sameDateEntries.push(e);
        else restEntries.push(e);
      }
      sameDateEntries.push({ date: currentDate, deliveryMode, slotIndex });
      dateQueues.length = 0;
      dateQueues.push(...restEntries);
      for (const e of sameDateEntries) {
        const nextDate = new Date(e.date);
        nextDate.setDate(nextDate.getDate() + 7);
        if (nextDate <= endDate) {
          const slot = classSlots[e.slotIndex]!;
          dateQueues.push({
            date: nextDate,
            deliveryMode: slot.deliveryType,
            slotIndex: e.slotIndex,
          });
        }
      }
      sortBySlotOrder();
      continue;
    }

    // 非休講日：授業/配信として 1 回追加
    classNumber++;
    schedule.push({
      date: new Date(currentDate),
      dateStr: formatDate(currentDate),
      dayOfWeek: dayOfWeekName,
      classNumber,
      isHoliday: false,
      deliveryMode,
    });

    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 7);
    if (nextDate <= endDate) {
      const slot = classSlots[slotIndex]!;
      dateQueues.push({
        date: nextDate,
        deliveryMode: slot.deliveryType,
        slotIndex,
      });
      sortBySlotOrder();
    }
  }

  schedule.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (classNumber < courseDays) {
    throw new ScheduleGenerationError(
      "授業日が不足しています。学期・授業回数・週の回数の設定をご確認ください。",
    );
  }

  return schedule;
}
