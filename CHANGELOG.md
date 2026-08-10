# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **One name: `declarative-charts`.** The project was calling itself three things — the npm
  package `declarative-charts`, the repository `decl-charts`, and the elements `dc-`. Standardised
  on `declarative-charts`, which the `dc-` prefix already encodes. The prefix is public API in
  every example and 2,861 tests, so it anchored the choice rather than the other way round

- **The CDN bundle is minified.** Vite leaves ES-format library output unminified apart from
  identifier renaming, so `@__PURE__` annotations survive for the consumer's bundler. That is
  right for `declarative-charts.js`, which always goes through a bundler — and wrong for
  `declarative-charts.standalone.js`, which a browser downloads whole. It was shipping 88 kB of
  this project's own JSDoc and ~106 kB of indentation

  | | raw | gzipped |
  |---|---|---|
  | before | 492 kB | 118 kB |
  | after | **298 kB** | **77 kB** |

  `build/minify-standalone.mjs` runs after the Vite builds. It touches only the standalone:
  `declarative-charts.js` keeps its annotations deliberately, and the UMD is already minified by
  Vite. Lit is inlined into the standalone, so the pass pins `legalComments: 'inline'` and aborts
  the build if any of the ten BSD-3-Clause headers would be dropped

- **Declaration maps are no longer emitted.** A `.d.ts.map` points an editor at `.ts` source that
  is not in the tarball, so 187 kB across 53 files led nowhere. `npm pack` goes from 114 files to
  61

- **`custom-elements.json` is generated, not committed.** It was the largest single thing in the
  package at 1,967 kB — bigger than all three bundles together — and it is regenerated on every
  build and before every publish, so tracking it added nothing but history. Now gitignored and
  shipped from the filesystem via `files`, exactly as `dist/` already is

- **The manifest is compacted.** 41% of it was pretty-printing that no machine reads: 2,015 kB to
  1,193 kB, same JSON, nothing dropped. That trade only works because the file is no longer
  committed — a one-line 1.2 MB blob in git would poison every future diff. The remaining bulk is
  the manifest doing its job: 44% is description text harvested from this project's JSDoc, which
  is what gives editors autocomplete on `<dc-bar value="…">`

  Cumulatively, `npm pack` goes from **648 kB packed / 3.7 MB unpacked** to **547 kB / 2.5 MB**

### Added

- Five package-smoke checks covering the above, each verified to fail when what it guards is
  removed: the manifest is compacted, the standalone is whitespace-minified (by density, not line count — the SVG template
  literals hold real newlines that survive minification, so both builds land near 1,700 lines),
  carries no source JSDoc, keeps its licence headers, and no declaration maps reach the tarball

### Added

- **Label collision handling.** This library positions by data, so labels *will* collide — and
  did. Two mechanisms, at two levels
  - **`label-collision`** on `<dc-chart>`: `"hide"` (new default), `"clamp"` or `"show"`. Every
    value label in `<dc-chart>` already passed through one place, which is what made this a
    single pass rather than six
  - Two steps, ordered because the first loses no information. **Clamping** shifts a label
    sideways to keep it inside the plot — the first and last points of a line sit on the plot
    edges, so their centred labels hung over the axis gutter and landed on the tick labels there;
    four of ten did on `line-basic`. The shift is only ever horizontal, which keeps the label on
    its datapoint's row. Then **hiding** drops what still overlaps, greedily, in document order
  - **`label-rotate`** on `<dc-axis>`: tilts category labels. `label-interval` hides labels to
    make room; a tilt keeps them. A tilted label needs roughly `height / sin(angle)` of
    horizontal space rather than its full width, so 45 degrees fits about three times as many —
    on the example page, 3 of 8 labels become 8 of 8
  - The automatic interval knows about the tilt, so rotating stops labels being skipped rather
    than merely tilting the survivors. Padding grows for both the depth below the axis and the
    sideways reach of the outermost label, which otherwise hung off the edge and rendered
    "North East Region" as "rth East Region"
  - New pure helpers `placeLabels()`, `labelRect()`, `rotatedLabelFootprint()` and
    `rotatedLabelHeight()` in `chart-utils.ts`, unit tested in isolation

### Changed

- **Value labels are hidden on collision by default.** `label-collision="show"` restores the old
  behaviour. Defaulting to hiding is a judgement about which failure is worse: two numbers
  printed on top of each other are unreadable *and* unmarked, so the reader cannot tell there
  were two, whereas a missing label leaves the shape it belonged to visible and correctly placed

- **Visual baselines regenerated at zero tolerance.** `maxDiffPixelRatio: 0.01` had been hiding
  real render changes — 13 of 30 charts differed from their committed baselines, and only some of
  that was this change. `bar-basic`'s grid *ticks* had drifted from 12/24/36/48 to 10/20/30/40/50
  at some earlier point and the 0.986% pixel difference sat just under the threshold. The
  baselines are now exact; the tolerance is unchanged, because it exists for cross-machine
  antialiasing

### Added

- **`<dc-reference>`** — target lines and threshold bands on `<dc-chart>`. One element covers
  both shapes an annotation takes, because they are the same idea at different widths: `value`
  draws a line, `min`/`max` draw a band, and either bound alone draws a half-open band —
  `min="80"` shades everything above 80, which is how a danger zone is usually stated
  - `value` alongside a band is not a conflict: it draws the band's centre line, which is
    exactly what "acceptable range, target 100" means
  - **Bands are drawn beneath the data, lines above it.** A band is a region of the plot, so
    whatever it overlaps has to stay readable; a line is a mark on the plot, and a target hidden
    behind a bar is no target at all
  - **A reference widens an automatic axis.** A target the axis crops off is worse than no
    target, because the chart looks complete and quietly omits the thing it was annotated with
  - Against an axis bounded outright, the two kinds part company: a band that runs past the edge
    is **clamped**, because part of the region really is on screen; a line outside the range is
    **dropped** and reported as `DC114`, because clamping it would place it somewhere it is not
    and the reader has no way to tell
  - An annotation is not data: not focusable, absent from the legend (its label is on the line
    already), and outside every total and percentage
  - Fills the stub the roadmap anticipated — `getReferenceLineValue()` in `chart.ts` returned
    `undefined` and the insight generator has been calling it since the accessibility work. A
    chart with a target now says "all exceed target" or "target met in Q1, Q3"
  - New diagnostics `DC113` (a reference sets neither `value` nor a bound) and `DC114`
  - Parts `reference-line`, `reference-band` and `reference-label`

- **`<dc-scatter>`** — unconnected points positioned by two numbers, inside the existing
  `<dc-chart>`. It is the one *shape of data* the library could not express: every other chart
  plots a value against a category, and none plotted a value against another value
  - `<dc-point>` gains `x`. A chart holding any point with an `x` scales its category axis to
    that domain and draws numeric ticks — no `type="value"` needed, because an attribute
    silently ignored for want of a second one is the failure mode this library keeps finding
  - `x` + `value`, not `x` + `y`: `value` is the universal magnitude name here and already
    carries formatting, missing-value handling and the show/hide conditions. A `y` alias would
    have split the API in half
  - Per-series `shape`, `size` and `fill-opacity`; `shape` reuses the `point-shape` vocabulary,
    so a scatter and a line's markers are drawn from one place
  - The domain rounds outward to whole ticks, as the value axis does, so the extreme readings
    sit inside the plot rather than straddling the axis lines. `min-value`, `max-value`,
    `tick-interval` and `range-padding` on `<dc-axis>` all apply
  - Screen readers get the **correlation** rather than a list of readings — direction and
    strength from Pearson's r, read at the conventional 0.7 / 0.4 / 0.2 — because a scatter is
    read for its shape. New pure helpers `correlation()` and `analyzeScatter()` in
    `accessibility/insights.ts`
  - Legend entries are dimensionless, and scatter values stay out of the percentage denominator:
    a cloud of readings has no share of a whole, and including it would quietly change the
    percentages on the bars beside it

- **`<dc-radar-chart>`** — several dimensions plotted on radiating scaled axes, with
  `<dc-radar-axis>` and `<dc-radar-series>`. It is the library's third structural seam: unlike
  pie, funnel and stage, which map value straight to a size, a radar has a real radial *domain*
  with a minimum, a maximum and rings
  - Per-axis `min-value` / `max-value`, so speed in km/h can sit beside power in hp without the
    polygon implying a relationship between the raw numbers
  - Axes are optional and inferred from point labels when omitted; declare them for a specific
    order, a per-axis domain, or an axis no series has data for yet
  - Reuses `<dc-point>` for the data and `<dc-grid>` for ring styling, and the existing
    `missing="gap|skip|zero"` policy, which here means break the polygon, join the neighbours,
    or pull the vertex to the centre
  - `fill-opacity` defaults to translucent and `show-value` to false: two opaque polygons hide
    each other, and a radar's message is the silhouette rather than the ten numbers on it
  - New diagnostics `DC111` (a point names an axis that does not exist) and `DC112` (fewer than
    three axes)

### Changed

