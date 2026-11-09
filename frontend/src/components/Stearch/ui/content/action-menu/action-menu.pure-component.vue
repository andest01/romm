<script setup lang="ts">
import { RBtn, RDialog } from "@/lib";
import type { ActionEntry } from "../../../store/action-menu.selectors";

defineProps<{
  isOpen: boolean;
  title: string;
  entries: readonly ActionEntry[];
  /** Why the last verb failed; empty otherwise. */
  message: string;
}>();

defineEmits<{ close: []; run: [entry: ActionEntry] }>();
</script>

<template>
  <RDialog
    :model-value="isOpen"
    :aria-label="title"
    :width="420"
    scroll-content
    @update:model-value="$emit('close')"
  >
    <template #content>
      <div class="stearch-action-menu">
        <RBtn
          v-for="entry in entries"
          :key="entry.id"
          variant="text"
          class="stearch-action-menu__entry"
          @click="$emit('run', entry)"
        >
          {{ entry.label }}
        </RBtn>
        <p aria-live="polite">{{ message }}</p>
      </div>
    </template>
  </RDialog>
</template>

<style scoped>
.stearch-action-menu {
  display: flex;
  flex-direction: column;
  gap: var(--r-space-1);
}
.stearch-action-menu__entry {
  justify-content: flex-start;
}
</style>
