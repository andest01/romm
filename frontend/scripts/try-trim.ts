import { readFileSync, writeFileSync } from "node:fs";
import { dropUnusedIcons, keepOnlyWoff2, readAllSource } from "./trimMdiFonts";

const css = readFileSync(
  "node_modules/@mdi/font/css/materialdesignicons.css",
  "utf8",
);
const source = readAllSource();
const usedIcons = dropUnusedIcons(css, source);
const trimmed = keepOnlyWoff2(usedIcons);
writeFileSync("src/plugins/vuetify-material-design-icons-smol.css", trimmed);
console.log(css.length, "->", trimmed.length);
