import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { StearchAction } from "../Stearch.actions";
import { MULTI_FIELD, TRI_STATE_FIELD } from "../fields/fields.story-args";
import HeaderPure from "./header.pure-component.vue";

const ADVANCED_ACTIONS: readonly StearchAction[] = [
  { type: "advanced/toggle" },
];
const SORT_ACTIONS: readonly StearchAction[] = [
  { type: "query/set", patch: { orderBy: "fs_size_bytes" } },
];
const VIEW_ACTIONS: readonly StearchAction[] = [
  { type: "view/set", mode: "tiles" },
];

const meta: Meta<typeof HeaderPure> = {
  title: "Stearch/header/header.pure-component.vue",
  tags: ["!autodocs"],
  component: HeaderPure,
  parameters: { layout: "fullscreen" },
  args: {
    search: {
      term: "",
      placeholder: "Name, filename, hash...",
      resultCount: 601,
    },
    filters: {
      addLabel: "+ Add a filter",
      addFields: [MULTI_FIELD],
      openField: null,
      closeFieldLabel: "Back",
      closeFieldActions: [{ type: "field/open", id: null }],
      pills: [MULTI_FIELD, TRI_STATE_FIELD],
      clearLabel: "Clear all",
      clearActions: [{ type: "query/set", patch: { selectedGenres: [] } }],
    },
    advanced: {
      isOpen: false,
      label: "Advanced mode",
      actions: ADVANCED_ACTIONS,
    },
    sort: {
      label: "Sort by Name ↑",
      options: [
        { id: "name", label: "Name ↑", actions: SORT_ACTIONS },
        { id: "fs_size_bytes", label: "Size", actions: SORT_ACTIONS },
      ],
    },
    view: {
      mode: "table",
      options: [
        { id: "tiles", label: "Tiles" },
        { id: "table", label: "Table" },
      ],
      actions: VIEW_ACTIONS,
    },
  },
};

export default meta;

type Story = StoryObj<typeof HeaderPure>;

export const Playground: Story = {};

export const Typing: Story = {
  args: { onSearch: fn() },
  play: async ({ args, canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole("textbox"), "z");
    await expect(args.onSearch).toHaveBeenCalledWith("z");
  },
};

export const SortMenu: Story = {
  args: { onPress: fn() },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Sort by Name ↑" }),
    );
    await userEvent.click(
      await within(document.body).findByRole("menuitem", { name: "Size" }),
    );
    await expect(args.onPress).toHaveBeenCalledWith(SORT_ACTIONS);
  },
};

export const PressingViewHandsActionsBack: Story = {
  args: { onPress: fn() },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Table" }),
    );
    await expect(args.onPress).toHaveBeenCalledWith(VIEW_ACTIONS);
  },
};

export const PressingHandsActionsBack: Story = {
  args: { onPress: fn() },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Advanced mode" }),
    );
    await expect(args.onPress).toHaveBeenCalledWith(ADVANCED_ACTIONS);
  },
};
