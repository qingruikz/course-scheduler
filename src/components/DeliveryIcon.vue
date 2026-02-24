<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    :class="['delivery-icon-svg', mode]"
  >
    <!-- オンライン（WiFi風） -->
    <template v-if="mode === 'online'">
      <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
      <line x1="12" y1="20" x2="12.01" y2="20"></line>
    </template>
    <!-- 対面（人物2人） -->
    <template v-else-if="mode === 'face-to-face'">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </template>
    <!-- オンデマンド（ビデオカメラ） -->
    <template v-else>
      <path d="M23 7l-7 5 7 5V7z"></path>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
    </template>
  </svg>
</template>

<script setup lang="ts">
import type { DeliveryMode } from "../types";

withDefaults(
  defineProps<{
    mode: DeliveryMode;
    size?: number;
  }>(),
  { size: 16 }
);
</script>

<style scoped>
.delivery-icon-svg {
  flex-shrink: 0;
}
</style>
