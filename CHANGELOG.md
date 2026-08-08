# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
