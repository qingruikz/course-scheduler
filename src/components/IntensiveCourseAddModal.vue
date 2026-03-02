<template>
  <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>授業日程を追加</h3>
        <p class="modal-date">{{ dateLabel }}</p>
      </div>
      <div class="modal-body">
        <p class="slot-count-label">
          この日に、<span class="slot-count-num">{{ slots.length }}</span
          >コマの授業を設定しています。
        </p>
        <div class="slots-scroll">
          <div
            v-for="(slot, slotIdx) in slots"
            :key="slotIdx"
            :class="[
              'form-group slot-row',
              { 'slot-row-error': duplicateSlotIndices.includes(slotIdx) },
            ]"
          >
            <div class="slot-fields">
              <div class="slot-field">
                <span class="slot-label">実施方法</span>
                <div class="slot-delivery-wrap">
                  <button
                    :ref="(el) => setDeliveryTriggerRef(slotIdx, el)"
                    type="button"
                    class="slot-delivery-trigger"
                    :title="deliveryTypeLabel(slot.deliveryMode)"
                    @click="toggleDeliveryDropdown(slotIdx)"
                  >
                    <DeliveryIcon :mode="slot.deliveryMode" class="slot-icon" />
                  </button>
                  <Teleport to="body">
                    <div
                      v-if="openDeliveryIdx === slotIdx"
                      class="slot-delivery-menu slot-delivery-menu-teleported"
                      :style="deliveryMenuStyle(slotIdx)"
                    >
                      <button
                        type="button"
                        class="slot-delivery-option"
                        @click="setDelivery(slotIdx, 'face-to-face')"
                      >
                        <DeliveryIcon
                          mode="face-to-face"
                          class="slot-option-icon"
                        />
                        <span>対面</span>
                      </button>
                      <button
                        type="button"
                        class="slot-delivery-option"
                        @click="setDelivery(slotIdx, 'online')"
                      >
                        <DeliveryIcon mode="online" class="slot-option-icon" />
                        <span>オンライン（同時双方向型）</span>
                      </button>
                      <button
                        type="button"
                        class="slot-delivery-option"
                        @click="setDelivery(slotIdx, 'on-demand')"
                      >
                        <DeliveryIcon
                          mode="on-demand"
                          class="slot-option-icon"
                        />
                        <span>オンライン（オンデマンド）</span>
                      </button>
                    </div>
                  </Teleport>
                </div>
              </div>
              <div v-if="isSlotRealtime(slot)" class="slot-field">
                <span class="slot-label">時限</span>
                <div class="slot-period-wrap">
                  <span class="slot-period-display"
                    >{{ slot.period ?? 1 }}限</span
                  >
                  <select
                    :value="slot.period ?? 1"
                    class="slot-select slot-period-select"
                    title="時限"
                    @change="
                      setSlotPeriod(
                        slotIdx,
                        Number(
                          ($event.target as HTMLSelectElement).value,
                        ) as PeriodNum,
                      )
                    "
                  >
                    <option
                      v-for="p in PERIOD_TIMES"
                      :key="p.period"
                      :value="p.period"
                      :disabled="isPeriodDisabledForSlot(slotIdx, p.period)"
                    >
                      {{ p.period }}限
                    </option>
                  </select>
                </div>
              </div>
            </div>
            <button
              v-if="slots.length >= 1"
              type="button"
              class="btn-remove-slot"
              title="この授業を削除"
              @click="removeSlot(slotIdx)"
            >
              ×
            </button>
          </div>
        </div>
        <div class="btn-add-slot-wrap">
          <button type="button" class="btn-add-slot" @click="addSlot">
            追加
          </button>
          <button
            v-if="slots.length > 0"
            type="button"
            class="btn-delete-all"
            @click="showDeleteAllConfirm = true"
          >
            すべて削除
          </button>
        </div>
        <p v-if="periodError" class="error-text">{{ periodError }}</p>
        <p v-if="slots.length === 0" class="no-slots-hint">
          この日には授業がありません。追加ボタンで追加してください。
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="emit('close')">
          キャンセル
        </button>
        <button type="button" class="btn-confirm" @click="onConfirm">
          {{ slots.length > 0 ? "反映" : "閉じる" }}
        </button>
      </div>
    </div>
    <ConfirmModal
      :visible="showDeleteAllConfirm"
      message="この日の授業をすべて削除しますか？"
      confirm-text="削除"
      cancel-text="キャンセル"
      @confirm="onConfirmDeleteAll"
      @cancel="showDeleteAllConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import DeliveryIcon from "./DeliveryIcon.vue";
