<script setup lang="ts">
import GameListRow from "@/components/Gallery/GameListRow.vue";
import type { ItemEmits, ItemProps } from "../item.props";

defineProps<ItemProps>();
defineEmits<ItemEmits>();
</script>

<template>
  <GameListRow
    :rom="row"
    @mouseenter="row && $emit('press', row.hoverActions)"
    @focusin="row && $emit('press', row.hoverActions)"
  />
</template>
