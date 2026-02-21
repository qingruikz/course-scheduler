<template>
  <Teleport to="body">
    <Transition name="notification">
      <div
        v-if="visible"
        :class="['message-notification', `message-notification--${type}`]"
        role="alert"
      >
        <span class="message-notification__icon" aria-hidden="true">
          {{ iconChar }}
        </span>
        <span class="message-notification__text">{{ message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    message: string;
    type?: "success" | "info" | "warning" | "error";
  }>(),
  { type: "success" }
);

const iconChar = computed(() => {
  switch (props.type) {
    case "success":
      return "✓";
    case "error":
      return "×";
    case "warning":
      return "!";
    case "info":
      return "i";
    default:
      return "✓";
  }
});
</script>

<style scoped>
.message-notification {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 16px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10000;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 90vw;
}

.message-notification--success {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  color: #67c23a;
}

.message-notification--success .message-notification__icon {
  background: #67c23a;
  border-color: #67c23a;
  color: white;
}

.message-notification--info {
  background: #f4f4f5;
  border: 1px solid #e9e9eb;
  color: #909399;
}

.message-notification--info .message-notification__icon {
  background: #909399;
  border-color: #909399;
  color: white;
}

.message-notification--warning {
  background: #fdf6ec;
  border: 1px solid #faecd8;
  color: #e6a23c;
}

.message-notification--warning .message-notification__icon {
  background: #e6a23c;
  border-color: #e6a23c;
  color: white;
}

.message-notification--error {
  background: #fef0f0;
  border: 1px solid #fde2e2;
  color: #f56c6c;
}

.message-notification--error .message-notification__icon {
  background: #f56c6c;
  border-color: #f56c6c;
  color: white;
}

.message-notification__icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  font-weight: bold;
}

.message-notification__text {
  flex: 1;
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
