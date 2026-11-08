import type { Meta, StoryObj } from "@storybook/vue3-vite";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../Stearch.story-helpers";
import { LOADED_STEARCH_STATE as loaded } from "../store/fixtures";
import ContentContainer from "./content.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/content/content.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(ContentContainer),
};

export default meta;

type Story = StoryObj<ContainerStoryArgs>;

export const Tiles: Story = { args: { state: loaded } };

export const Table: Story = {
  args: { state: { ...loaded, view: { ...loaded.view, mode: "table" } } },
};
