# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a declarative chart library built with Lit (Web Components) and TypeScript. It allows users to create charts using declarative HTML syntax instead of configuration objects. The library currently supports Bar Charts, Line Charts, Pie Charts, and Funnel Charts.

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
   - `BarChart` (src/bar-chart.ts): Extends `AxisChart`. Supports vertical/horizontal orientations, reverse orientations, grouped bars, custom bar widths, and gutter spacing
   - `LineChart` (src/line-chart.ts): Extends `AxisChart`. Multi-line support with color inheritance
   - `PieChart` (src/pie-chart.ts): Supports donut charts via `inner-radius`
   - `FunnelChart` (src/funnel-chart.ts): Complex stage rendering with chevron shapes, gradients, and proportional/logarithmic heights

3. **Data Elements** (extend BaseChartElement):
   - `ChartBar` (src/chart-bar.ts): Bar data for bar charts
   - `ChartBarGroup` (src/chart-bar-group.ts): Groups multiple bars
   - `ChartLine` (src/chart-line.ts): Line data (contains points)
   - `ChartPoint` (src/chart-point.ts): Point data for line charts
   - `ChartPieSlice` (src/chart-pie-slice.ts): Slice data for pie charts
   - `ChartFunnelStage` (src/chart-funnel-stage.ts): Stage data for funnel charts

4. **Utility Components**:
   - `ChartTitle` (src/chart-title.ts): Title with position support (top, bottom, left, right, corners)
   - `ChartLegend` (src/chart-legend.ts): Legend with multiple layouts and positions
   - `ChartPopup` (src/chart-popup.ts): HTML content popups (hover/click triggers)

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

**Auto-Popup System**: Charts and shapes support automatic popup generation via the `auto-popup` attribute:

1. **Chart-level setting**: Set `auto-popup` on any chart to enable automatic popups for all shapes
2. **Element-level override**: Set `auto-popup` on individual shapes to override the chart setting
3. **Precedence**: Explicit `<dc-popup>` child elements always take precedence over auto-popup
4. **Inheritance**: Shapes with `auto-popup` undefined inherit from their parent (line → chart)
5. **Trigger**: Auto-popups always use hover trigger (not click)

**Implementation pattern for auto-popup in new charts:**
```typescript
// 1. Add autoPopup to data extraction interface
interface ShapeData {
  // ... other properties
  popup?: { content: string; trigger: string };
  autoPopup?: boolean;
}

// 2. Add helper method to check if auto-popup should show
private shouldShowAutoPopup(elementAutoPopup?: boolean): boolean {
  if (elementAutoPopup !== undefined) return elementAutoPopup;
  return this.autoPopup;  // Inherited from BaseChart
}

// 3. Add method to generate default popup content
private generateShapePopupContent(shape: { label: string; value: number }, total: number): string {
  const percentage = total > 0 ? ((shape.value / total) * 100).toFixed(1) : '0.0';
  return `<strong>${shape.label}</strong><br>Value: ${shape.value}<br>${percentage}%`;
}

// 4. Update cursor style in rendering
const hasPopup = shape.popup || this.shouldShowAutoPopup(shape.autoPopup);
// Use hasPopup to determine cursor: pointer vs default

// 5. Update mouse handlers
private handleShapeMouseEnter(e: MouseEvent, index: number) {
  const shape = this.getShapes()[index];
  // Explicit popup takes precedence
  if (shape.popup?.trigger === 'hover') {
    this.showPopup(shape.popup.content, e.clientX, e.clientY);
  } else if (!shape.popup && this.shouldShowAutoPopup(shape.autoPopup)) {
    const content = this.generateShapePopupContent(shape, this.getTotal());
    this.showPopup(content, e.clientX, e.clientY);
  }
}

private handleShapeMouseLeave(index: number) {
  const shape = this.getShapes()[index];
  const isHoverPopup = shape.popup?.trigger === 'hover' ||
    (!shape.popup && this.shouldShowAutoPopup(shape.autoPopup));
  if (isHoverPopup && this.clickedIndex !== index) {
    this.hidePopup();
  }
}
```

**Attribute Passthrough Pattern**: Shape elements support passing through arbitrary attributes (like `hx-get`, `data-*`, `@click`, etc.) to rendered SVG elements for integration with htmx, Alpine.js, and other libraries. This pattern involves:

1. **BaseShape class** (src/base-shape.ts): Abstract base class that shape elements extend (instead of BaseChartElement directly). Provides `getPassthroughAttributes(knownAttrs)` method.

