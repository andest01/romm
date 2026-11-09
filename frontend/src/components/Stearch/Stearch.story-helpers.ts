import { toId } from "storybook/internal/csf";
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

/** A deeper story, as Storybook's sidebar names it. */
export interface StoryLink {
  label: string;
  title: string;
  story: string;
}

/** The story's URL, relative so it survives any Storybook base path. */
export const storyHref = ({ title, story }: StoryLink): string =>
  `./?path=/story/${toId(title, story)}`;

const CODE: CSSProperties = { fontWeight: 400, fontSize: "0.75rem" };

/** A layout part's card: its field, facts about it, and links to the stories
 *  of what really fills it. `headingId` makes the field a real heading. */
export const mapPart =
  (
    part: {
      field: string;
      facts: readonly string[];
      headingId: string | null;
      links: readonly StoryLink[];
    },
    token: PartToken,
    minHeight = "100%",
  ): Component =>
  () =>
    h(
      "div",
      {
        style: {
          ...PART_LABEL,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          boxSizing: "border-box",
          height: "100%",
          minHeight,
          padding: "16px 8px 8px",
          textAlign: "center",
          border: `1px dashed var(${token})`,
          background: tint(token, 35),
        },
      },
      [
        part.headingId
          ? h("h2", { id: part.headingId, style: PART_LABEL }, part.field)
          : h("code", part.field),
        ...part.facts.map((fact) => h("code", { style: CODE }, fact)),
        h(
          "span",
          { style: { display: "flex", flexWrap: "wrap", gap: "12px" } },
          part.links.map((link) =>
            h("a", { href: storyHref(link), target: "_top" }, link.label),
          ),
        ),
      ],
    );

/** A root region's card: its field and the ids it holds. */
export const regionPart = (
  region: {
    field: string;
    regionId: string;
    headingId: string;
    rendersHeading: boolean;
    links: readonly StoryLink[];
  },
  token: PartToken,
  minHeight = "100%",
): Component =>
  mapPart(
    {
      field: region.field,
      facts: [`#${region.regionId}`, `labelled by #${region.headingId}`],
      headingId: region.rendersHeading ? region.headingId : null,
      links: region.links,
    },
    token,
    minHeight,
  );

/** A region's heading part, shown so it can be inspected. Zero height, so it
 *  never moves the part it names. */
export const headingPart =
  (id: string, text: string): Component =>
  () =>
    h(
      "h2",
      {
        id,
        style: {
          ...CODE,
          position: "relative",
          zIndex: 1,
          height: 0,
          margin: 0,
          padding: "0 8px",
          color: "var(--r-color-fg)",
        },
      },
      `${text} · #${id}`,
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
            background: tint(token, 25),
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
        tabindex: 0,
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
