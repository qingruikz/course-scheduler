<template>
  <div class="left-panel">
    <div class="conditions-header">
      <h2>条件設定</h2>
      <div class="settings-export-actions">
        <div class="dropdown">
          <button
            type="button"
            class="icon-button settings-icon-button"
            title="設定のインポート・エクスポート"
            @click="showSettingsMenu = !showSettingsMenu"
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
              <circle cx="12" cy="12" r="3"></circle>
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              ></path>
            </svg>
          </button>
          <div v-if="showSettingsMenu" class="dropdown-menu dropdown-menu-settings">
            <button type="button" class="dropdown-item" @click="onSettingsMenuExport">
              設定をエクスポート
            </button>
            <button type="button" class="dropdown-item" @click="triggerImport">
              設定をインポート
            </button>
          </div>
        </div>
        <input
          ref="importFileInputRef"
          type="file"
          accept=".json"
          class="hidden-file-input"
          @change="onImportFileChange"
        />
      </div>
    </div>

    <div class="conditions-body">
      <div class="form-group" v-if="availableYears.length">
        <label for="year">年度</label>
        <select
          id="year"
          :value="storeSelectedYear"
          class="form-control"
          @change="
            onYearChange(
              Number(($event.target as HTMLSelectElement).value) || null,
            )
          "
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
        <label for="subject" class="label-with-hint">
          科目
          <span
            class="hint-icon"
            title="科目は任意です。入力すると、現在の複数の科目に対応するそれぞれの設定を1つの設定ファイルとして保存でき、次回インポートして利用できます。"
            aria-label="ヒント"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
        </label>
        <div class="subject-row">
          <div class="subject-input-wrap">
            <input
              id="subject"
              ref="subjectInputRef"
              v-model="subjectInputValue"
              type="text"
              class="form-control subject-input"
              :class="{ 'subject-input-error': subjectExportError }"
              placeholder="空"
              autocomplete="off"
              @focus="onSubjectInputFocus"
              @blur="onSubjectInputBlur($event)"
              @keydown.enter="onSubjectBlur"
            />
            <ul
              v-show="showSubjectDropdown"
              class="subject-dropdown"
              role="listbox"
            >
              <li
                role="option"
                class="subject-dropdown-item"
                :class="{ active: !currentSubject }"
                @mousedown.prevent="selectSubject('')"
              >
                空
              </li>
              <li
                v-for="s in subjectList"
                :key="s"
                role="option"
                class="subject-dropdown-item"
                :class="{ active: currentSubject === s }"
                @mousedown.prevent="selectSubject(s)"
              >
                <span
                  class="subject-dropdown-delete"
                  title="科目を削除"
                  @mousedown.prevent.stop="emit('confirm-remove-subject', s)"
                >
                  ×
                </span>
                <span class="subject-dropdown-label">{{ s }}</span>
              </li>
            </ul>
          </div>
        </div>
        <p v-if="subjectExportError" class="subject-error">
          科目名を入力してください。
        </p>
      </div>

      <div class="form-group">
        <label for="semester">学期</label>
        <select
          id="semester"
          :value="selectedSemester"
          class="form-control"
          @change="
            settingsStore.patchCurrentSubjectSettings({
              semester: ($event.target as HTMLSelectElement).value as SemesterOption,
            })
          "
        >
          <option value="1学期">1学期</option>
          <option value="2学期">2学期</option>
          <option value="3学期">3学期</option>
          <option value="4学期">4学期</option>
          <option value="前期">前期</option>
          <option value="後期">後期</option>
          <option value="夏期集中授業期間">夏期集中授業期間</option>
          <option value="春季集中授業期間">春季集中授業期間</option>
        </select>
        <p class="calendar-info" v-if="semesterPeriod">
          期間: {{ formatPeriodDateShort(semesterPeriod.start) }} ～
          {{ formatPeriodDateShort(semesterPeriod.end) }}
        </p>
      </div>

      <div class="form-group">
        <label>授業回数</label>
        <div class="radio-group">
          <label class="radio-label">
            <input
              type="radio"
              :checked="selectedCourseDays === 7"
              @change="settingsStore.patchCurrentSubjectSettings({ courseDays: 7 })"
            />
            <span>7回</span>
          </label>
          <label class="radio-label">
            <input
              type="radio"
              :checked="selectedCourseDays === 14"
              @change="settingsStore.patchCurrentSubjectSettings({ courseDays: 14 })"
            />
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
              name="classes-per-week"
              :checked="selectedClassesPerWeek === 1"
              @change="onClassesPerWeekChange(1)"
            />
            <span>週1回</span>
          </label>
          <label class="radio-label">
            <input
              type="radio"
              name="classes-per-week"
              :checked="selectedClassesPerWeek === 2"
              @change="onClassesPerWeekChange(2)"
            />
            <span>週2回</span>
          </label>
        </div>
      </div>

      <div class="form-group slot-section">
        <label>授業の実施方法等</label>
        <div class="slot-section-inner">
          <div
            v-for="(slot, slotIdx) in classSlots"
            :key="slotIdx"
            class="slot-row"
          >
            <div class="slot-field">
              <span class="slot-label">実施方法</span>
              <div class="slot-delivery-wrap">
                <button
                  :ref="
                    (el) => {
                      slotDeliveryTriggerRefs[slotIdx] =
                        el as HTMLButtonElement | null;
                    }
                  "
                  type="button"
                  class="slot-delivery-trigger"
                  :title="deliveryTypeLabel(slot.deliveryType)"
                  @click="toggleDeliveryDropdown(slotIdx)"
                >
                  <DeliveryIcon
                    :mode="slot.deliveryType"
                    class="slot-icon"
                  />
                </button>
                <Teleport to="body">
                  <div
                    v-if="openDeliveryDropdownIdx === slotIdx"
                    class="slot-delivery-menu slot-delivery-menu-teleported"
                    :style="deliveryMenuStyle(slotIdx)"
                  >
                    <button
                      type="button"
                      class="slot-delivery-option"
                      @click="setSlotDelivery(slotIdx, 'face-to-face')"
                    >
                      <DeliveryIcon mode="face-to-face" class="slot-option-icon" />
                      <span>対面</span>
                    </button>
                    <button
                      type="button"
                      class="slot-delivery-option"
                      @click="setSlotDelivery(slotIdx, 'online')"
                    >
                      <DeliveryIcon mode="online" class="slot-option-icon" />
                      <span>オンライン（同時双方向型）</span>
                    </button>
                    <button
                      type="button"
                      class="slot-delivery-option"
                      @click="setSlotDelivery(slotIdx, 'on-demand')"
                    >
                      <DeliveryIcon mode="on-demand" class="slot-option-icon" />
                      <span>オンライン（オンデマンド）</span>
                    </button>
                  </div>
                </Teleport>
              </div>
            </div>
            <div class="slot-field">
              <span class="slot-label">{{
                isRealtime(slot) ? "授業日" : "配信日"
              }}</span>
              <div class="slot-day-wrap">
                <span class="slot-day-display">{{
                  dayShortNames[slot.dayOfWeek]
                }}</span>
                <select
                  :value="slot.dayOfWeek"
                  class="slot-select slot-day-select"
                  :title="isRealtime(slot) ? '授業日' : '配信日'"
                  @change="
                    updateSlotDay(
                      slotIdx,
                      Number(
                        ($event.target as HTMLSelectElement).value,
                      ) as DayOfWeek,
                    )
                  "
                >
                  <option
                    v-for="d in [1, 2, 3, 4, 5, 6]"
                    :key="d"
                    :value="d"
                  >
                    {{ dayNames[d] }}
                  </option>
                </select>
              </div>
            </div>
            <div v-if="isRealtime(slot)" class="slot-field">
              <span class="slot-label">時限</span>
              <div class="slot-period-wrap">
                <span class="slot-period-display">{{
                  (slot.period ?? 1) + "限"
                }}</span>
                <select
                  :value="slot.period ?? 1"
                  class="slot-select slot-period-select"
                  title="時限"
                  @change="
                    updateSlotPeriod(
                      slotIdx,
                      Number(($event.target as HTMLSelectElement).value) as
                        | 1
                        | 2
                        | 3
                        | 4
                        | 5
                        | 6
                        | 7,
                    )
                  "
                >
                  <option
                    v-for="p in PERIOD_TIMES"
                    :key="p.period"
                    :value="p.period"
                  >
                    {{ p.period }}限
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button class="generate-button" @click="emit('generate')">
        スケジュールを生成
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "../stores/settingsStore";
import type {
  YearData,
  SemesterOption,
  CourseDays,
  ClassesPerWeek,
  DayOfWeek,
  DeliveryMode,
  ClassSlot,
} from "../types";
import { defaultClassSlot } from "../types";
import DeliveryIcon from "./DeliveryIcon.vue";
import { PERIOD_TIMES } from "../utils/periodTimes";
import { formatAcademicYear } from "../utils/japaneseEra";

