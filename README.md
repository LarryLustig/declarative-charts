# Declarative Chart Library

A modern Web Components-based chart library built with Lit that allows you to create charts using simple, declarative HTML.

## Features

- ✨ **Declarative Syntax** - Define charts with nested HTML elements
- 📊 **Multiple Chart Types** - Bar, Line, Pie, and Funnel charts
- 🎨 **Individual Styling** - Style each bar/point/slice independently
- 🎭 **Pattern Fills** - 8 built-in SVG patterns for visual distinction
- ♿ **High Contrast Mode** - WCAG-compliant colors with automatic patterns
- 🔢 **Number Formatting** - Currency, compact (1.2M), percentages, locale-aware
- 🔄 **Automatic Updates** - Charts update when you modify child elements
- 📦 **Lightweight** - Built on Lit (~5KB overhead)
- 🎯 **TypeScript** - Full TypeScript support with type definitions
- 🌐 **Standards-Based** - Uses Web Components standard
- 🎭 **Rich Interactions** - Popups, legends, grouped bars, and more
- ♿ **Accessible** - Auto-generated ARIA labels, keyboard navigation, and screen reader support

## Quick Start

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

This creates optimized files in the `dist/` folder.

## Usage

### Bar Chart

```html
<dc-chart width="600" height="400">
  <dc-title>My Chart</dc-title>
  <dc-bar value="10" fill="red" label="January"></dc-bar>
  <dc-bar value="20" fill="blue" label="February"></dc-bar>
  <dc-bar value="30" fill="green" label="March"></dc-bar>
</dc-chart>
```

### Line Chart

```html
<dc-chart width="600" height="400" stroke-colors="#9C27B0">
  <dc-title>Temperature Trends</dc-title>
  <dc-line label="City A">
    <dc-point value="15" label="Mon"></dc-point>
    <dc-point value="18" label="Tue"></dc-point>
    <dc-point value="22" label="Wed"></dc-point>
  </dc-line>
  <dc-line stroke="#FF5722" label="City B">
    <dc-point value="12" label="Mon"></dc-point>
    <dc-point value="16" label="Tue"></dc-point>
    <dc-point value="20" label="Wed"></dc-point>
  </dc-line>
</dc-chart>
```

In this example, City A will use the chart's `stroke-colors` (#9C27B0), while City B uses its own `stroke` (#FF5722).

### Pie Chart

```html
<dc-pie-chart width="600" height="400">
  <dc-title>Market Share</dc-title>
  <dc-pie-slice value="45" label="Product A"></dc-pie-slice>
  <dc-pie-slice value="30" label="Product B"></dc-pie-slice>
  <dc-pie-slice value="25" label="Product C"></dc-pie-slice>
</dc-pie-chart>
```

### Funnel Chart

```html
<dc-funnel-chart width="600" height="400">
  <dc-title>Conversion Funnel</dc-title>
  <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
  <dc-funnel-stage value="750" label="Sign-ups"></dc-funnel-stage>
  <dc-funnel-stage value="500" label="Active Users"></dc-funnel-stage>
  <dc-funnel-stage value="200" label="Paid Users"></dc-funnel-stage>
</dc-funnel-chart>
```

## Common Chart Attributes

All chart components (`<dc-chart>`, `<dc-pie-chart>`, `<dc-funnel-chart>`) share these common attributes:

### Dimensions
- `width` (number) - Chart width in pixels (default: 600)
- `height` (number) - Chart height in pixels (default: 400)

