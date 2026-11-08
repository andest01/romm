# Spec 008: input feel, discrete and analog

**Status:** built for tiles and table, unit-tested; not yet tried with a real pad. I6 covers keys only so far. Open questions at the end.
**Source of intent:** the user, 2026-11-08: "the arrow keys and the direction pad [are] discrete up/down things, but then the analog stick is smooth". The analog half is the gallery's `useStickScroll` (commit `2cbdb4352`, branch `wip/search-perf-render-all`), which the user remembers as "a really really good scrolling demo".

## The idea

Each input gets the motion it can express:

| Input                            | Kind     | What it does                                                    | Who leads                                                   |
| -------------------------------- | -------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| Arrow keys                       | discrete | one press, one step; a held key repeats steps                   | the item moves, the view follows (centre band, spec 007 F6) |
| D-pad                            | discrete | the same as arrow keys: `useGamepad` sends arrow keys           | the item                                                    |
| Left stick, up and down          | analog   | deflection sets a speed: a small push creeps, a full push flies | the view moves, the item catches up                         |
| Mouse wheel, trackpad, scrollbar | analog   | native scrolling, untouched                                     | the view; the item doesn't move                             |
| Rail                             | jump     | a drag jumps the view; loads only where it stops (`when-still`) | the view                                                    |

```
discrete:  key ─▶ item +1 row ─▶ view follows (jump cut)
analog:    stick ─▶ view moves at a speed ─▶ item at the centre line becomes current
                    (once the current row's middle leaves the centre band)
           release ─▶ stop the same frame; the view stays where it is
           next mount (a view switch, a reload) ─▶ centre the current game
```

_Fig. 1: the two models. Discrete inputs move the item; analog inputs move the view._

## Requirements

| ID  | Requirement                                                                                                                                                                                                                                                                             | Proof                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| I1  | Arrow keys and the D-pad move one step per press or repeat, with the view following by the feel's `glideMs` (0 today).                                                                                                                                                                  | spec 007 stories                       |
| I2  | The left stick's up and down axis scrolls the list at `minRowsPerSecond` to `maxRowsPerSecond`, by deflection past `deadzone`, shaped by `gamma`.                                                                                                                                       | unit test of the speed function; story |
| I3  | While the list reads the stick, the stick sends no arrow keys (`claimStickY` in `useGamepad`, additive).                                                                                                                                                                                | unit test in `useGamepad`              |
| I4  | The current game follows the centre line, handing over once its middle leaves the centre band (`bandRows`). The band is the hysteresis, so under every input the active row stays in the band.                                                                                          | unit test; story `play()`              |
| I5  | Release counts once the stick falls below 70% of the deadzone (no chatter); the view stops that frame and stays where it is. The current game is whichever the stick last handed to. A view that mounts later (a switch, a reload) centres the current game, so both views agree on it. | unit test                              |
| I6  | A key or a rail drag while the stick scrolls hands over at once; the stick is then ignored until it's let go. A wheel isn't handled yet.                                                                                                                                                | `stick.cancel()` in `use-key-focus.ts` |
| I7  | Every value is a field of `ScrollFeel`, one per view, so tiles and table can differ.                                                                                                                                                                                                    | type                                   |

## Where it belongs

**It's scroll behaviour first, and it lives in `ScrollFeel`.** The stick becomes one more field beside `bandRows`, `glideMs`, `cruise` and `marks`:

```ts
interface StickFeel {
  readonly deadzone: number; // 0 to 1, ignored around the centre
  readonly minRowsPerSecond: number; // speed just past the deadzone
  readonly maxRowsPerSecond: number; // speed at full push
  readonly gamma: number; // 1 linear; above 1 finer at the slow end
}
// ScrollFeel.stick: StickFeel | null   (null: the stick sends arrow keys, as today)
```

Starting values are the old demo's: deadzone 0.12, 0.5 to 10 rows per second, gamma 1. The old demo also had a dead band (0.6 rows) for when the current card hands over; that's now the centre band itself, half its height either side, so the band and the stick agree.

**Some of it should become a user setting later, not now.** Games expose stick sensitivity and deadzone because pads and hands differ: a worn stick drifts and needs a bigger deadzone. Once the defaults feel right, `deadzone` and a single speed multiplier could move to the user's UI settings (`useUISettings`), layered over the view's `ScrollFeel`. The shape (`gamma`, `bandRows`) stays ours.

**And it must be tunable in Storybook,** with a real controller, keyboard and mouse. See "Tuning in Storybook" below.

## How it's built

```
pure functions (list.selectors.ts)   stickRowsPerSecond, isStickPushed, stickCurrentRow
        ▲
use-stick-scroll.ts (hook)           reads the pad each frame, moves scrollTop, reports rows
        ▲
use-key-focus.ts                     turns a row into the current game (activate), the
        ▲                            one place that dispatches; keys cancel the stick
list and table containers            read their feel through feel.ts (useFeel)
```

- **The stick only runs while a pad is connected** (`usePadRafFn`), and claims the Y axis only while the view's feel has a stick.
- **The feel seam:** `content/list/feel.ts` gives each container its feel. The app gets `TILES_FEEL` and `TABLE_FEEL`; a story provides one built from controls.

## Read-ahead scales with speed, not with input

Fast forward is fast forward: keys, stick, wheel and rail all arrive as a speed. `useListSpeed` reads it from the ranges the scroller reports, in results per second, without knowing the input. `itemsAheadAt` in `Stearch.read-ahead.ts` then reads ahead the distance the list travels while two windows arrive (`windowLatencyMs`, 600 today), never less than the fixed two screens and never more than `maxScreensAhead` (8). The stick knows nothing about loading, and loading knows nothing about the stick.

## Tuning in Storybook

- **The real list:** `Stearch/content/list/feel.ts`, stories `Tune` and `TuneTheTable`. The real tiles or table with fake games, one feel from the controls, and the feel printed as code at the bottom.
- **The teaching demo:** `Stearch/content/list/scrolling/centre-band.vue`, story `Stick`. A live stick readout (Y and rows per second), a `stickStandIn` slider for when there's no pad, and the feel as code.
- **A real pad:** set the toolbar's Input to Gamepad (or Live). The real `useGamepad` then runs in the story.

## Decided (2026-11-08)

- **Both views get the stick.** Tiles and table share the same values today.
- **Release leaves the view alone; the next mount centres.** When the stick lets go, nothing moves. Switching views or reloading centres the current game, so "selection" and "highlighting" stay one thing across views.
- **Read-ahead is separate from input.** See above.

## Open questions

- Does the right stick keep its own `useRightStickScroll` behaviour? The user's guess is it should share the same unity of current game; to be found by using it.
- Should a wheel or trackpad scroll cancel a stick scroll (I6)?
- Is 600 ms the right window latency? It should come from measured load times rather than a guess; the old branch timed windows and smoothed the result (`0511e4cf0`).
- Which values, if any, become user settings, and when?
- Should the current game follow a wheel scroll, as it follows the stick? Today a wheel moves only the view.
