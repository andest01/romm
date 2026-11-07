import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { StearchAction } from "../../Stearch.actions";
import BarPure from "./bar.pure-component.vue";

const CLOSE_ACTIONS: readonly StearchAction[] = [
  { type: "view/set", patch: { isAdvancedOpen: false } },
];

const meta: Meta<typeof BarPure> = {
  title: "Stearch/sidebar/bar/bar.pure-component.vue",
  tags: ["!autodocs"],
  component: BarPure,
  parameters: { layout: "fullscreen" },
  argTypes: { title: { control: "text" }, verbs: { control: "object" } },
  args: {
    title: "Filters",
    verbs: [{ id: "close", label: "Close", actions: CLOSE_ACTIONS }],
    onPress: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof BarPure>;

export const Playground: Story = {};

export const PressingHandsActionsBack: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    await expect(args.onPress).toHaveBeenCalledWith(CLOSE_ACTIONS);
  },
};
