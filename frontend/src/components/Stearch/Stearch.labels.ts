import type common from "@/locales/en_US/common.json";
import type platform from "@/locales/en_US/platform.json";
import type rom from "@/locales/en_US/rom.json";

interface Messages {
  common: typeof common;
  platform: typeof platform;
  rom: typeof rom;
}

/** Every key in the locale files we use, generated from `en_US`. */
export type LabelKey = {
  [N in keyof Messages]: `${N}.${Extract<keyof Messages[N], string>}`;
}[keyof Messages];

/** Asks a translator for every label Stearch shows. */
export const buildLabels = (t: (key: LabelKey) => string) => ({
  "common.platforms": t("common.platforms"),
  "platform.has-saves": t("platform.has-saves"),
  "platform.has-soundtrack": t("platform.has-soundtrack"),
  "platform.has-states": t("platform.has-states"),
  "platform.show-duplicates": t("platform.show-duplicates"),
  "platform.show-favorites": t("platform.show-favorites"),
  "platform.show-matched": t("platform.show-matched"),
  "platform.show-missing": t("platform.show-missing"),
  "platform.show-physical": t("platform.show-physical"),
  "platform.show-playables": t("platform.show-playables"),
  "platform.show-ra": t("platform.show-ra"),
  "platform.show-verified": t("platform.show-verified"),
  "platform.tags": t("platform.tags"),
  "rom.age-ratings": t("rom.age-ratings"),
  "rom.collections": t("rom.collections"),
  "rom.companies": t("rom.companies"),
  "rom.developers": t("rom.developers"),
  "rom.franchises": t("rom.franchises"),
  "rom.genres": t("rom.genres"),
  "rom.how-long-to-beat": t("rom.how-long-to-beat"),
  "rom.languages": t("rom.languages"),
  "rom.player-count": t("rom.player-count"),
  "rom.publishers": t("rom.publishers"),
  "rom.regions": t("rom.regions"),
  "rom.search-placeholder": t("rom.search-placeholder"),
});

export type StearchLabels = Readonly<ReturnType<typeof buildLabels>>;
export type StearchLabelKey = keyof StearchLabels;
