import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { computed, watchEffect } from "vue";
import { fakeGetRoms } from "../../../Stearch.fake-api";
import { LOADED_STEARCH_STATE } from "../../../store/fixtures";
import stearchStore from "../../../store/stearch.store";
import ResultsContainer from "../results.container.vue";
import { provideFeels } from "./feel";
import { TILES_FEEL } from "./list.props";
import {
  FEEL_ARG_TYPES,
  type FeelArgs,
  feelArgs,
  feelFromArgs,
} from "./scrolling/feel.story-args";

type Args = FeelArgs & { view: "tiles" | "table" };

/** The real tiles and table, with fake games, driven by one feel from the
 *  controls. Tune here with a mouse, a keyboard and a real pad (toolbar
 *  Input: Gamepad), then copy the values into TILES_FEEL or TABLE_FEEL. */
const meta: Meta<Args> = {
  title: "Stearch/ui/results/list/feel.ts",
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    view: { control: "radio", options: ["tiles", "table"] },
    ...FEEL_ARG_TYPES,
  },
  args: { view: "tiles", ...feelArgs(TILES_FEEL) },
  render: (args) => ({
    components: { ResultsContainer },
    setup() {
      const store = stearchStore();
      store.connect(fakeGetRoms);
      watchEffect(() => {
        store.state = {
          ...LOADED_STEARCH_STATE,
          view: { ...LOADED_STEARCH_STATE.view, mode: args.view },
        };
      });
      const feel = computed(() => feelFromArgs(args));
      provideFeels(computed(() => ({ tiles: feel.value, table: feel.value })));
      return {
        feelAsCode: computed(() => JSON.stringify(feel.value, null, 2)),
      };
    },
    template: `
      <div style="display: grid; grid-template-rows: minmax(0, 1fr) auto; height: 100vh">
        <ResultsContainer />
        <details style="padding: 8px">
          <summary>This feel as code</summary>
          <pre style="font-size: 0.75rem">{{ feelAsCode }}</pre>
        </details>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<Args>;

/** Click the list, then use arrows, the D-pad, the left stick, the wheel or
 *  the rail. */
export const Tune: Story = {};

export const TuneTheTable: Story = { args: { view: "table" } };
