import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { computed } from "vue";
import type { ChoicePreview, ChoiceState } from "../../filters-fields.props";
import { TRI_STATE_FIELD } from "../fields.story-args";
import TriStateRow from "./tri-state-row.pure-component.vue";

const base: ChoicePreview = TRI_STATE_FIELD.choice;

interface Args {
  state: ChoiceState;
  label: string;
  onPress: () => void;
}

const meta: Meta<Args> = {
  title:
    "Stearch/ui/filters/fields/tri-state-row/tri-state-row.pure-component.vue",
  tags: ["!autodocs"],
  argTypes: {
    state: { control: "radio", options: ["off", "on", "excluded"] },
    label: { control: "text" },
    onPress: { control: false },
  },
  args: { state: "on", label: "Favorites", onPress: fn() },
  render: (args) => ({
    components: { TriStateRow },
    setup: () => ({
      args,
      choice: computed(() => ({
        ...base,
        state: args.state,
        label: args.label,
      })),
    }),
    template: `<TriStateRow :choice="choice" @press="args.onPress" />`,
  }),
};

export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {};

export const PressingHandsActionsBack: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    await expect(args.onPress).toHaveBeenCalledWith(base.actions);
  },
};
