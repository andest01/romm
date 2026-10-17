// The cursor's behavior, written down as the tests it must pass. Each name is a
// bug we hit by hand or a promise we made; `todo` until the module exists.
import { describe, it } from "vitest";

describe("tapping", () => {
  it.todo(
    "a tap down moves one line and the view follows only once the line leaves the 35-65% band",
  );
  it.todo(
    "a tap up at the very bottom moves one line and the view does not jump",
  );
  it.todo("a tap down at the very top moves one line and the view stays put");
  it.todo(
    "quick taps retarget the glide from where it was heading, not from where it is",
  );
  it.todo("a quick second pad tap is a tap, not a hold");
});

describe("holding", () => {
  it.todo(
    "a held key cruises in a straight line, ramping from 8 to 20 lines a second",
  );
  it.todo(
    "cruise reports every line it passes, none skipped, with headers between lines",
  );
  it.todo("cruise reaches the last line even though the scroll clamps first");
  it.todo(
    "release settles on the next line ahead and never slides back to one it passed",
  );
  it.todo(
    "a glide in flight lands at its target before a cruise starts from it",
  );
});

describe("wheel, drag and scrollbar", () => {
  it.todo(
    "a key after a wheel scroll moves from the visible lines, not back to the old cursor",
  );
  it.todo("the wheel cancels a glide and a cruise");
});

describe("left and right", () => {
  it.todo("move one cell and keep the line in the band");
  it.todo("a vertical move keeps the column across lines of different lengths");
});

describe("the stick", () => {
  it.todo("creeps with the push and does nothing inside the deadzone");
  it.todo("switches the selection only after the view is a dead band past it");
  it.todo("release leaves the view exactly where it is");
  it.todo("stands down while a dialog is open or a text field has focus");
});

describe("one cursor for grid and table", () => {
  it.todo(
    "a table line of one cell and a grid line of many follow the same rules",
  );
  it.todo(
    "uneven item heights (letter headers) do not shift which line is centered",
  );
  it.todo("a new result set drops the cursor");
});
