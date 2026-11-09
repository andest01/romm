import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import { gamepadFixture } from "@/utils/gamepad.fixtures";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "../../../Stearch.story-helpers";
import {
  FAILED_STEARCH_STATE,
  LOADED_STEARCH_STATE as loaded,
  LOADING_STEARCH_STATE,
} from "../../../store/fixtures";
import ListContainer from "./list.container.vue";

const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/ui/content/list/list.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(ListContainer),
};

export default meta;

type Story = StoryObj<ContainerStoryArgs>;

export const Loading: Story = { args: { state: LOADING_STEARCH_STATE } };

export const Failed: Story = { args: { state: FAILED_STEARCH_STATE } };

/** D-pad keys land on the focused element, which may have fallen to the page. */
export const ArrowsWorkWithoutFocus: Story = {
  tags: ["!dev"],
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    // Arrange
    const grid = await within(canvasElement).findByRole("grid");
    grid.blur();

    // Act
    await fireEvent.keyDown(document.body, { key: "ArrowRight" });

    // Assert
    await waitFor(() => expect(document.activeElement).toBe(grid));
  },
};

/** A screen reader follows the active item while focus stays on the grid. */
export const ArrowsNameTheActiveItem: Story = {
  tags: ["!dev"],
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    // Arrange
    const grid = await within(canvasElement).findByRole("grid");

    // Act
    await fireEvent.keyDown(grid, { key: "ArrowRight" });
    await fireEvent.keyDown(grid, { key: "ArrowRight" });

    // Assert
    await waitFor(() => {
      const id = grid.getAttribute("aria-activedescendant");
      if (!id) throw new Error("No active descendant");
      return expect(document.getElementById(id)).not.toBeNull();
    });
  },
};

/** A stand-in pad whose left stick the story can move. */
function fakePad() {
  let stickY = 0;
  const original = navigator.getGamepads.bind(navigator);
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: () => [gamepadFixture({ axes: [0, stickY, 0, 0] })],
  });
  return {
    push: (y: number) => {
      stickY = y;
      window.dispatchEvent(new Event("gamepadconnected"));
    },
    restore: () =>
      Object.defineProperty(navigator, "getGamepads", {
        configurable: true,
        value: original,
      }),
  };
}

const activeItem = (grid: HTMLElement) =>
  grid.getAttribute("aria-activedescendant");

/** The active item's row; the section heading is row 1, the first games 2. */
const activeRowIndex = (grid: HTMLElement) =>
  grid
    .querySelector('[data-key-position="true"]')
    ?.closest('[role="row"]')
    ?.getAttribute("aria-rowindex");

/** At the top limit the view can't pan, so the stick walks to the first row. */
export const StickReachesTheFirstRow: Story = {
  tags: ["!dev"],
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    // Arrange
    const pad = fakePad();
    const grid = await within(canvasElement).findByRole("grid");
    for (let press = 0; press < 3; press++) {
      await fireEvent.keyDown(grid, { key: "ArrowDown" });
    }

    await waitFor(() => expect(activeRowIndex(grid)).not.toBe("2"));

    // Act
    pad.push(-1);

    // Assert
    await waitFor(() => expect(activeRowIndex(grid)).toBe("2"), {
      timeout: 3000,
    });
    pad.push(0);
    pad.restore();
  },
};

/** The first row is outside the band: a gentle push must not jump to the band. */
export const StickStaysOnTheFirstRow: Story = {
  tags: ["!dev"],
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    // Arrange
    const pad = fakePad();
    const grid = await within(canvasElement).findByRole("grid");
    await fireEvent.keyDown(grid, { key: "ArrowDown" });
    await waitFor(() => expect(activeItem(grid)).toBe("stearch-item-0"));

    // Act
    pad.push(0.15);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Assert
    await expect(activeItem(grid)).toBe("stearch-item-0");
    pad.push(0);
    pad.restore();
  },
};

/** With focus elsewhere, like the filters, the stick leaves the list alone. */
export const StickLeavesTheListWhenFocusIsElsewhere: Story = {
  tags: ["!dev"],
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    // Arrange
    const pad = fakePad();
    const canvas = within(canvasElement);
    const grid = await canvas.findByRole("grid");
    await fireEvent.keyDown(grid, { key: "ArrowDown" });
    await waitFor(() => expect(activeItem(grid)).toBe("stearch-item-0"));
    const [letter] = await within(
      await canvas.findByRole("toolbar"),
    ).findAllByRole("button");
    if (!letter) throw new Error("No letters rendered");
    // The list takes focus as it finishes opening.
    await new Promise((resolve) => setTimeout(resolve, 300));
    letter.focus();
    await expect(document.activeElement).toBe(letter);

    // Act
    pad.push(1);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Assert
    await expect(activeItem(grid)).toBe("stearch-item-0");
    pad.push(0);
    pad.restore();
  },
};

/** A Ctrl-click selects; a plain click only makes the game current. */
export const SelectingDispatches: Story = {
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    // Arrange
    const [tile] = await within(canvasElement).findAllByRole("button");
    if (!tile) throw new Error("No tile rendered");

    // Act
    await userEvent.keyboard("{Control>}");
    await userEvent.click(tile);
    await userEvent.keyboard("{/Control}");

    // Assert
    await expect(tile).toHaveAttribute("aria-pressed", "true");
  },
};
