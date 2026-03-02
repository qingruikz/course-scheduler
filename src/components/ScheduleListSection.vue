<template>
  <div class="schedule-list-section">
    <template v-if="schedule.length > 0">
      <div class="schedule-header">
        <h2>授業日程リスト</h2>
        <div class="schedule-actions">
          <button
            class="icon-button ics-button"
            @click="emit('open-ics-export')"
            title="カレンダーに追加"
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
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <div
              v-if="showExportMenu"
              class="dropdown-menu dropdown-menu-export"
            >
              <button
                type="button"
                class="dropdown-item"
                @click="handleExport('copy')"
              >
                クリップボードにコピー
              </button>
              <button
                type="button"
                class="dropdown-item"
                @click="handleExport('excel')"
              >
                Excel
              </button>
              <button
                type="button"
                class="dropdown-item"
                @click="handleExport('txt')"
              >
                TXT
              </button>
              <button
                type="button"
                class="dropdown-item"
                @click="handleExport('markdown')"
              >
                Markdown
              </button>
              <button
                type="button"
                class="dropdown-item"
                @click="handleExport('json')"
              >
                JSON
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="schedule-list">
        <div
          v-for="(item, index) in schedule"
          :key="index"
          :class="['schedule-item', { holiday: item.isHoliday }]"
          :title="scheduleItemTitle(item)"
        >
          <span v-if="item.isHoliday">
            {{ item.dateStr }} （休講）{{ item.holidayReason }}
          </span>
          <span v-else class="schedule-item-content">
            <span
              class="schedule-date"
              :title="`${item.dateStr} 第${item.classNumber}回`"
              >{{ item.dateStr }} 第{{ item.classNumber }}回</span
            >
            <span
              :class="[
                'delivery-icon-wrapper',
                item.deliveryMode === 'online'
                  ? 'delivery-online'
                  : item.deliveryMode === 'on-demand'
                    ? 'delivery-on-demand'
                    : 'delivery-face-to-face',
              ]"
              @mouseenter="
                emit('show-delivery-popover', $event, item.deliveryMode)
              "
              @mouseleave="emit('hide-delivery-popover')"
            >
              <DeliveryIcon
                :mode="item.deliveryMode ?? 'face-to-face'"
                :size="16"
                class="delivery-icon"
              />
            </span>
          </span>
        </div>
      </div>
      <p
        v-if="showIntensiveRemaining && (intensiveRemaining ?? 0) > 0"
        class="intensive-remaining below-list"
      >
        あと {{ intensiveRemaining ?? 0 }} 回の授業が必要です。
      </p>
      <p
        v-if="showIntensiveRemaining && (intensiveOverCount ?? 0) > 0"
        class="intensive-over below-list"
      >
        {{ intensiveOverCount ?? 0 }} 回の授業を削除してください。
      </p>
      <div
        v-if="showIntensiveRemaining && schedule.length > 0"
        class="intensive-reset-wrap"
      >
        <button type="button" class="btn-reset" @click="emit('reset-click')">
          リセット
        </button>
      </div>
    </template>
    <template v-else-if="isIntensiveEmpty">
      <div class="schedule-header">
        <h2>授業日程リスト</h2>
      </div>
      <div class="schedule-list schedule-list-empty">
        <p class="intensive-empty-hint">
          右側のカレンダーで授業日またはオンデマンド授業の配信日を選択して、授業日程を追加してください。
        </p>
        <p class="intensive-remaining">
          あと {{ intensiveRemaining ?? 0 }} 回の授業が必要です。
        </p>
      </div>
    </template>
    <div v-else class="schedule-empty-message">
      スケジュールを生成してください
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { ScheduleItem } from "../types";
import type { DeliveryMode } from "../types";
import DeliveryIcon from "./DeliveryIcon.vue";

defineProps<{
  schedule: ScheduleItem[];
  /** 集中授業モードで「スケジュールを生成」押下後の空リスト表示用 */
  isIntensiveEmpty?: boolean;
  /** 集中授業モードでリスト下に「あとXX回」等を表示するか */
  showIntensiveRemaining?: boolean;
  /** 集中授業で必要な残り回数（表示用） */
  intensiveRemaining?: number;
  /** 集中授業で授業回数を超えているとき、削除すべき回数（表示用） */
  intensiveOverCount?: number;
}>();

const emit = defineEmits<{
  (e: "open-ics-export"): void;
  (e: "export", type: "copy" | "excel" | "txt" | "markdown" | "json"): void;
  (
    e: "show-delivery-popover",
    event: MouseEvent,
    mode: DeliveryMode | undefined,
  ): void;
  (e: "hide-delivery-popover"): void;
  (e: "reset-click"): void;
}>();

const showExportMenu = ref(false);

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

function handleExport(type: "copy" | "excel" | "txt" | "markdown" | "json") {
  emit("export", type);
  showExportMenu.value = false;
}
</script>

<style scoped>
.schedule-list-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-shrink: 0;
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
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  width: 28px;
  height: 28px;
}

.ics-button {
  background: #ff9800;
}

.ics-button:hover {
  background: #f57c00;
}

.export-button {
  background: #4caf50;
}

.export-button:hover {
  background: #45a049;
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
  min-width: 180px;
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
  min-height: 0;
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
  overflow: hidden;
}

.schedule-item.holiday > span:first-child {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-item.holiday {
  background: #ffebee;
  color: #c62828;
}

.schedule-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  flex-wrap: nowrap;
}

.schedule-date {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delivery-icon-wrapper {
  flex-shrink: 0;
  width: 24px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.delivery-icon {
  color: currentColor;
}

.delivery-online,
.delivery-face-to-face,
.delivery-on-demand {
  color: #000000;
}

.schedule-empty-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #666;
}

.schedule-list-empty {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  padding: 20px;
}

.intensive-empty-hint {
  margin: 0;
  font-size: 14px;
  color: #555;
  line-height: 1.5;
}

.intensive-remaining {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1976d2;
}

.intensive-remaining.below-list {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.intensive-over.below-list {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  font-size: 14px;
  font-weight: 600;
  color: #c62828;
}

.intensive-reset-wrap {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  text-align: center;
}

.btn-reset {
  padding: 6px 14px;
  border: 1px solid #c62828;
  border-radius: 4px;
  background: white;
  color: #c62828;
  font-size: 13px;
  cursor: pointer;
}

.btn-reset:hover {
  background: #ffebee;
}
</style>
