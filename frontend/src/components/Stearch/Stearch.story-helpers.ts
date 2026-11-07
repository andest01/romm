import { watchEffect, type Component } from "vue";
import type { IStearchState } from "./Stearch.state-props";
import stearchStore from "./Stearch.store";

export interface ContainerStoryArgs {
  state: IStearchState;
}

/** Renders a container against whatever `state` the story's args hold. */
export const renderContainer =
  (part: Component) => (args: ContainerStoryArgs) => ({
    components: { Part: part },
    setup() {
      const store = stearchStore();
      watchEffect(() => {
        store.state = args.state;
      });
    },
    template: `<div style="height: 100vh"><Part /></div>`,
  });

export const CONTAINER_STORY_META = {
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: { state: { control: "object" as const } },
};
