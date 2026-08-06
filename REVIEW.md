# decl-charts — Project Review

*Conducted 2026-08-04, after a ~7-month pause (last commit 2026-01-02). Three independent
reviews — market/value, API design & DX, architecture & code health — consolidated, with
claims re-verified against the source.*

**Verdict: resume, but ship before you build. Do not continue the current roadmap.**

The engineering is well past the hard part: 20,677 lines of source, ~19,200 lines of tests,
`tsc --noEmit` clean under `strict` + `noUnusedLocals` + `noUnusedParameters`, only 4 `any`-ish
casts and 3 TODO markers across the whole codebase. Measured coverage is 83.5% statements /
76.3% branch. All 25 elements declare `HTMLElementTagNameMap` entries, so consumer-side
`querySelector('dc-bar')` types correctly — better than most web-component libraries manage.

What's missing isn't capability. It's that **nobody has ever run this code.** `git remote -v`
is empty. `package.json` still says `YOUR_USERNAME` and `your.email@example.com`. The npm name
`declarative-charts` returns 404 — free, never published. The CDN URL in `README.md:34` does
not resolve.

---

## 1. What this library actually is

### It does not depend on htmx

Worth stating plainly, because the market analysis over-rotated on this and it would be a
mistake to build the identity around it.

The only htmx-aware code in the entire library is three lines:

```ts
// src/base-chart.ts:2668-2670
// Notify htmx about new elements (if htmx is loaded)
if (typeof (window as any).htmx !== 'undefined') {
  (window as any).htmx.process(svg);
}
```

That is feature-detected and entirely optional. `htmx` appears nowhere in `package.json`.
Everything else — every other `htmx` string in `src/` — is JSDoc prose and examples.

The real mechanism is **`getPassthroughAttributes()`** (`src/base-chart-element.ts:196`): any
attribute the library doesn't recognise is copied onto the generated SVG shape. That is
library-agnostic by construction. It serves `hx-*`, but equally `data-*`, Alpine's `x-on:` /
`@click`, Livewire's `wire:`, Stimulus's `data-action`, plain `onclick`, or nothing at all.

**So the differentiator is not htmx. It is that a chart is ordinary HTML that any system
capable of emitting HTML can emit** — Django/Jinja, Rails ERB, Go `html/template`, Laravel
Blade, PHP, Hugo, a static file, or a JS framework's template. No JSON endpoint, no adapter,
no client-side data binding, no build step.

htmx is a *beachhead*, not the identity: a concentrated, reachable community with a documented
version of exactly this pain (the ecosystem's current answer is `transformResponse` extensions
that intercept and re-parse JSON on the way to Chart.js). Lead with it in outreach; do not
narrow the library's stated purpose to it. "Charts you can render from any server template"
is both broader and more honest than "charts for hypermedia apps," and it doesn't strand the
project if htmx's moment passes.

### Where it sits competitively

The useful axis is not "web component vs. JS library" — that's cosmetic. It's **where the data
lives**. On that axis there are only two designs, and almost everything is in the first one.

**Category A — one element (or one call) per *chart*; data is a serialized payload.**

```html
<google-chart data='[["Month","Days"],["Jan",31],["Feb",28]]'></google-chart>
<tc-line values="[12,10,12,11,7,6,8,10,12]"></tc-line>
```
```js
new Chart(ctx, { data: { labels: [...], datasets: [...] } });
```

These are the same design wearing different clothes. The data is an opaque blob the consumer
must serialize; the HTML is a mounting point. You cannot address an individual datapoint from
markup, attach a handler to one bar, or have a template emit a row without JSON-encoding it
first. Chart.js, ECharts, ApexCharts, Highcharts, Recharts, Vega-Lite, `@carbon/charts` (IBM,
active, 26 types, D3 + config objects), Chartkick (which wins by *hiding* the JSON, not
eliminating it), and both of the web-component options below all sit here.

- **`<google-chart>`** (`@google-web-components/google-chart`) — *not* Google Charts itself.
  Google Charts (the `gstatic.com/charts/loader.js` library) is alive and well: releases roughly
  every two months, no stated deprecation plans. `<google-chart>` is a thin **wrapper** around
  it, and the wrapper is dormant — last npm release **v5.1.0, 2024-05-06**. The repo isn't
  archived (370 stars, 35 open issues) and commits still land, but every 2026 commit is a
  Dependabot bump; last functional change 2025-06-04. Caretaker mode, not abandonment. It also
  fetches Google's library from `gstatic` at runtime, so it isn't self-contained — no offline,
  awkward under a strict CSP.
- **`trendchart-elements`** — Lit, 10.5KB, CSS-variable themed, four sparkline-grade types
  (`tc-line`, `tc-bar`, `tc-pie`, `tc-stack`), 64 stars. Explicitly scoped to "trends," not
  full charts. Data is `values="[12,10,11]"` — a serialized array attribute.

**Category B — one element per *datapoint*; data is document structure.**

```html
<td style="--size: 0.4"><span class="data">$40K</span></td>   <!-- Charts.css -->
<dc-bar value="40000" label="Jan"></dc-bar>                    <!-- decl-charts -->
```

**This category has exactly two members, and only one of them is a charting engine.**

- **Charts.css** (6.5k stars) — `<table>` markup, one `<td>` per datapoint, value carried in a
  `--size` custom property. Pure CSS, **zero JavaScript**. That constraint is its ceiling: a
  stylesheet cannot measure text, compute a nice axis range, lay out a legend, fit labels, or
  handle interaction.

  It is routinely described as "semantic HTML," including in the first draft of this review, and
  that description does not hold up:

  ```html
  <table class="charts-css bar stacked show-labels">
    <tr><td style="--size: 0.4"><span class="data">$40K</span></td></tr>
  </table>
  ```

  The chart *type* and *stacking* live in presentational class names on the table. The
  machine-readable value lives in an inline style custom property. And `--size` is a **ratio
  from 0 to 1**, not the datum — so the author must pre-normalize, which means the real number
  never appears in the document at all except as display text inside a `<span class="data">`.
  A `<table>` whose cells are stacked segments of a bar is table-as-layout with extra steps.

  By that measure `<dc-bar value="40000" label="Jan">` is the *more* honest markup: the actual
  value is present, un-normalized, in an attribute named `value`, and the server doesn't need to
  know the series maximum before it can emit a row.

  The genuine Charts.css advantage is the flip side of the same choice: with CSS disabled or
  unsupported, the markup degrades to a readable data table. decl-charts with JavaScript
  disabled renders **nothing** — `BaseChartElement.render()` returns `null`
  (`base-chart-element.ts:213`), so the light DOM is empty. There is a real progressive-
  enhancement story available here that the library does not currently tell: `<dc-bar>` could
  render its label and value as inert text by default and let the chart take over on upgrade.
  Worth considering, since it costs little and directly answers the strongest thing the only
  other Category B project has.

**These are two independent axes, and it's worth not conflating them.** "Where the data lives"
is separate from "what draws the pixels." Nearly everything draws with JavaScript — Chart.js and
ECharts to canvas; D3, `@carbon/charts` (D3 under the hood), `<google-chart>`, and
`trendchart-elements` to SVG. decl-charts is in that group too: it needs Lit and it renders SVG
at runtime. Charts.css is the sole zero-JS entry anywhere in the table.

|  | **A — data as payload** | **B — data as markup** |
|---|---|---|
| **Drawn by JS** | Chart.js, ECharts, D3, ApexCharts, Highcharts, Recharts, Vega-Lite, `@carbon/charts`, `<google-chart>`, `trendchart-elements` | **decl-charts — alone** |
| **Drawn by CSS** | — | Charts.css |

