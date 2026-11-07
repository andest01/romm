import type { Meta, StoryObj } from "@storybook/vue3-vite";
import BackgroundPure from "./background.pure-component.vue";

const art = (from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/></svg>`,
  )}`;
const ART_SUNSET = art("#ff5e3a", "#ffd34e");
const ART_OCEAN = art("#1d4ed8", "#22d3ee");

const meta: Meta<typeof BackgroundPure> = {
  title: "Stearch/background/background.pure-component.vue",
  tags: ["!autodocs"],
  component: BackgroundPure,
  parameters: { layout: "fullscreen" },
  decorators: [
    () => ({
      template: `<div style="position: relative; height: 100vh"><story /></div>`,
    }),
  ],
  argTypes: {
    url: {
      options: [null, ART_SUNSET, ART_OCEAN],
      control: {
        type: "radio",
        labels: { null: "None", [ART_SUNSET]: "Sunset", [ART_OCEAN]: "Ocean" },
      },
    },
  },
  args: { url: ART_SUNSET },
};

export default meta;

export const Playground: StoryObj<typeof BackgroundPure> = {};
