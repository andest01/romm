import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../../Stearch.story-helpers";
import { LOADED_STEARCH_STATE as loaded } from "../../store/fixtures";
import SidebarContainer from "./sidebar.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/ui/sidebar/sidebar.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(SidebarContainer),
};

export default meta;

export const Filters: StoryObj<ContainerStoryArgs> = {
  args: { state: loaded },
};

/** A slider never traps the arrows: down moves on and leaves its value alone. */
export const DownLeavesASlider: StoryObj<ContainerStoryArgs> = {
  tags: ["!dev"],
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    // Arrange
    const [slider] = await within(canvasElement).findAllByRole("slider");
    if (!slider) throw new Error("No slider rendered");
    slider.focus();
    const before = slider.getAttribute("aria-valuenow");

    // Act
    await userEvent.keyboard("{ArrowDown}");

    // Assert
    await expect(document.activeElement).not.toBe(slider);
    await expect(slider.getAttribute("aria-valuenow")).toBe(before);
  },
};
