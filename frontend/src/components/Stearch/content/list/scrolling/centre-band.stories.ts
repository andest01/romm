import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { UPDATE_STORY_ARGS } from "storybook/internal/core-events";
import { addons } from "storybook/preview-api";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { type ScrollFeel, TABLE_FEEL, TILES_FEEL } from "../list.props";
import CentreBand from "./centre-band.vue";
import { FEEL_ARG_TYPES, feelArgs } from "./feel.story-args";

const meta: Meta<typeof CentreBand> = {
  title: "Stearch/content/list/scrolling/centre-band.vue",
  tags: ["!autodocs"],
  component: CentreBand,
  parameters: { layout: "fullscreen" },
  argTypes: {
    follow: { control: "radio", options: ["feel", "scroll into view (old)"] },
    ...FEEL_ARG_TYPES,
    stickStandIn: { control: { type: "range", min: -1, max: 1, step: 0.05 } },
    rowCount: { control: { type: "range", min: 5, max: 1000, step: 5 } },
    rowHeight: { control: { type: "range", min: 24, max: 120, step: 4 } },
    viewportHeight: {
      control: { type: "range", min: 200, max: 800, step: 20 },
    },
    repeatMs: { control: { type: "range", min: 30, max: 250, step: 10 } },
  },
  args: {
    follow: "feel",
    ...feelArgs(TABLE_FEEL),
    stickStandIn: 0,
    // Three screens: short enough to reach the start, middle and end quickly.
    rowCount: 30,
    rowHeight: 48,
    viewportHeight: 480,
    repeatMs: 120,
  },
};

export default meta;

type Story = StoryObj<typeof CentreBand>;

/** The table's feel: every tap is a jump cut, and a held key repeats steps.
 *  Near the start and end the list can't scroll further, so the row leaves
 *  the band there and it turns red: that is the clamp, not a miss. */
export const TableFeel: Story = {};

/** The tiles' feel: jump cuts with a one-row band, like the table. The same
 *  values drive the real tiles. */
export const TilesFeel: Story = { args: feelArgs(TILES_FEEL) };

// Not used by any view today: kept so the glide and cruise can be judged.
const GLIDE_AND_CRUISE: ScrollFeel = {
  ...TILES_FEEL,
  glideMs: 110,
  cruise: { startRowsPerSecond: 8, maxRowsPerSecond: 20, rampMs: 1000 },
};

/** A feel no view uses yet: a tap glides in a straight line, a hold cruises.
 *  Try the glide and cruise sliders. */
export const GlideAndCruise: Story = { args: feelArgs(GLIDE_AND_CRUISE) };

/** The old behaviour, for contrast: the row leaves the screen before the
 *  view moves, then a smooth scroll fights the next press. */
/** The left stick, analog. Set the toolbar's Input to Gamepad and push the
 *  stick: a little creeps, a lot flies. No pad? Drag `stickStandIn`. Watch
 *  the Stick readout for the curve, and open "This feel as code" to copy a
 *  setting you like. */
export const Stick: Story = { args: { rowCount: 200 } };

/** A half push moves the list on its own, and the active row catches up. */
export const StickHalfPushMoves: Story = {
  // A check, not a page to browse: it runs in tests, hidden from the sidebar.
  tags: ["!dev"],
  args: { rowCount: 200, stickStandIn: 0.5 },
  play: async ({ canvasElement }) => {
    // Assert
    const canvas = within(canvasElement);
    await waitFor(
      () => expect(canvas.getByTestId("mode")).toHaveTextContent("stick"),
      { timeout: 2000 },
    );
    await waitFor(
      () =>
        expect(
          Number(canvas.getByTestId("active").textContent),
        ).toBeGreaterThan(2),
      { timeout: 4000 },
    );
  },
};

export const ScrollIntoViewOld: Story = {
  args: { follow: "scroll into view (old)" },
};

// Play stories press far down, so they keep a long list.
const LONG_LIST = { rowCount: 200 };

async function pressDown(canvasElement: HTMLElement, times: number) {
  await userEvent.click(within(canvasElement).getByRole("listbox"));
  for (let press = 0; press < times; press++) {
    await userEvent.keyboard("{ArrowDown}");
  }
}