That empty-cell claim survives the second axis, but it also sets a boundary on the marketing.
**decl-charts is not "charts without JavaScript" — it is "charts without *writing* JavaScript."**
Charts.css genuinely runs with JS disabled; this library does not, and shouldn't claim to.
The honest pitch is about the *authoring* model — your template emits markup, no serialization
step, no data-binding layer — not about the runtime.

So the honest framing is not "no maintained library does this." It's:

> **Charts.css proved there's demand for data-as-markup and stopped where real charting begins.
> decl-charts is the only project occupying "one element per datapoint *with* a rendering
> engine" — axes, scales, legends, text fitting, interaction, accessibility.**

That is a genuinely empty cell in the matrix, and it is the right thing to lead with — a much
better anchor than htmx, because Charts.css's 6.5k stars are *evidence of demand* for the
approach rather than an assertion about a framework's future.

Two cautions worth holding onto. First, an empty cell can mean unmet need or revealed
preference; one-element-per-datapoint has real costs (DOM weight, verbosity, awkwardness at
large N) and nobody has yet proven the trade pays at scale — which is precisely why the
bulk-data path in §4.6 is a strategic item, not a nice-to-have. Second, the approach is
strongest for small-to-medium categorical data emitted by a template, and that should be stated
as the sweet spot rather than discovered by a disappointed user with a 5,000-point series.

Realistic ceiling: **niche-but-loved.** Charts.css at 6.5k stars is the honest upper bound for
this shape of project. Not Chart.js scale — and building toward that is how it dies.

`ROADMAP.md` is currently a feature-parity checklist against Chart.js and Highcharts — treemap,
radar, gauge, dual axes, zoom/pan, PNG export. That is a roadmap for a war that cannot be won,
written instead of a roadmap for the niche that can be owned. Freeze it. Bar, line, area, pie,
and scatter cover ~95% of what this audience builds.

The feature set is **mis-built, not under-built**. Stage charts, `<dc-log-console>`, a
DC001–DC499 error taxonomy, high-contrast palettes, auto-generated ARIA insights, entry
animations, eight pattern fills, and ten label positions all shipped — while the six gaps in
§4 did not. Building an error-code registry for a library with zero users is the clearest
signal the project drifted from shipping into polishing.

---

## 2. Ship blockers — the package as it stands does not work

Ordered by cost-of-discovery-after-publish.

### 2.1 `"sideEffects": false` on a package whose entire job is `customElements.define` — ✅ FIXED

> **Fixed.** Now `"sideEffects": ["*.js", "*.cjs"]`. The severity was confirmed empirically
> before fixing: with the old flag, esbuild reduced `import 'declarative-charts'` to a **0-byte
> bundle**. `npm run test:package` now guards it through a real bundler. Original finding below.

`package.json:20` declares `"sideEffects": false`. The package registers 25 elements via
`@customElement` decorators plus three explicit side-effect imports at `src/index.ts:60-62`.
`README.md:28` documents the install path as `import 'declarative-charts';` — a bare
side-effect import with no bindings.

Webpack and Rollup honour `sideEffects: false` by dropping such modules wholesale. **The
documented usage yields zero registered elements and a blank page, with no error.** It is
invisible in development because Vite doesn't apply the same elision, and unfixable for
consumers without a patch release.

**Fix:** `"sideEffects": ["*.js", "*.cjs"]`, plus a smoke test that imports the built
`dist/declarative-charts.js` through a real bundler and asserts `customElements.get('dc-chart')`
is defined.

### 2.2 Lit is bundled *and* declared a runtime dependency — ✅ FIXED

> **Fixed**, by splitting the artifacts rather than simply externalizing — the old bundling was
> serving the CDN case, which a bare externalization would have broken, since a
> `<script type="module">` cannot resolve `import 'lit'`.
>
> | artifact | lit | consumer |
> |---|---|---|
> | `declarative-charts.js` (358kb) | external, peer dep | bundlers |
> | `declarative-charts.standalone.js` (383kb) | inlined | CDN / `unpkg` / `jsdelivr` |
> | `declarative-charts.umd.cjs` (241kb) | inlined | `<script src>`, `require()` |
>
> Split across `vite.config.ts` and `vite.config.standalone.ts`; install line is now
> `npm install declarative-charts lit`. Original finding below.

`vite.config.ts:11` sets `external: []` while `package.json` lists `lit: ^3.1.0` under
`dependencies`. Result: a 383 KB `dist/declarative-charts.js` with Lit inlined, *and* npm
installs a second copy. A consumer already on Lit gets two `ReactiveElement` registries —
duplicate-registration warnings in dev, doubled payload, and version-skew bugs that are
miserable to trace.

**Fix:** externalize `lit`, `lit/decorators.js`, `lit/directives/*`, `@lit/reactive-element`,
`lit-html`; move `lit` to `peerDependencies` for the ESM build. If a zero-config CDN story is
wanted, emit it as a separate `declarative-charts.standalone.js` — not as the package main.

### 2.3 The test suite is red, and that silently destroys coverage reporting — ✅ FIXED

> **Fixed.** All three converters now compare case-insensitively and tolerate whitespace
> (`src/converters.ts`). Suite is green (1778 passing, 33 files) and `npm run test:coverage`
> produces a report again: **84.04% statements / 77.36% branch**. Original finding below.
>
> The 5 uncaught `rect.animate is not a function` errors are also resolved: a
> `supportsWebAnimations()` guard in `src/animation.ts` makes all six entry points degrade to a
> no-op, and `test/component/setup.ts` stubs the API so tests take the real path.
> `npm run test:run` and `npm run test:coverage` both now **exit 0**, so `prepublishOnly` is
> unblocked.
>
> Note the coverage prediction in §7 was optimistic: stubbing the API moved `animation.ts` from
> 30.76% to **34.26%**, not "most of it." The remaining gap is genuine — almost no test sets the
> `animations` attribute, so the animation paths are simply untested. That is a test-writing
> task, not a harness problem.

1768 pass / **1 fail** across 32 files. The failure is
`test/unit/base-chart-calc.test.ts:96` —
`optionalBooleanConverter > fromAttribute > returns false for "FALSE" string (case insensitive)`.
`src/converters.ts:85` compares only against lowercase `'false'`. The same asymmetry exists in
`booleanConverter` (`converters.ts:66`) and `showConditionConverter` (`converters.ts:27`). The
test documents intended behaviour; the implementation was left mid-change at the pause point.

**One-line fix:** compare `value.trim().toLowerCase() === 'false'` in all three.

The knock-on effect is larger than the test. Coverage is suppressed whenever *any* test fails,
and vitest wipes the previous `coverage/` directory on the way through — so a red suite silently
and destructively costs all coverage visibility:

```
npx vitest run --coverage                                        → exit 1, no table, coverage/ deleted
npx vitest run --coverage --exclude='**/base-chart-calc.test.ts' → exit 0, full table written
```

`prepublishOnly` runs the suite, so **publish is currently blocked regardless.**

### 2.4 The README's line-chart quick-start is broken — ✅ FIXED

> **Fixed.** Corrected to `stroke` on `<dc-line>`, matching `API.md:271`. Confirmed by rendering
> both forms in Chromium: the old markup produced `stroke="#2196F3"` (the palette default, colour
> silently ignored), the new one produces `stroke="#9C27B0"`. All five README chart examples now
> render with the expected shape counts and no console errors. Original finding below.

### 2.5 Placeholder package metadata — ✅ FIXED

> **Fixed.** Real repository URLs and author. `npm run test:package` fails if placeholders
> reappear. Original finding below.

