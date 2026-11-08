<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PlatformSelect from "@/components/shared/PlatformSelect.vue";
import storePlatforms from "@/stores/platforms";
import { selectPlatformIds } from "../../store/selectors";
import stearchStore from "../../store/store";

defineProps<{ label: string }>();

const { t } = useI18n();
const store = stearchStore();
const platforms = storePlatforms();
const selected = computed(() => selectPlatformIds(store.state));
</script>

<template>
  <PlatformSelect
    :model-value="selected"
    :items="platforms.allPlatforms"
    :label="label"
    multiple
    clearable
    hide-details
    promote-filled
    :placeholder="t('common.all-platforms')"
    @update:model-value="
      (value) =>
        store.dispatch([{ type: 'query/set', patch: { platformIds: value } }])
    "
  />
</template>
