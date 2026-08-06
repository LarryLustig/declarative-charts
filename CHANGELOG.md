# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
