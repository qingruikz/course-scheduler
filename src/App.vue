<template>
  <div class="app">
    <header class="header">
      <div class="header-right-buttons">
        <a
          class="header-link-button"
          href="https://www.musashino-u.ac.jp/student-life/campus_life/calendar.html"
          target="_blank"
          rel="noopener noreferrer"
          title="大学公式カレンダーへ"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
            ></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
        <button
          type="button"
          class="calendar-icon-button-header"
          title="学年暦を ICS でダウンロード"
          @click="openCalendarIcsModal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
      </div>
      <div class="header-content">
        <div class="header-left">
          <h1>大学授業スケジュールジェネレーター</h1>
          <span class="academic-year" v-if="selectedYear">
            {{ formatAcademicYear(selectedYear) }}
          </span>
        </div>
      </div>
    </header>

    <div class="main-container">
      <!-- 左側: 条件設定 -->
      <div class="left-panel">
        <h2>条件設定</h2>

        <div class="form-group">
          <label for="year">年度</label>
          <select
            id="year"
            v-model="selectedYear"
            class="form-control"
            @change="onYearChange"
          >
            <option v-for="year in availableYears" :key="year" :value="year">
              {{ formatAcademicYear(year) }}
            </option>
          </select>
          <p class="calendar-info" v-if="createdAt">
            学年暦更新日: {{ createdAt }}
          </p>
        </div>

        <div class="form-group">
          <label for="semester">学期</label>
          <select id="semester" v-model="selectedSemester" class="form-control">
            <option value="1学期">1学期</option>
            <option value="2学期">2学期</option>
            <option value="3学期">3学期</option>
            <option value="4学期">4学期</option>
            <option value="前期">前期</option>
            <option value="後期">後期</option>
            <option value="夏期集中授業期間">夏期集中授業期間</option>
            <option value="春季集中授業期間">春季集中授業期間</option>
          </select>
        </div>

        <div class="form-group">
          <label>授業回数</label>
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
          <label>1週間の授業回数</label>
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
              :class="[
                'day-button',
                { active: isDaySelected(index as DayOfWeek) },
              ]"
              @click="toggleDay(index as DayOfWeek)"
            >
              {{ day }}
            </button>
          </div>
          <div v-if="selectedClassesPerWeek >= 2" class="day-selection-hint">
            {{ selectedDaysOfWeek.length }} /
            {{ selectedClassesPerWeek }} 日選択中
          </div>
        </div>

        <div class="form-group" v-if="selectedDaysOfWeek.length > 0">
          <label>授業の実施方法</label>
          <div
            v-for="(dayIndex, idx) in selectedDaysOfWeek"
            :key="dayIndex"
            class="delivery-mode-group"
          >
            <label class="delivery-mode-label">
              {{ dayNames[dayIndex] }}:
            </label>
            <div class="delivery-mode-options">
              <label class="radio-label">
                <input
                  type="radio"
                  :name="`delivery-${dayIndex}`"
                  :value="'face-to-face'"
                  v-model="deliveryModes[dayIndex]"
                />
                <span>対面</span>
              </label>
              <label class="radio-label">
                <input
                  type="radio"
                  :name="`delivery-${dayIndex}`"
                  :value="'online'"
                  v-model="deliveryModes[dayIndex]"
                />
                <span>オンライン</span>
              </label>
            </div>
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

        <div class="right-content-grid">
          <div class="schedule-list-section">
            <div class="schedule-header">
              <h2>授業日程リスト</h2>
              <div class="schedule-actions" v-if="schedule.length > 0">
                <button
                  class="icon-button ics-button"
                  @click="openIcsExportModal"
                  title="カレンダー（ICS）に出力"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"
                    ></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </button>
                <button
                  class="icon-button copy-button"
                  @click="copyToClipboard"
                  title="クリップボードにコピー"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path
                      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                    ></path>
                  </svg>
                </button>
                <div class="dropdown">
                  <button
                    class="icon-button export-button"
                    @click="showExportMenu = !showExportMenu"
                    title="出力"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                      ></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </button>
                  <div v-if="showExportMenu" class="dropdown-menu">
                    <button
                      @click="handleExport('excel')"
                      class="dropdown-item"
                    >
                      Excel
                    </button>
                    <button @click="handleExport('txt')" class="dropdown-item">
                      TXT
                    </button>
                    <button
                      @click="handleExport('markdown')"
                      class="dropdown-item"
                    >
                      Markdown
                    </button>
                    <button @click="handleExport('json')" class="dropdown-item">
                      JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="schedule-list" v-if="schedule.length > 0">
              <div
                v-for="(item, index) in schedule"
                :key="index"
                :class="['schedule-item', { holiday: item.isHoliday }]"
              >
                <span v-if="item.isHoliday">
                  {{ item.dateStr }} （休講）{{ item.holidayReason }}
                </span>
                <span v-else class="schedule-item-content">
                  <span class="schedule-date"
                    >{{ item.dateStr }} 第{{ item.classNumber }}回</span
                  >
                  <span
                    :class="[
                      'delivery-icon-wrapper',
                      item.deliveryMode === 'online'
                        ? 'delivery-online'
                        : 'delivery-face-to-face',
                    ]"
                    @mouseenter="showDeliveryPopover($event, item.deliveryMode)"
                    @mouseleave="hideDeliveryPopover"
                  >
                    <svg
                      v-if="item.deliveryMode === 'online'"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="delivery-icon"
                    >
                      <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                      <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                      <line x1="12" y1="20" x2="12.01" y2="20"></line>
                    </svg>
                    <svg
                      v-else
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="delivery-icon"
                    >
                      <path
                        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                      ></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </span>
                </span>
              </div>
            </div>
            <div v-else class="empty-message">
              スケジュールを生成してください
            </div>
          </div>

          <div class="calendar-section">
            <CalendarView
              v-if="schedule.length > 0"
              :schedule="schedule"
              :yearData="currentYearData"
              :year="selectedYear"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- グローバルポップオーバー -->
    <div
      v-if="deliveryPopover.visible"
      class="delivery-popover-global"
      :style="{
        left: deliveryPopover.x + 'px',
        top: deliveryPopover.y + 'px',
      }"
    >
      {{ deliveryPopover.text }}
    </div>
    <!-- ICS 出力モーダル -->
    <IcsExportModal
      :visible="showIcsExportModal"
      :schedule="schedule"
      :semester="selectedSemester"
      :selected-days-of-week="selectedDaysOfWeek"
      :delivery-modes="deliveryModes"
      @close="closeIcsExportModal"
      @submit="onIcsExportSubmit"
    />
    <!-- 学年暦 ICS ダウンロードモーダル（ダウンロード後も閉じない） -->
    <CalendarIcsExportModal
      :visible="showCalendarIcsModal"
      :events="calendarEventsForYear"
      @close="closeCalendarIcsModal"
      @download="onCalendarIcsDownload"
    />
    <!-- 統一メッセージ通知（Teleport で body 直下に表示） -->
    <MessageNotification
      :visible="notification.visible"
      :message="notification.message"
      :type="notification.type"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, onUnmounted } from "vue";