`YOUR_USERNAME` in `repository`, `bugs`, and `homepage`; `"Your Name <your.email@example.com>"`
as author.

---

## 3. Correctness defects

### 3.1 Child attribute changes do not re-render the chart — ✅ FIXED

> **Fixed**, though not by the mechanism proposed below. A Lit `updated()` hook on
> `BaseChartElement` only fires for *declared reactive properties*, which would have missed the
> two cases that matter most: `hidden` is a plain HTML attribute read via `hasAttribute()`, and
> passthrough attributes (`hx-*`, `data-*`) are undeclared by definition. So `BaseChart` now
> observes its own light-DOM subtree with a `MutationObserver` (`observeChildren()`) — one
> implementation, in one place, covering attributes, `hidden`, add/remove/reorder, text content,
> and `innerHTML` swaps.
>
> The observer ignores records targeting the chart itself, since the chart's own attributes are
> Lit's business and reacting to them would loop on anything set during a render.
>
> All 52 manual `requestUpdate()` calls were removed from the integration suite, which still
> passes — so those tests now assert reactivity instead of concealing its absence. The 11 new
> tests in `test/integration/child-reactivity.test.ts` were confirmed to fail without the fix:
> 8 of 11 failed, and the 3 that passed were exactly the add/remove cases `slotchange` already
> covered — precisely the predicted signature. Verified in Chromium too, including a
> one-second idle check showing zero re-render loops. Original finding below.

Two reviewers found this independently, from opposite directions — the strongest signal in the
whole review.

Charts read data by `querySelector` on every render, but nothing watches for changes. The only
invalidation hook is `<slot @slotchange=${this.handleSlotChange}>` (`base-chart.ts:2295`), which
fires on child **add/remove only**. `BaseChartElement` has no `updated()` hook notifying its
parent, and its `render()` returns `null` at line 213 — so `bar.setAttribute('value', '80')`
updates the `dc-bar` and the change dies there.

The test suite **encodes the defect rather than catching it**: every mutation in
`test/integration/dynamic-updates.test.ts` is followed by a manual `chart.requestUpdate()`
(lines 63, 88, 111, 140, 161, 184, 204, 224, 252, …). `CLAUDE.md` documents the workaround for
`hidden` as though it were a design decision. From the consumer's side this is Lit internals
leaking into the public contract.

For a library whose whole pitch is "your markup is the data," this is a core correctness gap.

**Fix** — add to `BaseChartElement`:

```ts
protected updated() {
  (this.parentElement?.closest('dc-chart,dc-pie-chart,dc-funnel-chart,dc-stage-chart')
    as BaseChart | null)?.requestUpdate();
}
```

Then delete the manual `requestUpdate()` calls from the integration tests, so reactivity is
genuinely asserted rather than papered over.

### 3.2 Category labels misalign from bars when bars carry explicit `width`

`renderVerticalBars` (`chart.ts:2155-2298`) and `renderHorizontalBars` (`chart.ts:2300-2442`)
are ~85% identical. The same group-walking traversal is copied a **third and fourth time** into
`renderBarCategoryLabels` (`chart.ts:3119-3153` and `chart.ts:3198-3232`) — **and the copies
have drifted.** They omit the `allBarsHaveWidth` branch present in the render paths at
`2229-2240` and `2374-2385`.

Consequence: **when bars carry explicit per-bar `width`, the category labels no longer line up
with their bars.** A real, shipped defect.

It exists precisely because layout and SVG emission are interleaved — roughly 70 lines of
mutable-cursor arithmetic (`barIndex`, `unitIndex`, `cumulativeX`, declared at 2183-2185)
mutated inside a `.map()` nested in an `` svg`` `` template, before 3 lines of actual emission
at 2293-2295. There is nothing testable in between.

**Fix — best bug-fix-per-effort ratio in the repo:** extract
`computeBarLayout(): BarLayout[]` returning `{x, y, w, h, fill, labelX, labelY, anchor}` from a
single traversal with orientation as a parameter. `renderBars` collapses to a `.map()` emitting
`` svg`<rect …>` ``. Four drifted copies become one, the misalignment disappears by
construction, and bar geometry becomes unit-testable without a DOM.

### 3.3 Popups and screen-reader announcements bypass the formatter

`value-format="currency USD"` renders `$1,234.56` on the label and `1234.56` in the tooltip and
to a screen reader.

`stage-chart.ts:1418` calls `this.formatValue(...)` correctly. `pie-chart.ts:537`,
`funnel-chart.ts:841`, and `chart.ts:3360, 3385, 3390` interpolate the raw number. All four
keyboard-nav labels do the same (`pie-chart.ts:678`, `funnel-chart.ts:997`,
`stage-chart.ts:1568`, `chart.ts:3871/3886/3901`).

This is user-visible inconsistency that also undercuts the accessibility story the library
advertises. It is fixed for free by the hoist in §5.2.

### 3.4 Render cost is quadratic in datapoint count — ✅ FIXED

> **Fixed, and the mechanism I hypothesised below was wrong.** This section guessed at
> `chart.ts:1575-1578` re-deriving datasets in `updated()`. Profiling said otherwise.
>
> `shouldShowLabel()` is called once per label from inside the render loop (`chart.ts:3199`,
> `3278`, `3337`, `3368`). Each call runs `getLabelIntervalValue()` →
> `calculateAutoLabelInterval()`, which performs an O(n) `measureText` sweep **and** calls
> `getChartPadding()` → `getAxisLabelPadding()` → `getFlattenedBars()` → `getBarStructure()` →
> n × `extractBarData` → n × `getPassthroughAttributes`. O(n) labels × O(n) work each.
>
> Measured for one 400-bar render: **2,900,800** calls to `extractBarData`, **482,406** to
> `measureText` — the latter matching the predicted 400 × 400 × 3 renders almost exactly.
> `getPassthroughAttributes` (`base-filled-shape.ts:46`) held **37%** of self time.
>
> Fixed with `BaseChart.cachePerRender()`, cleared in `willUpdate()`. `renderChart` for 400 bars
> went 14,604ms → **47.4ms**; `extractBarData` 2,900,800 → 1,200 calls.
>
> | bars | before | after |
> |---:|---:|---:|
> | 250 | 2,869 ms | 134 ms |
> | 500 | 10,823 ms | 183 ms |
> | 1,000 | 44,562 ms | **293 ms** |
> | 2,000 | timed out (>90 s) | 401 ms |
> | 5,000 | — | 780 ms |
>
> Scaling is linear. All 23 visual baselines unchanged, so output is identical.
> `test/component/render-caching.test.ts` guards it by call count.
>
> Two corrections this forces elsewhere in this document: §4.6's claim that the bulk-data path
> is a *performance* remedy is now doubly wrong — the cost was never element count, and it is no
> longer quadratic either, so `values="[…]"` is justified purely on ergonomics and payload size.
> And §5.4's "no caching outside stage-chart" is now resolved at the base-class level.
>
> Original finding below.

This review's first draft asserted, without measuring, that dense series would be a problem
"at around 5,000 points." That was wrong by more than an order of magnitude. Measured in
Chromium via Playwright against a 900×400 `<dc-chart>` (`test/visual/fixtures/bench.html`):

| bars | first paint | re-render | hover |
|---:|---:|---:|---:|
| 50 | 314 ms | 98 ms | 0.6 ms |
| 100 | 551 ms | 255 ms | 1.0 ms |
| 250 | **2,869 ms** | 1,369 ms | 1.7 ms |
| 500 | **10,823 ms** | 5,415 ms | 2.9 ms |
| 1,000 | **44,562 ms** | 21,073 ms | 3.4 ms |
| 2,000 | timeout (>90 s) | — | — |

