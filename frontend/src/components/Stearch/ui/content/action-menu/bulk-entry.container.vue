<script setup lang="ts">
import { computed } from "vue";
import { RDivider, RMenuItem } from "@/lib";
import { selectBulkMenu } from "../../../store/action-menu.selectors";
import stearchStore from "../../../store/stearch.store";

const store = stearchStore();
const menu = computed(() => selectBulkMenu(store.state));
</script>

<template>
  <template v-if="menu">
    <RMenuItem
      :label="menu.title"
      icon="mdi-checkbox-multiple-marked-outline"
      @click="
        store.dispatch([{ type: 'view/set', patch: { isActionsOpen: true } }])
      "
    />
    <RDivider />
  </template>
</template>