import ConfirmModal from "./ConfirmModal.vue";
import { PERIOD_TIMES } from "../utils/periodTimes";
import type { ScheduleItem, DeliveryMode } from "../types";
import { formatDate } from "../utils/scheduleGenerator";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    date: Date | null;
    existingItemsOnDate: ScheduleItem[];
  }>(),
  { existingItemsOnDate: () => [] },
);

type PeriodNum = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface SlotEntry {
  deliveryMode: DeliveryMode;
  period?: PeriodNum;
}

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "confirm",
    payloads: { deliveryMode: DeliveryMode; period?: number }[],
  ): void;
  (e: "delete-all"): void;
}>();

const slots = ref<SlotEntry[]>([{ deliveryMode: "face-to-face", period: 1 }]);
const openDeliveryIdx = ref<number | null>(null);
const deliveryTriggerRefs = ref<Record<number, HTMLButtonElement | null>>({});
const showDeleteAllConfirm = ref(false);

const dateLabel = computed(() => (props.date ? formatDate(props.date) : ""));

function isSlotRealtime(slot: SlotEntry): boolean {
  return slot.deliveryMode === "face-to-face" || slot.deliveryMode === "online";
}

/** 同日で既に登録済みの時限（RT のみ） */
const existingPeriodsOnDate = computed(() => {
  return new Set(
    props.existingItemsOnDate
      .filter(
        (i) =>
          !i.isHoliday &&
          (i.deliveryMode === "face-to-face" || i.deliveryMode === "online"),
      )
      .map((i) => i.period)
      .filter((p): p is PeriodNum => p != null),
  );
});

/** 指定 slot 以外で使われている時限（フォーム内の他 slot + 既存） */
function periodsUsedByOthers(slotIdx: number): Set<PeriodNum> {
  const used = new Set<PeriodNum>(existingPeriodsOnDate.value);
  slots.value.forEach((s, i) => {
    if (i !== slotIdx && isSlotRealtime(s) && s.period != null) {
      used.add(s.period);
    }
  });
  return used;
}

function isPeriodDisabledForSlot(slotIdx: number, p: number): boolean {
  return periodsUsedByOthers(slotIdx).has(p as PeriodNum);
}

/** 同じ日に同じ時限が重複している slot のインデックス一覧（ハイライト用） */
const duplicateSlotIndices = computed(() => {
  const byPeriod = new Map<PeriodNum, number[]>();
  slots.value.forEach((s, i) => {
    if (isSlotRealtime(s) && s.period != null) {
      const arr = byPeriod.get(s.period) ?? [];
      arr.push(i);
      byPeriod.set(s.period, arr);
    }
  });
  const indices: number[] = [];
  byPeriod.forEach((arr) => {
    if (arr.length >= 2) indices.push(...arr);
  });
  return indices;
});

const periodError = computed(() => {
  const dup = duplicateSlotIndices.value;
  if (dup.length === 0) return "";
  return "同じ日に同じ時限の授業を2つ以上設定できません。";
});

function deliveryMenuStyle(slotIdx: number): Record<string, string> {
  const el = deliveryTriggerRefs.value[slotIdx];
  if (!el) return { visibility: "hidden" };
  const rect = el.getBoundingClientRect();
  return {
    position: "fixed",
    top: `${rect.bottom + 2}px`,
    left: `${rect.left}px`,
    zIndex: "5000",
  };
}

function setDeliveryTriggerRef(slotIdx: number, el: unknown) {
  deliveryTriggerRefs.value[slotIdx] = el as HTMLButtonElement | null;
}

const PERIODS: PeriodNum[] = [1, 2, 3, 4, 5, 6, 7];

function scheduleItemToSlot(item: ScheduleItem): SlotEntry {
  const mode = (item.deliveryMode ?? "face-to-face") as DeliveryMode;
  const slot: SlotEntry = { deliveryMode: mode };
  if (mode === "face-to-face" || mode === "online") {
    slot.period = (item.period ?? 1) as PeriodNum;
  }
  return slot;
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      const existing = props.existingItemsOnDate.filter((i) => !i.isHoliday);
      if (existing.length > 0) {
        slots.value = existing.map(scheduleItemToSlot);
      } else {
        const used = existingPeriodsOnDate.value;
        const firstUnused = PERIODS.find((p) => !used.has(p));
        slots.value = [
          { deliveryMode: "face-to-face", period: firstUnused ?? 1 },
        ];
      }
      openDeliveryIdx.value = null;
    }
  },
);

function deliveryTypeLabel(mode: DeliveryMode): string {
  if (mode === "face-to-face") return "対面";
  if (mode === "online") return "オンライン（同時双方向型）";
  return "オンライン（オンデマンド）";
}

