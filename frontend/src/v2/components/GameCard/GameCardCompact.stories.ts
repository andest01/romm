import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, within } from "storybook/test";
import { romFixture } from "@/utils/rom.fixtures";
import GameCardCompact from "./GameCardCompact.vue";
import { compactCardVars } from "./compactCard";

// A flat colour cover, as an SVG data URI: no network, and the card's crop
// and focus ring read clearly against it.
const cover = (color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><rect width="240" height="360" fill="${color}"/><rect x="20" y="20" width="200" height="320" fill="none" stroke="white" stroke-opacity="0.6" stroke-width="4"/></svg>`,
  )}`;

const base = {
  id: 1,
  name: "Super Mario World",
  fs_name_no_ext: "Super Mario World (USA)",
  platform_display_name: "Super Nintendo",
  platform_custom_name: null,
  platform_slug: "snes",
  path_cover_small: cover("#3b6ea5"),
  path_cover_large: cover("#3b6ea5"),
  url_cover: null,
  regions: ["US"],
  is_identified: true,
  updated_at: "2026-10-17T05:03:38+00:00",
};

const meta: Meta<typeof GameCardCompact> = {
  title: "Media/GameCardCompact",
  component: GameCardCompact,
  args: { rom: romFixture(base), position: 0 },
  decorators: [
    (story) => ({
      components: { story },
      setup: () => ({ vars: compactCardVars() }),
      // The grid applies these once on its root; the story does the same.
      template: `<div :style="vars" style="display:flex;flex-wrap:wrap;gap:12px;padding:16px"><story /></div>`,
    }),
  ],
};

export default meta;

type Story = StoryObj<typeof GameCardCompact>;

export const Rest: Story = {};

export const Focused: Story = { args: { focused: true } };

export const Selected: Story = { args: { selected: true } };

export const NoCover: Story = {
  args: {
    rom: romFixture({
      ...base,
      id: 2,
      path_cover_small: "",
      path_cover_large: "",
    }),
  },
  play: async ({ canvasElement }) => {
    const card = within(canvasElement).getByRole("link");

    await expect(card).toHaveClass("is-nocover");
  },
};

export const Unmatched: Story = {
  args: { rom: romFixture({ ...base, id: 3, is_identified: false }) },
  play: async ({ canvasElement }) => {
    // The platform icon is a labelled image too; the match mark is the other.
    const mark = within(canvasElement).getByRole("img", {
      name: /not.identified/i,
    });

    await expect(mark).toHaveTextContent("?");
  },
};

export const LongTitle: Story = {
  args: {
    rom: romFixture({
      ...base,
      id: 4,
      name: "The Legend of Zelda: A Link to the Past and Four Swords Anniversary Edition",
      regions: ["US", "EU", "JP"],
    }),
  },
};

export const States: Story = {
  render: (args) => ({
    components: { GameCardCompact },
    setup: () => ({
      args,
      roms: [
        romFixture({ ...base, id: 1 }),
        romFixture({
          ...base,
          id: 2,
          path_cover_small: "",
          path_cover_large: "",
        }),
        romFixture({ ...base, id: 3, is_identified: false }),
        romFixture({ ...base, id: 4, path_cover_small: cover("#a5503b") }),
      ],
    }),
    template: `
      <GameCardCompact :rom="roms[0]" :position="0" />
      <GameCardCompact :rom="roms[1]" :position="1" focused />
      <GameCardCompact :rom="roms[2]" :position="2" />
      <GameCardCompact :rom="roms[3]" :position="3" selected />
    `,
  }),
  play: async ({ canvasElement }) => {
    const cards = within(canvasElement).getAllByRole("link");

    await expect(cards).toHaveLength(4);
    // Only the cursor card is reachable by Tab; the grid moves it with the arrows.
    await expect(cards.filter((c) => c.tabIndex === 0)).toHaveLength(1);
    await expect(cards[1]).toHaveClass("is-cursor");
    await expect(cards[3]).toHaveClass("is-selected");
    await expect(cards[0]).toHaveAttribute("href", "/rom/1");
  },
};
