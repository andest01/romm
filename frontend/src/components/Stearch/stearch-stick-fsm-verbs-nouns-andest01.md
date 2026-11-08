# nouns

these come in roughly two flavors:
screen nouns and data nouns.

screen nouns are things like "size of window" or 'scroll is locked' or "cruise control"

data nouns are
active item
selected items
all items

etc etc.

All I'm saying is that some times actions update a screen noun, sometimes they update data nouns, and sometimes they do both.

As far as verbs,
I'm noticing there are screen verbs and data verbs as well, but I'm sort of curious about how mapbox or maplibre does it

I'm imagining verbs like:
flyTo(item | screen coordinates, { scrollOptions } | undefined) -> this will update the screen nouns but maybe it will also update data nouns, too.
snapTo(item | screen coordinates) --> syntactic sugar (or just an alias) for flyTo with scrollOptions' scroll speed at 0.

```Typescript
navigateTo(item, { scrollOptions }) --> {
  setViewState(item)
  let coords = getCoords(item);
  flyTo(coords, scrollOptions);
}
```

That's kind of what I'm seeing -- a careful internal discrimination between data and screen (view) but also a careful overlapping at time to time.
