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

### 1. Scatter / XY plots — **done**

**Why:** it was the only *shape of data* the library could not express. Every
other chart plots a value against a category — a bar per region, a point per
date. None plotted a value against another value, and correlation is an ordinary
question.

`<dc-bubble>` looks like it should cover this and does not: it takes `value` and
`size-value` and positions by index, so its x axis is still categorical.

```html
<dc-chart>
  <dc-axis position="bottom"><dc-title>Dose (mg)</dc-title></dc-axis>
  <dc-scatter label="Control">
    <dc-point x="10" value="20"></dc-point>
    <dc-point x="15" value="35"></dc-point>
  </dc-scatter>
</dc-chart>
```

Shipped as sketched — no new base class, and `AxisChart` needed only a numeric
category axis. Two things came out differently:

- **`x` + `value`, not `x` + `y`.** `value` is the universal magnitude name in
  this library and already carries formatting, missing-value policy and the
  show/hide conditions. A `y` alias would have been a second name for the same
  thing on the same element.
- **No `type="value"` required.** The axis becomes numeric because a point
  states an `x`. Requiring a second attribute to activate the first is exactly
  the class of silent misconfiguration this project keeps finding in its own
  code.

A `<dc-scatter>` series wraps the points, rather than loose `<dc-point>`
children of the chart: a scatter usually compares groups, and a group needs a
name for the legend and a colour of its own.

### 2. Reference lines and bands — **done**

**Why:** a target, a threshold, a budget, an SLA. It is the most common
annotation on a business chart, and its absence was conspicuous the moment
anyone used this at work. A stub had been waiting since the accessibility work —
`getReferenceLineValue()` in `chart.ts` returned `undefined` and the insight
generator was already calling it.

```html
<dc-chart>
  <dc-reference min="80" max="120" fill="#fef3c7" label="Acceptable"></dc-reference>
  <dc-reference value="100" label="Target" stroke="#dc2626"></dc-reference>
  <dc-bar value="95" label="Q1"></dc-bar>
</dc-chart>
```

Shipped as sketched, in the existing value-axis coordinate space. Three
decisions came out of building it:

- **Bands beneath the data, lines above it.** A band is a region of the plot, so
  whatever it overlaps has to stay readable. A line is a mark on the plot, and a
  target hidden behind a bar is no target.
- **A reference widens an automatic axis.** Otherwise the chart looks complete
  and quietly omits the annotation it was given.
- **Clamp a band, drop a line.** Against an axis bounded outright, part of an
  overhanging band really is on screen and drawing that part is honest. Clamping
  a *line* would put it somewhere it is not, which the reader cannot detect — so
  it is dropped and reported as `DC114`.

**Not yet:** references live on `AxisChart`, so `<dc-radar-chart>` and the
proportional charts do not take one. A ring on a radar is the obvious extension.
A reference on a scatter's *x* axis is the other — the value axis is covered,
the numeric category axis is not.

### 3. Label collision handling — **done**

**Why:** this library positions by data, so labels *will* collide — and did.

Two corrections to what this entry assumed:

- **`shouldShowLabel()` was not the single gate.** It gates *category axis*
  labels, and the labels that actually collided were the *value* labels on the
  data. The real choke point was `deferredLabels` in `chart.ts`, an array every
  render path already pushes to and one place draws from.
- **The measured collisions were not the ones described.** The irregular time
  chart's own value labels did not overlap each other; a value label overlapped
  a *y-axis tick* label, because the first and last points of a line sit on the
  plot edges and their centred labels hang into the gutter. Four of ten did that
  on `line-basic`. Skipping labels would have been the wrong remedy — clamping
  them back inside the plot loses nothing.

Shipped as `label-collision` (`hide` | `clamp` | `show`, clamp-then-hide by
default) and `label-rotate` on `<dc-axis>`. The automatic interval accounts for
the tilt, so rotating keeps labels rather than merely tilting the survivors.

**Not covered:** `<dc-pie-chart>` positions its labels round a circle and has
its own crowding problem — adjacent thin slices, which wants leader lines or
vertical spreading rather than this pass. The one measured overlap there is a
2.5px sliver between two different slices' labels.

### 4. Radar chart — as the scaled-polar exemplar ✅ BUILT

The one item here that was not a capability gap. See the next section for why it
was on the release list rather than the deferred one.

**It answered its question.** The scale machinery *can* leave the cartesian grid,
but not by reusing `AxisChart.getNiceRange()` — that expresses zero as a fraction
from the top of a rectangle, which is meaningless on a spoke. What transferred
was `calculateNiceTicks()` in `chart-utils.ts`, already pure. So the seam holds,
and the lesson for the next non-cartesian chart is to reach for the pure helpers
rather than the base class.

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
this library exists not to have (docs/review.md §4.6). A value written as markup can
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
| Subpath entry points | Would cut the CDN bundle by 20-30%. Waiting for usage to say which combinations people actually want — see below |

