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

**Status:** Complete

Comprehensive axis and grid configuration implemented via `<dc-axis>` and `<dc-grid>` elements. Includes axis types (value/label/time), range control (min-value, max-value, range-padding), tick configuration (tick-count, tick-interval, tick-values), and grid styling via nested `<dc-grid>` element. See [API.md](API.md) for full documentation.

**Deferred:** Time axis proportional spacing and smart tick intervals (Phase 3)

---

### npm Publishing

**Status:** Complete

Package configured for npm publishing with:
- ES modules + UMD bundle + TypeScript declarations
- `prepublishOnly` script runs tests and build
- LICENSE (MIT) and CONTRIBUTING.md included
- Lit bundled for simpler CDN usage (~70KB gzipped)

**To publish:** `npm publish` (after setting repository URLs and author in package.json)

---

### Test Suite

**Status:** Complete
**Priority:** Critical

Comprehensive test coverage implemented across unit, component, integration, and visual regression tests.

**Current Coverage:**
- **Unit tests (13 files, 605 tests):** format.ts (99%), insights.ts (100%), patterns.ts (100%), scale/padding calculations, base-shape, chart elements
- **Component tests (9 files, 740 tests):** Chart rendering, keyboard nav, all chart types (pie, funnel), legend/axis/title/swatch/palette
- **Integration tests (2 files, 50 tests):** Dynamic updates, htmx-style innerHTML swaps
- **Visual regression (15 baseline snapshots):** All chart types via Playwright + Chromium

**Test Stack:**
- **Unit/Component/Integration**: Vitest + happy-dom
- **Visual Regression**: Playwright + Chromium

**Deferred:** Date utilities, CI/CD pipeline automation (pre-commit hooks, GitHub Actions)

---

## Phase 2: Core Completeness

### Area Charts

**Status:** Complete
**Priority:** Important

**Problem:** Area charts (filled line charts) are a very common visualization type that the library doesn't support.

**Implementation:**

1. **Basic Area**
   - New `<dc-area>` element for filled area charts
   - Areas extend from data points down to the zero line
   - `fill-opacity` for transparency (default: 0.5)
   - Full pattern fill support

2. **Stacked Areas**
   - Multiple `<dc-area>` elements stack by default
   - `overlapping` attribute on chart disables stacking for comparisons
   - Uses cumulative baselines for proper stacking

3. **Curve Fitting**
   - All curve-fit methods supported: linear, smooth, monotone, step
   - Inherits from chart-level `curve-fit` if not specified

**Note:** Gradient fills deferred to future enhancement.

**API:**
```html
<!-- Basic area chart -->
<dc-chart>
  <dc-area fill="#4CAF50" label="Revenue">
    <dc-point value="10" label="Jan"></dc-point>
    <dc-point value="25" label="Feb"></dc-point>
    <dc-point value="15" label="Mar"></dc-point>
  </dc-area>
</dc-chart>

<!-- Stacked area chart (default) -->
<dc-chart>
  <dc-area fill="#4CAF50" label="Product A">
    <dc-point value="10" label="Q1"></dc-point>
    <dc-point value="20" label="Q2"></dc-point>
  </dc-area>
  <dc-area fill="#2196F3" label="Product B">
    <dc-point value="15" label="Q1"></dc-point>
    <dc-point value="25" label="Q2"></dc-point>
  </dc-area>
</dc-chart>

<!-- Overlapping areas for comparison -->
<dc-chart overlapping>
  <dc-area fill="#4CAF50" fill-opacity="0.3" label="2023">...</dc-area>
  <dc-area fill="#2196F3" fill-opacity="0.3" label="2024">...</dc-area>
</dc-chart>
```

---

### Animations

**Status:** Phase 1 Complete
**Priority:** Important

**Problem:** Charts appear instantly without any visual feedback. Animations improve perceived quality and help users understand data changes.

**Current API (Phase 1):**
```html
<!-- Enable animation (default duration 300ms) -->
<dc-chart animations>
  <dc-bar value="50" label="A"></dc-bar>
</dc-chart>

<!-- Custom duration -->
<dc-chart animations="500ms">...</dc-chart>
<dc-chart animations="0.5s">...</dc-chart>
```

**Architecture - Isolation from Core:**

Animation code is a separate layer that doesn't modify core rendering logic:

