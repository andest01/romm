import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../../../Stearch.story-helpers";
import { LOADED_STEARCH_STATE as loaded } from "../../../store/fixtures";
import RailContainer from "./rail.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/ui/results/rail/rail.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(RailContainer),
};

export default meta;

export const Playground: StoryObj<ContainerStoryArgs> = {
  args: { state: loaded },
};

/** Arrows walk the letters without a tab stop per letter. */
export const ArrowsWalkTheLetters: StoryObj<ContainerStoryArgs> = {
  tags: ["!dev"],
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    // Arrange
    const letters = await within(canvasElement).findAllByRole("button");
    const [first, second] = letters;
    if (!first || !second) throw new Error("Needs two letters");
    first.focus();

    // Act
    await userEvent.keyboard("{ArrowDown}");

    // Assert
    await expect(document.activeElement).toBe(second);
  },
};
