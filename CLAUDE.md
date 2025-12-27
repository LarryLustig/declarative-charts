# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A declarative chart library built with Lit (Web Components) and TypeScript. Users create charts using HTML syntax instead of configuration objects.

**Chart types:**
- **Axis-based** (use `<dc-chart>`): Bar, Line, Bubble - chart type determined by child elements
- **Non-axis** (own elements): Pie (`<dc-pie-chart>`), Funnel (`<dc-funnel-chart>`)

## Commands

```bash
npm run dev      # Vite dev server at localhost:5173
npm run build    # TypeScript + Vite build → dist/
npm run preview  # Preview production build
```

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
- `BaseChartElement`: Data containers that don't render visually
- `BaseShape`: Shape elements with attribute passthrough support

**Chart Components:**
- `Chart` (src/chart.ts): `<dc-chart>` - renders bars/lines/bubbles based on children
- `PieChart`: `<dc-pie-chart>` - radial charts, donut via `inner-radius`
- `FunnelChart`: `<dc-funnel-chart>` - stage rendering with chevrons

### ⚠️ CRITICAL: Element Naming

| Chart Type | Element | Why |
|------------|---------|-----|
| Bar/Line/Bubble | `<dc-chart>` | Share axis rendering |
| Pie | `<dc-pie-chart>` | No axes, radial rendering |
| Funnel | `<dc-funnel-chart>` | No axes, stage rendering |

**NEVER change `<dc-pie-chart>` to `<dc-chart>` or vice versa.**

### Key Patterns

**Data Extraction**: Charts query child elements via `querySelector`/`querySelectorAll`.

**No Shadow DOM for Data Elements**: Data elements return `this` from `createRenderRoot()`.

**SVG Rendering Order** (z-index, later = on top):
1. Grid lines → 2. Data elements → 3. Axes → 4. Labels → 5. Legend

**Palette System**: `<dc-palette>` contains `<dc-fill>` elements for reusable color/pattern schemes. Charts reference via `palette` attribute. Priority: element fill/stroke > palette match > chart-level colors > auto.

```html
<dc-palette id="status">
  <dc-fill label="Critical" fill="#fee2e2" stroke="#dc2626" pattern="crosshatch"></dc-fill>
  <dc-fill label="Warning" fill="#fef3c7" stroke="#f59e0b" pattern="diagonal-lines"></dc-fill>
  <dc-fill label="OK" fill="#10b981"></dc-fill>
</dc-palette>
```

**Pattern Fills**: Apply patterns directly (`pattern="diagonal-lines"`), by ID reference, or via palettes. Built-in: `diagonal-lines`, `diagonal-lines-reverse`, `horizontal-lines`, `vertical-lines`, `dots`, `crosshatch`, `grid`, `checkerboard`.

**High Contrast Mode**: Enable with `high-contrast` attribute or auto-detect via `prefers-contrast: high`. Override colors with `<dc-palette high-contrast>` child.

**Hidden Attribute**: Standard HTML `hidden` on data elements (`<dc-line>`, `<dc-bar>`, etc.) hides them. Call `chart.requestUpdate()` after toggling.

**Logging**: `this.log(level, path, message, value?)` records calculations. Set `logging` attribute to enable.

**Accessibility**: Charts auto-generate ARIA attributes. Implement `getInsights()` for descriptions. Use utilities from `src/accessibility/insights.ts`.

**Keyboard Navigation**: Roving tabindex pattern. Implement `getFocusableElements()`, `getShapeBounds()`, `renderFocusIndicator()`.

**Number Formatting**: All numeric values (labels, axes, legends, popups) use the formatting system in `src/format.ts`.

Format inheritance: element `value-format` → legend/axis `value-format` → chart `value-format` → default.

```html
<!-- Named presets with optional argument -->
<dc-chart value-format="currency USD">     <!-- $1,234.56 -->
<dc-chart value-format="number 2">         <!-- 1,234.56 -->
<dc-chart value-format="compact 1">        <!-- 1.2M -->
<dc-chart value-format="percent 0">        <!-- 46% -->
<dc-chart value-format="integer">          <!-- 1,235 -->

<!-- d3-format subset -->
<dc-chart value-format="$,.2f">            <!-- $1,234.56 -->
<dc-chart value-format=".1s">              <!-- 1.2M -->

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
2. For `AxisChart`: implement `getMaxValue()`, `getAllValues()`, `getCategoryLabels()`, `getAxisLabelPadding()`
3. Implement `renderChart(): SVGTemplateResult`
4. Use `this.getChartPadding()` for positioning
5. Implement: logging, auto-popup, `getLegendItems()`, `getInsights()`, keyboard navigation
6. **Use formatting system for all numeric display:**
   - Labels: use `formatValueString(value, percent, showValue, showPercent, elementFormat)`
   - Insights: pass `this.formatValue` to insight functions
   - Extract `valueFormat` from data elements and pass through data structures
7. Export from `src/index.ts`
8. Add examples to `index.html` and `examples/`

### Adding a New Data Element

1. Extend `BaseShape` (renders to SVG) or `BaseChartElement` (container)
2. Add `@property()` decorated properties
3. Include `valueFormat` property if element supports per-element formatting (inherited from `BaseShape`)
4. Export from `src/index.ts`

For `BaseShape`: parent chart must capture passthrough attrs (including `valueFormat`), add `data-shape-index`, call `applyPassthroughAttributes()`.

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

## File Structure

```
src/
├── base-chart.ts           # Abstract base (logging, accessibility, keyboard nav, formatting)
├── axis-chart.ts           # Abstract base for axis charts
├── base-chart-element.ts   # Abstract base for data elements
├── base-shape.ts           # Abstract base for shapes (passthrough, valueFormat)
├── chart.ts                # <dc-chart> - bars/lines/bubbles
├── pie-chart.ts            # <dc-pie-chart>
├── funnel-chart.ts         # <dc-funnel-chart>
├── format.ts               # NumberFormatter, presets, d3-format parsing
├── accessibility/          # Insight analysis utilities
├── chart-axis.ts           # <dc-axis> configuration
├── chart-palette.ts        # <dc-palette> container
├── chart-fill.ts           # <dc-fill> color/pattern definition
├── chart-swatch.ts         # <dc-swatch> for displaying colors
├── patterns.ts             # SVG pattern definitions
├── chart-*.ts              # Data elements
└── index.ts                # Exports

examples/                   # Example pages (use examples.css, examples.js)
test-charts/                # Visual test matrices for legend/title positions
```

## TypeScript Configuration

- Target: ES2020, strict mode, experimental decorators
- `useDefineForClassFields: false` required for Lit

## Examples

See `examples/*.html`. Key examples:
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

## Test Charts

Visual test matrices in `test-charts/` verify legend/title positioning.

Chart ID format: `{type}-L{legend}-T{title}-LT{legendTitle}-V{value}-P{percent}`

Position codes: `r`=right, `l`=left, `t`=top, `b`=bottom, `tl`/`tr`/`bl`/`br`=corners, `n`=none.
