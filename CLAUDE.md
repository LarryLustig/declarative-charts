# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A declarative chart library built with Lit (Web Components) and TypeScript. Users create charts using HTML syntax instead of configuration objects.

**Chart types:**
- **Axis-based** (use `<dc-chart>`): Bar, Line, Bubble - chart type determined by child elements
- **Non-axis** (own elements): Pie (`<dc-pie-chart>`), Funnel (`<dc-funnel-chart>`), Stage (`<dc-stage-chart>`)

## Commands

```bash
npm run dev      # Vite dev server at localhost:5173
npm run build    # TypeScript + Vite build → dist/
npm run preview  # Preview production build
npm test         # Run tests in watch mode
npm run test:run # Run tests once
npm run test:coverage  # Run tests with coverage report
```

## Documentation

- **README.md** - Quick-start guide with installation, basic examples, and links
- **API.md** - Complete API reference (all elements, attributes, styling options)
- **CHANGELOG.md** - Version history following Keep a Changelog format
- **ROADMAP.md** - Planned features and future directions
- **examples/** - Live HTML examples demonstrating all features

When adding new features:
1. Update **API.md** with complete attribute/element documentation
2. Add examples to appropriate files in **examples/**
3. Update **CHANGELOG.md** under `[Unreleased]` section

**Important:** Always update **CHANGELOG.md** prior to each commit. Include the changelog update in the same commit as the related changes.

## Design Principles

### Follow Web Standards
- Prefer CSS over custom attributes for styling
- Match HTML/SVG attribute conventions (`fill`, `stroke`, `width`, `height`)
- Leverage native web APIs (computed styles, events, slots)

### SVG Text Styling
Text elements (`<dc-title>`, `<dc-legend>`) use SVG attributes, not CSS:
- Use `fill` instead of `color`
- Use unitless `font-size` (viewBox units, not px/em/rem)
- Library warns on CSS conventions (`color`, `font-size="24px"`)

## Architecture

### Component Hierarchy

**Base Classes:**
- `BaseChart`: Common properties, padding, popups, title/legend rendering, accessibility, keyboard navigation
- `AxisChart` (extends BaseChart): Axis/grid rendering, axis configuration via `<dc-axis>`
- `BaseChartElement`: Base for data elements with stroke support, passthrough attributes, showValue/showPercent
- `BaseFilledShape` (extends BaseChartElement): Adds fill, pattern, value, showLabel for area-based shapes

**Data Element Hierarchy:**
```
BaseChartElement
│   - label, color, stroke, strokeWidth, href, target
│   - autoPopup, valueFormat, showValue, showPercent
│   - getEffectiveStroke(), getPassthroughAttributes()
│
├── ChartLine (stroke-only, override showValue = true)
│
└── BaseFilledShape
    │   - value, fill, pattern*, showLabel
    │   - getEffectiveFill()
    │
    ├── ChartBar (override showValue = true)
    ├── ChartPoint (override showValue = true)
    ├── ChartBubble (override showValue = true, + sizeValue)
    ├── ChartPieSlice
    ├── ChartBarSegment
    ├── ChartFunnelStage
    └── ChartStage (+ shape, cornerRadius)
```

**Chart Components:**
- `Chart` (src/chart.ts): `<dc-chart>` - renders bars/lines/bubbles based on children
- `PieChart` (src/pie-chart.ts): `<dc-pie-chart>` - radial charts, donut via `inner-radius`
- `FunnelChart` (src/funnel-chart.ts): `<dc-funnel-chart>` - chevron-shaped stages for conversion flows
- `StageChart` (src/stage-chart.ts): `<dc-stage-chart>` - stages as shapes with proportional areas
- `RadarChart` (src/radar-chart.ts): `<dc-radar-chart>` - dimensions on radiating scaled axes

**Two structural seams, not five.** The distinction is whether a chart has a *scale*:
`<dc-chart>` (via `AxisChart`) and `<dc-radar-chart>` have domains with ticks; pie, funnel and
stage are proportional and map value straight to a size or angle. `getNiceRange`, `ValueRange`
and the tick calculations appear nowhere in `pie-chart.ts`, `funnel-chart.ts` or
`stage-chart.ts`.

`<dc-radar-chart>` is the library's proof that a scale can leave the cartesian grid. It could not
reuse `AxisChart.getNiceRange()` - that expresses zero as a fraction from the top of a rectangle -
but `calculateNiceTicks()` in `chart-utils.ts` was already pure and did the job. **If you add
another non-cartesian scaled chart, reach for the pure helpers in `chart-utils.ts`, not for
`AxisChart`.**

**⚠️ `getLegendItems()` must not call the layout.** The legend is sized inside
`getChartPadding()`, and a layout needs the padding, so routing legend items through the layout
recurses until the stack gives out. `<dc-pie-chart>` and `<dc-radar-chart>` both build legend
items from their elements directly, and both carry a note saying why. This one is not caught by
the unit tests - happy-dom took a different path - and surfaced only in the browser.

### ⚠️ CRITICAL: Element Naming

| Chart Type | Element | Why |
|------------|---------|-----|
| Bar/Line/Bubble | `<dc-chart>` | Share axis rendering |
| Pie | `<dc-pie-chart>` | No axes, radial rendering |
| Funnel | `<dc-funnel-chart>` | No axes, chevron rendering |
| Stage | `<dc-stage-chart>` | No axes, shape-based rendering |
| Radar | `<dc-radar-chart>` | Polar axes with a radial scale |

**NEVER change `<dc-pie-chart>` to `<dc-chart>` or vice versa.**

### Key Patterns

**Data Extraction**: Charts query child elements via `querySelector`/`querySelectorAll`.

**⚠️ Do not add a bulk-data attribute** (`values="[10,20,30]"` or similar). It has been considered and declined — see REVIEW.md §4.6. Three reasons, in order of weight:

1. **It concedes the library's only differentiator.** Data living in markup as document structure is what distinguishes this project; a serialized array in an attribute is what `<google-chart data='…'>` and `trendchart-elements` already do, in a category where this library has no advantage.
2. **The performance case does not exist.** Element creation and upgrade is 6–34ms even at n=1000 — under 0.04% of render time. The bottleneck was the O(n²) render, now fixed. It is not element count.
3. **It splits the API.** Per-element `fill`, `href`, `hx-*` passthrough, popups, patterns, `hidden` and the `missing` policy cannot follow data into an attribute, so it would be a second-class path supporting half the library.

If a consumer genuinely needs to supply an array from JavaScript, a `.data` **property** is the right shape — natural for JS, adds no attribute, does not invite JSON inside HTML. Build it when someone asks, not before.

**Per-Render Caching**: Expensive computations (layout, text fitting, color resolution) must run once per render and be cached for use by event handlers. This pattern:
- Avoids redundant DOM queries and calculations within a single render cycle
- Ensures event handlers (popups, hover effects) use data matching the displayed content
- Cache is cleared in `willUpdate()`, so it lives from the start of one update to the next

**⚠️ This is a correctness *and* performance requirement, not an optimization.** Several O(n)
derivations are reachable from inside per-element render loops — `shouldShowLabel()` leads to
`getChartPadding()` → `getAxisLabelPadding()` → `getFlattenedBars()` → `getBarStructure()`.
Uncached, that made rendering **quadratic**: 400 bars produced 2,900,800 calls to
`extractBarData` and 482,406 text measurements; 1,000 bars locked the main thread for 45
seconds. Memoizing brought 1,000 bars from 44,562ms to 293ms.

**Preferred mechanism — `cachePerRender()` on `BaseChart`:**
```typescript
protected getChartPadding() {
  return this.cachePerRender('chartPadding', () => this.computeChartPadding());
}
```
Keep the real work in a `computeX()` method and make `getX()` the memoized wrapper — tests and
profiling then have a stable name to hook. Already applied to `measureText`, `getChartPadding`,
`getBarStructure`, `getFlattenedBars`, `getLabelIntervalValue`, and `getLabelLinesCount`.

Only use it for derivations of the DOM and of reactive properties. Anything that can change
*within* a single render pass must not be cached this way. If you override `willUpdate()`, call
`super.willUpdate()` or the cache never clears.

`test/component/render-caching.test.ts` asserts call counts stay independent of element count;
`npm run bench` measures the timings.

Chart-specific layout may also be cached on a field, as in `stage-chart.ts`:
```typescript
// In renderChart():
const layout = this.calculateStageLayout();  // Compute once
this.cachedLayout = layout;  // Cache for event handlers

// In handleStageMouseEnter():
const stage = this.cachedLayout.stages[index];  // Use cached data
```

When implementing a new chart type, cache computed layout data if event handlers need access to it.

**No Shadow DOM for Data Elements**: Data elements return `this` from `createRenderRoot()`.

**SVG Rendering Order** (z-index, later = on top):
1. Grid lines → 2. Data elements → 3. Axes → 4. Labels → 5. Legend

**Palette System**: Charts use the `palette` attribute to reference either a custom `<dc-palette>` element or a built-in palette name. User-defined palettes take precedence over built-in palettes with the same name.

Color priority: element fill/stroke > custom palette match > palette by index > auto-generated.

```html
<!-- Built-in palette -->
<dc-chart palette="category10">
  <dc-bar value="10" label="A"></dc-bar>
  <dc-bar value="20" label="B"></dc-bar>
</dc-chart>

<!-- Custom palette with label matching -->
<dc-palette id="status">
  <dc-fill label="Critical" fill="#fee2e2" stroke="#dc2626" pattern="crosshatch"></dc-fill>
  <dc-fill label="Warning" fill="#fef3c7" stroke="#f59e0b" pattern="diagonal-lines"></dc-fill>
  <dc-fill label="OK" fill="#10b981"></dc-fill>
</dc-palette>
<dc-chart palette="status">...</dc-chart>
```

**Built-in Palettes** — 20, defined in `BUILTIN_PALETTES` in `src/builtin-palettes.ts`:
- **Categorical** (8): `default`, `category10`, `pastel`, `vivid`, `earth`, `ocean`, `colorblind-safe`, `high-contrast`
- **Sequential** (9): `blues`, `greens`, `reds`, `purples`, `warm`, `cool`, `sunset`, `viridis`, `cool-to-warm`
- **Diverging** (3): `red-blue`, `brown-teal`, `purple-orange`

`src/builtin-palettes.ts` is the single source of truth. `test/unit/palette-docs.test.ts` asserts these lists match it, because they previously drifted badly — the documented set named 18 palettes that did not exist (`blue`, `plasma`, `turbo`, `tableau10`, `set1`…) while omitting 13 that did. An unrecognised name resolves to `undefined` silently and falls back to generated colours, so a typo shows up as "the colours look wrong", never as an error.

Use `getPaletteColors(count, colorType)` in chart code to resolve palette colors.

**Pattern Fills**: Apply patterns directly (`pattern="diagonal-lines"`), by ID reference, or via palettes. Built-in: `diagonal-lines`, `diagonal-lines-reverse`, `horizontal-lines`, `vertical-lines`, `dots`, `crosshatch`, `grid`, `checkerboard`.

**Element References**: Attributes that reference other elements by ID should accept the ID directly without a `#` prefix:
- `zero-fill="my-zero-style"` → references `<dc-fill id="my-zero-style">`
- `pattern="danger"` → references `<dc-fill id="danger">`
- `palette="status"` → references `<dc-palette id="status">`

**Exception**: The `chart` attribute on `<dc-log-console>` takes a CSS selector (e.g., `chart="#my-chart"` or `chart="dc-chart"`) because that component is designed to monitor multiple charts via tabbed display.

**High Contrast Mode**: Enable with `high-contrast` attribute or auto-detect via `prefers-contrast: high`. Override colors with a `<dc-palette high-contrast>` child of the chart — its `<dc-fill>` colours replace the generated high-contrast set. That override was documented from the start and unimplemented until the dead-attribute sweep found it.

**Hidden Attribute**: Standard HTML `hidden` on data elements (`<dc-line>`, `<dc-bar>`, etc.) hides them. Toggling it re-renders the chart automatically — see **Child Reactivity** below.

**Keyboard Navigation**: Lives in `src/keyboard-nav-controller.ts`. `KeyboardNavController` owns the focus cursor (`focusedIndex`, `keyboardActive`) and key handling; `BaseChart` holds it behind a lazy `keyboardNav` getter and delegates.

What stayed on the chart is deliberate: `getFocusableElements()`, `getShapeBounds()`, `renderFocusIndicator()`, `showPopupForFocusedElement()` and `togglePopupForFocusedElement()` are **subclass extension points** that every chart type overrides. The controller owns interaction logic; the chart owns what a chart knows.

Two things the extraction had to preserve, both caught by tests rather than reasoning:

- `focusedIndex`/`keyboardActive` were `@state()`, so Lit re-rendered on every change. As plain controller fields they must call `host.requestUpdate()` — miss one and the focus indicator silently stops moving. `BaseChart` keeps writable protected accessors because they were writable fields before.
- The key handler's calls to `focusElement`, `focusNextElement`, `focusPreviousElement`, `activateCurrentElement` and `navigateToHref` **route back through the host**. Before extraction these were virtual calls on the chart, so a subclass could override any of them; calling the controller's own copies would have removed that silently.

**Popups**: Lives in `src/popup-controller.ts`, not `BaseChart`. `PopupController` owns the four pieces of popup state (`content`, `x`, `y`, `visible`) and both coordinate paths into them: `showPopup()` from viewport coordinates (a mouse event), and `showPopupAtBounds()` from viewBox coordinates (a shape's bounds, via `calculatePopupPosition()`). `BaseChart` holds it behind a lazy `popups` getter, built with an explicit `PopupHost` adapter, and `showPopup()`/`hidePopup()`/`showPopupAtBounds()` delegate — so the ~60 call sites across `chart.ts`, `pie-chart.ts`, `funnel-chart.ts`, `stage-chart.ts` and `keyboard-nav-controller.ts` did not change.

`showPopupForFocusedElement()` and `togglePopupForFocusedElement()` stayed on `BaseChart`: they are subclass extension points that all four chart types override, exactly like `getFocusableElements()` in the keyboard extraction. The popup-content generators (`generateBarPopupContent()` and friends) live in the subclasses and were not touched.

Two things a future contributor must not undo:

- `popupContent`, `popupX`, `popupY` and `popupVisible` were `@state()` fields; they are now **protected get/set accessors** on `BaseChart` delegating to the controller, whose setters call `host.requestUpdate()`. Existing code assigns all four directly. Turn them back into plain fields, or drop a `requestUpdate()`, and the popup silently stops updating on screen — tsc will not say a word.
- `PopupController.showPopupAtBounds()` calls **`this.host.showPopup()`**, not `this.showPopup()`. It was a virtual call on the chart before extraction, so a subclass or a spy overriding `showPopup` still wins. Same hazard class as `getLuminance` and the keyboard nav actions.

`test/component/popups.test.ts` holds 67 characterization tests pinning popup behaviour, including that `hidePopup()` deliberately keeps the content and coordinates (the CSS opacity transition needs them) and that `showPopupAtBounds('')` reports success — unlike the standalone helper of the same name in `chart-utils.ts`, which bails on empty content.

**SVG Export**: Lives in `src/svg-exporter.ts`, not `BaseChart`. `SvgExporter` owns the whole download path — clone the rendered `<svg>`, inline what a standalone file cannot inherit, serialize, and hand it to the browser via an object URL. `BaseChart` holds it behind a lazy `svgExport` getter, built with an explicit `SvgExportHost` adapter, and the **public** `downloadSvg(filename?)` delegates unchanged.

`downloadSvg()` is documented, consumer-facing API (demonstrated on `index.html`, referenced in ROADMAP). Its signature and observable behaviour — the `.svg` extension appended case-insensitively, the `chart.svg` default (shared as `DEFAULT_SVG_FILENAME` so the delegate and the exporter cannot drift), the DC204 `console.warn` early return — must survive any future change.

Two things a future contributor must not undo:

- `SvgExporter.downloadSvg()` calls **`this.host.prepareSvgForExport()`**, not its own copy. `prepareSvgForExport` stays a member of `BaseChart` — replacing it on an instance or in a subclass governs the exported output, as it did before extraction. Same hazard class as `getLuminance`, the keyboard nav actions and `PopupController.showPopupAtBounds`. Bypassing it fails 3 tests.
- The font-family comes from `getComputedStyle(host.hostElement)` — **the chart element**, which is the only reason the exporter is handed it. Measuring the exporter or the cloned SVG still type checks and still yields a font-family, just the wrong one. Fails 5 tests.

`test/component/svg-export.test.ts` holds 61 characterization tests. Several pin behaviour that is arguably wrong and was deliberately left alone: only the `<svg>` subtree is cloned, so the shadow root's `<style>` is dropped and `font-family` is the *only* style that reaches the file; lit-html binding marker comments ship inside it; `downloadSvg('')` produces `.svg`; a non-string filename throws a raw `TypeError`; and the width/height guard is `!hasWidth || !hasHeight` while the body sets both.

**Extracted responsibilities**: six modules hold what `BaseChart` used to do — `color-resolver.ts`, `keyboard-nav-controller.ts`, `chart-logger.ts`, `popup-controller.ts`, `svg-exporter.ts`, `text-measurer.ts`. Each takes a narrow `XHost` interface and is built by `BaseChart` with an **explicit adapter object, never `this`** (several members are private/protected and widening them would enlarge the API the extraction shrinks). `BaseChart` keeps thin delegations so subclasses and tests are unaffected.

**When extracting another one, three hazards, all invisible to the type system:**
1. **Dispatch** — moving a method severs every override of it. Route calls back through the host.
2. **Receiver** — `getComputedStyle(this)` means the *chart*; moved verbatim, `this` becomes the controller. Same code, wrong object.
3. **Reactivity** — `@state()` fields re-render automatically; plain fields do not. Every mutation needs `host.requestUpdate()`, and `@state()` with `useDefineForClassFields:false` installs prototype accessors, so replacing them with plain fields silently stops scheduling renders.

Always write characterization tests **first** and commit them separately. Across six extractions, roughly one initial expectation in eight turned out to be wrong.

**Chart type hooks**: `getAnimatableChartType()` is `protected abstract` — a new chart type will not compile without it. It used to sniff `this.tagName`, which failed silently. `isHorizontalChart()` and `getEmptyStateDiagnostic()` are the other per-type hooks; implement all three.

**Colour System**: Lives in `src/color-resolver.ts`, not `BaseChart`. `ColorResolver` owns palette lookup, contrast, and the priority between an element's own colour, a matched palette entry, a positional palette colour, and a generated fallback.

`BaseChart` holds it behind a lazy `colors` getter and its existing `protected` methods delegate, so subclasses call exactly what they always did. It is constructed with an explicit `ColorHost` adapter rather than `this`, because `log` and `getMeasureContext` are not public and widening them would enlarge the API the extraction exists to shrink. The adapter uses getters so values stay live.

**One seam is deliberate:** `BaseChart.getContrastingTextColor()` routes through `this.getLuminance()` and then `colors.contrastForLuminance()`, rather than calling the resolver directly — so a subclass overriding `getLuminance` still changes the contrast decision, as it did before. An existing test caught that when the first version of the extraction removed it.

Pattern registration and `<defs>` rendering stayed in `BaseChart`: a separate responsibility that merely lived in the same region. `test/component/color-resolution.test.ts` holds 42 characterization tests pinning colour behaviour — treat a change there as a behaviour change, not a refactor detail.

**Empty-state diagnostics**: DC001/DC002 are emitted from `BaseChart`'s empty-state path via the `getEmptyStateDiagnostic()` hook, **not** from `renderChart()`. Adding the placeholder once made both codes unreachable, because the placeholder replaces `renderChart()` entirely — a chart could be empty for the wrong reason and say nothing. Any new chart type must implement the hook or it will be silently undiagnosable.

**Empty & Loading States**: `BaseChart.renderPlaceholder()` returns a placeholder instead of the plot when `loading` is set or `getDataElementCount()` is 0. `render()` then skips `renderChart()` *and* the focus indicator, and drops `tabindex` to -1 — axes, grid and legend all describe data, so drawing them around nothing is noise. The title is deliberately kept.

`getDataElementCount()` defaults to the focusable count, but **`Chart` must override it**: areas are not focusable, so an area-only chart would otherwise report as empty. Any new chart type whose data is not all focusable needs the same override.

`<dc-empty>` supplies the message and follows the `<dc-title>` pattern — extends `BaseChartElement`, renders nothing, exposes a `text` getter over its light-DOM content. Keeping the text in markup means the page's own renderer translates it.

The skeleton uses a **fixed** height pattern, not random: a skeleton that reshuffles every frame is a distraction and would break visual snapshots.

**Bar Layout**: `computeBarLayout()` in `chart.ts` is the single source of bar positions. It walks the structure once and returns `{ slots, units }` — each bar's `start`/`size`/`center` along the category axis, and each unit's true extent for centring group labels.

It is **orientation-agnostic**: the traversal only ever moves along the category axis, so `start`/`size` are x/width vertically and y/height horizontally. The value axis is the caller's business.

**Do not reintroduce a local walk.** This logic previously existed as six copies — two drawing bars, two placing category labels, two placing group labels — and they had drifted. The label copies lacked the `allBarsHaveWidth` branch, so a group with differing bar widths drew labels from the group average (15 units off); the group-label copies ignored gutters entirely. Both bugs were invisible to the visual baselines because the grouped fixture uses auto-width bars, where every version agrees. `test/component/bar-layout.test.ts` pins it with differing widths in both orientations.

**Missing Values**: `<dc-point>` overrides `value` with `optionalNumberConverter`, defaulting to **NaN** rather than 0, so "no data" stays distinguishable from a real zero. `<dc-line>`/`<dc-area>` take `missing="gap"` (default) | `"skip"` | `"zero"`.

The policy is resolved **once**, in `getLines()`/`getAreas()`, which set a `missing: boolean` on each point. Downstream code tests that flag rather than re-checking `Number.isFinite` — keep it that way, or the two will drift.

**Anything that consumes point values must be NaN-safe.** A single NaN poisons `Math.max`/`Math.min` and takes the whole axis with it. Already guarded: the line/area range calculations, `getAllValues()`, stacked maximums, the focusable total, and `getInsights()` (which otherwise announces "highest at undefined (NaN)" to screen readers).

Rendering splits at gaps via `splitAtGaps()`, shared by `generatePathData()` and `generateAreaPath()`. Each run is fitted **independently** — a spline fitted across a gap overshoots and corrupts the segments on both sides.

Note that lines, single areas, and stacked areas are three separate render paths, each with its own markers and label pass. A fix to one is not a fix to the others: the area top-edge stroke, area point markers, and the stacked-area label pass each leaked NaN after the line path was already correct. `test/component/missing-values.test.ts` asserts on rendered output, not just path data, for exactly this reason.

**Text Scaling**: `text-scaling="proportional"` (default) | `"fixed"`. A viewBox scales text along with everything else, so the same chart shows 4.7px axis labels at 300px wide and 21.2px at 1200px. `fixed` mode reinterprets font sizes as CSS pixels.

`BaseChart` tracks rendered width with a `ResizeObserver` and exposes `fontScale` (viewBox units per CSS px, 1 when proportional) and `fontSize(nominal)`.

**The invariant: any font size passed to `measureText()` must be the same value emitted as the `font-size` attribute.** `measureText(text, f)` returns a width in units of `f`, so passing the nominal size to one and the scaled size to the other silently mis-fits every label. Both go through `this.fontSize(x)`.

`<dc-title>` and `<dc-legend>` compute their own sizes, so `BaseChart` assigns them a `fontScale` property immediately before measuring or rendering — see `renderTitle()`, `getTitleDimensions()`, and the two `legend.*` call sites.

Note `measureText()` is **not** unit-confused, despite what an earlier draft of REVIEW.md claimed: it returns viewBox units, because text width and font size scale together and the px/unit factors cancel. Verified in Chromium (197.86 canvas vs 197.87 `getBBox`). Do not "fix" it.

**Container Fit**: `fit="aspect"` (default) | `"fill"`. A viewBox locks the chart to its authored `width:height`, so a 600×400 chart in an 800×200 tile overflows. Under `fill`, `applyFit()` recomputes the **layout height** from the container's measured aspect — `width` is deliberately left alone because it is the coordinate scale, and changing it would move every percentage padding and font size.

It works by assigning `this.height` rather than threading a separate layout height through the ~55 places that read it, so every existing and future calculation is correct by default. The authored value is kept in `authoredHeight` and restored if fill mode is switched off.

This settles rather than oscillates: with an auto-height container the measured aspect already equals the viewBox aspect, so the computed height is the one in use and nothing changes. Two consequences worth knowing — `fill` is correctly a no-op when there is no definite height to fill (including `display:grid` with no `grid-template-rows`, whose row is content-sized), and it can never produce a zero-height chart.

**CSS Hooks (`::part` and `--dc-*`)**: Two complementary layers, documented in **API.md → Styling with CSS**.

- **Custom properties** are declared in `BaseChart.static styles` as `var(--dc-name, fallback)`. They inherit through the shadow boundary, which is what lets a page theme every chart at once. Add new ones the same way — a token with a fallback, never a bare `var()`.
  - `--dc-font-family` is set on the `<svg>`, **not** on `<text>`. Presentation attributes beat *inherited* values, so an explicit `font-family` on `<dc-title>` still wins.
  - Do **not** tokenize `fill` on the `<svg>`: fill is inherited in SVG, so it would tint every shape lacking an explicit fill, not just text.
- **Parts** are stamped after render by `BaseChart.applyShadowParts()`, driven by `getShadowParts()` (selector → part name). Override it in a chart type and spread `...super.getShadowParts()`. Done post-render rather than in ~50 templates because a selector map is auditable in one place; Lit does not manage `part`, so re-stamping is safe — the same approach as `applyPassthroughAttributes()`.
  - Shapes sharing a tag need a discriminator: points and bubbles are both circles, so bubbles carry `class="bubble-shape"` and point markers are wrapped in `<g class="point-marker">` (point markers can render as any of several shapes, so the wrapper is their only stable hook).
  - **Part names are a public contract** — renaming one breaks consumer CSS. `test/component/shadow-parts.test.ts` guards them.

**Events**: Charts emit `dc-click`, `dc-mouseenter`, `dc-mouseleave` (payload `ChartInteractionDetail`) and `dc-render` (`ChartRenderDetail`). Emitted via `BaseChart.emitInteraction()`, which dispatches from the *authored* element (`<dc-bar>`) when one is available so consumers can listen on it directly; those are light-DOM children, so the event still bubbles to the chart. `composed: true` is required — without it the event dies at the shadow boundary.

`dc-click` is cancelable; `emitInteraction()` returns `false` when cancelled and the caller must skip its default behaviour, which also calls `preventDefault()` on the originating MouseEvent to stop `href` navigation. Each chart builds its payload in a small `*Detail()` helper (`barDetail`, `sliceDetail`, `stageDetail`, …) — add one when adding a chart type. `percent` is a **decimal** (0.25 = 25%), matching the library's percent convention, and `null` rather than 0 when a share is undefined. Event names are declared on `HTMLElementEventMap` in `base-chart.ts` so consumers get a typed `detail` without a cast.

**Child Reactivity**: `BaseChart` watches its own light-DOM subtree with a `MutationObserver` (`observeChildren()`), so any change to child elements — attributes, `hidden`, additions, removals, text content, innerHTML swaps — triggers a re-render. Callers never need `requestUpdate()` for markup changes.

Two constraints when working on this:
- The observer ignores records whose `target` is the chart itself; the chart's own attributes belong to Lit, and reacting to them would loop on anything set during a render (e.g. `data-chart-type` in `connectedCallback`).
- **Never mutate light-DOM children from render or `updated()`.** That would feed the observer and loop. Writing to the shadow DOM is fine — `applyPassthroughAttributes()` does exactly that.

In tests, `elementUpdated()` yields to a macrotask before awaiting `updateComplete`, because observer records arrive after `updateComplete` would otherwise resolve. Do not "simplify" it back to a bare `await updateComplete` — mutation tests will pass against broken behaviour.

**Logging**: `this.log(level, path, message, value?)` records calculations. `logging` defaults to `'warning'` and `console-log` to `'warning'`, so **warnings and errors reach the browser console by default**; verbose `info` derivation logging still requires opting in.

Both previously defaulted to off, which meant the entire DC### system produced no output unless a developer already suspected a problem. That is how the documented palette list came to name 18 palettes that do not exist, with 44 references to them in the shipped examples: an unknown `palette` falls back to generated colours, so nothing could contradict the docs. **Silent misconfiguration is the worst failure mode for a declarative API, because the markup looks right.**

Console echo is deduplicated per element for the element's lifetime — one misconfiguration is often reached from several code paths, and charts re-render. Every entry is still captured for `<dc-log-console>`; only the echo is deduplicated.

`getConsoleIdentifier()` is wrapped in try/catch: the label is cosmetic, and now that echo is on by default a throw there would take the render with it.

The implementation lives in `src/chart-logger.ts`, not `BaseChart`. `ChartLogger` owns the captured entries, both level filters, the console group, the echo dedup set and `logError()`'s placeholder substitution. `BaseChart` holds it behind a lazy `logger` getter, built with an explicit `ChartLoggerHost` adapter, and every member that existed before — `log()`, `logError()`, `clearLog()`, the public `getLogEntries()`, the protected `logEntries` accessor, and the private `shouldLog()`/`shouldEchoToConsole()`/`getConsoleIdentifier()` — delegates to it, so nothing else in the codebase changed.

Four things a future contributor must not undo:

- `logError()` dispatches through **`host.log()`**, not the logger's own `log()`. `BaseChart.log()` is a protected extension point that subclasses and test spies override; calling the logger's copy severs every one of them silently. Same for `getConsoleIdentifier()`, which reads the title through **`host.getTitle()`**.
- `shouldLog()`, `shouldEchoToConsole()` and `getConsoleIdentifier()` also round-trip through the host — logger → host → `BaseChart`'s private method → logger. It looks redundant and is not: it keeps those three the live path rather than leaving vestigial methods that no longer decide anything, and it is the same shape `KeyboardNavHost` uses for `focusElement`.
- `BaseChart.getConsoleIdentifier()` has a try/catch of its own *around the delegation*, separate from the one inside `ChartLogger`. Reaching the logger needs a real chart instance, so borrowing the method off the prototype is what throws. A test pins `Chart.prototype.getConsoleIdentifier.call({}) === 'chart'`.
- `clearLog()` **replaces** the entries array rather than emptying it, because `getLogEntries()` hands the live array out and `<dc-log-console>` holds what it was given.

`test/component/logging.test.ts` holds 89 characterization tests pinning all of this — including several behaviours that are arguably wrong (the dedup key ignores `value`; the console group is closed by the *next* render; an unrecognised `logging` value silently disables capture). Treat a change there as a behaviour change, not a refactor detail.

**Error Handling**: Use structured error codes for all warnings and errors. See [Error Handling System](#error-handling-system) section below.

**Accessibility**: Charts auto-generate ARIA attributes. Implement `getInsights()` for descriptions. Use utilities from `src/accessibility/insights.ts`.

**Keyboard Navigation**: Roving tabindex pattern. Implement `getFocusableElements()`, `getShapeBounds()`, `renderFocusIndicator()`.

**Time Axes**: `<dc-axis type="time">` positions points by date instead of by index, and labels
the axis with round tick dates rather than one label per datapoint.

The pieces live in `axis-chart.ts` (`getTimeScale`, `getTimeXForLabel`, `parseTimeScale`,
`renderTimeAxisLabels`) over the parsers in `date-utils.ts`. **All of it existed and none of it
was called** until the dead-attribute sweep found `type="time"` doing nothing — so the feature was
documented, exampled and visually baselined while rendering raw strings spaced evenly.

Three things to preserve:

- `getTimeScale()` is **cached per render**. It parses every category label and is reached from
  inside per-point render loops; uncached it is the same quadratic shape `getChartPadding` once
  had. `getTimeDateForLabel()` memoizes per distinct label so shared dates parse once.
- **Bars decline a time scale.** `hasCategorySlots()` returns true for a chart with bars, because
  bars occupy fixed slots and date-positioned ticks would land where no bar is. Any new
  slot-based chart type should override it the same way.
- A time scale that cannot be built — too few parseable dates — returns null and falls back to
  category labels, having logged `DC106`. Failing soft matters here: a mistyped date should not
  blank the axis.

`test/visual/charts.spec.ts` has **two** time-axis fixtures. The evenly-spaced one cannot detect
whether positioning works at all, since weekly samples look the same placed by date or by index;
`time-axis-uneven` exists so the baseline can see the difference.

**Negative Values**: Bar, line, and bubble charts support negative values. The `ValueRange` interface tracks `{ min, max, zeroPosition, hasNegatives, hasPositives }`. For all-negative vertical charts, the category axis renders at top (where zero is). Use `getNiceRange()` for axis calculations.

**Number Formatting**: All numeric values (labels, axes, legends, popups) use the formatting system in `src/format.ts`.

Format inheritance: element `value-format` → legend/axis `value-format` → chart `value-format` → default.

```html
<!-- Named presets with optional argument -->
<dc-chart value-format="currency USD">           <!-- $1,234.56 -->
<dc-chart value-format="currency USD compact">   <!-- $1.2M (compact currency) -->
<dc-chart value-format="currency EUR compact 1"> <!-- €1M (1 sig digit) -->
<dc-chart value-format="number 2">               <!-- 1,234.56 -->
<dc-chart value-format="number 0">               <!-- 1,235 (integers) -->
<dc-chart value-format="compact 1">              <!-- 1.2M -->
<dc-chart value-format="percent 0">              <!-- 46% -->

<!-- d3-format subset -->
<dc-chart value-format="$,.2f">                  <!-- $1,234.56 -->
<dc-chart value-format=".1s">                    <!-- 1.2M -->

<!-- Override at axis, legend, or element level -->
<dc-axis position="left" value-format="compact 1"></dc-axis>
<dc-legend value-format="currency USD" percent-format="percent 0"></dc-legend>
<dc-bar value="0.38" value-format="percent 0"></dc-bar>
```

**⚠️ Percent Convention**: Percent values are passed as decimals (0.38 → "38%"). The formatter multiplies by 100.

In code:
- `this.formatValue(value, elementFormat?)` - formats a value using element override or chart default
- `this.formatPercent(decimal, elementFormat?)` - formats a percentage (input as decimal)
- `this.getFormatter()` - returns cached `NumberFormatter` instance

When rendering labels, always use `formatValueString()` which handles show-value/show-percent logic and applies element-level format overrides.

## Error Handling System

The library uses structured error codes for consistent warning and error messages. All warnings should use the error code system defined in `src/errors.ts`.

### Error Code Categories

| Range | Category | Description |
|-------|----------|-------------|
| DC001-DC099 | Data Errors | Empty charts, invalid values, all hidden |
| DC100-DC199 | Configuration Errors | Invalid attributes, missing children |
| DC200-DC299 | Reference Errors | Palette/pattern/element not found |
| DC300-DC399 | Style Warnings | CSS conventions used instead of SVG |
| DC400-DC499 | Informational | Suboptimal but functional configurations |

### Using Error Codes

**Preferred method - `this.logError()`:**
```typescript
import { ErrorCode } from './errors.js';

// In a chart class method:
this.logError(ErrorCode.DATA_EMPTY, {
  chartType: 'Pie chart',
  expectedElements: 'dc-pie-slice children'
});

// With an optional value parameter:
this.logError(ErrorCode.DATA_NEGATIVE_VALUES, {
  count: negativeStages.length,
  elementType: 'stage',
  labels: negativeStages.map(s => s.label).join(', ')
}, negativeStages.map(s => s.label));
```

**For standalone functions (outside chart classes):**
```typescript
import { ErrorCode } from './errors.js';

console.warn(`[${ErrorCode.FORMAT_INVALID.code}] ${ErrorCode.FORMAT_INVALID.path}: Invalid format string: "${format}", using default`);
```

### Adding New Error Codes

When adding new warnings or errors:

1. **Add to `src/errors.ts`** with appropriate code number and category
2. **Use descriptive message templates** with `{placeholders}` for dynamic values
3. **Set the default log path** matching the existing path conventions
4. **Update this list** if adding a new category

```typescript
// In src/errors.ts
export const ErrorCode = {
  // ... existing codes ...

  /**
   * Description of what this error means
   */
  MY_NEW_ERROR: {
    code: 'DC1XX',
    level: 'warning',
    path: 'category.subcategory',
    message: '{count} {elementType}(s) have issues: {details}'
  }
} as const;
```

### Current Error Codes

| Code | Name | Description |
|------|------|-------------|
| DC001 | DATA_EMPTY | Chart has no data elements |
| DC002 | DATA_ALL_HIDDEN | All data elements are hidden |
| DC003 | DATA_ZERO_TOTAL | Total of all values is zero |
| DC004 | DATA_INVALID_VALUES | Elements have zero/negative values |
| DC005 | DATA_ZERO_BARS | Bars have value 0 |
| DC006 | DATA_NEGATIVE_VALUES | Elements have negative values |
| DC101 | LINE_NO_POINTS | Line element has no points |
| DC102 | AREA_NO_POINTS | Area element has no points |
| DC103 | DONUT_INVALID_RADIUS | Invalid inner radius for donut |
| DC104 | PARSE_ERROR | Could not parse attribute value |
| DC105 | FORMAT_INVALID | Invalid format string |
| DC106 | TIME_AXIS_FEW_DATES | Time axis has insufficient dates |
| DC107 | BAR_SPACE_EXHAUSTED | Too many bars for plot width; gutters compressed |
| DC108 | EXPORT_FILENAME_INVALID | downloadSvg() filename was unusable and was adjusted |
| DC109 | LOG_LEVEL_INVALID | Unrecognised logging/console-log value; default used |
| DC201 | PALETTE_NOT_FOUND | Palette not found |
| DC202 | PATTERN_NOT_FOUND | Pattern not found or invalid |
| DC203 | ZERO_FILL_NOT_FOUND | Zero-fill element not found |
| DC204 | SVG_NOT_FOUND | SVG element not found in shadow DOM |
| DC301 | TITLE_STYLE_WARNING | CSS attribute on title |
| DC302 | LEGEND_STYLE_WARNING | CSS attribute on legend |
| DC303 | AXIS_STYLE_WARNING | CSS attribute on axis |
| DC401 | COLORS_UNIFORM | All elements have same color |

## Development Workflow

### Adding a New Chart Type

1. Create file in `src/`, extend `AxisChart` (has axes) or `BaseChart` (no axes)
2. For `AxisChart`: implement `getMaxValue()`, `getMinValue()`, `getAllValues()`, `getCategoryLabels()`, `getAxisLabelPadding()`
3. Implement `renderChart(): SVGTemplateResult`
4. Use `this.getChartPadding()` for positioning
5. Implement: logging, auto-popup, `getLegendItems()`, `getInsights()`, keyboard navigation
6. **Use formatting system for all numeric display:**
   - Labels: use `formatValueString(value, percent, showValue, showPercent, elementFormat)`
   - Insights: pass `this.formatValue` to insight functions
   - Extract `valueFormat` from data elements and pass through data structures
7. **Use error code system for all warnings:**
   - Import `ErrorCode` from `./errors.js`
   - Use `this.logError()` for data validation, configuration issues
   - Add new error codes to `src/errors.ts` if needed (see [Error Handling System](#error-handling-system))
8. Export from `src/index.ts`
9. Document in `API.md` and add examples to `examples/`

### Adding a New Data Element

1. Extend `BaseFilledShape` (fill-based shapes) or `BaseChartElement` (stroke-only like lines)
2. Add `@property()` decorated properties
3. Common properties inherited: `value`, `showValue`, `showPercent`, `showLabel`, `valueFormat`
4. Export from `src/index.ts`

For shapes: parent chart must capture passthrough attrs, add `data-shape-index`, call `applyPassthroughAttributes()`.

### Legend Items

- **`ValuedLegendItem`**: For discrete quantities (bars, slices). Has `value`, optional percentage.
- **`DimensionlessLegendItem`**: For trends (lines). Set `dimensionless: true`.

Shapes: `'square'` (bars), `'line'` (lines), `'circle'` (bubbles).

### Padding System

CSS-style padding with auto-calculation from chrome elements:

```html
<dc-chart padding="60">          <!-- 60px all sides -->
<dc-chart padding="10% 15%">     <!-- percentage -->
<dc-chart padding-left="80">     <!-- individual side -->
```

In code: `const padding = this.getChartPadding()` returns viewBox units.

### Axis Configuration

```html
<dc-chart>
  <dc-axis position="bottom" label-interval="2" label-lines="2"></dc-axis>
  <dc-axis position="left"><dc-title>Revenue ($)</dc-title></dc-axis>
