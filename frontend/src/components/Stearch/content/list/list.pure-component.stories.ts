import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { computed } from "vue";
import { STEARCH_ROW, stearchSlots } from "../../Stearch.fixtures";
import { ITEM_VERBS } from "./item.story-args";
import { LIST_ITEMS } from "./list.items";
import type { ListItemKind, ListProps } from "./list.props";
import ListPure from "./list.pure-component.vue";
import { buildScrollRows, headHeightFor, itemFit } from "./list.selectors";

type Args = Pick<ListProps, "errorMessage" | "emptyMessage"> & {
  itemKind: ListItemKind;
  /** The width items get. Columns and row height follow from it. */
  listWidth: number;
  itemCount: number;
  pendingCount: number;
  onPress: () => void;
};

const meta: Meta<Args> = {
  title: "Stearch/content/list/list.pure-component.vue",
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    itemKind: { control: "radio", options: Object.keys(LIST_ITEMS) },
    listWidth: { control: { type: "range", min: 280, max: 2400, step: 10 } },
    itemCount: { control: { type: "range", min: 0, max: 1000, step: 1 } },
    pendingCount: { control: { type: "range", min: 0, max: 100, step: 1 } },
    errorMessage: { control: "text" },
    emptyMessage: { control: "text" },
    onPress: { control: false },
  },
  args: {
    itemKind: "tile",
    listWidth: 1340,
    itemCount: 100,
    pendingCount: 0,
    errorMessage: null,
    emptyMessage: "No games match your search.",
    onPress: fn(),
  },
  render: (args) => ({
    components: { ListPure },
    setup: () => {
      const fit = computed(() =>
        itemFit(args.itemKind, { width: args.listWidth }),
      );
      return {
        args,
        fit,
        item: computed(() => LIST_ITEMS[args.itemKind]),
        verbs: ITEM_VERBS,
        setScroller: () => undefined,
        headHeight: headHeightFor(args.itemKind.startsWith("phone")),
        rows: computed(() =>
          buildScrollRows(
            stearchSlots(args.itemCount, args.pendingCount),
            fit.value.columns,
            [],
          ),
        ),
      };
    },
    template: `
      <div :style="{ height: '100vh', width: args.listWidth + 'px' }">
        <ListPure
          :rows="rows"
          :row-height="fit.rowHeight"
          :head-height="headHeight"
          :columns="fit.columns"
          :item="item"
          :verbs="verbs"
          :set-scroller="setScroller"
          :band="null"
          :band-offset="0"
          :rail="null"
          :scrollbar-width="0"
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

/** v4's phone photo grid on a 320 phone: five covers a row. */
export const PhoneCovers: Story = {
  args: { itemKind: "phone-cover", listWidth: 320 },
};

/** Your 1920 screen with the panel open: four tiles a row. */
export const TilesBesidePanel: Story = {
  args: { itemKind: "tile", listWidth: 1340 },
};

export const PressingHandsActionsBack: Story = {
  args: { itemCount: 1 },
  play: async ({ args, canvasElement }) => {
    const tile = await within(canvasElement).findByRole("button");
    await userEvent.click(tile);
    await expect(args.onPress).toHaveBeenCalledWith(STEARCH_ROW.pressActions);
  },
};
