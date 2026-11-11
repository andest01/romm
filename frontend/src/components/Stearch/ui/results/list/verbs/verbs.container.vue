<script setup lang="ts">
import GameActionBtn from "@/components/GameActions/GameActionBtn.vue";
import type { VerbsProps } from "../item.props";

defineProps<VerbsProps>();
</script>

<template>
  <span class="stearch-verbs" @click.stop>
    <GameActionBtn
      v-if="!isCompact"
      :rom="rom"
      action="favorite"
      size="small"
      variant="bare"
    />
    <GameActionBtn :rom="rom" action="more" size="small" variant="bare" />
  </span>
</template>

<style scoped>
.stearch-verbs {
  display: inline-flex;
  flex: none;
  align-items: center;
}
</style>