</dc-chart>
```

- `label-interval`: `"auto"` | `"1"` | `"2"` etc. - which labels to show
- `label-lines`: `"1"` | `"2"` | `"auto"` - stagger labels across lines

### Text Measurement

Always use `this.measureText(text, fontSize)` for text widths. Never estimate with character count.

## Testing

Tests use **Vitest** and **Playwright** with three environments:
- **Unit tests** (`test/unit/`): Node environment, pure functions
- **Component tests** (`test/component/`): happy-dom environment, DOM-dependent code
- **Integration tests** (`test/integration/`): happy-dom environment, dynamic updates
- **Visual tests** (`test/visual/`): Playwright + Chromium, screenshot comparison

### Commands

```bash
npm test              # Run unit/component/integration tests in watch mode
npm run test:run      # Run unit/component/integration tests once
npm run test:coverage # Run tests with coverage report
npm run test:visual   # Run visual regression tests
npm run test:visual:update  # Update visual test baselines
npm run bench         # Render-performance harness (requires `npm run dev` running)
npm run test:package  # Validate built artifacts through a real bundler (run after `npm run build`)
```

### Package Smoke Test

`npm run test:package` is the only test that exercises the **published** package rather than the
source, and it exists because two defects were invisible to everything else in the repo:

- `"sideEffects": false` on a package whose whole job is `customElements.define` let bundlers
  delete `import 'declarative-charts'` entirely — esbuild produced a 0-byte bundle. Vite's dev
  server does not tree-shake, so every example page and test still worked.
- Lit was inlined into the bundler-facing build *and* declared a runtime dependency, giving
  consumers two copies of `ReactiveElement`.

It resolves the package through a real `node_modules` junction (importing `dist/` by relative
path would skip `sideEffects` and make the test meaningless), bundles with esbuild, and asserts
the element registrations survive. Add a case here whenever you change `exports`, `sideEffects`,
`files`, externals, or the artifact layout — none of which any other test covers.

**Three build artifacts, deliberately:**

| artifact | lit | consumed by |
|---|---|---|
| `declarative-charts.js` | external (peer dep) | bundlers |
| `declarative-charts.standalone.js` | inlined | CDN, `unpkg`/`jsdelivr`, `./standalone` export |
| `declarative-charts.umd.cjs` | inlined | `<script src>`, `require()` |

`vite.config.ts` builds the first; `vite.config.standalone.ts` builds the other two with
`emptyOutDir: false`. Do not externalize lit from the standalone builds — a
`<script type="module">` cannot resolve a bare `import 'lit'` specifier.

### Performance Harness

`npm run bench` measures how render cost scales with datapoint count and probes for layout
degeneracies. It needs the dev server running in another terminal.

```bash
npm run bench                      # scaling curve (bar + line) + bar-width probe
npm run bench -- --probe           # degeneracy probe only (fast; exits 1 on failure)
npm run bench -- --type=line --sizes=50,100,250
npm run bench -- --url=http://localhost:4173/test/visual/fixtures/bench.html  # preview build
```

Harness: `test/visual/bench.mjs` (driver) + `test/visual/fixtures/bench.html` (page, exposes
`window.runBench(type, n)`).

**Both failures this harness was written to expose are fixed** (`REVIEW.md` §3.4, §3.5).
Re-measured, not assumed:

- Render cost is now roughly linear — **1.5–1.6x for 2x the data**, where it was quadratic.
  1,000 bars render in ~550ms against 44,562ms before the per-render caching went in.
- Bar width no longer crosses zero. Past the point where bars would go negative it clamps at 1
  unit and every `<rect>` still paints; the probe confirms 0 negative widths up to n=200, and
  `DC107` reports the compressed gutters.

Run it after any change to the render pipeline or to bar layout — those are the two places a
regression here would come from.

Use a fresh browser context per size when adding cases — sharing a page lets a slow run bleed
into the next measurement.

### Coverage

**86.5% statements overall.** Run `npm run test:coverage` for current numbers; the figures below
were measured, not estimated.

This table used to count only `test/unit/` and was unaware of the much larger `test/component/`
suite, so it understated most files by 4-12x — `chart-palette.ts` was listed at 8% while actually
at 100%. As written it would have sent a contributor to duplicate thousands of lines of tests that
already existed. **If you update it, measure.**

**Well covered** (>90% statements): every data element (`chart-bar`, `chart-line`, `chart-area`,
`chart-point`, `chart-bubble`, `chart-stage`, `chart-pie-slice`, `chart-bar-segment`,
`chart-funnel-stage`) at 100%, plus `errors.ts`, `patterns.ts`, `chart-fill.ts`, `chart-title.ts`,
`chart-popup.ts`, `chart-palette.ts`, `stage-layout.ts`, and all four extracted controllers
(`chart-logger`, `popup-controller`, `keyboard-nav-controller`, `svg-exporter`). Then
`format.ts` 98.7%, `converters.ts` 98.2%, `chart-utils.ts` 96.3%, `chart-legend.ts` 95.5%,
`chart-grid.ts` 94.7%, `color-resolver.ts` 93.8%, `funnel-chart.ts` / `pie-chart.ts` 93%,
`chart-axis.ts` 92.4%, `builtin-palettes.ts` 91.4%, `chart-swatch.ts` 91.0%.

**The large files sit in the mid-80s**, which is respectable for their size: `chart.ts` 86.4%,
`axis-chart.ts` 85.7%, `base-chart.ts` 85.0%. The structural criticisms in REVIEW.md §5 are
maintainability arguments, not coverage ones.

**Overall statements: 91.4%.** The files that were thin have been covered:
`log-console.ts` 0% → 96%, `chart-legend-item.ts` 0% → 100%, `animation.ts` 36% → 94%,
`stage-chart.ts` 73% → 88%. Each round of characterizing untested code turned up real defects,
which is the usual return — see CHANGELOG.

**A palette's `<dc-fill>` paints the shapes it matches.** Its `fill-opacity`, `fill-rule` and
`stroke-*` attributes are collected by `ChartFill.getPaintAttributes()`, resolved per element by
`BaseChart.getPalettePaint()` **at extraction time**, and stamped after render by
`applyPassthroughAttributes()`. Extraction time matters: that is the array the stamping pass walks,
and resolving during layout instead leaves the attributes nowhere the stamp can see them. The
element's own attribute wins over the palette's, and an element with its own `fill` opts out.

**⚠️ Every declared attribute must change something.**
`test/component/no-dead-attributes.test.ts` renders each element twice, with and without each
attribute, and fails if the output is byte-identical. It exists because ten attributes have now
been found declared, documented, and wired to nothing — `bar-color`, `fill-colors`,
`stroke-colors`, `stroke-color`, `fill-color`, `show-label` on `<dc-chart>`, and
`pattern`/`stroke-dasharray` on `<dc-legend-item>`. Each parsed fine, appeared in API.md, and did
nothing.

`api-docs.test.ts` cannot catch this class: it only compares the docs against the declarations,
and a dead attribute is present in both.

Three lists in that file carry the exceptions, and all three are printed on every run so they
cannot quietly grow:

| List | Meaning |
|---|---|
| `KNOWN_DEAD` | Confirmed unread. **These are open bugs**, and the list is currently empty. A test fails if an entry starts working, so it cannot rot |
| `NEEDS_CONTEXT` | The attribute *is* read; this test has not yet been given a context that reaches it. Currently empty |
| `NO_VISUAL_EFFECT` | Genuinely changes no rendered output — `logging`, `console-log`, `trigger`, and the two that need real layout (`fit`, `text-scaling`) |

When adding a `@property`, expect this test to demand either a rendering change or a line in one
of those lists with a reason.

`index.ts` reports 0% because it is re-exports only; nothing executes.

### ⚠️ REQUIRED: Update Tests When Modifying Covered Files

When modifying a file that has test coverage:

1. **Run existing tests first**: `npm run test:run`
2. **Update tests** if you change function signatures or behavior
3. **Add tests** for new functions or code paths
4. **Verify tests pass** before committing

### Adding Tests for New Code

When adding new utility functions or modules:

1. **Unit-testable code** = pure functions with minimal dependencies (no DOM, no Lit rendering)
2. Create test file at `test/unit/{filename}.test.ts`
3. Follow existing patterns in `format.test.ts` or `insights.test.ts`
4. Aim for >90% coverage on utility modules

**Good candidates for unit tests:**
- Calculation functions (scales, ranges, padding)
- Parsing functions (format strings, attributes)
- Data analysis functions (statistics, trends)
- Pure transformation functions

**Not suitable for unit tests (use component tests):**
- Lit component rendering
- DOM manipulation (querySelector, etc.)
- Event handlers

### Component Tests

Component tests run in happy-dom and can test DOM-dependent code:

```typescript
import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/chart-palette';
import { ChartPalette } from '../../src/chart-palette';

