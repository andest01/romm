// @ts-check
// Tab follows the DOM, so CSS that reorders needs a story proving the result.
import { existsSync, readFileSync } from "node:fs";
import { reportAt } from "../../../../eslint-plugin-romm/utils/report.js";
import {
  rangeOf,
  sfcStyleRoots,
} from "../../../../eslint-plugin-romm/utils/sfcStyles.js";

const REORDERS = /^(?:order|flex-direction|flex-flow)$/;
const WAIVER = /^reorder-ok:\s*(\w+)$/;

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "CSS reordering in a layout must name a story that proves the Tab order.",
    },
    messages: {
      reorders:
        "This makes visual order differ from Tab order. Change the DOM, or add `/* reorder-ok: StoryName */` above it, naming a story in this layout's stories file that asserts the Tab order.",
      missingStory:
        "`{{story}}` is not exported from {{file}}. A reorder needs a story proving the Tab order.",
    },
    schema: [],
  },
  create(context) {
    const storiesFile = context.filename.replace(/\.vue$/, ".stories.ts");
    return {
      Program() {
        for (const block of sfcStyleRoots(context)) {
          block.root.walkDecls(REORDERS, (decl) => {
            if (decl.prop !== "order" && !decl.value.includes("reverse")) {
              return;
            }
            const start = rangeOf(block, decl)[0];
            const previous = decl.prev();
            const story =
              previous?.type === "comment"
                ? WAIVER.exec(previous.text.trim())?.[1]
                : undefined;
            if (!story) {
              reportAt(context, start, decl.prop.length, "reorders");
              return;
            }
            const stories = existsSync(storiesFile)
              ? readFileSync(storiesFile, "utf8")
              : "";
            if (!stories.includes(`export const ${story}`)) {
              reportAt(context, start, decl.prop.length, "missingStory", {
                story,
                file: storiesFile.split("/").pop() ?? storiesFile,
              });
            }
          });
        }
      },
    };
  },
};
