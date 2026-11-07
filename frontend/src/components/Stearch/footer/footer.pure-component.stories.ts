import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import FooterPure from "./footer.pure-component.vue";

const meta: Meta<typeof FooterPure> = {
  title: "Stearch/footer/footer.pure-component.vue",
  tags: ["!autodocs"],
  component: FooterPure,
  parameters: { layout: "fullscreen" },
  argTypes: {
    resultCount: { control: { type: "range", min: 0, max: 100000, step: 1 } },
    selectedCount: { control: { type: "range", min: 0, max: 100000, step: 1 } },
  },
  args: {
    resultCount: 601,
    selectedCount: 0,
    resultsLabel: "games",
    selectedLabel: "selected",
    clearLabel: "Clear",
    clearActions: [{ type: "selection/clear" }],
    selectAllLabel: "Select all",
    selectAllActions: [{ type: "selection/all" }],
  },
};

export default meta;

type Story = StoryObj<typeof FooterPure>;

export const Results: Story = {};

export const AllSelected: Story = {
  args: { selectedCount: 601, selectAllActions: null },
};

export const SelectingAll: Story = {
  args: { onPress: fn() },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Select all 601" }),
    );
    await expect(args.onPress).toHaveBeenCalledWith([
      { type: "selection/all" },
    ]);
  },
};

export const PressingHandsActionsBack: Story = {
  args: { selectedCount: 3, onPress: fn() },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Clear" }),
    );
    await expect(args.onPress).toHaveBeenCalledWith([
      { type: "selection/clear" },
    ]);
  },
};
