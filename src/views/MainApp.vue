<template>
  <div class="app">
    <AppHeader
      :selected-year="storeSelectedYear ?? null"
      @add-calendar="onAdminMenuAddCalendar"
      @official-calendar="onAdminMenuOfficialCalendar"
      @calendar-mapper="onAdminMenuCalendarMapper"
    />

    <div class="main-container">
      <ConditionsPanel
        :available-years="availableYears"
        :year-data="currentYearData"
        :created-at="createdAt"
        :updated-at="updatedAt"
        @generate="generateSchedule"
        @export-settings="onConditionsExportSettings"
        @import-settings="onConditionsImportSettings"
        @confirm-remove-subject="confirmRemoveSubject"
        @year-change="onYearChangeFromConditions"
      />

      <div class="right-panel">
        <div class="right-content-grid">
          <ScheduleListSection
            :schedule="schedule"
            @open-ics-export="openIcsExportModal"
            @export="handleExport"
            @show-delivery-popover="showDeliveryPopover"
            @hide-delivery-popover="hideDeliveryPopover"
          />

          <div class="calendar-section">
            <div v-if="schedule.length > 0" class="calendar-mode-switch">
              <div class="calendar-switch-item">
                <span class="switch-label">学年暦背景</span>
                <label class="toggle-switch">
                  <input
                    v-model="useOfficialCalendarBackground"
                    type="checkbox"
                    class="toggle-switch-input"
                  />
                  <span class="toggle-switch-slider"></span>
                </label>
              </div>
              <div class="calendar-switch-item">
                <span class="switch-label">2列表示</span>
                <label class="toggle-switch">
                  <input
                    v-model="calendarTwoColumns"
                    type="checkbox"
                    class="toggle-switch-input"
                  />
                  <span class="toggle-switch-slider"></span>
                </label>
              </div>
              <div class="calendar-switch-item">
                <span class="switch-label">授業日・休日マーク</span>
                <label class="toggle-switch">
                  <input
                    v-model="showCalendarMarkers"
                    type="checkbox"
                    class="toggle-switch-input"
                  />
                  <span class="toggle-switch-slider"></span>
                </label>
              </div>
            </div>
            <CalendarView
              v-if="schedule.length > 0 && !useOfficialCalendarBackground"
              :schedule="schedule"
              :yearData="currentYearData"
              :year="storeSelectedYear ?? 0"
              :two-columns="calendarTwoColumns"
              :show-markers="showCalendarMarkers"
            />
            <OfficialCalendarView
              v-else-if="
                schedule.length > 0 &&
                useOfficialCalendarBackground &&
                calendarLayout
              "
              :schedule="schedule"
              :layout="calendarLayout"
              :semester-start="semesterPeriod?.start"
              :semester-end="semesterPeriod?.end"
              :two-columns="calendarTwoColumns"
              :show-markers="showCalendarMarkers"
            />
            <div
              v-else-if="
                schedule.length > 0 &&
                useOfficialCalendarBackground &&
                !calendarLayout
              "
              class="official-layout-missing"
            >
              <p>
                この年度（{{
                  storeSelectedYear
                }}）の公式カレンダー配置がありません。
              </p>
              <p class="hint">
                年度を 2026 に合わせるか、<code
                  >src/data/calendar_layout_<wbr />{{
                    storeSelectedYear
                  }}.json</code
                >
                または
                <code
                  >public/data/calendar_layout_<wbr />{{
                    storeSelectedYear
                  }}.json</code
                >
                を配置してください。画像は <code>public/</code> に置きます。
              </p>
            </div>
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
    <!-- 統一カレンダー追加モーダル -->
    <CalendarAddModal
      :visible="showCalendarAddModal"
      :source="calendarAddModalSource"
      :year="storeSelectedYear ?? 0"
      :schedule="schedule"
      :semester="selectedSemester"
      :course-days="selectedCourseDays"
      :classes-per-week="selectedClassesPerWeek"
      :class-slots="classSlots"
      :initial-subject-name="currentSubject"
      :initial-ics-options="
        settingsStore.currentSubjectSettings.icsExportOptions
      "
      :events="calendarEventsForYear"
      :initial-calendar-ics-options="settingsStore.calendarIcsOptions"
      :initial-step="calendarAddModalInitialStep"
      :initial-calendar-target="calendarAddModalTarget"
      :initial-payload="calendarAddModalPayload"
      @close="closeCalendarAddModal"
      @download-ics="onCalendarAddDownloadIcs"
    />
    <!-- 科目削除確認 -->
    <ConfirmModal
      :visible="showRemoveSubjectConfirm"
      message="この科目を削除しますか？"
      confirm-text="削除"
      cancel-text="キャンセル"
      @confirm="onConfirmRemoveSubject"
      @cancel="onCancelRemoveSubject"
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
import { ref, onMounted, watch, computed } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "../stores/settingsStore";
import type {
  CalendarData,
  YearData,
  ScheduleItem,
  SemesterOption,
  CourseDays,
  ClassesPerWeek,
  DayOfWeek,
  DeliveryMode,
  ClassSlot,
} from "../types";
import {
  generateSchedule as generateScheduleUtil,
  ScheduleGenerationError,
} from "../utils/scheduleGenerator";
import {
  exportToExcel,
  exportToTXT,
  exportToMarkdown,
  exportToJSON,
} from "../utils/export";
import AppHeader from "../components/AppHeader.vue";
import ConditionsPanel from "../components/ConditionsPanel.vue";
import ScheduleListSection from "../components/ScheduleListSection.vue";
import CalendarView from "../components/CalendarView.vue";
import OfficialCalendarView from "../components/OfficialCalendarView.vue";
import CalendarAddModal from "../components/CalendarAddModal.vue";
import ConfirmModal from "../components/ConfirmModal.vue";
import MessageNotification from "../components/MessageNotification.vue";
import { useRoute, useRouter } from "vue-router";
import { decodePayload } from "../utils/icsPayload";
import { downloadIcsFromPayload } from "../utils/icsDownload";
import type { IcsExportOptions, CalendarEventsIcsOptions } from "../types";
import { convertYamlToCalendarData } from "../utils/yamlConverter";
import { loadCalendarLayout } from "../utils/calendarLayoutLoader";
import type { CalendarLayout } from "../types";

