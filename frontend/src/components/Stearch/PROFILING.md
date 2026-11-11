# Profiling Stearch

How the numbers in [LESSONS.md](LESSONS.md) ("scroll cost, measured in production profiles") were taken.

## 1. A production profile with source maps

From `frontend/`:

```bash
npm run build -- --sourcemap
npm run preview
```

Open `/stearch` on the preview port, then in DevTools Performance record the same script every time: load, wait 2 seconds, one long wheel scroll (not the rail), stop. Save the profile as a `.gzip` in this folder, and don't commit it.

## 2. Which DOM properties Vue writes

Needs a dev build (`npm run dev`), so elements carry their owning component. Paste this into the DevTools console:

```js
// Paste into DevTools on /stearch (dev build), then scroll, then run __propTrace.report().
// Counts every DOM property write (what Vue's patchDOMProp does), by property,
// element and owning Vue component. Reload the page to remove it.
(() => {
  const counts = new Map();
  const samples = new Map();
  let armed = false;
  const owner = (el) => {
    let c = el.__vueParentComponent;
    const names = [];
    while (c && names.length < 3) {
      const n = c.type?.__name || c.type?.name;
      if (n) names.push(n);
      c = c.parent;
    }
    return names.join(" < ") || "(no component)";
  };
  const describe = (el) =>
    `${el.tagName?.toLowerCase()}${el.classList?.[0] ? "." + el.classList[0] : ""}`;
  const protos = [
    Element.prototype,
    HTMLElement.prototype,
    HTMLImageElement.prototype,
    HTMLInputElement.prototype,
    HTMLButtonElement.prototype,
    HTMLAnchorElement.prototype,
    Node.prototype,
  ];
  for (const proto of protos) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      const d = Object.getOwnPropertyDescriptor(proto, key);
      if (!d?.set || !d.configurable) continue;
      Object.defineProperty(proto, key, {
        ...d,
        set(value) {
          if (armed && this instanceof Element) {
            const k = `${key} | ${describe(this)} | ${owner(this)}`;
            const prev = this[key];
            const entry = counts.get(k) || { writes: 0, same: 0 };
            entry.writes += 1;
            if (prev === value) entry.same += 1;
            counts.set(k, entry);
            if (!samples.has(k))
              samples.set(k, {
                value: String(value).slice(0, 80),
                stack: new Error().stack.split("\n").slice(2, 9).join("\n"),
              });
          }
          return d.set.call(this, value);
        },
      });
    }
  }
  window.__propTrace = {
    start() {
      counts.clear();
      samples.clear();
      armed = true;
      console.log("prop trace: armed, now scroll");
    },
    stop() {
      armed = false;
    },
    report(limit = 25) {
      armed = false;
      const rows = [...counts]
        .sort((a, b) => b[1].writes - a[1].writes)
        .slice(0, limit)
        .map(([k, v]) => {
          const [prop, element, component] = k.split(" | ");
          return {
            prop,
            element,
            component,
            writes: v.writes,
            unchanged: v.same,
            sample: samples.get(k)?.value,
          };
        });
      console.table(rows);
      return rows;
    },
    stack(prop) {
      for (const [k, s] of samples)
        if (k.startsWith(prop + " |")) console.log(k, "\n", s.stack);
    },
  };
  console.log(
    "prop trace installed: __propTrace.start(), scroll, __propTrace.report()",
  );
})();
```

Then:

```js
__propTrace.start(); // arm, then scroll
__propTrace.report(); // stop and print the top 25
__propTrace.report(50); // more rows
__propTrace.stack("className"); // call stack of the first write to a property
__propTrace.stop(); // stop without printing
```

Reading it: a high `unchanged` count means needless re-renders. Zero `unchanged` with `(no component)` means elements being mounted. Reload the page to remove it.

## 3. What animates while idle

```js
document
  .getAnimations()
  .filter((a) => a.playState === "running")
  .map((a) => [a.animationName ?? a.constructor.name, a.effect?.target]);
```

An empty list means the work is script, not CSS: record two idle seconds instead.