describe('ChartPalette component', () => {
  it('queries child elements', async () => {
    const palette = await fixture<ChartPalette>(
      'dc-palette',
      {},
      '<dc-fill fill="#ff0000" label="Red"></dc-fill>'
    );
    expect(palette.getFills()).toHaveLength(1);
  });
});
```

The setup file (`test/component/setup.ts`) provides:
- `fixture<T>(tagName, attributes, innerHTML)` - creates and mounts elements
- `elementUpdated(element)` - waits for Lit update cycle
- Canvas context mock for `measureText()`

### Integration Tests

Integration tests verify complete chart rendering scenarios and dynamic updates. They run in happy-dom and test:
- Adding/removing data elements dynamically
- Updating element attributes (values, colors, labels)
- htmx-style innerHTML swaps
- Chart attribute changes (dimensions, orientation)
- Hidden attribute toggling
- Mixed content (bars + lines)
- Negative value transitions

```typescript
import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated, queryShadowAll, simulateHtmxSwap } from './setup';
import '../../src/chart';
import { Chart } from '../../src/chart';

describe('Dynamic updates', () => {
  it('adds bars dynamically', async () => {
    const chart = await fixture<Chart>('dc-chart', {}, `
      <dc-bar value="50" label="A"></dc-bar>
    `);

    const newBar = document.createElement('dc-bar');
    newBar.setAttribute('value', '60');
    newBar.setAttribute('label', 'B');
    chart.appendChild(newBar);

    // No requestUpdate() — the chart observes its own children.
    // Adding one here would mask a regression in that observer.
    await elementUpdated(chart);

    const bars = queryShadowAll(chart, 'rect[data-shape-index]');
    expect(bars).toHaveLength(2);
  });
});
```

The integration setup (`test/integration/setup.ts`) provides:
- `simulateHtmxSwap(element, html)` - simulates htmx innerHTML replacement
- `createComplexChart(html)` - creates nested chart structures
- `queryShadow(element, selector)` - queries shadow DOM
- `queryShadowAll(element, selector)` - queries all matching shadow DOM elements
- `nextFrame()` - waits for animation frame

### Visual Regression Tests

Visual tests use Playwright to capture screenshots and compare against baselines:

```bash
npm run test:visual         # Run visual tests (compare against baselines)
npm run test:visual:update  # Update baseline snapshots
npm run test:visual:report  # View HTML report of last run
```

Tests are in `test/visual/charts.spec.ts`. Chart fixtures are in `test/visual/fixtures/charts.html`.

**Adding a new visual test:**
1. Add the chart configuration to `fixtures/charts.html` with a unique ID
2. Add a test case in `charts.spec.ts`:
```typescript
test('my new chart', async ({ page }) => {
  await page.goto(`${FIXTURES_URL}?chart=my-chart-id`);
  await waitForChartRender(page);
  const container = await getChartContainer(page, 'my-chart-id');
  await expect(container).toHaveScreenshot('my-chart-id.png');
});
```
3. Run `npm run test:visual:update` to generate the baseline

**Current coverage (23 tests):**
- Bar charts: basic, horizontal, negative, grouped, stacked
- Line charts: basic, multiple lines, time axis
- Area charts: basic, stacked, overlapping
- Bubble chart: basic
- Pie charts: basic, donut
- Funnel charts: basic, chevron
- Stage charts: basic, value-based sizing, zero handling
- Features: patterns, custom axis, legend at top, swatches

**⚠️ Never settle a visual test with `waitForTimeout()`.** Use `waitForChartRender(page)`, or
`waitForCustomElements()` + `waitForRendered()` for a fixture whose elements are not charts.

A sleep passes or fails on how loaded the machine is, which is exactly the difference between an
idle laptop and CI — and it hid a real defect for a long time. The suite's "wait for Lit updates"
step asserted `chart.updateComplete !== undefined`, which is true the instant an element upgrades
and never awaits anything, so all settling was really being done by a 100ms sleep that nobody had
reason to doubt.

`waitForRendered()` **loops** on `updateComplete` rather than awaiting it once. Lit resolves it to
`false` when a further update was scheduled while the last one ran, and these charts re-render
from a `MutationObserver` over their own light-DOM children — so one await is genuinely not
enough. It also awaits `document.fonts.ready`, because text metrics decide label layout.

Wait for the elements a *component* waits for, not just the one under test: `<dc-swatch>` defers a
`requestUpdate()` behind `customElements.whenDefined('dc-palette')` and a `requestAnimationFrame`,
so its test waits for `dc-palette` and `dc-fill` too.

### Test Syntax Quick Reference

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { myFunction } from '../../src/myModule';

describe('myFunction', () => {
  it('handles typical input', () => {
    expect(myFunction(input)).toBe(expectedOutput);
  });

  it('handles edge cases', () => {
    expect(myFunction(null)).toBe(defaultValue);
    expect(myFunction([])).toEqual([]);
  });
});
```

