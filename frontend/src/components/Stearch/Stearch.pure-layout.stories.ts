import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect } from "storybook/test";
import type { Component } from "vue";
import type {
  StearchLayoutProps,
  StearchPanelLayout,
} from "./Stearch.pure-layout-props";
import StearchLayout from "./Stearch.pure-layout.vue";
import { layoutPart, raisedPart, scrollingPart } from "./Stearch.story-helpers";

const HEADER = layoutPart("Header", "--r-color-brand-primary", "96px");
const PANEL = layoutPart("Panel", "--r-color-warning");
const CONTENT = scrollingPart("Content", "--r-color-info", {
  rows: 40,
  paddingInline: "0px",
});
const FOOTER = layoutPart("Footer", "--r-color-success", "64px");
const BACKGROUND = layoutPart("Background", "--r-color-danger");

type Args = Omit<StearchLayoutProps, "panelLayout"> & StearchPanelLayout;

const nullable = (part: Component) => ({
  options: ["part", "none"],
  mapping: { part, none: null },
  control: "radio" as const,
});

const meta: Meta<Args> = {
  title: "Stearch/Stearch.pure-layout.vue",
  tags: ["!autodocs"],
  // The layout fills the viewport, so it can't be centered, and the app's nav
  // bars don't exist here.
  parameters: { layout: "fullscreen" },
  argTypes: {
    panelState: { control: "radio", options: ["shown", "hidden"] },
    panelAxis: { control: "radio", options: ["inline", "block"] },
    panelPosition: { control: "radio", options: ["start", "end"] },
    header: { control: false },
    panel: { control: false },
    content: nullable(CONTENT),
    footer: nullable(FOOTER),
    background: nullable(BACKGROUND),
  },
  args: {
    panelState: "shown",
    panelAxis: "inline",
    panelPosition: "start",
    header: HEADER,
    panel: PANEL,
    content: CONTENT,
    footer: FOOTER,
    background: null,
  },
  render: (args) => ({
    components: { StearchLayout },
    setup: () => ({ args }),
    template: `
      <div style="--r-nav-h: 0px; --r-bottom-nav-h: 0px; --r-safe-b: 0px">
        <StearchLayout
          :header="args.header"
          :panel="args.panel"
          :content="args.content"
          :footer="args.footer"
          :background="args.background"
          :panel-layout="{
            panelState: args.panelState,
            panelAxis: args.panelAxis,
            panelPosition: args.panelPosition,
          }"
          skip-label="Skip to results"
          panel-label="Filters"
          results-label="Results"
        />
      </div>
    `,
  }),
};

export default meta;

export const Playground: StoryObj<Args> = {};

/** Parts layer things high inside themselves, as the list's band and rail do.
 *  Each region is its own stacking layer, so the open panel still covers them
 *  wherever they overlap. */
export const PanelCoversRaisedParts: StoryObj<Args> = {
  args: {
    content: raisedPart("Content", "--r-color-info"),
    footer: raisedPart("Footer", "--r-color-success"),
    panelState: "shown",
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
