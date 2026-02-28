<template>
  <header class="header">
    <div class="header-right-buttons">
      <div class="dropdown">
        <button
          type="button"
          class="calendar-icon-button-header admin-icon-button-header"
          title="メニュー"
          @click="showAdminMenu = !showAdminMenu"
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
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div v-if="showAdminMenu" class="dropdown-menu dropdown-menu-admin">
          <button type="button" class="dropdown-item" @click="emit('add-calendar')">
            学年暦をカレンダーに追加
          </button>
          <button type="button" class="dropdown-item" @click="emit('official-calendar')">
            大学公式カレンダー
          </button>
          <button type="button" class="dropdown-item" @click="emit('calendar-mapper')">
            カレンダー配置管理
          </button>
        </div>
      </div>
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
</template>

<script setup lang="ts">
import { ref } from "vue";
import { formatAcademicYear } from "../utils/japaneseEra";

defineProps<{
  selectedYear: number | null;
}>();

const emit = defineEmits<{
  (e: "add-calendar"): void;
  (e: "official-calendar"): void;
  (e: "calendar-mapper"): void;
}>();

const showAdminMenu = ref(false);
</script>

<style scoped>
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

.calendar-icon-button-header,
.admin-icon-button-header {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.calendar-icon-button-header:hover,
.admin-icon-button-header:hover {
  background-color: #e8e8e8;
  color: #333;
}

.dropdown {
  position: relative;
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
  min-width: 220px;
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
</style>
