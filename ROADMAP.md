# Roadmap

Future enhancements planned for the declarative chart library, organized by priority for a v1.0 release.

---

## Phase 1: Foundation (Critical for Release)

### Accessibility

**Status:** Partially Complete (Phase A done)
**Priority:** Critical

**Problem:** The library renders SVG charts without proper accessibility attributes, making them unusable for screen reader users and inaccessible via keyboard navigation.

#### Completed (Phase A)

The following accessibility features have been implemented:

1. **ARIA Labels on Charts** ✓
   - `role="img"` added to the root SVG element
   - `aria-label` attribute with chart type and title (e.g., "Bar chart: Sales Data")
   - `aria-describedby` pointing to a `<desc>` element inside the SVG
   - Auto-generated descriptions when no explicit description provided

2. **Auto-Insights (Intelligent Description Generation)** ✓
   - Automatically analyzes chart data to generate meaningful descriptions
   - Goes beyond raw statistics to describe trends, comparisons, and patterns
   - Implemented for all chart types: bar, line, bubble, pie, funnel
   - `aria-insights` attribute controls insight level: `'auto'` (default), `'basic'`, `'none'`
   - `aria-label` and `aria-description` attributes for manual overrides

3. **Screen Reader Support** ✓
   - SVG `<desc>` element contains full chart description
   - Charts announce type, title, data summary, and insights
   - Example: "4 bars, values from 38 to 95. Q4 highest at 95; Q3 lowest at 38"

**Files created/modified:**
- `src/accessibility/insights.ts` - Statistical analysis functions
- `src/accessibility/index.ts` - Accessibility module exports
- `src/base-chart.ts` - ARIA properties and description generation
- `src/chart.ts`, `src/pie-chart.ts`, `src/funnel-chart.ts` - Chart-specific `getInsights()` implementations
- `examples/accessibility.html` - Comprehensive examples and screen reader testing guide

#### Remaining (Phase B - Future)

The following features are deferred for future implementation:

1. **Keyboard Navigation**
   - Interactive elements (bars with hrefs, popup triggers) must be focusable
   - Tab order should follow logical reading order
   - Enter/Space to activate links and click-triggered popups
   - Escape to close popups
   - Arrow keys to navigate between data elements within a chart

2. **High Contrast Support**
   - Respect `prefers-contrast: high` media query
   - Ensure sufficient color contrast ratios (WCAG AA minimum)
   - Provide `high-contrast` attribute to force high contrast mode
   - Consider pattern fills as alternative to color-only differentiation

---

### Number Formatting

**Status:** Not Started
**Priority:** Critical

**Problem:** Values display as raw numbers (e.g., "1234567.89"). Users need formatted output like "1,234,567.89", "$1.2M", or "45.5%".

**Requirements:**

1. **Thousand Separators**
   - Locale-aware formatting (1,234 vs 1.234)
   - Default to user's locale

2. **Currency Formatting**
   - Currency symbol placement ($100 vs 100$)
   - Decimal places control

3. **Abbreviations**
   - K (thousands), M (millions), B (billions)
   - Configurable threshold

4. **Percentage Formatting**
   - Decimal places control (45% vs 45.5% vs 45.50%)

5. **Custom Formats**
   - Format string or function support

**Proposed API:**
```html
<!-- Chart-level formatting (applies to all values) -->
<dc-chart value-format="$,.2f">
  <dc-bar value="1234567.89" label="Revenue"></dc-bar>  <!-- Shows: $1,234,567.89 -->
</dc-chart>

<!-- Abbreviations -->
<dc-chart value-format="$.2s">
  <dc-bar value="1234567" label="Revenue"></dc-bar>  <!-- Shows: $1.2M -->
</dc-chart>

<!-- Element-level override -->
<dc-chart value-format=",.0f">
  <dc-bar value="1500" label="Units"></dc-bar>  <!-- Shows: 1,500 -->
  <dc-bar value="2300.50" label="Special" value-format="$,.2f"></dc-bar>  <!-- Shows: $2,300.50 -->
</dc-chart>

<!-- Percentage formatting -->
<dc-pie-chart percent-format=".1%">
  <dc-pie-slice value="45" label="A"></dc-pie-slice>  <!-- Shows: 45.0% instead of 45% -->
</dc-pie-chart>

<!-- Axis value formatting -->
<dc-chart>
  <dc-axis position="left" value-format="$,.0f"></dc-axis>
  ...
</dc-chart>
```

