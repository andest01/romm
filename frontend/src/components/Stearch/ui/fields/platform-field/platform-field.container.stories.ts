import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { watchEffect } from "vue";
import storePlatforms from "@/stores/platforms";
import { platformFixture } from "@/utils/platform.fixtures";
import type { ContainerStoryArgs } from "../../../Stearch.story-helpers";
import { LOADED_STEARCH_STATE as loaded } from "../../../store/fixtures";
import stearchStore from "../../../store/stearch.store";
import PlatformField from "./platform-field.container.vue";

const PLATFORMS = [
  platformFixture({ id: 1, display_name: "SNES", rom_count: 250 }),
  platformFixture({ id: 2, display_name: "PlayStation", rom_count: 250 }),
  platformFixture({ id: 3, display_name: "Game Boy", rom_count: 250 }),
  platformFixture({ id: 4, display_name: "Saturn", rom_count: 0 }),
];

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/ui/fields/platform-field/platform-field.container.vue",
  tags: ["!autodocs"],
  render: (args) => ({
    components: { PlatformField },
    setup() {
      const store = stearchStore();
      storePlatforms().allPlatforms = PLATFORMS;
      watchEffect(() => {
        store.state = args.state;
      });
    },
    template: `<div style="width: 320px"><PlatformField label="Platforms" /></div>`,
  }),
};

export default meta;

type Story = StoryObj<ContainerStoryArgs>;

export const NoneChosen: Story = { args: { state: loaded } };

export const TwoChosen: Story = {
  args: {
    state: { ...loaded, query: { ...loaded.query, platformIds: [1, 2] } },
  },
};
