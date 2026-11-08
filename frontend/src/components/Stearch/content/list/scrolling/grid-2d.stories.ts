import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import Grid2d from "./grid-2d.vue";

const meta: Meta<typeof Grid2d> = {
  title: "Stearch/content/list/scrolling/grid-2d.vue",
  tags: ["!autodocs"],
  component: Grid2d,
  parameters: { layout: "fullscreen" },
  // Live input: the real gamepad runs, so the D-pad, stick and A work at once.
  globals: { input: "live" },
  argTypes: {
    boxRows: { control: { type: "range", min: 1, max: 8, step: 1 } },
    boxCols: { control: { type: "range", min: 1, max: 8, step: 1 } },
    deadzone: { control: { type: "range", min: 0, max: 0.5, step: 0.01 } },
    minCellsPerSecond: {
      control: { type: "range", min: 0, max: 10, step: 0.1 },
    },
    maxCellsPerSecond: {
      control: { type: "range", min: 1, max: 60, step: 1 },
    },
    gamma: { control: { type: "range", min: 0.5, max: 3, step: 0.1 } },
    rows: { control: { type: "range", min: 24, max: 512, step: 8 } },
    cols: { control: { type: "range", min: 24, max: 512, step: 8 } },
    cellSize: { control: { type: "range", min: 16, max: 96, step: 4 } },
    standInX: { control: { type: "range", min: -1, max: 1, step: 0.05 } },
    standInY: { control: { type: "range", min: -1, max: 1, step: 0.05 } },
  },
  args: {
    boxRows: 1,
    boxCols: 1,
    deadzone: 0.12,
    minCellsPerSecond: 0.5,
    maxCellsPerSecond: 30,
    gamma: 1,
    rows: 128,
    cols: 128,
    cellSize: 32,
    standInX: 0,
    standInY: 0,
  },
};

export default meta;

type Story = StoryObj<typeof Grid2d>;

/** A 128 × 128 grid filling the canvas: try the viewport sizes. Pan with the
 *  left stick, step
 *  with the D-pad or arrows, select with Space. */
export const Explore: Story = {};

/** A wider box lets the active cell roam before the view moves. */
export const WideBox: Story = { args: { boxRows: 3, boxCols: 5 } };

/** Arrows walk the cell in the wide box as in the narrow one. */
export const WideBoxArrowsStep: Story = {
  tags: ["!dev"],
  args: { boxRows: 3, boxCols: 5 },
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("listbox"));

    // Act
    for (let press = 0; press < 30; press++) {
      await userEvent.keyboard("{ArrowRight}{ArrowDown}");
    }

    // Assert
    await expect(canvas.getByTestId("active")).toHaveTextContent("r30 c30");
    await expect(canvas.getByTestId("inside")).toHaveTextContent("yes");
  },
};

/** A command moves data and screen together; the live FSM shows the result. */
export const CommandToMiddle: Story = {
  tags: ["!dev"],
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    const command = canvas.getByRole("button", {
      name: "navigateTo middle",
    });

    // Act
    await userEvent.click(command);

    // Assert
    await expect(canvas.getByTestId("active")).toHaveTextContent("r64 c64");
    await waitFor(() =>
      expect(canvas.getByTestId("fsm-rows")).toHaveAttribute(
        "data-state",
        "captured",
      ),
    );
  },
};

/** Steps landing inside one frame must not lose the view. */
export const StepsInOneFrameKeepFollowing: Story = {
  tags: ["!dev"],
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "navigateTo middle" }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId("inside")).toHaveTextContent("yes"),
    );
    const list = canvas.getByRole("listbox");

    // Act
    for (let press = 0; press < 4; press++) {
      void fireEvent.keyDown(list, { key: "ArrowDown" });
    }

    // Assert
    await waitFor(() =>
      expect(canvas.getByTestId("active")).toHaveTextContent("r68 c64"),
    );
    await waitFor(() =>
      expect(canvas.getByTestId("inside")).toHaveTextContent("yes"),
    );
  },
};

/** Stepping from captured never passes through free, even for a frame. */
export const StepsNeverLeaveCaptured: Story = {
  tags: ["!dev"],
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "navigateTo middle" }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId("inside")).toHaveTextContent("yes"),
    );

    // Act
    for (let press = 0; press < 6; press++) {
      await userEvent.keyboard("{ArrowDown}");
    }

    // Assert
    await expect(
      canvas.getByRole("list", { name: "What just happened" }),
    ).not.toHaveTextContent("captured to free");
  },
};

