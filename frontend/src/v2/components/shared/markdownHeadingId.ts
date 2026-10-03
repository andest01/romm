/** Lowercase text with runs of other characters as one hyphen: "Chapter One" is `chapter-one`.
 *  It depends on the text alone because md-editor's table of contents calls it too. */
export function headingId({ text }: { text: string }): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return slug || "heading";
}
