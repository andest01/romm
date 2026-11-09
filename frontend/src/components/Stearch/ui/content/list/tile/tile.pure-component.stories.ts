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
import TilePure from "./tile.pure-component.vue";

const meta: Meta<ItemStoryArgs> = {
  title: "Stearch/ui/content/list/tile/tile.pure-component.vue",
  tags: ["!autodocs"],
  argTypes: ITEM_ARG_TYPES,
  args: ITEM_ARGS,
  render: (args) => ({
    components: { TilePure },
    setup: () => ({
      args,
      verbs: ITEM_VERBS,
      row: computed(() => itemFromArgs(args)),
    }),
    template: `
      <div style="width: 240px">
        <TilePure :row="row" :verbs="verbs" @press="args.onPress" />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ItemStoryArgs>;

export const Playground: Story = {};

const STATES = ["rest", "hover", "focus-visible", "active"] as const;

// The pseudo-states addon forces each state on its own tile, so all four show at once.
export const InteractionStates: Story = {
  render: (args) => ({
    components: { TilePure },
    setup: () => ({
      args,
      states: STATES,
      verbs: ITEM_VERBS,
      row: computed(() => itemFromArgs(args)),
    }),
    template: `
      <div style="display: grid; grid-template-columns: repeat(4, 240px); gap: 16px">
        <div v-for="state in states" :key="state" :data-state="state">
          <p style="margin-block-end: 8px">{{ state }}</p>
          <TilePure :row="row" :verbs="verbs" @press="args.onPress" />
        </div>
      </div>
    `,
  }),
  parameters: {
    pseudo: {
      hover: ['[data-state="hover"] .stearch-tile'],
      focusVisible: ['[data-state="focus-visible"] .stearch-tile'],
      active: ['[data-state="active"] .stearch-tile'],
    },
  },
};

export const PressingHandsActionsBack: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    await expect(args.onPress).toHaveBeenCalledWith(ITEM_PRESS_ACTIONS);
  },
};