2. **Shape elements**: Each shape class (dc-bar, dc-pie-slice, dc-funnel-stage, etc.) extends `BaseShape` instead of `BaseChartElement`.

3. **Chart data extraction**: When charts extract data from child elements, they capture passthrough attributes:
   ```typescript
   // In the chart's data extraction method (e.g., getStages(), getBars())
   const knownAttrs = new Set(['value', 'label', 'color', /* other known attrs */]);

   return elements.map(el => ({
     value: el.value,
     label: el.label,
     // ... other properties
     passthroughAttrs: Object.keys(el.getPassthroughAttributes(knownAttrs)).length > 0
       ? el.getPassthroughAttributes(knownAttrs)
       : undefined
   }));
   ```

4. **SVG element marking**: When rendering SVG shapes, add `data-shape-index="${index}"` attribute to each shape element so they can be located later.

5. **Attribute application**: Call `this.applyPassthroughAttributes(shapes)` in the chart's `updated()` lifecycle method to apply passthrough attributes to rendered SVG elements. This method is provided by BaseChart.

6. **htmx notification**: BaseChart automatically notifies htmx (if loaded) to process new elements after rendering.

**Logging System**: Charts support a built-in logging system for debugging and introspection:

1. **Activation**: Set the `logging` attribute on any chart to enable logging. Values: `'false'` (default), `'error'`, `'warning'`, `'info'`, or `'true'` (same as `'info'`).

2. **BaseChart provides**:
   - `logging` property (attribute: `logging`) - controls which log levels are captured
   - `log(level, path, message, value?)` - protected method for charts to emit log entries
   - `getLogEntries()` - public method to retrieve log entries from the last render
   - Log entries are automatically cleared at the start of each render cycle

3. **Log entry structure**:
   ```typescript
   interface LogEntry {
     level: 'error' | 'warning' | 'info';
     path: string;      // Dotted path like "padding.left" or "slices[0].angle"
     message: string;   // Human-readable description of the calculation
     value?: unknown;   // Optional computed value
   }
   ```

4. **Chart-specific logging**: Each chart calls `this.log()` in its calculation methods to record significant events and calculations.

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
9. Export from `src/index.ts`
10. **Add to index.html Basic Chart Types section** (see below)
11. Create detailed example file in `examples/` (e.g., `examples/scattercharts.html`)

**Adding to index.html Basic Chart Types:**

The home page (`index.html`) has a "Basic Chart Types" section that showcases all chart types in a responsive grid. When adding a new chart type, add a new grid cell following this pattern:

```html
<div>
    <h3>Scatter Chart</h3>
    <pre><code>&lt;dc-scatter-chart width="500" height="350"&gt;
  &lt;dc-title&gt;Example Title&lt;/dc-title&gt;
  &lt;dc-scatter-point x="10" y="20" label="A"&gt;&lt;/dc-scatter-point&gt;
  &lt;dc-scatter-point x="30" y="40" label="B"&gt;&lt;/dc-scatter-point&gt;
&lt;/dc-scatter-chart&gt;</code></pre>
    <dc-scatter-chart width="500" height="350">
        <dc-title>Example Title</dc-title>
        <dc-scatter-point x="10" y="20" label="A"></dc-scatter-point>
        <dc-scatter-point x="30" y="40" label="B"></dc-scatter-point>
    </dc-scatter-chart>
    <div class="links">
        <a href="examples/scattercharts.html">More Scatter Charts</a>
        <a href="examples/axes.html">Axes & Labels</a>
    </div>
</div>
```

Also update:
- The nav section with a link to the new detailed examples page
- The Project Overview section in this file to list the new chart type
- The CSS selector list (`dc-bar-chart, dc-line-chart, ...`) to include the new chart element

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
<dc-bar-chart padding="60">                 <!-- 60px on all sides -->
<dc-bar-chart padding="40 60">              <!-- 40px top/bottom, 60px left/right -->
<dc-bar-chart padding="60px">               <!-- Explicit px suffix (same as "60") -->
<dc-bar-chart padding-left="80">            <!-- Individual side in pixels -->

<!-- Percentage values (recommended for responsive layouts) -->
<dc-bar-chart padding="12%">                <!-- 12% of chart dimensions -->
<dc-bar-chart padding="10% 15%">            <!-- 10% top/bottom, 15% left/right -->

