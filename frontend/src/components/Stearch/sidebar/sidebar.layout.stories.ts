import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { h } from "vue";
import SidebarLayout from "./sidebar.layout.vue";

const block = (label: string, height: string) => () =>
  h("div", { style: { height } }, label);

const FOOTER = block("Footer verbs", "48px");

const meta: Meta<typeof SidebarLayout> = {
  title: "Stearch/sidebar/sidebar.layout.vue",
  tags: ["!autodocs"],
  component: SidebarLayout,
  parameters: { layout: "fullscreen" },
  decorators: [
    () => ({ template: `<div style="height: 100vh"><story /></div>` }),
  ],
  argTypes: {
    header: { control: false },
    body: { control: false },
    footer: {
      control: "radio",
      options: ["shown", "absent"],
      mapping: { shown: FOOTER, absent: null },
    },
  },
  args: {
    header: block("Header verbs", "48px"),
    body: block("A tall body scrolls here", "200vh"),
    footer: FOOTER,
  },
};

export default meta;

export const Playground: StoryObj<typeof SidebarLayout> = {};