const props = defineProps<{
  availableYears: number[];
  yearData: YearData | null;
  createdAt: string;
}>();

const emit = defineEmits<{
  (e: "generate"): void;
  (e: "export-settings", result: { success: boolean }): void;
  (e: "import-settings", jsonText: string): void;
  (e: "confirm-remove-subject", name: string): void;
  (e: "year-change", year: number | null): void;
}>();

const settingsStore = useSettingsStore();
const {
  subjectList,
  currentSubject,
  selectedYear: storeSelectedYear,
} = storeToRefs(settingsStore);

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

const semesterPeriod = computed(() => {
  if (!props.yearData) return null;
  const key: string = selectedSemester.value;
  const period = props.yearData.semesters[key];
  if (period) return { start: period[0], end: period[1] };
  return null;
});

const dayNames = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];
const dayShortNames = ["日", "月", "火", "水", "木", "金", "土"];

const subjectInputValue = ref("");
const showSubjectDropdown = ref(false);
const subjectInputRef = ref<HTMLInputElement | null>(null);
const subjectExportError = ref(false);
let subjectBlurTimer: ReturnType<typeof setTimeout> | null = null;
const showSettingsMenu = ref(false);
const importFileInputRef = ref<HTMLInputElement | null>(null);
const openDeliveryDropdownIdx = ref<number | null>(null);
const slotDeliveryTriggerRefs = ref<Record<number, HTMLButtonElement | null>>({});