Line charts (`<dc-line>` with N `<dc-point>` children) show the same curve with a smaller
constant — about 3.6× cheaper at n=1000, but quadratic all the same:

| points | first paint | re-render | hover |
|---:|---:|---:|---:|
| 50 | 166 ms | 32 ms | 0.3 ms |
| 100 | 297 ms | 100 ms | 0.4 ms |
| 250 | 1,034 ms | 469 ms | 0.5 ms |
| 500 | 3,321 ms | 1,559 ms | 0.6 ms |
| 1,000 | **12,245 ms** | 5,971 ms | 2.1 ms |

**Every doubling of `n` costs roughly 3.5–4× the time — this is O(n²), cleanly, in both chart
types.** 100 → 1,000 points is 10× the data and **81×** the wall clock for bars, **41×** for
lines. A 250-bar chart, an unremarkable thing for a dashboard to ask for, takes nearly three
seconds to first paint and 1.4 seconds for every subsequent update. At 1,000 points the browser
is unresponsive for 45 seconds.

Note that the line chart emits **one** `<path>` regardless of `n` — the quadratic cost is
therefore not in SVG node count or in browser paint. It is in the library's own per-render
computation.

Two things this measurement corrects in the rest of this review:

- **The practical ceiling is ~100–200 points, not thousands.** That makes the bulk-data path
  (§4.6) a *performance* fix, not just an ergonomic convenience — though note that `values="[…]"`
  alone will not help unless the quadratic behaviour is fixed too, since the cost is in the
  render pipeline rather than in element upgrade. Parse time is negligible throughout
  (6–17 ms even at 1,000 elements); custom-element upgrade is **not** the bottleneck.
- **Hover is cheap and stays cheap** (0.6 → 3.4 ms). §5.4 speculated that missing per-render
  caching would make mouse events expensive; the data does not support that. The uncached
  traversals are a *render*-path problem. §5.4's staleness argument still stands, but its
  performance argument does not.

The likely mechanism, worth confirming with a profile before fixing: `updateMs` and `paintMs`
grow in lockstep (22.9 s / 21.6 s at n=1000), and "paint" here is measured across two animation
frames *after* Lit's update resolves — which is exactly where `chart.ts:1575-1578` re-derives
all four datasets in `updated()` to imperatively patch passthrough attributes onto the rendered
SVG (`base-chart.ts:2651`). An O(n) post-render pass whose body does O(n) work per element would
produce precisely this curve. The 21 uncached `getFlattenedBars()` call sites (§5.4) are the
other candidate. **Profile first — do not guess.**

*Caveat: measured against the Vite dev server, so absolute figures are pessimistic; a production
build will be faster by some constant factor. The quadratic shape is not build-dependent.*

### 3.5 Past 84 bars, a bar chart renders nothing at all — ✅ FIXED

> **Fixed.** Gutters are now compressed proportionally when space runs short and bar size is
> floored at 1 viewBox unit (`chart.ts`, `calculateUnitDimensions`), with the new `gutterScale`
> threaded through all six gutter call-sites so bars and category labels stay aligned. Warns via
> the new `DC107`. Regression tests in `test/component/bar-layout.test.ts`; `npm run bench --
> --probe` confirms 10–200 bars all paint. Original finding below.

The benchmark surfaced this; reading the code had not. Bar width shrinks linearly with count
and **crosses zero**, after which Chromium rejects every `<rect>`:

```
<rect> attribute width: A negative value is not valid. ("-1.9")
```

Measured on a 900-unit-wide chart, bisected to the exact boundary:

| bars | computed `width` | bars actually painted |
|---:|---:|---:|
| 70 | 1.571 | 70 |
| 75 | 0.800 | 75 |
| 80 | 0.125 | 80 |
| **85** | **−0.471** | **0** |
| 90 | −1.000 | 0 |
| 100 | −1.900 | 0 |
| 150 | −4.600 | 0 |

The cliff is between **84 and 85 bars** at this width (it scales with chart width — inter-bar
spacing consumes roughly 10.7 units per slot). Below it, bars are already sub-pixel and
invisible in practice from about n=75. Above it, `getBoundingClientRect().width` is 0 for every
bar: **the chart draws literally nothing**, and the only signal is console noise the library
neither produces nor knows about. No DC-code fires. `getInsights()` and the ARIA description
still describe a chart that isn't there.

This is the same layout code §3.2 shows has drifted into four copies, and it is exactly the
class of bug an extracted, unit-testable `computeBarLayout()` catches for free — one assertion
that widths stay positive across a range of `n` would have failed on day one. Clamp to a
minimum width, and log a new DC-code when the bar count exceeds what the plot area can
represent.

---

## 4. The six gaps, expanded

These are the things that stand between "impressive demo" and "I put this in production."

### 4.1 Responsive sizing — ✅ (a) FIXED · (b) OPEN · (c) WAS WRONG

> **(a) Text scaling — fixed.** New `text-scaling="fixed"` reinterprets font sizes as CSS
> pixels, held constant by a `ResizeObserver` on the host. `proportional` stays the default so
> no existing chart changes. Measured in Chromium at 300px and 1200px container widths:
>
> | | proportional @300 | proportional @1200 | fixed @300 | fixed @1200 |
> |---|---|---|---|---|
> | axis label | 4.7px | 21.2px | **11px** | **11px** |
> | title | 8.5px | 38.5px | **20px** | **20px** |
> | data label | 6px | 27px | **14px** | **14px** |
> | legend | 5.5px | 25px | **13px** | **13px** |
>
> **(c) was wrong, and I am retracting it.** This section claimed `measureText` mixes
> coordinate systems — returning CSS pixels that are consumed as viewBox units. It does not.
> Text width and font size scale together, so the factors cancel and the returned value *is* in
> viewBox units. Verified directly in Chromium: canvas `measureText` gave **197.86** for text
> that `getBBox()` measured at **197.87** user units in a 2×-scaled SVG. Had I "fixed" this, I
> would have broken every label-fitting calculation in the library. The real invariant — now
> documented in CLAUDE.md — is simply that the size passed to `measureText()` must equal the
> size emitted as the `font-size` attribute; both now go through `fontSize()`.
>
> **(b) aspect ratio remains open.** `preserveAspectRatio="xMidYMid meet"` still locks the chart
> to its authored `width:height`, so a 16:9 tile letterboxes a 600×400 chart. Unlike (a), that
> needs a layout-level answer — recomputing at the rendered size — rather than a text tweak.
>
> Original finding below, with (c) left in place as written so the correction is legible.

### 4.1 Responsive sizing — *the received diagnosis is wrong; the real problem is subtler*

**Correction first.** The market review claimed "no responsive mode; sizing is fixed pixels."
That is not accurate. The rendering is already fluid:

```css
/* src/base-chart.ts:1926-1930 */
svg { display: block; width: 100%; height: auto; }
```

```html
<!-- src/base-chart.ts:2272-2274 -->
<svg viewBox="0 0 ${this.width} ${this.height}" preserveAspectRatio="xMidYMid meet">
```

No `width`/`height` attributes on the `<svg>`, a viewBox, and `width: 100%`. Drop a chart in a
flex or grid cell and it *does* fill it. `width="600"` is not a pixel size — it is the **viewBox
coordinate space**, i.e. the aspect ratio plus the unit system that `font-size`, `padding`, and
the label offsets are expressed in. That part of the design is right, and it's the hard part.

The actual problems are three, and they're more interesting than "add a responsive attribute":

