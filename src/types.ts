export interface CalendarData {
  year: number;
  semesters: {
    [key: string]: [string, string];
  };
  vacations: Vacation[];
  semester_mapping: {
    [key: string]: string;
  };
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
  | "第一学期"
  | "第二学期"
  | "前期"
  | "第三学期"
  | "第四学期"
  | "後期";
export type CourseDays = 7 | 14;
export type ClassesPerWeek = 1 | 2;
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=日曜日, 1=月曜日, ...
export type DeliveryMode = "online" | "face-to-face";
