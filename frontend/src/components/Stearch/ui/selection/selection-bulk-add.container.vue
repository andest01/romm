<script setup lang="ts">
import { onMounted, shallowRef } from "vue";
import { RBtn, RMenu, RMenuItem } from "@/lib";
import collectionApi from "@/services/api/collection";
import { selectSelectedIds } from "../../store/stearch.selectors";
import stearchStore from "../../store/stearch.store";

// Stub labels: move to locale keys before this leaves the fork.
const LABEL = "Add to collection";
const ADD_FAILED = "Couldn't add to that collection.";
const LOAD_FAILED = "Couldn't load your collections.";

const store = stearchStore();
const collections = shallowRef<readonly { id: number; name: string }[]>([]);
const message = shallowRef("");

onMounted(() => {
  collectionApi.getCollections().then(
    ({ data }) => {
      collections.value = data;
    },
    () => {
      message.value = LOAD_FAILED;
    },
  );
});

// The selection stays: adding is not the end of working with these games.
async function add(id: number, name: string): Promise<void> {
  const ids = [...selectSelectedIds(store.state)];
  try {
    await collectionApi.addRomsToCollection(id, ids);
    message.value = `Added ${ids.length} to ${name}.`;
  } catch {
    message.value = ADD_FAILED;
  }
}
</script>

<template>
  <RMenu location="top start">
    <template #activator="{ props: activatorProps }">
      <RBtn v-bind="activatorProps" variant="text">{{ LABEL }}</RBtn>
    </template>
    <RMenuItem
      v-for="collection in collections"
      :key="collection.id"
      :label="collection.name"
      @click="add(collection.id, collection.name)"
    />
  </RMenu>
  <span aria-live="polite">{{ message }}</span>
</template>
