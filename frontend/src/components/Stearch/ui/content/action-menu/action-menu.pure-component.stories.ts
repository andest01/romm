import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { ActionEntry } from "../../../store/action-menu.selectors";
import ActionMenu from "./action-menu.pure-component.vue";

const ADD: ActionEntry = {
  id: "collection:9",
  label: "Add 3 games to Shmups",
  verb: { kind: "add-to-collection", collectionId: 9, romIds: [1, 2, 3] },
};

const meta: Meta<typeof ActionMenu> = {
  title: "Stearch/ui/content/action-menu/action-menu.pure-component.vue",
  tags: ["!autodocs"],
  component: ActionMenu,
  args: {
    isOpen: true,
    title: "Bulk actions for 3 games",
    entries: [ADD],
    message: "",
  },
};

export default meta;

type Story = StoryObj<typeof ActionMenu>;

export const Playground: Story = {};

export const RunningHandsTheEntryBack: Story = {
  args: { onRun: fn() },
  play: async ({ args }) => {
    // Act
    await userEvent.click(
      await within(document.body).findByRole("button", {
        name: "Add 3 games to Shmups",
      }),
    );

    // Assert
    await expect(args.onRun).toHaveBeenCalledWith(ADD);
  },
};