- `no-dead-attributes.test.ts` **fails when an element has no render context**, instead of
  skipping it. The three radar elements were invisible to the guard until this existed — and so,
  it turned out, were `<dc-defaults>`'s twenty attributes, which had never been checked

- **ROADMAP rewritten**, 1,031 lines to 202. The old one listed twenty-odd features by phase and
  its status markers had gone stale — several items marked "Not Started" had shipped. The new one
  admits only two grounds for the 1.0 list: a capability the library cannot express at all, or a
  chart that proves an architectural seam while breaking changes are still free. Everything else
  is deferred with a reason, and the non-goals are recorded so they are not re-proposed

### Added

- **Time axes work.** `<dc-axis type="time">` now positions points by their date rather than by
  their turn, and labels the axis with its own round tick dates instead of one label per
  datapoint. `date-format="timestamp"` reads Unix seconds; `date-label-format` takes the `MMM d`
  token set. Lines, areas and bubbles are all positioned; bar charts decline a time scale and say
  why, since bars occupy fixed slots the ticks could not line up with
  - Everything needed already existed — `parseTimeScale`, `getTimeX` and `renderTimeAxisLabels`
    in `axis-chart.ts`, and the parsers in `date-utils.ts` — and **nothing called any of it**, so
    the feature had been documented, exampled and visually baselined while doing nothing at all

### Fixed

- **`formatDate` mangled every month name containing an "a".** It ran a chain of `.replace()`
  calls, so the final `/a/g` → AM|PM rewrote the "a" inside the month it had just produced:
  `"MMM d"` rendered `"JPMn 3"` for January. Jan, Mar and May were all affected. It is now a
  single tokenising pass. Every existing test used June, whose names contain no "a", which is why
  it had gone unnoticed


- **`<dc-palette high-contrast>` did nothing.** CLAUDE.md documents it as the way to override
  high-contrast colours, and nothing read the palette's own flag — a page that chose accessible
  colours by hand silently got the generated set. A `<dc-palette high-contrast>` child of a chart
  in high-contrast mode now supplies the colours

### Changed

- **README leads with what the library is actually for** — charts a server template can render,
  with no JSON endpoint, no build step and no chart code. A Django loop and a Rails loop are the
  hero examples, followed by an htmx swap. All eight chart examples in the file were rendered in
  Chromium to confirm they work
- npm keywords gain `hypermedia`, `no-build`, `server-rendered`, `htmx`, `html-first`, `django`
  and `rails`
- `NEEDS_CONTEXT` in `no-dead-attributes.test.ts` is empty: the guard now checks 159 of 170
  element/attribute pairs, up from 149

### Known gaps

- **The time-axis feature is unwired.** `type="time"`, `date-format` and `date-label-format` are
  documented in API.md, demonstrated in `examples/`, and have a passing visual baseline — but
  `parseTimeScale`, `getTimeX` and `renderTimeAxis` in `axis-chart.ts` have no caller, so a time
  axis renders raw label strings spaced by index rather than by date. Recorded in `KNOWN_DEAD`


- **All ten known dead attributes now work.** Each was declared, documented in API.md, and read by
  nothing
  - **`<dc-fill>`'s nine SVG paint attributes** — `fill-opacity`, `fill-rule`, `stroke-width`,
    `stroke-opacity`, `stroke-dasharray`, `stroke-dashoffset`, `stroke-linecap`, `stroke-linejoin`
    and `stroke-miterlimit` — are applied to the shape a palette entry matches, in all four chart
    types. `stroke-dasharray` accepts the same named patterns as `<dc-grid>`. An attribute on the
    element itself wins, and an element with its own `fill` opts out of palette painting
  - **Per-element `show-label`** on data elements, including the `"50%"` and `"100"` thresholds the
    other `show-*` attributes accept. It was declared on `BaseFilledShape` and never carried into
    the render

### Changed

- `KNOWN_DEAD` in `no-dead-attributes.test.ts` is now empty, and the guard checks 149 of 170
  element/attribute pairs (up from 139). A new entry in that list means a new bug


- **`show-label` did nothing on `<dc-chart>`.** API.md's table promises it for Bar and Line
  charts, but only `<dc-pie-chart>` and `<dc-funnel-chart>` read it — `show-label="false"` on a
  bar chart left every label in place. Now honoured at chart level. Per-element `show-label` on
  `<dc-bar>` is still not plumbed and is recorded as a known gap

### Added

- **`test/component/no-dead-attributes.test.ts`** — renders each element twice, with and without
  each declared attribute, and fails if the output is byte-identical. Ten attributes have now been
  found declared, documented, and wired to nothing; `api-docs.test.ts` cannot catch that class,
  because a dead attribute is present in both the docs and the source. 139 of 170 element/attribute
  pairs are checked, and the three exclusion lists are printed on every run
- **Tests for `animation.ts`** (36% → 94%, functions to 100%) covering every animator, the
  already-animating guard, reduced-motion, and the timing passed to `animate()`
- **Behaviour tests for `<dc-stage-chart>`** (73% → 88%): the sizing modes including `log-value`
  and the visibility floor, size units, the connector shorthand parser, and the interaction
  surface. Overall coverage 88.1% → 91.4%

### Known gaps

- Ten attributes are declared and documented but read by nothing, listed with reasons in
  `KNOWN_DEAD` in `no-dead-attributes.test.ts`: per-element `show-label` on data elements, and
  `<dc-fill>`'s `fill-rule`, `fill-opacity`, `stroke-width`, `stroke-opacity`, `stroke-dasharray`,
  `stroke-dashoffset`, `stroke-linecap`, `stroke-linejoin` and `stroke-miterlimit`, none of which
  reach the generated `<pattern>`


- **A `<dc-legend-item>` with no label blanked the entire legend.** `getCustomItems()` filtered
  label-less items out and returned an empty array; the caller does `customItems ?? items`, and
  `[]` is not nullish, so it counted as "custom items were supplied" and discarded the chart's own.
  One typo — `lable="Revenue"` — emptied the legend with nothing logged. It now falls back to the
  chart's items and says why
- **`<dc-legend-item stroke-dasharray>` and `pattern` did nothing.** Both were declared on the
  element and documented in API.md, and neither was read — the same dead-attribute class as
  `bar-color`. A dashed series now reads as dashed in the legend, and a patterned one paints with
  its pattern. Registering the pattern also had to move ahead of `renderDefs()`, which runs earlier
  in the template than the legend: doing it during the legend render produced `url(#id)` pointing
  at a definition that was never emitted
- **`<dc-log-console>` leaked a `MutationObserver` watching `document.body`** when it was removed
  before its deferred first frame ran — which is exactly what an htmx swap does. The observer
  survived for the page's lifetime, firing on every mutation anywhere to refresh a console no
  longer in the document

### Added

- **Tests for the two elements that had none.** `log-console.ts` (422 lines) went 0% → 96%, and
  `chart-legend-item.ts` (131 lines) 0% → 100%; overall coverage 86.5% → 88.1%. A unit test for
  `animation.ts`'s pure helpers went in alongside


- **43 example code blocks did not match the chart beside them.** `label-positioning.html`
  accounted for 20 of them, every snippet omitting the `palette` and the `<dc-title>` its chart
  actually had — so copying any of them produced different colours and no title. Snippets are now
  regenerated from the charts themselves, and may abbreviate only when they say so (an ellipsis,
  or a comment such as `<!-- same bars -->`)
- **`defaults.html` was in no navigation menu**, reachable only by typing its URL
- **`animations.html` loaded the library from an absolute `/src/index.ts`**, which breaks whenever
  the site is not served from the domain root. Every page now uses the same relative path
- **Seven grids mixed chart sizes across side-by-side cells**, making the comparisons they exist
  for unfair and the rows ragged
- **`.note` was declared byte-for-byte in three page-local `<style>` blocks**, and buttons were
  styled on `interactive.html` alone — so the same control looked different depending on the page.
  Both now live in `examples.css`, along with a single `.example-table` replacing the three
  near-identical table styles (`.format-table`, `.position-table`, `.data-table`) that differed
  only by accident in padding and striping
- `loaded-content.html` is an htmx fragment, not a page; it is now marked as one, and its heading
  typo ("Dyanmic") is fixed

### Added

- **`test/visual/example-code.spec.ts`** compares all 386 example code blocks against the charts
  they sit beside, in both attributes and child-element counts
- **`test/unit/examples-structure.test.ts`** pins the page-to-page invariants: boilerplate, title
  convention, script order, nav reachability, no `dist/` references, and no CSS duplicated across
  page-local `<style>` blocks


- **`bar-color` did nothing.** `chart.ts` set `defaultColor` as a *field* on each element, but
  `resolveFillsWithPatterns()` takes it as its **second argument** — nothing read the field, and
  TypeScript's excess-property check does not apply to a variable, so the compiler never objected.
  Bars auto-generated their colours whatever `bar-color` said. This is very likely why an earlier
  review recorded the attribute as a deprecation: it was undocumented *and* inert. The fix is
  guarded on the attribute being present, so charts without it still get distinct auto-generated
  colours rather than one flat green
