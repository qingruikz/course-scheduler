<template>
  <div class="calendar-view">
    <h3>カレンダー表示</h3>
    <div class="calendar-link">
      <a :href="calendarPdfUrl" target="_blank" rel="noopener noreferrer">
        大学公式の学年暦PDF
      </a>
    </div>
    <div class="calendars-grid">
      <div v-for="month in displayedMonths" :key="month.key" class="calendar-month">
        <div class="calendar-header">{{ month.year }}年{{ month.month }}月</div>
        <div class="calendar-weekdays">
          <div v-for="day in weekdays" :key="day" class="weekday">{{ day }}</div>
        </div>
        <div class="calendar-days">
          <div
            v-for="(day, index) in month.days"
            :key="index"
            :class="[
              'calendar-day',
              { 'other-month': !day.isCurrentMonth },
              { 'highlighted': day.isHighlighted },
              { 'holiday': day.isHoliday }
            ]"
          >
            {{ day.day }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ScheduleItem } from '../types';
import { formatDateShort } from '../utils/scheduleGenerator';

const props = defineProps<{
  schedule: ScheduleItem[];
}>();

const calendarPdfUrl = 'https://www.musashino-u.ac.jp/student-life/%E4%BB%A4%E5%92%8C8%E5%B9%B4%E5%BA%A6%20%E6%AD%A6%E8%94%B5%E9%87%8E%E5%A4%A7%E5%AD%A6%E5%B9%B4%E6%9A%A6.pdf';

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

const highlightedDates = computed(() => {
  return new Set(props.schedule.map(item => formatDateShort(item.date)));
});

const holidayDates = computed(() => {
  return new Set(
    props.schedule
      .filter(item => item.isHoliday)
      .map(item => formatDateShort(item.date))
  );
});

const displayedMonths = computed(() => {
  if (props.schedule.length === 0) return [];
  
  const dates = props.schedule.map(item => item.date);
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  const months: Array<{
    key: string;
    year: number;
    month: number;
    days: Array<{
      day: number;
      isCurrentMonth: boolean;
      isHighlighted: boolean;
      isHoliday: boolean;
    }>;
  }> = [];
  
  let currentYear = minDate.getFullYear();
  let currentMonth = minDate.getMonth();
  const endYear = maxDate.getFullYear();
  const endMonth = maxDate.getMonth();
  
  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    const year = currentYear;
    const month = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    
    const days: Array<{
      day: number;
      isCurrentMonth: boolean;
      isHighlighted: boolean;
      isHoliday: boolean;
    }> = [];
    
    // 前月の日付
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      const dateStr = formatDateShort(prevDate);
      days.push({
        day: prevDate.getDate(),
        isCurrentMonth: false,
        isHighlighted: highlightedDates.value.has(dateStr),
        isHoliday: holidayDates.value.has(dateStr)
      });
    }
    
    // 今月の日付
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDateShort(date);
      days.push({
        day,
        isCurrentMonth: true,
        isHighlighted: highlightedDates.value.has(dateStr),
        isHoliday: holidayDates.value.has(dateStr)
      });
    }
    
    // 次月の日付（カレンダーを埋める）
    const remainingDays = 42 - days.length; // 6週間分
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      const dateStr = formatDateShort(nextDate);
      days.push({
        day,
        isCurrentMonth: false,
        isHighlighted: highlightedDates.value.has(dateStr),
        isHoliday: holidayDates.value.has(dateStr)
      });
    }
    
    months.push({
      key: `${year}-${month}`,
      year,
      month: month + 1,
      days
    });
    
    // 次の月へ
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
  }
  
  return months;
});
</script>

<style scoped>
.calendar-view {
  margin-top: 20px;
}

.calendar-link {
  margin-bottom: 15px;
}

.calendar-link a {
  color: #0066cc;
  text-decoration: none;
}

.calendar-link a:hover {
  text-decoration: underline;
}

.calendars-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 15px;
}

.calendar-month {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: white;
}

.calendar-header {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 10px;
  text-align: center;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 5px;
}

.weekday {
  text-align: center;
  font-weight: bold;
  font-size: 12px;
  color: #666;
  padding: 5px;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border-radius: 4px;
  cursor: default;
}

.calendar-day.other-month {
  color: #ccc;
}

.calendar-day.highlighted {
  background-color: #0066cc;
  color: white;
  font-weight: bold;
}

.calendar-day.holiday {
  background-color: #ffcccc;
  color: #cc0000;
}

.calendar-day.highlighted.holiday {
  background-color: #ff6666;
  color: white;
}
</style>

