<template>
  <div v-if="visible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ formatAcademicYear(year) }} 学年暦</h2>
        <button class="close-button" @click="closeModal">×</button>
      </div>
      <div class="modal-body">
        <div class="calendars-container">
          <!-- 1列目: 4月から9月 -->
          <div class="calendar-column">
            <div
              v-for="month in firstHalfMonths"
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
                    { 'other-month': !day.isCurrentMonth },
                    { 'semester-1': day.semester === 1 },
                    { 'semester-2': day.semester === 2 },
                    { 'semester-3': day.semester === 3 },
                    { 'semester-4': day.semester === 4 },
                    { sunday: day.dayOfWeek === 0 },
                    { holiday: day.isHoliday },
                  ]"
                >
                  <div v-if="day.day > 0" class="day-content">
                    <span class="day-number">{{ day.day }}</span>
                    <div
                      v-if="day.isHoliday && day.holidayReason"
                      class="day-holiday-text"
                    >
                      {{
                        day.holidayReason.length > 8
                          ? day.holidayReason.substring(0, 8) + "..."
                          : day.holidayReason
                      }}
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
              v-for="month in secondHalfMonths"
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
                    { 'other-month': !day.isCurrentMonth },
                    { 'semester-1': day.semester === 1 },
                    { 'semester-2': day.semester === 2 },
                    { 'semester-3': day.semester === 3 },
                    { 'semester-4': day.semester === 4 },
                    { sunday: day.dayOfWeek === 0 },
                    { holiday: day.isHoliday },
                  ]"
                >
                  <div v-if="day.day > 0" class="day-content">
                    <span class="day-number">{{ day.day }}</span>
                    <div
                      v-if="day.isHoliday && day.holidayReason"
                      class="day-holiday-text"
                    >
                      {{
                        day.holidayReason.length > 8
                          ? day.holidayReason.substring(0, 8) + "..."
                          : day.holidayReason
                      }}
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
function getSemesterForDate(date: Date): number | null {
  if (!props.yearData) return null;

  const dateStr = formatDateShort(date);
  const semesters = props.yearData.semesters;

  // 各学期の期間をチェック
  if (semesters["1学期"]) {
    const [start1, end1] = semesters["1学期"];
    if (dateStr >= start1 && dateStr <= end1) return 1;
  }
  if (semesters["2学期"]) {
    const [start2, end2] = semesters["2学期"];
    if (dateStr >= start2 && dateStr <= end2) return 2;
  }
  if (semesters["3学期"]) {
    const [start3, end3] = semesters["3学期"];
    if (dateStr >= start3 && dateStr <= end3) return 3;
  }
  if (semesters["4学期"]) {
    const [start4, end4] = semesters["4学期"];
    if (dateStr >= start4 && dateStr <= end4) return 4;
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
      semester: number | null;
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
      semester: number | null;
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
        semester,
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
  font-size: 12px;
  cursor: default;
  min-height: 0;
  padding: 4px;
  box-sizing: border-box;
  border-radius: 3px;
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
  min-width: 20px;
  min-height: 20px;
  height: 20px;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.2s;
  line-height: 1;
  font-weight: bold;
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
  background-color: #ffe0b2; /* オレンジ */
  color: #e65100;
}

.calendar-day.semester-3 .day-number {
  background-color: #bbdefb; /* 青 */
  color: #1565c0;
}

.calendar-day.semester-4 .day-number {
  background-color: #e1bee7; /* 紫 */
  color: #6a1b9a;
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
.calendar-day.sunday.semester-1 .day-number,
.calendar-day.sunday.semester-2 .day-number,
.calendar-day.sunday.semester-3 .day-number,
.calendar-day.sunday.semester-4 .day-number {
  background-color: #ffcccc; /* ピンク */
  color: #c62828;
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

.calendar-day.other-month {
  opacity: 0.3;
}
</style>
