<template>
  <div class="official-calendar-view">
    <h3>カレンダー表示（学年暦背景）</h3>
    <div class="calendars-scroll">
      <div class="calendars-grid">
        <template v-for="month in displayedMonths" :key="month.key">
          <div v-if="getMonthLayout(month.month)" class="official-month-card">
            <!-- 曜日は背景画像の上に表示（画像自体に曜日行なし） -->
            <div
              class="official-weekdays-row"
              :style="weekdaysRowStyle(month.month)"
            >
              <div v-for="day in weekdays" :key="day" class="official-weekday">
                {{ day }}
              </div>
            </div>
            <div
              class="official-month-background"
              :style="monthCardStyle(month.month)"
            >
              <div
                class="official-grid-overlay"
                :style="gridOverlayStyle(month.month)"
              >
                <div
                  class="official-grid-inner"
                  :style="gridInnerStyle(month.month)"
                >
                  <div
                    v-for="(day, index) in visibleDays(month)"
                    :key="index"
                    :class="[
                      'official-day-cell',
                      { highlighted: day.isHighlighted && !day.isHoliday },
                      { holiday: day.isHoliday },
                    ]"
                    :title="
                      day.scheduleInfo
                        ? day.scheduleInfo.isHoliday
                          ? `（休講）${day.scheduleInfo.holidayReason}`
                          : `第${day.scheduleInfo.classNumber}回`
                        : ''
                    "
                  >
                    <template v-if="day.day > 0">
                      <span class="official-day-num">{{ day.day }}</span>
                      <span
                        v-if="day.scheduleInfo"
                        class="official-day-marker"
                        :class="{
                          'marker-holiday': day.scheduleInfo.isHoliday,
                          'marker-class': !day.scheduleInfo.isHoliday,
                        }"
                      />
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="official-month-placeholder" :key="month.key">
            <span>{{ month.year }}年{{ month.month }}月（公式配置なし）</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ScheduleItem, CalendarLayout, MonthLayout } from "../types";
import { formatDateShort } from "../utils/scheduleGenerator";

const props = defineProps<{
  schedule: ScheduleItem[];
  layout: CalendarLayout | null;
}>();

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

const highlightedDates = computed(() => {
  return new Set(props.schedule.map((item) => formatDateShort(item.date)));
});
const holidayDates = computed(() => {
  return new Set(
    props.schedule
      .filter((item) => item.isHoliday)
      .map((item) => formatDateShort(item.date)),
  );
});
const holidayReasons = computed(() => {
  const map = new Map<string, string>();
  props.schedule
    .filter((item) => item.isHoliday && item.holidayReason)
    .forEach((item) => {
      map.set(formatDateShort(item.date), item.holidayReason!);
    });
  return map;
});
const scheduleInfo = computed(() => {
  const map = new Map<string, ScheduleItem>();
  props.schedule.forEach((item) => {
    map.set(formatDateShort(item.date), item);
  });
  return map;
});

const displayedMonths = computed(() => {
  if (props.schedule.length === 0) return [];
  const dates = props.schedule.map((item) => item.date);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const months: Array<{
    key: string;
    year: number;
    month: number;
    days: Array<{
      day: number;
      isHighlighted: boolean;
      isHoliday: boolean;
      holidayReason?: string;
      scheduleInfo?: ScheduleItem;
    }>;
  }> = [];
  let currentYear = minDate.getFullYear();
  let currentMonth = minDate.getMonth();
  const endYear = maxDate.getFullYear();
  const endMonth = maxDate.getMonth();

  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const year = currentYear;
    const month = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const days: Array<{
      day: number;
      isHighlighted: boolean;
      isHoliday: boolean;
      holidayReason?: string;
      scheduleInfo?: ScheduleItem;
    }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: 0, isHighlighted: false, isHoliday: false });
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDateShort(date);
      const isHoliday = holidayDates.value.has(dateStr);
      const info = scheduleInfo.value.get(dateStr);
      days.push({
        day,
        isHighlighted: highlightedDates.value.has(dateStr),
        isHoliday,
        holidayReason: isHoliday
          ? holidayReasons.value.get(dateStr)
          : undefined,
        scheduleInfo: info,
      });
    }
    months.push({
      key: `${year}-${month}`,
      year,
      month: month + 1,
      days,
    });
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
  }
  return months;
});

function getMonthLayout(month: number): MonthLayout | undefined {
  return props.layout?.months[String(month)];
}

