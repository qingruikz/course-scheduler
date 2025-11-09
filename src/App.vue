<template>
  <div class="app">
    <header class="header">
      <h1>大学授業スケジュールジェネレーター</h1>
      <p class="subtitle">
        学期と授業の頻度を選択して、授業日程を自動生成します。
      </p>
    </header>

    <div class="main-container">
      <!-- 左側: 条件設定 -->
      <div class="left-panel">
        <h2>条件設定</h2>

        <div class="form-group">
          <label for="semester">学期</label>
          <select id="semester" v-model="selectedSemester" class="form-control">
            <option value="第一学期">第一学期</option>
            <option value="第二学期">第二学期</option>
            <option value="前期">前期</option>
            <option value="第三学期">第三学期</option>
            <option value="第四学期">第四学期</option>
            <option value="後期">後期</option>
          </select>
        </div>

        <div class="form-group">
          <label>課程日数</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" v-model="selectedCourseDays" :value="7" />
              <span>7回</span>
            </label>
            <label class="radio-label">
              <input type="radio" v-model="selectedCourseDays" :value="14" />
              <span>14回</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>週の授業回数</label>
          <div class="radio-group">
            <label class="radio-label">
              <input
                type="radio"
                v-model="selectedClassesPerWeek"
                :value="1"
                @change="onClassesPerWeekChange"
              />
              <span>週1回</span>
            </label>
            <label class="radio-label">
              <input
                type="radio"
                v-model="selectedClassesPerWeek"
                :value="2"
                @change="onClassesPerWeekChange"
              />
              <span>週2回</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>授業の曜日</label>
          <div class="day-buttons">
            <button
              v-for="(day, index) in dayNames"
              :key="index"
              :class="['day-button', { active: isDaySelected(index as DayOfWeek) }]"
              @click="toggleDay(index as DayOfWeek)"
            >
              {{ day }}
            </button>
          </div>
          <div v-if="selectedClassesPerWeek === 2" class="day-selection-hint">
            {{ selectedDaysOfWeek.length }} / 2 日選択中
          </div>
        </div>

        <button class="generate-button" @click="generateSchedule">
          スケジュールを生成
        </button>
      </div>

      <!-- 右側: 授業日程リストとカレンダー -->
      <div class="right-panel">
        <div class="semester-period" v-if="semesterPeriod">
          <strong>学期期間:</strong>
          {{ formatPeriodDate(semesterPeriod.start) }} ～
          {{ formatPeriodDate(semesterPeriod.end) }}
        </div>
        <div class="schedule-list-section">
          <h2>授業日程リスト</h2>
          <div class="schedule-list" v-if="schedule.length > 0">
            <div
              v-for="(item, index) in schedule"
              :key="index"
              :class="['schedule-item', { holiday: item.isHoliday }]"
            >
              <span v-if="item.isHoliday">
                {{ item.dateStr }} （休講）{{ item.holidayReason }}
              </span>
              <span v-else>
                {{ item.dateStr }} 第{{ item.classNumber }}回
              </span>
            </div>
          </div>
          <div v-else class="empty-message">スケジュールを生成してください</div>
        </div>

        <div class="export-section" v-if="schedule.length > 0">
          <h3>出力</h3>
          <div class="export-buttons">
            <button @click="exportExcel" class="export-button">Excel</button>
            <button @click="exportTXT" class="export-button">TXT</button>
            <button @click="exportMarkdown" class="export-button">
              Markdown
            </button>
            <button @click="exportJSON" class="export-button">JSON</button>
          </div>
        </div>

        <CalendarView v-if="schedule.length > 0" :schedule="schedule" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import type {
  CalendarData,
  ScheduleItem,
  SemesterOption,
  CourseDays,
  ClassesPerWeek,
  DayOfWeek,
} from "./types";
import { generateSchedule as generateScheduleUtil } from "./utils/scheduleGenerator";
import {
  exportToExcel,
  exportToTXT,
  exportToMarkdown,
  exportToJSON,
} from "./utils/export";
import CalendarView from "./components/CalendarView.vue";

const dayNames = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

const calendarData = ref<CalendarData | null>(null);
const selectedSemester = ref<SemesterOption>("前期");
const selectedCourseDays = ref<CourseDays>(14);
const selectedClassesPerWeek = ref<ClassesPerWeek>(1);
const selectedDaysOfWeek = ref<DayOfWeek[]>([1]); // 月曜日
const schedule = ref<ScheduleItem[]>([]);

// 学期期間をcomputedプロパティとして定義（リアルタイム更新）
const semesterPeriod = computed(() => {
  if (!calendarData.value) return null;

  // 選択された学期のキーを取得（マッピングがある場合は使用）
  let semesterKey: string = selectedSemester.value;

  // 直接キーが存在しない場合、マッピングを確認
  if (!calendarData.value.semesters[semesterKey]) {
    // マッピングを使って変換を試みる
    const mappedKey = calendarData.value.semester_mapping?.[semesterKey];
    if (mappedKey) {
      semesterKey = mappedKey;
    }
  }

  const period = calendarData.value.semesters[semesterKey];
  if (period) {
    return {
      start: period[0],
      end: period[1],
    };
  }
  return null;
});

onMounted(async () => {
  try {
    const response = await fetch("/calendar_data.json");
    calendarData.value = await response.json();
  } catch (error) {
    console.error("Failed to load calendar data:", error);
  }
});

