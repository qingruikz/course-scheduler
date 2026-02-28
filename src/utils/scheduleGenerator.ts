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

  // Slot ① の曜日が学期内で最初に現れる日。OD があるときのみ slot 順を考慮する。
  const firstSlot = classSlots[0];
  if (!firstSlot) return [];

  const hasOD = classSlots.some((s) => s.deliveryType === "on-demand");

  let firstSlot1Date = new Date(startDate);
  while (
    firstSlot1Date <= endDate &&
    getDayOfWeek(firstSlot1Date) !== firstSlot.dayOfWeek
  ) {
    firstSlot1Date.setDate(firstSlot1Date.getDate() + 1);
  }
  if (firstSlot1Date > endDate) return [];

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const weekIndex = (d: Date) =>
    Math.floor((d.getTime() - firstSlot1Date.getTime()) / (7 * MS_PER_DAY));

  // 全 RT のときは日付順で slot を並べる。OD があるときは slot1 起点の週順＋slot 順。
  const sortBySlotOrder = () =>
    dateQueues.sort((a, b) => {
      if (hasOD) {
        const wa = weekIndex(a.date);
        const wb = weekIndex(b.date);
        if (wa !== wb) return wa - wb;
        return a.slotIndex - b.slotIndex;
      }
      const ta = a.date.getTime();
      const tb = b.date.getTime();
      if (ta !== tb) return ta - tb;
      return a.slotIndex - b.slotIndex;
    });

  // 日付キュー: { date, deliveryMode, slotIndex } で slotIndex のスロットの次回日を管理
  const dateQueues: Array<{
    date: Date;
    deliveryMode: DeliveryMode;
    slotIndex: number;
  }> = [];

  // 全 RT のときは各 slot を学期内のその曜日の「最初の日」から開始。OD があるときは slot1 の初回以降から。
  const slotStartBase = hasOD ? firstSlot1Date : startDate;
  for (let i = 0; i < classSlots.length; i++) {
    const slot = classSlots[i]!;
    let currentDate = new Date(slotStartBase);
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

    if (currentDate > endDate) {
      if (classNumber === courseDays - 1) {
        const lastDayOfWeek = getDayOfWeek(endDate);
        const lastDayName = DAY_NAMES_FULL[lastDayOfWeek] ?? "不明";
        classNumber++;
        schedule.push({
          date: new Date(endDate),
          dateStr: formatDate(endDate),
          dayOfWeek: lastDayName,
          classNumber,
          isHoliday: false,
          deliveryMode,
        });
      }
      continue;
    }

    const holidayInfo = isHoliday(currentDate, yearData);
    const currentDayOfWeek = getDayOfWeek(currentDate);
    const dayOfWeekName = DAY_NAMES_FULL[currentDayOfWeek] ?? "不明";

    // RT の休講日：休日行を追加し、同日スロットを次週へ
    if (holidayInfo.isHoliday && deliveryMode !== "on-demand") {
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

    // OD で配信日が休講日のとき：休講日対応（配信／スキップ／前の授業日）に従う
    if (holidayInfo.isHoliday && deliveryMode === "on-demand") {
      const slot = classSlots[slotIndex]!;
      const handling = slot.odHolidayHandling ?? "deliver";

      if (handling === "skip") {
        // スキップ：当週は配信しない、次週の同曜日へ
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 7);
        if (nextDate <= endDate) {
          dateQueues.push({
            date: nextDate,
            deliveryMode: slot.deliveryType,
            slotIndex,
          });
          sortBySlotOrder();
        }
        continue;
      }

      if (handling === "previous") {
        // 前の授業日：当週でこの日より前の最初の非休講日で配信
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - ((currentDate.getDay() + 6) % 7));
        let d = new Date(currentDate);
        d.setDate(d.getDate() - 1);
        let found = false;
        while (d.getTime() >= weekStart.getTime() && d.getTime() >= startDate.getTime()) {
          if (!isHoliday(d, yearData).isHoliday) {
            found = true;
            break;
          }
          d.setDate(d.getDate() - 1);
        }
        if (!found) {
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 7);
          if (nextDate <= endDate) {
            dateQueues.push({
              date: nextDate,
              deliveryMode: slot.deliveryType,
              slotIndex,
            });
            sortBySlotOrder();
          }
          continue;
        }
        classNumber++;
        const dayOfWeekNameD = DAY_NAMES_FULL[getDayOfWeek(d)] ?? "不明";
        schedule.push({
          date: new Date(d),
          dateStr: formatDate(d),
          dayOfWeek: dayOfWeekNameD,
          classNumber,
          isHoliday: false,
          deliveryMode,
        });
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 7);
        if (nextDate <= endDate) {
          dateQueues.push({
            date: nextDate,
            deliveryMode: slot.deliveryType,
            slotIndex,
          });
          sortBySlotOrder();
        }
        continue;
      }

      // handling === "deliver"：休講日でもその曜日に照常配信
    }

    // 非休講日、または OD で「配信」のとき
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
