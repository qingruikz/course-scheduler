<template>
  <div v-if="visible" class="qr-modal-overlay" @click="emit('close')">
    <div class="qr-modal-content" @click.stop>
      <div class="qr-modal-header">
        <h2>{{ title }}</h2>
        <button type="button" class="qr-close-button" @click="emit('close')">
          ×
        </button>
      </div>
      <div class="qr-modal-body">
        <div v-if="url" class="qr-image-wrap">
          <img :src="qrSrc" alt="QRコード" class="qr-image" />
        </div>
        <button
          v-if="url"
          type="button"
          class="qr-copy-button"
          @click="copyUrl"
        >
          URL をコピー
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from "vue";
import QRCode from "qrcode";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    url: string;
    title?: string;
  }>(),
  { title: "スマホ/タブレットでダウンロード" },
);

const emit = defineEmits<{ close: [] }>();

const qrSrc = ref("");
watch(
  () => [props.visible, props.url] as const,
  ([vis, u]) => {
    if (!vis || !u) {
      qrSrc.value = "";
      return;
    }
    QRCode.toDataURL(u, { width: 256 }, (err, url) => {
      if (!err && url) qrSrc.value = url;
    });
  },
  { immediate: true },
);

function copyUrl() {
  if (!props.url) return;
  navigator.clipboard.writeText(props.url).catch(() => {});
}
</script>

<style scoped>
.qr-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.qr-modal-content {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  max-width: 320px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.qr-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.qr-modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.qr-close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  line-height: 1;
}

.qr-modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.qr-image-wrap {
  background: #fff;
  padding: 8px;
  border-radius: 4px;
}

.qr-image {
  display: block;
  width: 256px;
  height: 256px;
}

.qr-copy-button {
  padding: 8px 16px;
  background: #0066cc;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.qr-copy-button:hover {
  background: #0052a3;
}
</style>
