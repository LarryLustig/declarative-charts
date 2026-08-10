import { LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { PatternType, isPatternType } from './patterns.js';

/**
 * SVG stroke-linecap values
 */
export type StrokeLinecap = 'butt' | 'round' | 'square';

/**
 * SVG stroke-linejoin values
 */
export type StrokeLinejoin = 'miter' | 'round' | 'bevel';

/**
 * SVG fill-rule values
 */
export type FillRule = 'nonzero' | 'evenodd';

/**
 * Named stroke dash patterns for convenience
 */
export const NAMED_DASH_PATTERNS: Record<string, string> = {
  'solid': 'none',
  'dashed': '5 5',
  'dotted': '1 3',
  'dash-dot': '5 3 1 3',
  'long-dash': '10 5',
};

/**
 * Resolve a stroke-dasharray value, converting named patterns to numeric values.
 */
export function resolveDasharray(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  return NAMED_DASH_PATTERNS[trimmed] ?? value;
}

/**
 * Fill definition element for specifying how chart elements should be filled.
 *
 * This unified element handles both solid fills and pattern fills:
 * - **Solid fill**: Set `fill` (and optionally `stroke`) without `pattern`
 * - **Pattern fill**: Set `pattern` to a pattern type, with `fill` as background
 *   and `stroke` as the pattern element color
 *
 * Can be used:
 * 1. Inside `<dc-palette>` for label/value-based matching
 * 2. Standalone with an ID, referenced by elements (for patterns)
 *
 * ## Stroke Attribute Semantics
 *
 * The `stroke` attribute has different meanings depending on context:
 * - **Solid fills**: The stroke/border color of the chart element
 * - **Pattern fills**: The color of pattern elements (lines, dots, or squares)
 *
 * For line-based patterns (diagonal-lines, crosshatch, grid, etc.), `stroke` is
 * the SVG stroke color of the lines. For shape-based patterns (dots, checkerboard),
 * `stroke` is used as the fill color of the shapes.
 *
 * @element dc-fill
 *
 * @attr {string} fill - Fill color (solid fill, or pattern background)
 * @attr {number} fill-opacity - Fill opacity (0-1)
 * @attr {FillRule} fill-rule - Fill rule: "nonzero" or "evenodd"
 * @attr {string} stroke - Stroke color (solid stroke, or pattern element color)
 * @attr {number} stroke-width - Stroke width in pixels
 * @attr {number} stroke-opacity - Stroke opacity (0-1)
 * @attr {string} stroke-dasharray - Dash pattern: numeric (e.g., "5 3") or named ("dashed", "dotted", "solid", "dash-dot", "long-dash")
 * @attr {number} stroke-dashoffset - Dash pattern offset
 * @attr {StrokeLinecap} stroke-linecap - Line cap style: "butt", "round", "square"
 * @attr {StrokeLinejoin} stroke-linejoin - Line join style: "miter", "round", "bevel"
 * @attr {number} stroke-miterlimit - Miter limit for stroke-linejoin="miter"
 * @attr {PatternType} pattern - Pattern type (if set, creates a pattern fill)
 * @attr {number} pattern-scale - Pattern size multiplier (default: 1, only applies with pattern)
 * @attr {string} label - Label to match (for use in palettes)
 * @attr {number} value - Exact value to match (shorthand for min-value and max-value)
 * @attr {number} min-value - Minimum value for range matching (inclusive)
 * @attr {number} max-value - Maximum value for range matching (inclusive)
 *
 * @example
 * <!-- Solid fill matched by label -->
 * <dc-palette id="brand">
 *   <dc-fill label="Revenue" fill="#2563eb"></dc-fill>
 *   <dc-fill label="Expenses" fill="#dc2626"></dc-fill>
 * </dc-palette>
 *
 * @example
 * <!-- Pattern fill matched by label -->
 * <dc-palette id="status">
 *   <dc-fill label="Critical" fill="#fee2e2" stroke="#dc2626" pattern="crosshatch"></dc-fill>
 *   <dc-fill label="Warning" fill="#fef3c7" stroke="#f59e0b" pattern="diagonal-lines"></dc-fill>
 *   <dc-fill label="OK" fill="#10b981"></dc-fill>
 * </dc-palette>
 *
 * @example
 * <!-- Value-based thresholds -->
 * <dc-palette id="thresholds">
 *   <dc-fill max-value="30" fill="#fee2e2" stroke="#dc2626" pattern="crosshatch"></dc-fill>
 *   <dc-fill min-value="30" max-value="70" fill="#fef3c7" stroke="#f59e0b" pattern="diagonal-lines"></dc-fill>
 *   <dc-fill min-value="70" fill="#dcfce7"></dc-fill>
 * </dc-palette>
 *
 * @example
 * <!-- Standalone pattern referenced by ID -->
 * <dc-fill id="danger" fill="#fee2e2" stroke="#dc2626" pattern="crosshatch"></dc-fill>
 * <dc-bar value="25" pattern="danger"></dc-bar>
 */
@customElement('dc-fill')
export class ChartFill extends LitElement {
  /**
   * Fill color for the element.
   *
   * For solid fills, this is the main fill color.
   * For pattern fills, this is the background color behind the pattern.
   */
  @property({ type: String })
  fill?: string;

  /**
   * Fill opacity (0-1).
   */
  @property({ type: Number, attribute: 'fill-opacity' })
  fillOpacity?: number;

  /**
   * Fill rule for complex paths: "nonzero" or "evenodd".
   */
  @property({ type: String, attribute: 'fill-rule' })
  fillRule?: FillRule;

  /**
   * Stroke color for the element.
   *
   * For solid fills, this is the stroke/border color.
   * For pattern fills, this is the color of the pattern elements:
   * - Line patterns: stroke color of the lines
   * - Dot/checkerboard patterns: fill color of the shapes
   *
   * If not specified for patterns, a contrasting color will be auto-calculated.
   */
  @property({ type: String })
  stroke?: string;

  /**
   * Stroke width in pixels.
   */
  @property({ type: Number, attribute: 'stroke-width' })
  strokeWidth?: number;

  /**
   * Stroke opacity (0-1).
   */
  @property({ type: Number, attribute: 'stroke-opacity' })
  strokeOpacity?: number;

  /**
   * Stroke dash pattern.
   * Can be a numeric pattern (e.g., "5 3") or a named pattern:
   * - "solid" - no dashes
   * - "dashed" - standard dashes (5 5)
   * - "dotted" - dots (1 3)
   * - "dash-dot" - dash-dot pattern (5 3 1 3)
   * - "long-dash" - long dashes (10 5)
   */
  @property({ type: String, attribute: 'stroke-dasharray' })
  strokeDasharray?: string;

  /**
   * Stroke dash offset for animating or adjusting dash patterns.
   */
  @property({ type: Number, attribute: 'stroke-dashoffset' })
  strokeDashoffset?: number;

  /**
   * Stroke line cap style: "butt", "round", or "square".
   */
  @property({ type: String, attribute: 'stroke-linecap' })
  strokeLinecap?: StrokeLinecap;

  /**
   * Stroke line join style: "miter", "round", or "bevel".
   */
  @property({ type: String, attribute: 'stroke-linejoin' })
  strokeLinejoin?: StrokeLinejoin;

  /**
   * Miter limit for stroke-linejoin="miter".
   */
  @property({ type: Number, attribute: 'stroke-miterlimit' })
  strokeMiterlimit?: number;

  /**
   * Pattern type to apply.
   *
   * If set, the fill becomes a pattern with `fill` as background and `stroke`
   * as the pattern element color.
   *
   * Available patterns: diagonal-lines, diagonal-lines-reverse, horizontal-lines,
   * vertical-lines, dots, crosshatch, grid, checkerboard
   */
  @property({ type: String })
  pattern?: PatternType;

  /**
   * Size multiplier for the pattern. Default is 1.
   * Only applies when `pattern` is set.
   *
   * Larger values create bigger pattern elements.
   *
   * Named `pattern-scale`, matching the attribute of the same meaning on
   * shapes. It was `scale` here and `pattern-scale` there - one concept, two
   * names, on elements routinely written next to each other. Bare `scale` also
   * suggested it scaled the fill rather than only the pattern inside it.
   */
  @property({ type: Number, attribute: 'pattern-scale' })
  patternScale?: number;

  /**
   * Label to match. If specified, elements with this exact label will use this fill.
   */
  @property({ type: String })
  label?: string;

  /**
   * Exact value to match. Shorthand for setting both min-value and max-value to the same number.
   */
  @property({ type: Number })
  value?: number;

  /**
   * Minimum value for range matching (inclusive).
   * If not specified, range extends to negative infinity.
   */
  @property({ type: Number, attribute: 'min-value' })
  minValue?: number;

  /**
   * Maximum value for range matching (inclusive).
   * If not specified, range extends to positive infinity.
   */
  @property({ type: Number, attribute: 'max-value' })
  maxValue?: number;

  static styles = css`
    :host {
      display: none !important;
    }
  `;

  /**
   * Check if this fill definition has a valid pattern.
   * @returns true if pattern is set and is a valid PatternType
   */
  hasPattern(): boolean {
    return this.pattern !== undefined && isPatternType(this.pattern);
  }

  /**
   * Get the resolved stroke-dasharray value.
   * Converts named patterns (e.g., "dashed") to numeric values.
   * @returns The resolved dasharray value, or undefined if not set
   */
  getResolvedDasharray(): string | undefined {
    return resolveDasharray(this.strokeDasharray);
  }

  /**
   * The SVG paint attributes this fill sets, ready to stamp onto a shape.
   *
   * Only attributes actually present are returned, so a fill that sets nothing
   * paints nothing and cannot override an element's own styling by accident.
   *
   * These nine were declared and documented from the start and read by nothing:
   * a `<dc-fill stroke-width="4">` in a palette parsed, matched, and changed no
   * pixel. `fill` and `stroke` are deliberately absent - the colour resolver
   * already owns those, and returning them here would fight it.
   */
  getPaintAttributes(): Record<string, string> {
    const attrs: Record<string, string> = {};
    const set = (name: string, value: string | number | undefined) => {
      if (value !== undefined && value !== null && `${value}` !== '') {
        attrs[name] = String(value);
      }
    };

    set('fill-opacity', this.fillOpacity);
    set('fill-rule', this.fillRule);
    set('stroke-width', this.strokeWidth);
    set('stroke-opacity', this.strokeOpacity);
    set('stroke-dasharray', this.getResolvedDasharray());
    set('stroke-dashoffset', this.strokeDashoffset);
    set('stroke-linecap', this.strokeLinecap);
    set('stroke-linejoin', this.strokeLinejoin);
    set('stroke-miterlimit', this.strokeMiterlimit);

    return attrs;
  }

  /**
   * Check if a value matches this fill definition's value range.
   * @param value The numeric value to check
   * @returns true if the value falls within this fill's range
   */
  matchesValue(value: number): boolean {
    // If exact value is set, use it as both min and max
    const min = this.value !== undefined ? this.value : this.minValue;
    const max = this.value !== undefined ? this.value : this.maxValue;

    // Check if value falls within range
    if (min !== undefined && value < min) {
      return false;
    }
    if (max !== undefined && value > max) {
      return false;
    }

    // If no range constraints, this only matches if there's a label requirement
    // (value matching requires at least one bound)
    if (min === undefined && max === undefined) {
      return false;
    }

    return true;
  }

  /**
   * Check if a label matches this fill definition.
   * @param label The label to check
   * @returns true if the label matches exactly
   */
  matchesLabel(label: string): boolean {
    return this.label !== undefined && this.label === label;
  }

  // No visual rendering - this is a data container
  render() {
    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-fill': ChartFill;
  }
}