Common matchers: `toBe()` (exact), `toEqual()` (deep), `toMatch()` (regex), `toContain()`, `toBeCloseTo()` (floats), `toThrow()`.

## File Structure

```
README.md                   # Quick-start guide
API.md                      # Complete API reference
CHANGELOG.md                # Version history
ROADMAP.md                  # Planned features
LICENSE                     # MIT license

src/
├── base-chart.ts           # Abstract base (logging, accessibility, keyboard nav, formatting)
├── axis-chart.ts           # Abstract base for axis charts
├── base-chart-element.ts   # Abstract base for data elements (stroke, passthrough) [TESTED]
├── base-filled-shape.ts    # Abstract base for filled shapes (fill, pattern, value) [TESTED]
├── chart.ts                # <dc-chart> - bars/lines/bubbles
├── pie-chart.ts            # <dc-pie-chart>
├── funnel-chart.ts         # <dc-funnel-chart>
├── builtin-palettes.ts     # Built-in color palettes (category10, viridis, etc.) [TESTED]
├── errors.ts               # Error code registry and formatting utilities [TESTED]
├── format.ts               # NumberFormatter, presets, d3-format parsing [TESTED]
├── accessibility/          # Insight analysis utilities [TESTED]
├── chart-axis.ts           # <dc-axis> configuration [TESTED]
├── chart-palette.ts        # <dc-palette> container [TESTED]
├── chart-fill.ts           # <dc-fill> color/pattern definition [TESTED]
├── chart-legend.ts         # <dc-legend> legend rendering [TESTED]
├── chart-swatch.ts         # <dc-swatch> for displaying colors [TESTED]
├── chart-title.ts          # <dc-title> title rendering [TESTED]
├── patterns.ts             # SVG pattern definitions [TESTED]
├── chart-*.ts              # Other data elements
└── index.ts                # Exports

test/
├── unit/                   # Pure function tests (node environment)
│   ├── errors.test.ts      # Tests for src/errors.ts
│   ├── format.test.ts      # Tests for src/format.ts
│   ├── insights.test.ts    # Tests for src/accessibility/insights.ts
│   ├── patterns.test.ts    # Tests for src/patterns.ts
│   ├── builtin-palettes.test.ts # Tests for src/builtin-palettes.ts
│   ├── axis-scales.test.ts # Tests for axis scale calculations
│   ├── chart-fill.test.ts  # Tests for src/chart-fill.ts
│   ├── chart-legend.test.ts # Tests for src/chart-legend.ts
│   ├── chart-axis.test.ts  # Tests for src/chart-axis.ts
│   └── chart-palette.test.ts # Tests for src/chart-palette.ts
├── component/              # DOM-dependent tests (happy-dom environment)
│   ├── setup.ts            # Test setup with mocks
│   └── chart-palette.test.ts # Component tests for palette
├── integration/            # End-to-end chart rendering tests (happy-dom)
│   ├── setup.ts            # Integration test setup and helpers
│   ├── dynamic-updates.test.ts  # Dynamic element updates, value changes
│   └── htmx-integration.test.ts # htmx-style innerHTML swaps
└── visual/                 # Visual regression tests (Playwright + Chromium)
    ├── charts.spec.ts      # Screenshot comparison tests
    ├── fixtures/           # HTML fixtures for visual tests
    │   └── charts.html     # All chart configurations
    └── charts.spec.ts-snapshots/  # Baseline images (auto-generated)

examples/                   # Example pages (use examples.css, examples.js)
```

