# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a declarative chart library built with Lit (Web Components) and TypeScript. It allows users to create charts using declarative HTML syntax instead of configuration objects. The library currently supports:

- **Axis-based charts** (use `<dc-chart>`): Bar, Line, Bubble
- **Non-axis charts** (use their own elements): Pie (`<dc-pie-chart>`), Funnel (`<dc-funnel-chart>`)

See the [HTML Element Naming Convention](#️-critical-html-element-naming-convention) section for details on why this distinction matters.

## Design Principles

### Follow Web Standards

This library should feel familiar to web developers by following established web platform conventions. Before adding new features or APIs, consider:

1. **Prefer standard CSS over custom attributes for styling**: Use CSS properties (via `style` attribute, stylesheets, or CSS custom properties) rather than inventing custom attributes like `font-size="20"` or `title-color="red"`. Developers already know CSS.

2. **Use HTML patterns where applicable**: Follow familiar HTML patterns (e.g., how `<label>` associates with inputs, how `<option>` works inside `<select>`).

3. **Leverage the platform**: Use native web APIs (computed styles, events, slots) rather than reinventing mechanisms that already exist.

4. **Attribute names should match HTML/SVG conventions**: When attributes are necessary, prefer names that match existing HTML or SVG attributes (e.g., `width`, `height`, `fill`, `stroke`).

5. **Progressive enhancement**: Basic functionality should work with minimal markup; advanced customization through standard mechanisms (CSS, events).

**Why this matters**: Developers shouldn't need to learn a new DSL for styling or configuration. The library should integrate naturally with existing CSS tooling, design systems, and development workflows.

### SVG Styling for Text Elements

Since charts render as SVG, text elements (`<dc-title>`, `<dc-legend>`) use **SVG presentation attributes** for styling rather than CSS properties. This is a deliberate design choice:

1. **Why SVG attributes, not CSS?** The chart renders to a single SVG element in the shadow DOM. The `<dc-title>` element in the light DOM doesn't render itself - it's a data container. The chart reads its content and attributes, then renders an SVG `<text>` element. SVG styling attributes are passed through directly to the rendered element.

2. **Key differences from CSS:**
   - Use `fill` instead of `color` for text color
   - Use unitless `font-size` values (viewBox units, not `px`, `em`, `rem`)
   - `font-family`, `font-weight`, `font-style` work the same

3. **Why unitless font-size?** SVG text is sized relative to the viewBox coordinate system, not screen pixels. A chart with `width="600"` uses a 600-unit coordinate space. A `font-size="20"` means 20 viewBox units, which scales proportionally as the chart resizes.

4. **Warning system:** The library logs warnings when users accidentally use HTML/CSS conventions:
   - Using `color` instead of `fill`
   - Using CSS units like `font-size="24px"` instead of `font-size="24"`

**Example:**
```html
<!-- Correct: SVG attributes -->
<dc-title fill="#1a1a1a" font-size="24" font-family="Georgia, serif">
  Sales Data
</dc-title>

<!-- Incorrect: CSS conventions (will trigger warnings) -->
<dc-title color="red" font-size="24px">Sales Data</dc-title>
```

## Commands

### Development
```bash
npm run dev
```
Starts Vite development server on `http://localhost:5173` with hot module reloading. Use this for active development and testing changes in `index.html` or example files.

### Build
```bash
npm run build
```
Compiles TypeScript and builds the library using Vite. Output goes to `dist/` directory as both ES modules (`declarative-charts.js`) and UMD (`declarative-charts.umd.cjs`).

### Preview
```bash
npm run preview
```
Previews the production build locally.

## Architecture

### Component Hierarchy

The library uses a two-tier architecture:

1. **Base Classes** (abstract):
   - `BaseChart` (src/base-chart.ts): Abstract base class for all chart types. Provides:
     - Common chart properties (width, height)
     - Padding system with CSS-style shorthand and individual side properties
     - Auto padding calculation based on chrome elements (title, legend)
     - Chrome element stacking when multiple elements share the same side
     - Popup system (hover/click tooltips)
     - Title rendering with multiple positions
     - Legend rendering (tabular and wrapped layouts)
     - Slot change handling for reactivity
   - `AxisChart` (src/axis-chart.ts): Abstract intermediate class for charts with axes (extends BaseChart). Provides:
     - Shared axis rendering via `renderAxes(padding, orientation, reverse)` method
     - Grid line rendering (horizontal for vertical charts, vertical for horizontal charts)
     - Value axis label rendering with orientation support
     - Default axis label padding calculations
     - Axis configuration via `<dc-axis>` child elements (see [Axis Configuration](#axis-configuration-with-dc-axis))
     - `axisStrokeWidth` property (protected readonly, default: 2) - single source of truth for axis line thickness
     - Abstract methods: `getMaxValue()`, `getAllValues()`, `getCategoryLabels()`, `getChartOrientation()`
   - `BaseChartElement` (src/base-chart-element.ts): Abstract base for data container elements like `<dc-bar>`, `<dc-point>`, etc. These elements don't render visually—they just hold data that parent charts read.

2. **Chart Components** (extend AxisChart or BaseChart):

   **AxisChart descendants** → Use unified `<dc-chart>` element:
   - `Chart` (src/chart.ts): Unified chart component that extends `AxisChart`. Automatically detects chart type based on child elements present (`<dc-bar>`, `<dc-line>`, `<dc-bubble>`). Supports:
     - Bar charts: vertical/horizontal orientations, reverse orientations, grouped bars, stacked bars, custom bar widths, gutter spacing
     - Line charts: multi-line support, curve fitting (`linear`, `smooth`, `monotone`, `step`), custom point shapes
     - Bubble charts: scatter-style bubbles with size dimension

   **BaseChart descendants** → Use chart-specific element names:
   - `PieChart` (src/pie-chart.ts): Uses `<dc-pie-chart>`. Supports donut charts via `inner-radius`
   - `FunnelChart` (src/funnel-chart.ts): Uses `<dc-funnel-chart>`. Complex stage rendering with chevron shapes, gradients, and proportional/logarithmic heights

### ⚠️ CRITICAL: HTML Element Naming Convention

**This is a common source of confusion. Pay careful attention:**

| Chart Type | Base Class | HTML Element | Why |
|------------|------------|--------------|-----|
| Bar Chart | `AxisChart` | `<dc-chart>` | Shares axis rendering with other axis charts |
| Line Chart | `AxisChart` | `<dc-chart>` | Shares axis rendering with other axis charts |
| Bubble Chart | `AxisChart` | `<dc-chart>` | Shares axis rendering with other axis charts |
| Pie Chart | `BaseChart` | `<dc-pie-chart>` | No axes, unique radial rendering |
| Funnel Chart | `BaseChart` | `<dc-funnel-chart>` | No axes, unique stage rendering |

**The key insight:** All `AxisChart` descendants share the same `<dc-chart>` element because they share common axis rendering logic. The chart type is determined by which data elements are present inside:
- `<dc-bar>` elements → renders as bar chart
- `<dc-line>` elements → renders as line chart
- `<dc-bubble>` elements → renders as bubble chart

**Non-axis charts use their own element names** because they have fundamentally different rendering (no X/Y axes, no grid lines, no shared scaling logic).

**NEVER change `<dc-pie-chart>` to `<dc-chart>` or vice versa.** They are different components with different rendering pipelines.

3. **Data Elements** (extend BaseChartElement):
   - `ChartBar` (src/chart-bar.ts): Bar data for bar charts
   - `ChartBarGroup` (src/chart-bar-group.ts): Groups multiple bars
   - `ChartLine` (src/chart-line.ts): Line data (contains points)
   - `ChartPoint` (src/chart-point.ts): Point data for line charts
   - `ChartPieSlice` (src/chart-pie-slice.ts): Slice data for pie charts
   - `ChartFunnelStage` (src/chart-funnel-stage.ts): Stage data for funnel charts

4. **Utility Components**:
   - `ChartTitle` (src/chart-title.ts): Title with position support (top, bottom, left, right, corners). Generates its own SVG via `generateSvg()` method.
   - `ChartLegend` (src/chart-legend.ts): Legend with multiple layouts (tabular columns, wrapped inline) and positions. Generates its own SVG via `generateSvg()` method.
   - `ChartPopup` (src/chart-popup.ts): HTML content popups (hover/click triggers)
   - `ChartAxis` (src/chart-axis.ts): Axis configuration (label intervals, label lines, axis titles). Configuration only - SVG generation stays in AxisChart.

### Key Patterns

**Data Extraction Pattern**: Chart components query their child elements (using `querySelector`/`querySelectorAll`) to extract data. For example, `BarChart.getBarStructure()` finds all `<dc-bar>` and `<dc-bar-group>` children to build the bar hierarchy.

**Attribute Cascade**: Properties can be set at multiple levels with precedence:
- Example: `bar-color` on chart → inherited by all bars unless bar has its own `color` attribute
- Example: `width` on bar > `bar-width` on group > `bar-width` on chart

**No Shadow DOM for Data Elements**: Data elements (`<dc-bar>`, `<dc-point>`, etc.) use `createRenderRoot()` to return `this` instead of creating shadow DOM. This is because they're data containers, not visual components.

**Reactive Updates**: Charts use `@slotchange` handler to detect when child elements are added/removed/modified, triggering re-renders.

**SVG Rendering**: Charts render to SVG using Lit's `svg` tagged template literal. The `BaseChart.render()` method creates the SVG container and calls abstract `renderChart()` method implemented by each chart type.

**SVG Rendering Order for Axis Charts**: For axis-based charts, elements must be rendered in a specific order to ensure correct z-ordering (later elements appear on top):
1. Grid lines (background)
2. Data elements (bars, lines, points)
3. Axes (rendered after data so they aren't occluded by bars/lines touching the axis)
4. Axis labels
5. Category/group labels
6. Legend

This order ensures axes are always visible even when data elements touch or overlap the axis lines.

**Popup System**: Each chart has a single popup div that repositions based on mouse events. Popups can be:
- **Explicit popups**: Using `<dc-popup>` child elements with custom HTML content
- **Auto popups**: Using the `auto-popup` attribute for automatic label/value/percentage popups

**Auto-Popup System**: Charts support automatic popup generation via `auto-popup` attribute. Chart-level setting enables popups for all shapes; element-level overrides chart setting. Explicit `<dc-popup>` children take precedence. Auto-popups use hover trigger.

**Implementation**: Add `shouldShowAutoPopup(elementAutoPopup?)` helper that checks element setting then falls back to `this.autoPopup`. Generate popup content with label/value/percentage. Update mouse handlers to show auto-popup when no explicit popup exists.

**Attribute Passthrough Pattern**: Shape elements pass through arbitrary attributes (`hx-get`, `data-*`, etc.) to rendered SVG for htmx/Alpine.js integration.

**Implementation**: Shape classes extend `BaseShape` (provides `getPassthroughAttributes(knownAttrs)`). Charts capture passthrough attrs during data extraction, add `data-shape-index` to SVG elements, call `this.applyPassthroughAttributes(shapes)` in `updated()`. BaseChart auto-notifies htmx after rendering.

**Chrome Element SVG Generation Pattern**: Chrome elements (title, legend) generate their own SVG at origin (0,0) via `generateSvg()` returning `{ width, height, svg }`. BaseChart positions them using `<g transform="translate(x, y)">`. Each element also has `getDimensions()` for layout calculations.

**Why**: Encapsulates SVG details in chrome elements; BaseChart only calculates positions. Testable, reusable.

**Exception - Axes**: `ChartAxis` remains configuration-only. Axis SVG generation stays in `AxisChart` because axes are tightly coupled to chart data (scales, grid lines, value labels depend on data range).

**Logging System**: Set `logging` attribute (`'false'`, `'error'`, `'warning'`, `'info'`, `'true'`) to capture render calculations. Use `this.log(level, path, message, value?)` in chart methods. Retrieve via `getLogEntries()`. Entries cleared each render cycle.

**Accessibility System**: Charts automatically generate ARIA attributes for screen reader support. The SVG element receives `role="img"`, `aria-label` (chart type and title), and `aria-describedby` pointing to a `<desc>` element with auto-generated insights. See [Accessibility for New Chart Types](#accessibility-for-new-chart-types) for implementation details.

**Keyboard Navigation System**: Charts support full keyboard navigation using the roving tabindex pattern. Users can Tab into a chart, use arrow keys to navigate between data elements, Enter/Space to activate elements (follow links, toggle popups), and Escape to close popups or exit navigation. See [Keyboard Navigation for New Chart Types](#keyboard-navigation-for-new-chart-types) for implementation details.

**Palette System**: Define reusable color schemes with `<dc-palette>` containing `<dc-color>` elements. Charts reference palettes via the `palette` attribute. Colors are resolved by matching element labels and/or values against palette definitions. Priority: element fill/stroke > palette value range match > palette label match > chart-level colors > auto. Use `<dc-swatch>` to display palette colors outside charts.

**Hidden Attribute**: Data elements support the standard HTML `hidden` attribute to dynamically show/hide chart elements. This follows web standards and enables interactive filtering.

**Supported elements:**
- `<dc-line hidden>` - Hides a line in line charts
- `<dc-bar hidden>` - Hides individual bars
- `<dc-bar-group hidden>` - Hides an entire bar group (all bars inside)
- `<dc-bubble hidden>` - Hides bubbles in bubble charts

**Usage:**
```html
<dc-chart id="my-chart">
  <dc-line label="Series A" stroke="#2196F3">...</dc-line>
  <dc-line label="Series B" stroke="#4CAF50" hidden>...</dc-line>
</dc-chart>
```

**JavaScript toggle:**
```javascript
// Toggle visibility (one-liner)
document.querySelector('dc-line[label="Series B"]').toggleAttribute('hidden');

// IMPORTANT: Must trigger chart re-render after toggling
document.querySelector('#my-chart').requestUpdate();
```

**Why `requestUpdate()` is required:** Lit doesn't automatically detect attribute changes on child elements. The `hidden` attribute is checked during data extraction, so the chart must be told to re-render.

**Behavior notes:**
- Hidden elements are excluded from `getMaxValue()` calculations, so axes may rescale
- Hidden elements don't appear in legends (legend items come from visible data)
- For bar groups: hiding the group hides all bars inside; individual bars can also be hidden within a visible group

**Interactive example:** See `examples/linecharts.html` "Per-Line Curve Fitting" section for a working checkbox toggle demo.

## Development Workflow

### Adding a New Chart Type

1. Create new file in `src/` (e.g., `scatter-chart.ts`)
2. **Choose the correct base class:**
   - **Extend `AxisChart`** if your chart has X/Y axes with grid lines and numeric scales (e.g., bar charts, line charts, scatter charts, area charts). You must implement:
     - `getMaxValue(): number` - returns the maximum data value for scaling
     - `getAllValues(): number[]` - returns all data values (for totals/percentages)
     - `getCategoryLabels(): string[]` - returns labels for the category axis
     - **Override `getAxisLabelPadding()`** for chart-specific padding calculations. This is critical for correct legend positioning - see "Padding Area Structure" section. Important: if your implementation checks for empty data (e.g., `if (items.length === 0)`), return `super.getAxisLabelPadding()` instead of zeros to ensure reasonable defaults during initial render.
   - **Extend `BaseChart`** if your chart does NOT have traditional X/Y axes (e.g., pie charts, funnel charts, treemaps, gauges)
3. Implement `renderChart(): SVGTemplateResult` method
4. **Use the padding system**: Call `this.getChartPadding()` to get `{ top, right, bottom, left }` values and use them for positioning chart elements (see Padding System section below)
5. Add any custom properties with `@property()` decorator
6. Query child elements to extract data
7. **Add logging calls** for significant calculations (see Logging System section below)
8. **Implement auto-popup support**: Add `shouldShowAutoPopup()`, `generateShapePopupContent()` methods and update mouse handlers (see Auto-Popup System section above)
9. **Implement `getLegendItems()`** - See [Legend Items for New Chart Types](#legend-items-for-new-chart-types) below
10. **Implement accessibility** - Add `getInsights()` method for auto-generated descriptions (see [Accessibility for New Chart Types](#accessibility-for-new-chart-types))
11. **Implement keyboard navigation** - Add `getFocusableElements()` and related methods (see [Keyboard Navigation for New Chart Types](#keyboard-navigation-for-new-chart-types))
12. Export from `src/index.ts`
13. **Add to index.html Basic Chart Types section** (see below)
14. Create detailed example file in `examples/` (e.g., `examples/scattercharts.html`)

**Adding to index.html**: Add a grid cell to "Basic Chart Types" section with `<h3>` title, `<pre><code>` example, rendered chart, and links div. Also update nav section and CSS selector list.

### Adding a New Data Element

1. Create new file in `src/` (e.g., `chart-scatter-point.ts`)
2. Extend `BaseShape` class (for shape elements that render to SVG and need passthrough attribute support) or `BaseChartElement` (for container/grouping elements like `dc-bar-group` or `dc-line`)
3. Add properties with `@property()` decorator
4. Export from `src/index.ts`

**Important**: Shape elements that render as SVG shapes (bars, slices, stages, points) should extend `BaseShape` to support attribute passthrough. The parent chart must then:
- Define a `knownAttrs` Set with all explicitly handled attribute names
- Capture passthrough attributes when extracting data from child elements
- Add `data-shape-index="${index}"` to rendered SVG elements
- Call `this.applyPassthroughAttributes(shapes)` in the `updated()` lifecycle method

### Legend Items for New Chart Types

When implementing `getLegendItems()` for a new chart type, consider two key aspects:

**1. Valued vs Dimensionless Items**

The legend system distinguishes between two types of items:

- **`ValuedLegendItem`**: For chart elements that represent discrete quantities (bars, pie slices, funnel stages, bubbles). These display value and optional percentage in the legend.
  ```typescript
  { label: 'Sales', color: '#4CAF50', value: 150, shape: 'square' }
  ```

- **`DimensionlessLegendItem`**: For chart elements that represent trends, relationships, or connections rather than quantities (lines, reference lines, annotations). These only show label and color indicator—no value or percentage.
  ```typescript
  { label: 'Trend', color: '#FF5722', dimensionless: true, shape: 'line' }
  ```

**Rule**: If your new chart type visualizes trends rather than discrete values (like line charts do), use `DimensionlessLegendItem`. The `dimensionless: true` property suppresses value/percent display in legends.

**2. Legend Indicator Shapes**

Each `AxisChart` descendant should use a distinctive shape for its legend indicators that matches the visual representation of the data:

| Chart Type | Shape | Rationale |
|------------|-------|-----------|
| Bar Chart | `'square'` | Bars are rectangular |
| Line Chart | `'line'` | Lines are linear strokes |
| Bubble Chart | `'circle'` | Bubbles are circular |

When adding a new `AxisChart` descendant, choose an appropriate shape from `LegendShape` (`'square'` | `'line'` | `'circle'`) or request a new shape be added to `ChartSwatch.renderShape()` if needed.

**Example implementation:**
```typescript
// For a hypothetical area chart (shows filled areas - use square)
protected override getLegendItems(): ValuedLegendItem[] {
  return this.getAreas().map(area => ({
    label: area.label,
    color: area.fill,
    value: area.total,
    shape: 'square'  // Areas are filled regions, similar to bars
  }));
}

// For a hypothetical sparkline chart (shows trends - dimensionless)
protected override getLegendItems(): DimensionlessLegendItem[] {
  return this.getSparklines().map(line => ({
    label: line.label,
    color: line.stroke,
    dimensionless: true,
    shape: 'line'  // Sparklines are lines showing trends
  }));
}
```

### Modifying Chart Rendering

Charts calculate positions, scales, and layouts in their render methods. Key concepts:
- Use `this.getChartPadding()` for padding values (see Padding System below)
- Grid lines, axes, and labels are rendered as separate SVG groups
- Charts calculate `max` value from data to determine scale
- Bar charts handle complex width/gutter calculations with custom unit parsing (px, rem, em)

### Padding System

All charts inherit a flexible padding system from `BaseChart`. Padding values follow CSS conventions and are converted to viewBox units at render time.

**How it works:**
- **Unitless or px**: Treated as pixels, converted to percentages (e.g., `60` or `60px`)
- **With % suffix**: Explicit percentage of chart dimensions (e.g., `5%`)
- Default: 5% on all sides (when no chrome elements are present)

**Attributes available on all chart elements:**
- `padding` - Shorthand following CSS syntax (1-4 values)
- `padding-top`, `padding-right`, `padding-bottom`, `padding-left` - Individual side overrides

**Supported formats:**
```html
<!-- Pixel values (CSS convention: unitless = pixels) -->
<dc-chart padding="60">                 <!-- 60px on all sides -->
<dc-chart padding="40 60">              <!-- 40px top/bottom, 60px left/right -->
<dc-chart padding="60px">               <!-- Explicit px suffix (same as "60") -->
<dc-chart padding-left="80">            <!-- Individual side in pixels -->

<!-- Percentage values (recommended for responsive layouts) -->
<dc-chart padding="12%">                <!-- 12% of chart dimensions -->
<dc-chart padding="10% 15%">            <!-- 10% top/bottom, 15% left/right -->

<!-- Mixed values -->
<dc-chart padding="12%" padding-right="80">  <!-- Percentage with px override -->
```

**Pixel conversion:** Pixel values are converted to percentages based on chart dimensions. For example, `padding="60"` on a `width="500" height="350"` chart becomes 12% horizontally (60/500) and 17.1% vertically (60/350).

**Why percentages?** When charts are responsive and scale to fit containers, percentage-based padding maintains consistent visual proportions. A chart with `width="500"` and a chart with `width="250"` will both have the same proportional padding (e.g., 12% = 60px and 30px respectively), resulting in visually identical layouts when scaled.

**Using padding in chart implementations:**
```typescript
protected renderChart(): SVGTemplateResult {
  // getChartPadding() returns values already converted to viewBox units
  const padding = this.getChartPadding();  // Returns { top, right, bottom, left }
  const chartWidth = this.width - padding.left - padding.right;
  const chartHeight = this.height - padding.top - padding.bottom;

  // For centered content (like pie charts):
  const centerX = padding.left + chartWidth / 2;
  const centerY = padding.top + chartHeight / 2;

  // For axes-based charts:
  // - Y-axis at x = padding.left
  // - X-axis at y = this.height - padding.bottom
  // - Chart area starts at (padding.left, padding.top)
  // - Chart area ends at (this.width - padding.right, this.height - padding.bottom)
}
```

**Priority:** Individual side properties > shorthand > auto (calculated from chrome elements)

### Axis Configuration with `<dc-axis>`

Axis-based charts (bar charts, line charts) support the `<dc-axis>` element for configuring axis behavior. Each axis element configures one side of the chart.

**Syntax:**
```html
<dc-chart>
  <dc-axis position="bottom" label-interval="2"></dc-axis>
  <dc-axis position="left">
    <dc-title>Revenue ($)</dc-title>
  </dc-axis>
  <dc-bar value="30" label="A"></dc-bar>
</dc-chart>
```

**Position attribute:**
- Positional names (recommended): `"left"`, `"right"`, `"top"`, `"bottom"`
- Traditional names: `"x"` (maps to bottom), `"y"` (maps to left)

**Axis titles:**
Nest a `<dc-title>` inside `<dc-axis>` to add an axis title. The title is rotated for left/right axes.

**Default behavior:**
When no `<dc-axis>` elements are present, sensible defaults are used:
- `label-interval="auto"` - automatically hides overlapping labels
- `label-lines="1"` - single line for labels

### Category Label Overflow (label-lines and label-interval)

For axis-based charts with many data points, category axis labels can overlap. Two attributes on `<dc-axis>` control how labels are rendered:

**`label-interval`** - Controls which labels are shown:
- `"auto"` (default): Automatically calculate interval to prevent overlap. Shows first, last, and evenly-spaced labels.
- `"1"`: Show all labels (may overlap if space is limited)
- `"2"`, `"3"`, etc.: Show every Nth label

**`label-lines`** - Staggers labels across multiple lines:
- `"1"` (default): All labels on one line
- `"2"`, `"3"`, etc.: Distribute labels across N lines in round-robin fashion
- `"auto"`: Automatically calculate minimum lines needed to prevent overlap

**Examples:**
```html
<!-- Auto-hide overlapping labels (default behavior, no dc-axis needed) -->
<dc-chart>

<!-- Show all labels, but stagger across 2 lines -->
<dc-chart>
  <dc-axis position="bottom" label-interval="1" label-lines="2"></dc-axis>
</dc-chart>

<!-- Show every 3rd label -->
<dc-chart>
  <dc-axis position="bottom" label-interval="3"></dc-axis>
</dc-chart>

<!-- Auto-calculate both interval and lines -->
<dc-chart>
  <dc-axis position="bottom" label-interval="auto" label-lines="auto"></dc-axis>
</dc-chart>
```

**How `label-interval="auto"` works:**
1. Measures the widest label using `measureText()`
2. Calculates available space per label based on chart width and number of labels
3. Determines the minimum interval needed so labels don't overlap (with 8px gap)
4. Always shows first and last labels for context

**How `label-lines` works:**
1. Labels are assigned to lines in round-robin fashion (index % lines)
2. Each line is offset vertically (for vertical charts) or horizontally (for horizontal charts)
3. Padding is automatically increased to accommodate multiple lines

**Implementation notes:**
- `ChartAxis` (src/chart-axis.ts) is the data container element for axis configuration
- Helper methods are in `AxisChart`: `getLabelLinesCount()`, `getLabelIntervalValue()`, `shouldShowLabel()`, `getLabelLineOffset()`
- `AxisChart.getAxisConfig(position)` returns configuration from `<dc-axis>` element or defaults
- `getAxisLabelPadding()` must multiply label height by `getLabelLinesCount()` for correct padding
- Both attributes work together: first `label-interval` filters which labels to show, then `label-lines` staggers the remaining labels

### Padding Area Structure and Chrome Elements

The padding area on each side of a chart accommodates **chrome elements** (title, legend) and **axis labels**. The auto padding system automatically calculates the required space based on which elements appear on each side.

**Chrome Elements:**
Chrome elements are non-data visual components that appear in the padding area around the chart content. Currently supported chrome elements:
- **Title** (`<dc-title>`): Chart title with configurable position
- **Legend** (`<dc-legend>`): Legend with configurable position

**How auto padding is calculated:**

1. **Collect chrome elements per side**: The `getPaddingAreaContent()` method scans child elements in DOM order and groups them by their target side (top, right, bottom, left)

2. **Stack elements on the same side**: When multiple chrome elements have the same position (e.g., title at "bottom" and legend at "bottom"), they stack in DOM order with a separator (half the title height, ~12px)

3. **Calculate total dimension**: Sum of all chrome element dimensions on that side, plus separators between them

4. **Element-specific margins**:
   - **Title dimensions** include an edge margin (10px) for spacing from the chart border
   - **Trailing margin** (10px) is added only when title is the last element on a side (for symmetric spacing from chart content)
   - **Legend dimensions** already include internal padding (~40px), so no trailing margin is added when legend is the last element

5. **Apply axis label space**: For axis-based charts, axis labels contribute additional padding

6. **Final padding formula**:
   - If chrome elements exist on a side: `padding = sum(chromeDimensions) + separators + trailingMargin (if title is last) + axisLabelPadding`
   - If no chrome elements: `padding = max(defaultPadding, axisLabelPadding)` where defaultPadding = 5%

**Padding area stacking**: From chart edge outward: axis labels → chrome elements (in DOM order with ~12px separators) → chart border. Title adds trailing margin when it's the last element.

**Key types and methods:**

```typescript
// Interface for chrome elements in the padding area
export interface PaddingContentItem {
  type: 'title' | 'legend';
  width: number;
  height: number;
  element: Element;
}

// Methods in BaseChart:
protected getPaddingAreaContent(): {
  top: PaddingContentItem[];
  right: PaddingContentItem[];
  bottom: PaddingContentItem[];
  left: PaddingContentItem[];
}

protected getTitleDimensions(): { width: number; height: number; position: string } | null
private getTitleSide(position: string): 'top' | 'right' | 'bottom' | 'left' | null
```

**Position to side mapping:**
- `'top'`, `'top-left'`, `'top-right'` → `'top'` side
- `'bottom'`, `'bottom-left'`, `'bottom-right'` → `'bottom'` side
- `'left'` → `'left'` side
- `'right'` → `'right'` side

**Rendering chrome elements with stack positions:**
When rendering title and legend, the `renderTitle()` and `renderLegend()` methods calculate their position within the padding area by:
1. Getting the stack of chrome elements for that side via `getPaddingAreaContent()`
2. Finding their index in the stack
3. Calculating offset based on preceding elements' dimensions plus separators

**Adding new chrome elements to the library:**
When adding new chrome element types (e.g., subtitle, axis title, watermark), they should participate in the auto padding system:

1. Create the element class extending `LitElement` or `BaseChartElement`
2. Add a `position` property with supported position values
3. Add a method to get its dimensions (e.g., `getSubtitleDimensions()`)
4. Add a method to map position to side (e.g., `getSubtitleSide()`)
5. Update `getPaddingAreaContent()` to include the new element type
6. Update `getChartPadding()` to account for the new element's dimensions
7. Update the element's render method to use stack positioning

**Key rule:** Never position chrome elements at the chart content edge without accounting for axis labels. The stacking system handles this automatically, but custom positioning code must always offset by `axisLabelPadding` first.

### Text Measurement

When calculating widths for text elements (labels, values, legend entries, etc.), **always use actual font metrics** via the `measureText()` method provided by `BaseChart`. Do NOT estimate text width using character count multiplied by a pixel value.

**Why:** Character-width estimation (e.g., `text.length * 7`) is inaccurate because:
- Different characters have different widths (e.g., "W" vs "i")
- Font families render at different widths
- Results in inconsistent spacing and layout issues

**How to measure text:**
```typescript
// BaseChart provides measureText() method
const textWidth = this.measureText(text, fontSize);

// With custom font family (optional - defaults to computed style)
const textWidth = this.measureText(text, fontSize, 'Arial');
```

**Example - calculating legend item widths:**
```typescript
// CORRECT: Use actual font metrics
const labelWidth = this.measureText(item.label, 13);
const valueWidth = this.measureText(item.displayValue, 12);

// INCORRECT: Do not estimate using character count
// const labelWidth = item.label.length * 7.5;  // Don't do this!
```

**Implementation details:**
- `measureText()` uses the Canvas API's `measureText()` for precise pixel widths
- The canvas context is cached for performance
- Falls back to estimation only if Canvas API is unavailable (rare)
- Font family defaults to the element's computed style if not specified

### Logging System

Use `this.log(level, path, message, value?)` to record calculations. Log message should explain HOW the value was calculated, not just the final result.

```typescript
this.log('info', 'layout.radius', `min(${chartWidth}, ${chartHeight}) / 2 = ${radius}`, radius);
this.log('info', `slices[${index}]`, `"${label}": value=${value}, ${pct}%`, { label, value });
```

**What to log**: Data counts, max/min values, chart dimensions, per-element positions, configuration affecting layout.

### Accessibility for New Chart Types

Charts automatically generate ARIA attributes for screen reader accessibility. When creating a new chart type, implement the `getInsights()` method to provide meaningful auto-generated descriptions.

**How the accessibility system works:**

1. **BaseChart provides the infrastructure:**
   - `ariaLabel` property - manual override for the SVG's `aria-label`
   - `ariaDescription` property - manual override for the description
   - `ariaInsights` property - controls insight level: `'auto'` (default), `'basic'`, or `'none'`
   - `generateAccessibilityDescription()` - builds the full description from chart type + title + insights
   - `getAriaLabel()` - returns manual label or auto-generated "Chart type: Title"

2. **Each chart type implements `getInsights()`:**
   ```typescript
   protected getInsights(): string {
     // Analyze your chart's data and return a meaningful description
     // Return empty string if no insights available
   }
   ```

3. **The SVG receives ARIA attributes automatically:**
   ```html
   <svg role="img" aria-label="Bar chart: Sales Data" aria-describedby="desc-123">
     <desc id="desc-123">4 bars, values from 25 to 50. Q4 highest at 50; Q3 lowest at 25</desc>
     <!-- chart content -->
   </svg>
   ```

**Implementing `getInsights()` for a new chart type:**

```typescript
// Example for a hypothetical gauge chart
protected getInsights(): string {
  if (this.ariaInsights === 'none') return '';

  const value = this.getValue();
  const min = this.getMin();
  const max = this.getMax();
  const percentage = ((value - min) / (max - min)) * 100;

  // Basic mode: just the data summary
  const basic = `Value ${value} (${percentage.toFixed(0)}% of range ${min}-${max})`;

  if (this.ariaInsights === 'basic') return basic;

  // Auto mode: add meaningful analysis
  const zone = this.getCurrentZone(); // e.g., "danger", "warning", "safe"
  return `${basic}. Currently in ${zone} zone.`;
}
```

**Use the insight analysis utilities:**

The `src/accessibility/insights.ts` module provides reusable analysis functions:

```typescript
import {
  analyzeLines,      // For line/trend charts
  analyzeBars,       // For bar/comparison charts
  analyzePie,        // For pie/distribution charts
  analyzeFunnel,     // For funnel/conversion charts
  analyzeBubbles     // For bubble/scatter charts
} from './accessibility/index.js';
```

**Example insight outputs by chart type:**

| Chart Type | Example Insight |
|------------|-----------------|
| Bar | "4 bars, values from 38 to 95. Q4 highest at 95; Q3 lowest at 38" |
| Line | "1 line with 5 points. ACME Corp: strong upward trend, highest at May (165)" |
| Pie | "4 slices totaling 100. dominated by Leader at 55%" |
| Funnel | "4 stages from 1000 to 50. 5.0% overall conversion; biggest drop from Opportunities to Customers (33% retained)" |

**User-facing attributes:**

Users can control accessibility via these attributes:

```html
<!-- Default: auto-generated label and insights -->
<dc-chart>...</dc-chart>

<!-- Manual label override -->
<dc-chart aria-label="Q3 2024 Revenue by Region">...</dc-chart>

<!-- Manual description override -->
<dc-chart aria-description="Revenue increased 15% overall, with Western region leading growth.">...</dc-chart>

<!-- Disable insights (basic data summary only) -->
<dc-chart aria-insights="basic">...</dc-chart>

<!-- Disable description entirely -->
<dc-chart aria-insights="none">...</dc-chart>
```

**Testing accessibility:**

See `examples/accessibility.html` for:
- Auto-generated insights for all chart types
- Manual override examples
- Screen reader testing guide (NVDA, VoiceOver, browser DevTools)

### Keyboard Navigation for New Chart Types

Charts support keyboard navigation using the roving tabindex pattern. When creating a new chart type, implement the following methods to enable keyboard support.

**How the keyboard navigation system works:**

1. **BaseChart provides the infrastructure:**
   - `focusedIndex` and `keyboardActive` state properties track navigation state
   - `handleChartKeyDown()` handles Arrow, Enter, Space, Escape, Home, End keys
   - `focusNextElement()`, `focusPreviousElement()` manage focus movement
   - Focus indicator rendering via `renderFocusIndicator()`

2. **Each chart type implements these methods:**

   ```typescript
   // Required: Return list of focusable elements
   protected getFocusableElements(): FocusableElement[] {
     return this.getShapes().map((shape, index) => ({
       index,
       label: shape.label || `Element ${index + 1}`,
       hasAction: !!shape.href || shape.popupTrigger === 'click',
       href: shape.href,
       popupTrigger: shape.popupTrigger
     }));
   }

   // Required: Get bounding box for focus indicator
   protected getShapeBounds(index: number): { x: number; y: number; width: number; height: number } | null {
     // Return bounds of shape at index for focus indicator positioning
   }

   // Required: Render focus indicator around focused shape
   protected renderFocusIndicator(): SVGTemplateResult {
     if (!this.keyboardActive || this.focusedIndex < 0) return svg``;
     const bounds = this.getShapeBounds(this.focusedIndex);
     if (!bounds) return svg``;
     return svg`
       <rect x="${bounds.x - 3}" y="${bounds.y - 3}"
             width="${bounds.width + 6}" height="${bounds.height + 6}"
             fill="none" stroke="#005fcc" stroke-width="2"
             stroke-dasharray="4,2" rx="3" />
     `;
   }

   // Required: Show popup for focused element (hover-trigger popups)
   protected showPopupForFocusedElement(): void {
     const elements = this.getFocusableElements();
     if (this.focusedIndex < 0 || this.focusedIndex >= elements.length) return;
     // Get shape data and show popup
   }

   // Required: Toggle popup for focused element (click-trigger popups)
   protected togglePopupForFocusedElement(): void {
     // Toggle click-triggered popup visibility
   }
   ```

3. **Add focus indicator to your chart's render output:**

   ```typescript
   protected renderChart(): SVGTemplateResult {
     return svg`
       <!-- Your chart content -->
       ${this.renderFocusIndicator()}
     `;
   }
   ```

4. **Add aria-label to focusable shapes:**

   ```typescript
   // In shape rendering, add aria-label for screen readers
   <rect
     aria-label="${shape.label}: ${shape.value}"
     tabindex="${this.getShapeTabIndex(index)}"
     ...
   />
   ```

**The FocusableElement interface:**

```typescript
export interface FocusableElement {
  index: number;       // Position in focusable elements list
  label: string;       // Accessible label for the element
  hasAction: boolean;  // True if element has href or click popup
  href?: string;       // Optional navigation URL
  popupTrigger?: 'hover' | 'click';  // Popup trigger type if any
}
```

**Keyboard shortcuts handled by BaseChart:**

| Key | Action |
|-----|--------|
| Tab | Focus chart SVG (standard browser behavior) |
| Arrow Right/Down | Move to next element |
| Arrow Left/Up | Move to previous element |
| Home | Move to first element |
| End | Move to last element |
| Enter/Space | Activate element (follow link or toggle popup) |
| Escape | Close popup and exit keyboard navigation |

**Focus indicator styling:**

The standard focus indicator is a blue dashed rectangle (`#005fcc`) with 2px stroke and 3px border radius. Charts can customize this by overriding `renderFocusIndicator()`.

## TypeScript Configuration

- Target: ES2020
- Uses experimental decorators (`@customElement`, `@property`)
- Strict mode enabled
- Module resolution: bundler mode (for Vite)
- `useDefineForClassFields: false` required for Lit decorators

## File Structure

```
src/
├── base-chart.ts           # Abstract base for all charts (includes logging, accessibility)
├── axis-chart.ts           # Abstract base for axis-based charts - extends BaseChart
├── base-chart-element.ts   # Abstract base for data elements (no passthrough)
├── base-shape.ts           # Abstract base for shape elements (with passthrough support)
│
│   # Axis-based charts (all use <dc-chart> element)
├── chart.ts                # Unified <dc-chart> element - renders bars, lines, or bubbles based on children
│
│   # Non-axis charts (each has its own element name)
├── pie-chart.ts            # <dc-pie-chart> - Pie chart implementation (extends BaseChart)
├── funnel-chart.ts         # <dc-funnel-chart> - Funnel chart implementation (extends BaseChart)
│
├── accessibility/          # Accessibility utilities
│   ├── insights.ts         # Statistical analysis for auto-generated descriptions
│   └── index.ts            # Accessibility module exports
├── chart-axis.ts           # Axis configuration element (dc-axis)
├── chart-palette.ts        # Palette container element (dc-palette)
├── chart-color.ts          # Color definition element (dc-color)
├── chart-swatch.ts         # Color swatch element (dc-swatch)
├── chart-*.ts              # Data element components (extend BaseShape or BaseChartElement)
└── index.ts                # Main entry point (exports all components)

examples/
├── examples.css            # Shared styles for all example pages
├── examples.js             # Shared JS for collapsible code blocks
├── barcharts.html          # Bar chart examples
├── linecharts.html         # Line chart examples
├── piecharts.html          # Pie chart examples
├── funnelcharts.html       # Funnel chart examples
├── bar-groups.html         # Grouped bar chart examples
├── bar-width.html          # Custom bar width examples
├── gutter.html             # Bar/group gutter spacing examples
├── borders-and-padding.html # Borders and padding examples
├── titles.html             # Title positioning examples
├── legends.html            # Legend layout examples
├── palettes.html           # Palette and swatch examples
├── axes.html               # Axis configuration and label display examples
├── interactive.html        # Popup and interactivity examples
├── htmx-integration.html   # htmx integration examples
├── accessibility.html      # Accessibility features and screen reader testing guide
└── loaded-content.html     # Content fragment for htmx demos

test-charts/
├── index.html              # Index page linking to all test matrices
├── test-matrix.css         # Shared styles for test matrix pages
├── bar-vertical.html       # Vertical bar chart test matrix
├── bar-vertical-reverse.html # Vertical-reverse bar chart test matrix
├── bar-horizontal.html     # Horizontal bar chart test matrix
├── bar-horizontal-reverse.html # Horizontal-reverse bar chart test matrix
├── bar-stacked.html        # Stacked bar chart test matrix
├── pie.html                # Pie chart test matrix
├── funnel.html             # Funnel chart test matrix
└── line.html               # Line chart test matrix
```

## Examples

The `index.html` and `examples/*.html` files contain comprehensive examples. When testing changes, open these in the browser after running `npm run dev`.

### Shared Example Files

Example pages use shared CSS and JavaScript files to ensure consistent styling and behavior:

- **`examples/examples.css`**: Shared styles (nav, `.example` containers, `.grid` layout, code blocks)
- **`examples/examples.js`**: Auto-collapsible code blocks (start collapsed, show/hide toggle)

### Example File Structure

All example files follow a consistent structure. See any existing example file (e.g., `examples/barcharts.html`) as a template.

**Key rules:**
- Include `examples.css` and `examples.js` in all example pages
- Use two-tier nav: `.nav-major` (chart types) + `.nav-minor` (features)
- All pages must have identical navigation; mark current page with `class="current"`
- Wrap examples in `<div class="example">` with `<div class="grid">` inside
- Each example: `<h3>` title, `<pre><code>` with full source (HTML-escaped), then rendered chart
- Charts use `width="500" height="350"` to fit grid cells
- Show complete code (no `...` abbreviations) - collapsible code handles length

## Test Charts Matrix

The `test-charts/` folder contains visual test matrices for verifying legend/title positioning. Each page generates chart variations for all position combinations.

**Chart ID format**: `{chartType}-L{legendPos}-T{titlePos}-LT{legendTitlePos}-V{showValue}-P{showPercent}`

Position abbreviations: `r`=right, `l`=left, `t`=top, `b`=bottom, `tl`=top-left, `tr`=top-right, `bl`=bottom-left, `br`=bottom-right, `n`=none. Boolean: `1`=true, `0`=false.

**Finding a chart**: Use browser search (Ctrl+F) for the chart ID. Chart type prefixes map to files: `pie`→pie.html, `bar-v`→bar-vertical.html, `bar-h`→bar-horizontal.html, `bar-s`→bar-stacked.html, `line`→line.html, `funnel`→funnel.html.

**Adding test matrix for new chart**: Copy existing test file structure, use `test-matrix.css`, generate all combinations, update `test-charts/index.html`.