**(a) Everything scales uniformly, including text.** This is the classic trap: SVG scaling is
not responsive design. A `font-size="14"` label is 14/600 of the chart's width — *always*. In a
1200px-wide container it renders at 28 CSS px; in a 300px sidebar it renders at 7px and is
unreadable. Same chart, same markup. A user who tunes label sizes for their desktop dashboard
gets illegible mush on mobile, and there is currently no mechanism — not even a documented one —
to do anything about it. This is the single biggest gap between "it scales" and "it's
responsive."

**(b) Aspect ratio is locked.** `preserveAspectRatio="xMidYMid meet"` means the chart can only
ever be `width:height`. A consumer with a 16:9 dashboard tile and a chart authored at 600×400
gets letterboxing, not a chart that fills the tile. There is no `preserve-aspect-ratio`
passthrough and no "fill container" mode.

**(c) `measureText` mixes coordinate systems.** `base-chart.ts:760` returns
`ctx.measureText(text).width` — **CSS pixels** — and the result is consumed as **viewBox units**
by the padding, label-fitting, and legend-layout code. These are only the same number when the
container happens to be exactly `width` CSS px wide. At any other size, every text-fitting
decision in the library is proportionally wrong: legend wrapping, axis-label interval
selection, and the `label-lines` staggering all mis-fire. It degrades gracefully enough to have
gone unnoticed, but it means "does my label fit?" is answered against a hypothetical canvas
rather than the real one. This is the same units confusion the API review flagged from the
consumer's side (`font-size` in viewBox units, `stroke-width` in px, `padding` in px/rem/%) —
here it's an internal correctness issue, not just a documentation one.

There is **no `ResizeObserver` anywhere in `src/`** (verified), so the library cannot know its
own rendered size and cannot react to it.

**What to build:**
- A `ResizeObserver` on the host, exposing the true CSS-px width, so `measureText` results can
  be converted into viewBox units (`px * viewBoxWidth / renderedWidth`). This fixes (c) and
  unlocks everything else.
- Breakpoint behaviour driven by rendered size, not viewBox size: below ~400px, drop to every
  Nth axis label, move the legend below the plot, hide value labels. This is what
  "responsive" means to users and it is impossible without the observer.
- A `scale-text` / `fixed-text-size` mode where font sizes are interpreted as CSS px and
  converted into viewBox units per render, so labels stay legible at any container size.
- `preserve-aspect-ratio` as a passthrough attribute, plus a `fill` mode for
  aspect-ratio-agnostic containers.

### 4.2 Empty and loading states

Right now, a chart with no data elements logs `DC001 DATA_EMPTY` (`chart.ts:1607`,
`pie-chart.ts:189`, `funnel-chart.ts:395`, `stage-chart.ts:620`) and renders an empty SVG frame
— axes and all. And because `logging` defaults to `'false'` and `console-log` to `'none'`
(`base-chart.ts:209, 224`), **that log goes nowhere.** The user sees a blank bordered box and
gets no explanation from anywhere.

This matters far more for this library than for Chart.js, because of how charts get populated.
When markup is swapped in from the server — htmx, Turbo, a template re-render, a fetch +
`innerHTML` — there is necessarily a window where the chart element exists and its children do
not. That is not an error state; it is the **normal first frame of every server-driven chart.**
The library currently treats the normal case as an anomaly, logs it invisibly, and renders
nothing useful.

**What to build:**
- `<dc-empty>` as a slotted child: `<dc-chart><dc-empty>No data for this period</dc-empty></dc-chart>`,
  rendered when there are no visible data elements. Declarative, consistent with the rest of
  the API, styleable, and translatable by the server that emitted it.
- A `loading` attribute rendering a skeleton or spinner in the plot area, so
  `hx-indicator="closest dc-chart"` and equivalents work without custom CSS.
- Distinguish "no children yet" from "children present, all hidden" (`DC002`) from "children
  present, all zero" (`DC003`). Today the first is silent and the last renders a flat line at
  zero with no indication anything is wrong.
- Reserve layout while empty — don't collapse to zero height and cause layout shift when data
  lands.

### 4.3 Events — ✅ FIXED

> **Fixed.** `dc-click`, `dc-mouseenter`, `dc-mouseleave` on data elements, plus `dc-render`
> after each draw. Emitted through `BaseChart.emitInteraction()` and wired into all 24 existing
> interaction handlers across the four chart types.
>
> Dispatched from the **authored element** (`<dc-bar>`) rather than the chart, so a listener can
> attach directly to it — those are light-DOM children, so the event still bubbles to the chart
> and the document. `composed: true` as this section warned is non-negotiable.
>
> `dc-click` is cancelable, and `preventDefault()` suppresses both the popup and `href`
> navigation (the latter by cancelling the originating MouseEvent, since the shape sits inside
> an `<a>` wrapper). `percent` is a decimal, matching the library convention.
>
> `PointData`, `BubbleData` and the funnel/stage data structures gained an `element` reference,
> which they had lacked — without it the payload would have been inconsistent across chart types.
>
> Names are declared on `HTMLElementEventMap` so `event.detail` types without a cast.
> Documented in **API.md → Events**; live demo in `examples/interactive.html`, verified in
> Chromium with real pointer input. 10 tests in `test/integration/events.test.ts`.
>
> Original finding below.

`grep -rn "dispatchEvent\|CustomEvent" src/` returns **nothing**. Not one event in 20,677 lines.

The only interaction escape hatches are `href`/`target` (`base-chart-element.ts:38-42`) and
attribute passthrough. Both are *navigation* primitives. Neither lets a consumer respond to an
interaction in place.

Concretely: "click a bar, filter the table below it" — the single most common dashboard
interaction there is — cannot be done. The click lands on a `<rect>` inside the shadow root.
The consumer has no selector for it (no `::part`, see §4.4), can't listen on `<dc-bar>` because
it renders nothing (`base-chart-element.ts:213` returns `null`), and would have to reach through
`chart.shadowRoot.querySelectorAll('rect[data-shape-index]')` after every render — knowledge of
internals that will break on any refactor. The library's own `data-shape-index` convention is
the only thing making it possible at all.

This is also the cheapest high-value fix in the entire review. The hit-target elements already
exist, already carry indices, and already have hover and click handlers attached for popups —
the events would ride along on machinery that is already there.

**What to build:**

```ts
this.dispatchEvent(new CustomEvent('dc-click', {
  bubbles: true,
  composed: true,          // required — otherwise it never escapes the shadow root
  detail: { element, label, value, percent, index, seriesLabel, seriesIndex }
}));
```

- `dc-click`, `dc-mouseenter`, `dc-mouseleave` on data elements; `dc-render` on the chart after
  each successful render; `dc-error` carrying the DC-code payload (see §6.3).
- `composed: true` is not optional — without it the event dies at the shadow boundary and the
  whole feature is inert.
- Re-dispatch from the `<dc-bar>` light-DOM element as well as the chart, so
  `<dc-bar onclick=...>` and `@dc-click` in Alpine/Vue templates do the obvious thing.
- Make them cancelable where it makes sense (`preventDefault()` on `dc-click` suppresses
  `href` navigation and popup display).

### 4.4 `::part()` and CSS custom properties — ✅ FIXED

