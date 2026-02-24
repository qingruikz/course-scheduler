<template>
  <div class="calendar-view">
    <h3>カレンダー表示</h3>
    <div class="calendars-scroll">
      <div
        class="calendars-grid"
        :class="{ 'calendars-grid-single': !twoColumns }"
      >
        <div
          v-for="month in reorderedMonths"
          :key="month.key"
          class="calendar-month"
        >
          <div class="calendar-header">
            {{ month.year }}年{{ month.month }}月
          </div>
          <div class="calendar-weekdays">
            <div v-for="day in weekdays" :key="day" class="weekday">
              {{ day }}
            </div>
          </div>
          <div class="calendar-days">
            <div
              v-for="(day, index) in month.days"
              :key="index"
              :class="[
                'calendar-day',
                { highlighted: day.isHighlighted },
                { holiday: day.isHoliday },
              ]"
              :title="
                day.dayDisplayInfo
                  ? day.dayDisplayInfo.isHoliday
                    ? `（休講）${day.dayDisplayInfo.reason ?? ''}`
                    : `第${day.dayDisplayInfo.classNumberDisplay}回 ${
                        day.dayDisplayInfo.deliveryMode === 'online'
                          ? 'オンライン（同時双方向型）'
                          : day.dayDisplayInfo.deliveryMode === 'on-demand'
                            ? 'オンライン（オンデマンド）'
                            : '対面'
                      }`
                  : ''
              "
            >
              <div v-if="day.day > 0" class="day-content">
                <span class="day-number">{{ day.day }}</span>
                <div v-if="day.dayDisplayInfo" class="day-info">
                  <div
                    v-if="day.dayDisplayInfo.isHoliday"
                    class="day-holiday-text"
                  >
                    休講
                  </div>
                  <div v-else class="day-class-info">
                    <DeliveryIcon
                      :mode="day.dayDisplayInfo.deliveryMode ?? 'face-to-face'"
                      :size="10"
                      class="day-delivery-icon"
                    />
                    <span class="day-class-number">{{
                      day.dayDisplayInfo.classNumberDisplay
                    }}</span>
                  </div>
                </div>
              </div>
              <span v-else class="day-number empty"></span>
              <div v-if="day.dayDisplayInfo" class="popover">
                <div class="popover-content">
                  <div class="popover-date">{{
                    day.dayDisplayInfo.dateStr ?? ""
                  }}</div>
                  <div
                    v-if="day.dayDisplayInfo.isHoliday"
                    class="popover-holiday"
                  >
                    （休講）{{ day.dayDisplayInfo.reason ?? "" }}
                  </div>
                  <div v-else class="popover-class">
                    <div>第{{ day.dayDisplayInfo.classNumberDisplay }}回</div>
                    <div class="popover-delivery">
                      {{
                        day.dayDisplayInfo.deliveryMode === "online"
                          ? "オンライン（同時双方向型）"
                          : day.dayDisplayInfo.deliveryMode === "on-demand"
                            ? "オンライン（オンデマンド）"
                            : "対面"
                      }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ScheduleItem } from "../types";
import DeliveryIcon from "./DeliveryIcon.vue";
import { formatClassNumbersDisplay } from "../utils/scheduleDisplay";
import { formatDateShort } from "../utils/scheduleGenerator";

const props = withDefaults(
  defineProps<{
    schedule: ScheduleItem[];
    twoColumns?: boolean;
  }>(),
  { twoColumns: true },
);

// 曜日のラベル（日曜日から土曜日）
const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function getDayDisplayInfo(items: ScheduleItem[] | undefined) {
  if (!items?.length) return null;
  const classes = items.filter((i) => !i.isHoliday && i.classNumber != null);
  const holidayItem = items.find((i) => i.isHoliday);
  if (holidayItem) {
    return { isHoliday: true as const, reason: holidayItem.holidayReason };
  }
  if (classes.length === 0) return null;
  const classNumbers = classes.map((i) => i.classNumber!);
  return {
    isHoliday: false as const,
    classNumberDisplay: formatClassNumbersDisplay(classNumbers),
    deliveryMode: classes[0]!.deliveryMode,
    dateStr: classes[0]!.dateStr,
  };
}

/**
 * スケジュールに含まれるすべての日付をSet形式で取得
 * カレンダー上でハイライト表示する日付を判定するために使用
 */
const highlightedDates = computed(() => {
  return new Set(props.schedule.map((item) => formatDateShort(item.date)));
});

