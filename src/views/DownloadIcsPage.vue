<template>
  <div class="download-page">
    <h1 class="page-title">ICS をダウンロード</h1>

    <template v-if="error">
      <p class="error-msg">{{ error }}</p>
    </template>

    <template v-else-if="payload">
      <section class="summary" aria-label="設定概要">
        <h2 class="summary-heading">設定内容</h2>
        <dl class="summary-list">
          <template v-if="payload.type === 'schedule'">
            <dt>種別</dt>
            <dd>科目（授業スケジュール）</dd>
            <dt>年度</dt>
            <dd>{{ payload.year }}</dd>
            <dt>学期</dt>
            <dd>{{ payload.semester }}</dd>
            <dt>科目名</dt>
            <dd>{{ payload.icsExportOptions.subjectName || '—' }}</dd>
            <dt>曜日・時限・教室</dt>
            <dd>
              <span
                v-for="(slot, i) in payload.icsExportOptions.slots"
                :key="i"
                class="slot-item"
              >
                {{ slotLabel(slot) }} {{ slot.room }}
              </span>
              <span v-if="!payload.icsExportOptions.slots?.length">—</span>
            </dd>
            <dt>リマインド</dt>
            <dd>
              {{ reminderLabel(payload.icsExportOptions.reminder1Minutes, payload.icsExportOptions.reminder2Minutes) }}
            </dd>
          </template>
          <template v-else>
            <dt>種別</dt>
            <dd>学年暦</dd>
            <dt>年度</dt>
            <dd>{{ payload.year }}</dd>
            <dt>含める種別</dt>
            <dd>{{ includeTypesLabel(payload.calendarIcsOptions.includeTypes) }}</dd>
            <dt>授業実施</dt>
            <dd>{{ payload.calendarIcsOptions.classesHeldFilter === 'false' ? '休講日のみ' : '両方' }}</dd>
            <dt>リマインド</dt>
            <dd>{{ payload.calendarIcsOptions.reminderMinutes != null && payload.calendarIcsOptions.reminderMinutes > 0 ? payload.calendarIcsOptions.reminderMinutes + '分前' : 'なし' }}</dd>
          </template>
        </dl>
      </section>

      <button
        type="button"
        class="download-button"
        :disabled="!ready"
        @click="doDownload"
      >
        ダウンロード
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { decodePayload } from "../utils/icsPayload";
import type {
  ScheduleIcsPayload,
  CalendarIcsPayload,
  IcsPayload,
} from "../utils/icsPayload";
import type { CalendarData, YearData } from "../types";
import { convertYamlToCalendarData } from "../utils/yamlConverter";
import { generateSchedule } from "../utils/scheduleGenerator";
import {
  buildScheduleIcsBlob,
  buildCalendarIcsBlob,
  sanitizeFilename,
} from "../utils/export";
import type { IcsSlot } from "../types";
import { PERIOD_TIMES_MAP } from "../utils/periodTimes";

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

const route = useRoute();
const error = ref<string | null>(null);
const payload = ref<IcsPayload | null>(null);
const calendarData = ref<CalendarData | null>(null);

const q = computed(() => (route.query.q as string) ?? "");

function slotLabel(slot: IcsSlot): string {
  const fromMap =
    slot.period != null ? PERIOD_TIMES_MAP[slot.period] : undefined;
  const start = fromMap?.start ?? slot.customStart ?? "09:00";
  const end = fromMap?.end ?? slot.customEnd ?? "10:30";
  const dayShort = DAY_NAMES[slot.dayOfWeek];
  const periodStr = slot.period != null ? `${slot.period}限` : "カスタム";
  return `${dayShort}${periodStr}（${start}～${end}）`;
}

function reminderLabel(r1: number, r2?: number | null): string {
  const parts: string[] = [];
  if (r1 != null && r1 > 0) parts.push(`${r1}分前`);
  if (r2 != null && r2 > 0) parts.push(`${r2}分前`);
  return parts.length ? parts.join("、") : "なし";
}