- **Four example pages were broken on a fresh clone.** `colors.html`, `defaults.html`,
  `palettes.html` and `swatches.html` loaded `../dist/declarative-charts.standalone.js`, which is
  gitignored and uncommitted, so they showed nothing until someone ran `npm run build` — and stale
  library behaviour whenever `dist/` was out of date. All four now load `../src/index.ts` like the
  other 29
- **Only 3 of 24 diagnostic codes were documented**, one of them incidentally inside a sample log
  line. Warnings echo to the console by default, so a `[DC005]` in DevTools had nowhere to point.
  API.md now carries the full reference, and the log-level table no longer claims `false` is the
  default — it has been `warning` since diagnostics were turned on

### Added

- **`examples/empty-loading.html`** — the Empty and Loading States feature had no example at all.
  Covers the default and custom messages, styling `<dc-empty>`, the all-hidden state and the
  loading skeleton, with live toggles for the last two
- Examples for features that had none: `missing` on areas, `text-scaling`, bubble radius limits,
  legend `max-width`, stage `aspect-ratio` and `stage-max-size`, individual side padding, and the
  chart-level `bar-color` / `line-color` / `slice-color` / `label-fill` defaults. Attribute
  coverage in `examples/` went from 75/103 to 98/103


- **A donut written as `inner-radius="50%"` rendered nothing but NaN coordinates.**
  `Number("50%")` is NaN, and NaN is false for both `< 0` and `>= 100`, so it passed the `DC103`
  validation that exists for exactly this. `inner-radius` now accepts `50` and `"50%"` alike, and
  an unusable value raises `DC103` and falls back to a solid pie. The negative branch separately
  logged "Using 0 (solid pie)" while continuing to draw with the negative value — the promised
  fallback now happens. **The donut's visual baseline had been certifying the broken output**
- **Four attributes were documented but never implemented** — `fill-colors`, `stroke-colors`,
  `stroke-color`, `fill-color`. `slice-color` had been deprecated in favour of `fill-colors`,
  which was never written
- **`API.md` was wrong in both directions.** `<dc-axis>` documented 4 of its 13 attributes, so
  setting a Y-axis minimum was invisible; `<dc-grid>`, `<dc-empty>`, `<dc-defaults>` and
  `<dc-log-console>` had no entry; `<dc-legend columns>` gave the wrong default; `<dc-fill
  max-value>` was described as exclusive when it is inclusive. Every attribute is now documented,
  and `test/unit/api-docs.test.ts` keeps it that way
- **README** showed no Area or Stage chart despite listing both as features, and advised calling
  `chart.requestUpdate()` after changing children — which the `MutationObserver` made unnecessary
- **Two example pages showed a chart with no markup beside it**, which is the point of an example

### Added

- **`test/visual/examples.spec.ts`** loads all 33 example pages and fails on NaN geometry, charts
  that render nothing, and unexpected console output. Nothing had exercised these pages before
- **`test/unit/api-docs.test.ts`** diffs `API.md` against the attributes declared in `src/`, in
  both directions, and rejects a JSDoc `@attr` with no property behind it


- **Visual tests settled on fixed sleeps rather than on conditions**, making them flaky on a
  loaded machine. The "wait for Lit updates" step asserted `chart.updateComplete !== undefined` —
  true the instant an element upgrades, awaiting nothing — so a 100ms sleep was doing all the
  work. Waits are now condition-based: `updateComplete` is awaited in a loop (Lit resolves it to
  `false` when another update was scheduled, and these charts re-render from a `MutationObserver`),
  followed by `document.fonts.ready` and a two-frame paint settle. The swatch test additionally
  waits for `dc-palette` and `dc-fill`, which `<dc-swatch>` itself waits for before resolving its
  colour. The suite also got faster and much less variable: ~10s across cold, loaded and five
  consecutive runs

### Removed

- **BREAKING: the day-one deprecations are gone** (REVIEW.md §6.5). A pre-1.0 library should not
  ship carrying deprecations
  - `color` on data elements — use `fill` (shapes) or `stroke` (lines). 128 uses across the
    example pages were migrated
  - `BaseShape`, the alias for `BaseFilledShape`
  - `ChartLegend.customTitle` — use `getTitleInfo()`

### Changed

- **BREAKING: naming collisions resolved** (REVIEW.md §6.4)
  - `<dc-bar width>` → `<dc-bar bar-width>`. `width` was a homonym of `<dc-chart width>` (the
    width of the whole chart) and the odd one of three: `<dc-chart>` and `<dc-bar-group>` already
    spelled this `bar-width`. A leftover `width` is now ignored with a `DC104` rather than passed
    through onto the `<rect>`, where it would have silently overridden the computed geometry
  - `<dc-funnel-chart segment-height|segment-min-height|segment-max-height>` → `stage-height`,
    `stage-min-height`, `stage-max-height`. The attributes size `<dc-funnel-stage>` children, so
    they now use that noun — while `<dc-bar-segment>` keeps "segment" for the different thing it
    means. The surrounding prose used the wrong noun throughout and was corrected with it
  - `<dc-fill scale>` → `<dc-fill pattern-scale>`, matching the attribute of the same meaning on
    shapes. Bare `scale` also read as though it scaled the fill rather than the pattern inside it

- **BREAKING: `<dc-grid>` attributes renamed** (REVIEW.md §6.1). `style` → `stroke-dasharray`,
  `color` → `stroke`. `style` is a global HTML attribute on every element, so the old name
  shadowed it and put an unparseable CSS declaration in the DOM. The new names match the SVG
  properties they set and accept the same named patterns as `<dc-fill>` (`solid`, `dashed`,
  `dotted`, `dash-dot`, `long-dash`) or a raw dash list such as `"5 3"`
- **BREAKING: `show-*` attributes reject values they cannot read** (REVIEW.md §6.2). An
  unrecognised value used to mean *show*, so `show-value="off"`, `"no"` and `"none"` all turned
  labels **on**. `off`/`no`/`none`/`hidden` now mean off and `on`/`yes`/`show` mean on; anything
  else warns with `DC104` and defaults to not showing. These are enumerated attributes, not HTML
  boolean attributes
- **BREAKING: `<dc-legend show-*>` accepts thresholds**, like every other `show-*` in the
  library. The legend declared its own private boolean converter, so `show-value="10%"` silently
  meant `true` there while meaning "at least 10% of the total" everywhere else. Thresholds are
  now evaluated per legend item. Chart-level conditions also reach the legend intact — they were
  being flattened with `!== false` before it saw them

### Fixed

- **`slice-color` was deprecated in favour of an attribute that does not exist.** Its notice said
  "use `fill-colors` instead"; `fill-colors` appears in one JSDoc line and is implemented nowhere.
  It is the only way to set a chart-wide slice colour — the pie equivalent of `bar-color` — so it
  has been undeprecated rather than removed, and the phantom `@attr fill-colors` line on
  `<dc-chart>` deleted
- **`<dc-grid>` was undocumented and its examples used an attribute that did not exist.** Every
  shipped example wrote `line-style="dashed"`, which matched no property, so those grids silently
  rendered solid. `<dc-grid>` now has an API.md section — it had zero mentions
- **`<dc-grid>`'s own validation never ran.** `getStyleWarnings()` had no caller, so an invalid
  dash pattern was ignored in silence; it is now collected with the axis warnings. Its
  `getStrokeDasharray()` had no caller either — the renderer carried a second copy of the dash
  table, and the two disagreed (`5,5` vs `5 5`). One copy now, in `<dc-fill>`

- **Popups, keyboard-navigation labels and screen-reader summaries ignored `value-format`**
  (REVIEW.md §3.3). A chart set to `value-format="currency USD"` drew `$1,000.00` on the label
  and announced `1000` in the tooltip and to a screen reader. 18 sites across the four chart
  types now route through the formatter, honouring each element's own `value-format` override
  rather than only the chart-level one. Counts are deliberately left unformatted — "3 stages" is
  a cardinal, not a measurement
- **A line popup's average counted missing points as zero**, dragging the mean below every value
  actually plotted. Missing points are now excluded from both the sum and the divisor

- **An unrecognised stage `shape` produced an unrenderable chart.** `shape="chevron"` fell off the
  end of three default-less switches: two returned `undefined` and turned every coordinate into
  NaN, the third drew no element at all — with no error anywhere. TypeScript thought the switches
  were exhaustive because `StageShape` is a four-member union, but an HTML attribute is an
  arbitrary string at runtime. Now falls back to `rectangle` and warns with the new `DC110`
- **`hidden` was ignored on `<dc-stage>`**, though API.md lists it as supported and every other
  data element honours it
- **A resized zero-value stage pushed the whole stack off-centre.** The centring offset was
  computed from unadjusted sizes while positions advanced by adjusted ones. One visual baseline
  changed; the space above and below the stack is now equal

### Changed

- **Stage chart geometry extracted into `src/stage-layout.ts`** (REVIEW.md §5.3)
  - 144 lines of pure functions over numbers — no DOM, no Lit, no chart state — replacing
    geometry that was interleaved with data extraction, colour resolution and zero handling
    across a 352-line method
  - 26 characterization tests written first, on what was the worst-covered file in the repo
