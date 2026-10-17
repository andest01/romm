import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGridCruise } from "./index";

function setup() {
  const scroller = document.createElement("div");
  Object.defineProperty(scroller, "scrollHeight", { value: 100000 });
  Object.defineProperty(scroller, "clientHeight", { value: 600 });
  const onStart = vi.fn();
  const onRow = vi.fn();
  const onEnd = vi.fn();
  const cruise = useGridCruise({
    scroller: () => scroller,
    rowHeight: () => 60,
    scrollTopFor: () => 0,
    rowCount: () => 1000,
    rowAt: (top) => Math.round(top / 60),
    onStart,
    onRow,
    onEnd,
  });
  return { scroller, cruise, onStart, onRow, onEnd };
}

describe("useGridCruise", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16),
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("leaves a tap to the caller: one press is not a cruise", () => {
    const { cruise, onStart } = setup();

    expect(cruise.feed("ArrowDown", { via: "key", repeat: false })).toBe(false);
    expect(cruise.isActive()).toBe(false);
    expect(onStart).not.toHaveBeenCalled();
  });

  it("reads a quick second pad tap as a tap, not the start of a hold", () => {
    const { cruise, onStart } = setup();
    cruise.feed("ArrowUp", { via: "pad" });
    vi.advanceTimersByTime(180);

    expect(cruise.feed("ArrowUp", { via: "pad" })).toBe(false);
    expect(onStart).not.toHaveBeenCalled();
  });

  it("reads the pad's first repeat, 350 ms after the press, as a hold", () => {
    const { cruise, onStart } = setup();
    cruise.feed("ArrowDown", { via: "pad" });
    vi.advanceTimersByTime(350);

    expect(cruise.feed("ArrowDown", { via: "pad" })).toBe(true);
    expect(onStart).toHaveBeenCalledOnce();
    cruise.cancel();
  });

  it("takes over on a held key's first repeat and scrolls in a straight line", () => {
    const { cruise, scroller, onStart, onRow } = setup();
    cruise.feed("ArrowDown", { via: "key", repeat: false });

    expect(cruise.feed("ArrowDown", { via: "key", repeat: true })).toBe(true);
    expect(onStart).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(500);
    cruise.feed("ArrowDown", { via: "key", repeat: true });
    vi.advanceTimersByTime(500);

    expect(scroller.scrollTop).toBeGreaterThan(300);
    expect(onRow).toHaveBeenCalled();
    cruise.cancel();
  });

  it("stops when the key comes up and reports the row to settle on", () => {
    const { cruise, onEnd } = setup();
    cruise.feed("ArrowDown", { via: "key", repeat: false });
    cruise.feed("ArrowDown", { via: "key", repeat: true });
    vi.advanceTimersByTime(400);

    cruise.keyUp("ArrowDown");
    vi.advanceTimersByTime(100);

    expect(cruise.isActive()).toBe(false);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(onEnd.mock.calls[0]![0]).toBeGreaterThan(0);
  });

  it("cancels without reporting a row", () => {
    const { cruise, onEnd } = setup();
    cruise.feed("ArrowUp", { via: "key", repeat: false });
    cruise.feed("ArrowUp", { via: "key", repeat: true });

    cruise.cancel();

    expect(onEnd).toHaveBeenCalledWith(null);
  });
});
