<script setup lang="ts">
import FieldList from "../fields/field-list/field-list.container.vue";
import SidebarFooter from "./sidebar-footer.container.vue";
import SidebarHeader from "./sidebar-header.container.vue";
import SidebarLayout from "./sidebar.pure-layout.vue";
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
