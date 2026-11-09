import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import SectionPure from "./section.pure-component.vue";

const SELECT_ACTIONS = [{ type: "selection/add", ids: [1, 2, 3] }] as const;

const meta: Meta<typeof SectionPure> = {
  title: "Stearch/ui/content/section/section.pure-component.vue",
  tags: ["!autodocs"],
  component: SectionPure,
  parameters: { layout: "fullscreen" },
  argTypes: {
    label: { control: "text" },
    countLabel: { control: "text" },
    selectLabel: { control: "radio", options: ["Select", "Deselect"] },
  },
  args: {
    label: "F",
    value: { kind: "text", text: "F" },
    countLabel: "45 games",
    selectLabel: "Select",
    selectActions: SELECT_ACTIONS,
    prevLabel: "‹ Prev",
    prevActions: [
      { type: "view/set", patch: { jump: { position: 0, isSmooth: true } } },
    ],
    nextLabel: "Next ›",
    nextActions: [
      { type: "view/set", patch: { jump: { position: 90, isSmooth: true } } },
    ],
    onPress: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SectionPure>;

export const Playground: Story = {};

export const PressingHandsActionsBack: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Select" }),
    );
    await expect(args.onPress).toHaveBeenCalledWith(SELECT_ACTIONS);
  },
};
