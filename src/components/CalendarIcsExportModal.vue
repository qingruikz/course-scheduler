<template>
  <div v-if="visible" class="calendar-ics-overlay" @click="closeModal">
    <div class="calendar-ics-content" @click.stop>
      <div class="modal-header">
        <h2>学年暦を ICS でダウンロード</h2>
        <button class="close-button" @click="closeModal" type="button">
          ×
        </button>
      </div>
      <div class="modal-body">
        <p v-if="!hasEvents" class="no-events-warning">
          この年度のイベントがありません。
        </p>
        <template v-else>
          <div class="form-group">
            <label>含める種別</label>
            <div class="checkbox-group">
              <label
                v-for="opt in typeOptions"
                :key="opt.value"
                class="checkbox-label"
              >
                <input
                  type="checkbox"
                  :value="opt.value"
                  v-model="includeTypes"
                />
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>授業実施</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="classesHeldFilter" value="false" />
                <span>休講日のみ</span>
              </label>
              <label class="radio-label">
                <input type="radio" v-model="classesHeldFilter" value="both" />
                <span>すべて（休講日・授業日とも）</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>リマインド</label>
            <select
              v-model="reminderMinutes"
              class="form-control reminder-select"
            >
              <option :value="null">なし</option>
              <option
                v-for="opt in reminderOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>

          <p class="all-day-note">
            イベントはすべて「終日」として出力されます。
          </p>
        </template>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="closeModal">
          キャンセル
        </button>
        <button
          type="button"
          class="btn-confirm btn-iphone"
          :disabled="!hasEvents || includeTypes.length === 0"
          @click="openQrModal"
        >
          スマホ/タブレットでダウンロード
        </button>
        <button
          type="button"
          class="btn-confirm"
          :disabled="!hasEvents || includeTypes.length === 0"
          @click="onDownload"
        >
          ICS をダウンロード
        </button>
      </div>
    </div>
    <IcsQrModal
      :visible="showQrModal"
      :url="qrModalUrl"
      @close="showQrModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type {
  CalendarEvent,
  CalendarEventType,
  CalendarEventsIcsOptions,
} from "../types";
import IcsQrModal from "./IcsQrModal.vue";
import { encodePayload } from "../utils/icsPayload";

const typeOptions: { value: CalendarEventType; label: string }[] = [
  { value: "national_holiday", label: "国民の祝日" },
  { value: "school_holiday", label: "学校休業" },
  { value: "academic", label: "学務（試験・補講等）" },
  { value: "event", label: "行事" },
  { value: "vacation", label: "長期休暇" },
];

const reminderOptions = [
  { value: 5, label: "5分前" },
  { value: 15, label: "15分前" },
  { value: 30, label: "30分前" },
  { value: 60, label: "1時間前" },
  { value: 120, label: "2時間前" },
  { value: 1440, label: "1日前" },
  { value: 2880, label: "2日前" },
];

const props = defineProps<{
  visible: boolean;
  events: CalendarEvent[];
  /** 年度（QR 用ペイロードに必要） */
  year?: number;
  /** 保存済みの学年暦 ICS 設定（あればモーダル打開時に反映） */
  initialCalendarIcsOptions?: CalendarEventsIcsOptions | null;
}>();

const emit = defineEmits<{
  close: [];
  download: [options: CalendarEventsIcsOptions];
}>();

const includeTypes = ref<CalendarEventType[]>([
  ...typeOptions.map((o) => o.value),
]);
const classesHeldFilter = ref<"false" | "both">("false");
const reminderMinutes = ref<number | null>(null);
const showQrModal = ref(false);
const qrModalUrl = ref("");

const hasEvents = computed(() => props.events.length > 0);

function closeModal() {
  emit("close");
}

function onDownload() {
  if (!hasEvents.value || includeTypes.value.length === 0) return;
  const options: CalendarEventsIcsOptions = {
    includeTypes: [...includeTypes.value],
    classesHeldFilter: classesHeldFilter.value,
    reminderMinutes: reminderMinutes.value ?? undefined,
  };
  emit("download", options);
}

function openQrModal() {
  if (!hasEvents.value || includeTypes.value.length === 0) return;
  const y = props.year ?? 0;
  const calendarIcsOptions: CalendarEventsIcsOptions = {
    includeTypes: [...includeTypes.value],
    classesHeldFilter: classesHeldFilter.value,
    reminderMinutes: reminderMinutes.value ?? undefined,
  };
  const payload = {
    type: "calendar" as const,
    year: y,
    calendarIcsOptions,
  };
  const encoded = encodePayload(payload);
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  qrModalUrl.value = window.location.origin + base + "/d?q=" + encoded;
  showQrModal.value = true;
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      const opts = props.initialCalendarIcsOptions;
      if (opts) {
        includeTypes.value = [...opts.includeTypes];
        classesHeldFilter.value = opts.classesHeldFilter;
        reminderMinutes.value = opts.reminderMinutes ?? null;
      } else {
        includeTypes.value = [...typeOptions.map((o) => o.value)];
        classesHeldFilter.value = "false";
        reminderMinutes.value = null;
      }
    }
  },
);
</script>

<style scoped>
.calendar-ics-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.calendar-ics-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 480px;
  width: 90vw;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #666;
  cursor: pointer;
  padding: 0 4px;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.no-events-warning {
  color: #c62828;
  margin: 0;
}

.form-group {
  margin-bottom: 18px;
}

.form-group > label {
  display: block;
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
  font-size: 13px;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-weight: normal;
  font-size: 13px;
}

.checkbox-label input {
  cursor: pointer;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-weight: normal;
  font-size: 13px;
}

.radio-label input {
  cursor: pointer;
}

.form-control {
  width: 100%;
  max-width: 200px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
}

.reminder-select {
  height: 38px;
}

.all-day-note {
  font-size: 12px;
  color: #666;
  margin: 8px 0 0 0;
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-confirm {
  padding: 8px 16px;
  border: none;
  background: #0066cc;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-confirm:hover:not(:disabled) {
  background: #0052a3;
}

.btn-confirm:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
