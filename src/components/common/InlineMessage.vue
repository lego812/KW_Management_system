<script setup>
const props = defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'error' },
  panel: { type: Boolean, default: false },
  center: { type: Boolean, default: false },
})
</script>

<template>
  <p v-if="props.message" class="message" :class="[props.type, { panel: props.panel, center: props.center }]">
    {{ props.message }}
  </p>
</template>

<style scoped>
.message {
  margin: 0 0 10px;
  font-size: 13px;
}

.message.panel {
  background: var(--kw-surface);
  border: 1px solid var(--kw-line);
  border-radius: var(--kw-radius-lg);
  padding: 18px;
  box-shadow: var(--kw-shadow-card);
  margin-bottom: 0;
}

.message.center {
  text-align: center;
}

.error {
  color: var(--kw-danger-text);
}

.success {
  color: var(--kw-success-text);
}

.notice {
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  padding: 8px 10px;
}
</style>
