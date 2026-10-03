import { readdirSync, readFileSync } from "node:fs";
import { extname, join, sep } from "node:path";
import type { Plugin } from "vite";

const SCAN_DIRS = ["src", "../backend"];
const SCAN_EXTS = new Set([".vue", ".ts", ".py"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".venv", "__pycache__"]);

// The one stylesheet we rewrite. Vite hands us its text, we hand back a smaller one.
const MDI_CSS = "materialdesignicons.css";

// Step 1 of 3: gather every source file's text into one big string.
export function readAllSource(): string {
  let text = "";
  for (const dir of SCAN_DIRS) {
    for (const path of readdirSync(dir, {
      recursive: true,
      encoding: "utf8",
    })) {
      const inSkippedDir = path.split(sep).some((part) => SKIP_DIRS.has(part));
      if (inSkippedDir) continue;
      if (!SCAN_EXTS.has(extname(path))) continue;
      text += readFileSync(join(dir, path), "utf8");
    }
  }
  return text;
}

// Step 2 of 3: drop `.mdi-xxx::before` rules whose name never appears in the source.
// The CSS is cut at each "}", so one piece is one rule, e.g. `.mdi-abacus::before { content: "\F16E0";`.
export function dropUnusedIcons(css: string, source: string): string {
  const keep = (rule: string): boolean => {
    const isIcon = rule.trim().startsWith(".mdi-") && rule.includes("content:");
    if (!isIcon) {
      return true; // keep non-icon rules, e.g. @font-face
    }
    const name = rule.trim().slice(1, rule.indexOf("::before")); // "mdi-abacus"
    console.log("lol guhbye", name);
    return source.includes(name);
  };
  return css.split("}").filter(keep).join("}");
}

// Step 3 of 3: the @font-face lists eot, woff2, woff and ttf. Keep only woff2.
export function keepOnlyWoff2(css: string): string {
  const fixLine = (line: string): string => {
    if (line.includes("webfont.eot?v=")) return "";
    if (line.includes("webfont.eot?#iefix")) {
      return '  src: url("../../node_modules/@mdi/font/fonts/materialdesignicons-webfont.woff2?v=7.4.47") format("woff2");';
    }
    return line;
  };
  return css.split("\n").map(fixLine).join("\n");
}

export function trimMdiFonts(): Plugin {
  let source = "";
  return {
    name: "trim-mdi-fonts",
    apply: "build", // dev server keeps the full icon set
    enforce: "pre", // run before Vite's own CSS handling sees the file

    // Vite calls this once at the start of a build.
    buildStart() {
      source = readAllSource();
    },

    // Vite calls this for every file it loads, with the file's text in `css`.
    transform(css, id) {
      if (!id.includes(MDI_CSS)) return null; // not ours, leave it alone
      return { code: keepOnlyWoff2(dropUnusedIcons(css, source)), map: null };
    },
  };
}