watch(
  () => settingsStore.currentSubject,
  (cur) => {
    subjectInputValue.value = cur === "" ? "" : cur;
  },
  { immediate: true },
);

function formatPeriodDateShort(dateStr: string | unknown): string {
  const str = typeof dateStr === "string" ? dateStr : String(dateStr);
  const [year, month, day] = str.split("-");
  return `${year}/${month}/${day}`;
}

function selectSubject(value: string) {
  if (value === "") {
    settingsStore.setCurrentSubject("");
    subjectInputValue.value = "";
  } else {
    settingsStore.setCurrentSubject(value);
    subjectInputValue.value = value;
  }
  showSubjectDropdown.value = false;
  subjectInputRef.value?.blur();
}

function onSubjectInputFocus() {
  showSubjectDropdown.value = true;
  subjectExportError.value = false;
}

function onSubjectInputBlur(e: FocusEvent) {
  const next = e.relatedTarget as HTMLElement | null;
  if (next?.closest?.(".subject-dropdown")) return;
  if (subjectBlurTimer) clearTimeout(subjectBlurTimer);
  subjectBlurTimer = setTimeout(() => {
    subjectBlurTimer = null;
    showSubjectDropdown.value = false;
    onSubjectBlur();
  }, 150);
}

function onSubjectBlur() {
  const trimmed = subjectInputValue.value.trim();
  if (trimmed === "") {
    settingsStore.setCurrentSubject("");
    return;
  }
  if (settingsStore.subjectList.includes(trimmed)) {
    settingsStore.setCurrentSubject(trimmed);
    return;
  }
  settingsStore.addSubject(trimmed);
}