/**
 * 休日（休講日）の日付をSet形式で取得
 * カレンダー上で休日として表示する日付を判定するために使用
 */
const holidayDates = computed(() => {
  return new Set(
    props.schedule
      .filter((item) => item.isHoliday)
      .map((item) => formatDateShort(item.date)),
  );
});

/**
 * 休日の理由を日付をキーとしてMap形式で取得
 * カレンダー上で休日の理由を表示するために使用
 */
const holidayReasons = computed(() => {
  const map = new Map<string, string>();
  props.schedule
    .filter((item) => item.isHoliday && item.holidayReason)
    .forEach((item) => {
      const dateStr = formatDateShort(item.date);
      map.set(dateStr, item.holidayReason!);
    });
  return map;
});

/**
 * スケジュール情報を日付をキーとしてMap形式で取得（同日複数授業対応）
 */
const scheduleInfo = computed(() => {
  const map = new Map<string, ScheduleItem[]>();
  props.schedule.forEach((item) => {
    const dateStr = formatDateShort(item.date);
    const existing = map.get(dateStr) ?? [];
    existing.push(item);
    map.set(dateStr, existing);
  });
  return map;
});

/**
 * displayedMonths: カレンダー表示用の月データを生成
 *
 * この関数は、スケジュールに含まれる日付の範囲を分析し、
 * その範囲内のすべての月についてカレンダーグリッドを生成します。
 *
 * 主な処理内容:
 * 1. スケジュールから最小日付と最大日付を取得
 * 2. 最小日付から最大日付までのすべての月をループ処理
 * 3. 各月について:
 *    - 月の最初の日の曜日を計算（カレンダーグリッドの開始位置を決定）
 *    - 月のすべての日付を生成し、各日付に以下の情報を付与:
 *      * 日付番号（1-31）
 *      * スケジュールに含まれるかどうか（ハイライト表示用）
 *      * 休日かどうか（休講日表示用）
 *      * 休日の理由（あれば）
 *      * 授業情報（回数、実施方法など）
 * 4. 各月のデータを配列に追加して返却
 *
 * 返却値:
 * - 各月のデータを含む配列
 * - 各月データには、年、月、日付配列が含まれる
 * - 日付配列の各要素には、表示用の情報（日付番号、ハイライト状態、休日情報など）が含まれる
 *
 * 例: スケジュールが4月16日から6月10日までの場合
 *   → 4月、5月、6月の3つのカレンダーを生成
 */
const displayedMonths = computed(() => {
  // スケジュールが空の場合は空配列を返す
  if (props.schedule.length === 0) return [];

  // スケジュールに含まれるすべての日付を取得
  const dates = props.schedule.map((item) => item.date);
  // 最小日付（スケジュールの開始日）を取得
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  // 最大日付（スケジュールの終了日）を取得
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  // 学期より1ヶ月多く表示（確認用）
  let endYear = maxDate.getFullYear();
  let endMonth = maxDate.getMonth();
  if (endMonth < 11) {
    endMonth += 1;
  } else {
    endMonth = 0;
    endYear += 1;
  }

  // 生成する月データを格納する配列
  const months: Array<{
    key: string;
    year: number;
    month: number;
    days: Array<{
      day: number;
      isHighlighted: boolean;
      isHoliday: boolean;
      holidayReason?: string;
      scheduleInfo?: ScheduleItem[];
      dayDisplayInfo?: ReturnType<typeof getDayDisplayInfo>;
    }>;
  }> = [];

  // 処理開始年月を設定（最小日付の年月）
  let currentYear = minDate.getFullYear();
  let currentMonth = minDate.getMonth();

  // 最小日付から最大日付+1ヶ月までのすべての月をループ処理
  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const year = currentYear;
    const month = currentMonth;
    // 月の最初の日（1日）を取得
    const firstDay = new Date(year, month, 1);
    // 月の最後の日を取得（次の月の0日 = 今月の最終日）
    const lastDay = new Date(year, month + 1, 0);
    // 月の最初の日の曜日を取得（0=日曜日、1=月曜日、...、6=土曜日）
    const firstDayOfWeek = firstDay.getDay();

    // この月の日付データを格納する配列
    const days: Array<{
      day: number;
      isHighlighted: boolean;
      isHoliday: boolean;
      holidayReason?: string;
      scheduleInfo?: ScheduleItem[];
      dayDisplayInfo?: ReturnType<typeof getDayDisplayInfo>;
    }> = [];

    // カレンダーグリッドの最初の週の空白セルを追加
    // 例: 月の1日が水曜日（3）の場合、日曜日（0）、月曜日（1）、火曜日（2）の3つの空白セルを追加
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        day: 0, // 0は空白セルを表す
        isHighlighted: false,
        isHoliday: false,
      });
    }

    // 月のすべての日付（1日から最終日まで）を生成
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDateShort(date);
      // この日付が休日かどうかを判定
      const isHoliday = holidayDates.value.has(dateStr);
      // この日付に対応するスケジュール情報を取得（同日複数授業対応）
      const items = scheduleInfo.value.get(dateStr);
      days.push({
        day, // 日付番号（1-31）
        // この日付がスケジュールに含まれるかどうか（ハイライト表示用）
        isHighlighted: highlightedDates.value.has(dateStr),
        // この日付が休日かどうか
        isHoliday,
        // 休日の理由（休日の場合のみ）
        holidayReason: isHoliday
          ? holidayReasons.value.get(dateStr)
          : undefined,
        // この日付の授業情報（同日複数可）
        scheduleInfo: items,
        dayDisplayInfo: getDayDisplayInfo(items),
      });
    }

    // 生成した月データを配列に追加
    months.push({
      key: `${year}-${month}`, // 一意のキー（例: "2025-3"）
      year,
      month: month + 1, // 月は0始まりなので+1（表示用）
      days,
    });

    // 次の月へ進む
    if (currentMonth === 11) {
      // 12月（11）の場合は、翌年の1月（0）に進む
      currentMonth = 0;
      currentYear++;
    } else {
      // それ以外の場合は、次の月に進む
      currentMonth++;
    }
  }

  return months;
});

