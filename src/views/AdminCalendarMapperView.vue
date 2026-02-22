<template>
  <div class="admin-calendar-mapper">
    <header class="mapper-header">
      <h1>公式カレンダー配置（calendar-mapper）</h1>
      <p class="mapper-hint">
        PNG
        をアップロードし、画像上で月の範囲をドラッグして枠選択し、グリッドの余白を設定してください。エクスポートした
        JSON は
        <code>src/data/</code> に、画像は <code>public/</code> に配置します。
      </p>
    </header>

    <div class="mapper-toolbar">
      <div class="toolbar-group">
        <label class="file-label">
          PNG をアップロード
          <input
            type="file"
            accept="image/png"
            class="file-input"
            @change="onPngSelect"
          />
        </label>
      </div>
      <div class="toolbar-group">
        <label class="label-with-hint">
          年度
          <span
            class="hint-icon"
            title="エクスポートする JSON の year フィールド。主画面でこの年度を選んだときにこの配置が読み込まれます。"
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
        <input
          v-model.number="layoutYear"
          type="number"
          class="form-control year-input"
          min="2020"
          max="2030"
        />
        <label v-if="currentImageId" class="label-with-hint">
          画像パス
          <span
            class="hint-icon"
            title="エクスポートする JSON の images に書かれるパス。画像は public/ に置き、ここに入力したファイル名（例: calendar_2026.png）と一致させてください。"
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
        <input
          v-if="currentImageId"
          v-model="imageIdToPath[currentImageId]"
          type="text"
          class="form-control path-input"
          placeholder="calendar_2026.png"
        />
      </div>
      <div class="toolbar-group">
        <button type="button" class="btn btn-primary" @click="exportJson">
          JSON をエクスポート
        </button>
        <label class="file-label">
          JSON をインポート
          <input
            ref="importInputRef"
            type="file"
            accept=".json"
            class="file-input"
            @change="onImportJson"
          />
        </label>
      </div>
    </div>

    <div v-if="!currentImageUrl" class="empty-state">
      PNG をアップロードして、月の枠選択を開始してください。
    </div>

    <template v-else>
      <div class="canvas-wrap" ref="canvasWrapRef">
        <canvas
          ref="canvasRef"
          class="mapper-canvas"
          @mousedown="onCanvasMouseDown"
          @mousemove="onCanvasMouseMove"
          @mouseup="onCanvasMouseUp"
          @mouseleave="onCanvasMouseLeave"
        />
        <!-- グリッドプレビュー（日付エリア上に 7×N の半透明枠） -->
        <div
          v-if="selectedMonthLayout"
          class="grid-preview"
          :style="gridPreviewStyle"
        >
          <div
            class="grid-preview-inner"
            :style="{
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridTemplateRows: `repeat(${selectedMonthLayout.rowCount}, 1fr)`,
            }"
          >
            <div
              v-for="i in 7 * selectedMonthLayout.rowCount"
              :key="i"
              class="grid-cell"
            />
          </div>
        </div>
      </div>

      <div class="months-panel">
        <h3>設定済みの月</h3>
        <ul class="months-list">
          <li
            v-for="(ml, monthKey) in layoutMonths"
            :key="monthKey"
            class="month-item"
            :class="{ selected: selectedMonthKey === monthKey }"
            @click="selectedMonthKey = monthKey"
          >
            {{ monthKey }} 月
          </li>
        </ul>
        <div v-if="selectedMonthLayout" class="grid-offset-editor">
          <div class="editor-row">
            <h4>月枠の位置・サイズ（画像全体に対する割合 0–1）</h4>
            <div class="offset-inputs">
              <label
                >X
                <input
                  v-model.number="selectedMonthLayout.monthBox.x"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  class="form-control num-input"
                  @input="redraw"
                />
              </label>
              <label
                >Y
                <input
                  v-model.number="selectedMonthLayout.monthBox.y"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  class="form-control num-input"
                  @input="redraw"
                />
              </label>
              <label
                >幅
                <input
                  v-model.number="selectedMonthLayout.monthBox.width"
                  type="number"
                  step="0.001"
                  min="0.01"
                  max="1"
                  class="form-control num-input"
                  @input="redraw"
                />
              </label>
              <label
                >高さ
                <input
                  v-model.number="selectedMonthLayout.monthBox.height"
                  type="number"
                  step="0.001"
                  min="0.01"
                  max="1"
                  class="form-control num-input"
                  @input="redraw"
                />
              </label>
            </div>
          </div>
          <div class="editor-row">
            <h4>グリッド余白（月枠に対する割合 0–1）</h4>
            <div class="offset-inputs">
              <label
                >上
                <input
                  v-model.number="selectedMonthLayout.gridOffset.paddingTop"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  class="form-control num-input"
              /></label>
              <label
                >下
                <input
                  v-model.number="selectedMonthLayout.gridOffset.paddingBottom"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  class="form-control num-input"
              /></label>
              <label
                >左
                <input
                  v-model.number="selectedMonthLayout.gridOffset.paddingLeft"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  class="form-control num-input"
              /></label>
              <label
                >右
                <input
                  v-model.number="selectedMonthLayout.gridOffset.paddingRight"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  class="form-control num-input"
              /></label>
            </div>
          </div>
          <div class="editor-row">
          <label
            >行数
            <select
              v-model.number="selectedMonthLayout.rowCount"
              class="form-control"
            >
              <option :value="4">4</option>
              <option :value="5">5</option>
            </select>
          </label>
          <button
            type="button"
            class="btn btn-danger btn-sm"
            @click="selectedMonthKey && removeMonth(selectedMonthKey)"
          >
            この月を削除
          </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import type {
  CalendarLayout,
  MonthLayout,
  MonthBox,
  GridOffset,
} from "../types";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasWrapRef = ref<HTMLDivElement | null>(null);
const importInputRef = ref<HTMLInputElement | null>(null);

