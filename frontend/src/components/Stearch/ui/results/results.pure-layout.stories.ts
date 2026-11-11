import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, within } from "storybook/test";
import { h } from "vue";
import { layoutPart, mapPart } from "../../Stearch.story-helpers";
import ResultsLayout from "./results.pure-layout.vue";

const stop = (name: string) => () => h("button", { type: "button" }, name);

const GRID = mapPart(
  {
    field: "grid",
    facts: [
      "scrolls, and runs under the band above and the rail (R, 24px, opaque)",
    ],
    headingId: null,
    links: [
      {
        label: "List",
        title: "Stearch/ui/results/list/list.pure-component.vue",
        story: "Playground",
      },
      {
        label: "Rail",
        title: "Stearch/ui/results/rail/rail.pure-component.vue",
        story: "Stars",
      },
    ],
  },
  "--r-color-info",
);
// The layout gives the rail 24px, so its card lives on the grid's.
const RAIL = layoutPart("R", "--r-color-warning");
const BAND = mapPart(
  {
    field: "band",
    facts: [],
    headingId: null,
    links: [
      {
        label: "Section",
        title: "Stearch/ui/results/section/section.pure-component.vue",
        story: "Playground",
      },
    ],
  },
  "--r-color-success",
);

const meta: Meta<typeof ResultsLayout> = {
  title: "Stearch/ui/results/results.pure-layout.vue",
  tags: ["!autodocs"],
  component: ResultsLayout,
  parameters: { layout: "fullscreen" },
  argTypes: {
    bandOffset: { control: { type: "range", min: -40, max: 0, step: 1 } },
    bandHeight: { control: { type: "range", min: 20, max: 96, step: 1 } },
    headInset: { control: { type: "range", min: 0, max: 60, step: 1 } },
    scrollbarWidth: { control: { type: "range", min: 0, max: 20, step: 1 } },
    grid: { control: false },
    rail: { control: false },
    band: { control: false },
  },
  args: {
    grid: GRID,
    rail: RAIL,
    band: BAND,
    bandOffset: 0,
    bandHeight: 72,
    headInset: 0,
    scrollbarWidth: 0,
  },
  decorators: [
    () => ({ template: '<div style="height: 100vh"><story /></div>' }),
  ],
};

export default meta;

type Story = StoryObj<typeof ResultsLayout>;

export const Playground: Story = {};

/** Rows and their focus marks run under the rail, so it has to cover them. */
export const RailCoversWhatRunsUnderIt: Story = {
  play: async ({ canvasElement }) => {
    // Arrange
    const rail = canvasElement.querySelector(".stearch-results__rail");
    if (!rail) throw new Error("The layout drew no rail");

    // Act
    const { backgroundColor } = getComputedStyle(rail);

    // Assert
    await expect(backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  },
};

/** A band reaching under the rail shows through it as a stripe. */
export const BandStopsAtTheRail: Story = {
  args: { scrollbarWidth: 12 },
  play: async ({ canvasElement }) => {
    // Arrange
    const band = canvasElement.querySelector(".stearch-results__band");
    const rail = canvasElement.querySelector(".stearch-results__rail");
    if (!band || !rail) throw new Error("The layout drew no band or rail");

    // Act
    const bandEnd = band.getBoundingClientRect().right;
    const railStart = rail.getBoundingClientRect().left;

    // Assert
    await expect(bandEnd).toBe(railStart);
  },
};

/** The band is drawn on top, but Tab reaches it last. */
export const TabOrderIsGridRailBand: Story = {
  args: { grid: stop("Grid"), rail: stop("Rail"), band: stop("Band") },
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
    await expect(first).toBe(canvas.getByRole("button", { name: "Grid" }));
    await expect(second).toBe(canvas.getByRole("button", { name: "Rail" }));
    await expect(third).toBe(canvas.getByRole("button", { name: "Band" }));
  },
};