<!-- Mixed values -->
<dc-bar-chart padding="12%" padding-right="80">  <!-- Percentage with px override -->
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
<dc-bar-chart>
  <dc-axis position="bottom" label-interval="2"></dc-axis>
  <dc-axis position="left">
    <dc-title>Revenue ($)</dc-title>
  </dc-axis>
  <dc-bar value="30" label="A"></dc-bar>
</dc-bar-chart>
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
<dc-bar-chart>

<!-- Show all labels, but stagger across 2 lines -->
<dc-bar-chart>
  <dc-axis position="bottom" label-interval="1" label-lines="2"></dc-axis>
</dc-bar-chart>

<!-- Show every 3rd label -->
<dc-bar-chart>
  <dc-axis position="bottom" label-interval="3"></dc-axis>
</dc-bar-chart>

<!-- Auto-calculate both interval and lines -->
<dc-bar-chart>
  <dc-axis position="bottom" label-interval="auto" label-lines="auto"></dc-axis>
</dc-bar-chart>
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

**Padding area breakdown with stacked elements:**
```
For title AND legend both at "bottom" position (in that DOM order):
┌─────────────────────────────────────────┐
│              Chart Content              │
│                                         │
├─────────────────────────────────────────┤ ← this.height - padding.bottom (chart edge)
│         X-Axis Labels (25px)            │ ← axisLabelPadding.bottom
├─────────────────────────────────────────┤ ← chrome area start
│              Title (~34px)              │ ← first chrome element (text + edge margin)
│           separator (~12px)             │ ← half title text height
│              Legend (~90px)             │ ← second chrome element (includes internal padding)
└─────────────────────────────────────────┘ ← this.height

For title only (no legend):
┌─────────────────────────────────────────┐
│              Chart Content              │
│                                         │
├─────────────────────────────────────────┤ ← this.height - padding.bottom (chart edge)
│       trailing margin (10px)            │ ← symmetric spacing to chart content
│              Title (~34px)              │ ← title (text + edge margin from border)
└─────────────────────────────────────────┘ ← this.height
```

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

All charts inherit logging support from `BaseChart`. The logging system captures what "actually happened" during the last render cycle, making it easy to debug layout issues and understand calculations.

**How it works:**
- `BaseChart` provides `logging` property (attribute: `logging`) with values: `'false'`, `'error'`, `'warning'`, `'info'`, `'true'`
- `BaseChart` provides `log(level, path, message, value?)` protected method for emitting log entries
- `BaseChart` provides `getLogEntries()` public method to retrieve logs after render
- Log entries are automatically cleared at the start of each render cycle

**Adding logging to a new chart type:**

```typescript
// In your chart's calculation method (e.g., calculateLayout())

private calculateLayout() {
  const padding = this.getChartPadding();
  const chartWidth = this.width - padding.left - padding.right;
  const chartHeight = this.height - padding.top - padding.bottom;

  const points = this.getPoints();
  const maxX = Math.max(...points.map(p => p.x));
  const maxY = Math.max(...points.map(p => p.y));

  // Log layout calculations
  this.log('info', 'data.pointCount', `Number of data points`, points.length);
  this.log('info', 'data.maxX', `Maximum X value`, maxX);
  this.log('info', 'data.maxY', `Maximum Y value`, maxY);
  this.log('info', 'layout.chartArea', `chartWidth=${chartWidth.toFixed(1)}, chartHeight=${chartHeight.toFixed(1)}`, { width: chartWidth, height: chartHeight });

  // Log per-element calculations
  points.forEach((point, index) => {
    const screenX = padding.left + (point.x / maxX) * chartWidth;
    const screenY = this.height - padding.bottom - (point.y / maxY) * chartHeight;
    this.log('info', `points[${index}]`, `"${point.label}": x=${screenX.toFixed(1)}, y=${screenY.toFixed(1)}`, { label: point.label, x: screenX, y: screenY });
  });

  // ... return calculated data
}
```

**What to log:**
- Data counts (number of bars, points, slices, etc.)
- Max/min values used for scaling
- Chart area dimensions
- Scale factors and ranges
- Per-element calculated positions (x, y coordinates)
- Configuration values that affect layout
- Any intermediate calculations that would help debug layout issues

**IMPORTANT - When implementing new calculations:**

When adding new calculations to the library (e.g., layout algorithms, spacing calculations, dimension computations), **always add logging calls** that explain HOW the value was calculated, not just the final value. The `message` parameter should describe the calculation in human-readable form.

**Log message format pattern:**

