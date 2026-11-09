import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { MULTI_FIELD } from "../fields.story-args";
import LogicSwitch from "./logic-switch.pure-component.vue";

const meta: Meta<typeof LogicSwitch> = {
  title: "Stearch/ui/fields/logic-switch/logic-switch.pure-component.vue",
  tags: ["!autodocs"],
  component: LogicSwitch,
  args: { options: MULTI_FIELD.logic },
};

export default meta;

export const Playground: StoryObj<typeof LogicSwitch> = {};