// updateSemesterPeriod関数は不要になったので削除

function isDaySelected(index: DayOfWeek): boolean {
  return selectedDaysOfWeek.value.includes(index);
}

function onClassesPerWeekChange() {
  // 週の授業回数が変更されたとき、選択された曜日をリセット
  if (selectedClassesPerWeek.value === 1) {
    // 週1回の場合、最初の曜日だけ残す
    if (
      selectedDaysOfWeek.value.length > 0 &&
      selectedDaysOfWeek.value[0] !== undefined
    ) {
      selectedDaysOfWeek.value = [selectedDaysOfWeek.value[0]];
    } else {
      selectedDaysOfWeek.value = [1]; // デフォルトは月曜日
    }
  }
  // 週2回の場合は、既存の選択を維持（最大2つまで）
}

function toggleDay(index: DayOfWeek) {
  if (selectedClassesPerWeek.value === 1) {
    // 週1回の場合、1つだけ選択
    selectedDaysOfWeek.value = [index];
  } else {
    // 週2回の場合、最大2つまで選択
    const currentIndex = selectedDaysOfWeek.value.indexOf(index);
    if (currentIndex >= 0) {
      // 既に選択されている場合は解除
      selectedDaysOfWeek.value.splice(currentIndex, 1);
    } else {
      // 選択されていない場合
      if (selectedDaysOfWeek.value.length < 2) {
        selectedDaysOfWeek.value.push(index);
      } else {
        // 既に2つ選択されている場合は、最初のものを置き換え
        selectedDaysOfWeek.value[0] = index;
      }
    }
  }
}

function generateSchedule() {
  console.log("generateSchedule called");
  console.log("calendarData:", calendarData.value);
  console.log("selectedSemester:", selectedSemester.value);
  console.log("selectedCourseDays:", selectedCourseDays.value);
  console.log("selectedClassesPerWeek:", selectedClassesPerWeek.value);
  console.log("selectedDaysOfWeek:", selectedDaysOfWeek.value);

  if (!calendarData.value) {
    alert("学年暦データの読み込みに失敗しました。");
    return;
  }

  if (
    selectedClassesPerWeek.value === 2 &&
    selectedDaysOfWeek.value.length !== 2
  ) {
    alert("週2回を選択した場合、2つの曜日を選択してください。");
    return;
  }

  if (selectedDaysOfWeek.value.length === 0) {
    alert("少なくとも1つの曜日を選択してください。");
    return;
  }

  const dayOfWeekParam =
    selectedClassesPerWeek.value === 1
      ? selectedDaysOfWeek.value[0]
      : selectedDaysOfWeek.value;

  if (dayOfWeekParam === undefined) {
    alert("曜日が選択されていません。");
    return;
  }

  console.log("dayOfWeekParam:", dayOfWeekParam);

  try {
    const result = generateScheduleUtil(
      calendarData.value,
      selectedSemester.value,
      selectedCourseDays.value,
      selectedClassesPerWeek.value,
      dayOfWeekParam
    );
    console.log("Generated schedule:", result);
    schedule.value = result;
  } catch (error) {
    console.error("Error generating schedule:", error);
    alert(
      "スケジュール生成中にエラーが発生しました: " + (error as Error).message
    );
  }
}

function exportExcel() {
  exportToExcel(schedule.value);
}

function exportTXT() {
  exportToTXT(schedule.value);
}

function exportMarkdown() {
  exportToMarkdown(schedule.value);
}

function exportJSON() {
  exportToJSON(schedule.value);
}

function formatPeriodDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${year}年${month}月${day}日`;
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 14px;
  color: #666;
}

.main-container {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
}

.left-panel {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: fit-content;
}

.left-panel h2 {
  font-size: 20px;
  margin-bottom: 20px;
  color: #333;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 10px;
  color: #333;
  font-size: 14px;
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.radio-group {
  display: flex;
  gap: 20px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-weight: normal;
}

.radio-label input[type="radio"] {
  cursor: pointer;
}

.day-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.day-button {
  flex: 1;
  min-width: 80px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.day-button:hover {
  background: #f0f0f0;
}

.day-button.active {
  background: #0066cc;
  color: white;
  border-color: #0066cc;
}

.generate-button {
  width: 100%;
  padding: 12px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 10px;
  transition: background 0.2s;
}

.generate-button:hover {
  background: #0052a3;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.semester-period {
  background: white;
  padding: 15px 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  color: #333;
}

.day-selection-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.schedule-list-section {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.schedule-list-section h2 {
  font-size: 20px;
  margin-bottom: 15px;
  color: #333;
}

.schedule-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
}

.schedule-item {
  padding: 10px;
  margin-bottom: 5px;
  border-radius: 4px;
  background: #e8f5e9;
  font-size: 14px;
}

.schedule-item.holiday {
  background: #ffebee;
  color: #c62828;
}

.empty-message {
  text-align: center;
  color: #999;
  padding: 40px;
}

.export-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.export-section h3 {
  font-size: 18px;
  margin-bottom: 15px;
  color: #333;
}

.export-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.export-button {
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.export-button:hover {
  background: #45a049;
}

@media (max-width: 1024px) {
  .main-container {
    grid-template-columns: 1fr;
  }

  .left-panel {
    order: 2;
  }

  .right-panel {
    order: 1;
  }
}
</style>
