<script setup lang="ts">
import { RBtn } from "@/lib";
import type { ItemEmits } from "../../content/list/item.props";
import type { BarProps } from "../sidebar.props";

defineProps<BarProps>();

defineEmits<ItemEmits>();
</script>

<template>
  <div class="stearch-bar">
    <strong v-if="title" class="stearch-bar__title">{{ title }}</strong>
    <RBtn
      v-for="verb in verbs"
      :key="verb.id"
      variant="text"
      @click="$emit('press', verb.actions)"
    >
      {{ verb.label }}
    </RBtn>
  </div>
</template>

<style scoped>
.stearch-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--r-space-2);
  padding: var(--r-space-2);
}
.stearch-bar__title {
  flex: 1;
  min-width: 0;
}
</style>
