<script setup lang="ts">
import { computed, onMounted, shallowRef } from "vue";
import collectionApi from "@/services/api/collection";
import { criteriaToQuery, queryToCriteria } from "../../store/saved-search";
import { selectQuery } from "../../store/stearch.selectors";
import stearchStore from "../../store/stearch.store";
import SavedSearches from "./saved-searches.pure-component.vue";

// Stub labels: move to locale keys before this leaves the fork.
const LABEL = "Saved searches";
const NAME_LABEL = "Name this search";
const SAVE_LABEL = "Save as smart collection";
const SAVED = "Saved.";
const SAVE_FAILED = "Couldn't save this search.";
const LOAD_FAILED = "Couldn't load that search.";
const LOADED = "Loaded.";

const store = stearchStore();
const name = shallowRef("");
const message = shallowRef("");
const collections = shallowRef<
  readonly { id: number; name: string; filter_criteria: object }[]
>([]);
const canSave = computed(() => name.value.trim().length > 0);

async function refresh(): Promise<void> {
  const { data } = await collectionApi.getSmartCollections();
  collections.value = data;
}

onMounted(() => {
  refresh().catch(() => {
    message.value = LOAD_FAILED;
  });
});

async function save(): Promise<void> {
  try {
    await collectionApi.createSmartCollection({
      smartCollection: {
        name: name.value.trim(),
        filter_criteria: queryToCriteria(selectQuery(store.state)),
      },
    });
    name.value = "";
    message.value = SAVED;
    await refresh();
  } catch {
    message.value = SAVE_FAILED;
  }
}

function load(id: number): void {
  const found = collections.value.find((search) => search.id === id);
  if (!found) return;
  const { query, dropped } = criteriaToQuery({ ...found.filter_criteria });
  store.dispatch([{ type: "query/set", patch: query }]);
  message.value =
    dropped.length > 0 ? `Loaded, except: ${dropped.join(", ")}.` : LOADED;
}
</script>

<template>
  <SavedSearches
    v-model:name="name"
    :label="LABEL"
    :name-label="NAME_LABEL"
    :save-label="SAVE_LABEL"
    :can-save="canSave"
    :searches="collections"
    :message="message"
    @save="save"
    @load="load"
  />
</template>
