import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { computed } from "vue";
import { STEARCH_ROW, stearchSlots } from "../../Stearch.fixtures";
import { ITEM_VERBS } from "./item.story-args";
import { LIST_ITEMS } from "./list.items";
import type { ListItemKind, ListProps } from "./list.props";
import ListPure from "./list.pure-component.vue";
import { buildScrollRows, headHeightFor, rowHeightFor } from "./list.selectors";

type Args = Pick<ListProps, "columns" | "errorMessage" | "emptyMessage"> & {
  itemKind: ListItemKind;
  itemCount: number;
  pendingCount: number;
  onPress: () => void;
};

const meta: Meta<Args> = {
  title: "Stearch/content/list/list.pure-component.vue",
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    itemCount: { control: { type: "range", min: 0, max: 1000, step: 1 } },
    pendingCount: { control: { type: "range", min: 0, max: 100, step: 1 } },
    itemKind: {
      control: "radio",
      options: Object.keys(LIST_ITEMS),
    },
    columns: { control: { type: "range", min: 1, max: 8, step: 1 } },
    errorMessage: { control: "text" },
    emptyMessage: { control: "text" },
    onPress: { control: false },
  },
  args: {
    itemCount: 100,
    pendingCount: 0,
    itemKind: "tile",
    columns: 4,
    errorMessage: null,
    emptyMessage: "No games match your search.",
    onPress: fn(),
  },
  render: (args) => ({
    components: { ListPure },
    setup: () => ({
      args,
      item: computed(() => LIST_ITEMS[args.itemKind]),
      verbs: ITEM_VERBS,
      setScroller: () => undefined,
      rowHeight: computed(() => rowHeightFor(args.itemKind, window.innerWidth)),
      rows: computed(() =>
        buildScrollRows(
          stearchSlots(args.itemCount, args.pendingCount),
          args.columns,
          [],
        ),
      ),
      headHeight: headHeightFor(false),
    }),
    template: `
      <div style="height: 100vh">
        <ListPure
          :rows="rows"
          :row-height="rowHeight"
          :head-height="headHeight"
          :columns="args.columns"
          :item="item"
          :verbs="verbs"
          :set-scroller="setScroller"
          :error-message="args.errorMessage"
          :empty-message="args.emptyMessage"
          @press="args.onPress"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {};

export const PressingHandsActionsBack: Story = {
  args: { itemCount: 1 },
  play: async ({ args, canvasElement }) => {
    const tile = await within(canvasElement).findByRole("button");
    await userEvent.click(tile);
    await expect(args.onPress).toHaveBeenCalledWith(STEARCH_ROW.pressActions);
  },
};
