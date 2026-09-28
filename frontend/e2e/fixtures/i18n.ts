import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Tests find elements by the same translated text the app renders, read from
// the app's own locale files, so the suite passes in any language.

const LOCALES_DIR = fileURLToPath(
  new URL("../../src/locales/", import.meta.url),
);

/** Every locale the app ships, e.g. "en_US", "de_DE". */
export const LOCALES: readonly string[] = readdirSync(LOCALES_DIR, {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

type Messages = Record<string, Record<string, unknown>>;

let current: { locale: string; messages: Messages } | null = null;

/** Called once per worker by the `appLocale` fixture in fixtures/test.ts. */
export function useLocale(locale: string) {
  if (!LOCALES.includes(locale)) {
    throw new Error(`No locale "${locale}" in src/locales.`);
  }
  const dir = `${LOCALES_DIR}${locale}/`;
  const messages: Messages = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    messages[file.slice(0, -".json".length)] = JSON.parse(
      readFileSync(dir + file, "utf8"),
    );
  }
  current = { locale, messages };
}

/** The locale the app is set to in this worker. */
export function testLocale(): string {
  if (!current) throw new Error("No test locale: t() runs inside a test.");
  return current.locale;
}

function message(key: string): string {
  if (!current) throw new Error("No test locale: t() runs inside a test.");
  const [namespace, name] = key.split(/\.(.*)/s);
  const value = current.messages[namespace]?.[name];
  if (typeof value !== "string") {
    throw new Error(`No i18n key "${key}" in ${current.locale}.`);
  }
  // Only plain and {named} messages are supported; fail rather than guess.
  if (value.includes("|") || value.includes("@:")) {
    throw new Error(`i18n key "${key}" uses plural or linked syntax.`);
  }
  return value;
}

/** The translated text for `key`, e.g. t("rom.media") or
 *  t("common.account-menu-for", { name: "admin" }). */
export function t(key: string, params: Record<string, string> = {}): string {
  return message(key).replace(/\{(\w+)\}/g, (_, param: string) => {
    if (!(param in params)) {
      throw new Error(`i18n key "${key}" needs the "${param}" parameter.`);
    }
    return params[param];
  });
}

/** Matches `key`'s text with any value in each {param}, for a name that
 *  embeds data the test doesn't know, like "Account menu for {name}". */
export function tPattern(key: string): RegExp {
  const parts = message(key).split(/\{\w+\}/);
  const escaped = parts.map((part) =>
    part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return new RegExp(`^${escaped.join(".+")}$`);
}
