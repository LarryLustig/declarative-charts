# Roadmap

Future enhancements planned for the declarative chart library, organized by priority for a v1.0 release.

For completed features, see [CHANGELOG.md](CHANGELOG.md).

---

## Phase 1: Foundation (Critical for Release)

### Accessibility

**Status:** Complete

ARIA labels, auto-insights, keyboard navigation, pattern fills, and high contrast mode have been implemented for all chart types.

---

### Number Formatting

**Status:** Complete

Named presets (`number`, `currency`, `compact`, `percent`) and d3-format subset support. See [CHANGELOG.md](CHANGELOG.md) for details.

---

### Negative Value Support

**Status:** Complete

Bar, line, and bubble charts now support negative values with automatic axis scaling and distinct zero line styling. For all-negative vertical charts, the category axis automatically positions at top (where zero is). Use palettes with `min-value`/`max-value` for positive/negative coloring. See [CHANGELOG.md](CHANGELOG.md) for details.

**Deferred:** Stacked bars with negative segments (waterfall-style) and zero line customization (via future Reference Lines feature)

---

### Axis & Grid Configuration

**Status:** Not Started
**Priority:** Critical

**Problem:** Axes and grids have limited configuration options. The value axis auto-scales with no user control over range or ticks. Grid lines are always shown with hardcoded styling. There's no support for time-based axes. The axis type (value vs label) is inferred rather than explicit.

**Current Behavior:**
- Value axis: auto-scales from 0 (or min negative) to nice maximum
- Grid lines: always shown, `#ddd` color, solid style, 5 divisions
- Zero line: `#666` color when range spans positive/negative (customization deferred to Reference Lines)
- Axis type: inferred from chart orientation (vertical → left=value, bottom=label)
- Time data: treated as text labels with no time-aware spacing

**Design Overview:**

The `<dc-axis>` element gains a `type` attribute and comprehensive configuration options. Grid lines are configured per-axis since they align with that axis's ticks.

**Axis Types:**

| Type | Purpose | Key Attributes |
|------|---------|----------------|
| `value` | Numeric continuous data | `min-value`, `max-value`, `tick-*`, grid attrs |
| `label` | Discrete labels from data elements | `label-interval`, `label-lines` (existing) |
| `time` | Temporal data (dates, times, datetimes) | `date-format`, `date-label-format`, plus value attrs |

Type is inferred if omitted (backward compatible):
- Bar/Line charts: position determines type based on orientation
- Explicit `type` attribute overrides inference

**New Attributes on `<dc-axis>`:**

| Attribute | Applies To | Type | Description |
|-----------|------------|------|-------------|
| `type` | All | `'value' \| 'label' \| 'time'` | Axis type (inferred if omitted) |
| `min-value` | value, time | `number \| 'auto'` | Minimum axis value |
| `max-value` | value, time | `number \| 'auto'` | Maximum axis value |
| `range-padding` | value, time | `string` | Padding beyond data range (e.g., `"10%"`) |
| `tick-count` | value, time | `number` | Approximate number of ticks |
| `tick-interval` | value, time | `number` | Exact interval between ticks |
| `tick-values` | value, time | `string` | Explicit tick positions (comma-separated) |
| `show-grid` | value, time | `boolean` | Show grid lines from this axis (default: true for value) |
| `grid-color` | value, time | `string` | Grid line color (default: `#ddd`) |
| `grid-style` | value, time | `'solid' \| 'dashed' \| 'dotted'` | Grid line style |
| `date-format` | time | `string` | Input date parsing format |
| `date-label-format` | time | `string` | Output label format (e.g., `"MMM d"`, `"HH:mm"`) |

**Existing Attributes (unchanged):**

| Attribute | Applies To | Description |
|-----------|------------|-------------|
| `position` | All | `'left' \| 'right' \| 'top' \| 'bottom' \| 'x' \| 'y'` |
| `label-interval` | label | Interval for showing labels |
| `label-lines` | label | Staggered label lines |
| `value-format` | value | Number format for axis labels |

**Proposed API:**

