import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect } from "storybook/test";
import {
  FILTERS_HEADING_ID,
  FILTERS_REGION_ID,
  HEADER_HEADING_ID,
  HEADER_REGION_ID,
  RESULTS_HEADING_ID,
  RESULTS_REGION_ID,
  SELECTION_HEADING_ID,
  SELECTION_REGION_ID,
  type StearchFiltersLayout,
  type StearchLayoutProps,
} from "./Stearch.pure-layout-props";
import StearchLayout from "./Stearch.pure-layout.vue";
import {
  headingPart,
  layoutPart,
  raisedPart,
  regionPart,
  scrollingPart,
} from "./Stearch.story-helpers";

const HEADER = regionPart(
  {
    field: "header",
    regionId: HEADER_REGION_ID,
    headingId: HEADER_HEADING_ID,
    rendersHeading: false,
    links: [
      {
        label: "Container",
        title: "Stearch/ui/header/header.container.vue",
        story: "Playground",
      },
      {
        label: "Layout",
        title: "Stearch/ui/header/header.pure-layout.vue",
        story: "Playground",
      },
    ],
  },
  "--r-color-brand-primary",
  "112px",
);
const FILTERS = regionPart(
  {
    field: "filters",
    regionId: FILTERS_REGION_ID,
    headingId: FILTERS_HEADING_ID,
    rendersHeading: true,
    links: [
      {
        label: "Container",
        title: "Stearch/ui/filters/filters.container.vue",
        story: "Filters",
      },
      {
        label: "Layout",
        title: "Stearch/ui/filters/filters.pure-layout.vue",
        story: "Playground",
      },
    ],
  },
  "--r-color-warning",
);
const RESULTS = regionPart(
  {
    field: "results",
    regionId: RESULTS_REGION_ID,
    headingId: RESULTS_HEADING_ID,
    rendersHeading: false,
    links: [
      {
        label: "Container",
        title: "Stearch/ui/results/results.container.vue",
        story: "Tiles",
      },
      {
        label: "Layout",
        title: "Stearch/ui/results/results.pure-layout.vue",
        story: "Playground",
      },
      {
        label: "Table",
        title: "Stearch/ui/results/table/table.container.vue",
        story: "Playground",
      },
      {
        label: "Rail",
        title: "Stearch/ui/results/rail/rail.container.vue",
        story: "Playground",
      },
    ],
  },
  "--r-color-info",
);
const SELECTION = regionPart(
  {
    field: "selection",
    regionId: SELECTION_REGION_ID,
    headingId: SELECTION_HEADING_ID,
    rendersHeading: false,
    links: [
      {
        label: "Container",
        title: "Stearch/ui/selection/selection.container.vue",
        story: "Playground",
      },
      {
        label: "Component",
        title: "Stearch/ui/selection/selection.pure-component.vue",
        story: "Results",
      },
    ],
  },
  "--r-color-success",
  "96px",
);
const BACKGROUND = layoutPart("background", "--r-color-danger");

type Args = Omit<StearchLayoutProps, "filtersLayout"> & StearchFiltersLayout;

const meta: Meta<Args> = {
  title: "Stearch/Stearch.pure-layout.vue",
  tags: ["!autodocs"],
  // The layout fills the viewport, so it can't be centered, and the app's nav
  // bars don't exist here.
  parameters: { layout: "fullscreen" },
  argTypes: {
    state: { control: "radio", options: ["shown", "hidden"] },
    axis: { control: "radio", options: ["inline", "block"] },
    position: { control: "radio", options: ["start", "end"] },
    header: { control: false },
    filters: { control: false },
    results: {
      options: ["part", "none"],
      mapping: { part: RESULTS, none: null },
      control: "radio",
    },
    selection: {
      options: ["part", "none"],
      mapping: { part: SELECTION, none: null },
      control: "radio",
    },
    background: {
      options: ["part", "none"],
      mapping: { part: BACKGROUND, none: null },
      control: "radio",
    },
    skipLink: { control: false },
    headerHeading: { control: false },
    resultsHeading: { control: false },
    selectionHeading: { control: false },
  },
  args: {
    state: "shown",
    axis: "inline",
    position: "start",
    header: HEADER,
    filters: FILTERS,
    results: RESULTS,
    selection: SELECTION,
    background: null,
    skipLink: null,
    headerHeading: headingPart(HEADER_HEADING_ID, "headerHeading"),
    resultsHeading: headingPart(RESULTS_HEADING_ID, "resultsHeading"),
    selectionHeading: headingPart(SELECTION_HEADING_ID, "selectionHeading"),
  },
  render: (args) => ({
    components: { StearchLayout },
    setup: () => ({ args }),
    template: `
      <div style="--r-nav-h: 0px; --r-bottom-nav-h: 0px; --r-safe-b: 0px">
        <StearchLayout
          :header="args.header"
          :filters="args.filters"
          :results="args.results"
          :selection="args.selection"
          :background="args.background"
          :filters-layout="{
            state: args.state,
            axis: args.axis,
            position: args.position,
          }"
          :skip-link="args.skipLink"
          :header-heading="args.headerHeading"
          :results-heading="args.resultsHeading"
          :selection-heading="args.selectionHeading"
        />
      </div>
    `,
  }),
};

export default meta;

/** The map: every region, its field, its ids and where to go deeper. */
export const Playground: StoryObj<Args> = {};

/** A broken `aria-labelledby` is silent in the browser, so it's checked here. */
export const EveryRegionIsNamed: StoryObj<Args> = {
  play: async ({ canvasElement }) => {
    const regions = canvasElement.querySelectorAll("section, aside");
    await expect(regions).toHaveLength(4);
    for (const region of regions) {
      await expect(region.id).not.toBe("");
      const headingId = region.getAttribute("aria-labelledby");
      await expect(headingId).toBeTruthy();
      await expect(
        canvasElement.querySelector(`[id="${headingId}"]`),
      ).not.toBeNull();
    }
  },
};

export const FiltersHidden: StoryObj<Args> = { args: { state: "hidden" } };

export const NoSelection: StoryObj<Args> = { args: { selection: null } };

/** Only the results scroll; the regions around them stay put. */
export const ResultsScroll: StoryObj<Args> = {
  args: {
    results: scrollingPart("results", "--r-color-info", {
      rows: 40,
      paddingInline: "0px",
    }),
  },
};

/** Parts layer things high inside themselves, as the list's band and rail do.
 *  Each region is its own stacking layer, so the open panel still covers them
 *  wherever they overlap. */
export const PanelCoversRaisedParts: StoryObj<Args> = {
  args: {
    results: raisedPart("results", "--r-color-info"),
    selection: raisedPart("selection", "--r-color-success"),
    state: "shown",
  },
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector("aside");
    if (!panel) throw new Error("The layout drew no panel");
    for (const raised of canvasElement.querySelectorAll("[data-raised]")) {
      const box = raised.getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      const x = Math.max(box.left, panelBox.left) + 4;
      const y = box.top + box.height / 2;
      if (x > Math.min(box.right, panelBox.right)) continue;
      const hit = document.elementFromPoint(x, y);
      await expect(panel.contains(hit)).toBe(true);
    }
  },
};
