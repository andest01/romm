<script setup lang="ts">
// Dev-only readout of the three attention states, so none of them is hidden
// while focus travel is being built (spec 007, "Attention states").
import { computed } from "vue";
import {
  selectCurrentGame,
  selectSelectedGames,
} from "../store/attention.selectors";
import { selectActiveId, selectSelectedIds } from "../store/stearch.selectors";
import stearchStore from "../store/stearch.store";
import { useContentView } from "./content.view";

const store = stearchStore();
const { activePosition, cruiseStack } = useContentView();
const currentId = computed(() => selectActiveId(store.state));
const currentName = computed(() => selectCurrentGame(store.state)?.name);
const selectedIds = computed(() => selectSelectedIds(store.state));
const selectedNames = computed(() =>
  selectSelectedGames(store.state).map((rom) => rom.name),
);
</script>

<template>
  <aside class="stearch-attention-debug" aria-label="Attention states (dev)">
    <span v-if="cruiseStack" data-testid="score-multiplier">
      {{ cruiseStack }}x
    </span>
    <span class="stearch-attention-debug__key">
      key position: {{ activePosition ?? "none" }}
    </span>
    <span class="stearch-attention-debug__current">
      current (activeId): {{ currentId ?? "none" }}
      <template v-if="currentName">· {{ currentName }}</template>
    </span>
    <span class="stearch-attention-debug__selected">
      selected ({{ selectedIds.length }}):
      {{ selectedIds.join(", ") || "none" }}
      <template v-if="selectedNames.length">
        · {{ selectedNames.join(", ") }}
      </template>
    </span>
  </aside>
</template>

<style scoped>
.stearch-attention-debug {
  position: fixed;
  z-index: 1000;
  inset-block-end: var(--r-space-2);
  inset-inline-start: 50%;
  display: flex;
  gap: var(--r-space-4);
  max-inline-size: 90vw;
  padding: var(--r-space-1) var(--r-space-3);
  overflow: hidden;
  transform: translateX(-50%);
  border-radius: var(--r-radius-md);
  background: var(--r-color-bg);
  color: var(--r-color-fg);
  font: 0.75rem / 1.4 monospace;
  white-space: nowrap;
  text-overflow: ellipsis;
  pointer-events: none;
}
/* Each label carries its state's visual channel from the list and table. */
.stearch-attention-debug__key {
  outline: 2px dashed var(--r-color-info);
  outline-offset: 1px;
}
.stearch-attention-debug__current {
  padding-inline: var(--r-space-1);
  background-image: repeating-linear-gradient(
    135deg,
    color-mix(in srgb, var(--r-color-brand-primary) 40%, transparent) 0 6px,
    transparent 6px 12px
  );
}
.stearch-attention-debug__selected {
  background: color-mix(in srgb, var(--r-color-success) 22%, transparent);
}
</style>
