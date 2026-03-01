import type {
  CalendarData,
  YearData,
  CalendarEvent,
  CalendarEventType,
} from "../types";

// YAMLファイルのデータ構造
interface YamlSemester {
  start: string;
  end: string;
}

interface YamlEvent {
  name: string;
  date?: string;
  start?: string;
  end?: string;
  /** national_holiday | school_holiday | academic | event | vacation */
  type: CalendarEventType;
  /** true: 授業実施日, false: 休講 */
  classes_held: boolean;
}

interface YamlYearData {
  year: number;
  created_at?: string;
  updated_at?: string;
  semesters: {
    [key: string]: YamlSemester;
  };
  events: YamlEvent[];
}

/**
 * 日付値を文字列形式（YYYY-MM-DD）に変換
 */
function ensureDateString(date: string | Date | unknown): string {
  if (typeof date === "string") {
    return date;
  }
  if (date instanceof Date) {
    return formatDate(date);
  }
  // その他の型の場合は文字列に変換を試みる
  return String(date);
}

/**
 * 単一のYAML年度データをYearData形式に変換
 */
function convertYamlYearData(yamlData: YamlYearData): YearData {
  const semesters: { [key: string]: [string, string] } = {};
  for (const [key, value] of Object.entries(yamlData.semesters)) {
    // YAMLパーサーが日付をDateオブジェクトとして解析する可能性があるため、文字列に変換
    const start = ensureDateString(value.start);
    const end = ensureDateString(value.end);
    semesters[key] = [start, end];
  }

  // classes_held === false のイベントのみ休講日（nonClassDays）に追加。type の vacation は「长期休暇」の意味
  const nonClassDays: CalendarEvent[] = [];
  // 全イベント（休講・授業日とも）。学年暦 ICS 出力用
  const allEvents: CalendarEvent[] = [];
  for (const event of yamlData.events) {
    let dates: string[];
    let start: string | undefined;
    let end: string | undefined;
    if (event.date) {
      const dateStr = ensureDateString(event.date);
      dates = [dateStr];
    } else if (event.start && event.end) {
      const startStr = ensureDateString(event.start);
      const endStr = ensureDateString(event.end);
      dates = generateDateRange(startStr, endStr);
      start = startStr;
      end = endStr;
    } else {
      continue;
    }

    const calendarEvent: CalendarEvent = {
      name: event.name,
      dates,
      start,
      end,
      type: event.type,
      classes_held: event.classes_held,
    };
    allEvents.push(calendarEvent);
    if (event.classes_held === true) continue;
    nonClassDays.push(calendarEvent);
  }

  return {
    year: yamlData.year,
    semesters,
    vacations: nonClassDays,
    events: allEvents,
  };
}

/**
 * 日付範囲内のすべての日付を生成
 */
function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(formatDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

/**
 * 日付をYYYY-MM-DD形式にフォーマット
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 複数のYAML年度データをCalendarData形式にマージ
 *
 * @param yamlDataArray - YAML年度データの配列
 *   各要素は YamlYearData 型で、year フィールドに年度が含まれる
 *   例: [{ year: 2025, semesters: {...}, events: [...] }, { year: 2026, ... }]
 *
 * @returns CalendarData - 統合されたカレンダーデータ
 */
export function convertYamlToCalendarData(
  yamlDataArray: YamlYearData[],
): CalendarData {
  const years: { [year: string]: YearData } = {};

  // 各 YAML データから year フィールドを読み込んで、それをキーとして使用
  for (const yamlData of yamlDataArray) {
    const yearStr = String(yamlData.year);
    // 同じ年度のデータが既に存在する場合は警告を出力（後から読み込まれたものが優先される）
    if (years[yearStr]) {
      console.warn(
        `警告: 年度 ${yearStr} のデータが重複しています。後から読み込まれたデータで上書きされます。`,
      );
    }
    years[yearStr] = convertYamlYearData(yamlData);
  }

  const defaultDate =
    new Date().toISOString().split("T")[0] ||
    new Date().toISOString().substring(0, 10);
  const createdAt = ensureDateString(
    yamlDataArray.find((d) => d.created_at)?.created_at ?? defaultDate,
  );
  const updatedAt = ensureDateString(
    yamlDataArray.find((d) => d.updated_at)?.updated_at ?? defaultDate,
  );

  return {
    createdAt,
    updatedAt,
    years,
  };
}
