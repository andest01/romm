import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import {
  FAILED_STEARCH_STATE,
  LOADED_STEARCH_STATE as loaded,
  LOADING_STEARCH_STATE,
} from "../../Stearch.fixtures";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../../Stearch.story-helpers";
import ListContainer from "./list.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/content/list/list.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(ListContainer),
};

export default meta;

type Story = StoryObj<ContainerStoryArgs>;

export const Loading: Story = { args: { state: LOADING_STEARCH_STATE } };

export const Failed: Story = { args: { state: FAILED_STEARCH_STATE } };

/** D-pad keys land on the focused element, which may have fallen to the page. */
export const ArrowsWorkWithoutFocus: Story = {
  tags: ["!dev"],
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    // Arrange
    const grid = await within(canvasElement).findByRole("grid");
    grid.blur();

    // Act
    await fireEvent.keyDown(document.body, { key: "ArrowRight" });

    // Assert
    await waitFor(() => expect(document.activeElement).toBe(grid));
  },
};

/** A Ctrl-click selects; a plain click only makes the game current. */
export const SelectingDispatches: Story = {
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    // Arrange
    const [tile] = await within(canvasElement).findAllByRole("button");
    if (!tile) throw new Error("No tile rendered");

    // Act
    await userEvent.keyboard("{Control>}");
    await userEvent.click(tile);
    await userEvent.keyboard("{/Control}");

    // Assert
    await expect(tile).toHaveAttribute("aria-pressed", "true");
  },
};
