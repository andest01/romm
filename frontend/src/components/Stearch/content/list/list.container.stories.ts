import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, within } from "storybook/test";
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
  ...CONTAINER_STORY_META,
  render: renderContainer(ListContainer),
};

export default meta;

type Story = StoryObj<ContainerStoryArgs>;

export const Loading: Story = { args: { state: LOADING_STEARCH_STATE } };

export const Failed: Story = { args: { state: FAILED_STEARCH_STATE } };

export const SelectingDispatches: Story = {
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    const [tile] = await within(canvasElement).findAllByRole("button");
    if (!tile) throw new Error("No tile rendered");
    await userEvent.click(tile);
    await expect(tile).toHaveAttribute("aria-pressed", "true");
  },
};
