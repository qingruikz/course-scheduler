import type {
  YearData,
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
      `日付文字列の解析に失敗しました: "${dateStr}"。形式は YYYY-MM-DD である必要があります。`
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
      `日付の値が無効です: "${dateStr}" (年: ${year}, 月: ${month}, 日: ${day})`
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
  yearData: YearData
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
 * 指定された学期、授業回数、曜日、実施方法に基づいて、授業日程を自動生成します。
 * 休日は自動的に検出され、スケジュールに含まれますが、授業回数にはカウントされません。
 * 週の授業回数は dayOfWeek 配列の要素数で判断されます（1要素の場合は週1回、2要素の場合は週2回）。
 *
 * @param yearData - 年度データ（学期期間、休日情報を含む）
 * @param semester - 選択された学期（例: "1学期"、"前期"など）
 * @param courseDays - 授業回数（7回または14回）
 * @param dayOfWeek - 授業の曜日の配列（例: [1] は週1回の月曜日、[1, 3] は週2回の月曜日と水曜日）
 * @param deliveryModes - 各曜日ごとの実施方法（オンライン/対面）のマッピング
 * @returns 生成された授業スケジュールの配列
 */
export function generateSchedule(
  yearData: YearData,
  semester: SemesterOption,
  courseDays: CourseDays,
  dayOfWeek: DayOfWeek[],
  deliveryModes?: Record<DayOfWeek, DeliveryMode>
): ScheduleItem[] {
  // 選択された学期のキーを直接使用
  const semesterKey: string = semester;
  const semesterPeriod = yearData.semesters[semesterKey];

  if (!semesterPeriod) {
    console.warn(`学期期間が見つかりません: ${semester}`);
    return [];
  }

  const startDate = parseDate(semesterPeriod[0]);
  const endDate = parseDate(semesterPeriod[1]);

  const schedule: ScheduleItem[] = [];
  let classNumber = 0; // 実際の授業回数カウンター（休日はカウントしない）

  // dayOfWeek は既に配列形式
  const daysOfWeek: DayOfWeek[] = dayOfWeek;

  // dateQueues: 待処理の日付を管理するキュー（優先度付きキュー）
  // 各要素は { date: 日付, dayOfWeek: 曜日 } の形式
  // 用途:
  //   - 複数の曜日（例: 月曜日と水曜日）を同時に処理する際、日付順に処理するため
  //   - 各曜日の次の授業日（7日後）を自動的にキューに追加し、継続的に処理できるようにする
  // 例: 週2回（月曜日と水曜日）の場合
  //   - 初期: [{ date: 2025-04-21(月), dayOfWeek: 1 }, { date: 2025-04-23(水), dayOfWeek: 3 }]
  //   - 処理後: 月曜日を処理 → 次の月曜日(2025-04-28)をキューに追加
  const dateQueues: Array<{ date: Date; dayOfWeek: DayOfWeek }> = [];

  // 各曜日について、学期期間内の最初の該当曜日を見つけてキューに追加
  for (const dow of daysOfWeek) {
    let currentDate = new Date(startDate);
    // 学期開始日から最初の該当曜日を見つける
    while (currentDate <= endDate && getDayOfWeek(currentDate) !== dow) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    // 学期期間内に該当曜日が見つかった場合、キューに追加
    if (currentDate <= endDate) {
      dateQueues.push({ date: currentDate, dayOfWeek: dow });
    }
  }

  // 日付順にソート（最も早い日付から処理するため）
  dateQueues.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 要求された授業回数に達するまでスケジュールを生成
  while (classNumber < courseDays) {
    // dateQueuesが空 = すべての可能な授業日が処理済みで、次の週の同じ曜日が学期終了日を超えている
    // この場合、要求された授業回数に達していなくても、これ以上処理できる日付がないため終了
    if (dateQueues.length === 0) {
      break;
    }

    // 最も早い日付をキューから取得
    const { date: currentDate, dayOfWeek: dow } = dateQueues.shift()!;

    // 防御的チェック: 学期終了日を超えている場合はスキップ
    if (currentDate > endDate) {
      continue;
    }

    // 休日かどうかを判定
    const holidayInfo = isHoliday(currentDate, yearData);
    const currentDayOfWeek = getDayOfWeek(currentDate);
    const dayOfWeekName = DAY_NAMES_FULL[currentDayOfWeek] ?? "不明";

    if (holidayInfo.isHoliday) {
      // 休日の場合: スケジュールに追加するが、授業回数にはカウントしない
      schedule.push({
        date: new Date(currentDate),
        dateStr: formatDate(currentDate),
        dayOfWeek: dayOfWeekName,
        isHoliday: true,
        holidayReason: holidayInfo.reason,
      });
    } else {
      // 通常の授業日: 授業回数をカウントし、スケジュールに追加
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

    // 次の同じ曜日（7日後）を計算してキューに追加
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 7);
    if (nextDate <= endDate) {
      dateQueues.push({ date: nextDate, dayOfWeek: dow });
      // 日付順にソート（次の処理で最も早い日付を取得するため）
      dateQueues.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
  }

  // 日付順にソート
  schedule.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 警告: 要求された授業回数に達していない場合
  if (classNumber < courseDays) {
    console.warn(
      `警告: 要求された授業回数（${courseDays}回）に達していません。実際の授業回数: ${classNumber}回。学期期間内の休日が多すぎる可能性があります。`
    );
  }

  return schedule;
}
