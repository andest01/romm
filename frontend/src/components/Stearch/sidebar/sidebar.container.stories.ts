import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { LOADED_STEARCH_STATE as loaded } from "../Stearch.fixtures";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../Stearch.story-helpers";
import SidebarContainer from "./sidebar.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/sidebar/sidebar.container.vue",
  ...CONTAINER_STORY_META,
  render: renderContainer(SidebarContainer),
};

export default meta;

export const Filters: StoryObj<ContainerStoryArgs> = {
  args: { state: loaded },
};
