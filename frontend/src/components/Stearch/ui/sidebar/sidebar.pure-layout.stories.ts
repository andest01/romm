import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { layoutPart, scrollingPart } from "../../Stearch.story-helpers";
import SidebarLayout from "./sidebar.pure-layout.vue";

const HEADER = layoutPart(
  "Header · verbs stay put",
  "--r-color-brand-primary",
  "48px",
);
const BODY = scrollingPart("Body · scrolls", "--r-color-info", {
  rows: 30,
  paddingInline: "0px",
});
const FOOTER = layoutPart(
  "Footer · verbs stay put",
  "--r-color-success",
  "48px",
);

const meta: Meta<typeof SidebarLayout> = {
  title: "Stearch/ui/sidebar/sidebar.pure-layout.vue",
  tags: ["!autodocs"],
  component: SidebarLayout,
  parameters: { layout: "fullscreen" },
  decorators: [
    () => ({
      template: `<div style="height: 100vh; width: 360px"><story /></div>`,
    }),
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
    header: HEADER,
    body: BODY,
    footer: FOOTER,
  },
};

export default meta;

type Story = StoryObj<typeof SidebarLayout>;

export const Playground: Story = {};

/** Without a footer, the body takes its space. */
export const NoFooter: Story = { args: { footer: null } };
