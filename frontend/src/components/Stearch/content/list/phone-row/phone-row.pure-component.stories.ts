import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, within } from "storybook/test";
import { computed } from "vue";
import {
  ITEM_ARG_TYPES,
  ITEM_ARGS,
  ITEM_PRESS_ACTIONS,
  ITEM_VERBS,
  itemFromArgs,
  type ItemStoryArgs,
} from "../item.story-args";
import PhoneRowPure from "./phone-row.pure-component.vue";

const meta: Meta<ItemStoryArgs> = {
  title: "Stearch/content/list/phone-row/phone-row.pure-component.vue",
  tags: ["!autodocs"],
  argTypes: ITEM_ARG_TYPES,
  args: ITEM_ARGS,
  render: (args) => ({
    components: { PhoneRowPure },
    setup: () => ({
      args,
      verbs: ITEM_VERBS,
      row: computed(() => itemFromArgs(args)),
    }),
    template: `
      <div style="width: 288px">
        <PhoneRowPure :row="row" :verbs="verbs" @press="args.onPress" />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ItemStoryArgs>;

export const Playground: Story = {};

export const PressingHandsActionsBack: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    await expect(args.onPress).toHaveBeenCalledWith(ITEM_PRESS_ACTIONS);
  },
};
