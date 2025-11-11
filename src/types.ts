export interface YearData {
  year: number;
  semesters: {
    [key: string]: [string, string];
  };
  vacations: Vacation[];
}

export interface CalendarData {
  created_at: string;
  years: {
    [year: string]: YearData;
  };
}

// 後方互換性のため、単一年度のデータ構造も保持
export interface SingleYearCalendarData {
  year: number;
  semesters: {
    [key: string]: [string, string];
  };
  vacations: Vacation[];
}

export interface Vacation {
  name: string;
  dates: string[];
}

export interface ScheduleItem {
  date: Date;
  dateStr: string;
  dayOfWeek: string;
  classNumber?: number;
  isHoliday: boolean;
  holidayReason?: string;
  deliveryMode?: DeliveryMode;
}

export type SemesterOption =
  | "1学期"
  | "2学期"
  | "3学期"
  | "4学期"
  | "前期"
  | "後期"
  | "夏期集中授業期間"
  | "春季集中授業期間";

export type CourseDays = 7 | 14;
export type ClassesPerWeek = 1 | 2;
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=日曜日, 1=月曜日, ...
export type DeliveryMode = "online" | "face-to-face";
