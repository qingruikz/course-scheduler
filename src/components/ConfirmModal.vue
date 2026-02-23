<template>
  <div v-if="visible" class="modal-overlay" @click="onCancel">
    <div class="modal-content confirm-modal-content" @click.stop>
      <div class="modal-body">
        <p class="confirm-message">{{ message }}</p>
        <div class="confirm-actions">
          <button type="button" class="btn-cancel" @click="onCancel">
            {{ cancelText }}
          </button>
          <button type="button" class="btn-confirm" @click="onConfirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  message: string;
  confirmText?: string;
  cancelText?: string;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function onConfirm() {
  emit("confirm");
}

function onCancel() {
  emit("cancel");
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90vw;
}

.modal-body {
  padding: 20px;
}

.confirm-message {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #333;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel {
  padding: 8px 16px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #333;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-confirm {
  padding: 8px 16px;
  font-size: 13px;
  border: none;
  border-radius: 4px;
  background: #c62828;
  color: white;
  cursor: pointer;
}

.btn-confirm:hover {
  background: #b71c1c;
}
</style>