function onYearChange(year: number | null) {
  if (year != null && !isNaN(year)) {
    settingsStore.selectedYear = year;
    emit("year-change", year);
  }
}

function onSettingsMenuExport() {
  showSettingsMenu.value = false;
  if (!currentSubject.value?.trim()) {
    subjectExportError.value = true;
    emit("export-settings", { success: false });
    return;
  }
  subjectExportError.value = false;
  settingsStore.exportToJson();
  emit("export-settings", { success: true });
}

function triggerImport() {
  showSettingsMenu.value = false;
  importFileInputRef.value?.click();
}

function onImportFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    emit("import-settings", reader.result as string);
  };
  reader.readAsText(file, "UTF-8");
  input.value = "";
}

function deliveryMenuStyle(slotIdx: number): Record<string, string> {
  const el = slotDeliveryTriggerRefs.value[slotIdx];
  if (!el) return { visibility: "hidden" };
  const rect = el.getBoundingClientRect();
  return {
    position: "fixed",
    top: `${rect.bottom + 2}px`,
    left: `${rect.left}px`,
  };
}

function isRealtime(slot: ClassSlot): boolean {
  return slot.deliveryType === "face-to-face" || slot.deliveryType === "online";
}

function deliveryTypeLabel(mode: DeliveryMode): string {
  if (mode === "face-to-face") return "対面";
  if (mode === "online") return "オンライン（同時双方向型）";
  return "オンライン（オンデマンド）";
}

function toggleDeliveryDropdown(slotIdx: number) {
  const willOpen = openDeliveryDropdownIdx.value !== slotIdx;
  openDeliveryDropdownIdx.value = willOpen ? slotIdx : null;
  if (willOpen) {
    setTimeout(() => {
      const close = () => {
        openDeliveryDropdownIdx.value = null;
        document.removeEventListener("click", close);
      };
      document.addEventListener("click", close);
    }, 0);
  }
}

function setSlotDelivery(slotIdx: number, mode: DeliveryMode) {
  const slots = [...classSlots.value];
  const slot = { ...slots[slotIdx]! };
  slot.deliveryType = mode;
  if (mode === "on-demand") {
    delete slot.period;
  } else if (!slot.period) {
    slot.period = 1;
  }
  slots[slotIdx] = slot;
  settingsStore.patchCurrentSubjectSettings({ classSlots: slots });
  openDeliveryDropdownIdx.value = null;
}

function updateSlotDay(slotIdx: number, dayOfWeek: DayOfWeek) {
  const slots = classSlots.value.map((s, i) =>
    i === slotIdx ? { ...s, dayOfWeek } : s,
  );
  settingsStore.patchCurrentSubjectSettings({ classSlots: slots });
}

function updateSlotPeriod(
  slotIdx: number,
  period: 1 | 2 | 3 | 4 | 5 | 6 | 7,
) {
  const slots = classSlots.value.map((s, i) =>
    i === slotIdx ? { ...s, period } : s,
  );
  settingsStore.patchCurrentSubjectSettings({ classSlots: slots });
}

