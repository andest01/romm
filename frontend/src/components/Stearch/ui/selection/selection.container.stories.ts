import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../../Stearch.story-helpers";
import { LOADED_STEARCH_STATE as loaded } from "../../store/fixtures";
import SelectionContainer from "./selection.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/ui/selection/selection.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(SelectionContainer),
};

export default meta;

type Story = StoryObj<ContainerStoryArgs>;

export const Playground: Story = { args: { state: loaded } };

export const ClearDispatches: Story = {
  args: {
    state: {
      ...loaded,
      attention: { activeId: null, selectedIds: [1, 2, 3] },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
    await expect(await canvas.findByText("1000 games")).toBeVisible();
  },
};
