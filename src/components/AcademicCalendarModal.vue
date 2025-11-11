<template>
  <div v-if="visible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ formatAcademicYear(year) }} 学年暦</h2>
        <button class="close-button" @click="closeModal">×</button>
      </div>
      <div class="legend-container">
        <div class="legend-item">
          <span class="legend-color semester-1"></span>
          <span class="legend-label">1学期</span>
        </div>
        <div class="legend-item">
          <span class="legend-color semester-2"></span>
          <span class="legend-label">2学期</span>
        </div>
        <div class="legend-item">
          <span class="legend-color semester-3"></span>
          <span class="legend-label">3学期</span>
        </div>
        <div class="legend-item">
          <span class="legend-color semester-4"></span>
          <span class="legend-label">4学期</span>
        </div>
        <div class="legend-item">
          <span class="legend-color semester-summer"></span>
          <span class="legend-label">夏期集中授業期間</span>
        </div>
        <div class="legend-item">
          <span class="legend-color semester-spring"></span>
          <span class="legend-label">春季集中授業期間</span>
        </div>
      </div>
      <div class="modal-body">
        <div class="calendars-container">
          <!-- 1列目: 4月から9月 -->
          <div class="calendar-column">
            <div
              v-for="(month, index) in firstHalfMonths"
              :key="month.key"
              class="calendar-month"
              :style="{ minHeight: getMonthMinHeight(index, 'first') }"
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
                    { 'other-month': !day.isCurrentMonth },
                    { 'semester-1': day.semester === '1' },
                    { 'semester-2': day.semester === '2' },
                    { 'semester-3': day.semester === '3' },
                    { 'semester-4': day.semester === '4' },
                    { 'semester-summer': day.semester === 'summer' },
                    { 'semester-spring': day.semester === 'spring' },
                    { sunday: day.dayOfWeek === 0 },
                    { holiday: day.isHoliday },
                  ]"
                >
                  <div v-if="day.day > 0" class="day-content">
                    <span class="day-number">{{ day.day }}</span>
                    <div
                      v-if="day.isHoliday && day.holidayReason"
                      class="day-holiday-text-wrapper"
                    >
                      <div class="day-holiday-text">
                        {{
                          day.holidayReason.length > 8
                            ? day.holidayReason.substring(0, 8) + "..."
                            : day.holidayReason
                        }}
                      </div>
                      <div
                        v-if="day.holidayReason && day.holidayReason.length > 8"
                        class="holiday-tooltip"
                      >
                        {{ day.holidayReason }}
                      </div>
                    </div>
                  </div>
                  <span v-else class="day-number empty"></span>
                </div>
              </div>
            </div>
          </div>
          <!-- 2列目: 10月から翌年3月 -->
          <div class="calendar-column">
            <div
              v-for="(month, index) in secondHalfMonths"
              :key="month.key"
              class="calendar-month"
              :style="{ minHeight: getMonthMinHeight(index, 'second') }"
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
                    { 'other-month': !day.isCurrentMonth },
                    { 'semester-1': day.semester === '1' },
                    { 'semester-2': day.semester === '2' },
                    { 'semester-3': day.semester === '3' },
                    { 'semester-4': day.semester === '4' },
                    { 'semester-summer': day.semester === 'summer' },
                    { 'semester-spring': day.semester === 'spring' },
                    { sunday: day.dayOfWeek === 0 },
                    { holiday: day.isHoliday },
                  ]"
                >
                  <div v-if="day.day > 0" class="day-content">
                    <span class="day-number">{{ day.day }}</span>
                    <div
                      v-if="day.isHoliday && day.holidayReason"
                      class="day-holiday-text-wrapper"
                    >
                      <div class="day-holiday-text">
                        {{
                          day.holidayReason.length > 8
                            ? day.holidayReason.substring(0, 8) + "..."
                            : day.holidayReason
                        }}
                      </div>
                      <div
                        v-if="day.holidayReason && day.holidayReason.length > 8"
                        class="holiday-tooltip"
                      >
                        {{ day.holidayReason }}
                      </div>
                    </div>
                  </div>
                  <span v-else class="day-number empty"></span>
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
import type { YearData } from "../types";
import { formatDateShort } from "../utils/scheduleGenerator";
import { formatAcademicYear } from "../utils/japaneseEra";

