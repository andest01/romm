import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fireEvent, waitFor, within } from "storybook/test";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../../../Stearch.story-helpers";
import { LOADED_STEARCH_STATE as loaded } from "../../../store/fixtures";
import TableContainer from "./table.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/ui/results/table/table.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(TableContainer),
};

export default meta;

export const Playground: StoryObj<ContainerStoryArgs> = {
  args: { state: loaded },
};

/** D-pad keys land on the focused element, which may have fallen to the page. */
export const ArrowsWorkWithoutFocus: StoryObj<ContainerStoryArgs> = {
  tags: ["!dev"],
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    // Arrange
    const grid = await within(canvasElement).findByRole("grid");
    grid.blur();

    // Act
    await fireEvent.keyDown(document.body, { key: "ArrowDown" });

    // Assert
    await waitFor(() => expect(document.activeElement).toBe(grid));
  },
};
