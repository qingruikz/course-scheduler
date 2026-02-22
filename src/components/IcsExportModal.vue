<template>
  <div v-if="visible" class="ics-modal-overlay" @click="closeModal">
    <div class="ics-modal-content" @click.stop>
      <div class="modal-header">
        <h2>ICS 出力設定</h2>
        <button class="close-button" @click="closeModal" type="button">
          ×
        </button>
      </div>
      <div class="modal-body">
        <p v-if="!hasClassDays" class="ics-warning">
          授業日がありません。スケジュールを生成してください。
        </p>
        <template v-else>
          <div class="form-group">
            <label for="ics-subject">科目名</label>
            <input
              id="ics-subject"
              v-model="subjectName"
              type="text"
              class="form-control"
              placeholder="例：財政学2"
              @blur="clearSubjectErrorIfValid"
            />
            <span v-if="validationError" class="validation-error">{{
              validationError
            }}</span>
          </div>

          <div class="form-group">
            <label>授業の時限・教室</label>
            <div v-for="(slot, idx) in slots" :key="idx" class="slot-group">
              <label class="slot-label">{{ dayNames[slot.dayOfWeek] }}</label>
              <div class="slot-row">
                <div class="period-select-group">
                  <label class="small-label">時限</label>
                  <select
                    v-model="slot.period"
                    class="form-control period-select"
                    @change="onPeriodChange(slot)"
                  >
                    <option
                      v-for="p in PERIOD_TIMES"
                      :key="p.period"
                      :value="p.period"
                    >
                      {{ p.label }}
                    </option>
                    <option :value="null">カスタム</option>
                  </select>
                </div>
                <template v-if="slot.period === null">
                  <div class="custom-time-group">
                    <div class="time-input-group">
                      <label class="small-label">開始</label>
                      <input
                        v-model="slot.customStart"
                        type="time"
                        class="form-control time-input"
                      />
                    </div>
                    <div class="time-input-group">
                      <label class="small-label">終了</label>
                      <input
                        v-model="slot.customEnd"
                        type="time"
                        class="form-control time-input"
                      />
                    </div>
                  </div>
                </template>
                <div class="room-group">
                  <label class="small-label">教室</label>
                  <input
                    v-model="slot.room"
                    type="text"
                    class="form-control room-input"
                    placeholder="例：有明4-301 / オンライン"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="form-group reminder-group">
            <label>リマインド</label>
            <div class="reminder-row">
              <div class="reminder-select-group">
                <span class="reminder-label">1回目（必須）</span>
                <select
                  v-model="reminder1Minutes"
                  class="form-control reminder-select"
                >
                  <option
                    v-for="opt in reminderOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="reminder-select-group">
                <span class="reminder-label">2回目（任意）</span>
                <select
                  v-model="reminder2Minutes"
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
            </div>
          </div>
        </template>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="closeModal">
          キャンセル
        </button>
        <button
          type="button"
          class="btn-confirm"
          :disabled="!hasClassDays"
          @click="onConfirm"
        >
          ICS をダウンロード
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type {
  ScheduleItem,
  SemesterOption,
  DayOfWeek,
  IcsSlot,
  IcsExportOptions,
  DeliveryMode,
} from "../types";
import { PERIOD_TIMES } from "../utils/periodTimes";

const DAY_NAMES_FULL = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
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
  schedule: ScheduleItem[];
  semester: SemesterOption;
  selectedDaysOfWeek: DayOfWeek[];
  /** 各曜日の実施方法（オンラインの場合は教室を「オンライン」で初期化） */
  deliveryModes?: Record<DayOfWeek, DeliveryMode>;
  /** 科目名の初期値（store の現在科目など） */
  initialSubjectName?: string;
  /** 保存済みの ICS 出力設定（あればモーダル打開時に反映） */
  initialIcsOptions?: IcsExportOptions;
}>();

const emit = defineEmits<{
  close: [];
  submit: [options: IcsExportOptions];
}>();

const dayNames = DAY_NAMES_FULL;
const subjectName = ref("");
const slots = ref<IcsSlot[]>([]);
const reminder1Minutes = ref<number>(1440);
const reminder2Minutes = ref<number | null>(null);
const validationError = ref("");

const hasClassDays = computed(() => {
  return props.schedule.some((item) => !item.isHoliday);
});

function initSlots() {
  const days = props.selectedDaysOfWeek;
  slots.value = days.map((dayOfWeek) => ({
    dayOfWeek,
    period: 1 as IcsSlot["period"],
    room: props.deliveryModes?.[dayOfWeek] === "online" ? "オンライン" : "",
  }));
}