### Subpath entry points

`import 'declarative-charts'` registers every element, so a page that draws bar
charts still ships pie, funnel, stage and radar. Measured, brotli-compressed:

| What is imported | Transferred | Saving |
|---|---|---|
| everything (today) | 61 kB | — |
| `<dc-chart>` family only | 48 kB | 21% |
| bar charts only | 43 kB | 30% |

**A bundler cannot recover this on its own.** `sideEffects` lists `*.js`,
`*.cjs` and `*.ts`, which is required: registration happens as a side effect of
import, and marking the package side-effect-free lets a bundler delete the whole
library — that defect shipped once and `test/package/smoke.mjs` exists because
of it. Registration-by-import and tree-shaking are in direct tension, and the
side effect has to win.

So the saving needs explicit opt-in, something like:

```js
import 'declarative-charts/elements/bar';
import 'declarative-charts/elements/line';
```

**Why it waits.** It is additive, so nothing breaks by doing it later; and the
right split is a question about how people actually use the library, which
nobody can answer yet. Guessing now means either a granularity nobody wants
(nine separate imports) or one that saves nothing (`/axis` and `/radial`).

The costs are real but ordinary: a `dist/elements/*` entry per element, an
`exports` map to match, per-subpath cases in the package smoke test — that file
is the only thing that exercises the published artifacts — and documentation for
two ways to install rather than one.

**What would settle it:** an issue asking for it, or evidence that 61 kB is
losing adopters. Until then the single import is one fewer decision for someone
trying the library for the first time.

---

## Known gaps

Not features — things that are wrong or thin, recorded so they are not
rediscovered:

- ~~**Visual tolerance is loose.**~~ Fixed: `maxDiffPixelRatio: 0.01` allowed
  11,445 pixels to differ on a typical baseline and hid three separate real
  changes. Replaced with `maxDiffPixels: 100`, an absolute allowance — a ratio
  gives the largest images the largest blind spot. Measured against a deliberate
  label nudge: the old setting caught 0 of 9 affected charts, the new one 9 of 9,
  with four consecutive clean runs on unchanged code.
- **`stage-chart.ts` at 88%** is the thinnest real coverage left, mostly in
  `calculateTextFit`.
- **Outreach has not happened.** docs/review.md §8 argues discovery is the binding
  constraint, not features. That remains true and is the strongest argument for
  keeping this list short.

  Measured on the registry rather than assumed: `declarative-charts` is *in* the
  npm search index — `?text=maintainer:larrylustig` returns it — but scores
  **0.0** and therefore sorts last on every query. On `keywords:html-first`, 27
  packages match and it ranks 27th; a search for its own exact name returns
  22,155 results without it in the first 750. npm ranking is dominated by
  popularity, so this does not resolve itself with time: downloads need
  discovery and discovery needs downloads. GitHub is unaffected — repo search
  ranks it first of two for `declarative-charts in:name`.

- **`<dc-swatch shape>` does not accept `none`,** and has its own renderer with a
  wider vocabulary (`rect`, `line`) than the marker family. An unrecognised value
  there still falls back to a circle rather than reporting `DC117`. Unifying the
  two is a deliberate open question, not an oversight.

- **`dist/vite.svg` ships in the published package.** It is the Vite scaffold's
  default logo, sitting in `public/`, which Vite copies into the build output. 1.5
  kB of the tarball since 0.2.0. Harmless, but it is the Vite logo in someone
  else's `node_modules`.

- **A year-less date format silently anchors to the current year.**
  `date-utils.ts` defaults the year to `new Date().getFullYear()` when parsing a
  format with no year token, so the same markup means different things in
  different years. Every fixture carries an explicit year, which is why nothing
  has caught it.

- **The publish gate is where latent test-timing assumptions surface.** Two
  pre-existing flakes each aborted a 0.3.0 release attempt: `bar-overflow` timing
  out on 800-bar renders, and the examples smoke test measuring pages before
  their custom elements had upgraded. Both only appear under the parallel load
  `prepublishOnly` creates, and both are fixed — but that suite is the heaviest
  thing the repo runs, so it is the first place a new one will show.

---

## Non-goals

Recorded so they are not proposed again without new information:

- **A bulk-data attribute** (`values="[10,20,30]"`). Considered and declined —
  docs/review.md §4.6. It concedes the library's only differentiator, the performance
  case does not exist, and it splits the API. A `.data` *property* is the right
  shape if someone genuinely needs to pass an array from JavaScript; build it
  when asked.
- **A JavaScript configuration API.** `new Chart(el, {...})` is what every other
  library does and what this one is defined against.

---

## Version history

See [CHANGELOG.md](CHANGELOG.md).