const layoutYear = ref(new Date().getFullYear());
const currentImageUrl = ref<string | null>(null);
const currentImageId = ref<string>("page1");
const imageIdToPath = ref<Record<string, string>>({ page1: "" });
const imageNaturalSize = ref({ w: 1, h: 1 });
const layoutMonths = ref<Record<string, MonthLayout>>({});

const selectedMonthKey = ref<string | null>(null);

// 現在表示中の画像（blob URL または data URL）
let currentImageElement: HTMLImageElement | null = null;

const canvasSize = ref({ w: 800, h: 600 });

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function fitSize(
  imgW: number,
  imgH: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const r = Math.min(maxW / imgW, maxH / imgH, 1);
  return { w: Math.round(imgW * r), h: Math.round(imgH * r) };
}

// canvas 上のピクセル座標を画像に対する 0–1 の割合に変換（canvas は等倍縮小で全体表示を想定）
function canvasToNorm(
  canvasX: number,
  canvasY: number,
): { x: number; y: number } {
  const w = canvasSize.value.w;
  const h = canvasSize.value.h;
  const nw = imageNaturalSize.value.w;
  const nh = imageNaturalSize.value.h;
  const scale = Math.min(w / nw, h / nh);
  const offsetX = (w - nw * scale) / 2;
  const offsetY = (h - nh * scale) / 2;
  const x = (canvasX - offsetX) / (nw * scale);
  const y = (canvasY - offsetY) / (nh * scale);
  return { x, y };
}

// 0–1 の割合を canvas ピクセル座標に変換
function normToCanvas(nx: number, ny: number): { x: number; y: number } {
  const w = canvasSize.value.w;
  const h = canvasSize.value.h;
  const nw = imageNaturalSize.value.w;
  const nh = imageNaturalSize.value.h;
  const scale = Math.min(w / nw, h / nh);
  const offsetX = (w - nw * scale) / 2;
  const offsetY = (h - nh * scale) / 2;
  return {
    x: offsetX + nx * nw * scale,
    y: offsetY + ny * nh * scale,
  };
}

const drawState = ref<{
  isDrawing: boolean;
  startNorm: { x: number; y: number };
  currentNorm: { x: number; y: number };
} | null>(null);

