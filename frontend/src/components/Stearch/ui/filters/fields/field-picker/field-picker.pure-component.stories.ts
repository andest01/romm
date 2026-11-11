import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { MULTI_FIELD } from "../fields.story-args";
import FieldPicker from "./field-picker.pure-component.vue";

const meta: Meta<typeof FieldPicker> = {
  title:
    "Stearch/ui/filters/fields/field-picker/field-picker.pure-component.vue",
  tags: ["!autodocs"],
  component: FieldPicker,
  args: { field: MULTI_FIELD },
};

export default meta;

export const Playground: StoryObj<typeof FieldPicker> = {};
