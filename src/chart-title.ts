import { customElement, property } from 'lit/decorators.js';
import { BaseChartElement } from './base-chart-element.js';

/**
 * SVG presentation attributes that can be passed through to the rendered text element.
 * These follow SVG conventions (e.g., 'fill' for text color, unitless font-size).
 */
export const SVG_TEXT_STYLE_ATTRS = new Set([
  'fill',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'text-decoration',
  'letter-spacing',
  'word-spacing',
  'opacity',
]);

/**
 * Common HTML/CSS mistakes and their SVG equivalents.
 */
export const HTML_TO_SVG_WARNINGS: Record<string, { svgAttr: string; message: string }> = {
  'color': {
    svgAttr: 'fill',
    message: 'Use "fill" instead of "color" for SVG text color',
  },
};

/**
 * Patterns that indicate CSS units which don't work well in SVG viewBox coordinates.
 */
const CSS_UNIT_PATTERN = /^[\d.]+\s*(px|em|rem|pt|%)$/i;

export type TitlePosition =
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
 * Warning about incorrect attribute usage on a title element.
 */
export interface TitleStyleWarning {
  /** The attribute name that triggered the warning */
  attribute: string;
  /** The value that was provided */
  value: string;
  /** Human-readable warning message */
  message: string;
}

/**
 * Title element for charts
 *
 * This element renders as an SVG `<text>` element. Style it using SVG presentation
 * attributes (not CSS/HTML attributes):
 *
 * - Use `fill` for text color (not `color`)
 * - Use unitless `font-size` values in viewBox units (not `px`, `em`, `rem`)
 * - Use `font-family`, `font-weight`, `font-style` as normal
 *
 * @element dc-title
 *
 * @attr {string} position - Position of the title: "top" (default), "top-left", "top-right", "left", "bottom", "bottom-left", "bottom-right", "right"
 * @attr {string} fill - Text color (SVG attribute, e.g., "#333", "red")
 * @attr {number} font-size - Font size in viewBox units (e.g., "24", not "24px")
 * @attr {string} font-family - Font family (e.g., "Georgia, serif")
 * @attr {string} font-weight - Font weight (e.g., "bold", "600")
 * @attr {string} font-style - Font style (e.g., "italic")
 *
 * @example
 * <dc-title>My Chart Title</dc-title>
 *
 * @example
 * <dc-title position="top-left">Left-Aligned Title</dc-title>
 *
 * @example
 * <dc-title fill="#1a1a1a" font-size="24" font-family="Georgia, serif">Styled Title</dc-title>
 */
@customElement('dc-title')
export class ChartTitle extends BaseChartElement {
  @property({ type: String })
  position: TitlePosition = 'top';

  get text(): string {
    return this.textContent?.trim() || '';
  }

  /**
   * Get SVG presentation attributes to pass through to the rendered text element.
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
          message: `<dc-title>: ${htmlWarning.message}. Found ${attr.name}="${attr.value}"`,
        });
      }

      // Check for CSS units in attributes that should be unitless
      if (attr.name === 'font-size' && CSS_UNIT_PATTERN.test(attr.value)) {
        warnings.push({
          attribute: attr.name,
          value: attr.value,
          message: `<dc-title>: font-size should be unitless (viewBox units), not CSS units. Found font-size="${attr.value}". Use font-size="${parseFloat(attr.value)}" instead.`,
        });
      }
    }

    return warnings;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-title': ChartTitle;
  }
}
