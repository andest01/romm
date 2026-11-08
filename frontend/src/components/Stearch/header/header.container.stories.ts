import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../Stearch.story-helpers";
import { LOADED_STEARCH_STATE as loaded } from "../store/fixtures";
import HeaderContainer from "./header.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/header/header.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(HeaderContainer),
};

export default meta;

type Story = StoryObj<ContainerStoryArgs>;

export const Playground: Story = { args: { state: loaded } };

export const WithPills: Story = {
  args: {
    state: {
      ...loaded,
      query: {
        ...loaded.query,
        selectedRegions: ["USA"],
        selectedLanguages: ["ja"],
      },
    },
  },
};

export const TypingUpdatesCount: Story = {
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("textbox"), "zelda");
    await waitFor(
      async () => {
        await expect(canvas.getByText("125")).toBeVisible();
      },
      { timeout: 3000 },
    );
  },
};
