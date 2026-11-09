import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../../Stearch.story-helpers";
import { LOADED_STEARCH_STATE as loaded } from "../../store/fixtures";
import ResultsContainer from "./results.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/ui/results/results.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(ResultsContainer),
};

export default meta;

type Story = StoryObj<ContainerStoryArgs>;

export const Tiles: Story = { args: { state: loaded } };

/** A rail letter is one command: it sets the active item and flies there. */
export const RailLetterNavigates: Story = {
  tags: ["!dev"],
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    const grid = await canvas.findByRole("grid");
    const [letter] = await within(
      await canvas.findByRole("toolbar"),
    ).findAllByRole("button");
    if (!letter) throw new Error("No letters rendered");

    // Act
    await userEvent.click(letter);

    // Assert
    await waitFor(() =>
      expect(grid.getAttribute("aria-activedescendant")).toBe("stearch-item-0"),
    );
  },
};

export const Table: Story = {
  args: { state: { ...loaded, view: { ...loaded.view, mode: "table" } } },
};
