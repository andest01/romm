<script setup lang="ts">
import { computed, onMounted, shallowRef } from "vue";
import collectionApi from "@/services/api/collection";
import {
  type ActionEntry,
  selectBulkMenu,
} from "../../../store/action-menu.selectors";
import { selectIsActionsOpen } from "../../../store/stearch.selectors";
import stearchStore from "../../../store/stearch.store";
import ActionMenu from "./action-menu.pure-component.vue";

// Stub label: move to a locale key before this leaves the fork.
const FAILED = "That didn't work. Try again.";

const store = stearchStore();
const message = shallowRef("");
const menu = computed(() => selectBulkMenu(store.state));
const isOpen = computed(
  () => selectIsActionsOpen(store.state) && menu.value !== null,
);

onMounted(() => {
  collectionApi.getCollections().then(
    ({ data }) => {
      store.dispatch([
        {
          type: "view/set",
          patch: { collections: data.map(({ id, name }) => ({ id, name })) },
        },
      ]);
    },
    () => undefined,
  );
});

function close(): void {
  message.value = "";
  store.dispatch([{ type: "view/set", patch: { isActionsOpen: false } }]);
}

async function run({ verb }: ActionEntry): Promise<void> {
  try {
    if (verb.kind === "dispatch") store.dispatch(verb.actions);
    if (verb.kind === "add-to-collection") {
      await collectionApi.addRomsToCollection(verb.collectionId, [
        ...verb.romIds,
      ]);
    }
    close();
  } catch {
    message.value = FAILED;
  }
}
</script>

<template>
  <ActionMenu
    :is-open="isOpen"
    :title="menu?.title ?? ''"
    :entries="menu?.entries ?? []"
    :message="message"
    @close="close"
    @run="run"
  />
</template>