/** グリッド表示用：上→下、左→右の順（列優先）に並べ替え */
const reorderedMonths = computed(() => {
  const m = displayedMonths.value;
  const cols = props.twoColumns ? 2 : 1;
  if (m.length === 0) return m;
  const numRows = Math.ceil(m.length / cols);
  return Array.from(
    { length: m.length },
    (_, i) => m[Math.floor(i / cols) + (i % cols) * numRows]!,
  );
});
</script>

<style scoped>
.calendar-view {
  margin-top: 10px;
}

.calendar-view h3 {
  font-size: 16px;
  margin-bottom: 10px;
}

.calendars-scroll {
  max-height: 70vh;
  overflow-y: auto;
  margin-top: 8px;
}

.calendars-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.calendars-grid.calendars-grid-single {
  grid-template-columns: 1fr;
}

.calendar-month {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px 6px;
  background: white;
}

.calendar-header {
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 6px;
  text-align: center;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 3px;
}

.weekday {
  text-align: center;
  font-weight: bold;
  font-size: 9px;
  color: #666;
  padding: 2px;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  font-size: 12px;
  cursor: default;
  min-height: 0;
  padding: 6px 0;
  width: 20px;
  height: auto;
  min-height: 50px;
  margin: 0 auto;
  box-sizing: border-box;
}

.day-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  gap: 2px;
}

.day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  min-height: 15px;
  height: 15px;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.2s;
  line-height: 1;
}

.day-number.empty {
  visibility: hidden;
}

.calendar-day.highlighted .day-number {
  background-color: #0066cc;
  color: white;
  font-weight: bold;
}

.calendar-day.holiday .day-number {
  background-color: #ffcccc;
  color: #cc0000;
}

.calendar-day.highlighted.holiday .day-number {
  background-color: #ff6666;
  color: white;
}

.calendar-day {
  position: relative;
}

.day-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  font-size: 8px;
  line-height: 1;
  gap: 1px;
}

.day-class-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #0066cc;
}

.day-class-info .day-delivery-icon,
.day-class-info .day-class-number {
  color: inherit;
}

.day-delivery-icon {
  flex-shrink: 0;
}

.day-class-number {
  font-size: 8px;
  white-space: nowrap;
}

/* 休講：汉字 休講，红色（与现有一致） */
.day-holiday-text {
  font-size: 8px;
  color: #cc0000;
  white-space: nowrap;
}

.popover {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 5px;
  padding: 0;
  background-color: #333;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  white-space: normal;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 150px;
}

.popover-content {
  padding: 8px 12px;
}

.popover-date {
  font-weight: bold;
  margin-bottom: 4px;
}

.popover-holiday {
  color: #ffcccc;
}

.popover-class {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.popover-delivery {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  display: inline-block;
  background-color: rgba(255, 255, 255, 0.2);
}

.popover::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #333;
}

.calendar-day:hover .popover {
  opacity: 1;
}
</style>
