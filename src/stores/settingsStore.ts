import { defineStore } from "pinia";
import type {
  SubjectSettings,
  SettingsExport,
  CalendarEventsIcsOptions,
} from "../types";
import {
  defaultSubjectSettings,
  migrateSubjectSettingsV1ToV2,
  SETTINGS_EXPORT_VERSION,
} from "../types";

const DEFAULT_EXPORT_FILENAME = "授業スケジュールジェネレーター設定.json";

function cloneSubjectSettings(s: SubjectSettings): SubjectSettings {
  return {
    ...s,
    classSlots: s.classSlots.map((slot) => ({ ...slot })),
    icsExportOptions: s.icsExportOptions
      ? {
          ...s.icsExportOptions,
          slots: s.icsExportOptions.slots.map((slot) => ({ ...slot })),
        }
      : undefined,
  };
}

/** v1 形式の SubjectSettings を v2（classSlots）に変換 */
function ensureSubjectSettingsV2(
  s: Record<string, unknown>,
): SubjectSettings | null {
  if (!s || typeof s.semester !== "string") return null;
  const hasClassSlots =
    Array.isArray(s.classSlots) && s.classSlots.length > 0;
  if (hasClassSlots) {
    return s as unknown as SubjectSettings;
  }
  const days = s.selectedDaysOfWeek;
  if (!Array.isArray(days)) return null;
  const classSlots = migrateSubjectSettingsV1ToV2({
    selectedDaysOfWeek: days as number[],
    deliveryModes: s.deliveryModes as Record<number, string> | undefined,
    classesPerWeek: s.classesPerWeek as number | undefined,
  });
  const base = defaultSubjectSettings();
  return {
    ...base,
    ...s,
    classSlots,
  } as SubjectSettings;
}

export const useSettingsStore = defineStore("settings", {
  state: () => {
    const empty = defaultSubjectSettings();
    return {
      subjectList: [] as string[],
      currentSubject: "" as string,
      subjectSettings: { "": cloneSubjectSettings(empty) } as Record<
        string,
        SubjectSettings
      >,
      calendarIcsOptions: null as CalendarEventsIcsOptions | null,
      selectedYear: undefined as number | undefined,
    };
  },

  getters: {
    currentSubjectSettings(state): SubjectSettings {
      const cur = state.currentSubject;
      return (
        state.subjectSettings[cur] ?? cloneSubjectSettings(defaultSubjectSettings())
      );
    },
  },

  actions: {
    setCurrentSubject(id: string) {
      this.currentSubject = id;
      if (!(id in this.subjectSettings)) {
        const from = this.subjectSettings[""] ?? defaultSubjectSettings();
        this.subjectSettings[id] = cloneSubjectSettings(from);
      }
    },

    addSubject(name: string) {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (this.subjectList.includes(trimmed)) {
        this.currentSubject = trimmed;
        return;
      }
      this.subjectList.push(trimmed);
      const from =
        this.subjectSettings[this.currentSubject] ?? defaultSubjectSettings();
      this.subjectSettings[trimmed] = cloneSubjectSettings(from);
      this.currentSubject = trimmed;
    },

    removeSubject(name: string) {
      this.subjectList = this.subjectList.filter((s) => s !== name);
      delete this.subjectSettings[name];
      if (this.currentSubject === name) this.currentSubject = "";
    },

    patchCurrentSubjectSettings(partial: Partial<SubjectSettings>) {
      const cur = this.currentSubject;
      const existing = this.subjectSettings[cur];
      const base = existing ?? defaultSubjectSettings();
      const next: SubjectSettings = {
        ...base,
        ...partial,
        classSlots: partial.classSlots ?? base.classSlots,
      };
      this.subjectSettings[cur] = next;
    },

    setCalendarIcsOptions(options: CalendarEventsIcsOptions) {
      this.calendarIcsOptions = { ...options };
    },

    exportToJson() {
      const payload: SettingsExport = {
        version: SETTINGS_EXPORT_VERSION,
        subjectList: [...this.subjectList],
        currentSubject: this.currentSubject,
        subjectSettings: {} as Record<string, SubjectSettings>,
        calendarIcsOptions: this.calendarIcsOptions
          ? { ...this.calendarIcsOptions }
          : null,
        selectedYear: this.selectedYear,
      };
      for (const key of Object.keys(this.subjectSettings)) {
        const settings = this.subjectSettings[key];
        if (settings !== undefined) {
          payload.subjectSettings[key] = cloneSubjectSettings(settings);
        }
      }
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = DEFAULT_EXPORT_FILENAME;
      a.click();
      URL.revokeObjectURL(url);
    },

    importFromJson(json: string): { success: boolean; error?: string } {
      try {
        const data = JSON.parse(json) as unknown;
        if (!data || typeof data !== "object")
          return { success: false, error: "無効なJSONです。" };
        const v = (data as { version?: number }).version;
        if (v !== 1 && v !== SETTINGS_EXPORT_VERSION)
          return {
            success: false,
            error: `未対応の設定バージョンです（version: ${v}）。`,
          };
        const d = data as SettingsExport;
        if (!Array.isArray(d.subjectList) || typeof d.currentSubject !== "string")
          return { success: false, error: "必須フィールドがありません。" };
        this.subjectList = [...d.subjectList];
        this.currentSubject = d.currentSubject;
        this.subjectSettings = {};
        if (d.subjectSettings && typeof d.subjectSettings === "object") {
          for (const key of Object.keys(d.subjectSettings)) {
            const s = d.subjectSettings[key] as unknown as Record<
              string,
              unknown
            >;
            const migrated = ensureSubjectSettingsV2(s ?? {});
            if (migrated)
              this.subjectSettings[key] = cloneSubjectSettings(migrated);
          }
        }
        if (!this.subjectSettings[""]) {
          this.subjectSettings[""] = cloneSubjectSettings(
            defaultSubjectSettings(),
          );
        }
        this.calendarIcsOptions =
          d.calendarIcsOptions && typeof d.calendarIcsOptions === "object"
            ? (d.calendarIcsOptions as CalendarEventsIcsOptions)
            : null;
        if (typeof d.selectedYear === "number") this.selectedYear = d.selectedYear;
        return { success: true };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "読み込みに失敗しました。",
        };
      }
    },
  },
});