const CALENDAR_EVENT_TYPE_LABELS: Record<string, string> = {
  national_holiday: "祝日",
  school_holiday: "休業日",
  academic: "学務",
  event: "行事",
  vacation: "長期休暇",
};

function includeTypesLabel(types: string[]): string {
  if (!types?.length) return "—";
  return types
    .map((t) => CALENDAR_EVENT_TYPE_LABELS[t] ?? t)
    .join("、");
}

const ready = computed(() => {
  if (!payload.value || !calendarData.value) return false;
  if (payload.value.type === "schedule") {
    const yearData = calendarData.value.years[String(payload.value.year)];
    return !!yearData;
  }
  return true;
});

function doDownload() {
  const p = payload.value;
  const cal = calendarData.value;
  if (!p || !cal) return;

  if (p.type === "schedule") {
    const yearData = cal.years[String(p.year)] as YearData | undefined;
    if (!yearData) return;
    const dayOfWeekParam =
      p.classesPerWeek === 1 && p.selectedDaysOfWeek.length > 0
        ? [p.selectedDaysOfWeek[0]!]
        : p.selectedDaysOfWeek;
    const schedule = generateSchedule(
      yearData,
      p.semester,
      p.courseDays,
      dayOfWeekParam,
      p.deliveryModes,
    );
    const blob = buildScheduleIcsBlob(
      schedule,
      p.icsExportOptions,
      p.semester,
    );
    const name = p.icsExportOptions.subjectName?.trim()
      ? `${sanitizeFilename(p.icsExportOptions.subjectName)}.ics`
      : "schedule.ics";
    triggerDownload(blob, name);
  } else {
    const yearData = cal.years[String(p.year)] as YearData | undefined;
    const events = yearData?.events ?? [];
    const blob = buildCalendarIcsBlob(
      events,
      p.calendarIcsOptions,
      p.year,
    );
    triggerDownload(blob, `学年暦_${p.year}.ics`);
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(() => {
  const encoded = q.value;
  if (!encoded) {
    error.value = "無効なリンクです。";
    return;
  }
  const decoded = decodePayload(encoded);
  if (!decoded) {
    error.value = "無効なリンクです。";
    return;
  }
  payload.value = decoded;

  const calendarModules = import.meta.glob<{ default: unknown }>(
    "../data/calendar_*.yaml",
    { eager: true },
  );
  const yamlDataArray = Object.values(calendarModules).map(
    (m) => m.default as { year: number; semesters: Record<string, { start: string; end: string }>; events: unknown[] },
  );
  // YAML eager glob defaults match YamlYearData shape at runtime
  calendarData.value = convertYamlToCalendarData(
    yamlDataArray as Parameters<typeof convertYamlToCalendarData>[0],
  );

  if (decoded.type === "schedule") {
    const yearData = calendarData.value?.years[String(decoded.year)];
    if (!yearData) {
      error.value = "指定された年度のデータがありません。";
    }
  }
});
</script>

<style scoped>
.download-page {
  max-width: 560px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  background: #f5f5f5;
}

.page-title {
  font-size: 22px;
  color: #333;
  margin-bottom: 24px;
}

.error-msg {
  color: #c62828;
  font-size: 14px;
}

.summary {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.summary-heading {
  font-size: 16px;
  color: #333;
  margin: 0 0 12px 0;
}

.summary-list {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 16px;
  font-size: 14px;
}

.summary-list dt {
  color: #666;
  font-weight: normal;
}

.summary-list dd {
  margin: 0;
  color: #333;
}

.slot-item {
  display: inline-block;
  margin-right: 8px;
  margin-bottom: 4px;
}

.download-button {
  width: 100%;
  padding: 12px 20px;
  background: #0066cc;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.download-button:hover:not(:disabled) {
  background: #0052a3;
}

.download-button:disabled {
  background: #999;
  cursor: not-allowed;
}
</style>
