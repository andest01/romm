import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { StearchAction } from "../../store/stearch.actions";
import { MULTI_FIELD } from "../filters/fields/fields.story-args";
import HeaderControls from "./header-controls.pure-component.vue";

const ADVANCED_ACTIONS: readonly StearchAction[] = [
  { type: "view/set", patch: { isAdvancedOpen: true } },
];
const SORT_ACTIONS: readonly StearchAction[] = [
  {
    type: "query/set",
    patch: { sort: [{ param: "fs_size_bytes", dir: "desc" }] },
  },
];
const VIEW_ACTIONS: readonly StearchAction[] = [
  { type: "view/set", patch: { mode: "tiles" } },
];

const meta: Meta<typeof HeaderControls> = {
  title: "Stearch/ui/header/header-controls.pure-component.vue",
  tags: ["!autodocs"],
  component: HeaderControls,
  args: {
    groupLabel: "Results options",
    savedSearches: null,
    filters: {
      addLabel: "+ Add a filter",
      addFields: [MULTI_FIELD],
      openField: null,
      closeFieldLabel: "Back",
      closeFieldActions: [{ type: "view/set", patch: { openFieldId: null } }],
      pills: [],
      clearLabel: "Clear all",
      clearActions: [],
    },
    advanced: {
      isOpen: false,
      label: "Advanced mode",
      actions: ADVANCED_ACTIONS,
    },
    sort: {
      accessibleLabel: "Sort by Name, A to Z",
      label: "Sort by Name ↑",
      shortLabel: "Name ↑",
      sortByLabel: "Sort by",
      options: [
        { id: "name", label: "Name", isActive: true, actions: SORT_ACTIONS },
        {
          id: "fs_size_bytes",
          label: "Size",
          isActive: false,
          actions: SORT_ACTIONS,
        },
      ],
      directionLabel: "Direction",
      directions: [
        { id: "asc", label: "A to Z", isActive: true, actions: [] },
        { id: "desc", label: "Z to A", isActive: false, actions: [] },
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

type Story = StoryObj<typeof HeaderControls>;

export const Playground: Story = {};

export const SortMenu: Story = {
  args: { onPress: fn() },
  play: async ({ args, canvasElement }) => {
    // Act
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "Sort by Name, A to Z",
      }),
    );
    await userEvent.click(
      await within(document.body).findByRole("menuitem", { name: "Size" }),
    );

    // Assert
    await expect(args.onPress).toHaveBeenCalledWith(SORT_ACTIONS);
  },
};

export const PressingViewHandsActionsBack: Story = {
  args: { onPress: fn() },
  play: async ({ args, canvasElement }) => {
    // Act
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Table" }),
    );

    // Assert
    await expect(args.onPress).toHaveBeenCalledWith(VIEW_ACTIONS);
  },
};

export const PressingHandsActionsBack: Story = {
  args: { onPress: fn() },
  play: async ({ args, canvasElement }) => {
    // Act
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Advanced mode" }),
    );

    // Assert
    await expect(args.onPress).toHaveBeenCalledWith(ADVANCED_ACTIONS);
  },
};
