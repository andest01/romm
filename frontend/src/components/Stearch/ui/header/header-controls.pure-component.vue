<script setup lang="ts">
import type { Component } from "vue";
import { RBtn, RMenu, RMenuItem, RSegmentedControl } from "@/lib";
import type { StearchAction } from "../../store/stearch.actions";
import FieldPicker from "../filters/fields/field-picker/field-picker.pure-component.vue";
import type { HeaderProps } from "./header.props";

defineProps<
  Pick<HeaderProps, "advanced" | "sort" | "view"> & {
    groupLabel: string;
    filters: HeaderProps["filters"];
    savedSearches: Component | null;
  }
>();

defineEmits<{ press: [actions: readonly StearchAction[]] }>();
</script>

<template>
  <div class="stearch-header-controls" role="group" :aria-label="groupLabel">
    <RMenu location="bottom start" :close-on-content-click="false">
      <template #activator="{ props: activatorProps }">
        <RBtn v-bind="activatorProps" variant="outlined">
          {{ filters.addLabel }}
        </RBtn>
      </template>
      <template v-if="filters.openField">
        <RBtn variant="text" @click="$emit('press', filters.closeFieldActions)">
          {{ filters.closeFieldLabel }}
        </RBtn>
        <FieldPicker
          :field="filters.openField"
          @press="$emit('press', $event)"
        />
      </template>
      <template v-else>
        <RMenuItem
          v-for="field in filters.addFields"
          :key="field.id"
          :label="field.label"
          @click="$emit('press', field.openActions)"
        />
      </template>
    </RMenu>
    <component :is="savedSearches" v-if="savedSearches" />
    <RBtn
      variant="text"
      :aria-pressed="advanced.isOpen"
      @click="$emit('press', advanced.actions)"
    >
      {{ advanced.label }}
    </RBtn>
    <RMenu location="bottom end" :close-on-content-click="false">
      <template #activator="{ props: activatorProps }">
        <RBtn
          v-bind="activatorProps"
          variant="outlined"
          :aria-label="sort.accessibleLabel"
        >
          <span aria-hidden="true">⇅</span>
          <span class="stearch-header-controls__sort-full" aria-hidden="true">
            {{ sort.label }}
          </span>
          <span class="stearch-header-controls__sort-short" aria-hidden="true">
            {{ sort.shortLabel }}
          </span>
        </RBtn>
      </template>
      <p class="stearch-header-controls__sort-title">{{ sort.sortByLabel }}</p>
      <RMenuItem
        v-for="option in sort.options"
        :key="option.id"
        :label="option.label"
        :variant="option.isActive ? 'active' : 'default'"
        @click="$emit('press', option.actions)"
      />
      <p class="stearch-header-controls__sort-title">
        {{ sort.directionLabel }}
      </p>
      <RMenuItem
        v-for="direction in sort.directions"
        :key="direction.id"
        :label="direction.label"
        :variant="direction.isActive ? 'active' : 'default'"
        @click="$emit('press', direction.actions)"
      />
    </RMenu>
    <RSegmentedControl
      :model-value="view.mode"
      :items="view.options"
      @update:model-value="$emit('press', view.actions)"
    />
  </div>
</template>

<style scoped>
.stearch-header-controls {
  display: flex;
  align-items: center;
  gap: var(--r-space-2);
}
.stearch-header-controls__sort-short {
  display: none;
}
.stearch-header-controls__sort-title {
  margin: var(--r-space-2) var(--r-space-2) var(--r-space-1);
  color: var(--r-color-fg-secondary);
  font-size: 0.75em;
}
@container (max-width: 900px) {
  .stearch-header-controls__sort-full {
    display: none;
  }
  .stearch-header-controls__sort-short {
    display: inline;
  }
}
@container (max-width: 640px) {
  .stearch-header-controls__sort-short {
    display: none;
  }
}
</style>
