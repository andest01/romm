import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, waitFor } from "storybook/test";
import { getCurrentInstance } from "vue";
import { AsyncMdPreview, lazyMarkdown } from "./asyncMarkdown";

const SAMPLE =
  "# Notes\n\nA **time-travel** RPG. Notes support the usual Markdown.";

const meta = {
  title: "Shared/AsyncMarkdown",
  // Padded, not centered: a centered story shrinks to its content's width.
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// The real preview: md-editor loads on first render, then draws the heading.
export const Preview: Story = {
  render: () => ({
    components: { AsyncMdPreview },
    setup: () => ({ sample: SAMPLE }),
    template: `<div style="max-width: 720px"><AsyncMdPreview :model-value="sample" /></div>`,
  }),
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(
        canvasElement.querySelector(".md-editor-preview h1"),
      ).not.toBeNull(),
    );
  },
};

// A chunk that never arrives: the skeleton shows after the delay.
export const Loading: Story = {
  render: () => {
    const Lazy = lazyMarkdown(() => new Promise(() => {}), "4rem");
    return {
      components: { Lazy },
      template: `<div style="max-width: 720px"><Lazy /></div>`,
    };
  },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector(".r-skeleton")).not.toBeNull(),
    );
  },
};

// The first load fails; Try again loads the real preview.
export const Failed: Story = {
  render: () => {
    let attempts = 0;
    const Lazy = lazyMarkdown(
      () =>
        attempts++ === 0
          ? Promise.reject(new Error("chunk failed"))
          : import("./markdownPreview"),
      "4rem",
    );
    return {
      components: { Lazy },
      setup() {
        // Vue reports a failed async load to the app handler, which would fail the story.
        getCurrentInstance()!.appContext.config.errorHandler = () => {};
        return { sample: SAMPLE };
      },
      template: `<div style="max-width: 720px"><Lazy :model-value="sample" /></div>`,
    };
  },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector("[role='alert']")).not.toBeNull(),
    );
  },
};