const props = defineProps<{
  visible: boolean;
  year: number;
  yearData: YearData | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function closeModal() {
  emit("close");
}

// 日付がどの学期に属するかを判定
function getSemesterForDate(date: Date): string | null {
  if (!props.yearData) return null;

  const dateStr = formatDateShort(date);
  const semesters = props.yearData.semesters;

  // 各学期の期間をチェック（順序は重要：より具体的な期間を先にチェック）
  const semesterKeys: Array<
    | "1学期"
    | "2学期"
    | "3学期"
    | "4学期"
    | "夏期集中授業期間"
    | "春季集中授業期間"
  > = [
    "1学期",
    "2学期",
    "3学期",
    "4学期",
    "夏期集中授業期間",
    "春季集中授業期間",
  ];

  for (const key of semesterKeys) {
    if (semesters[key]) {
      const [start, end] = semesters[key];
      if (dateStr >= start && dateStr <= end) {
        // CSS クラス名用に変換
        if (key === "夏期集中授業期間") return "summer";
        if (key === "春季集中授業期間") return "spring";
        // 1学期、2学期、3学期、4学期はそのまま数字を返す
        return key.replace("学期", "");
      }
    }
  }

  return null;
}

// 日付が休日かどうかを判定
function isHolidayDate(date: Date): { isHoliday: boolean; reason?: string } {
  if (!props.yearData) return { isHoliday: false };

  const dateStr = formatDateShort(date);
  const dayOfWeek = date.getDay();

  // 日曜日は休日
  if (dayOfWeek === 0) {
    return { isHoliday: true, reason: "日曜日" };
  }

  // 休日リストをチェック
  for (const vacation of props.yearData.vacations) {
    if (vacation.dates.includes(dateStr)) {
      return { isHoliday: true, reason: vacation.name };
    }
  }

  return { isHoliday: false };
}

// 12か月分のカレンダーを生成
const displayedMonths = computed(() => {
  if (!props.yearData) return [];

  const months: Array<{
    key: string;
    year: number;
    month: number;
    days: Array<{
      day: number;
      isCurrentMonth: boolean;
      semester: string | null;
      dayOfWeek: number;
      isHoliday: boolean;
      holidayReason?: string;
    }>;
  }> = [];

  // 年度の開始月（4月）から12か月分
  const startYear = props.year;
  const startMonth = 3; // 4月（0-indexed）

  for (let i = 0; i < 12; i++) {
    const currentMonth = (startMonth + i) % 12;
    const currentYear = startYear + Math.floor((startMonth + i) / 12);

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const firstDayOfWeek = firstDay.getDay();

    const days: Array<{
      day: number;
      isCurrentMonth: boolean;
      semester: string | null;
      dayOfWeek: number;
      isHoliday: boolean;
      holidayReason?: string;
    }> = [];

    // 最初の週の空白を追加
    for (let j = 0; j < firstDayOfWeek; j++) {
      days.push({
        day: 0,
        isCurrentMonth: true,
        semester: null,
        dayOfWeek: j,
        isHoliday: false,
      });
    }

    // 今月の日付
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(currentYear, currentMonth, day);
      const semester = getSemesterForDate(date);
      const holidayInfo = isHolidayDate(date);
      const dayOfWeek = date.getDay();

      days.push({
        day,
        isCurrentMonth: true,
        semester: semester, // semester は string | null
        dayOfWeek,
        isHoliday: holidayInfo.isHoliday,
        holidayReason: holidayInfo.reason,
      });
    }

    months.push({
      key: `${currentYear}-${currentMonth}`,
      year: currentYear,
      month: currentMonth + 1,
      days,
    });
  }

  return months;
});

// 1列目: 4月から9月
const firstHalfMonths = computed(() => {
  return displayedMonths.value.filter((month) => {
    const monthNum = month.month;
    return monthNum >= 4 && monthNum <= 9;
  });
});

// 2列目: 10月から翌年3月
const secondHalfMonths = computed(() => {
  return displayedMonths.value.filter((month) => {
    const monthNum = month.month;
    return monthNum >= 10 || monthNum <= 3;
  });
});

/**
 * 月份日历的行数计算
 * 通过 days 数组长度除以7（每周7天）并向上取整
 */
function getMonthRows(month: { days: Array<{ day: number }> }): number {
  return Math.ceil(month.days.length / 7);
}

/**
 * 根据左右对应月份的行数计算 min-height
 * @param index - 月份在对应列中的索引
 * @param column - 'first' 或 'second'，表示是第一列还是第二列
 * @returns min-height 的 CSS 值
 */
