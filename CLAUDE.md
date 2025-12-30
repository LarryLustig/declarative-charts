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

### ⚠️ CRITICAL: Element Naming

| Chart Type | Element | Why |
|------------|---------|-----|
| Bar/Line/Bubble | `<dc-chart>` | Share axis rendering |
| Pie | `<dc-pie-chart>` | No axes, radial rendering |
| Funnel | `<dc-funnel-chart>` | No axes, chevron rendering |
| Stage | `<dc-stage-chart>` | No axes, shape-based rendering |

**NEVER change `<dc-pie-chart>` to `<dc-chart>` or vice versa.**

### Key Patterns

**Data Extraction**: Charts query child elements via `querySelector`/`querySelectorAll`.

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

**Built-in Palettes** (in `src/builtin-palettes.ts`):
- **Categorical**: `category10`, `accent`, `dark2`, `paired`, `pastel`, `set1`, `set2`, `set3`, `tableau10`
- **Sequential**: `blue`, `green`, `red`, `orange`, `purple`, `gray`, `viridis`, `plasma`, `warm`, `cool`, `turbo`
- **Diverging**: `red-blue`, `purple-green`, `brown-teal`, `pink-green`, `spectral`

Use `getPaletteColors(count, colorType)` in chart code to resolve palette colors.

**Pattern Fills**: Apply patterns directly (`pattern="diagonal-lines"`), by ID reference, or via palettes. Built-in: `diagonal-lines`, `diagonal-lines-reverse`, `horizontal-lines`, `vertical-lines`, `dots`, `crosshatch`, `grid`, `checkerboard`.

**High Contrast Mode**: Enable with `high-contrast` attribute or auto-detect via `prefers-contrast: high`. Override colors with `<dc-palette high-contrast>` child.

**Hidden Attribute**: Standard HTML `hidden` on data elements (`<dc-line>`, `<dc-bar>`, etc.) hides them. Call `chart.requestUpdate()` after toggling.

**Logging**: `this.log(level, path, message, value?)` records calculations. Set `logging` attribute to enable.

**Accessibility**: Charts auto-generate ARIA attributes. Implement `getInsights()` for descriptions. Use utilities from `src/accessibility/insights.ts`.

**Keyboard Navigation**: Roving tabindex pattern. Implement `getFocusableElements()`, `getShapeBounds()`, `renderFocusIndicator()`.

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
7. Export from `src/index.ts`
8. Document in `API.md` and add examples to `examples/`

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
```

### Files with Test Coverage

| Source File | Test File | Coverage |
|-------------|-----------|----------|
| `src/format.ts` | `test/unit/format.test.ts` | 92% |
| `src/accessibility/insights.ts` | `test/unit/insights.test.ts` | 97% |
| `src/patterns.ts` | `test/unit/patterns.test.ts` | 100% |
| `src/builtin-palettes.ts` | `test/unit/builtin-palettes.test.ts` | 100% |
| `src/axis-chart.ts` (scale functions) | `test/unit/axis-scales.test.ts` | 22% (scale calcs only) |
| `src/chart-fill.ts` | `test/unit/chart-fill.test.ts` | 96% |
| `src/chart-legend.ts` (utilities) | `test/unit/chart-legend.test.ts` | 11% (type guard, warnings) |
| `src/chart-axis.ts` | `test/unit/chart-axis.test.ts` | 52% (parsing, position) |
| `src/chart-palette.ts` | `test/unit/chart-palette.test.ts` | 8% (properties only) |
| `src/chart-title.ts` | `test/unit/chart-title.test.ts` | 44% (constants, warnings) |
| `src/chart-swatch.ts` | `test/unit/chart-swatch.test.ts` | 25% (constants, properties) |
| `src/base-filled-shape.ts` | `test/unit/base-shape.test.ts` | 100% |

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

    chart.requestUpdate();
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

**Current coverage (15 tests):**
- Bar charts: basic, horizontal, negative, grouped, stacked
- Line charts: basic, multiple lines
- Bubble chart: basic
- Pie charts: basic, donut
- Funnel charts: basic, chevron
- Features: patterns, custom axis, legend positions

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

**Required includes:**
- `<link rel="stylesheet" href="examples.css">`
- `<script src="examples.js"></script>` (at end of body)
- Two-tier nav: `.nav-major` (chart types) + `.nav-minor` (features)
