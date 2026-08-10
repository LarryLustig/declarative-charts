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

### 4. Radar chart — as the scaled-polar exemplar

The one item here that is not a capability gap. See the next section for why it
is on the release list rather than the deferred one.

---

## Structural exemplars

The argument: a base chart class is only proven by a chart that uses it.

There are **two** seams today. The distinction that matters is not the
shape drawn but whether the chart has a *scale*:

| Seam | What it means | Base class | Proven by |
|---|---|---|---|
| **Scaled, cartesian** | a value axis with a domain, nice numbers and ticks | `AxisChart` | `<dc-chart>` |
| **Proportional** | value maps straight to a size or angle; no domain | `BaseChart` | `<dc-pie-chart>`, `<dc-funnel-chart>`, `<dc-stage-chart>` |
| **Scaled, polar** | a radial domain with ticks and rings | — | **nothing** |

Verified rather than assumed: `getNiceRange`, `ValueRange` and the tick
calculations appear **zero times** in `pie-chart.ts`, `funnel-chart.ts` and
`stage-chart.ts`. All three normalise or map directly. Only `chart.ts` has a
scale, and it gets it from `AxisChart`.

**Radar is the only common chart that needs a scale in a non-cartesian space.**
It answers a question otherwise left open at 1.0: *can the scale machinery leave
the cartesian grid, or is it welded to x and y?* If the answer is "not without
changing `AxisChart`", that is worth discovering while it is free.

Note this is **not** the same as "polar". A pie is already polar — angle and
radius. What a pie lacks is a *domain*: it normalises to a total, so there is
nothing to tick and nothing to label. A radar has a real radial scale, and
optionally a different one per axis. That is the difference, and it is why a
pie does not already prove this seam.

### Proposed API

```html
<dc-radar-chart width="500" height="500" rings="4" max-value="100">
  <dc-title>Model Comparison</dc-title>
  <dc-grid stroke="#e5e7eb" stroke-dasharray="dotted"></dc-grid>

  <dc-radar-axis label="Speed"></dc-radar-axis>
  <dc-radar-axis label="Power" max-value="500" value-format="number 0"></dc-radar-axis>
  <dc-radar-axis label="Range"></dc-radar-axis>
  <dc-radar-axis label="Comfort"></dc-radar-axis>

  <dc-radar-series label="Model A" fill="#2563eb">
    <dc-point value="80" label="Speed"></dc-point>
    <dc-point value="420" label="Power"></dc-point>
    <dc-point value="90" label="Range"></dc-point>
    <dc-point value="55" label="Comfort"></dc-point>
  </dc-radar-series>

  <dc-radar-series label="Model B" fill="#dc2626" missing="gap">
    <dc-point value="70" label="Speed"></dc-point>
    <dc-point value="310" label="Power"></dc-point>
    <dc-point label="Range"></dc-point>          <!-- not measured -->
    <dc-point value="85" label="Comfort"></dc-point>
  </dc-radar-series>

  <dc-legend position="bottom"></dc-legend>
</dc-radar-chart>
```

#### `<dc-radar-chart>`

| Attribute | Meaning |
|---|---|
| `min-value` / `max-value` | Default radial domain for every axis. `min-value` defaults to 0, which is the only honest default for a radar — a non-zero origin exaggerates differences |
| `rings` | Number of concentric grid rings (default 5) |
| `grid-shape` | `polygon` (default, rings follow the axes) or `circle` |
| `start-angle` | Where the first axis points, in degrees. Default `-90`, straight up |
| `clockwise` | Direction of subsequent axes (default true) |

Plus the common chart attributes — `width`, `height`, `palette`, `padding`,
`show-value`, `value-format`, `animations`, `high-contrast`, `loading`,
`logging`, and the rest.

#### `<dc-radar-axis>`

One per dimension. A new element rather than reusing `<dc-axis>`: that element's
`position="left|bottom"` is cartesian by definition, and giving one tag two
meanings depending on its parent is the `<dc-grid style>` mistake in a new suit.

| Attribute | Meaning |
|---|---|
| `label` | The dimension name. **Points bind to it**, so it is required |
| `min-value` / `max-value` | Per-axis domain, overriding the chart default |
| `value-format` | Per-axis formatting — `"km/h"` and `"hp"` are not the same units |
| `hidden` | Standard; removes the spoke and any points bound to it |

**Per-axis domains are the attribute that makes radar honest.** A radar with one
shared scale is only meaningful when every dimension is commensurable, which is
rare. Independent domains are what let Speed in km/h sit beside Power in hp
without the polygon lying about their relationship.

**Axes may be omitted entirely**, in which case they are inferred from the union
of point labels in document order. That keeps the simple case simple; declare
them when you need a specific order, a per-axis domain, or an axis that no
series has data for yet.

#### `<dc-radar-series>`

One polygon. Mirrors `<dc-line>` — a container whose `<dc-point>` children are
the data.

| Attribute | Meaning |
|---|---|
| `label` | Series name, used by the legend |
| `stroke`, `stroke-width`, `stroke-dasharray` | The outline |
| `fill`, `fill-opacity` | The filled area. **Defaults to roughly 0.25** — opaque polygons make a two-series radar unreadable, so translucency is a default rather than an option |
| `pattern`, `pattern-*` | As any other filled shape |
| `missing` | `gap` (default), `skip` or `zero` — the existing policy, reused |
| `show-value`, `show-label`, `value-format`, `auto-popup`, `href`, `target`, `hidden` | As other data elements |

`missing` reuse is worth spelling out, because the three policies mean something
specific here: `gap` breaks the polygon at that axis, `skip` joins the two
neighbouring axes directly, and `zero` pulls the vertex to the centre. `zero` is
the one that lies, exactly as it does on a line chart.

#### `<dc-point>`

Unchanged. A radar datum is what `<dc-point>` already models — a value at a
position — and it brings `value`, `label`, `fill`, `href`, `target`,
`show-value`, `hidden`, `<dc-popup>` children and the missing-value handling
with it. `label` names the axis rather than a category, which is the same
binding-by-label the combo charts already use.

#### `<dc-grid>` — reused as-is

`<dc-grid stroke="…" stroke-dasharray="…">` already describes *how grid lines
look*, in SVG's own vocabulary, with no assumption about geometry. As a direct
child of `<dc-radar-chart>` it styles the rings. Same tag, same meaning,
different parent — which is the test `<dc-axis>` fails and this one passes.

#### Diagnostics

Two new codes, following the existing conventions:

- A `<dc-point>` whose `label` matches no axis — the data references a dimension
  that does not exist, and silently dropping it is how a chart comes to show
  four of five measurements.
- Fewer than three axes — a two-axis radar is a line and a one-axis radar is a
  dot. Warn and render what was asked for.

**One element per value, and `<dc-point>` specifically.** An earlier draft used
`values="80, 60, 90"` — a serialised array in an attribute, which is the shape
this library exists not to have (REVIEW.md §4.6). A value written as markup can
carry `fill`, `href`, `hx-get`, a `<dc-popup>`, `hidden` or a `value-format`; a
value inside a comma-separated string can carry none of them, and the radar
chart would silently support half the library. A radar datum *is* a point — a
value at a position — which `<dc-point>` already models.

### Charts that are *not* exemplars

Deliberately excluded, because they add no seam:

- **Gauge** — a partial arc with no domain of its own. The proportional seam,
  already proven by pie.
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
