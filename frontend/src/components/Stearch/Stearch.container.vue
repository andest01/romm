<script setup lang="ts">
import { computed, onMounted, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import { buildLabels } from "./Stearch.labels";
import { selectPanelLayout } from "./Stearch.layout.selectors";
import StearchLayout from "./Stearch.pure-layout.vue";
import stearchStore from "./Stearch.store";
import ContentContainer from "./content/content.container.vue";
import FooterContainer from "./footer/footer.container.vue";
import HeaderContainer from "./header/header.container.vue";
import SidebarContainer from "./sidebar/sidebar.container.vue";

const { t } = useI18n();
const store = stearchStore();
const panelLayout = computed(() => selectPanelLayout(store.state));

watchEffect(() => {
  store.dispatch([{ type: "locale/set", labels: buildLabels(t) }]);
});
onMounted(store.start);
</script>

<template>
  <StearchLayout
    :header="HeaderContainer"
    :panel="SidebarContainer"
    :content="ContentContainer"
    :footer="FooterContainer"
    :background="null"
    :panel-layout="panelLayout"
  />
</template>
