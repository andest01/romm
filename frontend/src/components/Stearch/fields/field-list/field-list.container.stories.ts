import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { LOADED_STEARCH_STATE as loaded } from "../../Stearch.fixtures";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../../Stearch.story-helpers";
import FieldList from "./field-list.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/fields/field-list/field-list.container.vue",
  ...CONTAINER_STORY_META,
  render: renderContainer(FieldList),
};

export default meta;

export const Playground: StoryObj<ContainerStoryArgs> = {
  args: { state: loaded },
};