function visibleDays(month: {
  month: number;
  days: Array<{
    day: number;
    isHighlighted: boolean;
    isHoliday: boolean;
    scheduleInfo?: ScheduleItem;
  }>;
}) {
  const ml = getMonthLayout(month.month);
  const rowCount = ml?.rowCount ?? 5;
  const n = 7 * rowCount;
  return month.days.slice(0, n);
}

const baseUrl = import.meta.env.BASE_URL || "/";

/** 画像全体のアスペクト比（幅/高さ）。未指定時は A4 縦（210/297）を仮定。 */
const DEFAULT_IMAGE_ASPECT_RATIO = 210 / 297;

function monthCardStyle(month: number) {
  const ml = getMonthLayout(month);
  if (!ml || !props.layout) return {};
  const b = ml.monthBox;
  const imgPath = props.layout.images[ml.imageId];
  if (!imgPath) return {};
  const url = imgPath.startsWith("http") ? imgPath : baseUrl + imgPath;
  const sizeX = 100 / b.width;
  const sizeY = 100 / b.height;
  // CSS: offset = (container - image) * (percent/100)。画像上の (x,y) を容器の (0,0) に合わせる => percent = -100*x/(width-1) 等
  const posX = b.width !== 1 ? (-100 * b.x) / (b.width - 1) : 0;
  const posY = b.height !== 1 ? (-100 * b.y) / (b.height - 1) : 0;
  // monthBox は画像上の正規化座標なので、表示アスペクト比 = (width/height) * 画像のアスペクト比
  const imageAspect =
    props.layout.imageAspectRatio ?? DEFAULT_IMAGE_ASPECT_RATIO;
  const aspectRatio = (b.width / b.height) * imageAspect;
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: `${sizeX}% ${sizeY}%`,
    backgroundPosition: `${posX}% ${posY}%`,
    aspectRatio: String(aspectRatio),
  };
}

function weekdaysRowStyle(month: number) {
  const ml = getMonthLayout(month);
  if (!ml) return {};
  const g = ml.gridOffset;
  return {
    paddingLeft: `${g.paddingLeft * 100}%`,
    paddingRight: `${g.paddingRight * 100}%`,
  };
}

function gridOverlayStyle(month: number) {
  const ml = getMonthLayout(month);
  if (!ml) return {};
  const g = ml.gridOffset;
  return {
    left: `${g.paddingLeft * 100}%`,
    top: `${g.paddingTop * 100}%`,
    right: `${g.paddingRight * 100}%`,
    bottom: `${g.paddingBottom * 100}%`,
  };
}

function gridInnerStyle(month: number) {
  const ml = getMonthLayout(month);
  if (!ml) return {};
  return {
    gridTemplateColumns: "repeat(7, 1fr)",
    gridTemplateRows: `repeat(${ml.rowCount}, 1fr)`,
  };
}
</script>

<style scoped>
.official-calendar-view {
  margin-top: 10px;
}
.official-calendar-view h3 {
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
  grid-template-columns: 1fr;
  gap: 10px;
}
.official-month-card {
  display: flex;
  flex-direction: column;
  border-radius: 6px;
  overflow: hidden;
  min-width: 0;
}
.official-weekdays-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex-shrink: 0;
  gap: 0;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
.official-weekday {
  text-align: center;
  font-weight: bold;
  font-size: 10px;
  color: #333;
  padding: 4px 0;
}
.official-month-background {
  flex: 0 0 auto;
  width: 100%;
  position: relative;
  background-repeat: no-repeat;
  background-color: #f5f5f5;
}
.official-grid-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}
.official-grid-overlay > * {
  pointer-events: auto;
}
.official-grid-inner {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  gap: 0;
}
.official-day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  font-size: 11px;
  position: relative;
}
/* 背景画像に日付ありのため数字は非表示。格子は透明で授業ハイライトを重ねやすくする */
.official-day-num {
  visibility: hidden;
  font-weight: 500;
}
.official-day-marker {
  position: absolute;
  inset: 2px;
  border-radius: 4px;
  pointer-events: none;
}
.official-day-marker.marker-class {
  background: rgba(0, 102, 204, 0.4);
}
.official-day-marker.marker-holiday {
  background: rgba(204, 0, 0, 0.35);
}
.official-day-cell.holiday .official-day-num {
  color: #c62828;
}
.official-day-cell.highlighted .official-day-num {
  font-weight: bold;
}
.official-month-placeholder {
  border: 1px dashed #ccc;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 12px;
}
</style>