function onPeriodChange(slot: IcsSlot) {
  if (slot.period !== null) {
    slot.customStart = undefined;
    slot.customEnd = undefined;
  }
}

function closeModal() {
  validationError.value = "";
  emit("close");
}

/** 科目名入力の blur 時、入力済みなら科目名エラーを消す */
function clearSubjectErrorIfValid() {
  if (
    validationError.value === "科目名を入力してください。" &&
    subjectName.value.trim()
  ) {
    validationError.value = "";
  }
}

function validate(): boolean {
  validationError.value = "";
  const name = subjectName.value.trim();
  if (!name) {
    validationError.value = "科目名を入力してください。";
    return false;
  }
  for (const slot of slots.value) {
    if (slot.period === null) {
      if (!slot.customStart || !slot.customEnd) {
        validationError.value =
          "カスタム時間の場合は開始・終了を入力してください。";
        return false;
      }
    }
  }
  return true;
}

function onConfirm() {
  if (!hasClassDays.value) return;
  if (!validate()) return;

  const options: IcsExportOptions = {
    subjectName: subjectName.value.trim(),
    slots: slots.value.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      period: s.period,
      customStart: s.customStart,
      customEnd: s.customEnd,
      room: s.room.trim(),
    })),
    reminder1Minutes: reminder1Minutes.value,
    reminder2Minutes: reminder2Minutes.value ?? undefined,
  };
  emit("submit", options);
}

watch(
  () => [props.visible, props.selectedDaysOfWeek] as const,
  ([visible, days]) => {
    if (visible && Array.isArray(days)) {
      const opts = props.initialIcsOptions;
      if (opts) {
        subjectName.value = opts.subjectName ?? "";
        slots.value = opts.slots.map((s) => ({
          ...s,
          room: s.room ?? "",
        }));
        reminder1Minutes.value = opts.reminder1Minutes ?? 1440;
        reminder2Minutes.value = opts.reminder2Minutes ?? null;
      } else {
        initSlots();
        subjectName.value = props.initialSubjectName?.trim() ?? "";
        reminder1Minutes.value = 1440;
        reminder2Minutes.value = null;
      }
      validationError.value = "";
    }
  },
);
</script>

<style scoped>
.ics-modal-content {
  max-width: 600px;
  width: 90vw;
}

.modal-body {
  padding: 20px;
}

.ics-warning {
  color: #c62828;
  margin: 0;
}

.form-group {
  margin-bottom: 18px;
}

/* 科目名・授業の日時・教室・リマインド などの大見出しのみ（直接子の label） */
.form-group > label {
  display: block;
  font-weight: bold;
  margin-bottom: 6px;
  color: #333;
  font-size: 13px;
}

/* 時限・教室 など slot 内の小ラベルは灰色のまま */
.form-group .small-label {
  font-weight: normal;
  color: #666;
  font-size: 11px;
}

.form-control {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
  height: 38px;
}

.validation-error {
  display: block;
  color: #c62828;
  font-size: 12px;
  margin-top: 4px;
}

.slot-group {
  margin-bottom: 16px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  min-width: 0;
}

.slot-label {
  font-weight: bold;
  font-size: 13px;
  color: #333;
  margin-bottom: 8px;
  display: block;
}

.slot-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  min-width: 0;
}

.period-select-group {
  flex: 0 0 140px;
}

.custom-time-group {
  display: flex;
  align-items: flex-end;
  margin-right: 12px;
  width: 260px;
  max-width: 260px;
}

.custom-time-group .time-input-group {
  flex: 0 0 120px;
  min-width: 0;
  width: 120px;
}

.custom-time-group .time-input-group .form-control {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.custom-time-group .time-input-group:not(:first-child) {
  margin-left: 20px;
}

.time-input-group {
  flex: 0 0 110px;
}

.room-group {
  flex: 1 1 180px;
  min-width: 0;
}

.room-group .form-control {
  box-sizing: border-box;
  min-width: 0;
}

.small-label {
  display: block;
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
}

.period-select,
.reminder-select {
  min-width: 0;
}

.reminder-group {
  margin-top: 20px;
}

.reminder-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.reminder-select-group {
  flex: 1;
  min-width: 140px;
}

.reminder-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #ddd;
  background: white;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-confirm {
  background: #0066cc;
  color: white;
  border-color: #0066cc;
}

.btn-confirm:hover:not(:disabled) {
  background: #0052a3;
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<style>
.ics-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.ics-modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-height: 90vh;
  overflow-y: auto;
}

.ics-modal-content .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.ics-modal-content .modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.ics-modal-content .close-button {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: #666;
  padding: 0 4px;
}

.ics-modal-content .close-button:hover {
  color: #333;
}
</style>
