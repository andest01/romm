import type { Meta, StoryObj } from "@storybook/vue3-vite";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../../Stearch.story-helpers";
import { LOADED_STEARCH_STATE as loaded } from "../../store/fixtures";
import FieldList from "./field-list.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/fields/field-list/field-list.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(FieldList),
};

export default meta;

export const Playground: StoryObj<ContainerStoryArgs> = {
  args: { state: loaded },
};