import type {
  CalendarData,
  YearData,
  ScheduleItem,
  SemesterOption,
  CourseDays,
  ClassesPerWeek,
  DayOfWeek,
  DeliveryMode,
} from "./types";
import {
  generateSchedule as generateScheduleUtil,
  ScheduleGenerationError,
} from "./utils/scheduleGenerator";
import {
  exportToExcel,
  exportToTXT,
  exportToMarkdown,
  exportToJSON,
  exportToICS,
  exportCalendarEventsToIcs,
} from "./utils/export";
import CalendarView from "./components/CalendarView.vue";
import IcsExportModal from "./components/IcsExportModal.vue";
import CalendarIcsExportModal from "./components/CalendarIcsExportModal.vue";
import MessageNotification from "./components/MessageNotification.vue";
import type { IcsExportOptions, CalendarEventsIcsOptions } from "./types";
import { formatAcademicYear } from "./utils/japaneseEra";
import { convertYamlToCalendarData } from "./utils/yamlConverter";

const dayNames = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

const selectedYear = ref<number>(0); // 初期値は0、データ読み込み後に最新年度に設定される
const calendarData = ref<CalendarData | null>(null);
const currentYearData = ref<YearData | null>(null);
const availableYears = ref<number[]>([]);
const createdAt = ref<string>("");
const showIcsExportModal = ref(false);
const showCalendarIcsModal = ref(false);

