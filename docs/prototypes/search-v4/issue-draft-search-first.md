**Title:** Search: make `/search` search-first and data-dense

Related to #5206 (performant `/search`). This does not resolve it: that issue is about the query side, this one is about what the page does with the answer.

**The idea.** Someone who clicked Search has already told us what they want. The page should open on a search field, not on a title and the whole library, and it should spend its pixels on facts (name, platform, year, size, filename, providers) instead of cover art. Everything below is scoped to the `/search` route and is UI only: no API or schema change.

**Why now.** On a narrow window the top bar, title row and half-width field sit above the first result and the results start well down the screen, the phone table hides size and added date behind a chevron, and the grid is led by large cover art. The backdrop is a blurred full-viewport art layer that cross-fades on hover. (I will add measured numbers before this goes up.)

**Proposal** (each item is its own small PR)

- [ ] A `SearchLayout` shell: one CSS grid with named areas (`header`, `sidebar`, `content`, `footer`) filled by Vue slots, and `dock="left | right | none"` choosing where the sidebar sits
- [ ] The existing filter drawer docked in that sidebar slot (same sections and controls, no new filter logic); with `dock="none"` the sub-line becomes a pill bar whose (+) button adds any of the panel's fields as a pill
- [ ] Flat surface on `/search`: no blurred art backdrop and no toolbar `backdrop-filter`
- [ ] Pinned, full-width search field first on the page; no title row; result count and active-filter chips on the line below
- [ ] Focus the field on touch too, on this route only
- [ ] `GameIdentity` composite (name, badges, platform, year, size, filename, provider logos, matched-text highlight) shared by the list row, which today writes it twice, and a new dense tile
- [ ] Dense, text-first tile for grid view: fixed height, column count from the breakpoint (no resize-observer repack), hamburger always visible
- [ ] Phone table row with every fact visible (two lines, fixed height); tablet column picker instead of horizontal scroll
- [ ] The A-Z strip and the back-to-top button stop covering the last column in list mode
- [ ] Empty query shows an invitation (platform chips with counts, recent searches, Random game, "Browse everything") instead of the whole library
- [ ] From a search: "Select all N results" and "Save search as smart collection" (both use existing dialogs and endpoints)
- [ ] Later, maybe: a swarm view (one dot per rom, clustered by platform, search lights the matches in place) as the zoomed-out end of a density slider

**Mock-ups** (illustrative, made-up data): attach `t1-ledger-desktop.png`, `t3-two-line-rows-phone.png`, `g1-dense-tiles-desktop.png`, `g3-phone-wall.png`, `swarm.png` and `swarm-search-astral.png` from `ui/png/`.

**Not in scope:** live facet counts (needs the backend), ranking changes, a command palette, auto-hiding the top bar.

Happy to build these one at a time and to adjust anything that doesn't fit where the v2 frontend is headed.

AI assistance: the code reading and the mock-ups were prepared with Claude Code; the direction and decisions are mine.
