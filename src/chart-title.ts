import { customElement, property } from 'lit/decorators.js';
import { svg, SVGTemplateResult } from 'lit';
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

  // ============================================================================
  // SVG Generation
  // ============================================================================

  /** Default font size used when none is specified */
  static readonly DEFAULT_FONT_SIZE = 20;

  /**
   * Get the effective font size for this title.
   * @returns Font size in viewBox units
   */
  getFontSize(): number {
    const svgStyles = this.getSvgStyleAttributes();
    if (svgStyles['font-size']) {
      const parsed = parseFloat(svgStyles['font-size']);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return ChartTitle.DEFAULT_FONT_SIZE;
  }

  /**
   * Measure text width using Canvas API.
   * @param text Text to measure
   * @param fontSize Font size in pixels
   * @param fontFamily Optional font family
   * @returns Width in pixels
   */
  private measureText(text: string, fontSize: number, fontFamily?: string): number {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Fallback estimation
      return text.length * fontSize * 0.6;
    }
    ctx.font = `${fontSize}px ${fontFamily || 'sans-serif'}`;
    return ctx.measureText(text).width;
  }

  /**
   * Get the dimensions of this title element.
   * Returns the space the title will occupy (width and height).
   *
   * @returns Object with width and height in viewBox units
   */
  getDimensions(): { width: number; height: number } {
    const text = this.text;
    if (!text) {
      return { width: 0, height: 0 };
    }

    const fontSize = this.getFontSize();
    const svgStyles = this.getSvgStyleAttributes();
    const fontFamily = svgStyles['font-family'];

    const textWidth = this.measureText(text, fontSize, fontFamily);
    const textHeight = fontSize * 1.2; // Line height approximation

    return {
      width: textWidth,
      height: textHeight
    };
  }

  /**
   * Generate SVG for this title, rendered at origin (0,0).
   *
   * The title is rendered as a simple horizontal text element at (0, baseline).
   * The caller (BaseChart) is responsible for:
   * - Positioning the title using <g transform="translate(x, y)">
   * - Rotating for left/right positions using transform="rotate(...)"
   * - Determining text-anchor based on position variant (left, center, right)
   *
   * @param textAnchor How to anchor the text: 'start', 'middle', or 'end'
   * @returns Object with width, height, and SVG template
   */
  generateSvg(textAnchor: 'start' | 'middle' | 'end' = 'middle'): {
    width: number;
    height: number;
    svg: SVGTemplateResult;
  } {
    const text = this.text;
    if (!text) {
      return { width: 0, height: 0, svg: svg`` };
    }

    const fontSize = this.getFontSize();
    const svgStyles = this.getSvgStyleAttributes();
    const dimensions = this.getDimensions();

    // Extract styles with defaults
    const fill = svgStyles['fill'] || '#333';
    const fontFamily = svgStyles['font-family'] || '';
    const fontWeight = svgStyles['font-weight'] || 'bold';
    const fontStyle = svgStyles['font-style'] || '';
    const textDecoration = svgStyles['text-decoration'] || '';
    const letterSpacing = svgStyles['letter-spacing'] || '';
    const opacity = svgStyles['opacity'] || '';

    // Calculate x position based on text-anchor
    // For 'start': x = 0 (text extends to the right)
    // For 'middle': x = width/2 (text centered)
    // For 'end': x = width (text extends to the left)
    let x = 0;
    if (textAnchor === 'middle') {
      x = dimensions.width / 2;
    } else if (textAnchor === 'end') {
      x = dimensions.width;
    }

    // Y position: baseline is at fontSize * 0.8 (approximate)
    const y = fontSize * 0.8;

    return {
      width: dimensions.width,
      height: dimensions.height,
      svg: svg`
        <text
          part="title"
          x="${x}"
          y="${y}"
          text-anchor="${textAnchor}"
          font-size="${fontSize}"
          font-weight="${fontWeight}"
          fill="${fill}"
          font-family="${fontFamily}"
          font-style="${fontStyle}"
          text-decoration="${textDecoration}"
          letter-spacing="${letterSpacing}"
          opacity="${opacity}"
        >${text}</text>
      `
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-title': ChartTitle;
  }
}