### Auto-Popup
- `auto-popup` (boolean) - When present or `true`, automatically shows hover popups with label, value, and percentage on all chart elements. See [Auto-Popups](#auto-popups) for details.

### Logging
- `logging` (string) - Controls log capture level: `'false'` (default, no logging), `'error'`, `'warning'`, `'info'`, or `'true'` (same as `'info'`). See [Logging & Debugging](#logging--debugging) for details.

### Padding

Control the spacing between the chart edge and the chart content (axes, bars, pie, etc.):

- `padding` (string) - Shorthand following CSS syntax (supports px, rem, or unitless values)
- `padding-top` (number) - Top padding in pixels
- `padding-right` (number) - Right padding in pixels
- `padding-bottom` (number) - Bottom padding in pixels
- `padding-left` (number) - Left padding in pixels

**CSS-style shorthand examples:**
```html
<!-- Single value: all sides -->
<dc-chart padding="40">

<!-- Two values: top/bottom, left/right -->
<dc-chart padding="20 80">

<!-- Three values: top, left/right, bottom -->
<dc-chart padding="10 60 30">

<!-- Four values: top, right, bottom, left -->
<dc-chart padding="20 40 30 50">

<!-- Individual properties override shorthand -->
<dc-chart padding="40" padding-left="100">

<!-- Supports rem units -->
<dc-chart padding="2rem 40px">
```

**Priority:** Individual side properties > shorthand > auto (calculated from chrome elements, defaults to 5% when no title/legend)

### Color System

The library uses an SVG-aligned color system with `fill` for shape fills and `stroke` for lines/borders. Colors can be set at multiple levels with a clear priority order.

#### Color Priority (highest to lowest)

1. **Element-level** - `fill` or `stroke` on individual elements
2. **Gradient** - `fill-start-color`/`fill-end-color` (or `stroke-start-color`/`stroke-end-color`) on the chart
3. **Palette** - `fill-colors` or `stroke-colors` on the chart
4. **Auto-generated** - Algorithmic color generation when nothing else is specified

#### Element-Level Colors

Set colors directly on individual elements:

```html
<!-- Bar chart with per-bar fills -->
<dc-chart width="600" height="400">
  <dc-bar value="10" fill="red" label="Q1"></dc-bar>
  <dc-bar value="20" fill="blue" label="Q2"></dc-bar>
  <dc-bar value="30" fill="green" label="Q3"></dc-bar>
</dc-chart>

<!-- Line chart with per-line strokes -->
<dc-chart width="600" height="400">
  <dc-line stroke="#9C27B0" label="City A">
    <dc-point value="15" label="Mon"></dc-point>
  </dc-line>
  <dc-line stroke="#FF5722" label="City B">
    <dc-point value="12" label="Mon"></dc-point>
  </dc-line>
</dc-chart>
```

#### Chart-Level Color Palettes

Use `fill-colors` or `stroke-colors` to define a palette. A single color applies to all elements; multiple colors cycle through elements:

```html
<!-- Single color for all bars -->
<dc-chart fill-colors="#9C27B0">
  <dc-bar value="10" label="Q1"></dc-bar>
  <dc-bar value="20" label="Q2"></dc-bar>
</dc-chart>

<!-- Multiple colors cycle through bars -->
<dc-chart fill-colors="#4CAF50, #2196F3, #FF9800, #9C27B0">
  <dc-bar value="10" label="Q1"></dc-bar>  <!-- green -->
  <dc-bar value="20" label="Q2"></dc-bar>  <!-- blue -->
  <dc-bar value="15" label="Q3"></dc-bar>  <!-- orange -->
  <dc-bar value="40" label="Q4"></dc-bar>  <!-- purple -->
</dc-chart>

<!-- Line chart with stroke palette -->
<dc-chart stroke-colors="#9C27B0, #FF5722, #009688">
  <dc-line label="Series A">...</dc-line>  <!-- purple -->
  <dc-line label="Series B">...</dc-line>  <!-- deep orange -->
  <dc-line label="Series C">...</dc-line>  <!-- teal -->
</dc-chart>
```

#### Gradient Colors

Create smooth color gradients using start and end colors:

```html
<!-- Funnel with gradient fill -->
<dc-funnel-chart fill-start-color="#3498db" fill-end-color="#e74c3c">
  <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
  <dc-funnel-stage value="600" label="Leads"></dc-funnel-stage>
  <dc-funnel-stage value="200" label="Customers"></dc-funnel-stage>
</dc-funnel-chart>

<!-- Bar chart with gradient fill -->
<dc-chart fill-start-color="#673AB7" fill-end-color="#00BCD4">
  <dc-bar value="10" label="Q1"></dc-bar>
  <dc-bar value="25" label="Q2"></dc-bar>
  <dc-bar value="15" label="Q3"></dc-bar>
</dc-chart>

<!-- Line chart with stroke gradient -->
<dc-chart stroke-start-color="#E91E63" stroke-end-color="#3F51B5">
  <dc-line label="A">...</dc-line>
  <dc-line label="B">...</dc-line>
  <dc-line label="C">...</dc-line>
</dc-chart>
```

#### Auto-Generated Colors

When no colors are specified, charts automatically generate distinct colors using a golden ratio algorithm:

```html
<!-- Auto-generated colors for each slice -->
<dc-pie-chart>
  <dc-pie-slice value="25" label="Category A"></dc-pie-slice>
  <dc-pie-slice value="20" label="Category B"></dc-pie-slice>
  <dc-pie-slice value="18" label="Category C"></dc-pie-slice>
</dc-pie-chart>
```

#### Stroke Properties

Control borders/outlines with stroke attributes:

```html
<!-- Pie chart with custom border -->
<dc-pie-chart stroke-colors="#333" stroke-width="3">
  <dc-pie-slice value="35" fill="#4CAF50" label="A"></dc-pie-slice>
  <dc-pie-slice value="28" fill="#2196F3" label="B"></dc-pie-slice>
</dc-pie-chart>

<!-- Funnel with shorthand stroke -->
<dc-funnel-chart stroke="2 #333">
  <dc-funnel-stage value="1000" label="Stage 1"></dc-funnel-stage>
</dc-funnel-chart>
```

#### Color Attributes Summary

| Level | Fill Attributes | Stroke Attributes |
|-------|-----------------|-------------------|
| Element | `fill` | `stroke` |
| Chart (palette) | `fill-colors` | `stroke-colors` |
| Chart (gradient) | `fill-start-color`, `fill-end-color` | `stroke-start-color`, `stroke-end-color` |
| Chart (width) | - | `stroke-width` |
| Chart (shorthand) | - | `stroke` (e.g., "2 #333") |

See [`examples/colors.html`](examples/colors.html) for comprehensive color system examples.

### Palettes and Pattern Fills

For more sophisticated color schemes, use `<dc-palette>` with `<dc-fill>` elements to define reusable fills that can include solid colors, patterns, and conditional matching.

#### Basic Palette Usage

Define a palette with `<dc-fill>` elements, then reference it from charts:

```html
<!-- Define a palette -->
<dc-palette id="brand-colors">
  <dc-fill label="Revenue" fill="#2563eb"></dc-fill>
  <dc-fill label="Expenses" fill="#dc2626"></dc-fill>
  <dc-fill label="Profit" fill="#16a34a"></dc-fill>
</dc-palette>

<!-- Use the palette -->
<dc-chart palette="brand-colors">
  <dc-bar value="150" label="Revenue"></dc-bar>
  <dc-bar value="80" label="Expenses"></dc-bar>
  <dc-bar value="70" label="Profit"></dc-bar>
</dc-chart>
```

#### Pattern Fills

Add visual patterns to chart elements for better accessibility and distinction:

```html
<dc-palette id="status-patterns">
  <dc-fill label="Critical" fill="#fee2e2" stroke="#dc2626" pattern="crosshatch"></dc-fill>
  <dc-fill label="Warning" fill="#fef3c7" stroke="#f59e0b" pattern="diagonal-lines"></dc-fill>
  <dc-fill label="OK" fill="#10b981"></dc-fill>
</dc-palette>
```

**Available pattern types:**
- `diagonal-lines` - Lines from bottom-left to top-right
- `diagonal-lines-reverse` - Lines from top-left to bottom-right
- `horizontal-lines` - Horizontal parallel lines
- `vertical-lines` - Vertical parallel lines
- `dots` - Regular dot grid
- `crosshatch` - Diagonal lines in both directions
- `grid` - Horizontal + vertical lines
- `checkerboard` - Alternating filled squares

**Direct patterns on elements:**
```html
<dc-chart>
  <dc-bar value="50" pattern="diagonal-lines" pattern-stroke="#000"></dc-bar>
  <dc-bar value="30" pattern="dots" fill="#fef3c7" pattern-stroke="#78350f"></dc-bar>
</dc-chart>
```

**Pattern by ID reference:**
```html
<dc-palette id="shared-patterns">
  <dc-fill id="danger" pattern="crosshatch" stroke="#dc2626" fill="#fee2e2"></dc-fill>
</dc-palette>

<dc-chart>
  <dc-bar value="25" label="Critical" pattern="danger"></dc-bar>
</dc-chart>
```

#### Value-Based Matching

Match fills based on data values using `min-value` and `max-value`:

```html
<dc-palette id="thresholds">
  <dc-fill max-value="30" fill="#fee2e2" pattern="crosshatch"></dc-fill>
  <dc-fill min-value="30" max-value="70" fill="#fef3c7"></dc-fill>
  <dc-fill min-value="70" fill="#dcfce7"></dc-fill>
</dc-palette>

<dc-chart palette="thresholds">
  <dc-bar value="20" label="Low"></dc-bar>    <!-- red with pattern -->
  <dc-bar value="50" label="Medium"></dc-bar> <!-- yellow -->
  <dc-bar value="80" label="High"></dc-bar>   <!-- green -->
</dc-chart>
```

#### High Contrast Mode

Enable high contrast mode for WCAG-compliant colors with automatic patterns:

```html
<!-- Explicit high contrast -->
<dc-chart high-contrast>
  <dc-bar value="50" label="A"></dc-bar>
  <dc-bar value="30" label="B"></dc-bar>
</dc-chart>
```

Charts also auto-detect the OS `prefers-contrast: high` setting.

**Custom high contrast palette:**
```html
<dc-chart>
  <dc-palette high-contrast>
    <dc-fill fill="#0047AB"></dc-fill>
    <dc-fill fill="#CC5500"></dc-fill>
    <dc-fill fill="#228B22"></dc-fill>
  </dc-palette>
  <dc-bar value="50" label="A"></dc-bar>
  <dc-bar value="30" label="B"></dc-bar>
</dc-chart>
```

See [`examples/palettes.html`](examples/palettes.html) and [`examples/patterns.html`](examples/patterns.html) for comprehensive examples.

### Controlling Labels, Values, and Percentages

All chart types support `show-label`, `show-value`, and `show-percent` attributes to control what text is displayed on chart elements. These attributes can be set at the chart level (applying to all elements) or on individual elements (overriding the chart-level setting).

#### Attribute Values

The `show-*` attributes accept several types of values:

| Value | Description | Example |
|-------|-------------|---------|
| `true` or present | Always show | `show-value` or `show-value="true"` |
| `false` | Never show | `show-value="false"` |
| Percentage threshold | Show only when element's percentage >= threshold | `show-label="5%"` |
| Value threshold | Show only when element's value >= threshold | `show-value="100"` |

#### Chart-Level Defaults

Different chart types have different defaults:

| Chart Type | `show-label` | `show-value` | `show-percent` |
|------------|--------------|--------------|----------------|
| Bar Chart | true | true | false |
| Line Chart | true | true | false |
| Pie Chart | true | false | true |
| Funnel Chart | true | true | false |

#### Examples

**Basic boolean control:**
```html
<!-- Hide all values -->
<dc-chart show-value="false">
  <dc-bar value="100" label="A"></dc-bar>
  <dc-bar value="200" label="B"></dc-bar>
</dc-chart>

<!-- Show both values and percentages -->
<dc-chart show-percent>
  <dc-bar value="100" label="A"></dc-bar>
  <dc-bar value="200" label="B"></dc-bar>
</dc-chart>
```

**Percentage thresholds (great for decluttering small slices):**
```html
<!-- Only show labels on slices >= 10% of total -->
<dc-pie-chart show-label="10%">
  <dc-pie-slice value="60" label="Large"></dc-pie-slice>
  <dc-pie-slice value="5" label="Small"></dc-pie-slice>  <!-- label hidden -->
  <dc-pie-slice value="2" label="Tiny"></dc-pie-slice>   <!-- label hidden -->
</dc-pie-chart>

<!-- Different thresholds for different attributes -->
<dc-pie-chart show-label="15%" show-percent="5%">
  <dc-pie-slice value="60" label="Large"></dc-pie-slice>  <!-- both shown -->
  <dc-pie-slice value="10" label="Medium"></dc-pie-slice> <!-- percent only -->
  <dc-pie-slice value="3" label="Small"></dc-pie-slice>   <!-- neither shown -->
</dc-pie-chart>
```

**Value thresholds:**
```html
<!-- Only show values on bars with value >= 100 -->
<dc-chart show-value="100">
  <dc-bar value="250" label="High"></dc-bar>   <!-- value shown -->
  <dc-bar value="150" label="Medium"></dc-bar> <!-- value shown -->
  <dc-bar value="50" label="Low"></dc-bar>     <!-- value hidden -->
</dc-chart>
```

**Per-element overrides:**
```html
<!-- Hide values globally, but show on specific elements -->
<dc-chart show-value="false">
  <dc-bar value="120" label="Normal"></dc-bar>
  <dc-bar value="200" label="Important" show-value fill="#4CAF50"></dc-bar>
  <dc-bar value="80" label="Normal"></dc-bar>
</dc-chart>

<!-- Show labels globally, but hide on small slices -->
<dc-pie-chart>
  <dc-pie-slice value="60" label="Large"></dc-pie-slice>
  <dc-pie-slice value="5" label="Small" show-label="false"></dc-pie-slice>
</dc-pie-chart>
```

#### Value String Formatting

When both `show-value` and `show-percent` are enabled, the display format is:
- Both false: nothing displayed
- `show-value` only: displays the value (e.g., "150")
- `show-percent` only: displays the percentage (e.g., "25.0%")
- Both true: displays "value (percent%)" (e.g., "150 (25.0%)")

#### Inheritance Hierarchy

Settings cascade from chart to element with explicit settings taking precedence:

1. **Element-level** (highest priority): `<dc-bar show-value="false">`
2. **Parent-level** (for nested elements): `<dc-line show-value="false">` affects child `<dc-point>` elements
3. **Chart-level**: `<dc-chart show-value="false">`
4. **Default**: Chart-type specific defaults

See [`examples/axes.html`](examples/axes.html) for comprehensive examples of all `show-*` attribute features.

### Negative Values

Bar, line, and bubble charts support negative values with automatic axis scaling and intuitive visual positioning.

**Basic usage:**
```html
<!-- Bars extend downward for negative values -->
<dc-chart width="600" height="400">
  <dc-bar value="50" label="Q1"></dc-bar>
  <dc-bar value="-30" label="Q2"></dc-bar>
  <dc-bar value="25" label="Q3"></dc-bar>
  <dc-bar value="-10" label="Q4"></dc-bar>
</dc-chart>
```

**Automatic features:**
- Zero line appears when range spans positive and negative values
- Axis labels include negative values with proper formatting
- All-negative charts position the category axis at top (where zero is)

**Color positive/negative values with palettes:**
```html
<dc-palette id="profit-loss">
  <dc-fill max-value="0" fill="#F44336"></dc-fill>  <!-- Negative: red -->
  <dc-fill min-value="0" fill="#4CAF50"></dc-fill>  <!-- Positive: green -->
</dc-palette>

<dc-chart palette="profit-loss" width="600" height="400">
  <dc-title>Profit/Loss by Quarter</dc-title>
  <dc-bar value="50" label="Q1"></dc-bar>
  <dc-bar value="-30" label="Q2"></dc-bar>
  <dc-bar value="25" label="Q3"></dc-bar>
</dc-chart>
```

**Line charts crossing zero:**
```html
<dc-chart width="600" height="400">
  <dc-line stroke="#2196F3" label="Temperature">
    <dc-point value="5" label="6am"></dc-point>
    <dc-point value="-2" label="Midnight"></dc-point>
    <dc-point value="8" label="Noon"></dc-point>
  </dc-line>
</dc-chart>
```

See [`examples/barcharts.html`](examples/barcharts.html) for comprehensive negative value examples.

### Number Formatting

Control how numeric values are displayed using the `value-format` and `percent-format` attributes. Supports named presets and a subset of d3-format syntax.

#### Named Presets

| Format | Example Input | Output |
|--------|---------------|--------|
| `number` | 1234.567 | 1,234.57 |
| `number 0` | 1234.567 | 1,235 |
| `number 4` | 1234.567 | 1,234.5670 |
| `compact` | 1234567 | 1.2M |
| `compact 1` | 1234567 | 1M |
| `currency USD` | 1234.56 | $1,234.56 |
| `currency EUR` | 1234.56 | €1,234.56 |
| `currency USD compact` | 1234567 | $1.2M |
| `currency EUR compact 1` | 1234567 | €1M |
| `percent` | 0.456 | 45.6% |
| `percent 0` | 0.456 | 46% |

#### d3-format Subset

| Format | Meaning | Output |
|--------|---------|--------|
| `,.2f` | Comma separator, 2 decimals | 1,234.57 |
| `,.0f` | Comma separator, 0 decimals | 1,235 |
| `.1s` | SI prefix, 1 sig digit | 1M |
| `.2s` | SI prefix, 2 sig digits | 1.2M |
| `$,.2f` | Dollar, comma, 2 decimals | $1,234.57 |
| `$,.0f` | Dollar, comma, 0 decimals | $1,235 |
| `.1%` | Percent, 1 decimal | 45.6% |
| `.0%` | Percent, 0 decimals | 46% |

#### Chart-Level Formatting

Set `value-format` on the chart to apply to all values:

```html
<!-- Currency format -->
<dc-chart value-format="currency USD">
  <dc-bar value="1234567" label="Revenue"></dc-bar>
  <dc-bar value="876543" label="Expenses"></dc-bar>
</dc-chart>

<!-- Compact numbers for large values -->
<dc-chart value-format="compact 1">
  <dc-bar value="45000000" label="Q1"></dc-bar>
  <dc-bar value="52000000" label="Q2"></dc-bar>
</dc-chart>

<!-- d3-format syntax -->
<dc-chart value-format="$,.0f">
  <dc-bar value="85000" label="Budget"></dc-bar>
</dc-chart>
```

#### Axis and Legend Formatting

Override formatting for axes and legends:

```html
<dc-chart value-format="currency USD">
  <!-- Compact format for axis labels only -->
  <dc-axis position="left" value-format="compact 1"></dc-axis>
  <dc-bar value="2500000" label="Product A"></dc-bar>
</dc-chart>

<!-- Legend with custom value and percent formatting -->
<dc-pie-chart show-value show-percent>
  <dc-legend value-format="currency USD" percent-format="percent 0"></dc-legend>
  <dc-pie-slice value="450000" label="North"></dc-pie-slice>
  <dc-pie-slice value="280000" label="South"></dc-pie-slice>
</dc-pie-chart>
```

#### Element-Level Formatting

Override formatting for individual elements:

```html
<dc-chart value-format="number 0">
  <dc-bar value="125000" label="Units Sold"></dc-bar>
  <dc-bar value="4750000" label="Revenue" value-format="currency USD"></dc-bar>
  <dc-bar value="0.38" label="Margin" value-format="percent 0"></dc-bar>
</dc-chart>
```

**Important:** Percent values should be passed as decimals (0.38 = 38%). The formatter multiplies by 100.

#### Locale Support

Number formatting respects the browser's locale by default. Override with the `locale` attribute:

```html
<!-- German locale: 1.234,56 -->
<dc-chart locale="de-DE" value-format="number 2">
  <dc-bar value="1234.56" label="Q1"></dc-bar>
</dc-chart>

<!-- Euro currency with German locale -->
<dc-chart locale="de-DE" value-format="currency EUR">
  <dc-bar value="45000" label="Budget"></dc-bar>
</dc-chart>
```

#### Format Inheritance

Formats cascade with the most specific taking precedence:

1. **Element-level** (highest): `<dc-bar value-format="...">`
2. **Legend/Axis-level**: `<dc-legend value-format="...">` or `<dc-axis value-format="...">`
3. **Chart-level**: `<dc-chart value-format="...">`
4. **Default**: `number` format with 2 decimal places

See [`examples/formatting.html`](examples/formatting.html) for comprehensive formatting examples.

## Components

### `<dc-chart>`

Renders a bar chart with support for both vertical and horizontal orientations.

**Attributes:**
- `orientation` (string) - Bar orientation: "vertical", "horizontal", "vertical-reverse", or "horizontal-reverse" (default: "vertical")
- `show-value` (boolean|string) - Whether to display numeric values on bars (default: true). See [Controlling Labels, Values, and Percentages](#controlling-labels-values-and-percentages)
- `show-percent` (boolean|string) - Whether to display percentages on bars (default: false)
- `fill-colors` (string) - Color palette for bars (single color or comma-separated list). See [Color System](#color-system)
- `fill-start-color` (string) - Start color for gradient fills
- `fill-end-color` (string) - End color for gradient fills
- `bar-width` (string) - Default width for bars (e.g., "50px", "2rem")
- `gutter` (number) - Space between bars in pixels (default: 10)
- Plus all [common chart attributes](#common-chart-attributes)

**Child Elements:**
- `<dc-title>` - Optional title
- `<dc-axis>` - Optional axis configuration (see [Axis Configuration](#axis-configuration))
- `<dc-bar>` - Individual bars (one or more)
- `<dc-bar-group>` - Optional groups of bars
- `<dc-bar-segment>` - Segments within a bar (for stacked bars)
- `<dc-legend>` - Optional legend

**Examples:**

Vertical bars (default):
```html
<dc-chart width="600" height="400">
  <dc-title>Sales Data</dc-title>
  <dc-bar value="10" fill="red" label="Jan"></dc-bar>
  <dc-bar value="20" fill="blue" label="Feb"></dc-bar>
</dc-chart>
```

Horizontal bars:
```html
<dc-chart width="600" height="400" orientation="horizontal">
  <dc-title>Sales Data</dc-title>
  <dc-bar value="10" fill="red" label="Jan"></dc-bar>
  <dc-bar value="20" fill="blue" label="Feb"></dc-bar>
</dc-chart>
```

Grouped bars:
```html
<dc-chart width="600" height="400">
  <dc-title>Sales by Quarter</dc-title>
  <dc-bar-group label="Q1">
    <dc-bar value="10" label="Product A" fill="blue"></dc-bar>
    <dc-bar value="15" label="Product B" fill="green"></dc-bar>
  </dc-bar-group>
  <dc-bar-group label="Q2">
    <dc-bar value="20" label="Product A" fill="blue"></dc-bar>
    <dc-bar value="25" label="Product B" fill="green"></dc-bar>
  </dc-bar-group>
</dc-chart>
```

Stacked bars:
```html
<dc-chart width="600" height="400">
  <dc-title>Revenue by Category</dc-title>
  <dc-bar label="Q1">
    <dc-bar-segment value="30" fill="#4CAF50" label="Online"></dc-bar-segment>
    <dc-bar-segment value="20" fill="#2196F3" label="In-Store"></dc-bar-segment>
  </dc-bar>
  <dc-bar label="Q2">
    <dc-bar-segment value="40" fill="#4CAF50" label="Online"></dc-bar-segment>
    <dc-bar-segment value="25" fill="#2196F3" label="In-Store"></dc-bar-segment>
  </dc-bar>
</dc-chart>
```

### `<dc-bar>`

Defines a single bar in a bar chart. Can contain `<dc-bar-segment>` children for stacked bars.

**Attributes:**
- `value` (number) - The bar's value (required unless using segments, in which case the total is calculated automatically)
- `fill` (string) - CSS color for the bar. See [Color System](#color-system)
- `label` (string) - Label displayed below the bar
- `href` (string) - Optional URL to navigate to when bar is clicked
- `target` (string) - Optional target for the link (e.g., "_blank")
- `show-value` (boolean|string) - Whether to display the numeric value (inherits from chart if not specified)
- `show-percent` (boolean|string) - Whether to display the percentage (inherits from chart if not specified)
- `width` (string) - Width for this specific bar (e.g., "50px", "2rem")

**Child Elements:**
- `<dc-bar-segment>` - Optional segments for stacked bars
- `<dc-popup>` - Optional popup content

### `<dc-bar-group>`

Groups multiple bars together with a shared label.

**Attributes:**
- `label` (string) - The label for this group (displayed on the axis)
- `bar-width` (string) - Width for bars in this group
- `gutter` (number) - Space between bars in this group

**Child Elements:**
- `<dc-bar>` - Individual bars that belong to this group

### `<dc-bar-segment>`

Defines a segment within a bar for creating stacked bar charts. When a `<dc-bar>` contains `<dc-bar-segment>` children, the bar displays as a stacked bar with the total value being the sum of all segment values.

**Attributes:**
- `value` (number) - The segment's value (required)
- `fill` (string) - CSS color for the segment. See [Color System](#color-system)
- `label` (string) - Label for this segment (used in legends and popups)
- `show-value` (boolean|string) - Whether to display the value on the segment (inherits from parent bar if not specified)
- `show-percent` (boolean|string) - Whether to display the percentage on the segment (inherits from parent bar if not specified)
- `href` (string) - Optional URL to navigate to when segment is clicked
- `target` (string) - Optional target for the link (e.g., "_blank")

**Example:**
```html
<dc-chart width="600" height="400">
  <dc-title>Quarterly Revenue by Product</dc-title>
  <dc-bar label="Q1">
    <dc-bar-segment value="30" fill="#4CAF50" label="Product A"></dc-bar-segment>
    <dc-bar-segment value="20" fill="#2196F3" label="Product B"></dc-bar-segment>
    <dc-bar-segment value="15" fill="#FF9800" label="Product C"></dc-bar-segment>
  </dc-bar>
  <dc-bar label="Q2">
    <dc-bar-segment value="35" fill="#4CAF50" label="Product A"></dc-bar-segment>
    <dc-bar-segment value="25" fill="#2196F3" label="Product B"></dc-bar-segment>
    <dc-bar-segment value="20" fill="#FF9800" label="Product C"></dc-bar-segment>
  </dc-bar>
</dc-chart>
```

**Stacking Direction:**
- Vertical bars: Segments stack bottom-to-top
- Horizontal bars: Segments stack left-to-right
- Vertical-reverse: Segments stack top-to-bottom
- Horizontal-reverse: Segments stack right-to-left

### `<dc-chart>`

Renders a line chart with support for multiple lines.

**Attributes:**
- `stroke-colors` (string) - Color palette for lines (single color or comma-separated list). See [Color System](#color-system)
- `stroke-start-color` (string) - Start color for gradient strokes
- `stroke-end-color` (string) - End color for gradient strokes
- `show-value` (boolean|string) - Whether to display numeric values on points (default: true). See [Controlling Labels, Values, and Percentages](#controlling-labels-values-and-percentages)
- `show-percent` (boolean|string) - Whether to display percentages on points (default: false)
- `point-shape` (string) - Default shape for points: "circle", "square", "triangle", "diamond", "star", "cross", "plus", or unicode character (default: "circle")
- Plus all [common chart attributes](#common-chart-attributes)

**Child Elements:**
- `<dc-title>` - Optional title
- `<dc-axis>` - Optional axis configuration (see [Axis Configuration](#axis-configuration))
- `<dc-line>` - Individual lines (one or more), each containing `<dc-point>` elements

### `<dc-line>`

Defines a single line in a line chart. Contains multiple `<dc-point>` elements.

**Attributes:**
- `stroke` (string) - CSS color for the line. See [Color System](#color-system)
- `label` (string) - Label for the line (for legend)
- `show-value` (boolean|string) - Whether to display values on points in this line (inherits from chart if not specified)
- `show-percent` (boolean|string) - Whether to display percentages on points in this line (inherits from chart if not specified)
- `point-shape` (string) - Default shape for points on this line (inherits from chart if not specified)

**Child Elements:**
- `<dc-point>` - Individual points (one or more)

### `<dc-point>`

Defines a single point in a line.

**Attributes:**
- `value` (number) - The point's value (required)
- `label` (string) - Label displayed below the point
- `show-value` (boolean|string) - Whether to display the value for this point (inherits from line or chart if not specified)
- `show-percent` (boolean|string) - Whether to display the percentage for this point (inherits from line or chart if not specified)
- `shape` (string) - Shape for this point (inherits from line or chart if not specified)

### `<dc-pie-chart>`

Renders a pie chart with support for donut charts.

**Attributes:**
- `fill-colors` (string) - Color palette for slices (single color or comma-separated list). See [Color System](#color-system)
- `fill-start-color` (string) - Start color for gradient fills
- `fill-end-color` (string) - End color for gradient fills
- `stroke-colors` (string) - Border color for slices
- `stroke-width` (number) - Border width in pixels
- `show-value` (boolean|string) - Whether to show values on slices (default: false). See [Controlling Labels, Values, and Percentages](#controlling-labels-values-and-percentages)
- `show-label` (boolean|string) - Whether to show labels on slices (default: true)
- `show-percent` (boolean|string) - Whether to show percentages on slices (default: true)
- `inner-radius` (number) - Inner radius as percentage (0-100) for donut charts (default: 0)
- Plus all [common chart attributes](#common-chart-attributes)

**Child Elements:**
- `<dc-title>` - Optional title
- `<dc-pie-slice>` - Individual slices (one or more)
- `<dc-legend>` - Optional legend

**Example:**
```html
<dc-pie-chart width="600" height="400">
  <dc-title>Sales by Category</dc-title>
  <dc-pie-slice value="30" label="Product A" fill="red"></dc-pie-slice>
  <dc-pie-slice value="45" label="Product B" fill="blue"></dc-pie-slice>
  <dc-pie-slice value="25" label="Product C" fill="green"></dc-pie-slice>
</dc-pie-chart>
```

Donut chart:
```html
<dc-pie-chart width="600" height="400" inner-radius="50">
  <dc-title>Sales Distribution</dc-title>
  <dc-pie-slice value="30" label="Product A"></dc-pie-slice>
  <dc-pie-slice value="70" label="Product B"></dc-pie-slice>
</dc-pie-chart>
```

### `<dc-pie-slice>`

Defines a single slice in a pie chart.

**Attributes:**
- `value` (number) - The slice's value (required)
- `label` (string) - Label for this slice
- `fill` (string) - CSS color for this slice. See [Color System](#color-system)
- `show-value` (boolean|string) - Whether to show the value on this slice (inherits from chart if not specified)
- `show-label` (boolean|string) - Whether to show the label on this slice (inherits from chart if not specified)
- `show-percent` (boolean|string) - Whether to show the percentage on this slice (inherits from chart if not specified)

### `<dc-funnel-chart>`

Renders a funnel chart with customizable stage heights, colors, and shapes.

**Attributes:**
- `fill-colors` (string) - Color palette for stages (single color or comma-separated list). See [Color System](#color-system)
- `fill-start-color` (string) - Start color for gradient fills
- `fill-end-color` (string) - End color for gradient fills
- `stroke` (string) - Shorthand for stroke color and width (e.g., "2 #333" or "#333 2")
- `stroke-colors` (string) - Stroke color for stage borders
- `stroke-width` (number) - Stroke width for stage borders in pixels (default: 0)
- `segment-height` (string) - Height mode: omit for equal heights, "value" for proportional scaling, "log-value" for logarithmic scaling, or fixed values like "50px"/"2rem". Can include min/max constraints (e.g., "value 50px 300px")
- `segment-min-height` (string) - Minimum height for any segment (e.g., "50px")
- `segment-max-height` (string) - Maximum height for any segment (e.g., "300px")
- `chevron` (string) - Chevron depth for V-shaped segments: values like "20px", "2rem", or "10%" (percentage of segment width). Omit or use "0" for straight edges
- `funnel-factor` (number) - Percentage controlling funnel narrowing (default: 70). Positive values narrow from top to bottom (e.g., 70 = bottom is 70% of top width). Negative values narrow from bottom to top
- `flat-top` (boolean) - When true and chevron is set, makes the top edge of the first segment horizontal (default: false)
- `flat-bottom` (boolean) - When true and chevron is set, makes the bottom edge of the last segment horizontal (default: false)
- `show-value` (boolean|string) - Whether to display values on stages (default: true). See [Controlling Labels, Values, and Percentages](#controlling-labels-values-and-percentages)
- `show-label` (boolean|string) - Whether to display labels on stages (default: true)
- `show-percent` (boolean|string) - Whether to display percentages on stages (default: false)
- Plus all [common chart attributes](#common-chart-attributes)

**Child Elements:**
- `<dc-title>` - Optional title
- `<dc-funnel-stage>` - Individual stages (one or more)
- `<dc-legend>` - Optional legend

**Examples:**

Basic funnel:
```html
<dc-funnel-chart width="600" height="400">
  <dc-title>Sales Funnel</dc-title>
  <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
  <dc-funnel-stage value="500" label="Leads"></dc-funnel-stage>
  <dc-funnel-stage value="100" label="Customers"></dc-funnel-stage>
</dc-funnel-chart>
```

Funnel with chevron shape:
```html
<dc-funnel-chart width="600" height="400" chevron="20px">
  <dc-title>Conversion Funnel</dc-title>
  <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
  <dc-funnel-stage value="500" label="Leads"></dc-funnel-stage>
  <dc-funnel-stage value="100" label="Customers"></dc-funnel-stage>
</dc-funnel-chart>
```

Funnel with custom gradient:
```html
<dc-funnel-chart width="600" height="400" fill-start-color="#4CAF50" fill-end-color="#F44336">
  <dc-funnel-stage value="1000" label="Stage 1"></dc-funnel-stage>
  <dc-funnel-stage value="500" label="Stage 2"></dc-funnel-stage>
</dc-funnel-chart>
```

Funnel with flat top and bottom edges:
```html
<dc-funnel-chart width="600" height="400" chevron="25px" flat-top flat-bottom>
  <dc-title>User Journey</dc-title>
  <dc-funnel-stage value="15000" label="Visitors"></dc-funnel-stage>
  <dc-funnel-stage value="8000" label="Engaged"></dc-funnel-stage>
  <dc-funnel-stage value="3000" label="Trialing"></dc-funnel-stage>
  <dc-funnel-stage value="1200" label="Subscribed"></dc-funnel-stage>
</dc-funnel-chart>
```

### `<dc-funnel-stage>`

Defines a single stage in a funnel chart.

**Attributes:**
- `value` (number) - The stage's value (required)
- `label` (string) - Label for this stage
- `fill` (string) - CSS color for this stage. See [Color System](#color-system)
- `stroke` (string) - Shorthand for stroke color and width (e.g., "2 #333")
- `stroke-color` (string) - Optional stroke color for this stage
- `stroke-width` (number) - Optional stroke width for this stage
- `show-value` (boolean|string) - Whether to show the value on this stage (inherits from chart if not specified)
- `show-label` (boolean|string) - Whether to show the label on this stage (inherits from chart if not specified)
- `show-percent` (boolean|string) - Whether to show the percentage on this stage (inherits from chart if not specified)

### `<dc-axis>`

Configures an axis on bar charts and line charts. Place inside any chart that extends AxisChart.

**Attributes:**
- `position` (string) - Axis position: "left", "right", "top", "bottom", "x", or "y" (default: "bottom"). The traditional names "x" and "y" map to physical positions (x=bottom, y=left).
- `label-interval` (number|string) - Controls which category labels are shown: "auto" (default, auto-hide overlapping), or a number (1=all, 2=every other, etc.)
- `label-lines` (number|string) - Staggers labels across multiple lines: 1 (default), 2, 3, etc., or "auto"

**Child Elements:**
- `<dc-title>` - Optional axis title

**Examples:**

Axis with custom label interval:
```html
<dc-chart width="600" height="400">
  <dc-axis position="bottom" label-interval="2"></dc-axis>
  <dc-title>Monthly Data</dc-title>
  <dc-bar value="10" label="Jan"></dc-bar>
  <dc-bar value="20" label="Feb"></dc-bar>
  <dc-bar value="30" label="Mar"></dc-bar>
</dc-chart>
```

Axis with title:
```html
<dc-chart width="600" height="400">
  <dc-axis position="left">
    <dc-title>Revenue ($)</dc-title>
  </dc-axis>
  <dc-axis position="bottom">
    <dc-title>Month</dc-title>
  </dc-axis>
  <dc-title>Monthly Sales</dc-title>
  <dc-bar value="120" label="Jan"></dc-bar>
  <dc-bar value="150" label="Feb"></dc-bar>
</dc-chart>
```

### `<dc-legend>`

Adds a legend to any chart type.

**Attributes:**
- `show-value` (boolean) - Whether to show values in legend (default: true)
- `show-percent` (boolean) - Whether to show percentages in legend (default: false)
- `show-label` (boolean) - Whether to show labels in legend (default: true)
- `columns` (string) - Number of columns: integer for tabular layout (default: "1"), or "*" for wrapped/inline layout
- `position` (string) - Position: "right" (default), "top", "top-left", "top-right", "left", "bottom", "bottom-left", "bottom-right"

**Child Elements:**
- `<dc-title>` - Optional custom title for the legend

**Examples:**

Basic legend:
```html
<dc-chart width="600" height="400">
  <dc-title>Chart Title</dc-title>
  <dc-bar value="10" label="Jan" fill="red"></dc-bar>
  <dc-bar value="20" label="Feb" fill="blue"></dc-bar>
  <dc-legend></dc-legend>
</dc-chart>
```

Legend with custom position and title:
```html
<dc-pie-chart width="600" height="400">
  <dc-title>Sales Data</dc-title>
  <dc-pie-slice value="30" label="Product A"></dc-pie-slice>
  <dc-pie-slice value="70" label="Product B"></dc-pie-slice>
  <dc-legend position="bottom">
    <dc-title>Products</dc-title>
  </dc-legend>
</dc-pie-chart>
```

### `<dc-title>`

Defines the chart title. Renders as an SVG `<text>` element.

**Content:** Text content of the element

**Styling Attributes:**

Since titles render as SVG, use SVG presentation attributes for styling:

| Attribute | Description | Example |
|-----------|-------------|---------|
| `fill` | Text color (use instead of `color`) | `fill="#1a1a1a"` |
| `font-size` | Font size in viewBox units (unitless, not `px`) | `font-size="24"` |
| `font-family` | Font family | `font-family="Georgia, serif"` |
| `font-weight` | Font weight | `font-weight="600"` |
| `font-style` | Font style | `font-style="italic"` |

**Important:** Font sizes are in viewBox coordinate units, not CSS pixels. A chart with `width="600"` uses a 600-unit coordinate space, so `font-size="20"` is 20/600 = 3.3% of the chart width.

**Example:**
```html
<!-- Styled title -->
<dc-chart width="600" height="400">
  <dc-title fill="#1a1a1a" font-size="24" font-family="Georgia, serif" font-weight="600">
    Sales Report 2024
  </dc-title>
  <dc-bar value="10" label="Q1"></dc-bar>
</dc-chart>
```

**Warning:** The library will log warnings if you accidentally use CSS conventions:
- Using `color` instead of `fill`
- Using CSS units like `font-size="24px"` instead of `font-size="24"`

### `<dc-popup>`

Displays HTML content in a popup when triggered by user interaction. Can be nested inside `<dc-bar>` or `<dc-point>` elements.

**Attributes:**
- `trigger` (string) - Event that triggers the popup: "hover" (default) or "click"

**Content:** HTML content to display in the popup

**Example:**
```html
<dc-bar value="150" fill="red" label="Q1">
  <dc-popup trigger="hover">
    <strong>Q1 2024</strong><br>
    Revenue: $150k<br>
    Growth: +12%
  </dc-popup>
</dc-bar>
```

**Triggers:**
- `hover`: Popup appears when mouse enters the element, disappears when leaving
- `click`: Popup appears on click, stays visible until clicking the same element again or elsewhere

### Auto-Popups

For quick tooltips without writing custom HTML, use the `auto-popup` attribute to automatically display label, value, and percentage information.

**Chart-level attribute:**
- `auto-popup` (boolean) - When present or `true`, automatically shows popups on all chart elements

**Element-level attribute:**
- `auto-popup` (boolean) - Override the chart setting for individual elements

**How it works:**
1. Set `auto-popup` on the chart to enable for all elements
2. Elements can override with their own `auto-popup` attribute (`true` or `false`)
3. Explicit `<dc-popup>` children always take precedence over auto-popup
4. Auto-popups always use hover trigger (not click)

**Examples:**

Enable auto-popup for all slices:
```html
<dc-pie-chart auto-popup width="600" height="400">
  <dc-pie-slice value="30" label="Product A"></dc-pie-slice>
  <dc-pie-slice value="45" label="Product B"></dc-pie-slice>
  <dc-pie-slice value="25" label="Product C"></dc-pie-slice>
</dc-pie-chart>
```

Disable auto-popup for specific elements:
```html
<dc-chart auto-popup width="600" height="400">
  <dc-bar value="100" label="Q1"></dc-bar>
  <dc-bar value="150" label="Q2"></dc-bar>
  <dc-bar value="80" label="Q3" auto-popup="false"></dc-bar>
</dc-chart>
```

Mix auto-popup with explicit popups:
```html
<dc-funnel-chart auto-popup width="600" height="400">
  <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
  <dc-funnel-stage value="500" label="Leads">
    <!-- Explicit popup takes precedence -->
    <dc-popup>
      <strong>Qualified Leads</strong><br>
      50% conversion rate
    </dc-popup>
  </dc-funnel-stage>
  <dc-funnel-stage value="100" label="Customers"></dc-funnel-stage>
</dc-funnel-chart>
```

**Auto-popup content format:**
- Shows label in bold
- Shows value
- Shows percentage of total
- For grouped bars, also shows group name

### `<dc-palette>`

Container for reusable fill definitions. Define once and reference from multiple charts.

**Attributes:**
- `id` (string) - Unique identifier to reference this palette from charts
- `high-contrast` (boolean) - When present, this palette is used when high contrast mode is active

**Child Elements:**
- `<dc-fill>` - Fill definitions (one or more)

**Example:**
```html
<dc-palette id="brand-colors">
  <dc-fill label="Revenue" fill="#2563eb"></dc-fill>
  <dc-fill label="Expenses" fill="#dc2626"></dc-fill>
</dc-palette>

<dc-chart palette="brand-colors">
  <dc-bar value="150" label="Revenue"></dc-bar>
  <dc-bar value="80" label="Expenses"></dc-bar>
</dc-chart>
```

### `<dc-fill>`

Defines a fill style (solid color and/or pattern) within a palette. Fills are matched to chart elements by label or value range.

**Attributes:**
- `id` (string) - Optional ID for direct reference via `pattern="id"`
- `label` (string) - Match elements with this label
- `fill` (string) - CSS color for the fill
- `stroke` (string) - CSS color for the stroke/border
- `pattern` (string) - Pattern type (see available patterns below)
- `scale` (number) - Pattern scale multiplier (default: 1)
- `min-value` (number) - Minimum value for range matching (inclusive)
- `max-value` (number) - Maximum value for range matching (exclusive)

**Available patterns:** `diagonal-lines`, `diagonal-lines-reverse`, `horizontal-lines`, `vertical-lines`, `dots`, `crosshatch`, `grid`, `checkerboard`

**Matching priority:**
1. Pattern fills with value match
2. Pattern fills with label match
3. Solid fills with value match
4. Solid fills with label match

**Examples:**

Label matching:
```html
<dc-fill label="Critical" fill="#fee2e2" pattern="crosshatch"></dc-fill>
```

Value range matching:
```html
<dc-fill max-value="30" fill="#fee2e2"></dc-fill>
<dc-fill min-value="30" max-value="70" fill="#fef3c7"></dc-fill>
<dc-fill min-value="70" fill="#dcfce7"></dc-fill>
```

ID reference:
```html
<dc-palette id="patterns">
  <dc-fill id="danger" pattern="crosshatch" stroke="#dc2626" fill="#fee2e2"></dc-fill>
</dc-palette>

<dc-bar value="25" pattern="danger"></dc-bar>
```

## Dynamic Updates

Charts automatically update when you modify their child elements.

### Hiding and Showing Elements

Use the standard HTML `hidden` attribute to dynamically show or hide chart elements. Supported on `<dc-line>`, `<dc-bar>`, `<dc-bar-group>`, and `<dc-bubble>`.

```html
<dc-chart id="my-chart" width="600" height="400">
  <dc-line stroke="#2196F3" label="Series A">...</dc-line>
  <dc-line stroke="#FF5722" label="Series B" hidden>...</dc-line>
</dc-chart>
```

Toggle visibility with JavaScript:

```javascript
// Toggle a line's visibility
const line = document.querySelector('#my-chart dc-line[label="Series B"]');
line.toggleAttribute('hidden');
document.querySelector('#my-chart').requestUpdate();
```

**Important:** After toggling the `hidden` attribute, call `requestUpdate()` on the chart to trigger a re-render.

**Interactive example with checkboxes:**
```html
<dc-chart id="chart" width="600" height="400">
  <dc-line stroke="#2196F3" label="Sales">...</dc-line>
  <dc-line stroke="#4CAF50" label="Revenue">...</dc-line>
</dc-chart>

<label>
  <input type="checkbox" checked onchange="
    document.querySelector('#chart dc-line[label=Sales]').toggleAttribute('hidden');
    document.querySelector('#chart').requestUpdate();
  "> Sales
</label>
<label>
  <input type="checkbox" checked onchange="
    document.querySelector('#chart dc-line[label=Revenue]').toggleAttribute('hidden');
    document.querySelector('#chart').requestUpdate();
  "> Revenue
</label>
```

### Modifying Elements

```javascript
// Add a bar
const chart = document.querySelector('dc-chart');
const bar = document.createElement('dc-bar');
bar.setAttribute('value', '25');
bar.setAttribute('color', 'purple');
bar.setAttribute('label', 'April');
chart.appendChild(bar);

// Update a bar
const firstBar = chart.querySelector('dc-bar');
firstBar.setAttribute('value', '50');

// Remove a bar
chart.removeChild(firstBar);
```

## Integration with htmx and Other Libraries

All shape elements (`<dc-bar>`, `<dc-line>`, `<dc-pie-slice>`, `<dc-funnel-stage>`) support **automatic attribute passthrough**. Any attributes not explicitly defined by the library are passed through to the rendered SVG elements. This makes the library compatible with htmx, Alpine.js, and other attribute-based libraries.

### How It Works

The library automatically:
1. Detects any attributes on shape elements that aren't part of the library's API
2. Applies these attributes to the corresponding SVG elements after rendering
3. Notifies htmx (if loaded) to process the new elements

No special setup is required—just add attributes to your shape elements and they'll work automatically.

### htmx Integration

You can add htmx attributes directly to shape elements to enable interactive, server-driven behaviors:

```html
<script src="https://unpkg.com/htmx.org@1.9.10"></script>

<dc-funnel-chart width="600" height="500">
  <dc-title>Conversion Funnel</dc-title>
  <dc-funnel-stage
    value="1000"
    label="Visitors"
    hx-get="/api/stage/visitors"
    hx-target="#details"
    hx-swap="innerHTML">
  </dc-funnel-stage>
  <dc-funnel-stage
    value="750"
    label="Sign-ups"
    hx-get="/api/stage/signups"
    hx-target="#details"
    hx-swap="innerHTML">
  </dc-funnel-stage>
  <dc-funnel-stage
    value="500"
    label="Active Users"
    hx-get="/api/stage/active"
    hx-target="#details"
    hx-swap="innerHTML">
  </dc-funnel-stage>
</dc-funnel-chart>

<div id="details"></div>
```

When users click on a funnel stage, htmx will load content from the specified endpoint into the `#details` div.

### Examples with Other Libraries

**Bar chart with custom data attributes:**
```html
<dc-chart width="600" height="400">
  <dc-bar value="10" label="Q1" data-quarter="1" data-year="2024"></dc-bar>
  <dc-bar value="20" label="Q2" data-quarter="2" data-year="2024"></dc-bar>
</dc-chart>
```

**Pie chart with Alpine.js:**
```html
<dc-pie-chart width="600" height="400">
  <dc-pie-slice value="30" label="Product A" @click="showDetails('a')"></dc-pie-slice>
  <dc-pie-slice value="45" label="Product B" @click="showDetails('b')"></dc-pie-slice>
</dc-pie-chart>
```

**Line chart with htmx:**
```html
<dc-chart width="600" height="400">
  <dc-line label="Sales" stroke="#2196F3"
           hx-get="/api/sales-data"
           hx-trigger="load"
           hx-target="#chart-container">
    <dc-point value="10" label="Jan"></dc-point>
    <dc-point value="20" label="Feb"></dc-point>
  </dc-line>
</dc-chart>
```

### Complete Example

See [`examples/htmx-integration.html`](examples/htmx-integration.html) for a complete working example of htmx integration with a funnel chart.

## Logging & Debugging

The library includes a built-in logging system to help you understand how charts calculate their internal layout. This is useful when troubleshooting layout issues or understanding why a chart renders the way it does.

### Enabling Logging

Add the `logging` attribute to any chart to enable log capture:

```html
<dc-chart id="my-chart" logging="info" width="600" height="400">
  <dc-bar value="10" fill="red" label="Jan"></dc-bar>
  <dc-bar value="20" fill="blue" label="Feb"></dc-bar>
</dc-chart>
```

### Log Levels

The `logging` attribute controls which messages are captured:

| Value | Description |
|-------|-------------|
| `false` | No logging (default, best performance) |
| `error` | Only errors |
| `warning` | Warnings and errors |
| `info` or `true` | All messages (info, warning, and error) |

### Displaying Logs with `<dc-log-console>`

Use the `<dc-log-console>` element to display log entries in a styled table:

```html
<dc-chart id="my-chart" logging="info" width="600" height="400">
  <dc-bar value="30" label="Q1"></dc-bar>
  <dc-bar value="45" label="Q2"></dc-bar>
</dc-chart>

<dc-log-console chart="#my-chart"></dc-log-console>
```

**Attributes:**
- `chart` (string, required) - CSS selector identifying the chart(s) to monitor

**Features:**
- Automatically updates when charts re-render
- When the selector matches multiple charts, tabs appear to switch between them
- Shows level, path, message, and value for each log entry
- Includes a refresh button to manually reload logs

**Multiple charts example:**
```html
<!-- Monitor all charts with a class -->
<dc-log-console chart=".my-charts"></dc-log-console>

<!-- Monitor specific chart types -->
<dc-log-console chart="dc-chart"></dc-log-console>
```

### Programmatic Access

You can access log entries directly via JavaScript:

```javascript
const chart = document.querySelector('dc-chart');
chart.logging = 'info';  // Enable logging
// ... wait for render ...
const logs = chart.getLogEntries();
console.table(logs);
```

Each log entry has this structure:
```typescript
interface LogEntry {
  level: 'error' | 'warning' | 'info';
  path: string;      // Dotted path like "padding.left" or "slices[0].angle"
  message: string;   // Human-readable description of the calculation
  value?: unknown;   // Optional computed value
}
```

### What Gets Logged

The logging system captures calculations including:

- **Padding calculations** - How padding values are derived from attributes, legends, and axis labels
- **Color resolution** - Which color mode was used (gradient, palette, auto) and any overrides
- **Legend dimensions** - Calculated width, height, layout type, and column count
- **Axis label padding** - Space allocated for Y-axis values and X-axis labels
- **Data summaries** - Element counts, max values, totals
- **Per-element details** - Individual bar/slice/stage positions, sizes, and percentages
- **Chart-specific calculations** - Bar unit dimensions, funnel segment heights, chevron parsing, etc.

### Example: Debugging a Layout Issue

If your bar chart has unexpected spacing, enable logging to see the calculations:

```html
<dc-chart id="debug-chart" logging="info" width="600" height="400" padding="40 80" gutter="20">
  <dc-bar value="30" label="A"></dc-bar>
  <dc-bar value="45" label="B"></dc-bar>
  <dc-bar value="20" label="C"></dc-bar>
</dc-chart>

<dc-log-console chart="#debug-chart"></dc-log-console>
```

The log console will show:
- Padding source and values (40 top/bottom, 80 left/right)
- Chart area dimensions (600 - 80 - 80 = 440px wide)
- Available space, gutter allocation, and calculated bar widths
- Each bar's calculated position and dimensions

### Complete Example

See [`examples/logging.html`](examples/logging.html) for working examples of the logging system with all chart types.

## Accessibility

Charts are automatically accessible to screen readers with ARIA attributes and intelligent auto-generated descriptions.

### Automatic ARIA Attributes

Every chart automatically includes:
- `role="img"` on the SVG element
- `aria-label` with chart type and title (e.g., "Bar chart: Sales Data")
- `aria-describedby` pointing to a `<desc>` element with detailed description

No configuration is needed—charts are accessible out of the box.

### Auto-Generated Insights

The library analyzes your chart data and generates meaningful descriptions that go beyond simple statistics:

| Chart Type | Example Description |
|------------|---------------------|
| Bar Chart | "4 bars, values from 38 to 95. Q4 highest at 95; Q3 lowest at 38" |
| Line Chart | "1 line with 5 points. Revenue: strong upward trend, highest at May (165)" |
| Pie Chart | "4 slices totaling 100. dominated by Leader at 55%" |
| Funnel Chart | "4 stages from 1000 to 50. 5.0% overall conversion; biggest drop from Leads to Opportunities (40% retained)" |

### Manual Overrides

For charts where you want to provide custom descriptions:

```html
<!-- Custom aria-label -->
<dc-chart aria-label="Q3 2024 revenue comparison across all regions">
  ...
</dc-chart>

<!-- Custom description with business context -->
<dc-chart aria-description="Revenue increased 15% overall. Western region led growth while Eastern region declined slightly.">
  ...
</dc-chart>
```

### Controlling Auto-Insights

Use the `aria-insights` attribute to control the level of auto-generated descriptions:

```html
<!-- Full insights with trend analysis (default) -->
<dc-chart aria-insights="auto">

<!-- Basic data summary only (no trend analysis) -->
<dc-chart aria-insights="basic">

<!-- No description generated -->
<dc-chart aria-insights="none">
```

**When to use each level:**
- `auto` (default): Best for most charts. Provides meaningful context for screen reader users.
- `basic`: Use when auto-insights might be misleading or when you provide a manual `aria-description`.
- `none`: Use only when you provide a complete manual description or when the chart is purely decorative.

### Keyboard Navigation

All chart types support full keyboard navigation, allowing users to interact with charts without a mouse.

**Keyboard Shortcuts:**

| Key | Action |
|-----|--------|
| Tab | Focus the chart |
| Arrow Right / Arrow Down | Move to next data element |
| Arrow Left / Arrow Up | Move to previous data element |
| Home | Move to first data element |
| End | Move to last data element |
| Enter / Space | Activate element (follow link or toggle popup) |
| Escape | Close popup and exit keyboard navigation |

**How it works:**

1. **Tab into the chart** - The chart receives focus and shows a focus indicator on the first data element
2. **Navigate with arrow keys** - Move between bars, line points, pie slices, or funnel stages
3. **Activate elements** - Press Enter or Space to:
   - Follow a link (if the element has an `href` attribute)
   - Toggle a click-triggered popup
   - Show a hover-triggered popup
4. **Exit navigation** - Press Escape to close any open popup and exit keyboard mode

**Visual feedback:**

When navigating with the keyboard, a blue dashed focus indicator appears around the currently focused element. This indicator only appears during keyboard navigation and disappears when using a mouse.

**Example with interactive elements:**

```html
<dc-chart width="600" height="400">
  <!-- Bar with link - Enter/Space follows the link -->
  <dc-bar value="150" label="Q1" href="/reports/q1" fill="#4CAF50"></dc-bar>

  <!-- Bar with popup - Enter/Space toggles the popup -->
  <dc-bar value="200" label="Q2" fill="#2196F3">
    <dc-popup trigger="click">
      <strong>Q2 Details</strong><br>
      Revenue: $200k
    </dc-popup>
  </dc-bar>

  <!-- Bar with hover popup - popup shows on focus -->
  <dc-bar value="175" label="Q3" fill="#FF9800">
    <dc-popup trigger="hover">Q3: $175k revenue</dc-popup>
  </dc-bar>
</dc-chart>
```

### Testing with Screen Readers

To test accessibility:

**Windows (NVDA):**
1. Download NVDA from nvaccess.org
2. Navigate to a chart with Tab or arrow keys
3. NVDA announces the chart's label and description

**Mac (VoiceOver):**
1. Press Cmd+F5 to enable VoiceOver
2. Navigate with VoiceOver cursor (Ctrl+Option+arrows)
3. VoiceOver reads the chart's accessible content

**Browser DevTools:**
1. Inspect the chart's SVG element
2. Check the Accessibility tab in DevTools
3. Verify `role`, `aria-label`, and `aria-describedby` are present

### Complete Example

See [`examples/accessibility.html`](examples/accessibility.html) for comprehensive accessibility examples and a screen reader testing guide.

## Project Structure

```
declarative-charts/
├── src/
│   ├── chart.ts               # Unified axis chart component (bar, line, bubble)
│   ├── pie-chart.ts           # Pie chart component
│   ├── funnel-chart.ts        # Funnel chart component
│   ├── axis-chart.ts          # Abstract base for axis-based charts
│   ├── accessibility/         # Accessibility utilities
│   │   ├── insights.ts        # Auto-generated description analysis
│   │   └── index.ts           # Accessibility exports
│   ├── chart-bar.ts           # Bar element
│   ├── chart-bar-group.ts     # Bar group element
│   ├── chart-bar-segment.ts   # Bar segment element (for stacked bars)
│   ├── chart-line.ts          # Line element
│   ├── chart-point.ts         # Point element
│   ├── chart-pie-slice.ts     # Pie slice element
│   ├── chart-funnel-stage.ts  # Funnel stage element
│   ├── chart-popup.ts         # Popup element
│   ├── chart-title.ts         # Title element
│   ├── chart-legend.ts        # Legend element
│   ├── chart-palette.ts       # Palette container element
│   ├── chart-fill.ts          # Fill definition element (colors/patterns)
│   ├── patterns.ts            # SVG pattern definitions
│   ├── log-console.ts         # Log console element for debugging
│   ├── base-chart.ts          # Abstract base for all charts
│   ├── base-chart-element.ts  # Abstract base for data elements
│   ├── base-shape.ts          # Abstract base for shape elements
│   └── index.ts               # Main export
├── index.html                 # Demo page
├── examples/                  # Example HTML files
├── package.json               # Project config
├── tsconfig.json              # TypeScript config
└── vite.config.ts             # Vite config
```

## Development

### File Watching
Run `npm run dev` and edit files in `src/`. The browser will update automatically.

### Adding New Chart Types
1. Create a new component file in `src/` (e.g., `pie-chart.ts`)
2. Extend `LitElement` with your chart logic
3. Export it from `src/index.ts`

### TypeScript
All components are written in TypeScript with full type definitions. VS Code will provide autocomplete and type checking.

## Why This Library?

Most chart libraries require complex configuration objects. This library lets you define charts declaratively in HTML, making them:

- **Easier to read** - HTML structure matches visual structure
- **Easier to generate** - Template engines can create charts naturally
- **Easier to style** - Each element can be styled individually
- **Framework-agnostic** - Works with React, Vue, Angular, or plain HTML

## License

MIT

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features including additional chart types, animations, axis configuration, and npm publishing.
