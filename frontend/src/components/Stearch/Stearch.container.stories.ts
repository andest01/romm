import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import StearchContainer from "./Stearch.container.vue";
import {
  EMPTY_STEARCH_STATE,
  FAILED_STEARCH_STATE,
  LOADED_STEARCH_STATE as loaded,
  LOADING_STEARCH_STATE,
} from "./Stearch.fixtures";
import { INITIAL_STEARCH_STATE } from "./Stearch.reducer";
import {
  CONTAINER_STORY_META,
  renderContainer,
  type ContainerStoryArgs,
} from "./Stearch.story-helpers";

// The whole page: any app state is one arg away.
const meta: Meta<ContainerStoryArgs> = {
  title: "Stearch/Stearch.container.vue",
  tags: ["!autodocs"],
  ...CONTAINER_STORY_META,
  render: renderContainer(StearchContainer),
};

export default meta;

type Story = StoryObj<ContainerStoryArgs>;

export const LiveFakeApi: Story = { args: { state: INITIAL_STEARCH_STATE } };

export const Loading: Story = { args: { state: LOADING_STEARCH_STATE } };

export const ListView: Story = { args: { state: loaded } };

export const TableView: Story = {
  args: { state: { ...loaded, view: { ...loaded.view, mode: "table" } } },
};

export const Empty: Story = { args: { state: EMPTY_STEARCH_STATE } };

export const Failed: Story = {
  args: { state: FAILED_STEARCH_STATE },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Could not load your library."),
    ).toBeVisible();
  },
};

export const AdvancedOpen: Story = {
  args: {
    state: { ...loaded, view: { ...loaded.view, isAdvancedOpen: true } },
  },
};

export const WithSelection: Story = {
  args: {
    state: {
      ...loaded,
      attention: { activeId: null, selectedIds: [1, 2, 3] },
    },
  },
};

export const SearchDispatchesAndReloads: Story = {
  args: { state: loaded },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("textbox"), "zelda");
    await waitFor(
      async () => {
        await expect(canvas.getByText("125")).toBeVisible();
      },
      { timeout: 3000 },
    );
  },
};
