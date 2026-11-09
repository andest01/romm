import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { mapPart, scrollingPart } from "../../Stearch.story-helpers";
import FiltersLayout from "./filters.pure-layout.vue";

const BAR_LINK = {
  label: "Bar",
  title: "Stearch/ui/filters/bar/bar.pure-component.vue",
  story: "Playground",
};
const HEADER = mapPart(
  { field: "header", facts: ["stays put"], headingId: null, links: [BAR_LINK] },
  "--r-color-brand-primary",
  "96px",
);
const BODY = mapPart(
  {
    field: "body",
    facts: ["the only part that scrolls"],
    headingId: null,
    links: [
      {
        label: "Field list",
        title: "Stearch/ui/filters/fields/field-list/field-list.container.vue",
        story: "Playground",
      },
    ],
  },
  "--r-color-info",
);
const FOOTER = mapPart(
  { field: "footer", facts: ["stays put"], headingId: null, links: [BAR_LINK] },
  "--r-color-success",
  "96px",
);

const meta: Meta<typeof FiltersLayout> = {
  title: "Stearch/ui/filters/filters.pure-layout.vue",
  tags: ["!autodocs"],
  component: FiltersLayout,
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

type Story = StoryObj<typeof FiltersLayout>;

/** The map: each part, what it does and where to go deeper. */
export const Playground: Story = {};

/** Without a footer, the body takes its space. */
export const NoFooter: Story = { args: { footer: null } };

/** Only the body scrolls; the header and footer stay put. */
export const BodyScrolls: Story = {
  args: {
    body: scrollingPart("body", "--r-color-info", {
      rows: 30,
      paddingInline: "0px",
    }),
  },
};
