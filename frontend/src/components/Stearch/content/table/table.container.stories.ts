import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { LOADED_STEARCH_STATE as loaded } from "../../Stearch.fixtures";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../../Stearch.story-helpers";
import TableContainer from "./table.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/content/table/table.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(TableContainer),
};

export default meta;

export const Playground: StoryObj<ContainerStoryArgs> = {
  args: { state: loaded },
};
