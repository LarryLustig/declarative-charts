# Roadmap

For what is already built, see [CHANGELOG.md](CHANGELOG.md). This file is only
about what is *not*.

---

## The bar for 1.0

**A stranger can build a real dashboard without hitting a wall**, and the
architecture has shown it can hold the charts that come after.

That second half is the part with a deadline. Adding a feature after 1.0 is
cheap; changing a base class after 1.0 is not. So the release list below is
short, and it is chosen on two grounds only:

1. **Capability gaps** — a question a user will reasonably ask that the library
   currently cannot answer at all.
2. **Structural exemplars** — one chart per architectural seam, so the seam is
   proven while breaking changes are still free.

Everything else waits for someone to ask. The previous version of this file ran
to a thousand lines and listed twenty-odd features; most of them were things
that *could* exist rather than things that *must*, and a list like that reads as
a plan when it is really a wish.

---

## Required for 1.0

### 1. Scatter / XY plots

**Why:** it is the only *shape of data* the library cannot express. Every chart
here plots a value against a category — a bar per region, a point per date. None
plots a value against another value. Correlation is an ordinary question and the
answer today is "use a different library".

`<dc-bubble>` looks like it should cover this and does not: it takes `value` and
`size-value` and positions by index, so the x axis is still categorical.

```html
<dc-chart>
  <dc-axis position="bottom" type="value"></dc-axis>
  <dc-point x="10" y="20" label="A"></dc-point>
  <dc-point x="15" y="35" label="B"></dc-point>
</dc-chart>
```

**Cost:** moderate, and no new base class. `AxisChart` already owns value axes;
this needs a numeric category axis and an `x` on `<dc-point>`. The `type="value"`
path on a category axis is the piece that does not exist yet.

### 2. Reference lines and bands

**Why:** a target, a threshold, a budget, an SLA. It is the most common
annotation on a business chart, and its absence is conspicuous the moment anyone
uses this at work. There is already a stub — `getReferenceLineValue()` in
`chart.ts` returns `undefined` and the insight generator calls it — so part of
the design has been anticipated.

```html
<dc-chart>
  <dc-reference value="100" label="Target" stroke="#dc2626"></dc-reference>
  <dc-reference min="80" max="120" fill="#fef3c7" label="Acceptable"></dc-reference>
  <dc-bar value="95" label="Q1"></dc-bar>
</dc-chart>
```

**Cost:** small. It renders in the existing value-axis coordinate space, and
`<dc-reference>` is a data element like any other.

### 3. Label collision handling

**Why:** this library positions by data, so labels *will* collide — and now do.
The irregular-sampling time chart added in this cycle overlaps its own value
labels where three readings fall within a week. Time axes made it worse, but
uneven categories and long labels cause it too.

Minimum viable: skip a label that would overlap its neighbour, and allow
rotation on the category axis. `shouldShowLabel()` is already the single
gate every label passes through, so there is one place to put it.

**Cost:** small to moderate, and it needs `measureText`, which exists.

### 4. Radar chart — as the polar exemplar

See the next section for why this one is on the *release* list rather than the
deferred list.

---

## Structural exemplars

The argument: a base chart class is only proven by a chart that uses it. Four
seams exist today and each has at least one chart standing on it —

| Seam | Coordinate system | Proven by |
|---|---|---|
| Cartesian axes | x/y with scales | `<dc-chart>` (bar, line, area, bubble) |
| Angular | proportion of a circle | `<dc-pie-chart>` |
| Flow | stacked bands, tapering | `<dc-funnel-chart>` |
| Area-proportional | shape area encodes value | `<dc-stage-chart>` |
| **Polar axes** | **radiating scaled axes** | **nothing** |

**Radar is the only common chart that needs a polar axis system**, and nothing
in the library exercises one. Shipping a single radar chart answers a question
that is otherwise open at 1.0: *can `BaseChart` host an axis system that is not
cartesian?* If the answer turns out to be "not without changing `BaseChart`",
that is a change worth discovering now, when it is free.

```html
<dc-radar-chart>
  <dc-radar-axis label="Speed"></dc-radar-axis>
  <dc-radar-axis label="Power"></dc-radar-axis>
  <dc-radar-axis label="Range"></dc-radar-axis>

  <dc-radar-series label="Model A">
    <dc-point value="80" label="Speed"></dc-point>
    <dc-point value="60" label="Power"></dc-point>
    <dc-point value="90" label="Range"></dc-point>
  </dc-radar-series>
</dc-radar-chart>
```

**One element per value, and `<dc-point>` specifically.** An earlier draft used
`values="80, 60, 90"` — a serialised array in an attribute, which is the shape
this library exists not to have (REVIEW.md §4.6). A value written as markup can
carry `fill`, `href`, `hx-get`, a `<dc-popup>`, `hidden` or a `value-format`; a
value inside a comma-separated string can carry none of them, and the radar
chart would silently support half the library. A radar datum *is* a point — a
value at a position — which `<dc-point>` already models.

**Points bind to axes by label**, the way line points align with bar categories
in a combo chart today. Order becomes irrelevant, a missing axis is visible
rather than silently shifting everything, and an omitted axis is missing data
rather than zero.

### Charts that are *not* exemplars

Deliberately excluded, because they add no seam:

- **Gauge** — a partial arc. The angular seam, already proven by pie.
- **Heatmap** — a cartesian grid. The seam `<dc-chart>` already stands on.
- **Treemap** — a new *layout*, but no new coordinate system, and nothing about
  `BaseChart` blocks it. A contributor can add it after 1.0 without the base
  class changing.
- **Waterfall, sankey, candlestick** — variations on cartesian or flow.

Each may be worth building. None needs to exist *before* 1.0 to keep the
architecture honest, which is the only reason anything is on the list above.

---

## Deferred

Not on the 1.0 list. Each would be a reasonable next thing; none blocks release.

| Feature | Why it waits |
|---|---|
| Dual value axes | Common in dashboards, but a large change to axis resolution, and easy to add later without breaking anything |
| Zoom and pan | Needs an interaction model the library has no other use for. Ask first |
| PNG export | `downloadSvg()` covers the sharing case; PNG means canvas rasterisation and font embedding |
| Popup/tooltip customisation | `<dc-popup>` takes arbitrary HTML already. The gap is positioning and styling, which `::part` may cover |
| Label font size per element | `font-size` works on text elements; a per-datum override is a small addition, not a release blocker |
| More chart types | See above |

---

## Known gaps

Not features — things that are wrong or thin, recorded so they are not
rediscovered:

- **Visual tolerance is loose.** `maxDiffPixelRatio: 0.01` let a full change of
  axis label text (ISO dates → `Jan 3`) pass as identical. The baseline had to
  be deleted to force regeneration. Tightening it risks font-rendering
  flakiness; worth a deliberate decision either way.
- **`stage-chart.ts` at 88%** is the thinnest real coverage left, mostly in
  `calculateTextFit`.
- **Outreach has not happened.** REVIEW.md §8 argues discovery is the binding
  constraint, not features. That remains true and is the strongest argument for
  keeping this list short.

---

## Non-goals

Recorded so they are not proposed again without new information:

- **A bulk-data attribute** (`values="[10,20,30]"`). Considered and declined —
  REVIEW.md §4.6. It concedes the library's only differentiator, the performance
  case does not exist, and it splits the API. A `.data` *property* is the right
  shape if someone genuinely needs to pass an array from JavaScript; build it
  when asked.
- **A JavaScript configuration API.** `new Chart(el, {...})` is what every other
  library does and what this one is defined against.

---

## Version history

See [CHANGELOG.md](CHANGELOG.md).