function redraw() {
  const canvas = canvasRef.value;
  const img = currentImageElement;
  if (!canvas || !img) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { w, h } = canvasSize.value;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);
  const nw = imageNaturalSize.value.w;
  const nh = imageNaturalSize.value.h;
  const scale = Math.min(w / nw, h / nh);
  const offsetX = (w - nw * scale) / 2;
  const offsetY = (h - nh * scale) / 2;
  ctx.drawImage(img, offsetX, offsetY, nw * scale, nh * scale);

  // 保存済みの monthBox を描画
  ctx.strokeStyle = "rgba(0, 150, 255, 0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  for (const ml of Object.values(layoutMonths.value)) {
    const b = ml.monthBox;
    const tl = normToCanvas(b.x, b.y);
    const br = normToCanvas(b.x + b.width, b.y + b.height);
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  }

  // ドラッグ中の矩形を描画
  if (drawState.value?.isDrawing) {
    const { startNorm, currentNorm } = drawState.value;
    const x = Math.min(startNorm.x, currentNorm.x);
    const y = Math.min(startNorm.y, currentNorm.y);
    const width = Math.abs(currentNorm.x - startNorm.x);
    const height = Math.abs(currentNorm.y - startNorm.y);
    const tl = normToCanvas(x, y);
    const br = normToCanvas(x + width, y + height);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255, 100, 0, 0.9)";
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  }
}

function onPngSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  setImageFromUrl(url);
  input.value = "";
}

async function setImageFromUrl(url: string) {
  if (currentImageUrl.value) URL.revokeObjectURL(currentImageUrl.value);
  currentImageUrl.value = url;
  const img = await loadImageFromUrl(url);
  currentImageElement = img;
  imageNaturalSize.value = { w: img.naturalWidth, h: img.naturalHeight };
  await nextTick();
  const wrap = canvasWrapRef.value;
  if (wrap && wrap.clientWidth > 0) {
    const wrapW = wrap.clientWidth;
    canvasSize.value = {
      w: wrapW,
      h: Math.round(wrapW * (img.naturalHeight / img.naturalWidth)),
    };
  } else {
    canvasSize.value = fitSize(img.naturalWidth, img.naturalHeight, 1400, 1000);
  }
  requestAnimationFrame(redraw);
}

function onCanvasMouseDown(e: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const norm = canvasToNorm(x, y);
  if (norm.x < 0 || norm.x > 1 || norm.y < 0 || norm.y > 1) return;
  drawState.value = {
    isDrawing: true,
    startNorm: { x: norm.x, y: norm.y },
    currentNorm: { x: norm.x, y: norm.y },
  };
  redraw();
}

function onCanvasMouseMove(e: MouseEvent) {
  if (!drawState.value?.isDrawing) return;
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  drawState.value.currentNorm = canvasToNorm(x, y);
  redraw();
}

function onCanvasMouseUp() {
  if (!drawState.value?.isDrawing) return;
  const { startNorm, currentNorm } = drawState.value;
  const x = Math.min(startNorm.x, currentNorm.x);
  const y = Math.min(startNorm.y, currentNorm.y);
  let width = Math.abs(currentNorm.x - startNorm.x);
  let height = Math.abs(currentNorm.y - startNorm.y);
  if (width < 0.02 || height < 0.02) {
    drawState.value = null;
    redraw();
    return;
  }
  const monthStr = prompt("この枠に対応する月（1–12）");
  drawState.value = null;
  if (!monthStr) {
    redraw();
    return;
  }
  const monthNum = parseInt(monthStr, 10);
  if (monthNum < 1 || monthNum > 12) {
    redraw();
    return;
  }
  const key = String(monthNum);
  const g: GridOffset = {
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0.09,
    paddingRight: 0,
  };
  const box: MonthBox = { x, y, width, height };
  layoutMonths.value = {
    ...layoutMonths.value,
    [key]: {
      imageId: currentImageId.value,
      rowCount: 5,
      monthBox: box,
      gridOffset: g,
    },
  };
  selectedMonthKey.value = key;
  redraw();
}

function onCanvasMouseLeave() {
  if (drawState.value) drawState.value.isDrawing = false;
  redraw();
}

function removeMonth(key: string) {
  const next = { ...layoutMonths.value };
  delete next[key];
  layoutMonths.value = next;
  if (selectedMonthKey.value === key) selectedMonthKey.value = null;
  redraw();
}

const selectedMonthLayout = computed(() =>
  selectedMonthKey.value ? layoutMonths.value[selectedMonthKey.value] : null,
);