> **Fixed, as both layers rather than one.** 19 custom properties (chart frame, typography,
> focus ring, popup) and 21 shadow parts. Verified in Chromium that every part resolves and
> every token applies.
>
> The hardcoded `:host` frame this section criticised — white background, grey border, drop
> shadow — is now tokenised, so a chart can sit on a dark page without fighting the library.
>
> Two SVG-specific traps worth recording, since both would have caused silent breakage:
> `--dc-font-family` is applied to the `<svg>` rather than to `<text>`, because presentation
> attributes beat *inherited* values — so an explicit `font-family` on `<dc-title>` still wins.
> And `fill` is deliberately **not** tokenised on the `<svg>`: fill inherits in SVG, so a rule
> there would tint every shape lacking an explicit fill, not just the text.
>
> Parts are stamped post-render from a selector map rather than written into ~50 templates.
> Shapes sharing a tag needed discriminators — points and bubbles are both circles, and point
> markers can render as any of eight shapes, so they are wrapped in a `<g class="point-marker">`.
>
> One honest caveat now documented: because CSS beats presentation attributes, a broad
> `::part(bar) { fill: … }` overrides even bars with an explicit `fill`. The precedence table in
> API.md states this rather than pretending otherwise.
>
> Original finding below.

`grep -rn "part=\|--dc-\|::part" src/` → **no matches.** There is no styling escape hatch of any
kind.

Meanwhile the library actively *rejects* CSS conventions: `chart-title.ts:24-29` warns when you
write `color`, and `:34` warns on `font-size="24px"`. So the position a consumer encounters is
"don't use CSS" combined with "we give you no CSS hooks."

The SVG-attribute philosophy is defensible in isolation — `<dc-title>` really does become an SVG
`<text>`, where `fill` and unitless `font-size` are literally correct. But it is undermined from
two sides. Internally it isn't applied consistently: `<dc-grid color>` (`chart-grid.ts:52-53`)
and a deprecated `color` on every data element (`base-chart-element.ts:21-22`) both exist, which
makes the rule look arbitrary rather than principled. Externally it doesn't survive contact with
real usage: a design system with a brand font and a token palette has no way to theme charts
once. Setting `font-family` on forty `<dc-title>` elements is not a styling story.

There's a third, quieter problem. `:host` (`base-chart.ts:1915-1924`) hardcodes an opinionated
frame — `border: 2px solid #ddd`, `padding: 20px`, `background: white`, `border-radius: 8px`,
`box-shadow`. A white background is baked into a library that ships a dark-mode-aware
`prefers-contrast` implementation. It's overridable from outside (`:host` has low specificity),
but it should be tokens, not defaults.

**What to build — both layers, not a replacement:**
- `part="chart plot title legend legend-item axis axis-label grid bar line point slice stage
  label popup focus-ring"`, plus `exportparts` where elements nest, so
  `dc-chart::part(bar) { filter: drop-shadow(...) }` and
  `dc-chart::part(bar):hover { opacity: .8 }` work. Note that `::part` gives consumers hover
  and transition states for free — things they currently cannot express at all.
- A `--dc-*` custom-property layer read via `getComputedStyle` for values that must reach SVG
  attributes: `--dc-font-family`, `--dc-label-fill`, `--dc-axis-stroke`, `--dc-grid-stroke`,
  `--dc-popup-bg`, `--dc-surface`, `--dc-border`. Custom properties inherit through shadow
  boundaries, which is exactly the "theme once, apply everywhere" mechanism that's missing.
- Move the `:host` frame onto those tokens so it can be neutralised with
  `dc-chart { --dc-border: none; --dc-surface: transparent; }`.
- Keep per-element SVG attributes as the highest-precedence override. Documented order:
  element attribute > `::part` rule > `--dc-*` token > built-in default.

### 4.5 Null-gap handling in lines

A line's path is built from `point.value` with no null concept anywhere:

```ts
// src/chart.ts:2563 (vertical branch)
y = this.height - padding.bottom - ((point.value - min) / totalRange) * chartHeight;
```

and `value = 0` is the declared default on `BaseFilledShape` (`base-filled-shape.ts:21`).

