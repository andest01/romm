/** A schema narrowed to the fields a `fields=` request returned; `id` always comes back. */
export type Projected<T, K extends keyof T> = Pick<
  T,
  K | Extract<"id", keyof T>
>;

/** The `fields=` query value for `names`. */
export function fieldsParam(names: readonly string[]): string {
  return names.join(",");
}
