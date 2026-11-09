<script setup lang="ts">
import type { RailValue } from "../../../../store/sort.fields";

defineProps<{ value: RailValue }>();
</script>

<template>
  <span v-if="value.kind === 'stars'">★ {{ value.stars }}+</span>
  <span v-else-if="value.kind === 'year'">{{ value.year }}</span>
  <span v-else>{{ value.text }}</span>
</template>