function getMonthMinHeight(index: number, column: "first" | "second"): string {
  const firstMonth = firstHalfMonths.value[index];
  const secondMonth = secondHalfMonths.value[index];

  // 如果对应位置的月份不存在，返回默认值
  if (!firstMonth || !secondMonth) {
    return "300px";
  }

  const firstRows = getMonthRows(firstMonth);
  const secondRows = getMonthRows(secondMonth);

  // 如果有一个是6行，设置 min-height: 380px
  if (firstRows === 6 || secondRows === 6) {
    return "360px";
  }
  // 如果都是5行，设置 min-height: 340px
  else if (firstRows === 5 && secondRows === 5) {
    return "310px";
  }

  // 其他情况返回默认值
  return "300px";
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 90vw;
  max-height: 90vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.legend-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-color {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-color.semester-1 {
  background-color: #c8e6c9;
  border: 1px solid #2e7d32;
}

.legend-color.semester-2 {
  background-color: #bbdefb;
  border: 1px solid #1565c0;
}

.legend-color.semester-3 {
  background-color: #ffe0b2;
  border: 1px solid #e65100;
}

.legend-color.semester-4 {
  background-color: #e1bee7;
  border: 1px solid #6a1b9a;
}

.legend-color.semester-summer {
  background-color: #a5d6a7;
  border: 1px solid #388e3c;
}

.legend-color.semester-spring {
  background-color: #f8bbd0;
  border: 1px solid #c2185b;
}

.legend-label {
  font-size: 12px;
  color: #333;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 32px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.calendars-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  align-items: start;
}

.calendar-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.calendar-month {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px;
  background: white;
  display: flex;
  flex-direction: column;
}

.calendar-header {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 8px;
  text-align: center;
  color: #333;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 6px;
}

.weekday {
  text-align: center;
  font-weight: bold;
  font-size: 11px;
  color: #666;
  padding: 4px;
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
  font-size: 11px;
  cursor: default;
  min-height: 0;
  padding: 2px;
  box-sizing: border-box;
  border-radius: 3px;
  max-width: 50px;
  max-height: 50px;
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
  min-width: 18px;
  min-height: 18px;
  height: 18px;
  padding: 1px 3px;
  border-radius: 3px;
  transition: all 0.2s;
  line-height: 1;
  font-weight: bold;
  font-size: 11px;
}

.day-number.empty {
  visibility: hidden;
}

/* 学期の背景色 */
.calendar-day.semester-1 .day-number {
  background-color: #c8e6c9; /* 緑 */
  color: #2e7d32;
}

.calendar-day.semester-2 .day-number {
  background-color: #bbdefb; /* 青 */
  color: #1565c0;
}

.calendar-day.semester-3 .day-number {
  background-color: #ffe0b2; /* オレンジ */
  color: #e65100;
}

.calendar-day.semester-4 .day-number {
  background-color: #e1bee7; /* 紫 */
  color: #6a1b9a;
}

.calendar-day.semester-summer .day-number {
  background-color: #a5d6a7; /* 緑（1学期より濃い） */
  color: #388e3c;
}

.calendar-day.semester-spring .day-number {
  background-color: #f8bbd0; /* ピンク */
  color: #c2185b;
}

/* 日曜日と休日（ピンク） */
.calendar-day.sunday .day-number {
  background-color: #ffcccc; /* ピンク */
  color: #c62828;
}

.calendar-day.holiday .day-number {
  background-color: #ffcccc; /* ピンク */
  color: #c62828;
}

/* 学期と休日が重なる場合、休日を優先 */
.calendar-day.holiday.semester-1 .day-number,
.calendar-day.holiday.semester-2 .day-number,
.calendar-day.holiday.semester-3 .day-number,
.calendar-day.holiday.semester-4 .day-number,
.calendar-day.holiday.semester-summer .day-number,
.calendar-day.holiday.semester-spring .day-number,
.calendar-day.sunday.semester-1 .day-number,
.calendar-day.sunday.semester-2 .day-number,
.calendar-day.sunday.semester-3 .day-number,
.calendar-day.sunday.semester-4 .day-number,
.calendar-day.sunday.semester-summer .day-number,
.calendar-day.sunday.semester-spring .day-number {
  background-color: #ffcccc; /* ピンク */
  color: #c62828;
}

.day-holiday-text-wrapper {
  position: relative;
  width: 100%;
}

.day-holiday-text {
  font-size: 8px;
  color: #c62828;
  white-space: nowrap;
  text-align: center;
  line-height: 1;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.holiday-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 5px;
  padding: 8px 12px;
  background-color: #333;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-width: 300px;
  min-width: 150px;
  word-wrap: break-word;
  white-space: normal;
  text-align: left;
}

.holiday-tooltip::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #333;
}

.day-holiday-text-wrapper:hover .holiday-tooltip {
  opacity: 1;
}

.calendar-day.other-month {
  opacity: 0.3;
}
</style>