**Format String Syntax:**
Use d3-format compatible syntax for familiarity:
- `,` - Thousand separator
- `.Nf` - N decimal places (fixed)
- `.Ns` - N significant digits with SI prefix (K, M, G)
- `$` - Currency prefix
- `%` - Multiply by 100 and add % suffix

Common presets:
- `",.0f"` → 1,234
- `",.2f"` → 1,234.56
- `"$,.2f"` → $1,234.56
- `".2s"` → 1.2K, 1.2M
- `"$.2s"` → $1.2M
- `".1%"` → 45.5%

**Implementation Notes:**
- Create `src/format.ts` utility module
- Implement subset of d3-format (don't need full library)
- Add `valueFormat` and `percentFormat` properties to `BaseChart`
- Add `valueFormat` property to shape elements for override
- Add `valueFormat` property to `ChartAxis` for axis labels
- Modify `formatValue()` and `formatPercent()` methods to use formatter
- Consider Intl.NumberFormat for locale-aware defaults

**Files to Modify:**
- Create `src/format.ts` - Format parsing and number formatting utilities
- `src/base-chart.ts` - Add `valueFormat`, `percentFormat` properties and methods
- `src/axis-chart.ts` - Apply formatting to axis value labels
- `src/chart-axis.ts` - Add `valueFormat` property
- All shape elements - Add `valueFormat` property for override
- `src/chart-legend.ts` - Apply formatting to legend values

**Testing:**
- Unit tests for format parsing
- Unit tests for various number inputs
- Locale testing (en-US, de-DE, etc.)

---

### Negative Value Support

**Status:** Not Started
**Priority:** Critical

**Problem:** Bar charts cannot display negative values. Bars always extend from zero upward/rightward, making the library unusable for profit/loss, temperature, or any data with negative values.

**Requirements:**

1. **Bar Charts**
   - Bars extend downward (vertical) or leftward (horizontal) for negative values
   - Zero line rendered distinctly
   - Axis labels show negative values

2. **Line Charts**
   - Points can be positioned below zero line
   - Grid extends into negative territory

3. **Axis Rendering**
   - Y-axis (or X-axis for horizontal) shows negative range
   - Zero line emphasized (thicker or different color)
   - Tick marks on both sides of zero

4. **Color Differentiation**
   - Optional: different colors for positive/negative
   - `negative-fill` attribute on chart or elements

**Proposed API:**
```html
<!-- Automatic negative handling -->
<dc-chart>
  <dc-bar value="50" label="Profit" fill="#4CAF50"></dc-bar>
  <dc-bar value="-30" label="Loss" fill="#F44336"></dc-bar>
  <dc-bar value="20" label="Net"></dc-bar>
</dc-chart>

<!-- Auto-color negatives -->
<dc-chart fill-colors="#4CAF50" negative-fill="#F44336">
  <dc-bar value="50" label="Q1"></dc-bar>
  <dc-bar value="-30" label="Q2"></dc-bar>  <!-- Uses negative-fill -->
  <dc-bar value="20" label="Q3"></dc-bar>
</dc-chart>

<!-- Line chart with negatives -->
<dc-chart>
  <dc-line label="Temperature">
    <dc-point value="15" label="6am"></dc-point>
    <dc-point value="-5" label="Midnight"></dc-point>
  </dc-line>
</dc-chart>

<!-- Stacked bars with negatives (waterfall-style) -->
<dc-chart>
  <dc-bar label="Q1">
    <dc-bar-segment value="100" label="Revenue"></dc-bar-segment>
    <dc-bar-segment value="-30" label="Costs"></dc-bar-segment>
    <dc-bar-segment value="-20" label="Tax"></dc-bar-segment>
  </dc-bar>
</dc-chart>
```

**Implementation Notes:**
- Modify `getMaxValue()` to return `{ min, max }` or add `getMinValue()`
- Calculate scale to span from min to max (with padding)
- Calculate zero position: `zeroY = padding.top + (max / (max - min)) * chartHeight`
- Positive bars: extend from zeroY upward
- Negative bars: extend from zeroY downward
- Add `zero-line-color` and `zero-line-width` attributes
- Handle edge cases: all positive, all negative, mixed

**Files to Modify:**
- `src/axis-chart.ts` - Modify `getMaxValue()` or add `getMinValue()`, update axis rendering
- `src/chart.ts` - Update bar positioning to handle negative values
- `src/chart-bar.ts` - Add `negativeFill` property
- `src/base-chart.ts` - Add `negativeFill` chart-level property

**Visual Design:**
```
     100 ─┼────────────────
         │ ████
      50 ─┼─████────────────
         │ ████  ████
       0 ═╪═████══████══════  ← Zero line (emphasized)
         │       ████
     -50 ─┼──────████───────
         │       ████
         └──────────────────
           Q1    Q2
```

**Testing:**
- All positive values (should work as before)
- All negative values
- Mixed positive/negative
- Single bar crossing zero
- Stacked bars with negative segments
- Line charts crossing zero multiple times

---

### Value Axis Configuration

**Status:** Not Started
**Priority:** Critical

**Problem:** The value axis (Y-axis for vertical charts) auto-scales from 0 to max value. Users cannot set fixed ranges, control tick intervals, or format axis labels independently.

**Requirements:**

1. **Range Control**
   - `min-value` - Minimum axis value (default: 0 or auto for negatives)
   - `max-value` - Maximum axis value (default: auto from data)
   - Both can be "auto" for automatic calculation

2. **Tick Control**
   - `tick-count` - Approximate number of ticks (library picks nice values)
   - `tick-interval` - Exact interval between ticks (e.g., 10, 25, 100)
   - `tick-values` - Explicit tick positions (e.g., "0, 50, 100, 150")

3. **Formatting**
   - `value-format` - Format string for axis labels (see Number Formatting feature)

4. **Grid Lines**
   - `show-grid` - Boolean to show/hide grid lines (default: true)
   - `grid-color` - Color of grid lines
   - `grid-style` - "solid", "dashed", "dotted"

**Proposed API:**
```html
<!-- Fixed range -->
<dc-chart>
  <dc-axis position="left" min-value="0" max-value="100"></dc-axis>
  <dc-bar value="45" label="A"></dc-bar>
</dc-chart>

<!-- Tick interval -->
<dc-chart>
  <dc-axis position="left" tick-interval="25"></dc-axis>
  <!-- Shows: 0, 25, 50, 75, 100 -->
</dc-chart>

<!-- Explicit ticks -->
<dc-chart>
  <dc-axis position="left" tick-values="0, 50, 75, 100"></dc-axis>
</dc-chart>

<!-- Formatted axis labels -->
<dc-chart>
  <dc-axis position="left" value-format="$,.0f"></dc-axis>
  <!-- Shows: $0, $25, $50, etc. -->
</dc-chart>

<!-- Grid styling -->
<dc-chart>
  <dc-axis position="left" show-grid grid-color="#eee" grid-style="dashed"></dc-axis>
</dc-chart>

<!-- Auto-range with padding -->
<dc-chart>
  <dc-axis position="left" min-value="auto" max-value="auto" range-padding="10%"></dc-axis>
  <!-- If data ranges 23-87, axis might show 20-90 -->
</dc-chart>
```

**Implementation Notes:**
- Add properties to `ChartAxis`: `minValue`, `maxValue`, `tickCount`, `tickInterval`, `tickValues`, `valueFormat`, `showGrid`, `gridColor`, `gridStyle`
- Implement "nice" tick calculation (round numbers like 0, 25, 50, 75, 100)
- Modify `AxisChart.renderAxes()` to use axis configuration
- When `max-value` is set, clip bars that exceed it (or show overflow indicator)
- `min-value` with positive value creates a "broken axis" effect

**Files to Modify:**
- `src/chart-axis.ts` - Add new properties
- `src/axis-chart.ts` - Read axis config, apply to scale calculations and rendering
- `src/chart.ts` - Respect axis bounds when rendering bars/lines

**Algorithm for Nice Ticks:**
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
   - CHANGELOG.md
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
- Create CHANGELOG.md with initial release notes
- Create CONTRIBUTING.md with contribution guidelines
- Update vite.config.ts to generate proper builds
- Add `prepublishOnly` script to run build
- Add `.npmignore` or use `files` in package.json
- Test with `npm pack` before publishing
- Consider scoped package name (@yourorg/declarative-charts) to avoid conflicts

**Files to Create/Modify:**
- Create `LICENSE`
- Create `CHANGELOG.md`
- Create `CONTRIBUTING.md`
- Modify `package.json`
- Modify `vite.config.ts` if needed for builds
- Update `README.md` with installation instructions

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

**Implementation Notes:**
- Add `fill`, `fillOpacity`, `fillStartColor`, `fillEndColor` properties to `ChartLine`
- When line has fill, render `<path>` for area before rendering line stroke
- Area path: starts at first point, follows line, drops to zero, returns to start
- For stacked: each line's baseline is the previous line's values
- Create SVG `<linearGradient>` for gradient fills

**Files to Modify:**
- `src/chart-line.ts` - Add fill properties
- `src/chart.ts` - Render area paths, implement stacking logic
- `src/base-chart.ts` - Add `stacked` property if shared across chart types

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

**Implementation Notes:**
- Use CSS transitions where possible for performance
- For complex animations (line drawing), use SVG `stroke-dasharray` animation
- Store previous values for transition calculations
- Use `requestAnimationFrame` for JavaScript-driven animations
- Check `window.matchMedia('(prefers-reduced-motion: reduce)')` on init
- Add `animation` property to `BaseChart`

**Files to Modify:**
- `src/base-chart.ts` - Add animation properties, reduced motion check
- `src/chart.ts` - Bar/line animation implementation
- `src/pie-chart.ts` - Pie animation implementation
- `src/funnel-chart.ts` - Funnel animation implementation
- Add CSS transitions in component styles

---

### Date/Time Axis

**Status:** Not Started
**Priority:** Important

**Problem:** Time-series data requires special axis handling. Currently, labels are treated as simple strings with no time-aware spacing or formatting.

**Requirements:**

1. **Time-Aware Spacing**
   - Points positioned proportionally by time, not evenly spaced
   - Handles gaps in data (weekends, missing days)

2. **Smart Tick Labels**
   - Auto-select appropriate format based on range (hours, days, months, years)
   - Show context changes (month name when crossing month boundary)

3. **Date Parsing**
   - Accept ISO 8601 strings: `2024-01-15`, `2024-01-15T10:30:00`
   - Accept Unix timestamps
   - `date-format` attribute for parsing non-standard formats

4. **Label Formatting**
   - `date-label-format` for display format
   - Locale-aware formatting

**Proposed API:**
```html
<!-- Time-series data with ISO dates -->
<dc-chart>
  <dc-axis position="bottom" type="time" date-label-format="MMM d"></dc-axis>
  <dc-line>
    <dc-point value="100" label="2024-01-01"></dc-point>
    <dc-point value="150" label="2024-01-15"></dc-point>
    <dc-point value="120" label="2024-02-01"></dc-point>
  </dc-line>
</dc-chart>

<!-- Unix timestamps -->
<dc-chart>
  <dc-axis position="bottom" type="time" date-format="timestamp">
  <dc-line>
    <dc-point value="100" label="1704067200"></dc-point>
    ...
  </dc-line>
</dc-chart>

<!-- Intraday data -->
<dc-chart>
  <dc-axis position="bottom" type="time" date-label-format="HH:mm"></dc-axis>
  <dc-line>
    <dc-point value="50" label="2024-01-15T09:00:00"></dc-point>
    <dc-point value="75" label="2024-01-15T12:00:00"></dc-point>
    <dc-point value="60" label="2024-01-15T15:00:00"></dc-point>
  </dc-line>
</dc-chart>
```

**Implementation Notes:**
- Add `type` property to `ChartAxis` ("category" default, "time", "value")
- When `type="time"`, parse labels as dates and calculate X positions based on time
- Implement smart tick selection based on time range:
  - < 1 day: hours
  - < 1 month: days
  - < 1 year: months
  - \> 1 year: years
- Use `Intl.DateTimeFormat` for locale-aware formatting
- Handle timezone considerations (display in local time by default)

**Files to Modify:**
- `src/chart-axis.ts` - Add `type`, `dateFormat`, `dateLabelFormat` properties
- `src/axis-chart.ts` - Time-based positioning calculations
- Create `src/date-utils.ts` - Date parsing and formatting utilities

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

**Implementation Notes:**
- Add `emptyMessage`, `loading`, `hideWhenEmpty` properties to `BaseChart`
- Check for empty data in `render()` before calling `renderChart()`
- Render centered text/icon for empty state
- Add CSS animation for loading spinner
- Create `<dc-loading>` element for custom loading content

**Files to Modify:**
- `src/base-chart.ts` - Empty detection, empty/loading state rendering
- Create `src/chart-loading.ts` - Loading element component
- Add default empty state styles

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

**Implementation Notes:**
- Create `src/validation.ts` with validation utilities
- Define error codes and messages catalog
- Add validation in `updated()` lifecycle or property setters
- Use `console.warn()` with structured messages
- Add `strict` attribute to throw errors instead of warnings

**Files to Modify:**
- Create `src/validation.ts` - Validation utilities and error catalog
- `src/base-chart.ts` - Add validation framework
- All element classes - Add property validation

---

### Test Suite

**Status:** Not Started
**Priority:** Important

**Problem:** No automated tests exist. Changes may introduce regressions without detection.

**Requirements:**

1. **Unit Tests**
   - Format utilities
   - Date utilities
   - Color calculations
   - Scale calculations
   - Padding calculations

2. **Component Tests**
   - Element rendering
   - Attribute handling
   - Event handling
   - Slot handling

3. **Integration Tests**
   - Complete chart rendering
   - Dynamic updates
   - Browser compatibility

4. **Visual Regression Tests**
   - Screenshot comparison
   - Detect unintended visual changes

**Proposed Test Stack:**
- **Unit Tests**: Vitest (fast, Vite-native)
- **Component Tests**: @open-wc/testing + Vitest
- **Visual Regression**: Playwright + Percy or Chromatic

**Test Structure:**
```
test/
├── unit/
│   ├── format.test.ts
│   ├── color.test.ts
│   └── scale.test.ts
├── components/
│   ├── chart.test.ts
│   ├── pie-chart.test.ts
│   └── funnel-chart.test.ts
├── integration/
│   ├── dynamic-updates.test.ts
│   └── htmx-integration.test.ts
└── visual/
    ├── bar-chart.spec.ts
    └── snapshots/
```

**Implementation Notes:**
- Add Vitest and @open-wc/testing to devDependencies
- Add test scripts to package.json
- Set up CI pipeline (GitHub Actions)
- Use test-charts/ as basis for visual tests
- Aim for >80% code coverage

**Files to Create:**
- `vitest.config.ts`
- `test/` directory structure
- `.github/workflows/test.yml` for CI

---

## Phase 3: Feature Parity

### Custom Legends

**Status:** Planned (from original roadmap)
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

**Implementation Notes:**
- Create `ChartLegendItem` element class with `fill`, `stroke`, `label`, `shape` properties
- Modify `ChartLegend.generateSvg()` to check for explicit items first
- If explicit items exist, use them; otherwise auto-generate
- Consider hybrid mode in future: auto-generate some, add custom ones

**Files to Create/Modify:**
- Create `src/chart-legend-item.ts`
- Modify `src/chart-legend.ts`
- Update `src/index.ts` exports

---

### Reference Lines and Bands

**Status:** Not Started
**Priority:** Nice-to-Have

**Problem:** Users cannot add reference lines (e.g., target value, average) or shaded regions (e.g., "danger zone") to charts.

**Proposed API:**
```html
<!-- Horizontal reference line -->
<dc-chart>
  <dc-reference-line value="75" label="Target" stroke="#F44336" stroke-dasharray="5,5"></dc-reference-line>
  <dc-bar value="65" label="Q1"></dc-bar>
  <dc-bar value="80" label="Q2"></dc-bar>
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

**Implementation Notes:**
- Create `ChartReferenceLine` element with `value` (for Y position) or `position` (for X position/category)
- Create `ChartReferenceBand` element with `minValue`, `maxValue`
- Render as SVG `<line>` or `<rect>` in chart's `renderChart()` method
- Render after grid lines but before data elements
- Add label positioning (left, right, inline)

**Files to Create:**
- `src/chart-reference-line.ts`
- `src/chart-reference-band.ts`

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

**Status:** Partially Complete (README exists)
**Priority:** Important for 1.0

**Required:**
- [ ] LICENSE file (MIT text)
- [ ] CHANGELOG.md (keep-a-changelog format)
- [ ] CONTRIBUTING.md (how to contribute, code style, PR process)
- [ ] Browser compatibility table in README
- [ ] Bundle size documentation
- [ ] Performance guidelines (how many elements before slowdown)

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
| 0.x | Current | Bar, Line, Bubble, Pie, Funnel charts; Legends; Titles; Popups; Palettes; ARIA labels & auto-insights |
| 1.0 | Planned | Keyboard navigation; Number formatting; Negative values; Axis config; npm publish |
| 1.x | Future | Area charts; Animations; Date axis; High contrast; More chart types |
