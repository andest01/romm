import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { MULTI_FIELD, TRI_STATE_FIELD } from "../fields.story-args";
import FieldPill from "./field-pill.pure-component.vue";

const meta: Meta<typeof FieldPill> = {
  title: "Stearch/ui/fields/field-pill/field-pill.pure-component.vue",
  tags: ["!autodocs"],
  component: FieldPill,
  args: { field: MULTI_FIELD },
};

export default meta;

type Story = StoryObj<typeof FieldPill>;

export const OpensAPicker: Story = {};

export const RemoveOnly: Story = { args: { field: TRI_STATE_FIELD } };