type NotificationType = "success" | "info" | "warning" | "error";
const notification = ref<{
  visible: boolean;
  message: string;
  type: NotificationType;
}>({ visible: false, message: "", type: "success" });
let notificationTimer: ReturnType<typeof setTimeout> | null = null;

function showNotification(
  message: string,
  type: NotificationType = "success",
  durationMs: number = 3000,
) {
  if (notificationTimer) clearTimeout(notificationTimer);
  notification.value = { visible: true, message, type };
  notificationTimer = setTimeout(() => {
    notification.value.visible = false;
    notificationTimer = null;
  }, durationMs);
}
const selectedSemester = ref<SemesterOption>("1学期");
const selectedCourseDays = ref<CourseDays>(14);
const selectedClassesPerWeek = ref<ClassesPerWeek>(1);
const selectedDaysOfWeek = ref<DayOfWeek[]>([1]); // 月曜日
const deliveryModes = ref<Record<DayOfWeek, DeliveryMode>>({
  0: "face-to-face",
  1: "face-to-face",
  2: "face-to-face",
  3: "face-to-face",
  4: "face-to-face",
  5: "face-to-face",
  6: "face-to-face",
});
const schedule = ref<ScheduleItem[]>([]);
const showExportMenu = ref(false);
const deliveryPopover = ref<{
  visible: boolean;
  text: string;
  x: number;
  y: number;
}>({
  visible: false,
  text: "",
  x: 0,
  y: 0,
});

// 学期期間をcomputedプロパティとして定義（リアルタイム更新）
const semesterPeriod = computed(() => {
  if (!currentYearData.value) return null;

  // 選択された学期のキーを直接使用
  const semesterKey: string = selectedSemester.value;
  const period = currentYearData.value.semesters[semesterKey];

  if (period) {
    return {
      start: period[0],
      end: period[1],
    };
  }
  return null;
});

const calendarEventsForYear = computed(() => {
  const data = currentYearData.value;
  return data?.events ?? [];
});

async function loadCalendarData() {
  try {
    // data フォルダ内のすべての calendar_*.yaml ファイルを自動的にインポート
    // import.meta.glob は Vite の機能で、パターンに一致するすべてのファイルを動的にインポート
    const calendarModules = import.meta.glob<{ default: any }>(
      "./data/calendar_*.yaml",
      { eager: true },
    );

    // すべての YAML データを配列として取得（ファイル名から年度を抽出する必要はない）
    const yamlDataArray = Object.values(calendarModules).map(
      (module) => module.default,
    );

    // YAML データを CalendarData 形式に変換（年度は YAML データ内の year フィールドから読み込まれる）
    calendarData.value = convertYamlToCalendarData(yamlDataArray);

    if (calendarData.value) {
      // 利用可能な年度を計算
      availableYears.value = Object.keys(calendarData.value.years)
        .map((y) => parseInt(y))
        .sort((a, b) => a - b);

      // 作成日を取得
      createdAt.value = calendarData.value.created_at || "";

      // 最新年度（最大値）をデフォルトとして設定
      if (availableYears.value.length > 0) {
        const latestYear = Math.max(...availableYears.value);
        selectedYear.value = latestYear;
        // デフォルト年度のデータを設定
        updateCurrentYearData(selectedYear.value);
      } else {
        console.warn("利用可能な年度データがありません。");
      }
    } else {
      console.error("Calendar data is null");
    }
  } catch (error) {
    console.error("Failed to load calendar data:", error);
    calendarData.value = null;
  }
}