```typescript
// For derived values, show the calculation in the message:
this.log('info', 'layout.radius', `min(chartWidth(${chartWidth.toFixed(1)}), chartHeight(${chartHeight.toFixed(1)})) / 2 = ${radius.toFixed(1)}`, radius);

// For per-element data, include key properties:
this.log('info', `slices[${index}]`, `"${slice.label}": value=${slice.value}, ${percentage.toFixed(1)}%`, { label, value, percentage });

// For mode/source information:
this.log('info', 'padding.left', `auto → legend on left → ${legendWidth.toFixed(1)} (legend) + 10 (margin) = ${finalValue.toFixed(1)}`, finalValue);
```

**Example: accessing logs programmatically:**
```javascript
const chart = document.querySelector('dc-pie-chart');
chart.logging = 'info';  // Enable logging
// ... wait for render ...
const logs = chart.getLogEntries();
console.table(logs);
```

## TypeScript Configuration

- Target: ES2020
- Uses experimental decorators (`@customElement`, `@property`)
- Strict mode enabled
- Module resolution: bundler mode (for Vite)
- `useDefineForClassFields: false` required for Lit decorators

## File Structure

```
src/
├── base-chart.ts           # Abstract base for all charts (includes logging support)
├── axis-chart.ts           # Abstract base for axis-based charts (bar, line) - extends BaseChart
├── base-chart-element.ts   # Abstract base for data elements (no passthrough)
├── base-shape.ts           # Abstract base for shape elements (with passthrough support)
├── bar-chart.ts            # Bar chart implementation (extends AxisChart)
├── line-chart.ts           # Line chart implementation (extends AxisChart)
├── pie-chart.ts            # Pie chart implementation (extends BaseChart)
├── funnel-chart.ts         # Funnel chart implementation (extends BaseChart)
├── chart-axis.ts           # Axis configuration element (dc-axis)
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
├── axes.html               # Axis configuration and label display examples
├── interactive.html        # Popup and interactivity examples
├── htmx-integration.html   # htmx integration examples
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

- **`examples/examples.css`**: Common styles for all example pages including:
  - Page layout and typography
  - Navigation bar styling
  - `.example` section containers
  - `.grid` responsive grid layout (`grid-template-columns: repeat(auto-fit, minmax(500px, 1fr))`)
  - `<pre><code>` code block styling
  - Collapsible code block styles (`.code-wrapper`, `.code-toggle`, `.collapsed`)

- **`examples/examples.js`**: JavaScript for collapsible code blocks that:
  - Automatically wraps multi-line `<pre>` elements in `.code-wrapper` containers
  - Adds "show/hide" toggle buttons
  - Starts code blocks collapsed (showing first line only)
  - Expands to full source when clicked

### Example File Structure

All example files in `examples/` follow this template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title - Declarative Chart Library</title>
    <link rel="stylesheet" href="examples.css">
    <!-- Page-specific styles (if needed) -->
    <style>
        .custom-class { /* ... */ }
    </style>
</head>
<body>
    <h1>Page Title</h1>
    <p>Description of examples on this page</p>

    <nav>
        <div class="nav-major">
            <a href="../index.html">Home</a>
            <a href="barcharts.html">Bar Charts</a>
            <a href="linecharts.html">Line Charts</a>
            <a href="piecharts.html">Pie Charts</a>
            <a href="funnelcharts.html">Funnel Charts</a>
        </div>
        <div class="nav-minor">
            <a href="titles.html">Titles</a>
            <a href="legends.html">Legends</a>
            <a href="axes.html">Axes</a>
            <a href="colors.html">Colors</a>
            <a href="typography.html">Typography</a>
            <a href="borders-and-padding.html">Borders & Padding</a>
            <a href="bar-groups.html">Bar Groups</a>
            <a href="bar-width.html">Bar Width</a>
            <a href="gutter.html">Gutter</a>
            <a href="interactive.html">Interactive</a>
            <a href="popups.html">Popups</a>
            <a href="logging.html">Logging</a>
            <a href="htmx-integration.html">htmx</a>
        </div>
    </nav>

    <!-- Sections for each category of examples -->
    <div class="example">
        <h2>Section Title</h2>
        <p>Description of this section...</p>

        <div class="grid">
            <!-- Individual examples in grid cells -->
        </div>
    </div>

    <script type="module" src="../src/index.ts"></script>
    <script src="examples.js"></script>
</body>
</html>
```

**Navigation Structure:**

The navigation uses a two-tier structure to visually distinguish chart types from feature documentation:

