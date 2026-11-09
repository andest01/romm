import type { Meta, StoryObj } from "@storybook/vue3-vite";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../../Stearch.story-helpers";
import { LOADED_STEARCH_STATE as loaded } from "../../store/fixtures";
import SidebarContainer from "./sidebar.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/ui/sidebar/sidebar.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(SidebarContainer),
};

export default meta;

export const Filters: StoryObj<ContainerStoryArgs> = {
  args: { state: loaded },
};