// グリッドプレビューの canvas 上でのピクセル位置（canvas と同じ座標系）
const gridPreviewStyle = computed(() => {
  const ml = selectedMonthLayout.value;
  if (!ml) return {};
  const b = ml.monthBox;
  const g = ml.gridOffset;
  const nw = imageNaturalSize.value.w;
  const nh = imageNaturalSize.value.h;
  const cw = canvasSize.value.w;
  const ch = canvasSize.value.h;
  const scale = Math.min(cw / nw, ch / nh);
  const offsetX = (cw - nw * scale) / 2;
  const offsetY = (ch - nh * scale) / 2;
  const left = b.x + b.width * g.paddingLeft;
  const top = b.y + b.height * g.paddingTop;
  const width = b.width * (1 - g.paddingLeft - g.paddingRight);
  const height = b.height * (1 - g.paddingTop - g.paddingBottom);
  return {
    left: `${offsetX + left * nw * scale}px`,
    top: `${offsetY + top * nh * scale}px`,
    width: `${width * nw * scale}px`,
    height: `${height * nh * scale}px`,
  };
});

watch(selectedMonthLayout, () => {}, { flush: "post" });

function exportJson() {
  const path = imageIdToPath.value[currentImageId.value] || "calendar_2026.png";
  const images: Record<string, string> = {};
  for (const id of Object.keys(imageIdToPath.value)) {
    if (imageIdToPath.value[id]) images[id] = imageIdToPath.value[id];
  }
  if (Object.keys(images).length === 0) images[currentImageId.value] = path;
  const y = layoutYear.value;
  const layout: CalendarLayout = {
    year: y,
    academicYear: true,
    _note: `年度 ${y}（${y}年4月–${y + 1}年3月）。月キー 4–12 は ${y}年、1–3 は ${y + 1}年。`,
    images,
    months: { ...layoutMonths.value },
  };
  const blob = new Blob([JSON.stringify(layout, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.download = `calendar_layout_${layoutYear.value}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

function onImportJson(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const layout = JSON.parse(reader.result as string) as CalendarLayout;
      layoutYear.value = layout.year;
      layoutMonths.value = { ...layout.months };
      imageIdToPath.value = { ...layout.images };
      const firstId = Object.keys(layout.images)[0];
      if (firstId) currentImageId.value = firstId;
      selectedMonthKey.value = Object.keys(layout.months)[0] ?? null;
      // 画像は読み込まない。配置のみ復元。画像は別途 PNG でアップロードする。
    } catch (err) {
      console.error(err);
      alert("JSON の解析に失敗しました");
    }
    input.value = "";
  };
  reader.readAsText(file);
}
</script>

<style scoped>
.admin-calendar-mapper {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}
.mapper-header h1 {
  font-size: 1.25rem;
  margin-bottom: 8px;
}
.mapper-hint {
  font-size: 12px;
  color: #666;
  margin-bottom: 16px;
}
.mapper-hint code {
  background: #eee;
  padding: 2px 6px;
  border-radius: 4px;
}
.mapper-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
.toolbar-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.label-with-hint {
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
.file-input {
  display: none;
}
.file-label {
  cursor: pointer;
  padding: 6px 12px;
  background: #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
}
.file-label:hover {
  background: #d0d0d0;
}
.form-control {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}
.year-input {
  width: 80px;
}
.path-input {
  width: 220px;
}
.num-input {
  width: 64px;
}
.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.btn-primary {
  background: #0066cc;
  color: #fff;
}
.btn-primary:hover {
  background: #0052a3;
}
.btn-secondary {
  background: #757575;
  color: #fff;
}
.btn-secondary:hover {
  background: #616161;
}
.btn-danger {
  background: #c62828;
  color: #fff;
}
.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}
.empty-state {
  padding: 48px;
  text-align: center;
  color: #666;
  background: #f5f5f5;
  border-radius: 8px;
}
.canvas-wrap {
  position: relative;
  width: 100%;
  max-height: 60vh;
  margin-bottom: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: auto;
}
.mapper-canvas {
  display: block;
  cursor: crosshair;
}
.grid-preview {
  position: absolute;
  pointer-events: none;
  box-sizing: border-box;
  border: 1px solid rgba(0, 150, 255, 0.5);
}
.grid-preview-inner {
  display: grid;
  width: 100%;
  height: 100%;
  gap: 0;
}
.grid-cell {
  border: 1px solid rgba(0, 150, 255, 0.35);
}
.months-panel {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
}
.months-panel h3,
.months-panel h4 {
  margin: 0 0 8px;
  font-size: 14px;
}
.months-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.month-item {
  padding: 4px 12px;
  background: #e8e8e8;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.month-item.selected {
  background: #0066cc;
  color: #fff;
}
.grid-offset-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.grid-offset-editor .editor-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.offset-inputs {
  display: flex;
  gap: 8px;
}
.offset-inputs label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}
</style>