const route = useRoute();
const router = useRouter();
const settingsStore = useSettingsStore();
const {
  subjectList,
  currentSubject,
  selectedYear: storeSelectedYear,
} = storeToRefs(settingsStore);

const calendarData = ref<CalendarData | null>(null);
const currentYearData = ref<YearData | null>(null);
const availableYears = ref<number[]>([]);
const createdAt = ref<string>("");
const updatedAt = ref<string>("");
const showCalendarAddModal = ref(false);
const calendarAddModalSource = ref<"schedule" | "calendar">("schedule");
const calendarAddModalInitialStep = ref(0);
const calendarAddModalTarget = ref<"apple" | "google" | "outlook" | "other">(
  "apple",
);
const calendarAddModalPayload = ref<
  import("../utils/icsPayload").IcsPayload | null
>(null);
const CALENDAR_MODE_KEY = "course-scheduler:useOfficialCalendarBackground";
const useOfficialCalendarBackground = ref(
  localStorage.getItem(CALENDAR_MODE_KEY) !== "false",
);
const CALENDAR_TWO_COLUMNS_KEY = "course-scheduler:calendarTwoColumns";
const calendarTwoColumns = ref(
  localStorage.getItem(CALENDAR_TWO_COLUMNS_KEY) !== "false",
);
const CALENDAR_MARKERS_KEY = "course-scheduler:showCalendarMarkers";
const showCalendarMarkers = ref(
  localStorage.getItem(CALENDAR_MARKERS_KEY) !== "false",
);
const calendarLayout = ref<CalendarLayout | null>(null);
const calendarTestImageUrl =
  (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/") + "calendar_2026.png";
watch(
  useOfficialCalendarBackground,
  (v) => localStorage.setItem(CALENDAR_MODE_KEY, String(v)),
  { immediate: true },
);
watch(
  calendarTwoColumns,
  (v) => localStorage.setItem(CALENDAR_TWO_COLUMNS_KEY, String(v)),
  { immediate: true },
);
watch(
  showCalendarMarkers,
  (v) => localStorage.setItem(CALENDAR_MARKERS_KEY, String(v)),
  { immediate: true },
);

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

const selectedSemester = computed(
  () => settingsStore.currentSubjectSettings.semester,
);
const selectedCourseDays = computed(
  () => settingsStore.currentSubjectSettings.courseDays,
);
const selectedClassesPerWeek = computed(
  () => settingsStore.currentSubjectSettings.classesPerWeek,
);
const classSlots = computed(
  () => settingsStore.currentSubjectSettings.classSlots,
);
const schedule = ref<ScheduleItem[]>([]);
const OFFICIAL_CALENDAR_URL =
  "https://www.musashino-u.ac.jp/student-life/campus_life/calendar.html";
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
      "../data/calendar_*.yaml",
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

      // 作成日・更新日を取得
      createdAt.value = calendarData.value.createdAt || "";
      updatedAt.value = calendarData.value.updatedAt || "";

      // 最新年度（最大値）をデフォルトとして設定
      if (availableYears.value.length > 0) {
        const latestYear = Math.max(...availableYears.value);
        settingsStore.selectedYear = latestYear;
        // デフォルト年度のデータを設定
        updateCurrentYearData(latestYear);
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
  const year = storeSelectedYear.value;
  if (year != null) updateCurrentYearData(year);
  // 年度が変わったらスケジュールをクリア
  schedule.value = [];
  loadCalendarLayoutForYear(year ?? 0);
}

async function loadCalendarLayoutForYear(year: number) {
  calendarLayout.value = null;
  if (!year) return;
  const layout = await loadCalendarLayout(year);
  if (storeSelectedYear.value === year) calendarLayout.value = layout;
}

const showRemoveSubjectConfirm = ref(false);
const subjectToRemove = ref<string | null>(null);

function confirmRemoveSubject(name: string) {
  subjectToRemove.value = name;
  showRemoveSubjectConfirm.value = true;
}

function onConfirmRemoveSubject() {
  const name = subjectToRemove.value;
  if (name == null) return;
  const wasCurrent = settingsStore.currentSubject === name;
  settingsStore.removeSubject(name);
  if (wasCurrent) schedule.value = [];
  showRemoveSubjectConfirm.value = false;
  subjectToRemove.value = null;
}

function onCancelRemoveSubject() {
  showRemoveSubjectConfirm.value = false;
  subjectToRemove.value = null;
}

function closeCalendarAddModal() {
  showCalendarAddModal.value = false;
  calendarAddModalPayload.value = null;
}

function openIcsExportModal() {
  calendarAddModalSource.value = "schedule";
  calendarAddModalInitialStep.value = 0;
  calendarAddModalTarget.value = "apple";
  calendarAddModalPayload.value = null;
  showCalendarAddModal.value = true;
}

function openCalendarIcsModal() {
  calendarAddModalSource.value = "calendar";
  calendarAddModalInitialStep.value = 0;
  calendarAddModalTarget.value = "apple";
  calendarAddModalPayload.value = null;
  showCalendarAddModal.value = true;
}

function onAdminMenuCalendarMapper() {
  router.push("/admin/calendar-mapper");
}
function onAdminMenuOfficialCalendar() {
  window.open(OFFICIAL_CALENDAR_URL, "_blank", "noopener,noreferrer");
}
function onAdminMenuAddCalendar() {
  openCalendarIcsModal();
}

function onConditionsExportSettings(result: { success: boolean }) {
  if (result.success) {
    showNotification("設定をエクスポートしました。", "success");
  } else {
    showNotification("保存前に科目名を入力してください。", "error");
  }
}

function onConditionsImportSettings(jsonText: string) {
  const result = settingsStore.importFromJson(jsonText);
  if (result.success) {
    showNotification("設定を復元しました。", "success");
    const year = settingsStore.selectedYear;
    if (year != null && availableYears.value.includes(year)) {
      updateCurrentYearData(year);
    }
  } else {
    showNotification(result.error ?? "復元に失敗しました。", "error");
  }
}

function onYearChangeFromConditions(year: number | null) {
  if (year != null) updateCurrentYearData(year);
  schedule.value = [];
  loadCalendarLayoutForYear(year ?? 0);
}

function onCalendarAddDownloadIcs(
  payload: import("../utils/icsPayload").IcsPayload,
) {
  if (payload.type === "schedule") {
    settingsStore.patchCurrentSubjectSettings({
      icsExportOptions: payload.icsExportOptions,
    });
  } else {
    settingsStore.setCalendarIcsOptions(payload.calendarIcsOptions);
  }
  downloadIcsFromPayload(payload, calendarData.value);
}

function checkCalendarModalUrlParams() {
  const action = route.query.action as string | undefined;
  const target = route.query.target as string | undefined;
  const q = route.query.q as string | undefined;
  if (action === "calendar_modal" && q) {
    const decoded = decodePayload(q);
    if (decoded) {
      const validTarget =
        target === "apple" ||
        target === "google" ||
        target === "outlook" ||
        target === "other"
          ? target
          : "apple";
      calendarAddModalSource.value =
        decoded.type === "schedule" ? "schedule" : "calendar";
      calendarAddModalInitialStep.value = 2;
      calendarAddModalTarget.value = validTarget;
      calendarAddModalPayload.value = decoded;
      showCalendarAddModal.value = true;
      const {
        action: _a,
        target: _t,
        q: _q,
        ...rest
      } = route.query as Record<string, string>;
      router.replace({ path: route.path, query: rest });
    }
  }
}

watch(
  () => route.query,
  () => {
    checkCalendarModalUrlParams();
  },
  { immediate: false },
);

onMounted(async () => {
  // 統合されたcalendar_data.jsonを読み込む
  await loadCalendarData();
  await loadCalendarLayoutForYear(storeSelectedYear.value ?? 0);

  checkCalendarModalUrlParams();
});

function isRealtime(slot: ClassSlot): boolean {
  return slot.deliveryType === "face-to-face" || slot.deliveryType === "online";
}

function validateRtSlotUniqueness(): boolean {
  const rtSlots = classSlots.value.filter(isRealtime);
  const seen = new Set<string>();
  for (const s of rtSlots) {
    const key = `${s.dayOfWeek}-${s.period ?? 1}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function generateSchedule() {
  if (!currentYearData.value) {
    showNotification("学年暦データの読み込みに失敗しました。", "error");
    return;
  }

  if (!validateRtSlotUniqueness()) {
    showNotification("リアルタイム授業の曜日・時限が重複しています。", "error");
    return;
  }

  const slots = classSlots.value;
  if (slots.length === 0) {
    showNotification("スロットが設定されていません。", "warning");
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
      slots,
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
    case "copy":
      copyToClipboard();
      break;
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
}

function scheduleItemTitle(item: ScheduleItem): string {
  if (item.isHoliday) {
    return `${item.dateStr} （休講）${item.holidayReason}`;
  }
  const deliveryModeText =
    item.deliveryMode === "online"
      ? "オンライン（同時双方向型）"
      : item.deliveryMode === "on-demand"
        ? "オンライン（オンデマンド）"
        : "対面";
  return `${item.dateStr} 第${item.classNumber}回 ${deliveryModeText}`;
}

function copyToClipboard() {
  if (schedule.value.length === 0) return;

  const lines = schedule.value.map((item) => scheduleItemTitle(item));

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

function showDeliveryPopover(
  event: MouseEvent,
  deliveryMode: DeliveryMode | undefined,
) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const text =
    deliveryMode === "online"
      ? "オンライン（同時双方向型）"
      : deliveryMode === "on-demand"
        ? "オンライン（オンデマンド）"
        : "対面";
  deliveryPopover.value = {
    visible: true,
    text,
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
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f5f5f5;
  padding: 8px;
  box-sizing: border-box;
}

.header {
  position: relative;
  width: 100%;
  text-align: center;
  margin-bottom: 25px;
  flex-shrink: 0;
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

.admin-icon-button-header {
  color: #555;
}
.admin-icon-button-header:hover {
  color: #333;
  background-color: #e8e8e8;
}

.calendar-info {
  font-size: 11px;
  color: #888;
  margin: 6px 0 0 0;
  font-style: italic;
}

.subject-error {
  font-size: 12px;
  color: #c62828;
  margin: 6px 0 0 0;
}

.main-container {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  align-content: stretch;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.right-content-grid {
  display: grid;
  grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 20px;
  min-width: 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
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

.calendar-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  min-height: 0;
}

.calendar-mode-switch {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px 24px;
  margin-bottom: 12px;
  font-size: 13px;
}
.calendar-switch-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.switch-label {
  color: #666;
}
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}
.toggle-switch-input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #ccc;
  border-radius: 22px;
  transition: background-color 0.2s;
}
.toggle-switch-slider::before {
  content: "";
  position: absolute;
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.toggle-switch-input:checked + .toggle-switch-slider {
  background-color: #0066cc;
}
.toggle-switch-input:checked + .toggle-switch-slider::before {
  transform: translateX(18px);
}
.toggle-switch-input:focus-visible + .toggle-switch-slider {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

.official-layout-missing {
  padding: 16px;
  background: #fff8e6;
  border: 1px solid #e0c000;
  border-radius: 8px;
  margin-top: 8px;
  font-size: 13px;
}
.official-layout-missing p {
  margin: 0 0 8px;
}
.official-layout-missing p:last-child {
  margin-bottom: 0;
}
.official-layout-missing .hint {
  color: #666;
  font-size: 12px;
}
.official-layout-missing code {
  background: #eee;
  padding: 2px 6px;
  border-radius: 4px;
}

@media (max-width: 1024px) {
  .app {
    overflow-y: auto;
  }

  .main-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    overflow: visible;
    flex: 0 0 auto;
    min-height: min-content;
  }

  .left-panel {
    order: 1;
    min-height: 0;
  }

  .right-panel {
    order: 2;
    min-height: 0;
    height: auto;
  }

  .right-content-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(280px, auto);
    overflow: visible;
    flex: none;
  }

  .schedule-list-section {
    min-height: 0;
  }

  .calendar-section {
    min-height: 280px;
  }
}
</style>
