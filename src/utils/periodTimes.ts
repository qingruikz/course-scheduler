/**
 * 授業時限（1限～7限）の開始・終了時刻
 * 大学の標準時限表に基づく
 */
export interface PeriodTime {
  period: number;
  start: string;
  end: string;
  label: string;
}

export const PERIOD_TIMES: PeriodTime[] = [
  { period: 1, start: "08:50", end: "10:30", label: "1限 8:50～10:30" },
  { period: 2, start: "10:40", end: "12:20", label: "2限 10:40～12:20" },
  { period: 3, start: "13:10", end: "14:50", label: "3限 13:10～14:50" },
  { period: 4, start: "15:00", end: "16:40", label: "4限 15:00～16:40" },
  { period: 5, start: "16:50", end: "18:30", label: "5限 16:50～18:30" },
  { period: 6, start: "18:40", end: "20:20", label: "6限 18:40～20:20" },
  { period: 7, start: "20:20", end: "22:00", label: "7限 20:20～22:00" },
];

/** 時限番号から開始・終了時刻を取得 */
export const PERIOD_TIMES_MAP: Record<number, { start: string; end: string }> =
  Object.fromEntries(
    PERIOD_TIMES.map((p) => [p.period, { start: p.start, end: p.end }])
  );