- **`BaseChart` god-class work completed** (REVIEW.md §5)
  - `TextMeasurer` extracted, the sixth and last responsibility to move out. Six modules now hold
    1,592 lines that used to be inside the base class
  - **Both abstraction leaks closed.** `getAnimatableChartType()` sniffed `this.tagName` for
    'pie'/'funnel'/'stage' — a base class enumerating its own subclasses, which failed silently
    for a new chart type by falling through to `'mixed'`. It is now `protected abstract`, so the
    compiler demands it. The `orientation` cast is replaced by an `isHorizontalChart()` hook
  - `ColorResolver` now creates its own canvas for colour parsing instead of borrowing the
    text-measuring one — two unrelated concerns that happened to want a 2D context
  - **Twelve duplicated methods collapsed to three.** `renderFocusIndicator`,
    `togglePopupForFocusedElement` and `shouldShowAutoPopup` are hoisted into `BaseChart`; the
    four chart files lost 164 lines. `shouldShowAutoPopup` is now variadic, which generalises all
    four variants rather than compromising between them
  - `axis-chart.ts`'s byte-identical private copy of `niceNumber` removed in favour of the shared
    one in `chart-utils.ts`

### Added

- **Custom-elements manifest.** `npm run analyze` generates `custom-elements.json` covering all
  26 elements; it is built automatically, referenced by the `customElements` field, and shipped.
  For an HTML-first library this is the difference between editor autocomplete on `<dc-bar …>`
  and none. The package smoke test asserts every element appears in it


### Fixed

- **DC001/DC002 became unreachable when the empty-state placeholder was added**
  - The placeholder replaces `renderChart()` entirely, which is where both codes were logged, so
    an empty chart drew "No data" and reported nothing — a chart could be empty for the wrong
    reason and say nothing about it
  - Both now come from the empty-state path via a `getEmptyStateDiagnostic()` hook each chart
    type implements, so the message still names the elements the author probably meant to add.
    The unreachable copies inside `renderChart()` are gone

- **`downloadSvg()` filename handling**
  - `downloadSvg('')` produced a `.svg` dotfile — a default parameter only fires for `undefined`
  - `downloadSvg(null)` threw a raw `TypeError`, *after* the SVG had been located
  - Path separators passed straight through, so `'reports/q3'` asked the browser to write
    outside the download directory
  - All three now fall back to `chart.svg` and warn with the new `DC108`

- **`downloadSvg()` clobbered an existing width.** The guard was `!hasWidth || !hasHeight` while
  the body set both, so an SVG carrying `width="999"` and no height silently lost the 999. Each
  dimension is now filled in independently

- **`DC204` bypassed the logging system**, going straight to `console.warn` with an inline
  message, so `logging`/`console-log` had no effect on it. Now routed through `logError()`

- **lit-html binding markers shipped inside the exported SVG.** Stripped from the clone

- **`hidePopup()` left stale content in the shadow DOM**, still reachable through
  `::part(popup)` and still announced by assistive technology between hovers. The content is now
  cleared; the container stays mounted for the CSS fade

- **`showPopupAtBounds('')` showed an empty box**, while the standalone `showPopupAtBounds()` in
  `chart-utils.ts` — same job, also exported — declined it. The two now agree

- **An unrecognised `logging` or `console-log` value silently switched diagnostics off.**
  `logging="verbose"` disabled logging with no warning — the same silent-fallback failure mode
  that hid the palette bug for months. Now warns once with the new `DC109` and falls back to the
  default level. That warning is written directly rather than through `log()`, since the value
  being reported is the one that decides whether logging happens at all

- **`getLogEntries()` returned the live internal array**, so a caller could mutate the chart's
  own log. `<dc-log-console>` spread the result precisely because of this. Now a copy

- **The console group opened by an echo was closed by the *next* render**, so an idle chart could
  leave one open in DevTools indefinitely, swallowing unrelated messages. It is now closed at the
  end of the render that opened it

### Added

- **`downloadSvg()` is documented** for the first time, in **API.md → Exporting a Chart**,
  including that CSS styling — `::part()` rules and `--dc-*` properties — is *not* carried into
  the exported file. Stated as a real limitation rather than partially implemented


### Added

- **Category and group labels misaligned from their bars**
  - Bar positions and label positions were computed by six separate copies of the same
    traversal, and the copies had drifted. The label copies never gained the branch that
    honours an explicit per-bar `width`, so a group of bars with differing widths drew its
    labels from the group average — **15 units of drift, every label off its bar**, in both
    orientations
  - The two group-label copies ignored gutters entirely, so a group label sat off-centre from
    the group it named on *every* grouped chart — also up to 15 units
  - All six now derive from a single `computeBarLayout()` traversal, which returns each bar's
    slot and each unit's true extent. The class of bug is now impossible rather than fixed
  - Regression tests in `test/component/bar-layout.test.ts` cover both orientations, differing
    widths, mixed explicit/auto groups, and group centring; verified to fail without the fix

- **Empty and loading states**
  - A chart with no data rendered a blank bordered box. It logged `DC001`, but diagnostics are
    off by default so the log went nowhere, leaving the reader to guess whether the data was
    empty, still loading, or broken
  - An empty chart now draws a centred message. `<dc-empty>` supplies your own text, which the
    page's renderer translates because it lives in the markup
  - "All series are hidden" is distinguished from "No data" — different situations, different
    reactions
  - New `loading` attribute draws a skeleton, taking precedence over both data and the empty
    message so a refresh does not flash stale values. Works with `hx-indicator="closest dc-chart"`
  - Placeholders replace the plot entirely (axes, grid, legend) but keep the title. The chart
    announces its state to screen readers — `"bar chart: Q3 Sales - no data"` — and is not
    keyboard focusable while a placeholder shows
  - Styleable via `--dc-empty-color`, `--dc-skeleton-color`, `--dc-skeleton-duration`, and the
    `empty`, `skeleton`, `skeleton-bar` parts. The skeleton pulse respects `prefers-reduced-motion`
  - Documented in **API.md → Empty and Loading States**

- **Missing values in lines and areas**
  - `value` was `0` by default, so `<dc-point label="Mar">` — what a template emits for a month
    with no data — plotted at zero. The line dived to the axis and the chart asserted the value
    *was* zero, which for financial, clinical, or operational data is not cosmetic
  - `<dc-point>` now defaults to NaN and treats an omitted `value`, an empty string, `null`,
    `none`, `na`, `n/a`, `-`, or non-numeric text as "no data". A real `0` is still a real 0
  - `missing` on `<dc-line>`/`<dc-area>`: `gap` (default, breaks the series), `skip` (joins the
    neighbours), or `zero` (the old behaviour, now opt-in)
  - Curve fitting applies per unbroken run, so a `smooth` or `monotone` spline can no longer
    overshoot across a gap and distort the segments on both sides
  - Area fills close per run, so a gap is a hole rather than fill drawn to the baseline
  - A gap draws no marker and no label, is skipped by keyboard navigation, and is excluded from
    the axis range and the screen-reader description — which previously read
    "highest at undefined (NaN)"
  - Documented in **API.md → Missing Values**

### Changed

- **`<dc-point>` with no `value` no longer renders as zero.** It is now a gap. Set
  `missing="zero"` on the line or area to keep the old behaviour.

### Added

- **`fit` attribute for filling a container**
  - A viewBox locks a chart to the ratio implied by `width` and `height`, so a 600×400 chart
    dropped into an 800×200 dashboard tile rendered 800×533 — overflowing — and in a tall tile
    left a gap
  - `fit="fill"` makes the chart adopt the container's shape. `width` stays the coordinate
    scale; the layout height is recomputed from the container's measured aspect, so the plot
    fills the space with **nothing stretched** — unlike `preserveAspectRatio="none"`, the
    horizontal and vertical scales stay equal
  - `fit="aspect"` remains the default
  - Measured in Chromium for one chart authored 600×400: an 800×200 tile yields viewBox
    `0 0 600 150`, 400×600 yields `0 0 600 900`, 500×500 yields `0 0 600 600` — each filling
    exactly, each with equal x/y scale
  - Needs a container with a definite height. Where there is none — including `display: grid`
    with no `grid-template-rows`, whose row is content-sized — the chart keeps its authored
    proportions. **`fill` never produces a zero-height chart.** `--dc-height` sets the height
    directly if preferred
  - Documented in **API.md → Filling a Container**

- **`text-scaling` attribute for responsive text**
  - A viewBox scales everything uniformly, text included, so a `font-size` of 14 is
    14/600ths of the chart's width. The same chart rendered 4.7px axis labels in a 300px
    container and 21.2px in a 1200px one — unreadable at one end, oversized at the other
  - `text-scaling="fixed"` reinterprets font sizes as CSS pixels, so text stays the same size
    on screen however large the chart is drawn. Applies to titles, axis labels and titles, data
    labels, and the legend
  - `proportional` remains the default — switching would silently resize text in every existing
    chart
  - Charts observe their own rendered width with a `ResizeObserver`, re-rendering only in
    `fixed` mode and only when the width changes by more than half a pixel
  - Degrades safely: with no layout to measure (SSR, detached elements, no `ResizeObserver`)
    sizes pass through unscaled rather than collapsing to zero
  - Measured in Chromium at 300px and 1200px: `fixed` holds axis labels at 11px, title 20px,
    data labels 14px, legend 13px at both widths
  - Documented in **API.md → Responsive Text**