```
┌─────────────────────────────────────────────┐
│              Chart Component                │
│  ┌─────────────────────────────────────┐   │
│  │     Core Rendering (unchanged)       │   │
│  │     - renderChart() returns SVG      │   │
│  │     - Pure, stateless transforms     │   │
│  └─────────────────────────────────────┘   │
│                    │                        │
│                    ▼                        │
│  ┌─────────────────────────────────────┐   │
│  │     Animation Layer (optional)       │   │
│  │     - Intercepts after first render  │   │
│  │     - Uses Web Animations API        │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Implementation Files:**
- `src/animation.ts` - All animation logic (~430 lines)
- Minimal changes to `base-chart.ts` - `animations` property and `firstUpdated()` hook

**Phased Implementation:**

| Phase | Scope | Status | Lines |
|-------|-------|--------|-------|
| **Phase 1** | Entry animations | ✅ Complete | ~430 |
| **Phase 2** | Value change transitions | Not Started | ~400 est |
| **Phase 3** | Path morphing (lines/areas) | Not Started | ~300 est |

**Phase 1: Entry Animations** ✅
- Bars: grow from baseline (scaleY for vertical, scaleX for horizontal)
- Lines: draw along path (stroke-dasharray/dashoffset)
- Areas: fade in with subtle vertical grow
- Pie slices: fade in sequentially (no scale to preserve donut holes)
- Bubbles/Points: scale up with overshoot easing
- Funnel/Stage: cascade in from left
- Uses Web Animations API (WAAPI), no dependencies
- Respects `prefers-reduced-motion`
- Staggered timing (30ms between elements)

**Phase 2: Value Change Transitions** (Future)
- Snapshot/compare pattern captures element state before render
- WAAPI animates bar heights, positions
- Add/remove elements fade in/out
- Element identity via `label` or `key` attribute

**Phase 3: Path Morphing** (Future)
- Line and area path interpolation
- Consider d3-interpolate-path (~5kb) or custom linear interpolation
- Handle different point counts gracefully

**Accessibility:**
- Respects `prefers-reduced-motion` media query automatically
- `animations="false"` to disable explicitly
- Documentation includes OS settings for troubleshooting

**Technical Notes:**
- Uses `data-shape-index` attributes already on elements for targeting
- CSS classes `line-path` and `area-path` added for animation selectors
- WAAPI supports `.cancel()` for interrupted animations
- CSS transforms are GPU-accelerated for performance

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

### Label Positioning

**Status:** Complete (basic), Future enhancement pending (`<dc-label>` child element)
**Priority:** Important

**Problem:** Labels on data elements (bars, points, bubbles) have hardcoded positions. Users cannot control where labels appear or fine-tune their placement.

**Completed - Display Control:**
- `show-value` attribute on all data elements (chart-level and element-level)
- `show-percent` attribute on all data elements (chart-level and element-level)
- `value-format` per-element override
- Threshold-based conditional display (e.g., `show-value="100"`, `show-label="5%"`)
- Inheritance hierarchy: element → parent → chart → default

See [API.md](API.md) "Controlling Labels, Values, and Percentages" section for full documentation.

**Completed - Positional Control:**
- `label-position` attribute on all chart types with element-specific position values
- `label-offset-x`, `label-offset-y`, `label-offset-r` for fine-tuning
- Cascading inheritance: element → parent (line) → chart → default
- Bars: 6 positions (outside, inside-top, inside-center, inside-bottom, outside-top, outside-bottom)
- Points/Lines: 9 positions (above, above-left, above-right, below, below-left, below-right, left, right, center)
- Bubbles: 10 positions (all point positions plus inside)
- Pie slices: 2 positions (inside, outside)
- Funnel stages: 3 positions (inside, outside-left, outside-right)
- Stage chart stages: 5 positions (inside, outside-left, outside-right, above, below)

See [API.md](API.md) "Label Positioning" section for full documentation.

**Completed - Label Fill Color (`label-fill`):**
- `label-fill` attribute for controlling label text color
- Defaults to `"auto"` which calculates optimal contrast based on position:
  - Labels inside shapes: contrasts against shape fill
  - Labels outside shapes: uses dark text for chart background
- Uses geometric hit-testing to determine inside/outside status
- Can be overridden with any CSS color value

**Future Enhancement - Label Backdrop and Stroke:**

For labels that span multiple backgrounds (e.g., partially inside and outside a shape) or need additional emphasis, a backdrop and stroke system may be added:

```html
<!-- Backdrop for readability -->
<dc-bar value="50" label="Sales">
  <dc-label backdrop backdrop-color="white" backdrop-opacity="0.8" backdrop-padding="4"></dc-label>
</dc-bar>

<!-- Text stroke for contrast -->
<dc-bar value="50" label="Sales">
  <dc-label stroke="white" stroke-width="2"></dc-label>
</dc-bar>

<!-- Combined approach -->
<dc-chart label-stroke="white" label-stroke-width="2">
  ...
</dc-chart>
```

This enhancement would provide:
- `label-backdrop` (boolean) - Add semi-transparent background behind label
- `label-backdrop-color` - Backdrop fill color (default: contrasting color)
- `label-backdrop-opacity` - Backdrop transparency (default: 0.8)
- `label-backdrop-padding` - Padding around text (default: 4)
- `label-stroke` - Text outline color for "halo" effect
- `label-stroke-width` - Outline width (default: 2)

Currently deferred as `label-fill="auto"` handles most cases. Backdrop/stroke useful for:
- Labels spanning shape boundaries
- Low-contrast fill colors
- Complex gradient or pattern backgrounds

**Future Enhancement - `<dc-label>` Child Element:**

For complex label configuration, a `<dc-label>` child element may be added in the future. This would allow more advanced customization beyond what attributes provide. Currently deferred to keep the initial implementation simple.

**Attribute Retained on Chart Elements:**
- `label-position` - Where to place the label (simple positioning only)

**New Element: `<dc-label>`**

For complex label configuration, place a `<dc-label>` child inside the data element. This overrides any `label-position` attribute on the parent.

```html
<!-- Simple: attribute only (shows value at inside-top) -->
<dc-bar value="50" label="Q1" label-position="inside-top"></dc-bar>

