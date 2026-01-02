# API Reference

Complete documentation for all elements and attributes in the Declarative Chart Library.

## Table of Contents

- [Default Configuration](#default-configuration)
- [Common Chart Attributes](#common-chart-attributes)
- [Color System](#color-system)
- [Palettes and Pattern Fills](#palettes-and-pattern-fills)
- [Controlling Labels, Values, and Percentages](#controlling-labels-values-and-percentages)
- [Negative Values](#negative-values)
- [Number Formatting](#number-formatting)
- [Components](#components)
- [Dynamic Updates](#dynamic-updates)
- [Integration with htmx and Other Libraries](#integration-with-htmx-and-other-libraries)
- [Logging & Debugging](#logging--debugging)
- [Accessibility](#accessibility)

---

## Default Configuration

The `<dc-defaults>` element allows you to configure default attribute values for charts. Instead of repeating the same attributes on every chart, set them once and have all charts inherit those values.

### Basic Usage

Place a `<dc-defaults>` element before your charts to set defaults:

```html
<!-- Page-wide defaults -->
<dc-defaults animations palette="viridis" value-format="compact 1"></dc-defaults>

<dc-chart>
  <dc-bar value="1500000" label="Q1"></dc-bar>
  <dc-bar value="2300000" label="Q2"></dc-bar>
</dc-chart>

<dc-pie-chart>
  <dc-pie-slice value="60" label="Desktop"></dc-pie-slice>
  <dc-pie-slice value="40" label="Mobile"></dc-pie-slice>
</dc-pie-chart>
```

Both charts will use animations, the viridis palette, and compact number formatting.

### Scoped Defaults

Defaults can be scoped to specific containers:

```html
<!-- Outer defaults apply to charts outside the section -->
<dc-defaults palette="category10"></dc-defaults>

<dc-chart>...</dc-chart>  <!-- Uses category10 -->

<div class="high-contrast-section">
  <!-- Inner defaults apply only to charts in this container -->
  <dc-defaults high-contrast animations="false"></dc-defaults>

  <dc-chart>...</dc-chart>  <!-- Uses high-contrast, no animations -->
  <dc-pie-chart>...</dc-pie-chart>  <!-- Also high-contrast, no animations -->
</div>

<dc-chart>...</dc-chart>  <!-- Uses category10 (outer defaults) -->
```

### Priority Order

Attribute values are resolved in this order (first defined wins):

1. **Explicit attribute** on the chart element
2. **Nearest `<dc-defaults>`** ancestor (scoped defaults)
3. **Document-level `<dc-defaults>`** (page-wide defaults)
4. **Library default** (hardcoded fallback)

```html
<dc-defaults palette="viridis" animations></dc-defaults>

<!-- Uses viridis palette but NO animations (explicit override) -->
<dc-chart palette="viridis" animations="false">...</dc-chart>

<!-- Uses both defaults (animations and viridis) -->
<dc-chart>...</dc-chart>
```

### Supported Attributes

The following attributes can be configured via `<dc-defaults>`:

| Attribute | Type | Description |
|-----------|------|-------------|
| `animations` | string | Entry animation setting (`"true"`, `"500ms"`, `"false"`) |
| `palette` | string | Default palette name or ID |
| `high-contrast` | boolean | Enable high contrast mode |
| `show-value` | boolean/threshold | Show numeric values on elements |
| `show-label` | boolean/threshold | Show labels on elements |
| `show-percent` | boolean/threshold | Show percentages on elements |
| `value-format` | string | Number format for values |
| `percent-format` | string | Number format for percentages |
| `label-position` | string | Default label position |
| `label-fill` | string | Default label color |
| `stroke` | string | Default stroke color |
| `stroke-width` | number | Default stroke width |
| `auto-popup` | boolean | Enable hover popups |
| `logging` | string | Logging level |
| `console-log` | string | Console output level |
| `padding` | string | Chart padding (CSS shorthand) |
| `padding-top` | string | Top padding |
| `padding-right` | string | Right padding |
| `padding-bottom` | string | Bottom padding |
| `padding-left` | string | Left padding |

### Site-Wide Defaults (JavaScript API)

For defaults that apply across multiple pages, use the `configure()` function from a shared JavaScript module:

```javascript
// config.js - loaded on every page
import { configure } from 'declarative-charts';

configure({
  animations: true,
  palette: 'viridis',
  valueFormat: 'compact 1',
  highContrast: false,
});
```

```html
<!-- In each page -->
<script type="module" src="config.js"></script>
<script type="module" src="declarative-charts.js"></script>

<dc-chart>...</dc-chart>  <!-- Uses site-wide defaults -->
```

**API:**

```javascript
import { configure, getConfiguration } from 'declarative-charts';

// Set site-wide defaults (clears previous configuration)
configure({
  animations: true,           // or '500ms'
  palette: 'viridis',
  highContrast: false,
  showValue: true,
  showLabel: true,
  showPercent: false,
  valueFormat: 'number 2',
  percentFormat: 'percent 1',
  labelPosition: 'outside',
  labelFill: 'auto',
  stroke: '#333',
  strokeWidth: 1,
  autoPopup: false,
  logging: 'false',
  consoleLog: 'none',
  padding: '5%',
});

// Get current configuration
const config = getConfiguration();
console.log(config.palette);  // 'viridis'

// Reset to library defaults
configure({});
```

**Priority order** (first defined wins):
1. Explicit attribute on the chart element
2. Nearest `<dc-defaults>` ancestor (page/container scope)
3. Global defaults set via `configure()` (site-wide)
4. Library hardcoded defaults

---

## Common Chart Attributes

All chart components (`<dc-chart>`, `<dc-pie-chart>`, `<dc-funnel-chart>`, `<dc-stage-chart>`) share these common attributes:

### Dimensions
- `width` (number) - Chart width in pixels (default: 600)
- `height` (number) - Chart height in pixels (default: 400)

### Auto-Popup
- `auto-popup` (boolean) - When present or `true`, automatically shows hover popups with label, value, and percentage on all chart elements. See [Auto-Popups](#auto-popups) for details.

### Logging
- `logging` (string) - Controls log capture level: `'false'` (default, no logging), `'error'`, `'warning'`, `'info'`, or `'true'` (same as `'info'`). See [Logging & Debugging](#logging--debugging) for details.
- `console-log` (string) - Controls which captured logs are echoed to browser console: `'none'` (default), `'error'`, `'warning'`, or `'info'`. See [Browser Console Output](#browser-console-output) for details.

### Animation
- `animations` (string) - Enable entry animations when the chart first renders. See [Animations](#animations) for details.
  - `"true"` or `""` (empty) - Enable with default duration (300ms)
  - `"500ms"` or `"0.5s"` - Custom duration
  - `"false"` - Explicitly disable

```html
<!-- Enable with default duration -->
<dc-chart animations>...</dc-chart>

<!-- Custom duration -->
<dc-chart animations="500ms">...</dc-chart>

<!-- Disable explicitly -->
<dc-chart animations="false">...</dc-chart>
```

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

---

## Color System

The library uses an SVG-aligned color system with `fill` for shape fills and `stroke` for lines/borders. Colors can be set at multiple levels with a clear priority order.

### Color Priority (highest to lowest)

1. **Element-level** - `fill` or `stroke` on individual elements
2. **Custom palette match** - Label or value matching via `<dc-palette>`
3. **Palette by index** - Colors from palette applied in order
4. **Auto-generated** - Algorithmic color generation when nothing else is specified

### Element-Level Colors

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

### Using Palettes

Reference a custom `<dc-palette>` or a built-in palette name using the `palette` attribute:

```html
<!-- Built-in palette -->
<dc-chart palette="category10">
  <dc-bar value="10" label="Q1"></dc-bar>
  <dc-bar value="20" label="Q2"></dc-bar>
  <dc-bar value="15" label="Q3"></dc-bar>
</dc-chart>

<!-- Custom palette with label matching -->
<dc-palette id="brand">
  <dc-fill label="Revenue" fill="#2563eb"></dc-fill>
  <dc-fill label="Expenses" fill="#dc2626"></dc-fill>
</dc-palette>
<dc-chart palette="brand">
  <dc-bar value="150" label="Revenue"></dc-bar>
  <dc-bar value="80" label="Expenses"></dc-bar>
</dc-chart>
```

**Built-in palettes:**
- **Categorical:** `category10`, `accent`, `dark2`, `paired`, `pastel`, `set1`, `set2`, `set3`, `tableau10`
- **Sequential:** `blue`, `green`, `red`, `orange`, `purple`, `gray`, `viridis`, `plasma`, `warm`, `cool`, `turbo`
- **Diverging:** `red-blue`, `purple-green`, `brown-teal`, `pink-green`, `spectral`

See [Palettes and Pattern Fills](#palettes-and-pattern-fills) for more details.

### Auto-Generated Colors

When no colors are specified, charts automatically generate distinct colors using a golden ratio algorithm:

```html
<!-- Auto-generated colors for each slice -->
<dc-pie-chart>
  <dc-pie-slice value="25" label="Category A"></dc-pie-slice>
  <dc-pie-slice value="20" label="Category B"></dc-pie-slice>
  <dc-pie-slice value="18" label="Category C"></dc-pie-slice>
</dc-pie-chart>
```

### Stroke Properties

Control borders/outlines with stroke attributes:

```html
<!-- Pie chart with custom border on each slice -->
<dc-pie-chart stroke-width="2">
  <dc-pie-slice value="35" fill="#4CAF50" stroke="#333" label="A"></dc-pie-slice>
  <dc-pie-slice value="28" fill="#2196F3" stroke="#333" label="B"></dc-pie-slice>
</dc-pie-chart>

<!-- Funnel with shorthand stroke -->
<dc-funnel-chart stroke="2 #333">
  <dc-funnel-stage value="1000" label="Stage 1"></dc-funnel-stage>
</dc-funnel-chart>
```

### Color Attributes Summary

| Level | Fill Attributes | Stroke Attributes |
|-------|-----------------|-------------------|
| Element | `fill` | `stroke` |
| Chart | `palette` | `stroke-width` |
| Chart (shorthand) | - | `stroke` (e.g., "2 #333") |

See [`examples/colors.html`](examples/colors.html) for comprehensive color system examples.

---

## Palettes and Pattern Fills

For more sophisticated color schemes, use `<dc-palette>` with `<dc-fill>` elements to define reusable fills that can include solid colors, patterns, and conditional matching.

### Basic Palette Usage

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

### Pattern Fills

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

### Value-Based Matching

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

### High Contrast Mode

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

---

## Controlling Labels, Values, and Percentages

All chart types support `show-label`, `show-value`, and `show-percent` attributes to control what text is displayed on chart elements. These attributes can be set at the chart level (applying to all elements) or on individual elements (overriding the chart-level setting).

### Attribute Values

The `show-*` attributes accept several types of values:

| Value | Description | Example |
|-------|-------------|---------|
| `true` or present | Always show | `show-value` or `show-value="true"` |
| `false` | Never show | `show-value="false"` |
| Percentage threshold | Show only when element's percentage >= threshold | `show-label="5%"` |
| Value threshold | Show only when element's value >= threshold | `show-value="100"` |

### Chart-Level Defaults

Different chart types have different defaults:

| Chart Type | `show-label` | `show-value` | `show-percent` |
|------------|--------------|--------------|----------------|
| Bar Chart | true | true | false |
| Line Chart | true | true | false |
| Pie Chart | true | false | true |
| Funnel Chart | true | true | false |

### Examples

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

### Value String Formatting

When both `show-value` and `show-percent` are enabled, the display format is:
- Both false: nothing displayed
- `show-value` only: displays the value (e.g., "150")
- `show-percent` only: displays the percentage (e.g., "25.0%")
- Both true: displays "value (percent%)" (e.g., "150 (25.0%)")

### Inheritance Hierarchy

Settings cascade from chart to element with explicit settings taking precedence:

1. **Element-level** (highest priority): `<dc-bar show-value="false">`
2. **Parent-level** (for nested elements): `<dc-line show-value="false">` affects child `<dc-point>` elements
3. **Chart-level**: `<dc-chart show-value="false">`
4. **Default**: Chart-type specific defaults

See [`examples/data-labels.html`](examples/data-labels.html) for comprehensive examples of all `show-*` attribute features.

---

## Label Positioning

Control where labels appear on chart elements using `label-position` and offset attributes. These can be set at the chart level (applying to all elements) or on individual elements.

### Common Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `label-position` | string | Where to place the label (values depend on element type) |
| `label-offset-x` | number | Horizontal adjustment in viewBox units (positive = right) |
| `label-offset-y` | number | Vertical adjustment in viewBox units (positive = down) |
| `label-offset-r` | number | Radial adjustment (positive = away from reference point) |
| `label-fill` | string | Text fill color: `"auto"` (default) or any CSS color |

### Label Fill Color

The `label-fill` attribute controls the text color of labels. By default (`"auto"`), the color is automatically calculated for optimal contrast:

- **Inside shapes**: Uses a contrasting color against the shape's fill (e.g., white text on dark shapes, dark text on light shapes)
- **Outside shapes**: Uses dark text (`#333`) for readability against the chart background

When `label-position` changes, `label-fill="auto"` automatically recalculates to ensure readability. You can override with any CSS color value.

```html
<!-- Auto contrast (default) -->
<dc-chart label-position="inside-center">
  <dc-bar value="100" fill="#1e3a5f" label="Dark bar"></dc-bar>  <!-- White text auto -->
  <dc-bar value="80" fill="#f0f0f0" label="Light bar"></dc-bar>  <!-- Dark text auto -->
</dc-chart>

<!-- Explicit color -->
<dc-bar value="100" label="Custom" label-fill="#ff6600"></dc-bar>
```

### Position Values by Element Type

**Bars** (`<dc-bar>`):
| Value | Description |
|-------|-------------|
| `outside` | Outside bar, away from zero (default) |
| `inside-top` | Inside bar, near value end |
| `inside-center` | Inside bar, centered |
| `inside-bottom` | Inside bar, near zero line |
| `outside-top` | Alias for `outside` |
| `outside-bottom` | Outside bar, toward zero line |

**Points/Lines** (`<dc-point>`):
| Value | Description |
|-------|-------------|
| `above` | Above the point (default) |
| `above-left` | Above and left-aligned |
| `above-right` | Above and right-aligned |
| `below` | Below the point |
| `below-left` | Below and left-aligned |
| `below-right` | Below and right-aligned |
| `left` | Left of the point |
| `right` | Right of the point |
| `center` | Centered on the point |

**Bubbles** (`<dc-bubble>`):
Same as Points, plus:
| Value | Description |
|-------|-------------|
| `inside` | Centered inside the bubble |

**Pie Slices** (`<dc-pie-slice>`):
| Value | Description |
|-------|-------------|
| `inside` | Inside the slice (default) |
| `outside` | Outside the slice, along radial line |

**Funnel Stages** (`<dc-funnel-stage>`):
| Value | Description |
|-------|-------------|
| `inside` | Inside the stage (default) |
| `outside-left` | Outside, to the left |
| `outside-right` | Outside, to the right |

**Stage Chart Stages** (`<dc-stage>`):
| Value | Description |
|-------|-------------|
| `inside` | Inside the stage shape (default) |
| `outside-left` | Outside, to the left |
| `outside-right` | Outside, to the right |
| `above` | Above the stage shape |
| `below` | Below the stage shape |

### Inheritance

Settings cascade from chart to element:
1. **Element-level**: `<dc-bar label-position="inside-center">`
2. **Parent-level** (for lines): `<dc-line label-position="below">` affects child points
3. **Chart-level**: `<dc-chart label-position="inside-top">`
4. **Default**: Element-type specific default

### Examples

**Bar chart with inside labels:**
```html
<dc-chart label-position="inside-center">
  <dc-bar value="120" label="A"></dc-bar>
  <dc-bar value="180" label="B"></dc-bar>
</dc-chart>
```

**Line chart with labels below points:**
```html
<dc-chart>
  <dc-line label="Sales" label-position="below">
    <dc-point value="100" label="Jan"></dc-point>
    <dc-point value="150" label="Feb"></dc-point>
  </dc-line>
</dc-chart>
```

**Pie chart with outside labels:**
```html
<dc-pie-chart label-position="outside">
  <dc-pie-slice value="60" label="Product A"></dc-pie-slice>
  <dc-pie-slice value="40" label="Product B"></dc-pie-slice>
</dc-pie-chart>
```

**Fine-tuning with offsets:**
```html
<!-- Move labels 10 units right and 5 units down -->
<dc-chart label-offset-x="10" label-offset-y="5">
  <dc-bar value="100" label="A"></dc-bar>
  <!-- Override for specific bar -->
  <dc-bar value="200" label="B" label-offset-y="-10"></dc-bar>
</dc-chart>
```

**Radial offset (useful for pie/bubble charts):**
```html
<!-- Push labels further out from center -->
<dc-pie-chart label-position="outside" label-offset-r="15">
  <dc-pie-slice value="60" label="Large"></dc-pie-slice>
  <dc-pie-slice value="40" label="Small"></dc-pie-slice>
</dc-pie-chart>
```

---

## Negative Values

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

---

## Number Formatting

Control how numeric values are displayed using the `value-format` and `percent-format` attributes. Supports named presets and a subset of d3-format syntax.

### Named Presets

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

### d3-format Subset

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

### Chart-Level Formatting

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

### Axis and Legend Formatting

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

### Element-Level Formatting

Override formatting for individual elements:

```html
<dc-chart value-format="number 0">
  <dc-bar value="125000" label="Units Sold"></dc-bar>
  <dc-bar value="4750000" label="Revenue" value-format="currency USD"></dc-bar>
  <dc-bar value="0.38" label="Margin" value-format="percent 0"></dc-bar>
</dc-chart>
```

**Important:** Percent values should be passed as decimals (0.38 = 38%). The formatter multiplies by 100.

### Locale Support

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

### Format Inheritance

Formats cascade with the most specific taking precedence:

1. **Element-level** (highest): `<dc-bar value-format="...">`
2. **Legend/Axis-level**: `<dc-legend value-format="...">` or `<dc-axis value-format="...">`
3. **Chart-level**: `<dc-chart value-format="...">`
4. **Default**: `number` format with 2 decimal places

See [`examples/formatting.html`](examples/formatting.html) for comprehensive formatting examples.

---

## Components

### `<dc-chart>`

Renders bar, line, or bubble charts depending on child elements.

**Attributes:**
- `orientation` (string) - Bar orientation: "vertical", "horizontal", "vertical-reverse", or "horizontal-reverse" (default: "vertical")
- `show-value` (boolean|string) - Whether to display numeric values on bars (default: true)
- `show-percent` (boolean|string) - Whether to display percentages on bars (default: false)
- `palette` (string) - Reference to a custom `<dc-palette>` ID or built-in palette name (e.g., "category10", "viridis")
- `bar-width` (string) - Default width for bars (e.g., "50px", "2rem")
- `gutter` (number) - Space between bars in pixels (default: 10)
- `point-shape` (string) - Default shape for points: "circle", "square", "triangle", "diamond", "star", "cross", "plus", or unicode character (default: "circle")
- `overlapping` (boolean) - When true, multiple areas overlap instead of stacking (default: false)
- Plus all [common chart attributes](#common-chart-attributes)

**Child Elements:**
- `<dc-title>` - Optional title
- `<dc-axis>` - Optional axis configuration
- `<dc-bar>` - Individual bars (one or more)
- `<dc-bar-group>` - Optional groups of bars
- `<dc-line>` - Individual lines, each containing `<dc-point>` elements
- `<dc-area>` - Individual areas, each containing `<dc-point>` elements
- `<dc-bubble>` - Individual bubbles
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
- `value` (number) - The bar's value (required unless using segments)
- `fill` (string) - CSS color for the bar
- `label` (string) - Label displayed below the bar
- `href` (string) - Optional URL to navigate to when bar is clicked
- `target` (string) - Optional target for the link (e.g., "_blank")
- `show-value` (boolean|string) - Whether to display the numeric value
- `show-percent` (boolean|string) - Whether to display the percentage
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

Defines a segment within a bar for creating stacked bar charts.

**Attributes:**
- `value` (number) - The segment's value (required)
- `fill` (string) - CSS color for the segment
- `label` (string) - Label for this segment (used in legends and popups)
- `show-value` (boolean|string) - Whether to display the value on the segment
- `show-percent` (boolean|string) - Whether to display the percentage on the segment
- `href` (string) - Optional URL to navigate to when segment is clicked
- `target` (string) - Optional target for the link

**Stacking Direction:**
- Vertical bars: Segments stack bottom-to-top
- Horizontal bars: Segments stack left-to-right
- Vertical-reverse: Segments stack top-to-bottom
- Horizontal-reverse: Segments stack right-to-left

### `<dc-line>`

Defines a single line in a line chart. Contains multiple `<dc-point>` elements.

**Attributes:**
- `stroke` (string) - CSS color for the line
- `label` (string) - Label for the line (for legend)
- `show-value` (boolean|string) - Whether to display values on points in this line
- `show-percent` (boolean|string) - Whether to display percentages on points in this line
- `point-shape` (string) - Default shape for points on this line

**Child Elements:**
- `<dc-point>` - Individual points (one or more)

### `<dc-area>`

Defines a filled area in an area chart. Contains multiple `<dc-point>` elements.

Areas are filled regions bounded by data points above and the zero line (or chart bottom) below. When multiple areas are present, they stack by default (each area's baseline is the cumulative sum of previous areas). Use the `overlapping` attribute on the parent `<dc-chart>` to disable stacking.

**Attributes:**
- `fill` (string) - CSS color for the area fill
- `fill-opacity` (number) - Opacity of the area fill, 0-1 (default: 0.5)
- `stroke` (string) - CSS color for the top edge line (defaults to fill color)
- `stroke-width` (number) - Width of the top edge stroke (default: 2)
- `label` (string) - Label for the area (for legend)
- `curve-fit` (string) - Curve fitting method: "linear", "smooth", "monotone", "step" (default: "linear")
- `show-value` (boolean|string) - Whether to display values on points (default: true)
- `show-percent` (boolean|string) - Whether to display percentages on points
- `pattern` (string) - Pattern type ("diagonal-lines", "dots", etc.) or ID reference
- `pattern-stroke` (string) - Pattern element color
- `pattern-fill` (string) - Pattern background color
- `pattern-scale` (number) - Pattern size multiplier (default: 1)

**Child Elements:**
- `<dc-point>` - Individual points (one or more)

**Examples:**

Basic area chart:
```html
<dc-chart width="600" height="400">
  <dc-title>Website Traffic</dc-title>
  <dc-area fill="#4CAF50" label="Visitors">
    <dc-point value="100" label="Mon"></dc-point>
    <dc-point value="150" label="Tue"></dc-point>
    <dc-point value="180" label="Wed"></dc-point>
  </dc-area>
</dc-chart>
```

Stacked area chart (default behavior):
```html
<dc-chart width="600" height="400">
  <dc-area fill="#4CAF50" label="Product A">
    <dc-point value="100" label="Q1"></dc-point>
    <dc-point value="120" label="Q2"></dc-point>
  </dc-area>
  <dc-area fill="#2196F3" label="Product B">
    <dc-point value="80" label="Q1"></dc-point>
    <dc-point value="90" label="Q2"></dc-point>
  </dc-area>
</dc-chart>
```

Overlapping areas (year-over-year comparison):
```html
<dc-chart width="600" height="400" overlapping>
  <dc-area fill="#4CAF50" fill-opacity="0.3" label="2023">
    <dc-point value="100" label="Q1"></dc-point>
    <dc-point value="150" label="Q2"></dc-point>
  </dc-area>
  <dc-area fill="#2196F3" fill-opacity="0.3" label="2024">
    <dc-point value="120" label="Q1"></dc-point>
    <dc-point value="180" label="Q2"></dc-point>
  </dc-area>
</dc-chart>
```

### `<dc-point>`

Defines a single point in a line.

**Attributes:**
- `value` (number) - The point's value (required)
- `label` (string) - Label displayed below the point
- `show-value` (boolean|string) - Whether to display the value for this point
- `show-percent` (boolean|string) - Whether to display the percentage for this point
- `shape` (string) - Shape for this point

### `<dc-bubble>`

Defines a bubble in a bubble chart.

**Attributes:**
- `value` (number) - The bubble's Y-axis value (required)
- `size-value` (number) - The value that determines bubble size (required)
- `label` (string) - Label for the bubble
- `fill` (string) - CSS color for the bubble

### `<dc-pie-chart>`

Renders a pie chart with support for donut charts.

**Attributes:**
- `palette` (string) - Reference to a custom `<dc-palette>` ID or built-in palette name
- `stroke-width` (number) - Border width in pixels
- `show-value` (boolean|string) - Whether to show values on slices (default: false)
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
- `fill` (string) - CSS color for this slice
- `show-value` (boolean|string) - Whether to show the value on this slice
- `show-label` (boolean|string) - Whether to show the label on this slice
- `show-percent` (boolean|string) - Whether to show the percentage on this slice

### `<dc-funnel-chart>`

Renders a funnel chart with customizable stage heights, colors, and shapes.

**Attributes:**
- `palette` (string) - Reference to a custom `<dc-palette>` ID or built-in palette name
- `stroke` (string) - Shorthand for stroke color and width (e.g., "2 #333")
- `stroke-width` (number) - Stroke width for stage borders in pixels (default: 0)
- `segment-height` (string) - Height mode: omit for equal heights, "value" for proportional scaling, "log-value" for logarithmic scaling, or fixed values like "50px"/"2rem"
- `segment-min-height` (string) - Minimum height for any segment
- `segment-max-height` (string) - Maximum height for any segment
- `chevron` (string) - Chevron depth for V-shaped segments (e.g., "20px", "10%")
- `funnel-factor` (number) - Percentage controlling funnel narrowing (default: 70)
- `flat-top` (boolean) - Makes the top edge of the first segment horizontal
- `flat-bottom` (boolean) - Makes the bottom edge of the last segment horizontal
- `show-value` (boolean|string) - Whether to display values on stages (default: true)
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

### `<dc-funnel-stage>`

Defines a single stage in a funnel chart.

**Attributes:**
- `value` (number) - The stage's value (required)
- `label` (string) - Label for this stage
- `fill` (string) - CSS color for this stage
- `stroke` (string) - Shorthand for stroke color and width
- `stroke-color` (string) - Optional stroke color for this stage
- `stroke-width` (number) - Optional stroke width for this stage
- `show-value` (boolean|string) - Whether to show the value on this stage
- `show-label` (boolean|string) - Whether to show the label on this stage
- `show-percent` (boolean|string) - Whether to show the percentage on this stage

### `<dc-stage-chart>`

Renders a stage chart with connected shapes where each stage's area is proportional to its value. Unlike funnel charts, values can increase or decrease between stages.

**Attributes:**
- `orientation` (string) - Chart orientation: "vertical" (default) or "horizontal"
- `shape` (string) - Default shape type: "rectangle" (default), "square", "circle", "oval"
- `corner-radius` (string) - Corner radius for rectangles (e.g., "8px", "10%", "0.5rem")
- `aspect-ratio` (number) - Width:height ratio for rectangles/ovals (default: 2)
- `stage-size` (string) - Size mode: omit for equal sizes, "value" for area proportional to value, "log-value" for logarithmic scaling, or fixed values like "80px"
- `stage-min-size` (string) - Minimum stage dimension
- `stage-max-size` (string) - Maximum stage dimension
- `gap` (string) - Space between stages (e.g., "20px", "5%", "0")
- `connector` (string) - Connector style: "line" (default), "arrow", "none", or compound like "arrow 2 #333"
- `zero` (string) - Compound shorthand for zero-value handling (e.g., "auto", "hidden", "100 circle", "auto #my-fill")
- `zero-value` (string) - Size value for zero-value shapes: number (e.g., "100"), "auto" (uses smallest non-zero), or omit
- `zero-fill` (string) - ID of a `<dc-fill>` element for styling zero-value shapes
- `zero-shape` (string) - Override shape for zero-value elements: "circle", "square", "rectangle", "oval"
- `zero-hidden` (boolean) - Hide zero-value elements entirely
- `palette` (string) - Reference to a custom `<dc-palette>` ID or built-in palette name
- `stroke` (string) - Shorthand for stroke color and width (e.g., "2 #333")
- `stroke-width` (number) - Stroke width for stage borders in pixels (default: 1)
- `show-value` (boolean|string) - Whether to display values on stages (default: true)
- `show-label` (boolean|string) - Whether to display labels on stages (default: true)
- `show-percent` (boolean|string) - Whether to display percentages on stages (default: false)
- Plus all [common chart attributes](#common-chart-attributes)

**Child Elements:**
- `<dc-title>` - Optional title
- `<dc-stage>` - Individual stages (one or more)
- `<dc-legend>` - Optional legend

**Examples:**

Basic stage chart with value-proportional sizing:
```html
<dc-stage-chart width="500" height="450" stage-size="value">
  <dc-title>Project Pipeline</dc-title>
  <dc-stage value="50" label="Backlog"></dc-stage>
  <dc-stage value="120" label="In Progress"></dc-stage>
  <dc-stage value="80" label="Review"></dc-stage>
  <dc-stage value="200" label="Done"></dc-stage>
</dc-stage-chart>
```

Horizontal with arrows:
```html
<dc-stage-chart orientation="horizontal" stage-size="value" connector="arrow">
  <dc-stage value="100" label="Q1"></dc-stage>
  <dc-stage value="150" label="Q2"></dc-stage>
  <dc-stage value="130" label="Q3"></dc-stage>
  <dc-stage value="200" label="Q4"></dc-stage>
</dc-stage-chart>
```

Circle shapes:
```html
<dc-stage-chart shape="circle" stage-size="value" connector="arrow 2 #666">
  <dc-stage value="200" label="Awareness"></dc-stage>
  <dc-stage value="350" label="Interest"></dc-stage>
  <dc-stage value="150" label="Decision"></dc-stage>
  <dc-stage value="100" label="Action"></dc-stage>
</dc-stage-chart>
```

**Small Values and Auto-Fit:**

When using `stage-size="value"`, stages with small values relative to others may have shapes too small to fit their labels. The chart automatically handles this:

1. **Auto-fit label suppression**: Labels that don't fit inside a shape are automatically suppressed
2. **Popup fallback**: When labels are suppressed, hover popups are automatically enabled to show the label, value, and percentage
3. **Prioritization**: When only one text element fits, values are prioritized over labels

For data with extreme value ranges, consider:
- `stage-size="log-value"` - Logarithmic scaling compresses the range, making small values more visible
- `stage-min-size` - Sets a minimum stage size to ensure readability

```html
<!-- Log scale for extreme differences -->
<dc-stage-chart stage-size="log-value" connector="arrow">
  <dc-stage value="10000" label="Website Visits"></dc-stage>
  <dc-stage value="500" label="Sign Ups"></dc-stage>
  <dc-stage value="50" label="Trials"></dc-stage>
  <dc-stage value="5" label="Customers"></dc-stage>
</dc-stage-chart>

<!-- Minimum size constraint -->
<dc-stage-chart stage-size="value" stage-min-size="50px">
  <dc-stage value="1000" label="Large"></dc-stage>
  <dc-stage value="10" label="Small"></dc-stage>
  <dc-stage value="1" label="Tiny"></dc-stage>
</dc-stage-chart>
```

**Zero Value Handling:**

Use the `zero-*` attributes to control how stages with value=0 are displayed:

```html
<!-- Hide zero-value stages -->
<dc-stage-chart zero-hidden>
  <dc-stage value="100" label="Active"></dc-stage>
  <dc-stage value="0" label="Inactive"></dc-stage>
</dc-stage-chart>

<!-- Auto-size zero values (uses smallest non-zero value as reference) -->
<dc-stage-chart stage-size="value" zero-value="auto">
  <dc-stage value="100" label="Active"></dc-stage>
  <dc-stage value="0" label="Empty"></dc-stage>
</dc-stage-chart>

<!-- Fixed size for zero values -->
<dc-stage-chart stage-size="value" zero-value="50">
  <dc-stage value="200" label="Full"></dc-stage>
  <dc-stage value="0" label="Empty"></dc-stage>
</dc-stage-chart>

<!-- Custom styling with dc-fill reference -->
<dc-fill id="zero-style" fill="rgba(200,200,200,0.2)" stroke="#ccc" stroke-dasharray="dashed"></dc-fill>
<dc-stage-chart stage-size="value" zero-value="auto" zero-fill="zero-style" zero-shape="circle">
  <dc-stage value="100" label="Active"></dc-stage>
  <dc-stage value="0" label="Empty"></dc-stage>
</dc-stage-chart>

<!-- Compound shorthand combines multiple settings -->
<dc-stage-chart stage-size="value" zero="auto circle #zero-style">
  <dc-stage value="100" label="Active"></dc-stage>
  <dc-stage value="0" label="Empty"></dc-stage>
</dc-stage-chart>
```

### `<dc-stage>`

Defines a single stage in a stage chart.

**Attributes:**
- `value` (number) - The stage's value (required)
- `label` (string) - Label for this stage
- `shape` (string) - Override chart's shape for this stage ("rectangle", "square", "circle", "oval")
- `corner-radius` (string) - Override corner radius for rectangles
- `fill` (string) - CSS color for this stage
- `stroke` (string) - Shorthand for stroke color and width
- `stroke-color` (string) - Optional stroke color for this stage
- `stroke-width` (number) - Optional stroke width for this stage
- `show-value` (boolean|string) - Whether to show the value on this stage
- `show-label` (boolean|string) - Whether to show the label on this stage
- `show-percent` (boolean|string) - Whether to show the percentage on this stage

### `<dc-axis>`

Configures an axis on bar charts and line charts.

**Attributes:**
- `position` (string) - Axis position: "left", "right", "top", "bottom", "x", or "y" (default: "bottom")
- `label-interval` (number|string) - Controls which category labels are shown: "auto" (default), or a number (1=all, 2=every other, etc.)
- `label-lines` (number|string) - Staggers labels across multiple lines: 1 (default), 2, 3, etc., or "auto"
- `value-format` (string) - Number format for axis labels

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
- `value-format` (string) - Number format for legend values
- `percent-format` (string) - Number format for legend percentages

**Child Elements:**
- `<dc-title>` - Optional custom title for the legend
- `<dc-legend-item>` - Custom legend items (see below)

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

### `<dc-legend-item>`

Custom legend item for defining legend entries manually. Use inside `<dc-legend>` to override auto-generated legend items.

This is useful for semantic coloring scenarios where multiple data elements share the same color but represent different concepts (e.g., "Above Target" vs "Below Target").

**Attributes:**
- `label` (string, required) - Legend item label
- `fill` (string) - Fill color for squares/circles (bars, areas, pie slices)
- `stroke` (string) - Stroke color for lines
- `stroke-dasharray` (string) - Dash pattern: "dashed", "dotted", or numeric (e.g., "5 3")
- `shape` (string) - Shape indicator: "square" (default), "circle", "line"
- `pattern` (string) - Pattern type for patterned fills
- `value` (number) - Value for aggregated legends (enables value/percent display)

**Behavior:**
- When `<dc-legend-item>` children are present, they completely replace auto-generated legend items
- Items with `value` attribute can display values and percentages (controlled by `show-value`/`show-percent` on `<dc-legend>`)
- Items without `value` are treated as dimensionless (no value/percent display)
- Shape defaults to "line" when only `stroke` is set (no `fill`)

**Examples:**

Semantic coloring legend:
```html
<dc-chart width="600" height="400">
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

Aggregated legend with values:
```html
<dc-legend show-value show-percent>
  <dc-legend-item fill="#4CAF50" label="Above Target" value="177"></dc-legend-item>
  <dc-legend-item fill="#FF9800" label="Near Target" value="78"></dc-legend-item>
  <dc-legend-item fill="#F44336" label="Below Target" value="72"></dc-legend-item>
</dc-legend>
```

Line legend with different stroke styles:
```html
<dc-legend>
  <dc-legend-item stroke="#2196F3" label="Actual" shape="line"></dc-legend-item>
  <dc-legend-item stroke="#F44336" stroke-dasharray="dashed" label="Target" shape="line"></dc-legend-item>
</dc-legend>
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

Displays HTML content in a popup when triggered by user interaction.

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

For quick tooltips without writing custom HTML, use the `auto-popup` attribute.

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

### `<dc-palette>`

Container for reusable fill definitions.

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

Defines a fill style (solid color and/or pattern) within a palette, or standalone with an ID for reference (e.g., from `zero-fill`).

**Attributes:**
- `id` (string) - Optional ID for direct reference via `pattern="id"` or `zero-fill="id"`
- `label` (string) - Match elements with this label
- `fill` (string) - CSS color for the fill
- `fill-opacity` (number) - Fill opacity (0-1)
- `fill-rule` (string) - Fill rule for complex paths: "nonzero" or "evenodd"
- `stroke` (string) - CSS color for the stroke/border
- `stroke-width` (number) - Stroke width in pixels
- `stroke-opacity` (number) - Stroke opacity (0-1)
- `stroke-dasharray` (string) - Dash pattern: numeric (e.g., "5 3") or named ("solid", "dashed", "dotted", "dash-dot", "long-dash")
- `stroke-dashoffset` (number) - Dash pattern offset
- `stroke-linecap` (string) - Line cap style: "butt", "round", "square"
- `stroke-linejoin` (string) - Line join style: "miter", "round", "bevel"
- `stroke-miterlimit` (number) - Miter limit for stroke-linejoin="miter"
- `pattern` (string) - Pattern type
- `scale` (number) - Pattern scale multiplier (default: 1)
- `min-value` (number) - Minimum value for range matching (inclusive)
- `max-value` (number) - Maximum value for range matching (exclusive)

**Named dash patterns:**
- `solid` - No dashes (equivalent to "none")
- `dashed` - Standard dashes (5 5)
- `dotted` - Dots (1 3)
- `dash-dot` - Dash-dot pattern (5 3 1 3)
- `long-dash` - Long dashes (10 5)

**Available patterns:** `diagonal-lines`, `diagonal-lines-reverse`, `horizontal-lines`, `vertical-lines`, `dots`, `crosshatch`, `grid`, `checkerboard`

**Matching priority:**
1. Pattern fills with value match
2. Pattern fills with label match
3. Solid fills with value match
4. Solid fills with label match

### `<dc-swatch>`

Displays a colored shape from a palette outside of charts, useful for annotating prose, tables, or legends.

**Attributes:**
- `palette` (string) - Reference to a custom `<dc-palette>` ID or built-in palette name
- `label` (string) - Label to match in the palette (for custom palettes with `<dc-fill>` elements)
- `index` (number) - Zero-based index for selecting colors from built-in palettes
- `value` (number) - Value to match in the palette (for value-range matching)
- `fill` (string) - Direct fill color override (bypasses palette lookup)
- `stroke` (string) - Direct stroke color override (bypasses palette lookup)
- `shape` (string) - Shape to render (default: "circle")
- `size` (number) - Size in pixels (default: 16)

**Available shapes:** `circle`, `square`, `rect`, `line`, `triangle`, `diamond`, `star`, `cross`, `plus`, or any Unicode character

**Examples:**
```html
<!-- Match by label in custom palette -->
<dc-palette id="brand">
  <dc-fill label="Revenue" fill="#2563eb"></dc-fill>
</dc-palette>
<p><dc-swatch palette="brand" label="Revenue"></dc-swatch> Revenue grew 15%</p>

<!-- Use built-in palette by index -->
<dc-swatch palette="category10" index="0"></dc-swatch> First color
<dc-swatch palette="category10" index="1"></dc-swatch> Second color

<!-- Different shapes -->
<dc-swatch palette="brand" label="Sales" shape="square"></dc-swatch>
<dc-swatch palette="brand" label="Trend" shape="line"></dc-swatch>

<!-- Unicode shapes -->
<dc-swatch palette="brand" label="Warning" shape="⚠"></dc-swatch>

<!-- Direct color override -->
<dc-swatch fill="#FF5722" shape="circle"></dc-swatch>
```

---

## Dynamic Updates

Charts can be updated dynamically via JavaScript. When you modify chart content (child elements, attributes, or values), you must call `requestUpdate()` on the chart element to trigger a re-render.

### When to Call `requestUpdate()`

**Always call `requestUpdate()` after:**
- Adding, removing, or reordering child elements (e.g., `<dc-bar>`, `<dc-stage>`)
- Modifying element attributes (e.g., `value`, `label`, `fill`)
- Toggling the `hidden` attribute
- Replacing innerHTML (htmx-style updates)

```javascript
const chart = document.querySelector('dc-chart');

// After any modification...
chart.requestUpdate();
```

**Why this is required:** Charts cache computed layout data during render for efficiency. This cached data is used by event handlers (for popups, hover effects, etc.) and must match the displayed content. Calling `requestUpdate()` refreshes both the visual display and the internal cache.

### Hiding and Showing Elements

Use the standard HTML `hidden` attribute to dynamically show or hide chart elements. Supported on `<dc-line>`, `<dc-area>`, `<dc-bar>`, `<dc-bar-group>`, `<dc-bubble>`, and `<dc-stage>`.

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

### Modifying Elements

```javascript
const chart = document.querySelector('dc-chart');

// Add a bar
const bar = document.createElement('dc-bar');
bar.setAttribute('value', '25');
bar.setAttribute('fill', 'purple');
bar.setAttribute('label', 'April');
chart.appendChild(bar);
chart.requestUpdate();

// Update a bar's value
const firstBar = chart.querySelector('dc-bar');
firstBar.setAttribute('value', '50');
chart.requestUpdate();

// Remove a bar
chart.removeChild(firstBar);
chart.requestUpdate();
```

---

## Integration with htmx and Other Libraries

All shape elements (`<dc-bar>`, `<dc-line>`, `<dc-area>`, `<dc-pie-slice>`, `<dc-funnel-stage>`) support **automatic attribute passthrough**. Any attributes not explicitly defined by the library are passed through to the rendered SVG elements.

### How It Works

The library automatically:
1. Detects any attributes on shape elements that aren't part of the library's API
2. Applies these attributes to the corresponding SVG elements after rendering
3. Notifies htmx (if loaded) to process the new elements

### htmx Integration

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
</dc-funnel-chart>

<div id="details"></div>
```

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

See [`examples/htmx-integration.html`](examples/htmx-integration.html) for a complete working example.

---

## Logging & Debugging

The library includes a built-in logging system to help you understand how charts calculate their internal layout.

### Enabling Logging

Add the `logging` attribute to any chart:

```html
<dc-chart id="my-chart" logging="info" width="600" height="400">
  <dc-bar value="10" fill="red" label="Jan"></dc-bar>
  <dc-bar value="20" fill="blue" label="Feb"></dc-bar>
</dc-chart>
```

### Log Levels

| Value | Description |
|-------|-------------|
| `false` | No logging (default, best performance) |
| `error` | Only errors |
| `warning` | Warnings and errors |
| `info` or `true` | All messages (info, warning, and error) |

### Browser Console Output

By default, log messages are only captured internally and displayed via `<dc-log-console>`. To also echo messages to the browser's developer console, use the `console-log` attribute:

```html
<dc-chart logging="info" console-log="warning" width="600" height="400">
  <dc-bar value="10" label="Q1"></dc-bar>
</dc-chart>
```

| Value | Console Output |
|-------|----------------|
| `none` | No console output (default) |
| `error` | Errors → `console.error()` |
| `warning` | Warnings → `console.warn()`, Errors → `console.error()` |
| `info` | Info → `console.log()`, Warnings → `console.warn()`, Errors → `console.error()` |

**Note:** Messages must first pass the `logging` level filter before the `console-log` filter is applied. To see all messages in the console, set both `logging="info"` and `console-log="info"`.

**Grouping:** Console messages from each render cycle are grouped under a collapsible header using `console.groupCollapsed()`. This keeps the console organized when multiple charts log messages.

**Chart Identification:** The group header identifies charts by (in priority order):
1. ID attribute: `dc-chart#my-chart render`
2. Title text: `dc-chart "Sales by Quarter" render`
3. Tag name only: `dc-chart render`

Example console output:
```
▶ dc-chart#sales-chart render
    padding.calculated: Final padding { top: 60, right: 20, bottom: 40, left: 50 }
    bars.summary: 4 bars { maxValue: 50 }
```

### Displaying Logs with `<dc-log-console>`

```html
<dc-chart id="my-chart" logging="info" width="600" height="400">
  <dc-bar value="30" label="Q1"></dc-bar>
  <dc-bar value="45" label="Q2"></dc-bar>
</dc-chart>

<dc-log-console chart="#my-chart"></dc-log-console>
```

**Attributes:**
- `chart` (string, required) - CSS selector identifying the chart(s) to monitor

### Programmatic Access

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

- **Padding calculations** - How padding values are derived
- **Color resolution** - Which color mode was used
- **Legend dimensions** - Calculated width, height, layout type
- **Axis label padding** - Space allocated for labels
- **Data summaries** - Element counts, max values, totals
- **Per-element details** - Positions, sizes, percentages

See [`examples/logging.html`](examples/logging.html) for working examples.

---

## Animations

Charts support entry animations that play when first rendered. Animation code is isolated from core rendering and uses the Web Animations API (WAAPI) for smooth performance.

### Enabling Animations

Add the `animations` attribute to any chart:

```html
<!-- Enable with default duration (300ms) -->
<dc-chart animations>
  <dc-bar value="50" label="A"></dc-bar>
  <dc-bar value="80" label="B"></dc-bar>
</dc-chart>

<!-- Custom duration -->
<dc-chart animations="500ms">...</dc-chart>
<dc-chart animations="0.5s">...</dc-chart>
```

### Animation Types by Element

| Element | Animation Effect |
|---------|------------------|
| Bars (vertical) | Grow upward from baseline |
| Bars (horizontal) | Grow rightward from baseline |
| Lines | Draw along path |
| Areas | Fade in with subtle vertical grow |
| Pie slices | Fade in sequentially |
| Points/Bubbles | Scale up with overshoot easing |
| Funnel stages | Cascade in from left |
| Stage shapes | Cascade in from left |

### Reduced Motion

Animations automatically respect the user's `prefers-reduced-motion` setting. When enabled, animations are skipped entirely for accessibility.

> **Not seeing animations?** Check your operating system's accessibility settings:
> - **Windows**: Settings → Accessibility → Visual effects → Animation effects (turn ON)
> - **macOS**: System Preferences → Accessibility → Display → Reduce motion (turn OFF)
> - **iOS**: Settings → Accessibility → Motion → Reduce Motion (turn OFF)
> - **Android**: Settings → Accessibility → Remove animations (turn OFF)

### Staggering

Elements animate in sequence with a small delay between each (30ms by default). This creates a cascading effect that draws attention across the chart.

See [`examples/animations.html`](examples/animations.html) for working examples.

---

## Accessibility

Charts are automatically accessible to screen readers with ARIA attributes and intelligent auto-generated descriptions.

### Automatic ARIA Attributes

Every chart automatically includes:
- `role="img"` on the SVG element
- `aria-label` with chart type and title (e.g., "Bar chart: Sales Data")
- `aria-describedby` pointing to a `<desc>` element with detailed description

No configuration is needed—charts are accessible out of the box.

### Auto-Generated Insights

The library analyzes your chart data and generates meaningful descriptions:

| Chart Type | Example Description |
|------------|---------------------|
| Bar Chart | "4 bars, values from 38 to 95. Q4 highest at 95; Q3 lowest at 38" |
| Line Chart | "1 line with 5 points. Revenue: strong upward trend, highest at May (165)" |
| Pie Chart | "4 slices totaling 100. dominated by Leader at 55%" |
| Funnel Chart | "4 stages from 1000 to 50. 5.0% overall conversion; biggest drop from Leads to Opportunities (40% retained)" |

### Manual Overrides

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

Use the `aria-insights` attribute:

```html
<!-- Full insights with trend analysis (default) -->
<dc-chart aria-insights="auto">

<!-- Basic data summary only (no trend analysis) -->
<dc-chart aria-insights="basic">

<!-- No description generated -->
<dc-chart aria-insights="none">
```

### Keyboard Navigation

All chart types support full keyboard navigation:

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
3. **Activate elements** - Press Enter or Space to follow links or toggle popups
4. **Exit navigation** - Press Escape to close any open popup and exit keyboard mode

**Visual feedback:**

When navigating with the keyboard, a blue dashed focus indicator appears around the currently focused element.

See [`examples/accessibility.html`](examples/accessibility.html) for comprehensive accessibility examples and a screen reader testing guide.
