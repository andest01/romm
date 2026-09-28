import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, within } from "storybook/test";
import i18n from "@/locales";
import LoginForm from "./LoginForm.vue";

const { t } = i18n.global;

const meta: Meta<typeof LoginForm> = {
  title: "Auth/LoginForm",
  component: LoginForm,
  render: (args) => ({
    components: { LoginForm },
    setup: () => ({ args }),
    template: `<div style="max-width: 360px; padding: 24px"><LoginForm v-bind="args" /></div>`,
  }),
};
export default meta;

type Story = StoryObj<typeof LoginForm>;

// Found the way assistive tech and the e2e suite find it: by role and name.
export const Default: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const form = within(canvas.getByRole("form", { name: t("login.login") }));
    // String names match exactly here, so the OIDC button can't match too.
    const submit = form.getByRole("button", { name: t("login.login") });

    await step(
      "login stays disabled until both fields are filled",
      async () => {
        await expect(submit).toBeDisabled();
        await userEvent.type(
          form.getByRole("textbox", { name: t("login.username") }),
          "admin",
        );
        await expect(submit).toBeDisabled();
        await userEvent.type(
          form.getByLabelText(t("login.password"), { exact: true }),
          "secret",
        );
        await expect(submit).toBeEnabled();
      },
    );
  },
};
