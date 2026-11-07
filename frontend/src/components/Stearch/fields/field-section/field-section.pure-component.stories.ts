import type { Meta, StoryObj } from "@storybook/vue3-vite";
import {
  MULTI_FIELD,
  RANGE_FIELD,
  TRI_STATE_FIELD,
} from "../fields.story-args";
import FieldSection from "./field-section.pure-component.vue";

const meta: Meta<typeof FieldSection> = {
  title: "Stearch/fields/field-section/field-section.pure-component.vue",
  tags: ["!autodocs"],
  component: FieldSection,
  args: {
    field: MULTI_FIELD,
    minLabel: "Min hours",
    maxLabel: "Max hours",
  },
};

export default meta;

type Story = StoryObj<typeof FieldSection>;

export const Multi: Story = {};

export const TriState: Story = { args: { field: TRI_STATE_FIELD } };

export const Range: Story = { args: { field: RANGE_FIELD } };
