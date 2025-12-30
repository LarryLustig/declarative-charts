# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Stage Chart Auto-Fit Label Suppression**
  - Labels that don't fit inside small shapes are automatically suppressed
  - Hover popups are automatically enabled when labels are suppressed
  - Values are prioritized over labels when only one text element fits
  - Helps with extreme value differences in `stage-size="value"` mode
  - Uses per-render caching for efficient event handler access to layout data
  - Examples updated with new "Small Values and Zero Handling" section

- **Stage Chart Zero-Value Handling**
  - New composable attributes for controlling zero-value display:
    - `zero-value`: Size value for zero-value shapes (number or "auto")
    - `zero-fill`: ID reference to a `<dc-fill>` element for styling
    - `zero-shape`: Override shape type for zero-value stages
    - `zero-hidden`: Boolean to hide zero-value stages entirely
  - `zero` compound shorthand combines settings (e.g., `zero="auto circle #my-fill"`)
  - "auto" calculates size from smallest non-zero value
  - Replaces the old `zero-style` attribute with more flexible options

- **Enhanced dc-fill SVG Attributes**
  - Full SVG stroke-* specification support:
    - `stroke-width`, `stroke-opacity`, `stroke-dasharray`, `stroke-dashoffset`
    - `stroke-linecap` ("butt", "round", "square")
    - `stroke-linejoin` ("miter", "round", "bevel")
    - `stroke-miterlimit`
  - Fill attributes: `fill-opacity`, `fill-rule`
  - Named dash patterns: "solid", "dashed", "dotted", "dash-dot", "long-dash"
  - `<dc-fill>` can now be referenced standalone via ID (e.g., from `zero-fill`)

### Changed

- **Shared Navigation for Examples**
  - Navigation is now dynamically generated from `examples/examples.js`
  - All example pages use a single `NAV_CONFIG` object for consistent navigation
  - Adding new pages only requires editing `examples.js` instead of all HTML files

### Fixed

- **Stale Attributes in Examples**
  - Replaced non-existent `fill-colors` attribute with `bar-color` or `palette`
  - Replaced non-existent `stroke-colors` attribute with `line-color`
  - Fixed `slice-color` documentation reference to use `palette`

### Added

- **Swatch Built-in Palette Support**
  - `index` attribute for selecting colors from built-in palettes by position
  - Works with categorical, sequential, and diverging palettes
  - Example: `<dc-swatch palette="category10" index="2"></dc-swatch>`

- **Axis & Grid Configuration**
  - `<dc-axis>` element with `type` attribute: `'value'`, `'label'`, or `'time'` (inferred if omitted)
  - Range control: `min-value`, `max-value`, `range-padding` attributes
  - Tick configuration: `tick-count`, `tick-interval`, `tick-values` attributes
  - Time axis properties: `date-format`, `date-label-format` for temporal data
  - `<dc-grid>` child element for grid line styling (color, style, visibility)
  - Backward compatible: type inference from position, auto-calculated ranges when omitted

- **Negative Value Support**
  - Bar charts extend downward (vertical) or leftward (horizontal) for negative values
  - Line and bubble charts position points below zero when appropriate
  - Automatic axis scaling for negative ranges with nice number algorithm
  - Distinct zero line styling when range spans positive and negative
  - All-negative vertical charts position category axis at top (where zero is)
  - Use palettes with `min-value`/`max-value` for positive/negative coloring

- **Number Formatting System**
  - Named presets: `number`, `integer`, `compact`, `currency`, `percent`
  - d3-format subset support: `,.2f`, `.1s`, `$,.0f`, `.1%`
  - Locale-aware formatting via `locale` attribute
  - Format inheritance: element → legend/axis → chart → default
  - `value-format` and `percent-format` attributes on charts, axes, legends, and elements

- **Pattern Fills**
  - 8 built-in SVG patterns: `diagonal-lines`, `diagonal-lines-reverse`, `horizontal-lines`, `vertical-lines`, `dots`, `crosshatch`, `grid`, `checkerboard`
  - Direct pattern application via `pattern` attribute
  - Pattern definitions in palettes with `<dc-fill>` elements
  - Customizable pattern stroke, fill, and scale

- **High Contrast Mode**
  - Respects `prefers-contrast: high` media query
  - `high-contrast` attribute for explicit activation
  - WCAG AA compliant color palette
  - Automatic pattern assignment for visual distinction
  - Custom high-contrast palettes via `<dc-palette high-contrast>`

- **Keyboard Navigation**
  - Roving tabindex pattern for all chart types
  - Arrow keys to navigate between data elements
  - Enter/Space to activate elements (links, popups)
  - Home/End to jump to first/last element
  - Escape to close popups and exit navigation
  - Visual focus indicator during keyboard navigation

- **ARIA Accessibility**
  - `role="img"` on root SVG element
  - `aria-label` with chart type and title
  - `aria-describedby` pointing to `<desc>` element
  - Auto-generated descriptions when no explicit description provided

- **Auto-Insights (Screen Reader Descriptions)**
  - Analyzes chart data to generate meaningful descriptions
  - Describes trends, comparisons, and patterns
  - Implemented for all chart types: bar, line, bubble, pie, funnel
  - `aria-insights` attribute: `'auto'` (default), `'basic'`, `'none'`
  - Manual overrides via `aria-label` and `aria-description`