- **CSS styling hooks: `::part()` and `--dc-*` custom properties**
  - The library had no styling escape hatch at all — no parts, no custom properties — while
    actively warning against CSS conventions. A design system had no way to theme charts once;
    a brand font meant editing every `<dc-title>` on the page
  - **19 custom properties** cover the chart frame (`--dc-surface`, `--dc-border`,
    `--dc-padding`, `--dc-shadow`, `--dc-border-radius`), typography (`--dc-font-family`), the
    focus ring, and the popup. They inherit through the shadow boundary, so `:root { … }` themes
    every chart on the page and dark mode is a media query
  - **21 shadow parts**: `chart`, `bar`, `bar-segment`, `line`, `area`, `point`, `bubble`,
    `slice`, `stage`, `label`, `title`, `legend-title`, `legend-label`, `legend-value`,
    `legend-swatch`, `legend-background`, `axis-line`, `axis-label`, `grid-line` (plus
    `zero-line`), `popup`, `focus-ring`
  - This makes states expressible that no attribute could reach —
    `dc-chart::part(bar):hover { opacity: .75 }` was previously impossible
  - The hardcoded `:host` frame (white background, grey border, drop shadow) is now tokenised,
    so charts can sit on a dark page without fighting the library
  - Parts are stamped after render from a selector map (`getShadowParts()`), so a chart type
    names its own shapes — `data-shape-index` means a bar in one chart and a slice in another
  - Popup transitions now respect `prefers-reduced-motion`
  - Documented in **API.md → Styling with CSS**, including the precedence rules; verified in
    Chromium that every part resolves and every token applies

- **Interaction events**
  - `dc-click`, `dc-mouseenter`, `dc-mouseleave` on data elements, and `dc-render` after each draw
  - Previously the only ways to respond to a click were `href` navigation and a declarative
    popup. "Click a bar, filter the table below" required reaching into the chart's shadow DOM
    for a selector the library never promised
  - Dispatched from the element in *your* markup (the `<dc-bar>`), so listeners can attach there,
    to the chart, or to the document. `bubbles` and `composed` are set, so delegation survives
    shadow boundaries and htmx swaps
  - `detail` carries `chart`, `element`, `label`, `value`, `percent`, `index`, `seriesLabel`,
    `seriesIndex`, and `originalEvent`. `percent` is a **decimal** (0.25 = 25%), matching the
    library's percent convention, and `null` rather than 0 where a share is undefined
  - `dc-click` is cancelable — `preventDefault()` suppresses both the popup and `href` navigation
  - Event names are declared on `HTMLElementEventMap`, so TypeScript infers `event.detail`
    without a cast. `ChartInteractionDetail` and `ChartRenderDetail` are exported
  - Documented in **API.md → Events**, with a live demo in `examples/interactive.html`

### Changed

- **Warnings and errors now appear in the browser console by default**
  - `logging` defaults to `'warning'` (was `'false'`) and `console-log` to `'warning'`
    (was `'none'`), so the DC### system finally produces output without opting in
  - Previously the entire diagnostic system was silent unless a developer already suspected a
    problem and knew to enable it. That is how the palette documentation came to name 18
    palettes that do not exist, with 44 references to them in the shipped examples — an unknown
    `palette` falls back to generated colours, so nothing could contradict the docs
  - An unknown palette name now surfaces as
    `[DC201] colors.palette: Palette "tableau10" not found` instead of silently
    drawing auto-generated colours
  - Verbose `info` derivation logging still requires opting in, so the default costs nothing
  - Console echo is **deduplicated per element**: one misconfiguration is reached from several
    code paths and charts re-render, which would otherwise produce a stream of identical
    warnings. Every entry is still captured for `<dc-log-console>`
  - `console-log="none"` silences one chart; `logging="false"` switches the system off entirely
  - Verified that all 23 visual fixtures and the examples pages emit no warnings, so ordinary
    charts stay quiet

### Fixed

- **A diagnostic could break a render**
  - `getConsoleIdentifier()` assumed `tagName` and `querySelector` were available. Harmless
    while console echo was off; with it on by default, an instance constructed directly rather
    than upgraded from markup threw during render. The label is cosmetic and is now fail-safe

- **Documented palette names were largely fictional**
  - CLAUDE.md and API.md both listed 25 built-in palettes, of which **18 did not exist**
    (`blue`, `green`, `red`, `orange`, `purple`, `gray`, `plasma`, `turbo`, `tableau10`, `set1`,
    `set2`, `set3`, `accent`, `dark2`, `paired`, `spectral`, `pink-green`, `purple-green`), while
    **13 real ones were missing** (`default`, `vivid`, `earth`, `ocean`, `colorblind-safe`,
    `high-contrast`, `cool-to-warm`, `blues`, `greens`, `reds`, `purples`, `sunset`,
    `purple-orange`)
  - Nothing caught it because an unrecognised name resolves to `undefined` and falls back to
    generated colours, so a wrong name looks like "the colours are odd", never like an error
  - **44 references in the shipped examples pointed at names that do not exist** — those demos
    were showing auto-generated colours while claiming to demonstrate a palette. All corrected
  - Both docs now list the real 20, grouped by type, with a note about the silent fallback
  - `test/unit/palette-docs.test.ts` parses the lists out of both files and compares them to
    `BUILTIN_PALETTES`, so they cannot drift again

### Changed

- **SVG export extracted from `BaseChart` into `SvgExporter`**
  - Fifth of the god-class extractions. `src/svg-exporter.ts`, 146 lines; `base-chart.ts` down
    to 3,292 (from 3,724 before this work began)
  - The exporter owns the whole download path: clone the rendered `<svg>`, inline what a
    standalone file cannot inherit, serialize, and hand it to the browser via an object URL
  - **No API change**, and this one is load-bearing: `downloadSvg(filename?)` is documented,
    consumer-facing API. The default filename now lives in one place, `DEFAULT_SVG_FILENAME`,
    so the delegating signature and the implementation cannot drift
  - `prepareSvgForExport()` stayed on the chart and is dispatched back through the host, so
    replacing it in a subclass still governs the exported output — the same seam `getLuminance`,
    `focusElement`, `log` and `showPopup` needed in the four earlier extractions
  - `SvgExporter`, `SvgExportHost` and `DEFAULT_SVG_FILENAME` are exported
  - 61 characterization tests were written and committed **before** the refactor
    (`test/component/svg-export.test.ts`)

- **Popups extracted from `BaseChart` into `PopupController`**
  - Fourth of the god-class extractions. `src/popup-controller.ts`, 180 lines
  - The controller owns the four pieces of popup state and both coordinate paths into them:
    `showPopup()` from viewport coordinates, `showPopupAtBounds()` from viewBox coordinates
  - `showPopupForFocusedElement()` and `togglePopupForFocusedElement()` deliberately stayed on
    the chart — subclass extension points that all four chart types override, exactly like
    `getFocusableElements()` in the keyboard extraction. The popup-content generators live in the
    subclasses and were not touched
  - No API change. `popupContent`, `popupX`, `popupY` and `popupVisible` remain writable
    protected accessors, since they were writable `@state()` fields, and `showPopup()`,
    `hidePopup()` and `showPopupAtBounds()` still delegate — so the ~60 call sites across the
    four chart types and `KeyboardNavController` are untouched
  - `showPopupAtBounds()` dispatches back through the host to reach `showPopup()`, so a subclass
    overriding it still wins — the same seam `getLuminance`, `focusElement` and `log` needed in
    the three earlier extractions
  - This one is net +47 lines in `base-chart.ts`, not fewer: preserving four `@state()` fields as
    get/set pairs costs more source than the fields did. The gain is the responsibility boundary,
    not the line count
  - `PopupController` and `PopupHost` are exported
  - 67 characterization tests were written and committed **before** the refactor
    (`test/component/popups.test.ts`)

- **Logging extracted from `BaseChart` into `ChartLogger`**
  - Third of the god-class extractions. `src/chart-logger.ts`, 283 lines; `base-chart.ts` down
    to 3,273 (from 3,724 before this work began)
  - The logger owns the captured entries, both level filters, the console group, the echo
    dedup set and `logError()`'s message formatting
  - No API change. The public `getLogEntries()` still returns the live array `<dc-log-console>`
    expects, `logEntries` remains a writable protected accessor, and `log()`, `logError()` and
    `clearLog()` still delegate — including for the other extracted controllers, since
    `ColorResolver` takes `log`/`logError` on its own host
  - `logError()` and the console identifier deliberately dispatch back through the host, so a
    subclass overriding `log()` or `getTitle()` still sees them — the same seam that
    `getLuminance` and `focusElement` needed in the two earlier extractions
  - `ChartLogger` and `ChartLoggerHost` are exported
  - 89 characterization tests were written and committed **before** the refactor
    (`test/component/logging.test.ts`)