// Moving down, the row rests on the band's lower edge: inset + band - row.
// With a 480px viewport and 48px rows: 1 row → 216, 2 → 240, 4 → 288.
const restingOffset = (bandRows: number) => {
  const band = bandRows * 48;
  return (480 - band) / 2 + band - 48;
};

export const HoldingDownStaysInBand: Story = {
  tags: ["!dev"],
  args: LONG_LIST,
  play: async ({ canvasElement }) => {
    // Act
    await pressDown(canvasElement, 30);

    // Assert
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("active")).toHaveTextContent("30");
    await expect(canvas.getByTestId("inside")).toHaveTextContent("yes");
  },
};

/** A one-row band: the list moves on every press once the row reaches the middle. */
export const NarrowBand: Story = {
  tags: ["!dev"],
  args: { ...LONG_LIST, bandRows: 1 },
  play: async ({ canvasElement }) => {
    // Act
    await pressDown(canvasElement, 20);

    // Assert
    await expect(within(canvasElement).getByTestId("offset")).toHaveTextContent(
      String(restingOffset(1)),
    );
  },
};

/** A four-row band: the row roams further before the list starts to move. */
export const WideBand: Story = {
  tags: ["!dev"],
  args: { ...LONG_LIST, bandRows: 4 },
  play: async ({ canvasElement }) => {
    // Act
    await pressDown(canvasElement, 20);

    // Assert
    await expect(within(canvasElement).getByTestId("offset")).toHaveTextContent(
      String(restingOffset(4)),
    );
  },
};

/** A glide lands where a jump cut does, just later. */
export const GlideLandsInBand: Story = {
  tags: ["!dev"],
  args: { ...LONG_LIST, ...feelArgs(GLIDE_AND_CRUISE) },
  play: async ({ canvasElement }) => {
    // Act
    await pressDown(canvasElement, 20);

    // Assert
    await waitFor(() =>
      expect(within(canvasElement).getByTestId("offset")).toHaveTextContent(
        String(restingOffset(GLIDE_AND_CRUISE.bandRows)),
      ),
    );
  },
};

/** Holding ↓ with a cruise, then landing in the band on release. */
export const HoldCruises: Story = {
  tags: ["!dev"],
  args: { ...LONG_LIST, ...feelArgs(GLIDE_AND_CRUISE) },
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    const holdDown = canvas.getByRole("button", { name: "Hold ↓" });

    // Act
    await userEvent.pointer({ keys: "[MouseLeft>]", target: holdDown });
    await waitFor(
      () => expect(canvas.getByTestId("mode")).toHaveTextContent("cruise"),
      { timeout: 2000 },
    );
    await new Promise((resolve) => setTimeout(resolve, 800));
    await userEvent.pointer({ keys: "[/MouseLeft]", target: holdDown });

    // Assert
    await waitFor(() =>
      expect(canvas.getByTestId("inside")).toHaveTextContent("yes"),
    );
    await expect(
      Number(canvas.getByTestId("active").textContent),
    ).toBeGreaterThan(5);
  },
};

/** Watch the controls panel: play narrows the band from 4 rows to 1, and the
 *  row settles lower in the band each time. Drag the control afterwards to
 *  try your own. */
export const PlayDrivesTheControls: Story = {
  args: { ...LONG_LIST, bandRows: 4 },
  play: async ({ canvasElement, id }) => {
    const canvas = within(canvasElement);
    for (const bandRows of [4, 2, 1]) {
      // Arrange
      addons.getChannel().emit(UPDATE_STORY_ARGS, {
        storyId: id,
        updatedArgs: { bandRows },
      });
      await waitFor(() =>
        expect(canvas.getByTestId("band")).toHaveTextContent(
          `${(480 - bandRows * 48) / 2} to`,
        ),
      );

      // Act
      await pressDown(canvasElement, 15);

      // Assert
      await expect(canvas.getByTestId("offset")).toHaveTextContent(
        String(restingOffset(bandRows)),
      );
    }
  },
};
