import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { h } from "vue";
import ContentLayout from "./content.pure-layout.vue";

const ITEMS = () =>
  h("div", { style: { height: "100%", overflow: "auto" } }, [
    h("div", { style: { height: "200vh" } }, "Items scroll here"),
  ]);
const BAND = () => h("div", "Band");
const RAIL = () => h("div", { style: { height: "100%" } }, "Rail");

const meta: Meta<typeof ContentLayout> = {
  title: "Stearch/content/content.pure-layout.vue",
  tags: ["!autodocs"],
  component: ContentLayout,
  parameters: { layout: "fullscreen" },
  decorators: [
    () => ({ template: `<div style="height: 100vh"><story /></div>` }),
  ],
  argTypes: {
    items: { control: false },
    band: {
      control: "radio",
      options: ["shown", "absent"],
      mapping: { shown: BAND, absent: null },
    },
    rail: {
      control: "radio",
      options: ["shown", "absent"],
      mapping: { shown: RAIL, absent: null },
    },
    bandHeight: { control: { type: "range", min: 20, max: 60, step: 1 } },
    bandInset: { control: { type: "range", min: 0, max: 60, step: 1 } },
    bandOffset: { control: { type: "range", min: -60, max: 0, step: 1 } },
  },
  args: {
    items: ITEMS,
    band: BAND,
    rail: RAIL,
    bandHeight: 28,
    bandInset: 0,
    bandOffset: 0,
  },
};

export default meta;

export const Playground: StoryObj<typeof ContentLayout> = {};