- **Keyboard navigation extracted from `BaseChart` into `KeyboardNavController`**
  - Second of the god-class extractions. `src/keyboard-nav-controller.ts`, 221 lines;
    `base-chart.ts` down to 3,330 (from 3,724 before this work began)
  - The controller owns the focus cursor and key handling. `getFocusableElements()`,
    `getShapeBounds()`, `renderFocusIndicator()` and the popup hooks deliberately stayed on the
    chart — they are subclass extension points that every chart type overrides
  - No API change. `focusedIndex` and `keyboardActive` remain writable protected accessors,
    since they were writable `@state()` fields, and all navigation methods still delegate
  - `KeyboardNavController` and `KeyboardNavHost` are exported
  - 31 characterization tests were written and committed **before** the refactor
    (`test/component/keyboard-nav.test.ts`)

- **Colour resolution extracted from `BaseChart` into `ColorResolver`**
  - `BaseChart` had accumulated colour resolution alongside logging, popups, keyboard navigation,
    accessibility, layout and SVG export. Colour is the first of those responsibilities to move
    out: `src/color-resolver.ts`, 551 lines, with `base-chart.ts` down from 3,724 to 3,386
  - No API change. `BaseChart` holds the resolver behind a lazy getter and its existing
    `protected` methods delegate, so subclasses call exactly what they always did
  - Constructed with an explicit `ColorHost` adapter rather than `this`, because `log` and
    `getMeasureContext` are not public and widening them would enlarge the API the extraction
    exists to shrink
  - `ColorResolver` and `ColorHost` are exported for anyone building on the library
  - 42 characterization tests were written and committed **before** the refactor
    (`test/component/color-resolution.test.ts`), so any behaviour change would surface

- **Render is no longer quadratic in datapoint count — 1,000 bars went from 44.6s to 0.29s**
  - Profiling (V8 CPU profile + call counting, not inspection) found that `shouldShowLabel()` is
    called once per label from inside the render loop, and each call reached
    `getChartPadding()` → `getAxisLabelPadding()` → `getFlattenedBars()` → `getBarStructure()`,
    re-deriving *every* bar. Rendering 400 bars made **2,900,800** calls to `extractBarData` and
    **482,406** text measurements
  - `BaseChart.cachePerRender()` memoizes derivations for one render pass, cleared in
    `willUpdate()`. Applied to `measureText`, `getChartPadding`, `getBarStructure`,
    `getFlattenedBars`, `getLabelIntervalValue`, and `getLabelLinesCount`
  - The cache deliberately outlives `render()`: event handlers use the same derivations, so they
    now see exactly the data that produced what is on screen instead of recomputing it

    | bars | before | after | |
    |---:|---:|---:|---:|
    | 250 | 2,869 ms | 134 ms | 21× |
    | 500 | 10,823 ms | 183 ms | 59× |
    | 1,000 | 44,562 ms | 293 ms | **152×** |
    | 2,000 | timed out (>90 s) | 401 ms | — |
    | 5,000 | — | 780 ms | — |

  - Line charts likewise: 1,000 points 12,245 ms → 271 ms. Re-render at 1,000 bars
    21,073 ms → 33 ms. Scaling is now linear
  - Output is unchanged — all 23 visual baselines still match
  - New `test/component/render-caching.test.ts` asserts derivation counts stay independent of
    element count, so the quadratic cannot return unnoticed

- **Charts now re-render themselves when their children change**
  - Previously only `slotchange` invalidated a chart, which fires on children being added or
    removed. Changing an existing child did nothing: `bar.setAttribute('value', '80')` updated
    the `<dc-bar>` and the chart never noticed
  - `BaseChart` now observes its own light-DOM subtree with a `MutationObserver`, covering
    attribute changes, `hidden` toggling, additions, removals, reordering, text content, and
    `innerHTML` swaps — regardless of whether the change came from your code, a framework, a
    template re-render, or an htmx swap
  - A Lit `updated()` hook on the data elements would not have been enough: `hidden` is a plain
    HTML attribute read via `hasAttribute()`, and passthrough attributes (`hx-*`, `data-*`) are
    undeclared by definition, so neither is a reactive property
  - **`requestUpdate()` is no longer needed for markup changes.** It still works, and remains the
    way to force a redraw when nothing in the DOM changed
  - Observer records are batched per microtask, so a burst of edits produces one re-render
  - The 52 manual `requestUpdate()` calls in the integration suite have been removed, so those
    tests now genuinely assert reactivity rather than papering over its absence
  - New `test/integration/child-reactivity.test.ts` (11 tests); verified in Chromium, including
    a one-second idle check confirming no re-render loop

### Fixed

- **`"sideEffects": false` let bundlers delete the entire library**
  - Defining custom elements *is* a side effect, so the flag was a false promise. Webpack and
    Rollup honoured it and dropped the documented `import 'declarative-charts'` wholesale —
    registering nothing and rendering a blank page with no error. Measured: esbuild produced a
    **0-byte** bundle
  - Invisible in development, because Vite's dev server does not tree-shake
  - Now `"sideEffects": ["*.js", "*.cjs"]`

- **Lit was bundled into the library *and* declared a runtime dependency**
  - Consumers already using Lit got two copies of `ReactiveElement` in one page: doubled
    payload, `instanceof` failing across the boundary, and Lit's duplicate-version warnings
  - Lit is now a **peer dependency**, externalized from the bundler-facing ESM build
  - The no-build path is served by separate self-contained artifacts rather than by the package
    main: `declarative-charts.standalone.js` (ESM, referenced by the new `unpkg`/`jsdelivr`
    fields and a `./standalone` export) and `declarative-charts.umd.cjs`. A CDN
    `<script type="module">` cannot resolve a bare `import 'lit'` specifier, so those keep Lit
    inlined by design
  - `npm install declarative-charts lit` is now the install line

- **README line-chart quick-start used a nonexistent attribute**
  - `stroke-colors` on `<dc-chart>` does not exist, so the first line chart a new user copied
    silently ignored its colour and fell back to the palette default
  - Corrected to `stroke` on `<dc-line>`, matching `API.md`

- **Placeholder package metadata**
  - `YOUR_USERNAME` in the repository, bugs, and homepage URLs, and
    `Your Name <your.email@example.com>` as author, replaced with real values
  - `npm run test:package` now fails if placeholders reappear

- **Bar charts rendered nothing past ~84 bars**
  - Each bar unit reserves a fixed gutter, so beyond a certain count the gutters consumed the
    whole plot area and the computed bar width went negative. A negative `width` is invalid SVG,
    so the browser discarded every `<rect>` and the chart drew nothing — with no warning raised
  - Gutters are now compressed proportionally when space runs short, and bar size is floored at
    1 viewBox unit so a bar can never collapse or invert
  - New warning `DC107` (`BAR_SPACE_EXHAUSTED`) reports the compression factor
  - `calculateUnitDimensions()` now returns `gutterScale`; all bar and category-label render
    paths apply it, so bars and their labels stay aligned under compression
  - New regression tests in `test/component/bar-layout.test.ts`

- **Entry animations threw where the Web Animations API is unavailable**
  - `firstUpdated` fired animations unconditionally, so `Element.prototype.animate` being absent
    (happy-dom, jsdom, older browsers) produced uncaught `rect.animate is not a function`
    exceptions. In tests this failed the run — and blocked `prepublishOnly` — even with every
    assertion passing
  - New `supportsWebAnimations()` guard; all six animation entry points now degrade to a no-op
  - The component test setup stubs the Web Animations API, so tests exercise the real animated
    path rather than the fallback

- **Boolean attribute values were case-sensitive**
  - `show-value="FALSE"`, `hidden="False"` and similar were treated as `true`, because
    `showConditionConverter`, `booleanConverter`, and `optionalBooleanConverter` compared against
    lowercase `'false'` only
  - All three now compare case-insensitively and tolerate surrounding whitespace, matching how
    HTML handles enumerated attributes
  - This fixes the one failing unit test, which was also suppressing the entire coverage report
    (Vitest skips coverage output and clears `coverage/` when any test fails)

### Added

- **Package smoke test**
  - `npm run test:package` validates the built artifacts through a real bundler: resolves the
    package via `node_modules`, bundles `import 'declarative-charts'` with esbuild, and asserts
    the element registrations survive tree shaking
  - Also checks lit externalization per artifact, CDN field wiring, tarball contents, and
    absence of placeholder metadata
  - Wired into `prepublishOnly`, which now runs tests, build, then this
  - The two packaging defects above were undetectable by every other test in the repo, because
    they only appear once a bundler consumes the built package

- **Render-performance harness**
  - `npm run bench` measures how render cost scales with datapoint count and probes for layout
    degeneracies; `npm run bench -- --probe` is a fast pass/fail gate that exits non-zero
  - `test/visual/bench.mjs` (driver) and `test/visual/fixtures/bench.html` (page)