function toggleDeliveryDropdown(slotIdx: number) {
  const willOpen = openDeliveryIdx.value !== slotIdx;
  openDeliveryIdx.value = willOpen ? slotIdx : null;
  if (willOpen) {
    setTimeout(() => {
      const close = () => {
        openDeliveryIdx.value = null;
        document.removeEventListener("click", close);
      };
      document.addEventListener("click", close);
    }, 0);
  }
}

function setDelivery(slotIdx: number, mode: DeliveryMode) {
  const list = [...slots.value];
  const slot = { ...list[slotIdx]! };
  slot.deliveryMode = mode;
  if (mode === "on-demand") {
    delete slot.period;
  } else if (slot.period == null) {
    slot.period = 1;
  }
  list[slotIdx] = slot;
  slots.value = list;
  openDeliveryIdx.value = null;
}

function setSlotPeriod(slotIdx: number, p: PeriodNum) {
  const list = [...slots.value];
  const slot = { ...list[slotIdx]! };
  slot.period = p;
  list[slotIdx] = slot;
  slots.value = list;
}

function addSlot() {
  const last = slots.value[slots.value.length - 1];
  if (!last) {
    const used = existingPeriodsOnDate.value;
    const firstUnused = PERIODS.find((p) => !used.has(p));
    slots.value = [{ deliveryMode: "face-to-face", period: firstUnused ?? 1 }];
    return;
  }
  const next: SlotEntry = {
    deliveryMode: last.deliveryMode,
    period: last.period,
  };
  if (isSlotRealtime(last)) {
    const used = periodsUsedByOthers(slots.value.length);
    const nextPeriod = PERIODS.find((p) => !used.has(p));
    if (nextPeriod != null) {
      next.period = nextPeriod;
    } else {
      next.period =
        last.period != null && last.period < 7
          ? ((last.period + 1) as PeriodNum)
          : (last.period ?? 1);
    }
  }
  slots.value = [...slots.value, next];
}

function removeSlot(slotIdx: number) {
  const list = slots.value.filter((_, i) => i !== slotIdx);
  slots.value = list;
  openDeliveryIdx.value = null;
  deliveryTriggerRefs.value = {};
}

function onConfirmDeleteAll() {
  showDeleteAllConfirm.value = false;
  emit("delete-all");
  emit("close");
}

function onConfirm() {
  if (slots.value.length > 0 && periodError.value) return;
  const payloads = slots.value.map((s) =>
    isSlotRealtime(s)
      ? { deliveryMode: s.deliveryMode, period: s.period ?? 1 }
      : { deliveryMode: s.deliveryMode },
  );
  emit("confirm", payloads);
  emit("close");
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  width: 350px;
  height: 460px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
}

.modal-date {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.modal-body {
  padding: 20px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.slot-count-label {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #555;
  flex-shrink: 0;
}

.slot-count-num {
  color: #1976d2;
  font-weight: 600;
}

.slots-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.slots-scroll::-webkit-scrollbar {
  width: 6px;
}

.slots-scroll::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

.no-slots-hint {
  margin: 10px 0 0 0;
  font-size: 13px;
  color: #666;
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-confirm {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #1976d2;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.btn-confirm:hover {
  background: #1565c0;
}

.slot-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 5px;
  padding: 5px;
  border-radius: 6px;
  border: 1px solid transparent;
}

.slot-row:last-child {
  margin-bottom: 0;
}

.slot-row-error {
  background: #ffebee;
  border-color: #ef5350;
}

.slot-fields {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.btn-remove-slot {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #666;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove-slot:hover {
  background: #ffebee;
  color: #c62828;
  border-color: #ef5350;
}

.btn-add-slot-wrap {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.btn-delete-all {
  padding: 8px 16px;
  border: 1px solid #c62828;
  border-radius: 4px;
  background: white;
  color: #c62828;
  font-size: 14px;
  cursor: pointer;
}

.btn-delete-all:hover {
  background: #ffebee;
}

.error-text {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #c62828;
  flex-shrink: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  min-width: 0;
}

.slot-field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.slot-label {
  font-size: 12px;
  color: #666;
}

.slot-delivery-wrap {
  position: relative;
  width: 38px;
  height: 32px;
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
  z-index: 5000;
}

.btn-add-slot {
  padding: 8px 16px;
  border: 1px solid #1976d2;
  border-radius: 4px;
  background: white;
  color: #1976d2;
  font-size: 14px;
  cursor: pointer;
}

.btn-add-slot:hover {
  background: #e3f2fd;
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

.slot-period-wrap {
  position: relative;
  width: 56px;
  height: 32px;
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

.slot-select {
  position: absolute;
  inset: 0;
  min-width: 55px;
  opacity: 0;
  cursor: pointer;
}
</style>
