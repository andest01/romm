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
} from "../../list/item.story-args";
import RowPure from "./row.pure-component.vue";

const meta: Meta<ItemStoryArgs> = {
  title: "Stearch/ui/results/table/row/row.pure-component.vue",
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: ITEM_ARG_TYPES,
  args: ITEM_ARGS,
  render: (args) => ({
    components: { RowPure },
    setup: () => ({
      args,
      verbs: ITEM_VERBS,
      row: computed(() => itemFromArgs(args)),
    }),
    template: `
      <div role="table" aria-label="Games">
        <RowPure
          :row="row"
          :verbs="verbs"
          grid-template="minmax(0, 3fr) minmax(0, 1fr) 90px 100px 100px 80px 70px 90px 80px 64px"
          :cell-count="10"
          @press="args.onPress"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ItemStoryArgs>;

export const Playground: Story = {};

export const PressingHandsActionsBack: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("row"));
    await expect(args.onPress).toHaveBeenCalledWith(ITEM_PRESS_ACTIONS);
  },
};