1. **Major links (`.nav-major`)**: Chart type pages displayed as blue badge/buttons
   - Home (links to `../index.html`)
   - Bar Charts, Line Charts, Pie Charts, Funnel Charts

2. **Minor links (`.nav-minor`)**: Feature documentation displayed as regular text links
   - Titles, Legends, Axes, Colors, Typography
   - Borders & Padding, Bar Groups, Bar Width, Gutter
   - Interactive, Popups, Logging, htmx

**Navigation Rules:**
- **ALWAYS use both `.nav-major` and `.nav-minor` divs** - never use flat links
- **Chart type order is fixed**: Home, Bar Charts, Line Charts, Pie Charts, Funnel Charts
- **Feature link order is fixed**: Follow the order shown in the template above
- **Mark the current page** with `class="current"` on the appropriate link
- **All pages must have identical navigation** - `index.html` AND all `examples/*.html` files must have the same links in the same order
- The only difference: `index.html` uses `examples/` prefix for links (e.g., `examples/barcharts.html`), while example pages use relative links (e.g., `barcharts.html`)
- When adding a new chart type, add it to `.nav-major` on `index.html` AND ALL example pages
- When adding a new feature page, add it to `.nav-minor` on `index.html` AND ALL example pages

**Section Structure:**
- Each logical group of examples goes in a `<div class="example">` container
- Section has an `<h2>` title and `<p>` description
- Related examples are placed in a `<div class="grid">` using CSS grid
- Grid uses `grid-template-columns: repeat(auto-fit, minmax(500px, 1fr))` for responsive layout

**Individual Example Structure:**
```html
<div class="grid">
    <div>
        <h3>Example Title</h3>
        <pre><code>&lt;dc-bar-chart width="500" height="350"&gt;
  &lt;dc-title&gt;Chart Title&lt;/dc-title&gt;
  &lt;dc-bar value="30" color="#4CAF50" label="A"&gt;&lt;/dc-bar&gt;
  &lt;dc-bar value="45" color="#8BC34A" label="B"&gt;&lt;/dc-bar&gt;
  &lt;dc-bar value="25" color="#CDDC39" label="C"&gt;&lt;/dc-bar&gt;
&lt;/dc-bar-chart&gt;</code></pre>
        <dc-bar-chart width="500" height="350">
            <dc-title>Chart Title</dc-title>
            <dc-bar value="30" color="#4CAF50" label="A"></dc-bar>
            <dc-bar value="45" color="#8BC34A" label="B"></dc-bar>
            <dc-bar value="25" color="#CDDC39" label="C"></dc-bar>
        </dc-bar-chart>
    </div>
    <!-- More examples... -->
</div>
```

**Key Conventions:**
- **ALWAYS use shared files**: Include `<link rel="stylesheet" href="examples.css">` in the head and `<script src="examples.js"></script>` before closing `</body>`. Page-specific styles should be added in a separate `<style>` block.
- **ALWAYS use `.grid` layout**: Every section with examples MUST have its examples inside a `<div class="grid">`. Never place charts directly in a `.example` div without the grid wrapper. This ensures consistent responsive layout across all example pages.
- **ALWAYS show full source code**: Code blocks must show the complete chart markup including all data elements. Do NOT abbreviate with `...` - users should be able to copy the code directly. The collapsible code feature handles long code blocks.
- Each example has: `<h3>` title, `<pre><code>` block with HTML-escaped code, then the actual rendered chart
- Code blocks use HTML entities (`&lt;`, `&gt;`) for angle brackets
- Charts in examples typically use `width="500" height="350"` to fit grid cells (the grid has `minmax(500px, 1fr)`)
- Group related examples (e.g., all orientations, all variations of a feature) in the same section
- Separate distinct features into different sections (e.g., "Basic Bar Charts", "Grouped Bar Charts", "Stacked Bar Charts")

**Collapsible Code Blocks:**

The shared `examples.js` file automatically makes code blocks collapsible. Code blocks with multiple lines:
- Start collapsed, showing only the first line
- Display a "▼ show" button in the top-right corner
- Expand to show full source when clicked, changing button to "▲ hide"

No additional configuration is needed - just include `examples.js` and the behavior is automatic.

## Test Charts Matrix

The `test-charts/` folder contains visual test matrices for verifying legend and title positioning across all chart types. Each test page generates thousands of chart variations to ensure correct rendering in all position combinations.

### Chart ID Format

