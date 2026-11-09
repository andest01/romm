import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, within } from "storybook/test";
import SkipLink from "./skip-link.pure-component.vue";

const meta: Meta<typeof SkipLink> = {
  title: "Stearch/ui/skip-link/skip-link.pure-component.vue",
  tags: ["!autodocs"],
  component: SkipLink,
  argTypes: { label: { control: "text" }, target: { control: "text" } },
  args: { label: "Skip to results", target: "results" },
};

export default meta;

/** The first Tab lands here, and only then does it show. */
export const FirstTabReachesIt: StoryObj<typeof SkipLink> = {
  play: async ({ canvasElement }) => {
    // Arrange
    const link = within(canvasElement).getByRole("link");

    // Act
    await userEvent.tab();

    // Assert
    await expect(link).toHaveFocus();
  },
};