So `<dc-point label="Mar">` — a point with no value, which is exactly what a server template
emits for a month with no data — **plots at zero.** The line dives to the axis and climbs back
out. The chart doesn't report missing data; it asserts the value was zero. For anything
financial, medical, or operational, that is not a cosmetic bug — it is the chart stating
something false, confidently, with no warning (the DC-code system says nothing here, and
wouldn't be visible if it did).

`generatePathData` (`chart.ts:671`) compounds it: every branch — `linear` (703), `catmull-rom`
(719), `monotone` (805) — emits one continuous `M …` followed by unbroken segments. There is
no vocabulary for a break in the path, so even correct input couldn't be rendered as a gap.
And the curve fitters make it worse than linear would: a Catmull-Rom or monotone spline through
a spurious zero doesn't just dip, it *overshoots* on both sides, corrupting the two neighbouring
segments as well.

**What to build:**
- Make `value` genuinely optional on points — `value?: number` with no default, so "absent" and
  "zero" are distinguishable. This is a breaking change and is much cheaper now than later.
- Accept explicit `<dc-point value="null">` / `value=""` as missing, since server templates
  emit strings and `null` is what a JSON-backed template will interpolate.
- A `missing` policy attribute on `<dc-line>`: `gap` (default — break the path), `skip`
  (interpolate straight through, connecting the neighbours), `zero` (current behaviour, opt-in).
- Emit multiple subpaths: `M … L … M … L …`, splitting the point array into runs of present
  values before calling the curve fitter, so each run is fitted independently and splines can't
  overshoot across a gap.
- Suppress point markers and value labels at missing indices, and skip them in
  `getFocusableElements()` so keyboard navigation doesn't stop on a hole.
- Extend to `<dc-area>` (a gap should break the fill, not draw it to the baseline) and to
  bars, where a missing bar should be absent rather than a zero-height rect that still consumes
  a slot and still renders a category label.

### 4.6 A bulk-data path

`grep -rn "JSON.parse" src/` → **nothing**. There is no way to get data in other than one custom
element per datapoint.

That's the right *default* — it's the whole idea — but it has two failure modes.

**Volume.** Measured, not assumed — see §3.4. A 365-point time series is not merely heavy, it is
**unusable**: render cost is quadratic, a 250-point chart takes ~2.9 s to first paint, and 1,000
points locks the main thread for 45 seconds.

Note carefully what the measurement *exonerates*. Creating and upgrading the custom elements is
cheap — parse time is 6–17 ms across the whole range, under 0.04% of total at n=1000. So "one
element per datapoint is too many DOM nodes," the intuitive objection to this library's central
design idea, **is not what's slow.** The design is fine; the render pipeline is not.

That has a direct strategic consequence: shipping `values="[…]"` as a *performance* remedy would
be treating the symptom. It removes element-upgrade cost that was never the bottleneck, while
leaving the quadratic render intact — a 1,000-point `values` array would be just as slow. **Fix
§3.4 first; then add the bulk-data path for ergonomics and payload size, which are its real
justifications.**

**Provenance.** Not every consumer is a server template. Someone with an array in hand — from
`fetch`, from a JS framework, from a WebSocket — must build DOM element by element
(`API.md:1748-1767`) and then call `chart.requestUpdate()`. There is no `.data` property, no
JSON attribute, and no way to read state back (no `getData()`, no `getResolvedColors()`, no
computed layout accessor). For a large fraction of potential users the front door is bricked up.

**What to build, cheapest first:**
- **`values` / `labels` array attributes on series elements:**
  `<dc-line values="[3,5,null,8]" labels='["Jan","Feb","Mar","Apr"]'>`. Roughly the
  `trendchart-elements` approach. One element per *series* instead of per *point*, which is a
  100× reduction for dense data while staying pure markup — no JS required, still
  server-renderable. `null` here also gives §4.5 a natural expression.
- **A `.data` JS property** on chart elements accepting
  `[{label, value, …}]` or `{series: [...]}`, mirroring exactly what the child elements produce.
  Setting it bypasses the DOM walk entirely. This is the front door for the fetch/framework
  consumer and costs little once the internal data shape is already defined.
- **`<dc-data>` as a slotted JSON payload** for the server-rendered-but-dense case:
  `<dc-chart><dc-data>[{"label":"Jan","value":3}]</dc-data></dc-chart>`. Still one HTML
  response, no endpoint negotiation, but no per-point element cost.
- **Read-back accessors** — `getData()`, `getResolvedColors()`, `getLayout()` — so events
  (§4.3) and external legends can be built without re-deriving what the chart already computed.
- Precedence, documented: `.data` property > `<dc-data>` > `values`/`labels` attributes > child
  elements. Mixing should warn (a new DC1xx code), not silently pick one.

---

## 5. Architecture: structural findings

Not broken, but expensive to change after publishing.

### 5.1 `BaseChart` is a 3,145-line god class that knows its own subclasses

It owns padding math, colour/palette resolution, the pattern registry, luminance/contrast, text
measurement, logging plus console echo, error codes, popups, title, legend, accessibility
description generation, keyboard navigation, animation dispatch, and defaults application.

Two leaks prove the abstraction is inverted:

- `base-chart.ts:2236` — `(this as unknown as { orientation?: string }).orientation`. The base
  reaches into a property only `Chart` defines.
- `base-chart.ts:2248` — `getAnimatableChartType()` sniffs `this.tagName` for
  `'pie'`/`'funnel'`/`'stage'`. The base enumerates its own subclasses by name.

**Fix, incremental and non-breaking:** extract to composables held as fields rather than
inheritance — `ColorResolver` (~450 lines, 936–1630), `TextMeasurer` (~60, 731–770),
`ChartLogger` (~160, 772–930), `PopupController` (~100, 1976–2022), `KeyboardNavController`.
Make `getAnimatableChartType()` `protected abstract`, and use the `getChartOrientation()` hook
that `axis-chart.ts:165` already defines instead of the cast.

### 5.2 ~1,050 duplicated lines across the four chart files (~15%)

Byte-identical in all four: `renderFocusIndicator` (`pie-chart.ts:689-713`,
`funnel-chart.ts:1008-1032`, `stage-chart.ts:1576-1599`, `chart.ts:3916-3940`) and
`togglePopupForFocusedElement` (`pie-chart.ts:745-751`, `funnel-chart.ts:1064-1070`,
`stage-chart.ts:1624-1630`, `chart.ts:4024-4030`). `shouldShowAutoPopup` likewise. The
mouseenter/mouseleave/click triad appears **8 times** (~340 lines), differing only in the name
of the clicked-index field. `getSlices`/`getStages` (`pie-chart.ts:57-129`,
`funnel-chart.ts:79-154`, `stage-chart.ts:151-222`) share ~50 of ~72 lines. Funnel and stage
`getLegendItems` share 28 of 32 lines *including a word-for-word copied comment*.

Hoist the quartet into `BaseChart` and route all popup/ARIA text through `this.formatValue()` —
which resolves §3.3 in one place, permanently. ~600 lines removed.

### 5.3 No layout phase

Covered in §3.2 — layout and emission are interleaved everywhere, which is why the four bar
traversals could drift without any test noticing. `stage-chart.ts:565-925`
(`calculateStageLayout`) has the same shape and the same problem. Extracting pure
`layout/*.ts` modules taking `(data, width, height, padding)` and returning geometry is the
single highest-leverage refactor available, both for correctness and for testability.

### 5.4 Per-render caching exists in exactly one chart

`cachedLayout` appears only in `stage-chart.ts` (declared 146, set 1080, read 1429/1449/1463) —
the pattern `CLAUDE.md` documents as standard. The others recompute on every mouse event:
`pie-chart.ts:541` calls the full `calculateSliceLayout()` **including its `this.log(...)` calls
at 214-219, 267-268, 313-320** on every hover, spamming the log console. `funnel-chart.ts` makes
8 fresh `getStages()` calls. `chart.ts` call-site counts are in §4.6.

Separately, `chart.ts:1575-1578` re-derives all four datasets in `updated()` purely to
imperatively patch passthrough attributes onto already-rendered SVG (`base-chart.ts:2651`) —
DOM mutation outside Lit's control, which Lit may revert on its next render.

Combined with §3.1, this is a staleness hazard: a handler's recomputed data can disagree with
what is on screen.

### 5.5 Maintenance debt

`src/chart-utils.ts:20-41` exports `niceNumber`; `src/axis-chart.ts:322-346` holds a
**byte-identical private copy**, and that copy is the one `getNiceMax()`/`getNiceRange()`
actually call (`axis-chart.ts:6` imports only `calculateLabelLines`, `calculateLabelInterval`,
`calculateTicks`). Both copies are covered, so this is drift risk, not a coverage gap. Delete
the private copy. Meanwhile `calculateNiceTicks` and `calculateTicksByInterval` are exported and
tested with **zero call sites in `src/`**.

Packaging, beyond §2: no **custom-elements manifest** (`custom-elements.json`) — for an
HTML-first library that is the difference between IDE autocomplete and none — and `exports` has
no subpath map, so consumers can't import a single chart type.

---

## 6. API design: fix while breaking changes are still free

At v0.1.0, unpublished, every one of these is free. After publish, none of them are.

### 6.1 `<dc-grid style="dashed">` shadows the global HTML `style` attribute

`chart-grid.ts:59-60`. Every HTML element has `style`; overloading it to mean "line dash style"
is the sharpest convention violation in the codebase, and it puts invalid CSS in the DOM. Rename
to `stroke-dasharray` — which `<dc-fill>` already accepts with named `"dashed"`/`"dotted"`
values (`chart-fill.ts:168`), so this is both standard *and* internally consistent. Same for
`<dc-grid color>` → `stroke`.

### 6.2 `show-value="off"` means **show**

`converters.ts:44-45` returns `true` for any unrecognised string. `show-value="yes"`,
`"none"`, and `"off"` all enable. Reject unknown values, log `DC104`, default to false.

Relatedly, `show-*` is not uniform: everywhere it's `showConditionConverter` supporting `"10%"`
and `"100"` thresholds (`converters.ts:24`), but on `<dc-legend>` it's `booleanConverter`
(`chart-legend.ts:142-149`), so `<dc-legend show-value="10%">` silently evaluates to `true`.
One attribute name, two meanings.

### 6.3 Diagnostics are invisible by default

`logging` defaults to `'false'` (`base-chart.ts:209`), `console-log` to `'none'` (`:224`), and
`logError()` routes everything through `log()` (`:900-907`). The entire DC001–DC499 system —
palette-not-found, pattern-not-found, parse errors — **produces no output unless the developer
already knew to opt in.** Combined with `value = 0` and `label = ''` defaults, a typo like
`palette="catagory10"` or `<dc-bar valeu="10">` renders a silently wrong chart with no
diagnostic anywhere. Only `format.ts:102` and `base-chart.ts:3077` warn unconditionally.

The codes are good; the default is backwards. Default `console-log` to `'warning'` and let
people silence it. Silent misconfiguration is the worst possible failure mode for a declarative
API, because the markup *looks* right.

### 6.4 Naming collisions

- **`width` is a homonym.** Chart width on `<dc-chart>` (`base-chart.ts:128`), bar *thickness*
  on `<dc-bar>` (`chart-bar.ts:51`) — while the chart-level version of that same idea is
  `bar-width` (`chart.ts:271`). Rename `<dc-bar width>` → `bar-width`.
- **"segment" vs "stage".** `<dc-funnel-chart>` sizes its `<dc-funnel-stage>` children with
  `segment-height`/`segment-min-height`/`segment-max-height` (`funnel-chart.ts:53-60`), while
  `<dc-stage-chart>` uses `stage-size`/`stage-min-size` (`stage-chart.ts:84-91`). Same concept,
  two nouns, and neither matches its own child element's name — while `<dc-bar-segment>` uses
  "segment" for something else entirely.
- `<dc-fill scale>` (`chart-fill.ts:213`) vs shape `pattern-scale`
  (`base-filled-shape.ts:74`) — same concept.

### 6.5 Delete the day-one deprecations

`color` (`base-chart-element.ts:21`), `bar-color`/`line-color` (`chart.ts:268,278`),
`slice-color` (`pie-chart.ts:39`). A pre-1.0 library should not ship with deprecations already
in it. Note this requires updating your own landing page — `index.html` uses `bar-color` 16
times (lines 89, 192, 227, 266, 314, 340, 417, …).

### 6.6 What is right and should not change

Worth recording so it doesn't get "fixed" later:

- **Bare-ID references** (`palette="status"`, `pattern="danger"`, `zero-fill="x"`) match the
  actual HTML convention — `for=`, `list=`, `form=`, `aria-labelledby` all take bare IDs. The
  `<dc-log-console chart="#my-chart">` selector exception is justified by its multi-chart role.
  *(But `API.md` contradicts itself: line 1341 shows `zero-fill="zero-style"` and line 1347
  shows `zero="auto circle #zero-style"` — same page, same feature, two syntaxes.)*
- **The decimal-percent convention** (0.38 → "38%") matches `Intl.NumberFormat`'s
  `style: 'percent'` and d3-format's `%`. Keep it; the loud flagging in `API.md:854` is the
  right mitigation.
- **Kebab↔camel mapping** is consistent — every multi-word property declares an explicit
  `attribute:` (e.g. `base-chart.ts:186, 341, 374`). No accidental `showvalue`.
- **The `dc-chart` vs `dc-pie-chart` split** follows a real capability boundary: axis-based
  types share a coordinate system and can legitimately combine (see `examples/combo-charts.html`),
  radial/flow types cannot. It's defensible — it's just never stated. One sentence in the
  README fixes it.

---

## 7. Documentation drift

**`CLAUDE.md`'s coverage table is wrong by 4–12×.** It counts only `test/unit/` and is unaware
of the ~8,900-line `test/component/` suite:

| File | CLAUDE.md claims | Measured (stmts) |
|---|---|---|
| `chart-palette.ts` | 8% | **100%** |
| `chart-legend.ts` | 11% | **94.9%** |
| `axis-chart.ts` | 22% | **86.8%** |
| `chart-swatch.ts` | 25% | **91.0%** |
| `chart-axis.ts` | 52% | **92.4%** |

`chart.ts` sits at 83.6% and `base-chart.ts` at 82.3% — respectable. The structural criticisms
in §5 are maintainability arguments, not coverage ones. Correct or delete this table: as written
it would send a returning contributor to duplicate thousands of lines of tests that already
exist.

**Genuinely thin coverage:** `stage-chart.ts` at **70.2% stmts / 61.1% branch over 600
statements** — the worst-covered real code in the repo, a 1,637-line file whose only test is 285
lines covering `zero-*` attributes, with `calculateStageLayout`, `calculateStageSizes`, and
`calculateTextFit` untested. Then `log-console.ts` **0%**, `chart-legend-item.ts` **0%**,
`converters.ts` **28.9%**, `animation.ts` **30.8%**.

The animation number is an artifact: 5 uncaught `rect.animate is not a function` exceptions from
`animation.ts:105` via `base-chart.ts:2239`, because `firstUpdated` fires animations
unconditionally and happy-dom lacks the Web Animations API. Stub `Element.prototype.animate` in
`test/component/setup.ts` (returning `{finished, cancel, play}`) and guard with
`typeof el.animate === 'function'`; that recovers most of it and removes the "may cause false
positive tests" warning.

**`API.md` drifts in both directions:**

| Claim | Reality |
|---|---|
| `stroke-color` on `<dc-funnel-stage>` (:1216) and `<dc-stage>` (:1364) | Not implemented anywhere in `src/` |
| `<dc-legend columns>` default `"1"` (:1419) | Default is `'auto'` (`chart-legend.ts:152`), with a layout branch at :546 |
| `<dc-grid>` | **Zero mentions.** Fully implemented. Users cannot discover grid lines. |
| `<dc-axis>` | 4 of 13 attributes documented. `type`, `min-value`, `max-value`, `range-padding`, `tick-count`, `tick-interval`, `tick-values`, `date-format`, `date-label-format` (`chart-axis.ts:176-250`) are **all undocumented** — setting a Y-axis minimum is a top-5 charting need and it is invisible. |
| `<dc-legend max-width>`, `<dc-title position>`, `max-bubble-radius`/`min-bubble-radius` | Implemented (`chart-legend.ts:157`, `chart-title.ts:92`, `chart.ts:288-292`), undocumented |

**`README.md`** omits area charts and stage charts from its feature list entirely
(`grep -c "dc-stage" README.md` → 0), despite `<dc-stage-chart>` being a first-class element
with 40+ attributes.

**Also:** `tasks/stage-chart-api.md` is a proposal for a chart that has since shipped — delete
it. `CHANGELOG.md`'s `[Unreleased]` section is accurate and matches the last five commits. The
working tree is clean apart from `.claude/settings.local.json`. Only 3 TODO/FIXME markers exist
(`chart.ts:3841`, `stage-chart.ts:1163`, and a doc reference in `errors.ts:39`), and all 20
error codes in `errors.ts` are actually used.

---

## 8. Recommended sequence

**Phase 0 — unblock. ✅ COMPLETE.** §2.1 `sideEffects`, §2.2 Lit externalization + the
three-artifact split, §2.3 the converter fix, §2.5 metadata — all done, plus a bundler smoke
test (`npm run test:package`) guarding them. `npm run prepublishOnly` runs tests → build →
package checks and **exits 0**.

**The package is now publishable.** That is the whole of Phase 0's purpose — nothing further in
this document counts until a stranger can `npm install` or paste a `<script>` tag and get a
chart. Publish before starting Phase 1.

**Phase 1 — breaking changes, while they're still free.** §3.1 parent invalidation · §5.2 hoist
the quartet + route all text through `formatValue()` (fixes §3.3 for free) · §3.2
`computeBarLayout()` · §6.1 `<dc-grid style>` → `stroke-dasharray` · §6.2 strict `show-*`
parsing · §6.3 warn by default · §6.4 naming · §6.5 drop the deprecations · §4.5 optional
`value` on points.

**Phase 2 — the adoption gaps, in dependency order.** §4.1(c) `ResizeObserver` +
px↔viewBox conversion first, since §4.1(a) and (b) depend on it · §4.3 events (cheapest
high-value item in the review) · §4.2 empty/loading states · §4.4 `::part` + `--dc-*` tokens ·
§4.5 gap rendering · §4.6 `values`/`labels` attributes, then `.data`.

**Phase 3 — docs and distribution.** Fix the §7 drift, especially the `<dc-axis>` and
`<dc-grid>` gaps. Ship a custom-elements manifest. Then rewrite the README around the actual
pitch — *charts you can render from any server template, no JSON endpoint, no build step* — with
a Django or Rails template loop emitting `<dc-bar>` as the hero example and an htmx swap as the
follow-up demo. Add `hypermedia`, `no-build`, `server-rendered`, `htmx` to the npm keywords.
Then one good post to r/htmx, r/django, and Lobsters.

Discovery is the binding constraint, not features. Freeze the roadmap — no radar, gauge,
treemap, dual axes, or zoom until a user asks for one.
