# Spec 006: compatibility by seams

**Status:** every default is ours. Only list items have been swapped for real, and only in unit tests. The selection effect is not written.

We don't want to own new code for views the app already has, and we don't need to pick sides now. When a choice appears, find the seam: if it's one swap, the choice can wait. Existing components are prebuilt parts, wrapped by a container where needed.

## Swap points

| Choice          | Seam                                              | To switch                                                                  |
| --------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Background      | Layout `background`                               | One line in `Stearch.container.vue`                                        |
| Filter panel    | Layout `panel`                                    | One line, for example a `FilterDrawer` part                                |
| Footer          | Layout `footer`                                   | One line, for example `SelectionBar`                                       |
| Content         | Layout `content`                                  | One line, for example `GalleryShell`                                       |
| List items      | `LIST_ITEMS`, leashed by `ItemPart`               | One entry in `list.items.ts`                                               |
| Table rows      | `item` on `TablePure`                             | One line in `table.container.vue`                                          |
| Data source     | `store.connect(source)`, typed by `StearchSource` | The app connects `romApi.getRoms`; container stories connect `fakeGetRoms` |
| Verbs           | `verbs` on `ItemProps`                            | One line in the list and table containers                                  |
| Selectors       | `createSelector`                                  | One import, for `reselect`                                                 |
| Selection       | `runEffect` in the store                          | One effect mirrors `selection/*` to `gallerySelection`                     |
| Background rule | `selectBackgroundUrl`                             | One selector                                                               |

## Requirements

| ID  | Requirement                                                    | Proof                          |
| --- | -------------------------------------------------------------- | ------------------------------ |
| C1  | Rows carry the full API rom, so any existing view can take one | `StearchRom`                   |
| C2  | The seam validates fields we read and keeps the rest           | `Stearch.schema.test.ts`       |
| C3  | Every item view satisfies `ItemPart`                           | `satisfies` in `list.items.ts` |
| C4  | Our items use `GameCover`                                      | item components                |

## Fast follow: pre-evolution PR

An olive branch to the maintainers: small, additive changes to shared components, useful on their own, with no behaviour change for existing callers.

1. `GameListRow` takes `rom` and `position` together, with an optional `selected` prop and `select` and `hover` events. Today `rom` turns selection off and `position` reads `galleryRoms`.
2. The same for `GameCard`.
3. `BackToTopButton` works from a `visible` prop, without a scroller element.

Until then, the `gallery-row` adapter works as an `item`, with hover but no selection, and a click navigates. With 1 merged, it's complete, and `table/row` and `phone-row` can go.