- **Palette System**
  - `<dc-palette>` container for reusable fill definitions
  - `<dc-fill>` elements with label matching, value-range matching
  - Pattern and solid fill support
  - ID-based pattern references

- **Bubble Charts**
  - `<dc-bubble>` elements within `<dc-chart>`
  - Size scaling based on value
  - Full styling and interaction support

- **Core Chart Types**
  - Bar charts (vertical, horizontal, grouped, stacked)
  - Line charts (single and multi-line)
  - Pie charts (with donut support via `inner-radius`)
  - Funnel charts (with chevron shapes, flat-top/bottom options)

- **Chart Chrome**
  - `<dc-title>` with SVG text styling
  - `<dc-legend>` with multiple positions and layouts
  - `<dc-axis>` configuration (label-interval, label-lines, titles)
  - `<dc-popup>` with hover and click triggers
  - Auto-popup feature for automatic tooltips

- **Built-in Palettes**
  - 25+ predefined color palettes available via `palette` attribute
  - Categorical: `category10`, `accent`, `dark2`, `paired`, `pastel`, `set1`, `set2`, `set3`, `tableau10`
  - Sequential: `blue`, `green`, `red`, `orange`, `purple`, `gray`, `viridis`, `plasma`, `warm`, `cool`, `turbo`
  - Diverging: `red-blue`, `purple-green`, `brown-teal`, `pink-green`, `spectral`
  - User-defined `<dc-palette>` elements take precedence over built-in palettes with same name

- **Color System**
  - Element-level `fill` and `stroke` attributes
  - `palette` attribute references custom or built-in palettes
  - Auto-generated colors using golden ratio algorithm when no palette specified

- **Dynamic Updates**
  - Charts update when child elements are modified
  - `hidden` attribute support for showing/hiding elements
  - Attribute passthrough for htmx/Alpine.js integration

- **Logging System**
  - `logging` attribute for debugging calculations
  - `<dc-log-console>` element for displaying logs
  - Captures padding, colors, legend dimensions, element positions
  - `console-log` attribute echoes messages to browser DevTools console
  - Console messages grouped by render cycle using `console.groupCollapsed()`
  - Smart chart identification: uses id, title text, or tag name
  - High-value warnings for common issues:
    - Empty charts or all-hidden elements
    - Lines without points, zero-value bars
    - Small pie slices (<3%), invalid donut radius
    - Increasing funnel values (anti-pattern)
    - Uniform colors across elements

### Changed

- **Refactored Chart Element Class Hierarchy**
  - Renamed `BaseShape` to `BaseFilledShape` to clarify its purpose (backward-compatible alias provided)
  - `ChartLine` now extends `BaseChartElement` directly (stroke-only element)
  - All filled shapes (`dc-bar`, `dc-point`, `dc-bubble`, `dc-pie-slice`, `dc-bar-segment`, `dc-funnel-stage`, `dc-stage`) extend `BaseFilledShape`
  - Lifted common properties to base classes for better code reuse:
    - `showValue`, `showPercent` → `BaseChartElement`
    - `value`, `showLabel` → `BaseFilledShape`
  - Moved `getPassthroughAttributes()` and `autoPopup` to `BaseChartElement`

### Removed

- **BREAKING: Deprecated Color Attributes** - The following chart-level color attributes have been removed in favor of the `palette` attribute:
  - `fill-colors` - Use `palette` attribute with a built-in or custom palette instead
  - `stroke-colors` - Use `stroke` attribute on individual elements instead
  - `fill-start-color` / `fill-end-color` / `start-color` / `end-color` - Use `palette` with a sequential palette (e.g., `palette="blue"`)
  - `stroke-start-color` / `stroke-end-color` - Use `stroke` attribute on individual elements instead

  **Migration examples:**
  ```html
  <!-- Before -->
  <dc-chart fill-colors="#4CAF50, #2196F3, #FF9800">

  <!-- After: Use built-in palette -->
  <dc-chart palette="category10">

  <!-- After: Use element-level fills -->
  <dc-chart>
    <dc-bar fill="#4CAF50" ...></dc-bar>
    <dc-bar fill="#2196F3" ...></dc-bar>
  </dc-chart>

  <!-- Before -->
  <dc-funnel-chart start-color="#3498db" end-color="#e74c3c">

  <!-- After: Use sequential palette -->
  <dc-funnel-chart palette="blue">

  <!-- After: Use custom palette -->
  <dc-palette id="my-gradient">
    <dc-fill fill="#3498db"></dc-fill>
    <dc-fill fill="#8e44ad"></dc-fill>
    <dc-fill fill="#e74c3c"></dc-fill>
  </dc-palette>
  <dc-funnel-chart palette="my-gradient">
  ```

### Fixed

- **dc-fill Custom Element Registration** - The `<dc-fill>` element was not being registered due to tree-shaking removing the module (only type-only imports existed). Added side-effect import in library entry point to ensure the element is always available.

## [0.1.0] - Initial Development

- Project setup with Vite, Lit, and TypeScript
- Basic component architecture established
