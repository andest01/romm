import { h, watchEffect, type Component, type CSSProperties } from "vue";
import { fakeGetRoms } from "./Stearch.fake-api";
import type { IStearchState } from "./store/stearch.state-props";
import stearchStore from "./store/stearch.store";

export interface ContainerStoryArgs {
  state: IStearchState;
}

/** Renders a container against whatever `state` the story's args hold. The
 *  store reads from the fake API, so scrolling a story fetches offline. */
export const renderContainer =
  (part: Component) => (args: ContainerStoryArgs) => ({
    components: { Part: part },
    setup() {
      const store = stearchStore();
      store.connect(fakeGetRoms);
      watchEffect(() => {
        store.state = args.state;
      });
    },
    template: `<div style="height: 100vh"><Part /></div>`,
  });

/** One colour per part, so a layout story shows where each part sits. */
export type PartToken =
  | "--r-color-brand-primary"
  | "--r-color-warning"
  | "--r-color-info"
  | "--r-color-success"
  | "--r-color-danger";

/** A token mixed into the background, so a part reads in both themes. */
export const tint = (token: PartToken, percent: number): string =>
  `color-mix(in srgb, var(${token}) ${percent}%, var(--r-color-bg))`;

const PART_LABEL: CSSProperties = {
  color: "var(--r-color-fg)",
  fontWeight: 700,
  fontSize: "0.85rem",
};

/** A labelled block in one colour, standing in for a part. It fills the area
 *  the layout gives it, with a dashed edge so overlaps show. */
export const layoutPart =
  (label: string, token: PartToken, minHeight = "100%"): Component =>
  () =>
    h(
      "div",
      {
        style: {
          ...PART_LABEL,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          height: "100%",
          minHeight,
          border: `1px dashed var(${token})`,
          background: tint(token, 35),
        },
      },
      label,
    );

/** A part that layers something high inside itself, as a band, a rail or a
 *  raised button does. A layout must keep it below anything that overlays it. */
export const raisedPart =
  (label: string, token: PartToken): Component =>
  () =>
    h(
      "div",
      {
        style: {
          position: "relative",
          height: "100%",
          border: `1px dashed var(${token})`,
          background: tint(token, 20),
        },
      },
      h(
        "div",
        {
          "data-raised": "",
          style: {
            ...PART_LABEL,
            position: "absolute",
            zIndex: 10,
            insetInline: 0,
            insetBlockStart: 0,
            padding: "8px",
            background: tint(token, 60),
          },
        },
        `${label} · z-index 10 inside; must stay under the panel`,
      ),
    );

/** A part that scrolls, with numbered stripes, so a story shows what floats
 *  over it and what stays put. */
export const scrollingPart =
  (
    label: string,
    token: PartToken,
    { rows, paddingInline }: { rows: number; paddingInline: string },
  ): Component =>
  () =>
    h(
      "div",
      {
        style: {
          boxSizing: "border-box",
          height: "100%",
          overflow: "auto",
          paddingInline,
          background: tint(token, 12),
        },
      },
      Array.from({ length: rows }, (_, index) =>
        h(
          "div",
          {
            style: {
              ...PART_LABEL,
              display: "flex",
              alignItems: "center",
              height: "56px",
              paddingInline: "12px",
              borderBottom: "1px solid var(--r-color-border)",
              background: tint(token, index % 2 ? 22 : 32),
            },
          },
          `${label} · ${index + 1}`,
        ),
      ),
    );

/** Shared container story settings. Each story file still states its own
 *  `tags: ["!autodocs"]`: Storybook reads tags from the file itself, so tags
 *  spread in from here are invisible to it. */
export const CONTAINER_STORY_META = {
  parameters: { layout: "fullscreen" },
  argTypes: { state: { control: "object" as const } },
};
