import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { MULTI_FIELD } from "../fields.story-args";
import ChoiceRow from "./choice-row.pure-component.vue";

const [choice] = MULTI_FIELD.choices;
if (!choice) throw new Error("No choice in the fixture");

const meta: Meta<typeof ChoiceRow> = {
  title: "Stearch/ui/fields/choice-row/choice-row.pure-component.vue",
  tags: ["!autodocs"],
  component: ChoiceRow,
  args: { choice },
};

export default meta;

type Story = StoryObj<typeof ChoiceRow>;

export const Playground: Story = {};

export const PressingHandsActionsBack: Story = {
  args: { onPress: fn() },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("checkbox"));
    await expect(args.onPress).toHaveBeenCalledWith(choice.actions);
  },
};
