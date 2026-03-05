<script setup>
const props = defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  meta: { type: String, default: '' },
  icon: { type: [Object, Function, String], default: null },
  iconSize: { type: Number, default: 22 },
  iconStrokeWidth: { type: Number, default: 1.9 },
})
</script>

<template>
  <header class="panel header-panel">
    <p v-if="props.eyebrow" class="eyebrow">{{ props.eyebrow }}</p>
    <h1>
      <component :is="props.icon" v-if="props.icon" :size="props.iconSize" :stroke-width="props.iconStrokeWidth" />
      {{ props.title }}
    </h1>
    <p v-if="props.subtitle" class="sub">{{ props.subtitle }}</p>
    <p v-if="props.meta" class="meta">{{ props.meta }}</p>
  </header>
</template>

<style scoped>
.panel {
  background: var(--kw-surface);
  border: 1px solid var(--kw-line);
  border-radius: var(--kw-radius-lg);
  padding: 18px;
  box-shadow: var(--kw-shadow-card);
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--kw-text-soft);
  text-transform: uppercase;
}

.header-panel h1 {
  margin: 6px 0 8px;
  font-size: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sub {
  margin: 0;
  color: var(--kw-text-muted);
}

.meta {
  margin: 8px 0 0;
  color: var(--kw-text-soft);
  font-size: 13px;
}
</style>