function updateCurrentYearData(year: number) {
  if (calendarData.value && calendarData.value.years[year.toString()]) {
    const yearData = calendarData.value.years[year.toString()];
    currentYearData.value = yearData ?? null;
  } else {
    currentYearData.value = null;
  }
}

function onYearChange() {
  updateCurrentYearData(selectedYear.value);
  // 年度が変わったらスケジュールをクリア
  schedule.value = [];
}

function closeIcsExportModal() {
  showIcsExportModal.value = false;
}

function onIcsExportSubmit(options: IcsExportOptions) {
  exportToICS(schedule.value, options, selectedSemester.value);
}

function openCalendarIcsModal() {
  showCalendarIcsModal.value = true;
}

function closeCalendarIcsModal() {
  showCalendarIcsModal.value = false;
}

function onCalendarIcsDownload(options: CalendarEventsIcsOptions) {
  const events = calendarEventsForYear.value;
  if (events.length === 0) return;
  exportCalendarEventsToIcs(events, options, selectedYear.value);
  // ダウンロード後もモーダルは閉じない
}

onMounted(async () => {
  // 統合されたcalendar_data.jsonを読み込む
  await loadCalendarData();

  // ドロップダウンメニューの外部クリックを検出
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest(".dropdown")) {
    showExportMenu.value = false;
  }
}

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
  if (!currentYearData.value) {
    showNotification("学年暦データの読み込みに失敗しました。", "error");
    return;
  }

  if (
    selectedClassesPerWeek.value === 2 &&
    selectedDaysOfWeek.value.length !== 2
  ) {
    showNotification(
      "週2回を選択した場合、2つの曜日を選択してください。",
      "error",
    );
    return;
  }

  if (selectedDaysOfWeek.value.length === 0) {
    showNotification("少なくとも1つの曜日を選択してください。", "warning");
    return;
  }

  // 週1回の場合は配列の最初の要素だけを含む配列を作成、週2回の場合はそのまま使用
  const dayOfWeekParam: DayOfWeek[] =
    selectedClassesPerWeek.value === 1
      ? selectedDaysOfWeek.value.length > 0 &&
        selectedDaysOfWeek.value[0] !== undefined
        ? [selectedDaysOfWeek.value[0]]
        : []
      : selectedDaysOfWeek.value;

  if (dayOfWeekParam.length === 0) {
    showNotification("曜日が選択されていません。", "warning");
    return;
  }

  try {
    if (!currentYearData.value) {
      showNotification("年度データが読み込まれていません。", "error");
      return;
    }

    const result = generateScheduleUtil(
      currentYearData.value,
      selectedSemester.value,
      selectedCourseDays.value,
      dayOfWeekParam,
      deliveryModes.value,
    );
    schedule.value = result;
  } catch (error) {
    if (error instanceof ScheduleGenerationError) {
      showNotification((error as Error).message, "error", 4000);
      return;
    }
    console.error("Error generating schedule:", error);
    showNotification(
      "スケジュール生成中にエラーが発生しました: " + (error as Error).message,
      "error",
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

function handleExport(type: string) {
  switch (type) {
    case "excel":
      exportExcel();
      break;
    case "txt":
      exportTXT();
      break;
    case "markdown":
      exportMarkdown();
      break;
    case "json":
      exportJSON();
      break;
  }
  showExportMenu.value = false;
}

function openIcsExportModal() {
  showIcsExportModal.value = true;
}

function copyToClipboard() {
  if (schedule.value.length === 0) return;

  const lines = schedule.value.map((item) => {
    if (item.isHoliday) {
      return `${item.dateStr} （休講）${item.holidayReason}`;
    } else {
      const deliveryModeText =
        item.deliveryMode === "online" ? "オンライン" : "対面";
      return `${item.dateStr} 第${item.classNumber}回 ${deliveryModeText}`;
    }
  });

  const content = lines.join("\n");
  navigator.clipboard
    .writeText(content)
    .then(() => {
      showNotification("クリップボードにコピーしました！", "success", 2000);
    })
    .catch((err) => {
      console.error("コピーに失敗しました:", err);
      showNotification("クリップボードへのコピーに失敗しました。", "error");
    });
}

function formatPeriodDate(dateStr: string | unknown): string {
  // 型安全性のため、文字列に変換してから処理
  const str = typeof dateStr === "string" ? dateStr : String(dateStr);
  const [year, month, day] = str.split("-");
  return `${year}年${month}月${day}日`;
}

function showDeliveryPopover(
  event: MouseEvent,
  deliveryMode: DeliveryMode | undefined,
) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  deliveryPopover.value = {
    visible: true,
    text: deliveryMode === "online" ? "オンライン" : "対面",
    x: rect.left + rect.width / 2,
    y: rect.top - 5,
  };
}

function hideDeliveryPopover() {
  deliveryPopover.value.visible = false;
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.header {
  position: relative;
  width: 100%;
  text-align: center;
  margin-bottom: 30px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.header h1 {
  font-size: 28px;
  color: #333;
  margin: 0;
}

.academic-year {
  font-size: 20px;
  color: #0066cc;
  font-weight: bold;
  background-color: #e3f2fd;
  padding: 6px 12px;
  border-radius: 6px;
  border: 2px solid #0066cc;
  display: inline-block;
  margin-left: 15px;
}

.header-left {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.header-right-buttons {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 10;
}

.header-link-button,
.calendar-icon-button-header {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0066cc;
  border-radius: 4px;
  transition: background-color 0.2s;
  text-decoration: none;
}

.header-link-button:hover,
.calendar-icon-button-header:hover {
  background-color: #f0f0f0;
}

.calendar-info {
  font-size: 11px;
  color: #888;
  margin: 6px 0 0 0;
  font-style: italic;
}

.main-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 20px;
}

.left-panel {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: fit-content;
}

.left-panel h2 {
  font-size: 18px;
  margin-bottom: 15px;
  color: #333;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
  font-size: 13px;
}

.form-control {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
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
  min-width: 60px;
  padding: 8px 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
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
  padding: 10px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 8px;
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

.delivery-mode-group {
  margin-bottom: 10px;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 4px;
}

.delivery-mode-label {
  display: block;
  font-weight: bold;
  margin-bottom: 6px;
  color: #333;
  font-size: 12px;
}

.delivery-mode-options {
  display: flex;
  gap: 15px;
}

.right-content-grid {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 20px;
}

.schedule-list-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.schedule-header h2 {
  font-size: 18px;
  color: #333;
  margin: 0;
}

.schedule-actions {
  position: relative;
  display: flex;
  gap: 8px;
  align-items: center;
}

.dropdown {
  position: relative;
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  width: 28px;
  height: 28px;
}

.icon-button:hover {
  background: #45a049;
}

.ics-button {
  background: #ff9800;
}

.ics-button:hover {
  background: #f57c00;
}

.copy-button {
  background: #2196f3;
}

.copy-button:hover {
  background: #1976d2;
}

.export-button {
  background: #4caf50;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 5px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 120px;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 16px;
  text-align: left;
  background: white;
  border: none;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  transition: background 0.2s;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.schedule-list {
  flex: 1;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
}

.schedule-item {
  padding: 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  background: #e3f2fd;
  font-size: 13px;
}

.schedule-item.holiday {
  background: #ffebee;
  color: #c62828;
}

.schedule-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.schedule-date {
  flex: 1;
}

.delivery-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.delivery-icon {
  color: currentColor;
}

.delivery-online {
  color: #000000;
}

.delivery-face-to-face {
  color: #000000;
}

.delivery-popover-global {
  position: fixed;
  padding: 6px 10px;
  background-color: #333;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 10000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateX(-50%) translateY(-100%);
  pointer-events: none;
}

.delivery-popover-global::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #333;
}

.empty-message {
  text-align: center;
  color: #999;
  padding: 40px;
}

.calendar-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  max-height: calc(100vh - 200px);
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
