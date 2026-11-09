<script setup lang="ts">
import type { RailValue } from "../rail.props";

defineProps<{ value: RailValue }>();
</script>

<template>
  <span v-if="value.kind === 'stars'" aria-hidden="true">
    {{ "★".repeat(value.stars) }}
  </span>
  <span v-else-if="value.kind === 'year'" aria-hidden="true">
    {{ value.year }}
  </span>
  <span v-else aria-hidden="true">{{ value.text }}</span>
</template>
