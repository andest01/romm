<script setup lang="ts">
import { RBtn, RMenu, RMenuItem, RTextField } from "@/lib";

defineProps<{
  label: string;
  name: string;
  nameLabel: string;
  saveLabel: string;
  canSave: boolean;
  searches: readonly { id: number; name: string }[];
  /** The last outcome, including anything a load had to drop. */
  message: string;
}>();

defineEmits<{ "update:name": [name: string]; save: []; load: [id: number] }>();
</script>

<template>
  <RMenu location="bottom end" :close-on-content-click="false">
    <template #activator="{ props: activatorProps }">
      <RBtn v-bind="activatorProps" variant="text">{{ label }}</RBtn>
    </template>
    <div class="stearch-saved-searches">
      <RTextField
        :model-value="name"
        :placeholder="nameLabel"
        :aria-label="nameLabel"
        @update:model-value="$emit('update:name', $event)"
      />
      <RBtn variant="outlined" :disabled="!canSave" @click="$emit('save')">
        {{ saveLabel }}
      </RBtn>
      <p aria-live="polite" class="stearch-saved-searches__message">
        {{ message }}
      </p>
    </div>
    <RMenuItem
      v-for="search in searches"
      :key="search.id"
      :label="search.name"
      @click="$emit('load', search.id)"
    />
  </RMenu>
</template>

<style scoped>
.stearch-saved-searches {
  display: flex;
  flex-direction: column;
  gap: var(--r-space-2);
  padding: var(--r-space-2);
}
.stearch-saved-searches__message {
  margin: 0;
  color: var(--r-color-fg-secondary);
  font-size: 0.75em;
}
</style>
