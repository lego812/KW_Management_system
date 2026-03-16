<script setup>
const props = defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  icon: { type: [Object, Function, String], default: null },
  iconSize: { type: Number, default: 16 },
  iconStrokeWidth: { type: Number, default: 1.9 },
})
</script>

<template>
  <article class="panel stat-card">
    <h2>
      <component :is="props.icon" v-if="props.icon" :size="props.iconSize" :stroke-width="props.iconStrokeWidth" />
      {{ props.label }}
    </h2>
    <strong>{{ props.value }}</strong>
  </article>
</template>

<style scoped>
.panel {
  background: var(--kw-surface);
  border: 1px solid var(--kw-line);
  border-radius: var(--kw-radius-lg);
  padding: 18px;
  box-shadow: var(--kw-shadow-card);
}

.stat-card h2 {
  margin: 0;
  font-size: 13px;
  color: var(--kw-text-soft);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-card strong {
  display: block;
  margin-top: 8px;
  font-size: 28px;
  line-height: 1;
}
</style>
