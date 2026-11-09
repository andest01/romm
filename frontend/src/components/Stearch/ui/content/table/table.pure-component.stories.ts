import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { computed } from "vue";
import { STEARCH_ROW, stearchSlots } from "../../../store/fixtures";
import { STEARCH_SORT_KEYS } from "../../../store/stearch.state-props";
import { ITEM_VERBS } from "../list/item.story-args";
import { TABLE_FEEL, TILES_FEEL } from "../list/list.props";
import { buildScrollRows, headHeightFor } from "../list/list.selectors";
import RowPure from "./row/row.pure-component.vue";
import type { TableProps } from "./table.props";
import TablePure from "./table.pure-component.vue";
import { TABLE_ROW_HEIGHT } from "./table.selectors";

type Args = Omit<
  TableProps,
  | "item"
  | "verbs"
  | "setScroller"
  | "rows"
  | "rowHeight"
  | "headHeight"
  | "columns"
  | "gridTemplate"
  | "activePosition"
  | "currentId"
  | "marks"
> & {
  itemCount: number;
  pendingCount: number;
  /** Where the key cursor sits; -1 for none. */
  keyPosition: number;
  /** Which position's game is current; -1 for none. */
  currentPosition: number;
  /** Whose mark timeline to use. */
  feel: keyof typeof FEELS;
  onPress: () => void;
  onSort: () => void;
};

const COLUMNS: TableProps["columns"] = [
  { key: "name", label: "Title", sortable: true },
  { key: "platform", label: "Platform" },
  { key: "fs_size_bytes", label: "Size", sortable: true },
  { key: "created_at", label: "Added", sortable: true },
  { key: "first_release_date", label: "Released", sortable: true },
  { key: "average_rating", label: "Rating", sortable: true },
  { key: "length", label: "Length" },
  { key: "languages", label: "Languages" },
  { key: "regions", label: "Regions" },
  { key: "verbs", label: "Actions" },
];
const FEELS = { table: TABLE_FEEL, tiles: TILES_FEEL } as const;

const GRID_TEMPLATE =
  "minmax(0, 3fr) minmax(0, 1fr) 90px 100px 100px 80px 70px 90px 80px 64px";

const meta: Meta<Args> = {
  title: "Stearch/ui/content/table/table.pure-component.vue",
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    itemCount: { control: { type: "range", min: 0, max: 1000, step: 1 } },
    pendingCount: { control: { type: "range", min: 0, max: 100, step: 1 } },
    keyPosition: { control: { type: "range", min: -1, max: 40, step: 1 } },
    currentPosition: { control: { type: "range", min: -1, max: 40, step: 1 } },
    feel: { control: "radio", options: Object.keys(FEELS) },
    sortKey: { control: "select", options: [...STEARCH_SORT_KEYS] },
    sortDir: { control: "radio", options: ["asc", "desc"] },
    errorMessage: { control: "text" },
    emptyMessage: { control: "text" },
    tableLabel: { control: "text" },
    onPress: { control: false },
    onSort: { control: false },
  },
  args: {
    itemCount: 100,
    pendingCount: 0,
    keyPosition: 5,
    currentPosition: 5,
    feel: "table",
    tableLabel: "Games",
    sortKey: "name",
    sortDir: "asc",
    errorMessage: null,
    emptyMessage: "No games match your search.",
    onPress: fn(),
    onSort: fn(),
  },
  render: (args) => ({
    components: { TablePure },
    setup: () => {
      const slots = computed(() =>
        stearchSlots(args.itemCount, args.pendingCount),
      );
      return {
        args,
        item: RowPure,
        verbs: ITEM_VERBS,
        setScroller: () => undefined,
        columns: COLUMNS,
        gridTemplate: GRID_TEMPLATE,
        rowHeight: TABLE_ROW_HEIGHT,
        rows: computed(() => buildScrollRows(slots.value, 1, [])),
        headHeight: headHeightFor(false),
        marks: computed(() => FEELS[args.feel].marks),
        activePosition: computed(() =>
          args.keyPosition < 0 ? null : args.keyPosition,
        ),
        currentId: computed(() => {
          const slot = slots.value[args.currentPosition];
          return slot ? slot.id : null;
        }),
      };
    },
    template: `
      <div style="height: 100vh">
        <TablePure
          :item="item"
          :verbs="verbs"
          :set-scroller="setScroller"
          :rows="rows"
          :active-position="activePosition"
          :active-descendant-id="null"
          grid-help="Arrow keys move between games."
          :current-id="currentId"
          :marks="marks"
          :row-height="rowHeight"
          :head-height="headHeight"
          :columns="columns"
          :grid-template="gridTemplate"
          :table-label="args.tableLabel"
          :sort-key="args.sortKey"
          :sort-dir="args.sortDir"
          :error-message="args.errorMessage"
          :empty-message="args.emptyMessage"
          @press="args.onPress"
          @sort="args.onSort"
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
    const rows = within(canvasElement).getAllByRole("row");
    const row = rows[1];
    if (!row) throw new Error("No row rendered");
    await userEvent.click(row);
    await expect(args.onPress).toHaveBeenCalledWith(STEARCH_ROW.pressActions);
  },
};

export const SortingHandsTheColumnBack: Story = {
  args: { itemCount: 1 },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: /Size/ }),
    );
    await expect(args.onSort).toHaveBeenCalledWith({
      key: "fs_size_bytes",
      dir: "asc",
    });
  },
};
