<script setup lang="ts">
import { useKeyDriver } from "../content/list/use-key-driver";
import FieldList from "../fields/field-list/field-list.container.vue";
import SidebarFooter from "./sidebar-footer.container.vue";
import SidebarHeader from "./sidebar-header.container.vue";
import { createSidebarKeyDriver } from "./sidebar.driver";
import SidebarLayout from "./sidebar.pure-layout.vue";

useKeyDriver(createSidebarKeyDriver());
</script>

<template>
  <SidebarLayout
    role="region"
    aria-label="Filters"
    :header="SidebarHeader"
    :body="FieldList"
    :footer="SidebarFooter"
  />
</template>
