<script setup lang="ts">
import type { BackgroundProps } from "./background.props";

defineProps<BackgroundProps>();
</script>

<template>
  <Transition name="stearch-background">
    <div
      v-if="url"
      :key="url"
      class="stearch-background"
      :style="{ backgroundImage: `url('${url}')` }"
      aria-hidden="true"
    />
  </Transition>
</template>

<style scoped>
/* Two keyed layers overlap during the fade, so the cross-fade needs no state.
   The delay stops a cursor crossing rows from flashing every cover. */
.stearch-background {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: cover;
  opacity: 0.2;
}
.stearch-background-enter-active {
  transition: opacity var(--r-motion-slow) var(--r-motion-ease-out) 80ms;
}
.stearch-background-leave-active {
  transition: opacity var(--r-motion-slow) var(--r-motion-ease-out);
}
.stearch-background-enter-from,
.stearch-background-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .stearch-background-enter-active,
  .stearch-background-leave-active {
    transition: none;
  }
}
</style>