```html
<!-- Explicit axis types -->
<dc-chart>
  <dc-axis position="left" type="value" min-value="0" max-value="100"></dc-axis>
  <dc-axis position="bottom" type="label" label-interval="2"></dc-axis>
  <dc-bar value="45" label="Q1"></dc-bar>
</dc-chart>

<!-- Inferred types (backward compatible) -->
<dc-chart>
  <dc-axis position="left" min-value="0" max-value="100"></dc-axis>
  <dc-bar value="45" label="Q1"></dc-bar>
</dc-chart>

<!-- Fixed range with tick interval -->
<dc-chart>
  <dc-axis position="left" min-value="0" max-value="100" tick-interval="25"></dc-axis>
  <!-- Shows: 0, 25, 50, 75, 100 -->
</dc-chart>

<!-- Explicit tick values -->
<dc-chart>
  <dc-axis position="left" tick-values="0, 50, 75, 100"></dc-axis>
</dc-chart>

<!-- Auto-range with padding -->
<dc-chart>
  <dc-axis position="left" min-value="auto" max-value="auto" range-padding="10%"></dc-axis>
  <!-- If data ranges 23-87, axis might show 20-95 -->
</dc-chart>

<!-- Grid styling -->
<dc-chart>
  <dc-axis position="left" show-grid grid-color="#eee" grid-style="dashed"></dc-axis>
  <dc-axis position="bottom" show-grid="false"></dc-axis>
</dc-chart>

<!-- Time axis with dates -->
<dc-chart>
  <dc-axis position="bottom" type="time" date-label-format="MMM d"></dc-axis>
  <dc-line>
    <dc-point value="100" label="2024-01-01"></dc-point>
    <dc-point value="150" label="2024-01-15"></dc-point>
    <dc-point value="120" label="2024-02-01"></dc-point>
  </dc-line>
</dc-chart>

<!-- Time axis with clock times -->
<dc-chart>
  <dc-axis position="bottom" type="time" date-label-format="HH:mm"></dc-axis>
  <dc-line>
    <dc-point value="50" label="2024-01-15T09:00:00"></dc-point>
    <dc-point value="75" label="2024-01-15T12:00:00"></dc-point>
    <dc-point value="60" label="2024-01-15T15:00:00"></dc-point>
  </dc-line>
</dc-chart>

<!-- Time axis with Unix timestamps -->
<dc-chart>
  <dc-axis position="bottom" type="time" date-format="timestamp" date-label-format="MMM d"></dc-axis>
  <dc-line>
    <dc-point value="100" label="1704067200"></dc-point>
  </dc-line>
</dc-chart>
```

**Algorithm for Nice Ticks:**

When `tick-count` is specified (or defaulted), calculate nice tick values:

```typescript
function calculateNiceTicks(min: number, max: number, targetCount: number): number[] {
  const range = max - min;
  const roughInterval = range / targetCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
  const residual = roughInterval / magnitude;

  let niceInterval: number;
  if (residual <= 1.5) niceInterval = magnitude;
  else if (residual <= 3) niceInterval = 2 * magnitude;
  else if (residual <= 7) niceInterval = 5 * magnitude;
  else niceInterval = 10 * magnitude;

  const niceMin = Math.floor(min / niceInterval) * niceInterval;
  const niceMax = Math.ceil(max / niceInterval) * niceInterval;

  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax; v += niceInterval) {
    ticks.push(v);
  }
  return ticks;
}
```

**Time Axis Behavior:**

1. **Parsing:** Accepts ISO 8601 strings (`2024-01-15`, `2024-01-15T10:30:00`), Unix timestamps (when `date-format="timestamp"`), or custom formats.

2. **Spacing:** Points positioned proportionally by time, not evenly spaced. Handles gaps in data (weekends, missing days).

3. **Smart Ticks:** Auto-selects appropriate intervals based on range:
   - Hours → tick every hour/2 hours/6 hours
   - Days → tick every day/week
   - Months → tick every month/quarter
   - Years → tick every year

4. **Label Formatting:** Uses `date-label-format` with tokens like `MMM`, `d`, `yyyy`, `HH`, `mm`. Shows context changes (month name when crossing month boundary).

**Grid Line Behavior:**

- Each axis can independently show/hide grid lines
- Grid lines extend across the chart perpendicular to the axis
- For value axis (left/right): horizontal grid lines
- For value axis (top/bottom): vertical grid lines
- Label axes typically don't show grid, but can be enabled

**Implementation Notes:**

1. **Backward Compatibility:**
   - Omitted `type` attribute: infer from position and chart orientation
   - Omitted range attributes: auto-calculate from data (current behavior)
   - Omitted grid attributes: use current defaults

2. **Validation:**
   - `min-value` must be less than `max-value`
   - `tick-interval` must be positive
   - `tick-values` must be within or extend the range
   - Warn if `type="label"` combined with value-axis attributes