## TypeScript Configuration

- Target: ES2020, strict mode, experimental decorators
- `useDefineForClassFields: false` required for Lit

## Examples

See `examples/*.html`. Key examples:
- `colors.html` - Built-in palettes, custom palettes, element-level colors
- `formatting.html` - Number formatting presets, d3-format, locale, element-level overrides
- `accessibility.html` - ARIA, insights, keyboard navigation
- `patterns.html` - Pattern fills, high contrast mode

### ⚠️ REQUIRED: Example Page Structure

Example pages **must** follow this HTML structure for proper grid layout:

```html
<div class="example">
    <h2>Section Title</h2>
    <p>Section description...</p>
    <div class="grid">
        <div>
            <h3>Example Name</h3>
            <pre><code>&lt;dc-chart ...&gt;...&lt;/dc-chart&gt;</code></pre>
            <dc-chart width="500" height="350">...</dc-chart>
        </div>
        <div>
            <h3>Another Example</h3>
            <pre><code>...</code></pre>
            <dc-chart width="500" height="350">...</dc-chart>
        </div>
    </div>
</div>
```

**Critical rules:**
- Each `<div class="example">` groups related examples under one `<h2>`
- The `<div class="grid">` contains multiple `<div>` children displayed side-by-side
- Each grid child has: `<h3>` title, `<pre><code>` block, then the rendered chart
- `examples.js` wraps `<pre>` in `.code-wrapper` divs - structure must account for this
- Related examples go in ONE grid (e.g., Currency + Compact + d3-format together)
- Standard chart size: `width="500" height="350"`

