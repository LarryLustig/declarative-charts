import { LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { PatternType, isPatternType } from './patterns.js';

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
 * @attr {string} stroke - Stroke color (solid stroke, or pattern element color)
 * @attr {PatternType} pattern - Pattern type (if set, creates a pattern fill)
 * @attr {number} scale - Pattern size multiplier (default: 1, only applies with pattern)
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
   */
  @property({ type: Number })
  scale?: number;

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