<!-- Complex: child element -->
<dc-bar value="50" label="Q1">
  <dc-label position="outside-top" offset-x="5" offset-y="-10" offset-r="15">
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
   - Existing `show-value`, `show-percent`, and `value-format` attributes remain on elements (no deprecation)

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

**Status:** ✅ Complete
**Priority:** Important

New `<dc-legend-item>` element for defining custom legend entries:

```html
<dc-legend>
  <dc-legend-item fill="#4CAF50" label="Above Target"></dc-legend-item>
  <dc-legend-item fill="#FF9800" label="Near Target"></dc-legend-item>
  <dc-legend-item fill="#F44336" label="Below Target"></dc-legend-item>
</dc-legend>
```

**Features:**
- Custom items completely replace auto-generated legend items
- Supports `fill`, `stroke`, `stroke-dasharray`, `shape`, `pattern`, and `value` attributes
- Items with `value` attribute can display values and percentages
- Items without `value` are treated as dimensionless (label-only)
- Shape defaults to "line" when only stroke is set

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

**Treemap:**
```html
<dc-treemap-chart>
  <dc-treemap-node value="100" label="Category A" fill="#4CAF50">
    <dc-treemap-node value="60" label="Sub A1"></dc-treemap-node>
    <dc-treemap-node value="40" label="Sub A2"></dc-treemap-node>
  </dc-treemap-node>
  <dc-treemap-node value="80" label="Category B" fill="#2196F3"></dc-treemap-node>
</dc-treemap-chart>
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

### Responsive SVG Mode

**Status:** Not Started
**Priority:** Nice-to-Have (Post-1.0)

**Problem:** Charts have fixed pixel dimensions. Users want charts that fill their container and scale responsively.

**Requirements:**

1. **Container-Filling Mode**
   - `responsive` attribute sets `width="100%"` with `viewBox` preservation
   - Chart scales to fill container while maintaining aspect ratio

2. **Popup Positioning Fix**
   - Current popup positioning assumes 1:1 pixel mapping
   - Must account for SVG scaling via CTM (Current Transformation Matrix)
   - Use `getScreenCTM()` to convert SVG coordinates to screen coordinates

**Proposed API:**
```html
<!-- Fixed size (current behavior) -->
<dc-chart width="600" height="400">...</dc-chart>

<!-- Responsive - fills container, maintains 600:400 aspect ratio -->
<dc-chart width="600" height="400" responsive>...</dc-chart>
```

---

### Null/Gap Handling in Lines

**Status:** Not Started
**Priority:** Nice-to-Have (Post-1.0)

**Problem:** Line charts have no way to represent missing data points. All points are connected regardless of gaps in the data.

**Requirements:**

1. **Null Values**
   - `value="null"` or omitted value creates a gap in the line
   - Line breaks at gap, resumes at next valid point

2. **Gap Visualization Options**
   - `gap-style="break"` - Line breaks (default)
   - `gap-style="dashed"` - Dashed line across gap
   - `gap-style="zero"` - Treat null as zero

**Proposed API:**
```html
<dc-chart gap-style="break">
  <dc-line>
    <dc-point value="10" label="Jan"></dc-point>
    <dc-point value="null" label="Feb"></dc-point>  <!-- Gap -->
    <dc-point value="25" label="Mar"></dc-point>
  </dc-line>
</dc-chart>
```

---

### Export Options

**Status:** Partially Complete (SVG export exists)
**Priority:** Nice-to-Have (Post-1.0)

**Current:** `chart.downloadSvg(filename)` method exports SVG files.

**Problem:** Users also need PNG export and print-optimized rendering.

**Requirements:**

1. **PNG Export**
   - `chart.downloadPng(filename, scale?)` method
   - Uses canvas to rasterize SVG
   - Optional scale factor for high-DPI output

2. **Print Styles**
   - `@media print` CSS for optimized rendering
   - Remove interactive elements (popups)
   - Ensure colors print well (consider `print-colors` attribute)

**Proposed API:**
```javascript
// PNG export at 2x resolution
chart.downloadPng('my-chart', 2);

// PNG with options
chart.downloadPng('my-chart', { scale: 2, background: 'white' });
```

```html
<!-- Print-friendly colors -->
<dc-chart print-colors="grayscale">...</dc-chart>
```

---

## Documentation & Ecosystem

### Documentation Improvements

**Status:** Complete
**Priority:** Important for 1.0

**Required:**
- [x] LICENSE file (MIT text)
- [x] CHANGELOG.md
- [x] CONTRIBUTING.md
- [x] Browser compatibility table in README
- [x] Bundle size documentation
- [x] Performance guidelines

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
