/** Heading id for md-editor: the lowercase text with runs of other characters
 *  as one hyphen, so `# Chapter One` is reachable from `[x](#chapter-one)`.
 *  md-editor calls it again from its table of contents, so it must depend on
 *  the heading alone: two headings with the same text share an id. */
export function headingId({ text }: { text: string }): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return slug || "heading";
}