function onClassesPerWeekChange(perWeek: 1 | 2) {
  const slots = classSlots.value;
  if (perWeek === 1) {
    settingsStore.patchCurrentSubjectSettings({
      classesPerWeek: 1,
      classSlots: slots.length > 0 ? [slots[0]!] : [defaultClassSlot()],
    });
  } else {
    const second = { ...defaultClassSlot(), dayOfWeek: 3 as DayOfWeek };
    settingsStore.patchCurrentSubjectSettings({
      classesPerWeek: 2,
      classSlots:
        slots.length >= 2 ? [slots[0]!, slots[1]!] : [slots[0] ?? defaultClassSlot(), second],
    });
  }
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest(".dropdown")) {
    showSettingsMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.left-panel {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-height: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.conditions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  flex-shrink: 0;
}

.conditions-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.settings-export-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.hidden-file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.conditions-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 12px;
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

.form-group label.label-with-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.hint-icon {
  display: inline-flex;
  color: #888;
  cursor: help;
  vertical-align: middle;
}

.hint-icon:hover {
  color: #555;
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

.subject-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.subject-input-wrap {
  position: relative;
  flex: 1;
}

.subject-input {
  width: 100%;
  box-sizing: border-box;
}

.subject-input-error {
  border: 2px solid #c62828;
  box-shadow: none;
}

.subject-input-error:focus {
  outline: none;
  border: 2px solid #c62828;
  box-shadow: 0 0 0 2px rgba(198, 40, 40, 0.25);
}

.subject-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 220px;
  overflow-y: auto;
  z-index: 100;
}

.subject-dropdown-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
}

.subject-dropdown-item:hover,
.subject-dropdown-item.active {
  background: #e3f2fd;
  color: #0066cc;
}

.subject-dropdown-delete {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  border-radius: 2px;
}

.subject-dropdown-delete:hover {
  color: #c62828;
  background: #ffebee;
}

.subject-dropdown-label {
  flex: 1;
  min-width: 0;
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

.dropdown {
  position: relative;
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  width: 28px;
  height: 28px;
}

.settings-icon-button {
  background: transparent;
  color: rgb(51, 51, 51);
}

.settings-icon-button:hover {
  background: transparent;
  color: rgb(51, 51, 51);
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
  min-width: 150px;
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

.slot-section .slot-section-inner {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
  margin-top: 6px;
  overflow: visible;
}

.slot-section,
.slot-field,
.slot-delivery-wrap {
  overflow: visible;
}

.slot-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 10px;
  min-width: 0;
}

.slot-row:last-child {
  margin-bottom: 0;
}

.slot-field {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.slot-label {
  font-size: 10px;
  color: #888;
  line-height: 1;
}

.slot-delivery-wrap {
  position: relative;
  width: 38px;
  height: 32px;
  flex-shrink: 0;
}

.slot-delivery-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0 6px 0 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  box-sizing: border-box;
  position: relative;
}

.slot-delivery-trigger::after {
  content: "";
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 3px solid transparent;
  border-right: 3px solid transparent;
  border-top: 3px solid #666;
}

.slot-delivery-trigger:hover {
  background: #f5f5f5;
}

.slot-delivery-menu {
  min-width: 200px;
  padding: 4px 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 2000;
}

.slot-delivery-menu-teleported {
  margin-top: 2px;
}

.slot-delivery-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: white;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  text-align: left;
  transition: background 0.2s;
}

.slot-delivery-option:hover {
  background: #f0f0f0;
}

.slot-icon,
.slot-option-icon {
  flex-shrink: 0;
}

.slot-day-wrap {
  position: relative;
  width: 42px;
  height: 32px;
  flex-shrink: 0;
}

.slot-day-display {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding: 0 18px 0 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background: white;
  pointer-events: none;
}

.slot-day-display::after {
  content: "";
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 3px solid transparent;
  border-right: 3px solid transparent;
  border-top: 3px solid #666;
}

.slot-select {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.slot-day-select {
  min-width: 70px;
}

.slot-period-wrap {
  position: relative;
  width: 56px;
  height: 32px;
  flex-shrink: 0;
}

.slot-period-display {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding: 0 18px 0 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background: white;
  pointer-events: none;
}

.slot-period-display::after {
  content: "";
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 3px solid transparent;
  border-right: 3px solid transparent;
  border-top: 3px solid #666;
}

.slot-period-select {
  position: absolute;
  inset: 0;
  min-width: 55px;
  opacity: 0;
  cursor: pointer;
}
</style>
