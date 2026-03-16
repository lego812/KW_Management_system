<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
  maxWidth: { type: String, default: '560px' },
})

const emit = defineEmits(['close'])

function onBackdropClick() {
  emit('close')
}
</script>

<template>
  <div v-if="props.show" class="modal-backdrop" @click.self="onBackdropClick">
    <div class="modal-panel" :style="{ maxWidth: props.maxWidth }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 50;
}

.modal-panel {
  width: 100%;
  background: var(--kw-surface);
  border: 1px solid var(--kw-line);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--kw-shadow-card);
}
</style>