- **Error Code System**
  - New structured error handling with unique error codes (DC001-DC499)
  - Error codes organized by category: data errors, configuration errors, reference errors, style warnings, informational
  - New `src/errors.ts` with `ErrorCode` registry and utility functions
  - New `logError()` method on all chart classes for consistent warning/error logging
  - All existing warnings migrated to use error codes
  - Console output includes error code prefix: `[DC001] path: message`
  - `LogEntry` interface extended with optional `code` field
  - Exported types and utilities: `ErrorCode`, `ErrorDefinition`, `formatErrorMessage`, `getErrorByCode`
  - Documentation in CLAUDE.md for adding new error codes

- **Converters Module**
  - New `src/converters.ts` module with property converters separated to avoid circular dependencies
  - Exports: `showConditionConverter`, `booleanConverter`, `optionalBooleanConverter`, `ShowCondition` type
  - Re-exported from `base-chart.ts` for backwards compatibility

- **Default Configuration**
  - New `<dc-defaults>` element for setting default attribute values across charts
  - Place before charts to configure page-wide or container-scoped defaults
  - Supports all common chart attributes: `animations`, `palette`, `high-contrast`, `show-value`, `show-label`, `show-percent`, `value-format`, `percent-format`, `label-position`, `label-fill`, `stroke`, `stroke-width`, `auto-popup`, `logging`, `console-log`, and padding properties
  - Scoped defaults: charts use the nearest `<dc-defaults>` ancestor
  - Explicit chart attributes always override defaults
  - New utility functions: `findDefaultsElement()`, `getDefault()`, `resolveDefault()`
  - New examples page: `examples/defaults.html`
  - **Site-wide defaults via JavaScript API:**
    - New `configure()` function for setting defaults across all pages
    - New `getConfiguration()` function to retrieve current configuration
    - Import from shared module loaded on every page for consistent site-wide settings
    - Priority: element attribute > `<dc-defaults>` > `configure()` > library default

