import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, within } from "storybook/test";
import { h } from "vue";
import { mapPart } from "../../Stearch.story-helpers";
import { SEARCH_LABEL_ID } from "./header.pure-layout-props";
import HeaderLayout from "./header.pure-layout.vue";

const SEARCH = mapPart(
  {
    field: "search",
    facts: [`waypoint: search`, `labelled by #${SEARCH_LABEL_ID}`],
    headingId: SEARCH_LABEL_ID,
    links: [
      {
        label: "Search box",
        title: "Stearch/ui/header/header-search.pure-component.vue",
        story: "Playground",
      },
    ],
  },
  "--r-color-brand-primary",
  "96px",
);
const CONTROLS = mapPart(
  {
    field: "controls",
    facts: [`waypoint: controls`],
    headingId: null,
    links: [
      {
        label: "Controls",
        title: "Stearch/ui/header/header-controls.pure-component.vue",
        story: "Playground",
      },
      {
        label: "Saved searches",
        title: "Stearch/ui/header/header-saved-searches.pure-component.vue",
        story: "Playground",
      },
    ],
  },
  "--r-color-warning",
  "96px",
);
const PILLS = mapPart(
  {
    field: "pills",
    facts: ["active filters; null when there are none"],
    headingId: null,
    links: [
      {
        label: "Pills",
        title: "Stearch/ui/header/header-pills.pure-component.vue",
        story: "Playground",
      },
    ],
  },
  "--r-color-success",
  "72px",
);

const stop = (name: string) => () => h("button", { type: "button" }, name);
const LABELLED_STOP = () => [
  h("span", { id: SEARCH_LABEL_ID, hidden: true }, "Search games"),
  h("button", { type: "button" }, "Search"),
];

const meta: Meta<typeof HeaderLayout> = {
  title: "Stearch/ui/header/header.pure-layout.vue",
  tags: ["!autodocs"],
  component: HeaderLayout,
  parameters: { layout: "fullscreen" },
  argTypes: {
    search: { control: false },
    controls: { control: false },
    pills: {
      options: ["part", "none"],
      mapping: { part: PILLS, none: null },
      control: "radio",
    },
  },
  args: { search: SEARCH, controls: CONTROLS, pills: PILLS },
};

export default meta;

type Story = StoryObj<typeof HeaderLayout>;

export const Playground: Story = {};

export const NoPills: Story = { args: { pills: null } };

export const TabOrderIsSearchControlsPills: Story = {
  args: {
    search: LABELLED_STOP,
    controls: stop("Controls"),
    pills: stop("Pills"),
  },
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);

    // Act
    await userEvent.tab();
    const first = document.activeElement;
    await userEvent.tab();
    const second = document.activeElement;
    await userEvent.tab();
    const third = document.activeElement;

    // Assert
    await expect(first).toBe(canvas.getByRole("button", { name: "Search" }));
    await expect(second).toBe(canvas.getByRole("button", { name: "Controls" }));
    await expect(third).toBe(canvas.getByRole("button", { name: "Pills" }));
  },
};
