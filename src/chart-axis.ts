import { LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { SVG_TEXT_STYLE_ATTRS, HTML_TO_SVG_WARNINGS, type TitleStyleWarning } from './chart-title.js';
import type { ChartGrid, GridConfig } from './chart-grid.js';

/**
 * Positional names for axis placement.
 * These specify which side of the chart the axis appears on.
 */
export type AxisPosition = 'left' | 'right' | 'top' | 'bottom';

/**
 * Traditional axis names that map to positional names based on chart orientation.
 * - For vertical charts: x = bottom, y = left
 * - For horizontal charts: x = left, y = bottom
 */
export type AxisName = 'x' | 'y';

/**
 * Combined type for position attribute - accepts both naming conventions.
 */
export type AxisPositionOrName = AxisPosition | AxisName;

/**
 * Axis type - determines how the axis behaves.
 * - 'value': Continuous numeric scale (auto-scaled or user-configured)
 * - 'label': Discrete category labels from data elements
 * - 'time': Temporal data with proportional time positioning
 */
export type AxisType = 'value' | 'label' | 'time';

/**
 * Pattern that indicates CSS units which don't work well in SVG viewBox coordinates.
 */
const CSS_UNIT_PATTERN = /^[\d.]+\s*(px|em|rem|pt|%)$/i;

/**
 * Axis configuration element for charts.
 *
 * This element configures an axis on a chart (bar chart, line chart, etc.).
 * It does not render itself - the parent chart reads its configuration and
 * renders the axis accordingly.
 *
 * ## Axis Types
 *
 * - `value`: Numeric continuous scale with configurable range and ticks
 * - `label`: Discrete category labels from data elements
 * - `time`: Temporal data with proportional time-based positioning
 *
 * Type is inferred if not specified:
 * - Vertical charts: left/right = value, top/bottom = label
 * - Horizontal charts: left/right = label, top/bottom = value
 *
 * ## Position Naming
 *
 * You can specify axis position using either:
 *
 * **Positional names** (recommended):
 * - `left`, `right`, `top`, `bottom` - explicit side of the chart
 *
 * **Traditional names**:
 * - `x`, `y` - mapped based on chart orientation:
 *   - Vertical charts: x = bottom (category), y = left (value)
 *   - Horizontal charts: x = left (value), y = bottom (category)
 *
 * ## Range & Tick Configuration (value/time axes)
 *
 * ```html
 * <!-- Fixed range -->
 * <dc-axis position="left" min-value="0" max-value="100"></dc-axis>
 *
 * <!-- Custom tick interval -->
 * <dc-axis position="left" tick-interval="25"></dc-axis>
 *
 * <!-- Explicit tick values -->
 * <dc-axis position="left" tick-values="0, 50, 75, 100"></dc-axis>
 * ```
 *
 * ## Grid Lines
 *
 * Add a `<dc-grid>` child to configure grid lines:
 *
 * ```html
 * <dc-axis position="left">
 *   <dc-grid color="#eee" style="dashed"></dc-grid>
 * </dc-axis>
 * ```
 *
 * ## Axis Titles
 *
 * Add a title by nesting a `<dc-title>` element:
 *
 * ```html
 * <dc-axis position="left">
 *   <dc-title>Revenue ($)</dc-title>
 * </dc-axis>
 * ```
 *
 * @element dc-axis
 *
 * @attr {string} position - Axis position: "left", "right", "top", "bottom", "x", or "y"
 * @attr {string} type - Axis type: "value", "label", or "time" (inferred if omitted)
 * @attr {number|'auto'} min-value - Minimum axis value (value/time axes only)
 * @attr {number|'auto'} max-value - Maximum axis value (value/time axes only)
 * @attr {string} range-padding - Padding beyond data range, e.g. "10%"
 * @attr {number} tick-count - Approximate number of ticks (default: 5)
 * @attr {number} tick-interval - Exact interval between ticks
 * @attr {string} tick-values - Explicit tick positions (comma-separated)
 * @attr {number|'auto'} label-interval - Interval for category labels (1=all, 2=every other, 'auto')
 * @attr {number|'auto'} label-lines - Lines for staggered labels (1=single, 'auto')
 * @attr {string} value-format - Format for value axis labels
 * @attr {string} date-format - Input date parsing format (time axes only)
 * @attr {string} date-label-format - Output date label format (time axes only)
 * @attr {string} fill - Text color for axis labels (SVG attribute)
 * @attr {number} font-size - Font size in viewBox units
 * @attr {string} font-family - Font family for axis labels
 *
 * @example
 * <dc-chart>
 *   <dc-axis position="bottom" label-interval="2"></dc-axis>
 *   <dc-axis position="left" min-value="0" max-value="100">
 *     <dc-title>Sales</dc-title>
 *     <dc-grid color="#eee" style="dashed"></dc-grid>
 *   </dc-axis>
 *   <dc-bar value="30" label="A"></dc-bar>
 * </dc-chart>
 */
@customElement('dc-axis')
export class ChartAxis extends LitElement {
  /**
   * Position of the axis. Accepts either positional names (left, right, top, bottom)
   * or traditional names (x, y) which are mapped based on chart orientation.
   */
  @property({ type: String })
  position: AxisPositionOrName = 'bottom';

  /**
   * Interval for showing category axis labels.
   * - 1: Show all labels
   * - 2+: Show every Nth label
   * - 'auto': Automatically calculate interval to prevent overlap (default)
   */
  @property({ type: String, attribute: 'label-interval' })
  labelInterval: number | 'auto' = 'auto';

  /**
   * Number of lines to use for category axis labels.
   * Labels are staggered across multiple lines to prevent overlap.
   * - 1: All labels on one line (default)
   * - 2+: Labels distributed across N lines
   * - 'auto': Automatically calculate the minimum lines needed
   */
  @property({ type: String, attribute: 'label-lines' })
  labelLines: number | 'auto' = 1;

  /**
   * Format for value axis labels.
   * Overrides the chart's value-format for this axis only.
   * Uses the same format syntax as chart's value-format attribute.
   *
   * @example
   * <dc-axis position="left" value-format="$,.0f"></dc-axis>
   * <dc-axis position="left" value-format="compact 1"></dc-axis>
   */
  @property({ type: String, attribute: 'value-format' })
  valueFormat?: string;

  // === Phase 1: Value Axis Controls ===

  /**
   * Axis type - determines how the axis behaves.
   * If omitted, type is inferred from position and chart orientation:
   * - Vertical charts: left/right = 'value', top/bottom = 'label'
   * - Horizontal charts: left/right = 'label', top/bottom = 'value'
   */
  @property({ type: String })
  type?: AxisType;

  /**
   * Minimum value for the axis range.
   * - Number: Use this exact minimum
   * - 'auto': Auto-calculate from data (default behavior)
   * Only applies to value and time axes.
   */
  @property({ type: String, attribute: 'min-value' })
  minValue?: string;

  /**
   * Maximum value for the axis range.
   * - Number: Use this exact maximum
   * - 'auto': Auto-calculate from data (default behavior)
   * Only applies to value and time axes.
   */
  @property({ type: String, attribute: 'max-value' })
  maxValue?: string;

  /**
   * Padding to add beyond the data range as a percentage.
   * For example, "10%" adds 10% padding on each end.
   * Only applies when min-value or max-value is 'auto'.
   */
  @property({ type: String, attribute: 'range-padding' })
  rangePadding?: string;

  /**
   * Approximate number of ticks to show on the axis.
   * The actual count may vary to produce "nice" tick values.
   * Lower priority than tick-interval and tick-values.
   * Default is 5.
   */
  @property({ type: Number, attribute: 'tick-count' })
  tickCount?: number;

  /**
   * Exact interval between tick values.
   * For example, tick-interval="25" shows ticks at 0, 25, 50, 75, etc.
   * Takes priority over tick-count.
   */
  @property({ type: Number, attribute: 'tick-interval' })
  tickInterval?: number;

  /**
   * Explicit tick values as a comma-separated list.
   * For example, tick-values="0, 50, 75, 100" shows exactly those ticks.
   * Takes highest priority over tick-count and tick-interval.
   */
  @property({ type: String, attribute: 'tick-values' })
  tickValues?: string;

  // === Phase 3: Time Axis (date properties) ===

  /**
   * Input date parsing format.
   * - Omit for auto-detection (ISO 8601)
   * - 'timestamp': Unix timestamp in seconds
   * Only applies to time axes.
   */
  @property({ type: String, attribute: 'date-format' })
  dateFormat?: string;

  /**
   * Output date label format using tokens like:
   * yyyy (2024), MMM (Jan), MM (01), d (5), dd (05),
   * HH (14), hh (02), mm (30), ss (45)
   *
   * @example "MMM d" → "Jan 15"
   * @example "HH:mm" → "14:30"
   */
  @property({ type: String, attribute: 'date-label-format' })
  dateLabelFormat?: string;

  static styles = css`
    :host {
      display: none !important;
    }
  `;

  /**
   * Resolve position to a canonical positional name.
   * Maps 'x' and 'y' to positional names based on chart orientation.
   *
   * @param orientation - Chart orientation ('vertical' or 'horizontal')
   * @returns Resolved positional name
   */
  getResolvedPosition(_orientation: 'vertical' | 'horizontal' = 'vertical'): AxisPosition {
    // Direct positional names pass through
    if (['left', 'right', 'top', 'bottom'].includes(this.position)) {
      return this.position as AxisPosition;
    }

    // Map x/y to physical axis positions
    // Note: x and y always refer to the same physical positions regardless of chart orientation
    // x = horizontal axis (bottom), y = vertical axis (left)
    // The orientation parameter is available for future extensions if needed
    if (this.position === 'x') {
      return 'bottom';
    }

    if (this.position === 'y') {
      return 'left';
    }

    // Fallback
    return 'bottom';
  }

  /**
   * Get the title element nested inside this axis, if any.
   * @returns The dc-title element or null
   */
  getTitleElement(): Element | null {
    return this.querySelector(':scope > dc-title');
  }

  /**
   * Get title information from nested dc-title element.
   * @returns Object with text and SVG styles, or null if no title
   */
  getTitleInfo(): { text: string; svgStyles: Record<string, string> } | null {
    const titleEl = this.getTitleElement();
    if (!titleEl) return null;

    const text = titleEl.textContent?.trim() || '';
    if (!text) return null;

    // Get SVG style attributes from the title element
    const svgStyles: Record<string, string> = {};
    for (const attr of Array.from(titleEl.attributes)) {
      if (SVG_TEXT_STYLE_ATTRS.has(attr.name)) {
        svgStyles[attr.name] = attr.value;
      }
    }

    return { text, svgStyles };
  }

  /**
   * Get SVG presentation attributes to pass through to rendered text elements.
   * @returns Object with attribute names and values
   */
  getSvgStyleAttributes(): Record<string, string> {
    const svgAttrs: Record<string, string> = {};

    for (const attr of Array.from(this.attributes)) {
      if (SVG_TEXT_STYLE_ATTRS.has(attr.name)) {
        svgAttrs[attr.name] = attr.value;
      }
    }

    return svgAttrs;
  }

  /**
   * Check for common mistakes in attribute usage and return warnings.
   * @returns Array of warnings (empty if no issues detected)
   */
  getStyleWarnings(): TitleStyleWarning[] {
    const warnings: TitleStyleWarning[] = [];

    for (const attr of Array.from(this.attributes)) {
      // Check for HTML attributes that should be SVG attributes
      const htmlWarning = HTML_TO_SVG_WARNINGS[attr.name];
      if (htmlWarning) {
        warnings.push({
          attribute: attr.name,
          value: attr.value,
          message: `<dc-axis>: ${htmlWarning.message}. Found ${attr.name}="${attr.value}"`,
        });
      }

      // Check for CSS units in attributes that should be unitless
      if (attr.name === 'font-size' && CSS_UNIT_PATTERN.test(attr.value)) {
        warnings.push({
          attribute: attr.name,
          value: attr.value,
          message: `<dc-axis>: font-size should be unitless (viewBox units), not CSS units. Found font-size="${attr.value}". Use font-size="${parseFloat(attr.value)}" instead.`,
        });
      }
    }

    // Check min/max value relationship
    const minVal = this.getMinValue();
    const maxVal = this.getMaxValue();
    if (typeof minVal === 'number' && typeof maxVal === 'number' && minVal >= maxVal) {
      warnings.push({
        attribute: 'min-value',
        value: String(minVal),
        message: `<dc-axis>: min-value (${minVal}) must be less than max-value (${maxVal}).`,
      });
    }

    // Check tick-interval is positive
    if (this.tickInterval !== undefined) {
      const interval = this.getTickInterval();
      if (interval === undefined) {
        warnings.push({
          attribute: 'tick-interval',
          value: String(this.tickInterval),
          message: `<dc-axis>: tick-interval must be a positive number. Found tick-interval="${this.tickInterval}".`,
        });
      }
    }

    // Warn if both tick-count and tick-interval specified
    if (this.tickCount !== undefined && this.tickInterval !== undefined) {
      warnings.push({
        attribute: 'tick-count',
        value: String(this.tickCount),
        message: `<dc-axis>: Both tick-count and tick-interval specified. tick-interval takes priority; tick-count will be ignored.`,
      });
    }

    // Warn if type="label" with value-axis attributes
    const valueAxisAttrs = ['min-value', 'max-value', 'tick-count', 'tick-interval', 'tick-values', 'range-padding'];
    if (this.type === 'label') {
      const usedValueAttrs = valueAxisAttrs.filter(attr => this.hasAttribute(attr));
      if (usedValueAttrs.length > 0) {
        warnings.push({
          attribute: 'type',
          value: 'label',
          message: `<dc-axis>: Axis type is "label" but value-axis attributes are specified: ${usedValueAttrs.join(', ')}. These attributes only apply to "value" or "time" axes.`,
        });
      }
    }

    // Also check nested title for warnings
    const titleEl = this.getTitleElement();
    if (titleEl) {
      for (const attr of Array.from(titleEl.attributes)) {
        const htmlWarning = HTML_TO_SVG_WARNINGS[attr.name];
        if (htmlWarning) {
          warnings.push({
            attribute: attr.name,
            value: attr.value,
            message: `<dc-axis> <dc-title>: ${htmlWarning.message}. Found ${attr.name}="${attr.value}"`,
          });
        }

        if (attr.name === 'font-size' && CSS_UNIT_PATTERN.test(attr.value)) {
          warnings.push({
            attribute: attr.name,
            value: attr.value,
            message: `<dc-axis> <dc-title>: font-size should be unitless (viewBox units), not CSS units. Found font-size="${attr.value}". Use font-size="${parseFloat(attr.value)}" instead.`,
          });
        }
      }
    }

    return warnings;
  }

  /**
   * Parse labelInterval and return the effective value.
   * @returns 'auto' or a positive integer
   */
  getLabelIntervalValue(): number | 'auto' {
    if (this.labelInterval === 'auto') {
      return 'auto';
    }
    const parsed = typeof this.labelInterval === 'number'
      ? this.labelInterval
      : parseInt(String(this.labelInterval), 10);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  }

  /**
   * Parse labelLines and return the effective value.
   * @returns 'auto' or a positive integer
   */
  getLabelLinesValue(): number | 'auto' {
    if (this.labelLines === 'auto') {
      return 'auto';
    }
    const parsed = typeof this.labelLines === 'number'
      ? this.labelLines
      : parseInt(String(this.labelLines), 10);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  }

  // === Getter methods for Phase 1 properties ===

  /**
   * Get the axis type value.
   * @returns The type or undefined if not set
   */
  getTypeValue(): AxisType | undefined {
    if (this.type && ['value', 'label', 'time'].includes(this.type)) {
      return this.type;
    }
    return undefined;
  }

  /**
   * Parse minValue and return the effective value.
   * @returns Number, 'auto', or undefined if not set
   */
  getMinValue(): number | 'auto' | undefined {
    if (this.minValue === undefined || this.minValue === '') {
      return undefined;
    }
    if (this.minValue === 'auto') {
      return 'auto';
    }
    const parsed = parseFloat(this.minValue);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Parse maxValue and return the effective value.
   * @returns Number, 'auto', or undefined if not set
   */
  getMaxValue(): number | 'auto' | undefined {
    if (this.maxValue === undefined || this.maxValue === '') {
      return undefined;
    }
    if (this.maxValue === 'auto') {
      return 'auto';
    }
    const parsed = parseFloat(this.maxValue);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Parse rangePadding and return as a decimal (e.g., "10%" returns 0.1).
   * @returns Decimal value or undefined if not set
   */
  getRangePadding(): number | undefined {
    if (!this.rangePadding) {
      return undefined;
    }
    // Handle percentage format like "10%"
    const percentMatch = this.rangePadding.match(/^([\d.]+)\s*%$/);
    if (percentMatch) {
      const percent = parseFloat(percentMatch[1]);
      return isNaN(percent) ? undefined : percent / 100;
    }
    // Handle plain number (treated as decimal already)
    const parsed = parseFloat(this.rangePadding);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Get the tick count value.
   * @returns Number or undefined if not set
   */
  getTickCount(): number | undefined {
    if (this.tickCount === undefined) {
      return undefined;
    }
    const count = typeof this.tickCount === 'number'
      ? this.tickCount
      : parseInt(String(this.tickCount), 10);
    return isNaN(count) || count < 1 ? undefined : count;
  }

  /**
   * Get the tick interval value.
   * @returns Number or undefined if not set
   */
  getTickInterval(): number | undefined {
    if (this.tickInterval === undefined) {
      return undefined;
    }
    const interval = typeof this.tickInterval === 'number'
      ? this.tickInterval
      : parseFloat(String(this.tickInterval));
    return isNaN(interval) || interval <= 0 ? undefined : interval;
  }

  /**
   * Parse tickValues from comma-separated string to array of numbers.
   * @returns Array of numbers or undefined if not set
   */
  getTickValues(): number[] | undefined {
    if (!this.tickValues) {
      return undefined;
    }
    const values = this.tickValues
      .split(',')
      .map(v => parseFloat(v.trim()))
      .filter(v => !isNaN(v));
    return values.length > 0 ? values.sort((a, b) => a - b) : undefined;
  }

  // === Getter methods for Phase 3 properties (Time Axis) ===

  /**
   * Get the date format for parsing input values.
   * @returns Format string or undefined if not set
   */
  getDateFormat(): string | undefined {
    return this.dateFormat || undefined;
  }

  /**
   * Get the date label format for output display.
   * @returns Format string or undefined if not set
   */
  getDateLabelFormat(): string | undefined {
    return this.dateLabelFormat || undefined;
  }

  // === Grid methods (Phase 2) ===

  /**
   * Get the grid element nested inside this axis, if any.
   * @returns The dc-grid element or null
   */
  getGridElement(): ChartGrid | null {
    return this.querySelector(':scope > dc-grid') as ChartGrid | null;
  }

  /**
   * Get grid configuration from nested dc-grid element.
   * Returns null if no dc-grid element is present.
   * @returns GridConfig object or null
   */
  getGridConfig(): GridConfig | null {
    const gridEl = this.getGridElement();
    if (!gridEl) return null;

    return gridEl.getGridConfig();
  }

  render() {
    // No visual rendering - this element just holds configuration
    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-axis': ChartAxis;
  }
}