**A chart shown without its markup is the one real violation.** The `<pre><code>` block is the
point of an example page — a reader who cannot see the markup that produced the picture has
learned nothing. Several pages had drifted into showing a chart alone.

Prose sections ("How It Works", "Color Priority", a screen-reader testing guide) legitimately sit
inside `.example` **without** a `.grid`, and should not be forced into one. The rule above is
about chart examples.

**Three tests guard the examples**, because nothing used to:

| Test | Catches |
|---|---|
| `test/visual/examples.spec.ts` | NaN geometry, charts rendering nothing, unexpected console output |
| `test/visual/example-code.spec.ts` | a `<pre><code>` block that disagrees with the chart beside it |
| `test/unit/examples-structure.test.ts` | boilerplate, nav reachability, `dist/` loads, duplicated CSS |

Add a page to `STARTS_EMPTY` or `DEMONSTRATES_DIAGNOSTICS` in the first if it is *meant* to render
nothing or emit DC warnings, and to `FRAGMENTS` in the third if it is an htmx fragment rather than
a page.

**The code block must match the chart.** This is the worst drift a page can carry because it is
invisible — the picture is right and the markup under it is wrong, so a reader who copies it gets
something else. `label-positioning.html` had 20 cells whose snippets omitted the `palette` and the
`<dc-title>` the charts actually had. A snippet may still abbreviate, but it has to *say* so: an
ellipsis, or a comment like `<!-- same bars -->`. Twenty-four bars do not need spelling out.

**Load the library the same way on every page:** `<script type="module" src="../src/index.ts">`.
Four pages once loaded `../dist/declarative-charts.standalone.js`, which is gitignored and never
committed, so they were blank on a fresh clone. Never reference `dist/` from an example.

**Charts inside one grid share a size.** Side-by-side cells exist to be compared, and different
dimensions make the comparison unfair and the row ragged. Across pages the size varies with the
chart type — stage and funnel charts are legitimately taller — so there is no single global
standard beyond `500x350` being the common default.

**Shared styling belongs in `examples.css`,** not in a page-local `<style>`. Page-local blocks are
for what is genuinely unique to a page — the `::part()` demo on `colors.html`, the palette cards
on `palettes.html`. `.note` was once declared byte-for-byte on three pages, and buttons were
styled on one page only.

**Required includes:**
- `<link rel="stylesheet" href="examples.css">`
- `<script src="examples.js"></script>` (at end of body)
- Two-tier nav: `.nav-major` (chart types) + `.nav-minor` (features)
