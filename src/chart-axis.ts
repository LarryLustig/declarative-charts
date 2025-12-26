import { LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { SVG_TEXT_STYLE_ATTRS, HTML_TO_SVG_WARNINGS, type TitleStyleWarning } from './chart-title.js';

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
 * ## Axis Titles
 *
 * Add a title to the axis by nesting a `<dc-title>` element:
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
 * @attr {number|'auto'} label-interval - Interval for showing category labels (1=all, 2=every other, 'auto'=calculate)
 * @attr {number|'auto'} label-lines - Number of lines for staggered labels (1=single line, 'auto'=calculate)
 * @attr {string} fill - Text color for axis labels (SVG attribute)
 * @attr {number} font-size - Font size for axis labels in viewBox units
 * @attr {string} font-family - Font family for axis labels
 *
 * @example
 * <dc-chart>
 *   <dc-axis position="bottom" label-interval="2"></dc-axis>
 *   <dc-axis position="left">
 *     <dc-title>Sales</dc-title>
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