3. **Grid Precedence:**
   - If multiple axes could show grid (left + right both `type="value"`), render both
   - Grid lines at same position merge (don't double-draw)

**Related Features:**

- **Reference Lines and Bands** (Phase 3): For zero line customization, target lines, shaded regions
- **Dual Value Axes** (Phase 3): For charts with two independent value scales

---

### npm Publishing

**Status:** Not Started
**Priority:** Critical

**Problem:** The library cannot be installed via npm or loaded from CDN. Users must clone the repo and build manually.

**Requirements:**

1. **Package Configuration**
   - Proper `name`, `version`, `description` in package.json
   - `main`, `module`, `types`, `exports` fields
   - `files` array specifying published files
   - `sideEffects: false` for tree-shaking
   - Peer dependency on `lit` (not bundled)

2. **Build Outputs**
   - ES modules: `dist/declarative-charts.js`
   - UMD bundle: `dist/declarative-charts.umd.cjs`
   - TypeScript declarations: `dist/index.d.ts`
   - CSS (if any): `dist/declarative-charts.css`

3. **CDN Ready**
   - Works with unpkg: `https://unpkg.com/declarative-charts`
   - Works with jsdelivr: `https://cdn.jsdelivr.net/npm/declarative-charts`
   - Include example CDN usage in README

4. **Documentation Files**
   - LICENSE file (MIT)
   - CHANGELOG.md (created)
   - CONTRIBUTING.md

**Proposed package.json Updates:**
```json
{
  "name": "declarative-charts",
  "version": "1.0.0",
  "description": "Create beautiful charts using declarative HTML elements",
  "keywords": ["charts", "web-components", "lit", "declarative", "svg", "visualization"],
  "license": "MIT",
  "author": "Your Name",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/declarative-charts"
  },
  "main": "dist/declarative-charts.umd.cjs",
  "module": "dist/declarative-charts.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/declarative-charts.js",
      "require": "./dist/declarative-charts.umd.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist",
    "LICENSE",
    "README.md"
  ],
  "sideEffects": false,
  "peerDependencies": {
    "lit": "^3.0.0"
  }
}
```

**README CDN Section:**
```html
<!-- Via CDN (includes Lit) -->
<script type="module">
  import 'https://unpkg.com/declarative-charts@1/dist/declarative-charts.js';
</script>

<!-- Or with import map -->
<script type="importmap">
{
  "imports": {
    "lit": "https://unpkg.com/lit@3/index.js",
    "declarative-charts": "https://unpkg.com/declarative-charts@1"
  }
}
</script>
```

**Implementation Notes:**
- Create LICENSE file with MIT license text
- Create CONTRIBUTING.md with contribution guidelines
- Update vite.config.ts to generate proper builds
- Add `prepublishOnly` script to run build
- Add `.npmignore` or use `files` in package.json
- Test with `npm pack` before publishing
- Consider scoped package name (@yourorg/declarative-charts) to avoid conflicts

---

## Phase 2: Core Completeness

### Area Charts

**Status:** Not Started
**Priority:** Important

**Problem:** Area charts (filled line charts) are a very common visualization type that the library doesn't support.

**Requirements:**

1. **Basic Area**
   - Line with filled area below (to zero line or chart bottom)
   - `fill` attribute on `<dc-line>` triggers area mode
   - `fill-opacity` for transparency

2. **Stacked Areas**
   - Multiple `<dc-line>` elements with fills stack on each other
   - `stacked` attribute on chart enables stacking

3. **Gradient Fills**
   - Support vertical gradients (darker at bottom)
   - `fill-start-color` / `fill-end-color` on lines

**Proposed API:**
```html
<!-- Basic area chart -->
<dc-chart>
  <dc-line fill="#4CAF50" fill-opacity="0.3" stroke="#4CAF50">
    <dc-point value="10" label="Jan"></dc-point>
    <dc-point value="25" label="Feb"></dc-point>
    <dc-point value="15" label="Mar"></dc-point>
  </dc-line>
</dc-chart>

<!-- Stacked area chart -->
<dc-chart stacked>
  <dc-line fill="#4CAF50" fill-opacity="0.7" label="Product A">
    <dc-point value="10" label="Q1"></dc-point>
    <dc-point value="20" label="Q2"></dc-point>
  </dc-line>
  <dc-line fill="#2196F3" fill-opacity="0.7" label="Product B">
    <dc-point value="15" label="Q1"></dc-point>
    <dc-point value="25" label="Q2"></dc-point>
  </dc-line>
</dc-chart>

<!-- Area with gradient fill -->
<dc-chart>
  <dc-line fill-start-color="rgba(76, 175, 80, 0.8)" fill-end-color="rgba(76, 175, 80, 0.1)" stroke="#4CAF50">
    ...
  </dc-line>
</dc-chart>
```

---

### Animations

**Status:** Not Started
**Priority:** Important

**Problem:** Charts appear instantly without any visual feedback. Animations improve perceived quality and help users understand data changes.

**Requirements:**

1. **Initial Render Animation**
   - Bars grow from zero
   - Pie slices expand from center or rotate in
   - Lines draw progressively
   - Configurable duration and easing

2. **Data Change Transitions**
   - Smooth transition when values change
   - Elements animate to new positions
   - New elements fade/grow in, removed elements fade/shrink out

3. **Accessibility**
   - Respect `prefers-reduced-motion` media query
   - `animation="none"` attribute to disable
   - Reduced motion: instant transitions or very short duration

4. **Configuration**
   - `animation-duration` - Duration in ms (default: 500)
   - `animation-easing` - Easing function (default: "ease-out")
   - `animation` - Enable/disable or animation type

**Proposed API:**
```html
<!-- Default animation -->
<dc-chart animation>
  <dc-bar value="50" label="A"></dc-bar>
</dc-chart>

<!-- Custom duration and easing -->
<dc-chart animation animation-duration="1000" animation-easing="ease-in-out">
  ...
</dc-chart>

<!-- Disable animation -->
<dc-chart animation="none">
  ...
</dc-chart>

<!-- Specific animation type -->
<dc-pie-chart animation="spin">
  <!-- Pie rotates in -->
</dc-pie-chart>

<dc-chart animation="grow">
  <!-- Bars grow from baseline -->
</dc-chart>
```

**Animation Types by Chart:**
- **Bar Chart**: `grow` (from zero), `slide` (from left/bottom), `fade`
- **Line Chart**: `draw` (progressive line drawing), `fade`
- **Pie Chart**: `spin` (rotate in), `expand` (grow from center), `fade`
- **Funnel Chart**: `cascade` (top-down reveal), `fade`

---

### Empty State Handling

**Status:** Not Started
**Priority:** Important

**Problem:** Charts with no data elements render as empty boxes with axes. There's no indication to users that data is missing or loading.

**Requirements:**

1. **Empty Detection**
   - Detect when no data elements present
   - Detect when all values are zero or hidden

2. **Empty State Display**
   - Show configurable message: "No data available"
   - Optional icon/illustration
   - Maintain chart dimensions

3. **Loading State**
   - `loading` attribute shows loading indicator
   - Skeleton placeholder option

4. **Single Point Handling**
   - Line charts with one point should render the point (not crash)
   - Bar charts with one bar should render centered

**Proposed API:**
```html
<!-- Default empty message -->
<dc-chart>
  <!-- No dc-bar elements -->
  <!-- Shows: "No data available" centered -->
</dc-chart>

<!-- Custom empty message -->
<dc-chart empty-message="No sales data for this period">
  <!-- No data -->
</dc-chart>

<!-- Loading state -->
<dc-chart loading>
  <!-- Shows loading spinner/skeleton -->
</dc-chart>

<!-- Custom loading content -->
<dc-chart loading>
  <dc-loading>Loading chart data...</dc-loading>
</dc-chart>

<!-- Hide when empty instead of showing message -->
<dc-chart hide-when-empty>
  <!-- Element hidden when no data -->
</dc-chart>
```

---

### Error Handling & Validation

**Status:** Partially Implemented (warnings exist for some cases)
**Priority:** Important

**Problem:** Invalid configurations fail silently or produce confusing results. Users need clear feedback about mistakes.

**Requirements:**

1. **Attribute Validation**
   - Validate required attributes (value on bars, etc.)
   - Validate attribute types (numbers, colors, enums)
   - Validate attribute ranges (percentages 0-100, etc.)

2. **Warning System Enhancement**
   - Consistent warning format
   - Unique error codes for documentation
   - Link to documentation in warnings

3. **Common Mistakes**
   - Using `<dc-bar>` in `<dc-pie-chart>` (wrong element type)
   - Missing required children (line without points)
   - Invalid color values
   - Conflicting attributes

4. **Development Mode**
   - Verbose warnings in development
   - Quieter in production (check `process.env.NODE_ENV`)

**Proposed Warning Format:**
```
[declarative-charts] Warning DC001: Invalid value attribute on <dc-bar>.
  Expected: number, Received: "abc"
  Element: <dc-bar value="abc" label="Test">
  Docs: https://docs.example.com/errors/DC001
```

---

### Test Suite

**Status:** In Progress
**Priority:** Important

**Problem:** No automated tests exist. Changes may introduce regressions without detection.

**Current Progress:**
- Vitest configured with coverage reporting
- **Unit tests (13 files, 605 tests):**
  - `format.ts` (82 tests, 99% coverage)
  - `accessibility/insights.ts` (73 tests, 100% coverage)
  - `patterns.ts` (92 tests, 100% coverage)
  - `axis-scales.ts` (47 tests) - scale and padding calculations
  - `base-chart-calc.ts` (30 tests) - converters
  - `chart-fill.ts`, `chart-legend.ts`, `chart-axis.ts`, `chart-palette.ts`, `chart-title.ts`, `chart-swatch.ts`, `base-shape.ts`, `chart-utils.ts`
- **Component tests (9 files, 740 tests):**
  - `chart.test.ts` (170 tests) - bar/line/bubble rendering, events
  - `base-chart.test.ts` (131 tests) - keyboard nav, color utils, padding parsing
  - `pie-chart.test.ts` (88 tests), `funnel-chart.test.ts` (86 tests)
  - `chart-legend.test.ts` (97 tests), `chart-axis.test.ts` (41 tests), `chart-title.test.ts` (46 tests)
  - `chart-swatch.test.ts` (51 tests), `chart-palette.test.ts` (30 tests)
- **Integration tests (2 files, 50 tests):**
  - `dynamic-updates.test.ts` (30 tests)
  - `htmx-integration.test.ts` (20 tests)

**Requirements:**

1. **Unit Tests** ✓
   - ~~Format utilities~~ ✓
   - Date utilities (not started)
   - ~~Color calculations~~ ✓
   - ~~Scale calculations~~ ✓
   - ~~Padding calculations~~ ✓

2. **Component Tests** ✓
   - ~~Element rendering~~ ✓
   - ~~Attribute handling~~ ✓
   - ~~Event handling~~ ✓
   - ~~Slot handling~~ ✓

3. **Integration Tests** ✓
   - ~~Complete chart rendering~~ ✓
   - ~~Dynamic updates~~ ✓
   - ~~htmx-style innerHTML swaps~~ ✓

4. **Visual Regression Tests** ✓
   - ~~Screenshot comparison~~ ✓
   - ~~Detect unintended visual changes~~ ✓
   - Playwright + Chromium configured
   - 15 baseline snapshots covering all chart types

**Test Stack:**
- **Unit Tests**: Vitest (fast, Vite-native)
- **Component Tests**: Vitest + happy-dom
- **Integration Tests**: Vitest + happy-dom
- **Visual Regression**: Playwright + Chromium

**Test Structure:**
```
test/
├── unit/                       # Pure function tests (node environment)
│   ├── format.test.ts
│   ├── insights.test.ts
│   ├── patterns.test.ts
│   └── ...
├── component/                  # DOM-dependent tests (happy-dom)
│   ├── setup.ts
│   ├── chart.test.ts
│   ├── pie-chart.test.ts
│   └── funnel-chart.test.ts
├── integration/                # End-to-end chart rendering (happy-dom) ✓
│   ├── setup.ts
│   ├── dynamic-updates.test.ts
│   └── htmx-integration.test.ts
└── visual/                     # Visual regression (Playwright) ✓
    ├── charts.spec.ts          # Screenshot comparison tests
    ├── fixtures/charts.html    # All chart configurations
    └── charts.spec.ts-snapshots/  # Baseline images
```

**Future: Pipeline Automation**

Tests are currently manual (`npm test`). Future enhancements:
- **Pre-commit hooks** (husky + lint-staged): Run tests before each commit
- **CI/CD** (GitHub Actions): Run tests on push/PR
- **Pre-build gate**: Fail build if tests fail

---

### Label Positioning

**Status:** Not Started
**Priority:** Important

**Problem:** Labels on data elements (bars, points, bubbles) have hardcoded positions. Users cannot control where labels appear or fine-tune their placement.

**Current Behavior:**
- Vertical bars: labels above positive bars, below negative bars
- Horizontal bars: labels right of positive bars, left of negative bars
- Points/Lines: labels always above (y - 10)
- Bubbles: labels always above (y - radius - 8)
- Pie slices: labels inside at calculated label point
- Funnel stages: labels inside, vertically centered

**Design Approach:** Hybrid

Simple cases use a single `label-position` attribute on elements. Complex cases use a `<dc-label>` child element.

**Attribute Retained on Chart Elements:**
- `label-position` - Where to place the label (simple positioning only)

**Default Behavior:**
- Labels show value only (not percent)
- To show percent, customize formatting, or adjust offsets, use `<dc-label>`

**New Element: `<dc-label>`**

For complex label configuration, place a `<dc-label>` child inside the data element. This overrides any `label-position` attribute on the parent.

```html
<!-- Simple: attribute only (shows value at inside-top) -->
<dc-bar value="50" label="Q1" label-position="inside-top"></dc-bar>

<!-- Complex: child element -->
<dc-bar value="50" label="Q1">
  <dc-label position="outside-top" offset-x="5" offset-y="-10" offset-r="15"
            show-value show-percent value-format="currency USD">
  </dc-label>
</dc-bar>

<!-- Hide label entirely -->
<dc-bar value="50" label="Q1">
  <dc-label hidden></dc-label>
</dc-bar>
```

**`<dc-label>` Attributes:**

| Attribute | Type | Description |
|-----------|------|-------------|
| `position` | enum | Where to place the label (see position values below) |
| `offset-x` | length | Horizontal adjustment (positive = right) |
| `offset-y` | length | Vertical adjustment (positive = down, SVG convention) |
| `offset-r` | length | Radial adjustment (positive = away from reference point) |
| `show-value` | boolean | Whether to show the numeric value (default: true) |
| `show-percent` | boolean | Whether to show the percentage (default: false) |
| `value-format` | string | Format string for value display |
| `hidden` | boolean | Hide the label entirely |

Compound syntax supported: `position="outside-top 5 -10 15"` (position + x, y, r offsets)

**Offset Units:**
- Plain numbers: viewBox units
- Percentages: relative to element bounding box

**Radial Offset Reference Points:**
- Bars: away from zero line (in direction of value)
- Pie charts: away from pie center
- Bubbles: away from bubble center

**Position Values - Bars:**

Bar positions use relative semantics where "top" means "away from the zero/reference line" and "bottom" means "toward the zero line". This provides consistent behavior for positive and negative values in both orientations.

| Position | Meaning |
|----------|---------|
| `inside-top` | Inside bar, away from zero (DEFAULT) |
| `inside-center` | Inside bar, centered |
| `inside-bottom` | Inside bar, toward zero |
| `outside-top` | Outside bar, beyond value end |
| `outside-bottom` | Outside bar, toward zero |

```
Positive vertical bar:          Negative vertical bar:

   "outside-top"                ─────────────── zero
  ┌───────────┐                 ┌───────────┐
  │inside-top │                 │inside-btm │  (toward zero)
  │inside-ctr │                 │inside-ctr │
  │inside-btm │  (toward zero)  │inside-top │  (away from zero)
  └───────────┘                 └───────────┘
─────────────── zero               "outside-top"
```

**Position Values - Points/Lines:**

| Position | Meaning |
|----------|---------|
| `above` | Above the point (DEFAULT) |
| `above-left` | Above and left-aligned |
| `above-right` | Above and right-aligned |
| `below` | Below the point |
| `below-left` | Below and left-aligned |
| `below-right` | Below and right-aligned |
| `left` | Left of the point |
| `right` | Right of the point |
| `center` | Centered on the point |

**Position Values - Bubbles:**

Same as Points, plus:

| Position | Meaning |
|----------|---------|
| `inside` | Centered inside the bubble |

**Position Values - Pie Slices:**

| Position | Meaning |
|----------|---------|
| `inside` | Inside the slice (DEFAULT) |
| `outside` | Outside the slice, along radial line |

**Position Values - Funnel Stages:**

| Position | Meaning |
|----------|---------|
| `inside` | Inside the stage (DEFAULT) |
| `outside-left` | Outside, to the left |
| `outside-right` | Outside, to the right |

**Implementation Notes:**

1. **Padding Calculation Impact:** The current chart padding system assumes certain elements always have inside labels (bars) and others always have outside labels (points). This assumption will need to be revised to inspect actual label positions and reserve appropriate padding space. Charts with `outside-*` bar labels will need additional padding; charts with `inside` point/bubble labels may need less.

2. **Backward Compatibility:**
   - Bar default changes from outside (above/below) to `inside-top` - breaking change
   - `show-value` and `show-percent` attributes on elements will be deprecated in favor of `<dc-label>`

3. **Collision Detection (Future):** This feature does not include automatic collision avoidance. Labels may overlap if positions are not carefully chosen.

---

### Label Font Size

**Status:** Not Started
**Priority:** Nice-to-Have

**Problem:** Label font sizes are hardcoded (14 for bars, 12 for points/bubbles). Users cannot customize without CSS overrides.

**Proposed API:**
```html
<!-- Via dc-label element -->
<dc-bar value="50" label="Q1">
  <dc-label font-size="16"></dc-label>
</dc-bar>

<!-- Chart-level default -->
<dc-chart label-font-size="14">
  ...
</dc-chart>
```

**Notes:**
- Value in viewBox units (unitless, like other SVG text attributes)
- `<dc-label font-size>` overrides chart-level `label-font-size`

---

### Label Rotation

**Status:** Not Started
**Priority:** Nice-to-Have

**Problem:** Labels are always horizontal. For dense charts or long labels, rotation would improve readability.

**Proposed API:**
```html
<!-- Via dc-label element -->
<dc-bar value="50" label="Long Category Name">
  <dc-label rotate="45"></dc-label>
</dc-bar>

<!-- Negative rotation -->
<dc-bar value="50" label="Category">
  <dc-label rotate="-45"></dc-label>
</dc-bar>
```

**Notes:**
- Rotation in degrees, clockwise from horizontal
- Rotation anchor point depends on `position`
- Future consideration: `rotate="auto"` for automatic rotation based on available space

---

## Phase 3: Feature Parity

### Custom Legends

**Status:** Planned
**Priority:** Important

**Problem:** The current legend auto-generates entries from data elements. This doesn't work well for charts using semantic coloring where the same color appears on multiple bars with different labels.

**Example Problem:**
```html
<!-- Current: Legend shows 4 entries with redundant colors -->
<dc-chart>
  <dc-bar value="85" fill="#4CAF50" label="Engineering"></dc-bar>  <!-- green = above target -->
  <dc-bar value="78" fill="#FF9800" label="Marketing"></dc-bar>    <!-- orange = near target -->
  <dc-bar value="92" fill="#4CAF50" label="Sales"></dc-bar>        <!-- green = above target -->
  <dc-bar value="72" fill="#F44336" label="Operations"></dc-bar>   <!-- red = below target -->
  <dc-legend></dc-legend>
  <!-- Legend shows: Engineering (green), Marketing (orange), Sales (green), Operations (red) -->
  <!-- User wants: Above Target (green), Near Target (orange), Below Target (red) -->
</dc-chart>
```

**Proposed API:**
```html
<dc-chart>
  <dc-bar value="85" fill="#4CAF50" label="Engineering"></dc-bar>
  <dc-bar value="78" fill="#FF9800" label="Marketing"></dc-bar>
  <dc-bar value="92" fill="#4CAF50" label="Sales"></dc-bar>
  <dc-bar value="72" fill="#F44336" label="Operations"></dc-bar>
  <dc-legend>
    <dc-legend-item fill="#4CAF50" label="Above Target"></dc-legend-item>
    <dc-legend-item fill="#FF9800" label="Near Target"></dc-legend-item>
    <dc-legend-item fill="#F44336" label="Below Target"></dc-legend-item>
  </dc-legend>
</dc-chart>
```

**Behavior:**
- When `<dc-legend-item>` children are present, use only those items (no auto-generation)
- When no children, fall back to current auto-generation behavior
- Support both `fill` (for bars/shapes) and `stroke` (for lines) attributes
- Optional `shape` attribute: `"square"` (default), `"circle"`, `"line"`

---

### Reference Lines and Bands

**Status:** Not Started
**Priority:** Nice-to-Have

**Problem:** Users cannot add reference lines (e.g., target value, average) or shaded regions (e.g., "danger zone") to charts. This feature will also provide a way to customize the zero line appearance when negative values are present.

**Proposed API:**
```html
<!-- Horizontal reference line -->
<dc-chart>
  <dc-reference-line value="75" label="Target" stroke="#F44336" stroke-dasharray="5,5"></dc-reference-line>
  <dc-bar value="65" label="Q1"></dc-bar>
  <dc-bar value="80" label="Q2"></dc-bar>
</dc-chart>

<!-- Custom zero line styling (overrides default) -->
<dc-chart>
  <dc-reference-line value="0" stroke="#000" stroke-width="2"></dc-reference-line>
  <dc-bar value="50" label="Profit"></dc-bar>
  <dc-bar value="-30" label="Loss"></dc-bar>
</dc-chart>

<!-- Multiple reference lines -->
<dc-chart>
  <dc-reference-line value="50" label="Min" stroke="#FF9800"></dc-reference-line>
  <dc-reference-line value="80" label="Max" stroke="#4CAF50"></dc-reference-line>
  ...
</dc-chart>

<!-- Reference band (shaded region) -->
<dc-chart>
  <dc-reference-band min-value="40" max-value="60" fill="#FF980033" label="Target Range"></dc-reference-band>
  ...
</dc-chart>

<!-- Vertical reference line (on category axis) -->
<dc-chart>
  <dc-reference-line position="Q3" label="Launch Date" stroke="#2196F3"></dc-reference-line>
  <dc-bar value="50" label="Q1"></dc-bar>
  <dc-bar value="60" label="Q2"></dc-bar>
  <dc-bar value="90" label="Q3"></dc-bar>
  <dc-bar value="120" label="Q4"></dc-bar>
</dc-chart>
```

---

### Dual Value Axes

**Status:** Not Started
**Priority:** Nice-to-Have (Post-1.0)

**Problem:** Some visualizations require two independent value scales (e.g., revenue in dollars on left axis, units sold on right axis).

**Requirements:**

1. **Independent Scales**
   - Left and right axes can both be `type="value"` with different ranges
   - Each axis calculates its own nice range and ticks

2. **Data Binding**
   - Data elements specify which axis they bind to: `axis="left"` or `axis="right"`
   - Default: left (or bottom for horizontal charts)

3. **Grid Lines**
   - Only one axis should show grid (to avoid visual clutter)
   - Default: primary (left/bottom) axis shows grid

4. **Legend**
   - Legend indicates which axis each series uses

**Proposed API:**

```html
<dc-chart>
  <dc-axis position="left" type="value" min-value="0" max-value="1000000"
           value-format="currency USD compact" show-grid>
    <dc-title>Revenue</dc-title>
  </dc-axis>
  <dc-axis position="right" type="value" min-value="0" max-value="500"
           value-format="number 0" show-grid="false">
    <dc-title>Units Sold</dc-title>
  </dc-axis>
  <dc-line axis="left" label="Revenue" stroke="#2196F3">
    <dc-point value="500000" label="Q1"></dc-point>
    <dc-point value="750000" label="Q2"></dc-point>
  </dc-line>
  <dc-line axis="right" label="Units" stroke="#4CAF50">
    <dc-point value="200" label="Q1"></dc-point>
    <dc-point value="350" label="Q2"></dc-point>
  </dc-line>
  <dc-legend></dc-legend>
</dc-chart>
```

**Implementation Notes:**

- Requires refactoring `getValueAxisPosition()` to support multiple value axes
- Data elements need new `axis` attribute
- Scale calculations become per-axis rather than chart-wide
- Consider whether bars can use dual axes (grouped bars with different scales?)

---

### More Chart Types

**Status:** Not Started
**Priority:** Nice-to-Have (Post-1.0)

**Scatter/XY Plot:**
```html
<dc-chart type="scatter">
  <dc-point x="10" y="20" label="A"></dc-point>
  <dc-point x="15" y="35" label="B"></dc-point>
  <dc-point x="25" y="30" label="C"></dc-point>
</dc-chart>
```

**Radar/Spider Chart:**
```html
<dc-radar-chart>
  <dc-radar-axis label="Speed"></dc-radar-axis>
  <dc-radar-axis label="Power"></dc-radar-axis>
  <dc-radar-axis label="Range"></dc-radar-axis>
  <dc-radar-series label="Model A" values="80, 60, 90"></dc-radar-series>
  <dc-radar-series label="Model B" values="70, 80, 60"></dc-radar-series>
</dc-radar-chart>
```

**Gauge Chart:**
```html
<dc-gauge-chart min="0" max="100" value="73">
  <dc-title>Performance Score</dc-title>
  <dc-gauge-zone min="0" max="40" fill="#F44336" label="Poor"></dc-gauge-zone>
  <dc-gauge-zone min="40" max="70" fill="#FF9800" label="Average"></dc-gauge-zone>
  <dc-gauge-zone min="70" max="100" fill="#4CAF50" label="Good"></dc-gauge-zone>
</dc-gauge-chart>
```

---

### Tooltip/Popup Customization

**Status:** Not Started
**Priority:** Nice-to-Have

**Problem:** Popup styling is fixed. Users want custom positioning, animations, and styling.

**Proposed API:**
```html
<!-- Popup positioning -->
<dc-chart popup-position="top">  <!-- top, bottom, left, right, cursor -->
  ...
</dc-chart>

<!-- CSS custom properties for styling -->
<style>
  dc-chart {
    --dc-popup-background: #333;
    --dc-popup-color: white;
    --dc-popup-border-radius: 8px;
    --dc-popup-padding: 12px 16px;
    --dc-popup-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
</style>
```

---

### CSS Custom Properties (Theming)

**Status:** Not Started
**Priority:** Nice-to-Have

**Problem:** No centralized theming system. Users must set colors on each chart individually.

**Proposed API:**
```css
:root {
  /* Chart colors */
  --dc-color-primary: #2196F3;
  --dc-color-secondary: #4CAF50;
  --dc-color-palette: #2196F3, #4CAF50, #FF9800, #9C27B0;

  /* Typography */
  --dc-font-family: system-ui, sans-serif;
  --dc-title-font-size: 24;
  --dc-title-font-weight: 600;
  --dc-label-font-size: 12;

  /* Axis */
  --dc-axis-color: #666;
  --dc-grid-color: #eee;

  /* Backgrounds */
  --dc-background: white;
}
```

---

### Zoom and Pan

**Status:** Not Started
**Priority:** Nice-to-Have (Post-1.0)

**Problem:** Large datasets don't fit well in fixed viewport. Users need to zoom and pan.

**Proposed API:**
```html
<dc-chart zoomable pannable>
  <!-- Many data points -->
</dc-chart>

<dc-chart zoom-x zoom-y min-zoom="0.5" max-zoom="10">
  ...
</dc-chart>
```

---

## Documentation & Ecosystem

### Documentation Improvements

**Status:** Partially Complete
**Priority:** Important for 1.0

**Required:**
- [ ] LICENSE file (MIT text)
- [x] CHANGELOG.md
- [ ] CONTRIBUTING.md
- [ ] Browser compatibility table in README
- [ ] Bundle size documentation
- [ ] Performance guidelines

**Nice-to-Have:**
- [ ] Documentation website (VitePress or Docusaurus)
- [ ] Interactive playground (CodeSandbox templates)
- [ ] Framework integration guides (React, Vue, Angular)
- [ ] Migration guide (if API changes before 1.0)

---

### Framework Integration Examples

**Status:** Not Started
**Priority:** Nice-to-Have

**React:**
```jsx
// Works directly since Web Components work in React
function MyChart({ data }) {
  return (
    <dc-chart width="600" height="400">
      {data.map(item => (
        <dc-bar key={item.id} value={item.value} label={item.label}></dc-bar>
      ))}
    </dc-chart>
  );
}
```

**Vue:**
```vue
<template>
  <dc-chart width="600" height="400">
    <dc-bar v-for="item in data" :key="item.id" :value="item.value" :label="item.label"></dc-bar>
  </dc-chart>
</template>
```

**Angular:**
```typescript
// Add CUSTOM_ELEMENTS_SCHEMA to module
@Component({
  template: `
    <dc-chart width="600" height="400">
      <dc-bar *ngFor="let item of data" [attr.value]="item.value" [attr.label]="item.label"></dc-bar>
    </dc-chart>
  `
})
```

---

## Version History

| Version | Status | Key Features |
|---------|--------|--------------|
| 0.x | Current | Bar, Line, Bubble, Pie, Funnel charts; Legends; Titles; Popups; Palettes; Accessibility (ARIA, keyboard nav, patterns, high contrast); Number formatting; Negative value support |
| 1.0 | Planned | Axis & grid configuration (value/label/time types, range control, tick control, grid styling); npm publish |
| 1.x | Future | Area charts; Animations; Label positioning; More chart types; Dual value axes |
