export interface YearData {
  year: number;
  semesters: {
    [key: string]: [string, string];
  };
  vacations: CalendarEvent[];
  /** 全イベント（休講・授業日とも）。学年暦 ICS 出力用 */
  events?: CalendarEvent[];
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
  vacations: CalendarEvent[];
  events?: CalendarEvent[];
}

/** カレンダーイベントの種別（YAML の type に対応） */
export type CalendarEventType =
  | "national_holiday"
  | "school_holiday"
  | "academic"
  | "event"
  | "vacation";

/** カレンダー上の1件のイベント（祝日・休業・学務・行事・長期休暇など） */
export interface CalendarEvent {
  name: string;
  dates: string[];
  /** 日付範囲の開始・終了（YAML の start/end のときのみ。終了日は含む）。ICS 出力で 1 件の跨日 VEVENT にするために使用 */
  start?: string;
  end?: string;
  /** イベント種別（表示・フィルタ用） */
  type?: CalendarEventType;
  /** false の日のみ休講として扱う。変換器で classes_held === false のものだけ vacations に入る */
  classes_held?: boolean;
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
export type DeliveryMode = "online" | "face-to-face" | "on-demand";

/** 1週間あたりの1スロット分の授業設定（実施方法・曜日・時限） */
export interface ClassSlot {
  deliveryType: DeliveryMode;
  dayOfWeek: DayOfWeek;
  /** RT（対面・オンライン）のみ。OD では不要 */
  period?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

/** ICS 出力用: 1つの曜日スロット（時限 or カスタム時間 + 教室） */
export interface IcsSlot {
  dayOfWeek: DayOfWeek;
  /** 1～7 の時限。null の場合は customStart/customEnd を使用 */
  period: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null;
  customStart?: string; // "HH:mm"
  customEnd?: string; // "HH:mm"
  room: string;
}

/** ICS 出力用: モーダルで入力するオプション */
export interface IcsExportOptions {
  subjectName: string;
  slots: IcsSlot[];
  /** 1回目のリマインド（分）。5, 15, 30, 60, 120, 1440, 2880 */
  reminder1Minutes: number;
  /** 2回目のリマインド（分）。null は「なし」 */
  reminder2Minutes?: number | null;
}

/** 学年暦 ICS 出力用オプション */
export interface CalendarEventsIcsOptions {
  includeTypes: CalendarEventType[];
  classesHeldFilter: "false" | "both";
  reminderMinutes?: number;
}

/** 1科目分の条件設定 + 課程 ICS 出力用オプション */
export interface SubjectSettings {
  semester: SemesterOption;
  courseDays: CourseDays;
  classesPerWeek: ClassesPerWeek;
  /** 1週間あたりのスロット設定（classesPerWeek と一致する長さ） */
  classSlots: ClassSlot[];
  /** @deprecated v1 互換用。インポート時に classSlots へ変換 */
  selectedDaysOfWeek?: DayOfWeek[];
  /** @deprecated v1 互換用。インポート時に classSlots へ変換 */
  deliveryModes?: Record<DayOfWeek, DeliveryMode>;
  /** ICS 出力の設定（科目名・時限・教室・リマインド等） */
  icsExportOptions?: IcsExportOptions;
}

/** 設定のエクスポート/インポート用（version で将来の互換性を確保） */
export const SETTINGS_EXPORT_VERSION = 2;

export interface SettingsExport {
  version: number;
  subjectList: string[];
  currentSubject: string;
  subjectSettings: Record<string, SubjectSettings>;
  calendarIcsOptions: CalendarEventsIcsOptions | null;
  selectedYear?: number;
}

/** デフォルトの実施方法（全曜日対面） */
export function defaultDeliveryModes(): Record<DayOfWeek, DeliveryMode> {
  return {
    0: "face-to-face",
    1: "face-to-face",
    2: "face-to-face",
    3: "face-to-face",
    4: "face-to-face",
    5: "face-to-face",
    6: "face-to-face",
  };
}

/** デフォルトの1スロット（対面・月曜・1限） */
export function defaultClassSlot(): ClassSlot {
  return {
    deliveryType: "face-to-face",
    dayOfWeek: 1,
    period: 1,
  };
}

/** v1 形式（selectedDaysOfWeek + deliveryModes）を classSlots に変換 */
export function migrateSubjectSettingsV1ToV2(s: {
  selectedDaysOfWeek?: DayOfWeek[] | number[];
  deliveryModes?: Record<DayOfWeek, DeliveryMode> | Record<number, string>;
  classesPerWeek?: ClassesPerWeek | number;
}): ClassSlot[] {
  const days = (s.selectedDaysOfWeek ?? [1]) as DayOfWeek[];
  const modes = (s.deliveryModes ?? defaultDeliveryModes()) as Record<
    DayOfWeek,
    DeliveryMode
  >;
  const perWeek = (s.classesPerWeek ?? 1) as ClassesPerWeek;
  return days.slice(0, perWeek).map((dow) => ({
    deliveryType: (modes[dow] ?? "face-to-face") as DeliveryMode,
    dayOfWeek: dow,
    period: 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7,
  }));
}

/** デフォルトの科目設定（空＝未選択時の初期値） */
export function defaultSubjectSettings(): SubjectSettings {
  return {
    semester: "1学期",
    courseDays: 7,
    classesPerWeek: 1,
    classSlots: [defaultClassSlot()],
  };
}

export interface MonthBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridOffset {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
}

export interface MonthLayout {
  imageId: string;
  rowCount: 4 | 5;
  monthBox: MonthBox;
  gridOffset: GridOffset;
}

export interface CalendarLayout {
  /** 年度（学年）。月 4–12 はこの年、月 1–3 は year+1 年。 */
  year: number;
  /** 年度であることを示す。true のとき year は 4 月始まりの年度。 */
  academicYear?: true;
  /** 説明（読み込み時は未使用）。 */
  _note?: string;
  /** 元画像のアスペクト比（幅/高さ）。未指定時は A4 縦を仮定。月表示の縦横比に使う。 */
  imageAspectRatio?: number;
  images: Record<string, string>;
  months: Record<string, MonthLayout>;
}
