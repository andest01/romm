import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, within } from "storybook/test";
import RegionHeading from "./region-heading.pure-component.vue";

/** Screen-reader only, so the canvas looks empty. Inspect it, or read the check. */
const meta: Meta<typeof RegionHeading> = {
  title: "Stearch/ui/region-heading/region-heading.pure-component.vue",
  tags: ["!autodocs"],
  component: RegionHeading,
  argTypes: {
    tag: { control: "radio", options: ["h1", "h2", "span"] },
    text: { control: "text" },
    id: { control: "text" },
  },
  args: { id: "story-heading", tag: "h2", text: "Results" },
};

export default meta;

export const NamesARegion: StoryObj<typeof RegionHeading> = {
  play: async ({ canvasElement }) => {
    // Act
    const heading = within(canvasElement).getByRole("heading", {
      name: "Results",
    });

    // Assert
    await expect(heading.id).toBe("story-heading");
  },
};