/** A held key from the top: once in the band, the view follows every press. */
export const HeldKeyKeepsFollowing: Story = {
  tags: ["!dev"],
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    const list = canvas.getByRole("listbox");
    const nextFrame = () =>
      new Promise((resolve) => requestAnimationFrame(resolve));

    // Act
    for (let press = 0; press < 90; press++) {
      void fireEvent.keyDown(list, { key: "ArrowDown", repeat: press > 0 });
      if (press % 3 !== 0) await nextFrame();
    }

    // Assert
    await waitFor(() =>
      expect(canvas.getByTestId("active")).toHaveTextContent("r90 c0"),
    );
    await waitFor(() =>
      expect(canvas.getByTestId("bands")).toHaveTextContent("horizontal yes"),
    );
  },
};

/** After the wheel moves the view away, a key moving further away follows. */
export const KeyFollowsAfterWheel: Story = {
  tags: ["!dev"],
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "navigateTo middle" }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId("inside")).toHaveTextContent("yes"),
    );
    const list = canvas.getByRole("listbox");
    list.scrollTop += 320;
    await waitFor(() =>
      expect(canvas.getByTestId("bands")).toHaveTextContent("horizontal no"),
    );

    // Act
    await fireEvent.keyDown(list, { key: "ArrowUp" });

    // Assert
    await waitFor(() =>
      expect(canvas.getByTestId("bands")).toHaveTextContent("horizontal yes"),
    );
  },
};

/** The D-pad's keys land on the focused element, which may be the page. */
export const DpadWorksWithoutGridFocus: Story = {
  tags: ["!dev"],
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    canvas.getByRole("listbox").blur();

    // Act
    await fireEvent.keyDown(document.body, { key: "ArrowRight" });

    // Assert
    await waitFor(() =>
      expect(canvas.getByTestId("active")).toHaveTextContent("r0 c1"),
    );
  },
};

/** A flight passes through the space between, rather than cutting to it. */
export const FlyToAnimates: Story = {
  tags: ["!dev"],
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    const list = canvas.getByRole("listbox");
    const seen = new Set<number>();

    // Act
    await userEvent.click(canvas.getByRole("button", { name: "flyTo middle" }));
    await waitFor(
      async () => {
        seen.add(list.scrollTop);
        await expect(list.scrollTop).toBeGreaterThan(1500);
        await expect(seen.size).toBeGreaterThan(5);
      },
      { interval: 16, timeout: 4000 },
    );

    // Assert
    await expect(seen.size).toBeGreaterThan(5);
  },
};

/** A held full push becomes cruise: steps, with the view locked on. */
export const FullPushCruises: Story = {
  tags: ["!dev"],
  args: { standInY: 1 },
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);

    // Assert
    await waitFor(
      () =>
        expect(canvas.getByTestId("fsm-rows")).toHaveAttribute(
          "data-state",
          "cruising",
        ),
      { timeout: 3000 },
    );
    await expect(canvas.getByTestId("bands")).toHaveTextContent(
      "horizontal yes",
    );
  },
};

/** A command that changes only data leaves the view, so the cell goes free. */
export const CommandSetsActiveOnly: Story = {
  tags: ["!dev"],
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    const command = canvas.getByRole("button", {
      name: "setActive bottom right",
    });

    // Act
    await userEvent.click(command);

    // Assert
    await expect(canvas.getByTestId("active")).toHaveTextContent("r127 c127");
    await expect(canvas.getByTestId("fsm-rows")).toHaveAttribute(
      "data-state",
      "free",
    );
  },
};

/** A diagonal stand-in push pans both ways at once. */
export const DiagonalPush: Story = {
  // A check, not a page to browse: it runs in tests, hidden from the sidebar.
  tags: ["!dev"],
  args: { standInX: 0.7, standInY: 0.7 },
  play: async ({ canvasElement }) => {
    // Assert
    const canvas = within(canvasElement);
    await waitFor(
      () => expect(canvas.getByTestId("active").textContent).not.toBe("r0 c0"),
      { timeout: 4000 },
    );
  },
};

/** Arrows step one cell and keep it in the box. */
export const ArrowsStepAndFollow: Story = {
  tags: ["!dev"],
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("listbox"));

    // Act
    for (let press = 0; press < 20; press++) {
      await userEvent.keyboard("{ArrowRight}{ArrowDown}");
    }

    // Assert
    await expect(canvas.getByTestId("active")).toHaveTextContent("r20 c20");
    await expect(canvas.getByTestId("inside")).toHaveTextContent("yes");
  },
};
