import { customElement, property } from 'lit/decorators.js';
import { LitElement } from 'lit';
import { SVG_TEXT_STYLE_ATTRS, HTML_TO_SVG_WARNINGS, type TitleStyleWarning } from './chart-title.js';
import type { ChartTitle } from './chart-title.js';

/**
 * Patterns that indicate CSS units which don't work well in SVG viewBox coordinates.
 */
const CSS_UNIT_PATTERN = /^[\d.]+\s*(px|em|rem|pt|%)$/i;

export type LegendPosition =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'left'
  // | 'left-top'
  // | 'left-bottom'
  | 'right'
  // | 'right-top'
  // | 'right-bottom'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right';

/**
 * Custom converter for boolean attributes that handles "false" string
 * Returns undefined when attribute is absent to preserve the default value
 */
const booleanConverter = {
  fromAttribute: (value: string | null) => {
    // When attribute is absent, return undefined to use the property's default value
    if (value === null) return undefined;
    if (value === 'false') return false;
    return true;
  },
  toAttribute: (value: boolean) => {
    return value ? '' : null;
  }
};

/**
 * Legend element for charts
 *
 * This element doesn't render itself - instead it's detected by the parent
 * chart which uses its configuration to render a legend. The legend renders
 * as SVG text elements, so styling should use SVG presentation attributes.
 *
 * Style the legend text using SVG attributes (not CSS/HTML):
 * - Use `fill` for text color (not `color`)
 * - Use unitless `font-size` values in viewBox units (not `px`, `em`, `rem`)
 * - Use `font-family`, `font-weight`, `font-style` as normal
 *
 * @element dc-legend
 *
 * @attr {boolean} show-value - Whether to show values in legend (default: true)
 * @attr {boolean} show-percent - Whether to show percentages in legend (default: false)
 * @attr {boolean} show-label - Whether to show labels in legend (default: true)
 * @attr {string} columns - Number of columns: "auto" (default, calculates based on available space), integer for explicit tabular layout, or "*" for wrapped/inline layout
 * @attr {string} position - Position of the legend: "right" (default), "top", "top-left", "top-right", "left", "left-top", "left-bottom", "right-top", "right-bottom", "bottom", "bottom-left", "bottom-right"
 * @attr {string} max-width - Maximum width for the legend. Accepts px, rem, em, or % (percentage of chart width). If not specified, defaults to 80% for top/bottom positions, calculated content width for left/right with tabular columns, or 25% for left/right with columns="*"
 * @attr {string} fill - Text color for legend items (SVG attribute, e.g., "#333", "red")
 * @attr {number} font-size - Font size for legend items in viewBox units (e.g., "13", not "13px")
 * @attr {string} font-family - Font family for legend items
 * @attr {string} font-weight - Font weight for legend items
 *
 * @slot - Can contain a dc-title element to customize the legend title
 *
 * @example
 * <dc-bar-chart width="600" height="400">
 *   <dc-title>Chart Title</dc-title>
 *   <dc-bar value="10" label="Jan"></dc-bar>
 *   <dc-legend></dc-legend>
 * </dc-bar-chart>
 *
 * @example
 * <dc-bar-chart width="600" height="400">
 *   <dc-title>Chart Title</dc-title>
 *   <dc-bar value="10" label="Jan"></dc-bar>
 *   <dc-legend show-value="false" show-percent="true">
 *     <dc-title>Categories</dc-title>
 *   </dc-legend>
 * </dc-bar-chart>
 *
 * @example
 * <dc-bar-chart width="600" height="400">
 *   <dc-title>Chart Title</dc-title>
 *   <dc-bar value="10" label="Jan"></dc-bar>
 *   <dc-legend position="bottom" columns="3" fill="#1a1a1a" font-size="14"></dc-legend>
 * </dc-bar-chart>
 */
@customElement('dc-legend')
export class ChartLegend extends LitElement {
  @property({ attribute: 'show-value', converter: booleanConverter })
  showValue = true;

  @property({ attribute: 'show-percent', converter: booleanConverter })
  showPercent = false;

  @property({ attribute: 'show-label', converter: booleanConverter })
  showLabel = true;

  @property({ type: String })
  columns: string = 'auto';

  @property({ type: String })
  position: LegendPosition = 'right';

  @property({ attribute: 'max-width', type: String })
  maxWidth: string | undefined = undefined;

  /**
   * Get the custom title for this legend, if any
   * @deprecated Use getTitleInfo() instead for full title information including position
   */
  get customTitle(): string | undefined {
    const titleElement = this.querySelector('dc-title');
    return titleElement?.textContent?.trim() || undefined;
  }

  /**
   * Get the title element info including text, position, and SVG styles
   * @returns Object with text, position, and svgStyles, or null if no title
   */
  getTitleInfo(): { text: string; position: string; svgStyles: Record<string, string> } | null {
    const titleElement = this.querySelector('dc-title') as ChartTitle | null;
    if (!titleElement) return null;

    const text = titleElement.textContent?.trim();
    if (!text) return null;

    // Get position attribute, default to 'top' (centered above items)
    const position = titleElement.getAttribute('position') || 'top';

    // Get SVG style attributes from the title element
    const svgStyles = titleElement.getSvgStyleAttributes ? titleElement.getSvgStyleAttributes() : {};

    return { text, position, svgStyles };
  }

  /**
   * Get SVG presentation attributes to pass through to the rendered legend text elements.
   * Only returns attributes that are valid SVG text styling attributes.
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
   * Detects HTML/CSS attributes that should be SVG attributes, and CSS units
   * that don't work well in SVG viewBox coordinates.
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
          message: `<dc-legend>: ${htmlWarning.message}. Found ${attr.name}="${attr.value}"`,
        });
      }

      // Check for CSS units in attributes that should be unitless
      if (attr.name === 'font-size' && CSS_UNIT_PATTERN.test(attr.value)) {
        warnings.push({
          attribute: attr.name,
          value: attr.value,
          message: `<dc-legend>: font-size should be unitless (viewBox units), not CSS units. Found font-size="${attr.value}". Use font-size="${parseFloat(attr.value)}" instead.`,
        });
      }
    }

    return warnings;
  }

  // Don't render anything - the parent chart will render the legend
  protected render() {
    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-legend': ChartLegend;
  }
}
