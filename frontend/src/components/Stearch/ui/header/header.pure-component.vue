<script setup lang="ts">
import { RBtn, RMenu, RMenuItem, RSegmentedControl, RTextField } from "@/lib";
import type { StearchAction } from "../../store/stearch.actions";
import FieldPicker from "../fields/field-picker/field-picker.pure-component.vue";
import FieldPill from "../fields/field-pill/field-pill.pure-component.vue";
import type { HeaderProps } from "./header.props";

defineProps<HeaderProps>();

defineEmits<{
  press: [actions: readonly StearchAction[]];
  search: [term: string];
}>();
</script>

<template>
  <div class="stearch-header">
    <div
      class="stearch-header__row"
      role="search"
      :aria-label="search.placeholder"
    >
      <RTextField
        class="stearch-header__field"
        :model-value="search.term"
        :placeholder="search.placeholder"
        :aria-label="search.placeholder"
        @update:model-value="$emit('search', $event)"
      />
      <span aria-live="polite">{{ search.resultCount }}</span>
      <RMenu location="bottom start" :close-on-content-click="false">
        <template #activator="{ props: activatorProps }">
          <RBtn v-bind="activatorProps" variant="outlined">
            {{ filters.addLabel }}
          </RBtn>
        </template>
        <template v-if="filters.openField">
          <RBtn
            variant="text"
            @click="$emit('press', filters.closeFieldActions)"
          >
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
            <span class="stearch-header__sort-full" aria-hidden="true">
              {{ sort.label }}
            </span>
            <span class="stearch-header__sort-short" aria-hidden="true">
              {{ sort.shortLabel }}
            </span>
          </RBtn>
        </template>
        <p class="stearch-header__sort-title">{{ sort.sortByLabel }}</p>
        <RMenuItem
          v-for="option in sort.options"
          :key="option.id"
          :label="option.label"
          :variant="option.isActive ? 'active' : 'default'"
          @click="$emit('press', option.actions)"
        />
        <p class="stearch-header__sort-title">{{ sort.directionLabel }}</p>
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
    <div v-if="filters.pills.length > 0" class="stearch-header__pills">
      <FieldPill
        v-for="pill in filters.pills"
        :key="pill.id"
        :field="pill"
        @press="$emit('press', $event)"
      />
      <RBtn variant="text" @click="$emit('press', filters.clearActions)">
        {{ filters.clearLabel }}
      </RBtn>
    </div>
  </div>
</template>

<style scoped>
.stearch-header {
  display: flex;
  flex-direction: column;
  gap: var(--r-space-2);
  padding: var(--r-space-2) var(--r-row-pad);
}
.stearch-header__row {
  /* The sort button answers to the header's own width. */
  container-type: inline-size;
  display: flex;
  align-items: center;
  gap: var(--r-space-2);
}
.stearch-header__sort-short {
  display: none;
}
.stearch-header__sort-title {
  margin: var(--r-space-2) var(--r-space-2) var(--r-space-1);
  color: var(--r-color-fg-secondary);
  font-size: 0.75em;
}
@container (max-width: 900px) {
  .stearch-header__sort-full {
    display: none;
  }
  .stearch-header__sort-short {
    display: inline;
  }
}
@container (max-width: 640px) {
  .stearch-header__sort-short {
    display: none;
  }
}
.stearch-header__field {
  flex: 1;
  min-width: 0;
}
.stearch-header__pills {
  display: flex;
  align-items: center;
  gap: var(--r-space-2);
  overflow-x: auto;
}
html[data-bp~="xs"] .stearch-header {
  padding-inline: var(--r-space-2);
}
html[data-bp~="xs"] .stearch-header__row {
  flex-wrap: wrap;
}
</style>