Each chart in the test matrices has a unique ID following this format:

```
{chartType}-L{legendPos}-T{titlePos}-LT{legendTitlePos}-V{showValue}-P{showPercent}
```

**Components:**
- `{chartType}`: Chart type prefix (e.g., `pie`, `bar-v`, `bar-h`, `bar-s`, `line`, `funnel`)
- `L{legendPos}`: Legend position
- `T{titlePos}`: Chart title position
- `LT{legendTitlePos}`: Legend title position
- `V{showValue}`: Show value in legend (1=true, 0=false)
- `P{showPercent}`: Show percent in legend (1=true, 0=false)

**Position Abbreviations:**

| Abbreviation | Position |
|--------------|----------|
| `r` | right |
| `l` | left |
| `t` | top |
| `b` | bottom |
| `tl` | top-left |
| `tr` | top-right |
| `bl` | bottom-left |
| `br` | bottom-right |
| `n` | none |

**Boolean Abbreviations:**
| Abbreviation | Value |
|--------------|-------|
| `1` | true |
| `0` | false |

**Examples:**
- `pie-Lbl-Tbr-LTt-V1-P0` = Pie chart with legend at bottom-left, chart title at bottom-right, legend title at top, show-value=true, show-percent=false
- `bar-v-Lr-Tn-LTn-V0-P0` = Vertical bar chart with legend at right, no chart title, no legend title, show-value=false, show-percent=false
- `bar-s-Lt-Ttl-LTb-V1-P1` = Stacked bar chart with legend at top, chart title at top-left, legend title at bottom, show-value=true, show-percent=true

### Finding a Chart by ID

When you encounter a chart ID (e.g., from a bug report like "chart `pie-Lbl-Tbr-LTt-V1-P0` has overlap issues"):

1. **Identify the chart type** from the prefix:
   - `pie` → `test-charts/pie.html`
   - `bar-v` → `test-charts/bar-vertical.html`
   - `bar-vr` → `test-charts/bar-vertical-reverse.html`
   - `bar-h` → `test-charts/bar-horizontal.html`
   - `bar-hr` → `test-charts/bar-horizontal-reverse.html`
   - `bar-s` → `test-charts/bar-stacked.html`
   - `line` → `test-charts/line.html`
   - `funnel` → `test-charts/funnel.html`

2. **Navigate to the legend section**: Charts are organized by legend position first (8 sections: right, left, top, top-left, top-right, bottom, bottom-left, bottom-right)

3. **Find the title subsection**: Within each legend section, charts are grouped by chart title position (9 options: none, top, top-left, top-right, bottom, bottom-left, bottom-right, left, right)

4. **Locate the legend title subsection**: Within each title subsection, charts are grouped by legend title position (9 options)

5. **Find the show-value/show-percent combination**: Within each legend title subsection, there are 4 charts for each combination of show-value and show-percent

6. **Use browser search**: Press Ctrl+F (or Cmd+F) and search for the exact chart ID (e.g., `pie-Lbl-Tbr-LTt-V1-P0`). Each chart displays its ID next to its heading.

### Maintaining Test Charts

When adding a new chart type to the library:

1. **Create a new test matrix file** in `test-charts/` following the naming convention (e.g., `scatter.html`)

2. **Use the same structure** as existing test files:
   - Link to `test-matrix.css` for consistent styling
   - Generate all combinations: 8 legend positions × 9 title positions × 9 legend title positions × 2 show-value × 2 show-percent = 2,592 charts
   - Use appropriate chart ID prefix

3. **Update `test-charts/index.html`**:
   - Add a new card for the chart type
   - Update the total chart count if displayed

4. **Test the matrix** by running `npm run dev` and navigating to the test page to verify all charts render correctly

### Test Matrix File Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{Chart Type} - Test Matrix</title>
    <link rel="stylesheet" href="test-matrix.css">
</head>
<body>
    <h1>{Chart Type} - Legend & Title Test Matrix</h1>
    <p class="back-link"><a href="index.html">&larr; Back to Index</a></p>
    <p>8 legend positions &times; 9 chart title positions &times; 9 legend title positions = 648 charts</p>
    <p><strong>Chart ID format:</strong> <code>{prefix}-L{legend}-T{title}-LT{legendTitle}</code></p>

    <div id="chart-container"></div>

    <script type="module" src="../src/index.ts"></script>
    <script>
        // JavaScript to generate all chart combinations
        // See existing test files for implementation pattern
    </script>
</body>
</html>
```

