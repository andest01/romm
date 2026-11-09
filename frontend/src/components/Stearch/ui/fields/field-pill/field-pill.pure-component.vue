<script setup lang="ts">
import { RChip, RMenu } from "@/lib";
import type { StearchAction } from "../../../store/stearch.actions";
import FieldPicker from "../field-picker/field-picker.pure-component.vue";
import type { FieldPreview } from "../fields.props";

defineProps<{ field: FieldPreview }>();

defineEmits<{ press: [actions: readonly StearchAction[]] }>();
</script>

<template>
  <RMenu v-if="field.kind === 'multi'" :close-on-content-click="false">
    <template #activator="{ props: activatorProps }">
      <RChip
        v-bind="activatorProps"
        closable
        @click:close="$emit('press', field.clearActions)"
      >
        {{ field.summary }}
      </RChip>
    </template>
    <FieldPicker :field="field" @press="$emit('press', $event)" />
  </RMenu>
  <RChip v-else closable @click:close="$emit('press', field.clearActions)">
    {{ field.summary }}
  </RChip>
</template>
