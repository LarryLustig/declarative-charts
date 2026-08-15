# CLAUDE.md

Working conventions for this repository, plus an index into where the
architecture is documented.

**This file states conventions, not facts.** Facts about the code — coverage
numbers, the palette list, the error-code table, the file tree — used to live
here and went stale four separate times, each time shipping a bug: 18 palettes
that did not exist, a `<dc-palette high-contrast>` override that was never
implemented, a `requestUpdate()` workaround that stopped being necessary, and a
coverage table understating files by 4–12× that would have sent someone to
duplicate tests that already existed. Derived facts belong in the code, or in a
command that regenerates them. Keep them out of here.

## Project Overview

A declarative chart library built with Lit (Web Components) and TypeScript.
Users create charts using HTML syntax instead of configuration objects.

**Chart types:**
- **Axis-based** (use `<dc-chart>`): Bar, Line, Bubble, Scatter — chart type determined by child elements
- **Non-axis** (own elements): Pie (`<dc-pie-chart>`), Funnel (`<dc-funnel-chart>`), Stage (`<dc-stage-chart>`), Radar (`<dc-radar-chart>`)

## Commands

```bash
npm run dev            # Vite dev server at localhost:5173
npm run build          # TypeScript + Vite build → dist/
npm test               # Tests in watch mode
npm run test:run       # Unit/component/integration tests once
npm run test:coverage  # Coverage report — the authority on coverage, not this file
npm run test:visual    # Playwright screenshot comparison
npm run test:visual:update
npm run test:package   # Validate built artifacts (run after `npm run build`)
npm run bench          # Render-performance harness (needs `npm run dev` running)
```

## Documentation

