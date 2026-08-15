# API Reference

Complete documentation for all elements and attributes in the Declarative Chart Library.

## Table of Contents

- [Default Configuration](#default-configuration)
- [Common Chart Attributes](#common-chart-attributes)
- [Crowded Labels](#crowded-labels)
- [Color System](#color-system)
- [Palettes and Pattern Fills](#palettes-and-pattern-fills)
- [Styling with CSS](#styling-with-css)
- [Responsive Text](#responsive-text)
- [Filling a Container](#filling-a-container)
- [Controlling Labels, Values, and Percentages](#controlling-labels-values-and-percentages)
- [Label Positioning](#label-positioning)
- [Empty and Loading States](#empty-and-loading-states)
- [When JavaScript Does Not Run](#when-javascript-does-not-run)
- [Missing Values](#missing-values)
- [Negative Values](#negative-values)
- [Number Formatting](#number-formatting)
- [Components](#components)
- [Dynamic Updates](#dynamic-updates)
- [Events](#events)
- [Exporting a Chart](#exporting-a-chart)
- [Integration with htmx and Other Libraries](#integration-with-htmx-and-other-libraries)
- [Logging & Debugging](#logging--debugging)
- [Animations](#animations)
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
- `logging` (string) - Controls log capture level: `'warning'` (default), `'false'` (off), `'error'`, `'info'`, or `'true'` (same as `'info'`). See [Logging & Debugging](#logging--debugging) for details.
- `console-log` (string) - Controls which captured logs are echoed to browser console: `'warning'` (default), `'none'` (silent), `'error'`, or `'info'`. See [Browser Console Output](#browser-console-output) for details.

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

## Crowded Labels

This library positions by data, so labels *will* collide. Three mechanisms
handle it, at two different levels.

### Category labels: interval, lines, or rotation

The category axis has more names than it has room. Any of three remedies:

| Attribute | What it does | What it costs |
|---|---|---|
| `label-interval` | Shows every *n*th label | The hidden ones |
| `label-lines` | Staggers labels across 2+ rows | Vertical space |
| `label-rotate` | Tilts labels | Vertical space, and readability at steep angles |

`label-interval="auto"` is the default, and it **measures** — it works out how
many labels fit and shows that many, always including the first and last.

`label-rotate` is the one that keeps every label. A tilted label needs roughly
`height / sin(angle)` of horizontal room instead of its full width, so 45
degrees fits about three times as many:

```html
<dc-chart width="500" height="400">
  <dc-axis position="bottom" label-rotate="45"></dc-axis>
  <dc-bar value="20" label="North East Region"></dc-bar>
  <dc-bar value="29" label="South West Region"></dc-bar>
  <!-- six more -->
</dc-chart>
```

The automatic interval knows about the tilt, so rotating stops labels being
skipped rather than merely tilting the survivors. Padding grows to fit: both the
depth below the axis and the sideways reach of the first (or last) label, which
otherwise hangs off the edge of the chart.

Rotation applies to the **category axis of a vertical chart**. A horizontal
chart puts its category labels in the left gutter, where they already run along
the reading direction. Group labels stay upright: they are a second tier under
the category labels, and tilting both tiers makes an unreadable thicket.

### Value labels: `label-collision`

The numbers drawn on bars and points are placed by the data, and two datapoints
close in value put their labels in the same place. `label-collision` on
`<dc-chart>` decides what happens:

- **`hide`** (default) — move a label back inside the plot if it overhangs, then
  drop what still overlaps something already placed.
- **`clamp`** — move labels inside the plot but never drop one. Use it when
  every number matters more than the overlap does.
- **`show`** — draw every label exactly where the geometry puts it. The
  behaviour before this existed.

```html
<dc-chart width="500" height="350" label-collision="clamp">
  <dc-line label="Plan">…</dc-line>
  <dc-line label="Actual">…</dc-line>
</dc-chart>
```

Two parts to the default, and they are ordered because the first loses no
information:

1. **Clamping** shifts a label sideways to keep it inside the plot. The first
   and last points of a line sit on the plot edges, so their centred labels hang
   over the axis gutter and land on the tick labels there. The shift is only
   ever horizontal — that keeps the label on its datapoint's row, where a
   vertical nudge would move it off.
2. **Hiding** drops what still overlaps, greedily, in document order: bars, then
   areas, then bubbles, then lines. Predictable beats clever — reorder the
   markup and you can see why the outcome changed.

Defaulting to `hide` rather than `show` is a judgement about which failure is
worse. Two numbers printed on top of each other are unreadable *and* unmarked:
the reader cannot tell there were two. A missing label at least leaves the shape
it belonged to visible and correctly placed.

**Scope:** this covers the value labels of `<dc-chart>`, which all pass through
one place. `<dc-pie-chart>` positions its labels round a circle and has its own
crowding problem — adjacent thin slices — which this does not address.

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

*Categorical* — a fixed set of distinct colours, for unrelated categories:

| Name | Colours | |
|------|---------|---|
| `default` | 10 | Balanced, professional colours suitable for most charts |
| `category10` | 10 | Classic D3 categorical palette |
| `pastel` | 10 | Soft, muted colours for gentle visualizations |
| `vivid` | 10 | High saturation for maximum visual impact |
| `earth` | 10 | Natural, organic colours |
| `ocean` | 10 | Blues and teals |
| `colorblind-safe` | 8 | Optimized for colour vision deficiency |
| `high-contrast` | 8 | Maximum visual distinction for accessibility |

*Sequential* — a gradient sampled to the number of elements, for ordered data:

| Name | |
|------|---|
| `blues` | Light to dark blue |
| `greens` | Light to dark green |
| `reds` | Light to dark red |
| `purples` | Light to dark purple |
| `warm` | Yellow to red |
| `cool` | Cyan to blue |
| `sunset` | Warm oranges and pinks |
| `viridis` | Perceptually uniform, colourblind-friendly |
| `cool-to-warm` | Blue to red, a temperature scale |

*Diverging* — two ramps either side of a midpoint, for data with a meaningful centre:

| Name | |
|------|---|
| `red-blue` | Classic diverging palette for positive/negative values |
| `brown-teal` | For environmental data |
| `purple-orange` | Colourblind-friendly diverging |

> An unrecognised palette name is ignored silently and the chart falls back to
> auto-generated colours. If your colours look unexpected, check the spelling
> against this list first.

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

## Styling with CSS

Per-element SVG attributes (`fill`, `stroke`, `font-size`) are for one-off decisions
on a specific element. For anything you want applied consistently — a brand font
across forty charts, a dark theme, a hover effect — use the CSS hooks below.

### Custom properties

Custom properties inherit through the shadow boundary, so setting them anywhere up
the tree themes every chart underneath.

| Property | Default | Applies to |
|----------|---------|-----------|
| `--dc-surface` | `white` | Chart background |
| `--dc-border` | `2px solid #ddd` | Chart border |
| `--dc-border-radius` | `8px` | Chart corner radius |
| `--dc-padding` | `20px` | Space between the border and the plot |
| `--dc-shadow` | `0 2px 8px rgba(0,0,0,.1)` | Chart drop shadow |
| `--dc-font-family` | inherited | Default font for all chart text |
| `--dc-focus-ring` | `2px solid #005fcc` | Keyboard focus outline |
| `--dc-focus-ring-offset` | `2px` | Focus outline offset |
| `--dc-popup-background` | `rgba(0,0,0,.9)` | Popup background |
| `--dc-popup-color` | `white` | Popup text |
| `--dc-popup-border` | `none` | Popup border |
| `--dc-popup-border-radius` | `6px` | Popup corner radius |
| `--dc-popup-padding` | `10px 15px` | Popup padding |
| `--dc-popup-font-size` | `14px` | Popup text size |
| `--dc-popup-shadow` | `0 4px 12px rgba(0,0,0,.3)` | Popup shadow |
| `--dc-popup-max-width` | `300px` | Popup maximum width |
| `--dc-popup-transition-duration` | `0.2s` | Popup fade duration |
| `--dc-popup-z-index` | `1000` | Popup stacking order |

```css
/* Theme every chart on the page */
:root {
  --dc-font-family: "Inter", system-ui, sans-serif;
  --dc-border: 1px solid #e5e7eb;
  --dc-shadow: none;
}

/* Dark mode, no markup changes */
@media (prefers-color-scheme: dark) {
  :root {
    --dc-surface: #111827;
    --dc-border: 1px solid #374151;
    --dc-popup-background: #1f2937;
  }
}
```

> `--dc-font-family` is applied to the `<svg>`, so an explicit `font-family` on a
> `<dc-title>` still wins — the token only supplies the default.

### Shadow parts

`::part()` reaches individual elements inside the chart. This is the only way to
express states the library has no attribute for — hover, transitions, filters.

| Part | Element |
|------|---------|
| `chart` | The root `<svg>` |
| `bar` | A bar |
| `bar-segment` | A segment of a stacked bar |
| `line` | A line path |
| `area` | An area fill |
| `point` | A point marker on a line |
| `bubble` | A bubble |
| `slice` | A pie or donut slice |
| `stage` | A funnel or stage shape |
| `label` | A data label |
| `title` | The chart title |
| `legend-title` | The legend's title |
| `legend-label` | A legend item's label |
| `legend-value` | A legend item's value |
| `legend-swatch` | A legend item's colour swatch |
| `legend-link` | The `<a>` around a linked legend entry |
| `legend-background` | The legend's background panel |
| `axis-line` | An axis line |
| `axis-label` | An axis tick label |
| `grid-line` | A grid line (the zero line also has `zero-line`) |
| `popup` | The popup container |
| `focus-ring` | The keyboard focus indicator |

```css
/* Hover effects - not expressible with attributes */
dc-chart::part(bar) {
  transition: opacity 0.15s;
}
dc-chart::part(bar):hover {
  opacity: 0.75;
}

/* Restyle chrome */
dc-chart::part(grid-line) { stroke: #f3f4f6; }
dc-chart::part(zero-line) { stroke: #111827; }
dc-chart::part(axis-label) { font-size: 11px; }
```

### Precedence

From strongest to weakest:

1. **A `::part()` rule** — plain CSS beats SVG presentation attributes
2. **A per-element attribute** — `<dc-bar fill="red">`
3. **A palette** — `palette="category10"`
4. **`--dc-*` tokens and built-in defaults**

Worth knowing: because CSS wins over presentation attributes, a broad rule like
`dc-chart::part(bar) { fill: blue }` overrides *every* bar, including ones with an
explicit `fill`. Use `::part()` for properties you want applied uniformly, and
per-element attributes for individual exceptions — mixing both on the same
property means the CSS wins.

### Notes

- `::part()` styles the element itself. You cannot select *inside* a part, so
  `::part(legend) text` does not work — each targetable element has its own part.
- Part names are a public contract. Treat them like attribute names.
- Both mechanisms are inert during server rendering; they apply once the element
  upgrades in the browser.

## Controlling Labels, Values, and Percentages

All chart types support `show-label`, `show-value`, and `show-percent` attributes to control what text is displayed on chart elements. These attributes can be set at the chart level (applying to all elements) or on individual elements (overriding the chart-level setting).

### Attribute Values

The `show-*` attributes accept several types of values:

| Value | Description | Example |
|-------|-------------|---------|
| present, `true`, `on`, `yes`, `show` | Always show | `show-value` or `show-value="true"` |
| absent, `false`, `off`, `no`, `none`, `hidden` | Never show | `show-value="false"` |
| Percentage threshold | Show only when element's percentage >= threshold | `show-label="5%"` |
| Value threshold | Show only when element's value >= threshold | `show-value="100"` |

Values are matched case-insensitively. Anything else is a typo rather than a
setting: the attribute warns with `DC104` and defaults to *not* showing, instead
of guessing. These attributes are not HTML boolean attributes — `show-value="off"`
means off, not "present, therefore on".

The same values work on `<dc-legend>`, where a threshold is applied to each
legend item individually.

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

## Responsive Text

Charts scale to fit their container: the SVG has a `viewBox` and `width: 100%`, so
dropping one into a flex or grid cell just works. But a viewBox scales *everything*
uniformly, text included.

`width="600"` is not a pixel size — it is the coordinate space. A `font-size` of 14
is 14/600ths of the chart's width, so **the same chart renders 28px labels in a wide
dashboard and 7px labels in a narrow sidebar**.

The `text-scaling` attribute chooses which behaviour you want.

| Value | Font sizes are | Use when |
|-------|---------------|----------|
| `proportional` (default) | viewBox units — scale with the chart | The chart is always drawn at roughly one size |
| `fixed` | CSS pixels — constant on screen | The chart is in a responsive layout |

```html
<!-- Labels stay 12px however wide this is drawn -->
<dc-chart width="600" height="400" text-scaling="fixed">
  <dc-title font-size="20">Quarterly Revenue</dc-title>
  <dc-bar value="45" label="Q1"></dc-bar>
  <dc-bar value="72" label="Q2"></dc-bar>
</dc-chart>
```

Measured in Chromium, the same chart at two container widths:

| | `proportional` @300px | `proportional` @1200px | `fixed` @300px | `fixed` @1200px |
|---|---|---|---|---|
| Axis label | 4.7px | 21.2px | 11px | 11px |
| Title | 8.5px | 38.5px | 20px | 20px |
| Data label | 6px | 27px | 14px | 14px |
| Legend | 5.5px | 25px | 13px | 13px |

Under `fixed`, a `font-size` you write anywhere — on `<dc-title>`, `<dc-axis>`, a data
element — is read as CSS pixels and converted for you.

### How it works

The chart observes its own rendered width with a `ResizeObserver` and converts
nominal sizes into viewBox units. Re-rendering only happens in `fixed` mode, and only
when the width actually changes by more than half a pixel, so resizing does not
thrash.

Where there is no layout to measure — server-side rendering, a detached element, an
environment without `ResizeObserver` — sizes pass through unscaled, so text is always
drawn at a sensible size rather than disappearing.

### Notes

- `proportional` remains the default: switching would silently resize text in every
  existing chart.
- Only *text* is affected. Bars, strokes, and padding still scale with the chart, which
  is almost always what you want — a 2px stroke in a large chart should look like a 2px
  stroke.

## Filling a Container

`width` and `height` set the chart's coordinate space, and by default its *shape*:
a chart authored `600 x 400` is always 3:2, so in a wide dashboard tile it overflows
or leaves a gap.

`fit="fill"` makes the chart adopt the container's shape instead. `width` stays the
coordinate scale; the layout height is recomputed from the container's measured
aspect, so the plot fills the space with **nothing stretched**.

```html
<div style="width: 800px; height: 200px;">
  <dc-chart width="600" height="400" fit="fill">
    <dc-bar value="45" label="Q1"></dc-bar>
    <dc-bar value="72" label="Q2"></dc-bar>
  </dc-chart>
</div>
```

Measured in Chromium, one chart authored `600 x 400` in three tiles:

| Container | `fit="aspect"` (default) | `fit="fill"` | viewBox under fill |
|-----------|--------------------------|--------------|--------------------|
| 800 x 200 | 800 x 533 (overflows) | 800 x 200 | `0 0 600 150` |
| 400 x 600 | 400 x 267 (gap below) | 400 x 600 | `0 0 600 900` |
| 500 x 500 | 500 x 333 (gap below) | 500 x 500 | `0 0 600 600` |

Horizontal and vertical scale stay equal in every case, so text and shapes keep their
proportions — this is not `preserveAspectRatio="none"` stretching.

### The container needs a definite height

`fill` works by taking the container's height, so the container must actually have
one. These do:

```css
.tile      { height: 200px; }
.flex-col  { height: 300px; display: flex; flex-direction: column; }
.grid      { height: 250px; grid-template-rows: 1fr; }   /* note the explicit row */
```

A `display: grid` with no `grid-template-rows` sizes its row from content, so the
percentage height cannot resolve — as with any auto-height container, the chart keeps
its authored proportions rather than collapsing. That is the safe fallback, not a
failure: **`fill` never produces a zero-height chart.**

To set the height directly instead, use `--dc-height`:

```css
dc-chart[fit="fill"] { --dc-height: 240px; }
```

---

---

## Empty and Loading States

A chart with nothing to draw says so, rather than rendering an empty frame:

```html
<dc-chart width="600" height="400"></dc-chart>
<!-- draws a centred "No data" message -->
```

This matters more here than for a config-driven library. A chart whose markup
arrives from the server has a moment where the element exists and its children do
not — the normal first frame of every server-driven chart, not an error.

### Custom message

```html
<dc-chart width="600" height="400">
  <dc-empty>No sales recorded this quarter</dc-empty>
</dc-chart>
```

`<dc-empty>` takes `fill` and `font-size` like other text elements. Because the
message lives in your markup, it is translated by whatever rendered the page.

If the chart has data elements but they are all `hidden`, the default message is
**"All series are hidden"** instead of "No data" — a different situation calling for
a different reaction.

### Loading

```html
<dc-chart width="600" height="400" loading>
  <dc-bar value="10" label="Jan"></dc-bar>
</dc-chart>
```

`loading` draws a skeleton in the plot area. It takes precedence over both the data
and the empty message, so a refresh shows a placeholder rather than flashing stale
values.

With htmx, point the indicator at the chart and it resolves itself:

```html
<dc-chart hx-get="/api/sales" hx-trigger="load"
          hx-indicator="closest dc-chart"></dc-chart>
```

The skeleton is a fixed shape, not random, so it does not shimmer into a different
chart on every frame and does not break visual snapshots. Its pulse respects
`prefers-reduced-motion`.

### What a placeholder replaces

Loading and empty replace the plot entirely — axes, grid, and legend all describe
data, and drawing them around nothing is noise. The **title stays**, because it
still describes what the chart is for.

The chart also announces its state (`"bar chart: Q3 Sales - no data"`) rather than
describing a chart that is not there, and is not keyboard focusable while a
placeholder is showing, since there is nothing to navigate.

### Styling

| Hook | Applies to |
|------|-----------|
| `--dc-empty-color` | Empty message text (default `#9ca3af`) |
| `--dc-skeleton-color` | Skeleton bars (default `#e5e7eb`) |
| `--dc-skeleton-duration` | Skeleton pulse duration (default `1.4s`) |
| `::part(empty)` | The empty message |
| `::part(skeleton)` | The skeleton group |
| `::part(skeleton-bar)` | An individual skeleton bar |

## When JavaScript Does Not Run

These charts are custom elements. If the module never runs, `<dc-chart>` is an
unknown tag with no text of its own, and the page shows **nothing** where the
chart should be — not a degraded chart, not the numbers, nothing.

That is worth stating plainly because it is the one thing a pure-CSS library like
[Charts.css](https://chartscss.org) does better: its markup *is* a table, so it
survives with no scripting at all. This library renders SVG at runtime and cannot
match that. What it can do is let you supply the fallback yourself, and both
patterns below are ordinary HTML — neither needs an attribute or an API.

Pick between them on **which failure you want covered**:

| | `<noscript>` | Fallback inside the chart |
|---|---|---|
| Scripting disabled | covered | covered |
| Script blocked, 404, CSP, or upgrade failure | **not covered** | covered |
| Flash before the chart appears | none | one paint |

You cannot have both. `<noscript>` avoids the flash precisely *because* the
browser resolves it at parse time and never renders the content when scripting is
on. Covering a bundle that was requested and failed means rendering the fallback
optimistically and retracting it, which is a paint by construction.

### `<noscript>` — simplest, and enough for most pages

```html
<noscript>
  <table>
    <caption>Sales by quarter</caption>
    <tr><th>Q1</th><td>95</td></tr>
    <tr><th>Q2</th><td>80</td></tr>
  </table>
</noscript>

<dc-chart width="500" height="350">
  <dc-bar value="95" label="Q1"></dc-bar>
  <dc-bar value="80" label="Q2"></dc-bar>
</dc-chart>
```

Nothing inside `<noscript>` is parsed as markup when scripting is enabled, so
there is no cost and no flash. Use this unless you specifically want the second
failure mode covered.

### Fallback inside the chart — also covers a bundle that fails to load

Put the table inside the element and hide it once the element upgrades:

```html
<style>
  dc-chart:not(:defined) { display: block; }      /* reserve space, avoid a jump */
  dc-chart:defined .dc-fallback { display: none; }
</style>

<dc-chart width="500" height="350">
  <table class="dc-fallback">
    <caption>Sales by quarter</caption>
    <tr><th>Q1</th><td>95</td></tr>
    <tr><th>Q2</th><td>80</td></tr>
  </table>

  <dc-bar value="95" label="Q1"></dc-bar>
  <dc-bar value="80" label="Q2"></dc-bar>
</dc-chart>
```

`:defined` matches only once `customElements.define()` has run for that tag, so
the table is visible whenever the library did not arrive — scripting off, a
blocked or 404'd bundle, a CSP rejection, an unsupported browser — and hidden the
moment it did.

**The stylesheet rule is required, not decorative.** `<dc-chart>` renders a
catch-all `<slot>`, so every light-DOM child is projected; the data elements are
invisible only because they render nothing themselves. A `<table>` has no such
courtesy and will paint below the chart forever if you do not hide it.

Four things the chart guarantees about a foreign child, all covered by
`test/component/fallback-content.test.ts`:

- it is **not counted as data**, and does not shift the indices of the data around it
- it raises **no diagnostic** of its own
- it is **left alone** — never adopted, restyled, or removed
- it **cannot stand in for data**. A chart holding only a fallback still draws
  "No data" and still reports `DC001`, so the fallback cannot mask an empty chart

### Limits worth knowing

**Keep the fallback to plain HTML.** A chart reads its data from its *direct*
children, so a `dc-*` element buried inside the fallback is not drawn, does not
appear in the legend, and cannot move an axis. Writing one there still says
something you do not mean, though — the fallback is a table for a reader without
a chart, not a second copy of the chart.

**The numbers are yours, unformatted.** The fallback is markup you wrote, so
`value-format`, the percent convention (`0.38` → `"38%"`) and every other
formatting rule in this document apply to the chart and not to it. Write the
table the way you want it read.

**It is duplicated data, and it can drift.** Both patterns state each value
twice. If a server template emits the chart, emit the table from the same loop so
there is one source; a hand-maintained fallback will go stale.

## Missing Values

Real data has holes. A month with no reading, a sensor that dropped out, a metric
that did not exist yet.

Omit the value, or set it to `null`, and the chart treats that position as having
**no data** — distinct from a value of zero:

```html
<dc-line label="Revenue">
  <dc-point value="120" label="Jan"></dc-point>
  <dc-point label="Feb"></dc-point>               <!-- no data -->
  <dc-point value="null" label="Mar"></dc-point>  <!-- also no data -->
  <dc-point value="0" label="Apr"></dc-point>     <!-- a real zero -->
  <dc-point value="180" label="May"></dc-point>
</dc-line>
```

Accepted as "no data": an omitted `value`, an empty string, `null`, `none`, `na`,
`n/a`, `-`, or any non-numeric text. These are the spellings a server template
tends to produce when interpolating an absent value.

> **Why this matters.** Treated as zero, the line would dive to the axis and the
> chart would state that the value *was* zero. For financial, clinical, or
> operational data that is not a cosmetic flaw — it is the chart asserting
> something false.

### Choosing how the gap is drawn

`missing` on `<dc-line>` and `<dc-area>`:

| Value | Behaviour |
|-------|-----------|
| `gap` (default) | Break the series. The absence is visible. |
| `skip` | Join the neighbouring points, ignoring the gap. |
| `zero` | Treat missing as 0. Only correct when absent really means zero. |

```html
<dc-line label="Revenue" missing="skip">…</dc-line>
```

### What a gap suppresses

At a position with no data the chart draws no marker and no label, omits the point
from keyboard navigation, and leaves it out of the screen-reader description and
the axis range — so a gap cannot drag the minimum down to zero.

Curve fitting is applied to each unbroken run separately. That matters for `smooth`
and `monotone`: fitted across a gap, a spline would overshoot and distort the
segments on *both* sides of it.

Area fills close per run as well, so a gap is a genuine hole rather than fill drawn
down to the baseline.

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
- `point-shape` (string) - Default marker for points on every line and scatter series: `circle` (default), `square`, `triangle`, `diamond`, `star`, `cross`, `plus`, `none`, or any single character to draw as a glyph — see [Marker shapes](#marker-shapes)
- `curve-fit` (string) - Default curve fitting for lines and areas: "linear" (default), "smooth", "monotone", "step"
- `overlapping` (boolean) - When true, multiple areas overlap instead of stacking (default: false)
- `bar-color` (string) - Fill for every bar that sets no `fill` of its own and matches no palette entry. When omitted, bars are given distinct auto-generated colours instead
- `line-color` (string) - Stroke for lines and areas on the same terms (default: `#2196F3`, so lines share one colour unless given their own `stroke` or a palette)
- `max-bubble-radius` (number) - Largest bubble radius, in viewBox units (default: 30)
- `min-bubble-radius` (number) - Smallest bubble radius (default: 5)
- `label-collision` (string) - What to do when value labels will not all fit: `"hide"` (default), `"clamp"` or `"show"`. See [Crowded Labels](#crowded-labels)
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
- `bar-width` (string) - Width for this specific bar (e.g., "50px", "2rem"). Overrides `bar-width` on `<dc-chart>` or `<dc-bar-group>`

**Child Elements:**
- `<dc-bar-segment>` - Optional segments for stacked bars
- `<dc-popup>` - Optional popup content
- `legend-href` (string) - Makes this bar's legend entry a link — see [Linking from the legend](#linking-from-the-legend)
- `legend-target` (string) - Link target for `legend-href` (e.g. `_blank`)

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
- `legend-href` (string) - Makes this segment's legend entry a link — see [Linking from the legend](#linking-from-the-legend)
- `legend-target` (string) - Link target for `legend-href` (e.g. `_blank`)

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
- `point-shape` (string) - Default marker for points on this line; same values as [`<dc-point shape>`](#marker-shapes), including `none`
- `curve-fit` (string) - Curve fitting method: "linear" (default), "smooth", "monotone", "step"
- `missing` (string) - How to treat points with no value: "gap" (default), "skip", or "zero". See [Missing Values](#missing-values)

**Child Elements:**
- `<dc-point>` - Individual points (one or more)
- `legend-href` (string) - Makes this line's legend entry a link — see [Linking from the legend](#linking-from-the-legend)
- `legend-target` (string) - Link target for `legend-href` (e.g. `_blank`)

For unconnected points positioned by a numeric x rather than by category, see
[`<dc-scatter>`](#dc-scatter).

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
- `missing` (string) - How to treat points with no value: "gap" (default), "skip", or "zero". See [Missing Values](#missing-values)
- `show-value` (boolean|string) - Whether to display values on points (default: true)
- `show-percent` (boolean|string) - Whether to display percentages on points
- `pattern` (string) - Pattern type — one of the eight in [Palettes and Pattern Fills](#palettes-and-pattern-fills), or the ID of a `<dc-fill>`
- `pattern-stroke` (string) - Pattern element color
- `pattern-fill` (string) - Pattern background color
- `pattern-scale` (number) - Pattern size multiplier (default: 1)

**Child Elements:**
- `<dc-point>` - Individual points (one or more)
- `legend-href` (string) - Makes this area's legend entry a link — see [Linking from the legend](#linking-from-the-legend)
- `legend-target` (string) - Link target for `legend-href` (e.g. `_blank`)

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

Defines a single point in a line, area, radar series, or scatter series.

**Attributes:**
- `value` (number) - The point's value (required)
- `x` (number) - Position along a numeric x-axis. Read by `<dc-scatter>` only; a line, area or radar series places its points by category or axis instead
- `label` (string) - Label displayed below the point
- `show-value` (boolean|string) - Whether to display the value for this point
- `show-percent` (boolean|string) - Whether to display the percentage for this point
- `shape` (string) - Marker for this point (default: `circle`)

Omitting `value` leaves the point missing rather than zero, so an absent reading
stays distinguishable from a real zero — see [Missing Values](#missing-values).

#### Marker shapes

`shape` here, and `point-shape` on `<dc-chart>` and `<dc-line>`, take the same
vocabulary. The named values are:

| Value | Draws |
|---|---|
| `circle` | a filled circle — the default |
| `square` | a filled square |
| `triangle` | a filled triangle, point up |
| `diamond` | a filled diamond |
| `star` | a five-pointed star |
| `cross` | two stroked diagonals, an ✕ |
| `plus` | two stroked strokes, a ✚ |
| `none` | nothing at all |

Names are matched case-insensitively, so `NONE` and `none` are the same value.

**Any single character is drawn as a glyph** instead: `shape="★"`, `shape="♦"`,
`shape="A"`, `shape="😀"`. Emoji that carry a modifier work too — `"❤️"` and
`"👍🏽"` are more than one code point each, and are still one character to read.

**Anything else is treated as a mistake.** A value that reads as a word but is
not one of the names above — `sqaure`, `blob` — draws no marker and reports
`DC117`, naming the value. Until 0.3.0 it was drawn as text, so `shape="none"`
printed the word "none" at every point.

**`none` and interaction.** A point with no marker has nothing to hover or
click, so per-point `<dc-popup>`, `auto-popup`, `href` and `dc-click` have no
target. The line itself stays interactive — hovering picks up the line's popup
instead — and value labels are unaffected, since those do not come from the
marker. An empty `shape=""` means `none`.

**To keep per-point interaction without a visible marker,** draw a circle and
make its fill transparent:

```html
<!-- invisible, still hoverable and clickable -->
<dc-point value="30" label="Q2" shape="circle" fill="transparent"></dc-point>
```

⚠️ **`fill="transparent"`, not `fill="none"`.** The two look identical — both
draw nothing you can see — but they differ in hit-testing. SVG's default
`pointer-events: visiblePainted` only counts *painted* area, and `fill="none"`
paints none, so the hover falls through to whatever is behind. On a line chart
that is the line, and you silently get the line's popup where you wanted the
point's. A transparent fill is painted, just invisibly, so it receives events
normally. `fill="rgba(0,0,0,0)"` works for the same reason.

Use `none` when you want the markers gone; use a transparent circle when you
want them invisible but live. Note the second keeps one SVG node per point, so
it saves nothing on a dense series — `none` is the one that reduces the DOM.

### `<dc-scatter>`

A set of unconnected points — one series of a scatter plot. A container for
`<dc-point>` elements, the way `<dc-line>` is, with two differences: nothing is
drawn between the points, and each point states its own `x`.

A series rather than loose points because a scatter usually compares groups, and
a group needs a name for the legend and a colour of its own.

**Attributes:**
- `label` (string) - Series name, used by the legend
- `fill` (string) - Marker colour
- `fill-opacity` (number) - Marker opacity (default: 1). Lower it when the cloud is dense and points overlap
- `shape` (string) - Marker shape: `circle` (default), `square`, `triangle`, `diamond`, `star`, `cross`, `plus`, `none`, or any single character — see [Marker shapes](#marker-shapes)
- `size` (number) - Marker radius in viewBox units (default: 4)
- Plus `pattern`, `stroke`, `value-format`, `auto-popup`, `href`, `target`, `hidden`

**Child Elements:**
- `<dc-point>` - One per reading; `x` and `value` are its two coordinates
- `legend-href` (string) - Makes this series's legend entry a link — see [Linking from the legend](#linking-from-the-legend)
- `legend-target` (string) - Link target for `legend-href` (e.g. `_blank`)

**Example:**

```html
<dc-chart width="600" height="400">
  <dc-axis position="bottom"><dc-title>Dose (mg)</dc-title></dc-axis>
  <dc-axis position="left"><dc-title>Response</dc-title></dc-axis>

  <dc-scatter label="Control" fill="#2563eb">
    <dc-point x="10" value="22"></dc-point>
    <dc-point x="15" value="35"></dc-point>
    <dc-point x="40" value="30"></dc-point>
  </dc-scatter>

  <dc-scatter label="Treated" fill="#dc2626" shape="triangle" size="6">
    <dc-point x="12" value="40"></dc-point>
    <dc-point x="30" value="55"></dc-point>
  </dc-scatter>
</dc-chart>
```

**The x-axis becomes numeric on its own.** A chart containing any point with an
`x` scales its category axis to that domain and draws numeric ticks, rather than
one slot per element. No `type="value"` is needed — an `x` silently ignored
because a second attribute was missing is exactly the failure this library tries
not to have. Declaring the axis is still worth doing for its title, and for
`min-value`, `max-value`, `tick-count` and the rest, which all apply:

```html
<dc-axis position="bottom" type="value" min-value="0" max-value="50"
         tick-interval="10" value-format="number 0"></dc-axis>
```

Scatter series appear in the legend as circles and are **dimensionless** — a
cloud of readings has no single aggregate value, so none is invented. Screen
readers get the correlation instead: the description reports direction and
strength (Pearson's r, read conventionally at 0.7 / 0.4 / 0.2), because a
scatter is read for its shape rather than its individual readings.

Points sit above areas and beneath lines, so a fitted `<dc-line>` drawn over the
same chart lies on top of the cloud.

### `<dc-bubble>`

Defines a bubble in a bubble chart.

**Attributes:**
- `value` (number) - The bubble's Y-axis value (required)
- `size-value` (number) - The value that determines bubble size (required)
- `show-value` (boolean|string) - Whether to display the value on the bubble (default: true)
- `label` (string) - Label for the bubble
- `fill` (string) - CSS color for the bubble
- `legend-href` (string) - Makes this bubble's legend entry a link — see [Linking from the legend](#linking-from-the-legend)
- `legend-target` (string) - Link target for `legend-href` (e.g. `_blank`)

### `<dc-pie-chart>`

Renders a pie chart with support for donut charts.

**Attributes:**
- `palette` (string) - Reference to a custom `<dc-palette>` ID or built-in palette name
- `stroke-width` (number) - Border width in pixels
- `show-value` (boolean|string) - Whether to show values on slices (default: false)
- `show-label` (boolean|string) - Whether to show labels on slices (default: true)
- `show-percent` (boolean|string) - Whether to show percentages on slices (default: true)
- `inner-radius` (number) - Inner radius as percentage (0-100) for donut charts (default: 0)
- `slice-color` (string) - Default fill for slices that set no `fill` of their own and match no palette entry. The pie equivalent of `bar-color` on `<dc-chart>`
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
- `legend-href` (string) - Makes this slice's legend entry a link — see [Linking from the legend](#linking-from-the-legend)
- `legend-target` (string) - Link target for `legend-href` (e.g. `_blank`)

### `<dc-funnel-chart>`

Renders a funnel chart with customizable stage heights, colors, and shapes.

**Attributes:**
- `palette` (string) - Reference to a custom `<dc-palette>` ID or built-in palette name
- `stroke` (string) - Shorthand for stroke color and width (e.g., "2 #333")
- `stroke-width` (number) - Stroke width for stage borders in pixels (default: 0)
- `stage-height` (string) - Height mode: omit for equal heights, "value" for proportional scaling, "log-value" for logarithmic scaling, or fixed values like "50px"/"2rem"
- `stage-min-height` (string) - Minimum height for any segment
- `stage-max-height` (string) - Maximum height for any segment
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
- `stroke` (string) - Optional stroke color for this stage
- `stroke-width` (number) - Optional stroke width for this stage
- `show-value` (boolean|string) - Whether to show the value on this stage
- `show-label` (boolean|string) - Whether to show the label on this stage
- `show-percent` (boolean|string) - Whether to show the percentage on this stage
- `legend-href` (string) - Makes this stage's legend entry a link — see [Linking from the legend](#linking-from-the-legend)
- `legend-target` (string) - Link target for `legend-href` (e.g. `_blank`)

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

Note the `#`. Element references elsewhere in the library take a bare ID
(`zero-fill="zero-style"`, `palette="status"`, `pattern="danger"`), matching how
`for=`, `list=` and `form=` work in HTML. The compound `zero` shorthand is the
exception: its parts are space-separated and unordered, so a bare `zero-style`
could not be told apart from the keywords (`auto`, `hidden`, `circle`) or from a
number. The `#` marks the token as an ID, the same way it does in a CSS selector.

### `<dc-stage>`

Defines a single stage in a stage chart.

**Attributes:**
- `value` (number) - The stage's value (required)
- `label` (string) - Label for this stage
- `shape` (string) - Override chart's shape for this stage ("rectangle", "square", "circle", "oval")
- `corner-radius` (string) - Override corner radius for rectangles
- `fill` (string) - CSS color for this stage
- `stroke` (string) - Shorthand for stroke color and width
- `stroke` (string) - Optional stroke color for this stage
- `stroke-width` (number) - Optional stroke width for this stage
- `show-value` (boolean|string) - Whether to show the value on this stage
- `show-label` (boolean|string) - Whether to show the label on this stage
- `show-percent` (boolean|string) - Whether to show the percentage on this stage
- `legend-href` (string) - Makes this stage's legend entry a link — see [Linking from the legend](#linking-from-the-legend)
- `legend-target` (string) - Link target for `legend-href` (e.g. `_blank`)

### `<dc-radar-chart>`

Plots several dimensions on radiating scaled axes. Unlike `<dc-pie-chart>`, which
normalises to a total, a radar has a real radial domain — a minimum, a maximum
and rings you can read values off.

**Attributes:**
- `min-value` (number) - Domain minimum for every axis (default: 0). Radar conventionally starts at zero; a non-zero origin exaggerates small differences
- `max-value` (number) - Domain maximum for every axis. Inferred from the data when omitted
- `rings` (number) - Concentric grid rings (default: 5)
- `grid-shape` (string) - `"polygon"` (default, rings follow the axes) or `"circle"`
- `start-angle` (number) - Degrees for the first axis (default: -90, straight up)
- `counter-clockwise` (boolean) - Lay subsequent axes out anticlockwise
- `show-value` (boolean|string) - Whether to print each value beside its vertex (default: false). A radar's message is the shape; the numbers are a hover away
- Plus all [common chart attributes](#common-chart-attributes)

**Child Elements:**
- `<dc-radar-axis>` - One per dimension. Optional; inferred from point labels when omitted
- `<dc-radar-series>` - One polygon per series
- `<dc-grid>` - Optional ring styling
- `<dc-title>`, `<dc-legend>`, `<dc-empty>` - As on any chart

**Example:**

```html
<dc-radar-chart width="500" height="500" max-value="100">
  <dc-title>Model Comparison</dc-title>
  <dc-grid stroke="#e5e7eb" stroke-dasharray="dotted"></dc-grid>

  <dc-radar-axis label="Speed"></dc-radar-axis>
  <dc-radar-axis label="Power" max-value="500"></dc-radar-axis>
  <dc-radar-axis label="Range"></dc-radar-axis>
  <dc-radar-axis label="Comfort"></dc-radar-axis>

  <dc-radar-series label="Model A" fill="#2563eb">
    <dc-point value="80" label="Speed"></dc-point>
    <dc-point value="420" label="Power"></dc-point>
    <dc-point value="90" label="Range"></dc-point>
    <dc-point value="55" label="Comfort"></dc-point>
  </dc-radar-series>

  <dc-legend position="bottom"></dc-legend>
</dc-radar-chart>
```

### `<dc-radar-axis>`

One dimension of a radar chart. Optional — when no axes are declared they are
inferred from the union of point labels, in document order. Declare them when
you need a specific order, a per-axis domain, or an axis no series has data for
yet.

**Attributes:**
- `label` (string) - The dimension's name. Points bind to it, so it is required
- `min-value` (number) - Domain minimum for this axis, overriding the chart's
- `max-value` (number) - Domain maximum for this axis, overriding the chart's
- `value-format` (string) - Number format for this axis's values
- `hidden` (boolean) - Removes the spoke and any points bound to it

**Per-axis domains are what make a radar honest.** A single shared scale is only
meaningful when every dimension is commensurable, which is rare. Independent
domains let speed in km/h sit beside power in hp without the polygon implying a
relationship between the raw numbers.

### `<dc-radar-series>`

One polygon. A container for the `<dc-point>` elements that carry the data, in
the same way `<dc-line>` contains the points of a line.

**Attributes:**
- `label` (string) - Series name, used by the legend
- `fill` (string) - Fill colour for the polygon
- `fill-opacity` (number) - Fill opacity (default: 0.25). Translucent by default because two opaque polygons hide each other
- `stroke` (string) - Outline colour
- `stroke-width` (number) - Outline width
- `stroke-dasharray` (string) - Outline dash pattern: a named pattern (`solid`, `dashed`, `dotted`, `dash-dot`, `long-dash`) or a raw SVG dash list such as `"5 3"`
- `missing` (string) - How to treat an axis with no value: `"gap"` (default), `"skip"` or `"zero"`
- Plus `pattern`, `show-value`, `value-format`, `auto-popup`, `href`, `target`, `hidden`

`missing` means something specific here: `gap` breaks the polygon at that axis,
`skip` joins the two neighbouring axes directly, and `zero` pulls the vertex to
the centre. `zero` distorts the whole silhouette, so it lies more loudly on a
radar than it does on a line.

**Child Elements:**
- `<dc-point>` - One per axis; `label` names the axis it belongs to
- `legend-href` (string) - Makes this series's legend entry a link — see [Linking from the legend](#linking-from-the-legend)
- `legend-target` (string) - Link target for `legend-href` (e.g. `_blank`)

### `<dc-reference>`

A target, threshold, budget or SLA drawn across the plot of a `<dc-chart>` —
bars, lines, areas, bubbles or scatter. It needs a value axis, so the
proportional charts (pie, funnel, stage) and `<dc-radar-chart>` do not take one.

One element covers both shapes an annotation takes, because they are the same
idea at different widths:

- `value` draws a **line** at that point on the value axis.
- `min` and `max` draw a **band** between them.
- Either bound alone draws a **half-open band** — `min="80"` shades everything
  from 80 to the top of the plot, which is how a danger zone is usually stated.

Setting `value` alongside a band is not a conflict: it draws the band's centre
line, which is exactly what "acceptable range, target 100" means.

**Attributes:**
- `value` (number) - Where to draw a line on the value axis
- `min` (number) - Lower bound of a band
- `max` (number) - Upper bound of a band
- `label` (string) - Text drawn at the end of the line, or at the band's upper edge
- `label-position` (string) - `"end"` (default) or `"start"` of the line
- `stroke` (string) - Line colour (default: `#dc2626`)
- `stroke-width` (number) - Line width (default: 2)
- `stroke-dasharray` (string) - A named pattern (`solid`, `dashed`, `dotted`, `dash-dot`, `long-dash`) or a raw SVG dash list such as `"5 3"` (default: `dashed`)
- `fill` (string) - Band fill; falls back to `stroke`, so one colour attribute usually does
- `fill-opacity` (number) - Band opacity (default: 0.12)
- Plus the standard HTML `hidden`, which removes the annotation

**Example:**

```html
<dc-chart width="600" height="400">
  <dc-reference min="80" max="120" fill="#16a34a" label="Acceptable"></dc-reference>
  <dc-reference value="100" label="Target"></dc-reference>
  <dc-bar value="95" label="Q1"></dc-bar>
  <dc-bar value="70" label="Q2"></dc-bar>
</dc-chart>
```

**An annotation is not data.** A reference is not focusable, contributes nothing
to any total or percentage, and does not appear in the legend — its `label` is
drawn on the line itself, so a legend entry would only repeat it. A chart
holding nothing but references still shows the [empty
state](#empty-and-loading-states): there is nothing for the annotation to be
about.

**It does widen an automatic axis**, because a target the axis crops off is
worse than no target — the chart looks complete and quietly omits the thing it
was annotated with. Where the axis is bounded outright with `min-value` /
`max-value`, the two kinds part company:

- A **band** that runs past the edge is **clamped**. Part of the region really
  is on screen, and drawing that part is honest.
- A **line** outside the range is **dropped**, and reported as `DC114`. Clamping
  it would place it somewhere it is not, and the reader has no way to tell.

On a horizontal chart the line is drawn vertically and the band as a vertical
stripe: a reference is positioned on the value axis, wherever that axis happens
to be.

**Styling:** `::part(reference-line)`, `::part(reference-band)` and
`::part(reference-label)` — see [Styling with CSS](#styling-with-css).

**Accessibility:** the first reference that draws a line becomes the target the
screen-reader description compares the bars against — "all exceed target",
"target met in Q1, Q3". A band alone is not a target: "between 80 and 120" has
no single number to be above or below.

### `<dc-axis>`

Configures an axis on bar charts and line charts.

**Attributes:**
- `position` (string) - Axis position: "left", "right", "top", "bottom", "x", or "y" (default: "bottom")
- `type` (string) - Axis behaviour: "value", "label", or "time". Inferred from `position` and the chart's orientation when omitted — on a vertical chart, left/right are value axes and top/bottom are label axes; on a horizontal chart, the reverse
- `label-interval` (number|string) - Controls which category labels are shown: "auto" (default), or a number (1=all, 2=every other, etc.)
- `label-lines` (number|string) - Staggers labels across multiple lines: 1 (default), 2, 3, etc., or "auto"
- `label-rotate` (number) - Tilts category labels by this many degrees (default: 0). Positive tilts so the text reads upward to the right; negative the other way. See [Crowded Labels](#crowded-labels)
- `value-format` (string) - Number format for axis labels

**Range** (value and time axes only):
- `min-value` (number|string) - Axis minimum: a number, or "auto" to calculate from the data (default)
- `max-value` (number|string) - Axis maximum: a number, or "auto" (default)
- `range-padding` (string) - Extra space beyond the data range, e.g. `"10%"` on each end. Applies only where `min-value`/`max-value` are "auto"

**Ticks**, in ascending priority — `tick-values` wins over `tick-interval`, which wins over `tick-count`:
- `tick-count` (number) - Approximate number of ticks (default: 5). The actual count varies to land on "nice" values
- `tick-interval` (number) - Exact spacing between ticks, e.g. `tick-interval="25"` gives 0, 25, 50, 75
- `tick-values` (string) - Explicit comma-separated ticks, e.g. `tick-values="0, 50, 75, 100"`

**Time axes** (`type="time"`):
- `date-format` (string) - How to parse the input: omit for ISO 8601 auto-detection, or "timestamp" for Unix seconds
- `date-label-format` (string) - How to render the labels, using `yyyy`, `MMM`, `MM`, `d`, `dd`, `HH`, `hh`, `mm`, `ss` — e.g. `"MMM d"` gives "Jan 15", `"HH:mm"` gives "14:30"

**Child Elements** are documented below; note that setting a Y-axis minimum is `min-value`, and grid lines come from a nested `<dc-grid>`.

**Child Elements:**
- `<dc-title>` - Optional axis title
- `<dc-grid>` - Optional grid line configuration

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

Fixed range with explicit ticks:
```html
<dc-chart width="600" height="400">
  <dc-axis position="left" min-value="0" max-value="100" tick-interval="25"></dc-axis>
  <dc-bar value="42" label="Q1"></dc-bar>
  <dc-bar value="67" label="Q2"></dc-bar>
</dc-chart>
```

Time axis:
```html
<dc-chart width="600" height="400">
  <dc-axis position="bottom" type="time" date-label-format="MMM d"></dc-axis>
  <dc-line>
    <dc-point value="10" label="2024-01-15"></dc-point>
    <dc-point value="25" label="2024-02-15"></dc-point>
  </dc-line>
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

### `<dc-grid>`

Configures grid lines for an axis. Place it inside a `<dc-axis>`.

Grid lines are drawn by default. Include `<dc-grid>` only to style them, or with
`hidden` to turn them off.

**Attributes:**
- `stroke` (string) - Grid line colour, any CSS colour value (default: `#ddd`)
- `stroke-dasharray` (string) - Dash pattern: a named pattern (`solid`, `dashed`, `dotted`, `dash-dot`, `long-dash`) or a raw SVG dash list such as `"5 3"` (default: `solid`)
- `hidden` (boolean) - Hides the grid lines

Both attributes are named for the SVG properties they set, and accept the same
values as the matching attributes on `<dc-fill>`.

**Examples:**

```html
<dc-chart width="600" height="400">
  <dc-axis position="left">
    <dc-grid stroke="#eee" stroke-dasharray="dashed"></dc-grid>
  </dc-axis>
  <dc-bar value="10" label="Jan"></dc-bar>
  <dc-bar value="20" label="Feb"></dc-bar>
</dc-chart>
```

Hide grid lines on one axis:
```html
<dc-axis position="bottom">
  <dc-grid hidden></dc-grid>
</dc-axis>
```

### `<dc-legend>`

Adds a legend to any chart type.

**Attributes:**
- `show-value` (boolean|string) - Whether to show values in legend (default: true). Accepts the same thresholds as elsewhere, applied per legend item
- `show-percent` (boolean|string) - Whether to show percentages in legend (default: false)
- `show-label` (boolean|string) - Whether to show labels in legend (default: true)
- `columns` (string) - Number of columns: "auto" (default) fits the available width, an integer for a fixed tabular layout, or "*" for wrapped/inline layout
- `max-width` (string) - Caps the legend's width, e.g. `max-width="200"`
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
- `stroke-dasharray` (string) - Dash pattern: a named pattern (`solid`, `dashed`, `dotted`, `dash-dot`, `long-dash`) or a raw SVG dash list such as `"5 3"`
- `shape` (string) - Shape indicator: "square" (default), "circle", "line"
- `pattern` (string) - Pattern type — one of the eight in [Palettes and Pattern Fills](#palettes-and-pattern-fills)
- `value` (number) - Value for aggregated legends (enables value/percent display)
- `href` (string) - Makes this entry a link — see [Linking from the legend](#linking-from-the-legend)
- `target` (string) - Link target for `href` (e.g. `_blank`)

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

#### Linking from the legend

A legend entry can be a link. Which attribute you reach for depends on where the
entry comes from.

**For the legend the chart derives from your data, put `legend-href` on the
element the entry describes:**

```html
<dc-chart width="600" height="400">
  <dc-bar value="95" label="Q1" legend-href="/quarters/q1"></dc-bar>
  <dc-bar value="80" label="Q2" legend-href="/quarters/q2"></dc-bar>
  <dc-legend></dc-legend>
</dc-chart>
```

It is available on every element that produces a legend entry — `<dc-bar>`,
`<dc-bar-segment>`, `<dc-line>`, `<dc-area>`, `<dc-bubble>`, `<dc-scatter>`,
`<dc-pie-slice>`, `<dc-funnel-stage>`, `<dc-stage>` and `<dc-radar-series>` —
along with `legend-target` for the link target.

**For a legend you write yourself, put `href` on the item:**

```html
<dc-legend>
  <dc-legend-item fill="#16a34a" label="Above Target" href="/reports/above"></dc-legend-item>
  <dc-legend-item fill="#f59e0b" label="Near Target" href="/reports/near"></dc-legend-item>
</dc-legend>
```

Note the difference in reach. `<dc-legend-item>` children **replace** the
derived legend entirely, so linking one series that way means hand-writing them
all. `legend-href` leaves the derived legend intact, which is why it exists.

**`legend-href` is separate from `href`, deliberately.** A chart whose bars link
somewhere did not thereby ask its legend to navigate too, and the two often want
different destinations — the bar to a record, the legend to a definition. Nothing
is inherited in either direction; set `legend-href` to opt in.

**What the link is.** A real SVG `<a>`, so middle-click, open-in-new-tab and copy
address all work, and the entry is reachable by keyboard. The whole entry is
wrapped — swatch, label and value — because a link covering only the words is a
smaller target than it looks. Style it with `::part(legend-link)`.

**When several elements share one entry.** A stacked chart's legend has one entry
per segment *label*, but that label appears once per bar, so more than one element
can claim it. The first non-empty `legend-href` wins; if two disagree the chart
reports `DC118` and names the entry, rather than settling it silently where the
reader could not tell which destination they were given.

### `<dc-title>`

Defines the chart title. Renders as an SVG `<text>` element.

**Content:** Text content of the element

**Attributes:**
- `position` (string) - Where the title sits: "top" (default), "top-left", "top-right", "left", "right", "bottom", "bottom-left", "bottom-right"

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

When a `<dc-fill>` in a palette matches an element, its SVG paint attributes —
`fill-opacity`, `fill-rule`, and the `stroke-*` family — are applied to that
element's shape. An attribute written on the element itself takes precedence,
and an element that sets its own `fill` opts out of palette painting entirely.

```html
<dc-palette id="status">
  <dc-fill label="Breached" fill="#fee2e2"
           stroke="#dc2626" stroke-width="2" stroke-dasharray="dashed"></dc-fill>
</dc-palette>
```

**Attributes:**
- `id` (string) - Optional ID for direct reference via `pattern="id"` or `zero-fill="id"`
- `label` (string) - Match elements with this label
- `fill` (string) - CSS color for the fill
- `fill-opacity` (number) - Fill opacity (0-1)
- `fill-rule` (string) - Fill rule for complex paths: "nonzero" or "evenodd"
- `stroke` (string) - CSS color for the stroke/border
- `stroke-width` (number) - Stroke width in pixels
- `stroke-opacity` (number) - Stroke opacity (0-1)
- `stroke-dasharray` (string) - Dash pattern: a named pattern (`solid`, `dashed`, `dotted`, `dash-dot`, `long-dash`) or a raw SVG dash list such as `"5 3"`
- `stroke-dashoffset` (number) - Dash pattern offset
- `stroke-linecap` (string) - Line cap style: "butt", "round", "square"
- `stroke-linejoin` (string) - Line join style: "miter", "round", "bevel"
- `stroke-miterlimit` (number) - Miter limit for stroke-linejoin="miter"
- `pattern` (string) - Pattern type — one of the eight in [Palettes and Pattern Fills](#palettes-and-pattern-fills)
- `pattern-scale` (number) - Pattern scale multiplier (default: 1). Same name and meaning as `pattern-scale` on shapes
- `value` (number) - Exact value to match. Shorthand for setting `min-value` and `max-value` to the same number
- `min-value` (number) - Minimum value for range matching (inclusive)
- `max-value` (number) - Maximum value for range matching (inclusive)

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

### `<dc-empty>`

Supplies the message a chart shows when it has no data. Place it inside any chart.

**Content:** Text content of the element

**Attributes:**
- `fill` (string) - Text colour
- `font-size` (number) - Font size in viewBox units

Keeping the message in markup means the page's own translation applies to it. See
[Empty and Loading States](#empty-and-loading-states).

### `<dc-defaults>`

Sets default attribute values for the charts beneath it, so shared configuration is written once
rather than repeated on every chart. Accepts most `<dc-chart>` attributes.

```html
<dc-defaults palette="viridis" value-format="compact 1"></dc-defaults>
```

See [Default Configuration](#default-configuration) for the full attribute list and the
precedence rules.

### `<dc-log-console>`

Displays the diagnostics a chart produced, for debugging.

**Attributes:**
- `chart` (string) - CSS selector for the chart(s) to monitor, e.g. `"#my-chart"` or `"dc-chart"`

This is the one attribute in the library that takes a selector rather than a bare ID, because it
is designed to monitor several charts at once through a tabbed display. See
[Logging & Debugging](#logging--debugging).

---

## Dynamic Updates

Charts update themselves. Change the markup - by any means - and the chart re-renders on its own:

- Adding, removing, or reordering child elements (e.g., `<dc-bar>`, `<dc-stage>`)
- Modifying element attributes (e.g., `value`, `label`, `fill`)
- Toggling the `hidden` attribute
- Replacing `innerHTML` (htmx-style updates)
- Changing text content (e.g., inside `<dc-title>`)

```javascript
const bar = document.querySelector('dc-chart dc-bar');
bar.setAttribute('value', '50');   // that's it - the chart redraws
```

This works because each chart watches its own light-DOM subtree with a `MutationObserver`, so it does not matter whether the change came from your code, a framework, a template re-render, or an htmx swap.

**How it batches:** observer records are delivered once per microtask checkpoint, so a burst of changes produces a single re-render rather than one per attribute.

**`requestUpdate()` is still available** and remains the way to force a redraw when nothing in the DOM changed - for example after mutating a JavaScript property directly rather than an attribute. You no longer need it for ordinary markup changes.

**Awaiting a redraw:** because the observer fires asynchronously, `await chart.updateComplete` immediately after a mutation can resolve before the re-render is scheduled. Yield first if you need to read the result:

```javascript
bar.setAttribute('value', '50');
await new Promise(r => setTimeout(r, 0));   // let the observer run
await chart.updateComplete;
```

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
line.toggleAttribute('hidden');   // chart redraws itself
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

// Update a bar's value
const firstBar = chart.querySelector('dc-bar');
firstBar.setAttribute('value', '50');

// Remove a bar
chart.removeChild(firstBar);
```

---

## Events

Charts emit DOM events describing what the user interacted with, so you can respond
to a click without reaching into the chart's shadow DOM.

| Event | Fires when | Cancelable |
|-------|-----------|------------|
| `dc-click` | A data element is clicked | Yes |
| `dc-mouseenter` | The pointer enters a data element | No |
| `dc-mouseleave` | The pointer leaves a data element | No |
| `dc-render` | The chart has finished drawing | No |

### Listening

Events are dispatched from the element in **your** markup — the `<dc-bar>`, the
`<dc-pie-slice>` — and bubble up through the chart and out to the document. So all
three of these work:

```javascript
// on the individual element
document.querySelector('dc-bar').addEventListener('dc-click', onClick);

// on the chart
document.querySelector('dc-chart').addEventListener('dc-click', onClick);

// delegated at the document, which keeps working across htmx swaps
document.addEventListener('dc-click', onClick);
```

Events are `composed`, so they also cross a shadow boundary if you nest a chart
inside another web component.

### `event.detail`

`dc-click`, `dc-mouseenter` and `dc-mouseleave` all carry the same shape:

| Property | Type | Description |
|----------|------|-------------|
| `chart` | `Element` | The chart the interaction happened in |
| `element` | `Element \| null` | The source element from your markup, e.g. the `<dc-bar>` |
| `label` | `string` | The element's label, or `''` |
| `value` | `number \| null` | The element's value. `null` for shapes with no single value, such as a whole line |
| `percent` | `number \| null` | Share of the total **as a decimal** — `0.25` means 25%. `null` when undefined |
| `index` | `number` | Position among siblings |
| `seriesLabel` | `string \| null` | Parent line or stacked bar, for nested shapes |
| `seriesIndex` | `number \| null` | Index of that parent |
| `originalEvent` | `MouseEvent \| null` | The DOM event behind this |

> **Note:** `percent` follows the same decimal convention as `value-format="percent"` —
> see [Number Formatting](#number-formatting).

`dc-render` carries `{ chart, count }`, where `count` is the number of data elements drawn.

### Click a bar to filter a table

The common dashboard interaction, with no chart internals involved:

```html
<dc-chart id="sales" width="600" height="400">
  <dc-bar value="120" label="Jan"></dc-bar>
  <dc-bar value="180" label="Feb"></dc-bar>
</dc-chart>
<table id="detail"></table>

<script>
  document.querySelector('#sales').addEventListener('dc-click', (event) => {
    const { label, value, percent } = event.detail;
    document.querySelector('#detail').innerHTML =
      `<tr><td>${label}</td><td>${value}</td><td>${(percent * 100).toFixed(1)}%</td></tr>`;
  });
</script>
```

### Cancelling the default behaviour

`dc-click` is cancelable. Calling `preventDefault()` suppresses the chart's own
response to the click — both the popup and any `href` navigation:

```javascript
chart.addEventListener('dc-click', (event) => {
  if (!isUnlocked(event.detail.label)) {
    event.preventDefault();   // no popup, no navigation
    showUpgradePrompt();
  }
});
```

The hover events are notifications only and cannot be cancelled.

### Reacting to renders

`dc-render` fires after every draw, including redraws caused by data changes. Useful
for measuring the SVG, syncing an external legend, or knowing that a server-driven
swap has painted:

```javascript
document.addEventListener('dc-render', (event) => {
  console.log(`${event.detail.chart.id} drew ${event.detail.count} elements`);
});
```

Because it fires on *every* render, avoid doing anything inside the handler that
mutates the chart's markup — that would schedule another render and loop.

Note that showing or hiding a popup is itself a state change, so hovering a chart
with popups enabled produces `dc-render` events as well as `dc-mouseenter`. If you
only care about data changes, compare `detail.count` or track your own state rather
than treating every `dc-render` as new data.

### TypeScript

The event names are declared on `HTMLElementEventMap`, so `event.detail` is typed
without a cast:

```typescript
import type { ChartInteractionDetail } from 'declarative-charts';

chart.addEventListener('dc-click', (event) => {
  event.detail.value;   // number | null — no cast needed
});
```

### Notes

- Hover events fire at pointer speed. Throttle or debounce anything expensive.
- Events fire for data elements only, not for axes, gridlines, titles, or legends.
- Elements hidden with `hidden` are not rendered, so they emit nothing.

---

## Exporting a Chart

Every chart exposes `downloadSvg()`, which serializes the rendered chart and
triggers a download:

```javascript
document.querySelector('#sales').downloadSvg();              // chart.svg
document.querySelector('#sales').downloadSvg('q3-sales');    // q3-sales.svg
```

The `.svg` extension is added if you omit it. Path separators and characters
filesystems reject are replaced, and an empty or unusable filename falls back to
`chart.svg` with a `DC108` warning — so a bad argument never writes outside the
download directory and never throws.

### What the exported file contains

The chart's shapes, text, and accessible description, as a standalone SVG with an
XML declaration. Anything the library expresses as an SVG attribute — fills,
strokes, positions, font sizes — is in the file, because those live on the elements
themselves.

### What it does not contain

**CSS styling is not exported.** The rendered chart lives in a shadow root and
leans on the host page for anything expressed as CSS, and a standalone file has no
host page. Concretely:

- `::part()` rules you wrote — `dc-chart::part(bar) { fill: … }` — are **lost**
- `--dc-*` custom properties are **lost**, except that the resolved
  `font-family` is inlined onto text elements so the file keeps the page's typeface

If the exported file matters, express appearance through element attributes
(`fill`, `stroke`, `font-size`) or a `palette` rather than through CSS. Those are
carried; CSS is not.

> This is a real limitation rather than a temporary one: capturing `::part()` rules
> would mean walking the host document's stylesheets and mapping every matching
> selector onto the shadow tree. It is documented here rather than partially
> implemented, so what you get is predictable.

## Integration with htmx and Other Libraries

All shape elements (`<dc-bar>`, `<dc-line>`, `<dc-area>`, `<dc-pie-slice>`, `<dc-funnel-stage>`) support **automatic attribute passthrough**. Any attributes not explicitly defined by the library are passed through to the rendered SVG elements.

### How It Works

The library automatically:
1. Detects any attributes on shape elements that aren't part of the library's API
2. Applies these attributes to the corresponding SVG elements after rendering
3. Notifies htmx (if loaded) to process the new elements

### One exception: inline `on*` handlers

Attributes that would install an inline event handler — `onclick`, `onerror`,
`onmouseover` and the rest — are **not** copied onto the shape, and the omission
is reported as `DC115`.

Use the chart's own events instead; they carry a typed `detail` and identify the
element that was interacted with:

```html
<dc-chart id="sales" width="600" height="400">
  <dc-bar value="30" label="Q1"></dc-bar>
</dc-chart>

<script type="module">
  document.querySelector('#sales').addEventListener('dc-click', e => {
    console.log(e.detail.label, e.detail.value);
  });
</script>
```

Nothing else is affected. `hx-*`, `data-*`, `hx-on:click`, Alpine's `x-on:click`
and Stimulus's `data-action` all carry a prefix and pass through as before — the
check asks the platform whether an attribute *is* a handler on the target
element, rather than matching a name pattern.

The reason is narrow: passthrough copies attributes the library does not
recognise, so if attribute **names** in your template ever come from data, an
inline handler would be copied along with everything else. Inline handlers need
none of what passthrough provides, so declining them costs nothing you cannot
get from `dc-click`.

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
| `false` | No logging at all |
| `error` | Only errors |
| `warning` | Warnings and errors (**default**) |
| `info` or `true` | All messages (info, warning, and error) |

`console-log` takes `none`, `error`, `warning` (default) or `info` and controls
what reaches the browser console. Capture and echo are separate: `logging`
decides what is recorded for `<dc-log-console>`, `console-log` what is printed.

### Diagnostic Codes

Every warning carries a `DC` code. They are grouped by cause, so the number tells
you where to look before you read the message.

| Range | Category |
|-------|----------|
| DC001-DC099 | Data — nothing to draw, or values that cannot be drawn |
| DC100-DC199 | Configuration — an attribute the library could not use |
| DC200-DC299 | References — a palette, pattern or element that was not found |
| DC300-DC399 | Style — a CSS convention used where SVG was expected |
| DC400-DC499 | Informational — works, but probably not what you meant |

| Code | Meaning |
|------|---------|
| `DC001` | Chart has no data elements |
| `DC002` | Every data element is hidden |
| `DC003` | All values sum to zero, so nothing can be drawn |
| `DC004` | Elements have zero or negative values where positive is required |
| `DC005` | Bars have value 0 and will not be visible |
| `DC006` | Elements have negative values that may not display correctly |
| `DC101` | A `<dc-line>` has no `<dc-point>` children |
| `DC102` | A `<dc-area>` has no `<dc-point>` children |
| `DC103` | `inner-radius` is unusable — see [`<dc-pie-chart>`](#dc-pie-chart) |
| `DC104` | An attribute value could not be parsed; a default was used |
| `DC105` | Invalid format string; the default format was used |
| `DC106` | `type="time"` but too few valid dates were found |
| `DC107` | Too many bars for the plot width; gutters were compressed |
| `DC108` | A filename passed to `downloadSvg()` was adjusted |
| `DC109` | Unrecognised `logging` or `console-log` value; default used |
| `DC110` | Unrecognised stage `shape`; `rectangle` used |
| `DC111` | A radar point names an axis that does not exist |
| `DC112` | A radar chart has fewer than three axes |
| `DC113` | A `<dc-reference>` set neither `value` nor `min`/`max` and drew nothing |
| `DC114` | A reference line falls outside the axis range and was not drawn |
| `DC115` | An inline `on*` handler was not copied onto the shape — listen for `dc-click` instead |
| `DC116` | Bars do not fit the plot even at minimum width; some are drawn where they cannot be seen |
| `DC117` | Unrecognised `shape` or `point-shape`; no marker drawn — see [`<dc-point>`](#dc-point) |
| `DC118` | Two elements sharing one legend entry give different `legend-href`; the first is used |
| `DC201` | Palette not found — check the name against [Palettes](#palettes-and-pattern-fills) |
| `DC202` | Pattern is not a valid type or ID reference |
| `DC203` | `zero-fill` referenced an element that does not exist |
| `DC204` | No SVG found in the chart's shadow DOM (internal) |
| `DC301` | A CSS attribute was used on `<dc-title>` where SVG was expected |
| `DC302` | The same, on `<dc-legend>` |
| `DC303` | The same, on `<dc-axis>` |
| `DC401` | Every element has the same colour — consider a palette |

A code that resolves to a fallback still draws a chart, which is why these are
warnings rather than errors: the picture appears, but it is not the one the
markup describes. That is the failure mode a declarative API is most prone to,
so the warnings are on by default.

### Browser Console Output

**Warnings and errors appear in the browser console by default.** A chart that is
misconfigured says so, rather than quietly drawing something wrong — a typo in
`palette` used to fall back to auto-generated colours in silence:

```
[DC201] colors.palette: Palette "tableau10" not found (no DOM element or built-in with that name)
```

Each distinct message is echoed once per chart, however many times it re-renders.
Verbose derivation logging stays off unless you ask for it.

To silence a chart you know about, or to widen what you see, use `console-log`:

```html
<dc-chart console-log="none">...</dc-chart>       <!-- silence this chart -->
<dc-chart logging="false">...</dc-chart>          <!-- switch the system off -->
<dc-chart logging="info" console-log="info">...</dc-chart>  <!-- everything -->
```

To echo messages at a different level than the default, use the `console-log` attribute:

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
