import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { h, type Component } from "vue";
import type {
  StearchLayoutProps,
  StearchPanelLayout,
} from "./Stearch.layout-props";
import StearchLayout from "./Stearch.layout.vue";

const block =
  (label: string, token: string, minHeight: string): Component =>
  () =>
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight,
          background: `color-mix(in srgb, var(${token}) 30%, var(--r-color-bg))`,
          color: "var(--r-color-fg)",
          fontSize: "2rem",
          fontWeight: 700,
        },
      },
      label,
    );

const HEADER = block("Header", "--r-color-brand-primary", "96px");
const PANEL = block("Panel", "--r-color-warning", "100%");
const CONTENT = block("Content", "--r-color-info", "100%");
const FOOTER = block("Footer", "--r-color-success", "64px");
const BACKGROUND = block("Background", "--r-color-danger", "100%");

type Args = Omit<StearchLayoutProps, "panelLayout"> & StearchPanelLayout;

const nullable = (part: Component) => ({
  options: ["part", "none"],
  mapping: { part, none: null },
  control: "radio" as const,
});

const meta: Meta<Args> = {
  title: "Stearch/Stearch.layout.vue",
  tags: ["!autodocs"],
  // The layout fills the viewport, so it can't be centered, and the app's nav
  // bars don't exist here.
  parameters: { layout: "fullscreen" },
  argTypes: {
    isPanelShown: { control: "boolean" },
    panelAxis: { control: "radio", options: ["inline", "block"] },
    panelPosition: { control: "radio", options: ["start", "end"] },
    header: { control: false },
    panel: { control: false },
    content: nullable(CONTENT),
    footer: nullable(FOOTER),
    background: nullable(BACKGROUND),
  },
  args: {
    isPanelShown: true,
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
            isPanelShown: args.isPanelShown,
            panelAxis: args.panelAxis,
            panelPosition: args.panelPosition,
          }"
        />
      </div>
    `,
  }),
};

export default meta;

export const Playground: StoryObj<Args> = {};