- **Area Charts**
  - New `<dc-area>` element for creating filled area charts
  - Areas are filled regions bounded by data points above and the zero line below
  - Multiple areas stack by default (each area's baseline is the cumulative sum of previous areas)
  - New `overlapping` attribute on `<dc-chart>` to disable stacking for comparisons
  - Supports all curve-fit methods: linear, smooth, monotone, step
  - Full pattern fill support inherited from BaseFilledShape
  - Works in combo charts with bars and lines
  - New examples page: `examples/areacharts.html`

- **Custom Legends**
  - New `<dc-legend-item>` element for defining legend entries manually
  - Use inside `<dc-legend>` to override auto-generated legend items
  - Enables semantic coloring where multiple data elements share the same color but represent different concepts
  - Supports `fill`, `stroke`, `stroke-dasharray`, `shape`, `pattern`, and `value` attributes
  - Items with `value` attribute display values and percentages (controlled by `show-value`/`show-percent` on legend)
  - Items without `value` are treated as dimensionless (label-only)
  - Shape defaults to "line" when only stroke is set

- **Entry Animations**
  - New `animations` attribute on all chart types enables entry animations on first render
  - Supports custom duration: `animations="500ms"` or `animations="0.5s"`
  - Animation types by element:
    - Bars grow from baseline (vertical grows up, horizontal grows right)
    - Lines draw along path using stroke-dashoffset technique
    - Areas fade in with subtle vertical grow
    - Pie slices fade in sequentially
    - Points/Bubbles scale up with overshoot easing
    - Funnel/Stage elements cascade in from left
  - Respects `prefers-reduced-motion` media query for accessibility
  - Staggered timing creates cascading effect across elements
  - Animation code isolated in `src/animation.ts` module
  - New examples page: `examples/animations.html`

- **Label Positioning System**
  - New `label-position` attribute for controlling where labels appear on chart elements
  - New offset attributes for fine-tuning: `label-offset-x`, `label-offset-y`, `label-offset-r`
  - Cascading inheritance: element → parent (line) → chart → default
  - Bars support 6 positions: `outside`, `inside-top`, `inside-center`, `inside-bottom`, `outside-top`, `outside-bottom`
  - Points/Lines support 9 positions: `above`, `above-left`, `above-right`, `below`, `below-left`, `below-right`, `left`, `right`, `center`
  - Bubbles support 10 positions (all point positions plus `inside`)
  - Pie slices support 2 positions: `inside`, `outside`
  - Funnel stages support 3 positions: `inside`, `outside-left`, `outside-right`
  - Stage chart stages support 5 positions: `inside`, `outside-left`, `outside-right`, `above`, `below`
  - See API.md "Label Positioning" section for complete documentation

- **Automatic Label Contrast (label-fill)**
  - New `label-fill` attribute for controlling label text color
  - Defaults to `"auto"` which automatically calculates optimal contrast based on label position:
    - Labels inside shapes: contrasts against shape fill color
    - Labels outside shapes: uses dark text for chart background
  - Geometric hit-testing determines if labels are inside or outside shapes
  - Supports all chart types: bars, points/bubbles, pie slices, funnel stages, stage chart stages
  - Can be overridden with any CSS color value
  - Fixes unreadable labels when positioning inside dark bars or outside light pie slices

- **Stage Chart Auto-Fit Label Suppression**
  - Labels that don't fit inside small shapes are automatically suppressed
  - Hover popups are automatically enabled when labels are suppressed
  - Values are prioritized over labels when only one text element fits
  - Helps with extreme value differences in `stage-size="value"` mode
  - Uses per-render caching for efficient event handler access to layout data
  - Examples updated with new "Small Values and Zero Handling" section

- **Stage Chart Zero-Value Handling**
  - New composable attributes for controlling zero-value display:
    - `zero-value`: Size value for zero-value shapes (number or "auto")
    - `zero-fill`: ID reference to a `<dc-fill>` element for styling
    - `zero-shape`: Override shape type for zero-value stages
    - `zero-hidden`: Boolean to hide zero-value stages entirely
  - `zero` compound shorthand combines settings (e.g., `zero="auto circle #my-fill"`)
  - "auto" calculates size from smallest non-zero value
  - Replaces the old `zero-style` attribute with more flexible options

- **Enhanced dc-fill SVG Attributes**
  - Full SVG stroke-* specification support:
    - `stroke-width`, `stroke-opacity`, `stroke-dasharray`, `stroke-dashoffset`
    - `stroke-linecap` ("butt", "round", "square")
    - `stroke-linejoin` ("miter", "round", "bevel")
    - `stroke-miterlimit`
  - Fill attributes: `fill-opacity`, `fill-rule`
  - Named dash patterns: "solid", "dashed", "dotted", "dash-dot", "long-dash"
  - `<dc-fill>` can now be referenced standalone via ID (e.g., from `zero-fill`)

### Changed

- **Shared Navigation for Examples**
  - Navigation is now dynamically generated from `examples/examples.js`
  - All example pages use a single `NAV_CONFIG` object for consistent navigation
  - Adding new pages only requires editing `examples.js` instead of all HTML files

- **Bar Chart Examples Reorganization**
  - Bar Charts now uses a dropdown in major nav with 4 focused pages:
    - **Basics** (`barcharts.html`): Orientations and default colors
    - **Groups & Stacks** (`bar-groups.html`): Grouped bars, stacked bars, reverse orientations
    - **Sizing & Spacing** (`bar-sizing.html`): Bar widths and gutter spacing (merged from bar-width.html and gutter.html)
    - **Negative Values** (`bar-negatives.html`): New page with negative value examples
  - Removed `bar-width.html` and `gutter.html` (content merged into bar-sizing.html)
  - Bar-specific items removed from minor nav

- **Pie Chart Examples Reorganization**
  - Pie Charts now uses a dropdown in major nav with 2 pages:
    - **Basics** (`piecharts.html`): Basic pie charts, custom colors, labels/values display, palettes
    - **Donuts** (`donuts.html`): Donut charts with inner-radius variations, legends, palettes
  - Expanded donut examples with inner radius comparisons (25%, 50%, 65%, 80%)

- **Line Chart Examples Reorganization**
  - Line Charts now uses a dropdown in major nav with 2 pages:
    - **Basics** (`linecharts.html`): Basic lines, multiple series, point customization, styling, negative values
    - **Curves** (`line-curves.html`): Curve fitting options (linear, smooth, monotone, step) and comparisons

- **Navigation Reorganization**
  - Major nav reordered: axis-based charts first (Bar, Line, Bubble, Combo), then radial/process charts (Pie, Funnel, Stage)
  - Combo Charts moved from minor nav to major nav (it's a chart type)
  - Minor nav reorganized into 6 logical dropdown groups:
    - **Chart Layout**: Axes, Borders & Padding
    - **Data Display**: Labels & Values, Number Formatting
    - **Chart Colors**: Palettes, Swatches, Element Colors, Patterns (unchanged)
    - **Text Elements**: Titles, Legends, Typography (Formatting moved out)
    - **Interactivity**: Popups, Links & Updates
    - **Developer**: Logging, htmx Integration, Accessibility

### Fixed

- **Circular Dependency in Module Loading**
  - Fixed "Cannot access 'showConditionConverter' before initialization" error
  - Moved converters to separate `src/converters.ts` module to break circular dependency between `base-chart.ts` and `chart-defaults.ts`
  - All existing imports from `base-chart.js` continue to work (re-exported for backwards compatibility)

- **Stage Chart Zero-Value Sizing**
  - Fixed clipping and label centering issues when using `zero-value="auto"`
  - Space is now correctly allocated for zero-value stages before size calculation
  - Zero-value stages properly sized to match smallest non-zero value in auto mode

- **Stage Chart Label Suppression Too Aggressive**
  - Labels were being suppressed in small shapes even when there was visual room
  - Scaled padding down for smaller shapes: uses `min(16, dimension * 0.1)`

- **Horizontal Bar Inside Label Positioning**
  - Fixed `inside-top` and `inside-bottom` labels overlapping bar boundaries
  - Changed from middle-anchored text with fontSize-based offsets to edge-anchored text
  - Labels now properly stay inside bar boundaries using directional text anchors

- **Stale Attributes in Examples**
  - Replaced non-existent `fill-colors` attribute with `bar-color` or `palette`
  - Replaced non-existent `stroke-colors` attribute with `line-color`
  - Fixed `slice-color` documentation reference to use `palette`

### Added

- **Swatch Built-in Palette Support**
  - `index` attribute for selecting colors from built-in palettes by position
  - Works with categorical, sequential, and diverging palettes
  - Example: `<dc-swatch palette="category10" index="2"></dc-swatch>`

- **Axis & Grid Configuration**
  - `<dc-axis>` element with `type` attribute: `'value'`, `'label'`, or `'time'` (inferred if omitted)
  - Range control: `min-value`, `max-value`, `range-padding` attributes
  - Tick configuration: `tick-count`, `tick-interval`, `tick-values` attributes
  - Time axis properties: `date-format`, `date-label-format` for temporal data
  - `<dc-grid>` child element for grid line styling (color, style, visibility)
  - Backward compatible: type inference from position, auto-calculated ranges when omitted

- **Negative Value Support**
  - Bar charts extend downward (vertical) or leftward (horizontal) for negative values
  - Line and bubble charts position points below zero when appropriate
  - Automatic axis scaling for negative ranges with nice number algorithm
  - Distinct zero line styling when range spans positive and negative
  - All-negative vertical charts position category axis at top (where zero is)
  - Use palettes with `min-value`/`max-value` for positive/negative coloring

- **Number Formatting System**
  - Named presets: `number`, `integer`, `compact`, `currency`, `percent`
  - d3-format subset support: `,.2f`, `.1s`, `$,.0f`, `.1%`
  - Locale-aware formatting via `locale` attribute
  - Format inheritance: element → legend/axis → chart → default
  - `value-format` and `percent-format` attributes on charts, axes, legends, and elements

- **Pattern Fills**
  - 8 built-in SVG patterns: `diagonal-lines`, `diagonal-lines-reverse`, `horizontal-lines`, `vertical-lines`, `dots`, `crosshatch`, `grid`, `checkerboard`
  - Direct pattern application via `pattern` attribute
  - Pattern definitions in palettes with `<dc-fill>` elements
  - Customizable pattern stroke, fill, and scale

- **High Contrast Mode**
  - Respects `prefers-contrast: high` media query
  - `high-contrast` attribute for explicit activation
  - WCAG AA compliant color palette
  - Automatic pattern assignment for visual distinction
  - Custom high-contrast palettes via `<dc-palette high-contrast>`

- **Keyboard Navigation**
  - Roving tabindex pattern for all chart types
  - Arrow keys to navigate between data elements
  - Enter/Space to activate elements (links, popups)
  - Home/End to jump to first/last element
  - Escape to close popups and exit navigation
  - Visual focus indicator during keyboard navigation

- **ARIA Accessibility**
  - `role="img"` on root SVG element
  - `aria-label` with chart type and title
  - `aria-describedby` pointing to `<desc>` element
  - Auto-generated descriptions when no explicit description provided

- **Auto-Insights (Screen Reader Descriptions)**
  - Analyzes chart data to generate meaningful descriptions
  - Describes trends, comparisons, and patterns
  - Implemented for all chart types: bar, line, bubble, pie, funnel
  - `aria-insights` attribute: `'auto'` (default), `'basic'`, `'none'`
  - Manual overrides via `aria-label` and `aria-description`

- **Palette System**
  - `<dc-palette>` container for reusable fill definitions
  - `<dc-fill>` elements with label matching, value-range matching
  - Pattern and solid fill support
  - ID-based pattern references

- **Bubble Charts**
  - `<dc-bubble>` elements within `<dc-chart>`
  - Size scaling based on value
  - Full styling and interaction support

- **Core Chart Types**
  - Bar charts (vertical, horizontal, grouped, stacked)
  - Line charts (single and multi-line)
  - Pie charts (with donut support via `inner-radius`)
  - Funnel charts (with chevron shapes, flat-top/bottom options)

- **Chart Chrome**
  - `<dc-title>` with SVG text styling
  - `<dc-legend>` with multiple positions and layouts
  - `<dc-axis>` configuration (label-interval, label-lines, titles)
  - `<dc-popup>` with hover and click triggers
  - Auto-popup feature for automatic tooltips

- **Built-in Palettes**
  - 25+ predefined color palettes available via `palette` attribute
  - Categorical: `category10`, `accent`, `dark2`, `paired`, `pastel`, `set1`, `set2`, `set3`, `tableau10`
  - Sequential: `blue`, `green`, `red`, `orange`, `purple`, `gray`, `viridis`, `plasma`, `warm`, `cool`, `turbo`
  - Diverging: `red-blue`, `purple-green`, `brown-teal`, `pink-green`, `spectral`
  - User-defined `<dc-palette>` elements take precedence over built-in palettes with same name

- **Color System**
  - Element-level `fill` and `stroke` attributes
  - `palette` attribute references custom or built-in palettes
  - Auto-generated colors using golden ratio algorithm when no palette specified

- **Dynamic Updates**
  - Charts update when child elements are modified
  - `hidden` attribute support for showing/hiding elements
  - Attribute passthrough for htmx/Alpine.js integration

- **Logging System**
  - `logging` attribute for debugging calculations
  - `<dc-log-console>` element for displaying logs
  - Captures padding, colors, legend dimensions, element positions
  - `console-log` attribute echoes messages to browser DevTools console
  - Console messages grouped by render cycle using `console.groupCollapsed()`
  - Smart chart identification: uses id, title text, or tag name
  - High-value warnings for common issues:
    - Empty charts or all-hidden elements
    - Lines without points, zero-value bars
    - Small pie slices (<3%), invalid donut radius
    - Increasing funnel values (anti-pattern)
    - Uniform colors across elements

### Changed

- **Refactored Chart Element Class Hierarchy**
  - Renamed `BaseShape` to `BaseFilledShape` to clarify its purpose (backward-compatible alias provided)
  - `ChartLine` now extends `BaseChartElement` directly (stroke-only element)
  - All filled shapes (`dc-bar`, `dc-point`, `dc-bubble`, `dc-pie-slice`, `dc-bar-segment`, `dc-funnel-stage`, `dc-stage`) extend `BaseFilledShape`
  - Lifted common properties to base classes for better code reuse:
    - `showValue`, `showPercent` → `BaseChartElement`
    - `value`, `showLabel` → `BaseFilledShape`
  - Moved `getPassthroughAttributes()` and `autoPopup` to `BaseChartElement`

### Removed

- **BREAKING: Deprecated Color Attributes** - The following chart-level color attributes have been removed in favor of the `palette` attribute:
  - `fill-colors` - Use `palette` attribute with a built-in or custom palette instead
  - `stroke-colors` - Use `stroke` attribute on individual elements instead
  - `fill-start-color` / `fill-end-color` / `start-color` / `end-color` - Use `palette` with a sequential palette (e.g., `palette="blue"`)
  - `stroke-start-color` / `stroke-end-color` - Use `stroke` attribute on individual elements instead

  **Migration examples:**
  ```html
  <!-- Before -->
  <dc-chart fill-colors="#4CAF50, #2196F3, #FF9800">

  <!-- After: Use built-in palette -->
  <dc-chart palette="category10">

  <!-- After: Use element-level fills -->
  <dc-chart>
    <dc-bar fill="#4CAF50" ...></dc-bar>
    <dc-bar fill="#2196F3" ...></dc-bar>
  </dc-chart>

  <!-- Before -->
  <dc-funnel-chart start-color="#3498db" end-color="#e74c3c">

  <!-- After: Use sequential palette -->
  <dc-funnel-chart palette="blue">

  <!-- After: Use custom palette -->
  <dc-palette id="my-gradient">
    <dc-fill fill="#3498db"></dc-fill>
    <dc-fill fill="#8e44ad"></dc-fill>
    <dc-fill fill="#e74c3c"></dc-fill>
  </dc-palette>
  <dc-funnel-chart palette="my-gradient">
  ```

### Fixed

- **dc-fill Custom Element Registration** - The `<dc-fill>` element was not being registered due to tree-shaking removing the module (only type-only imports existed). Added side-effect import in library entry point to ensure the element is always available.

## [0.1.0] - Initial Development

- Project setup with Vite, Lit, and TypeScript
- Basic component architecture established
