import type { Meta, StoryObj } from "@storybook/vue3-vite";
import {
  MULTI_FIELD,
  TRI_STATE_FIELD,
} from "../filters/fields/fields.story-args";
import HeaderPills from "./header-pills.pure-component.vue";

const meta: Meta<typeof HeaderPills> = {
  title: "Stearch/ui/header/header-pills.pure-component.vue",
  tags: ["!autodocs"],
  component: HeaderPills,
  args: {
    pills: [MULTI_FIELD, TRI_STATE_FIELD],
    clearLabel: "Clear all",
    clearActions: [],
  },
};

export default meta;

export const Playground: StoryObj<typeof HeaderPills> = {};