- **README.md** — quick start
- **API.md** — complete API reference
- **CHANGELOG.md** — version history, Keep a Changelog format
- **ROADMAP.md** — planned work and explicitly declined work
- **CONTRIBUTING.md** — local setup, and the release process
- **examples/** — live HTML examples

When adding a feature: update **API.md**, add an **examples/** case, and update
**CHANGELOG.md** under `[Unreleased]`.

**Always update CHANGELOG.md before each commit**, in the same commit as the
change it describes.

## Design Principles

### Follow web standards
- Prefer CSS over custom attributes for styling
- Match HTML/SVG attribute conventions (`fill`, `stroke`, `width`, `height`)
- Leverage native web APIs (computed styles, events, slots)

### SVG text styling
`<dc-title>` and `<dc-legend>` take SVG attributes, not CSS: `fill` not `color`,
unitless `font-size` (viewBox units). The library warns on the CSS spellings.

### Element references
Attributes referencing another element take a bare ID, matching `for=`, `list=`
and `aria-labelledby`: `palette="status"`, not `palette="#status"`. The one
exception is `<dc-log-console chart="#my-chart">`, which takes a CSS selector
because it monitors several charts.

### ⚠️ Percent convention
Percent values are **decimals**: `0.38` renders as `"38%"`. Matches
`Intl.NumberFormat` and d3-format.

### ⚠️ Element naming

| Chart type | Element | Why |
|---|---|---|
| Bar/Line/Bubble/Scatter | `<dc-chart>` | Share axis rendering |
| Pie | `<dc-pie-chart>` | No axes, radial |
| Funnel | `<dc-funnel-chart>` | No axes, chevron |
| Stage | `<dc-stage-chart>` | No axes, shape-based |
| Radar | `<dc-radar-chart>` | Polar axes with a radial scale |

**Never change `<dc-pie-chart>` to `<dc-chart>` or vice versa.**

## Architecture

Two structural seams, distinguished by whether a chart has a **scale**.
`<dc-chart>` (via `AxisChart`) and `<dc-radar-chart>` have domains with ticks;
pie, funnel and stage are proportional and map value straight to a size or
angle. If you add another non-cartesian scaled chart, reach for the pure helpers
in `chart-utils.ts`, not for `AxisChart`.

Six modules hold what `BaseChart` used to do — `color-resolver`,
`keyboard-nav-controller`, `chart-logger`, `popup-controller`, `svg-exporter`,
`text-measurer`. Each takes a narrow `XHost` interface and is built with an
explicit adapter object, never `this`.

### Where the invariants are written

Each of these is documented **at the code site it binds**, in that file's own
words. Read it there; do not restate it here, or the two will drift.

| Invariant | Stated at |
|---|---|
| Per-render caching is correctness, not optimisation — uncached derivations made rendering quadratic | `base-chart.ts` → `cachePerRender()` |
| `getLegendItems()` must not call the layout — the legend is sized inside `getChartPadding()`, so it recurses | `pie-chart.ts`, `radar-chart.ts` → `getLegendItems()` |
| Extraction hazard 1: moving a method severs every override; route calls back through the host | `popup-controller.ts`, `keyboard-nav-controller.ts`, `svg-exporter.ts` |
| Extraction hazard 2: `getComputedStyle(this)` means the *chart*; moved verbatim, `this` becomes the controller | `svg-exporter.ts`, `text-measurer.ts` |
| Extraction hazard 3: `@state()` re-renders, plain fields do not — every mutation needs `host.requestUpdate()` | `popup-controller.ts`, `keyboard-nav-controller.ts` |
| The MutationObserver must ignore records targeting the chart itself, or it loops | `base-chart.ts` → `observeChildren()` |
| Never mutate light-DOM children from `render()` or `updated()` — it feeds the observer | `base-chart.ts` → `applyPassthroughAttributes()` |
| `computeBarLayout()` is the single source of bar positions; do not reintroduce a local walk | `chart.ts` → `computeBarLayout()` |
| A font size passed to `measureText()` must be the one emitted as `font-size` | `base-chart.ts` → `fontSize()`, `text-measurer.ts` |
| `measureText()` returns viewBox units and is not unit-confused — do not "fix" it | `text-measurer.ts` |
| `applyFit()` changes height only; width is the coordinate scale | `base-chart.ts` → `applyFit()` |
| Missing-value policy is resolved once, in `getLines()`/`getAreas()`; downstream reads the flag | `chart.ts` |
| Anything consuming point values must be NaN-safe — one NaN takes the whole axis | `chart.ts`, `axis-chart.ts`, `accessibility/insights.ts` |
| Each run between gaps is fitted independently; a spline across a gap overshoots | `chart.ts` → `splitAtGaps()` |
| Every value label passes through one place — a render path emitting its own would escape collision handling | `chart.ts` → `renderDeferredLabels()` |
| Events need `composed: true` or they die at the shadow boundary; `dc-click` is cancelable | `base-chart.ts` → `emitInteraction()` |
| Palette paint is resolved at extraction time, because that is the array the stamping pass walks | `base-chart.ts` → `getPalettePaint()` |
| A time scale is cached per render and declined by charts with category slots | `axis-chart.ts` → `getTimeScale()`, `hasCategorySlots()` |
| SVG paint order is stacking order; regions go under the data, marks over it | `chart.ts` → `renderChart()` |
| Part names are a public contract | `base-chart.ts` → `getShadowParts()` |
| Bundler build keeps `@__PURE__`; the standalone is minified for the CDN | `build/minify-standalone.mjs` |
| Values interpolated into markup-parsing sinks must be escaped: pattern SVG strings and auto-popup HTML | `patterns.ts` → `escapeSvgAttribute()`, `chart-utils.ts` → `popupHtml()` |

**Chart type hooks.** `getAnimatableChartType()` is `protected abstract` — a new
chart type will not compile without it. `isHorizontalChart()` and
`getEmptyStateDiagnostic()` are the other per-type hooks; implement all three.
`getDataElementCount()` defaults to the focusable count, so any chart whose data
is not all focusable must override it.

**⚠️ Do not add a bulk-data attribute** (`values="[10,20,30]"`). Considered and
declined — see ROADMAP. Data living in markup as document structure is the
library's only differentiator, and per-element `fill`, `href`, `hx-*`
passthrough, popups, patterns and `hidden` cannot follow data into an attribute.
If a consumer needs to supply an array from JavaScript, a `.data` **property**
is the right shape. Build it when someone asks.

## Error Handling

Use structured codes for every warning and error. The registry is
`src/errors.ts` — **that file is the list**, do not mirror it here.

```typescript
import { ErrorCode } from './errors.js';

this.logError(ErrorCode.DATA_EMPTY, {
  chartType: 'Pie chart',
  expectedElements: 'dc-pie-slice children'
});
```

Outside a chart class, format by hand:

```typescript
console.warn(`[${ErrorCode.FORMAT_INVALID.code}] ${ErrorCode.FORMAT_INVALID.path}: …`);
```

Adding a code: append to `src/errors.ts` with a message template using
`{placeholders}`, a level, and a path matching the existing conventions. Ranges:
DC001–099 data, DC100–199 configuration, DC200–299 references, DC300–399 style,
DC400–499 informational. Document it in the API.md error table.

`logging` and `console-log` both default to `'warning'`, so warnings reach the
browser console. Silent misconfiguration is the worst failure mode for a
declarative API, because the markup looks right.

## Adding a New Chart Type

1. Extend `AxisChart` (has axes) or `BaseChart` (no axes)
2. For `AxisChart`: implement `getMaxValue()`, `getMinValue()`, `getAllValues()`, `getCategoryLabels()`, `getAxisLabelPadding()`
3. Implement `renderChart()`, and the three per-type hooks above
4. Position with `this.getChartPadding()`
5. Implement logging, auto-popup, `getLegendItems()`, `getInsights()`, keyboard navigation
6. Route every numeric display through the formatter — `formatValueString()` for labels, `this.formatValue` into insight functions
7. Use `this.logError()` for validation, adding codes to `src/errors.ts` as needed
8. Export from `src/index.ts`
9. Document in API.md, add an examples page, add a visual fixture

## Adding a New Data Element

1. Extend `BaseFilledShape` (fill-based) or `BaseChartElement` (stroke-only)
2. Add `@property()` declarations; `value`, `showValue`, `showPercent`, `showLabel`, `valueFormat` are inherited
3. Export from `src/index.ts`
4. For shapes: the parent chart must capture passthrough attributes, add `data-shape-index`, and call `applyPassthroughAttributes()`

**Legend items:** `ValuedLegendItem` for discrete quantities (bars, slices);
`DimensionlessLegendItem` for trends and clouds (lines, areas, scatter). Shapes
are `'square'`, `'line'`, `'circle'`.

**Text measurement:** always `this.measureText(text, fontSize)`. Never estimate
from character count.

## Testing

Four environments: `test/unit/` (node, no DOM), `test/component/` (happy-dom),
`test/integration/` (happy-dom), `test/visual/` (Playwright + Chromium).
Helpers live in each directory's `setup.ts`.

### Conventions that are easy to get wrong

- **Write characterization tests first, and commit them separately.** Across six
  extractions, roughly one initial expectation in eight turned out to be wrong.
- **Mutation-test every guard.** Break the thing it protects and confirm the
  test fails. Guards that pass either way have shipped here more than once.
- **Never settle a visual test with `waitForTimeout()`.** Use
  `waitForChartRender(page)`, or `waitForCustomElements()` + `waitForRendered()`.
  A sleep passes or fails on machine load, and one hid a real defect for a long
  time. `waitForRendered()` loops on `updateComplete` because Lit resolves it
  `false` when another update was scheduled mid-render — and these charts
  re-render from a MutationObserver over their own children.
- **`elementUpdated()` yields to a macrotask** before awaiting `updateComplete`,
  because observer records arrive later. Do not simplify it to a bare await;
  mutation tests will pass against broken behaviour.
- **Do not call `requestUpdate()` in tests** after changing markup. The chart
  observes its own children; adding one masks a regression in that observer.
- **Visual baselines allow 100 differing pixels**, absolute rather than a ratio.
  The old `maxDiffPixelRatio: 0.01` permitted 11,445 on a typical baseline and
  hid real changes three times. If an upgrade makes this noisy, raise it
  deliberately and record why in `playwright.config.ts` — do not go back to a
  ratio, which gives the largest charts the largest blind spot.
- **The Playwright suite is split.** `charts.spec.ts` compares screenshots and
  runs locally only — the baselines are `-chromium-win32` and no CI runner
  reproduces them. It is bound into `prepublishOnly` so a release cannot skip
  it. `npm run test:examples` (`examples.spec.ts`, `example-code.spec.ts`)
  asserts on the DOM rather than pixels, so it is platform-independent and runs
  in CI.
- **Never escape `<dc-popup>` content, always escape auto-popup content.** The
  first is markup the author wrote and means; the second the library builds from
  attributes, and `label` reached `.innerHTML` raw. Build it with
  ``popupHtml`…` `` — see `chart-utils.ts`.
- **⚠️ Every declared attribute must change something.**
  `test/component/no-dead-attributes.test.ts` renders each element with and
  without each attribute and fails on byte-identical output. Ten attributes have
  been found declared, documented, and wired to nothing. Adding a `@property`
  means either a rendering change or a line in one of its three exception lists,
  with a reason.
- **`test/package/smoke.mjs` is the only test that exercises the published
  package.** Add a case whenever you change `exports`, `sideEffects`, `files`,
  externals, or the artifact layout — nothing else covers them.

## Examples

Every page loads the library the same way: `<script type="module"
src="../src/index.ts">`. **Never reference `dist/` from an example** — it is
gitignored, and four pages were once blank on a fresh clone.

Structure for chart examples:

```html
<div class="example">
    <h2>Section Title</h2>
    <p>Description…</p>
    <div class="grid">
        <div>
            <h3>Example Name</h3>
            <pre><code>&lt;dc-chart …&gt;…&lt;/dc-chart&gt;</code></pre>
            <dc-chart width="500" height="350">…</dc-chart>
        </div>
    </div>
</div>
```

- **A chart shown without its markup is the one real violation.** The
  `<pre><code>` block is the point of the page.
- **The code block must match the chart.** This is the worst drift a page can
  carry, because the picture is right and the markup under it is wrong. A
  snippet may abbreviate, but it has to say so — an ellipsis or a
  `<!-- same bars -->` comment.
- Charts inside one grid share a size; `500x350` is the common default.
- Shared styling belongs in `examples.css`, not a page-local `<style>`.
- Prose sections legitimately sit in `.example` without a `.grid`.
- Required includes: `examples.css`, `examples.js`, and the two-tier nav.

Three tests guard the examples: `test/visual/examples.spec.ts` (NaN geometry,
empty charts, console output), `test/visual/example-code.spec.ts` (snippet
matches the chart), `test/unit/examples-structure.test.ts` (boilerplate, nav
reachability, no `dist/` references).

## TypeScript

Target ES2020, strict mode, experimental decorators.
**`useDefineForClassFields: false` is required for Lit** — `@state()` installs
prototype accessors, and turning this on silently stops renders being scheduled.
