import { LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Color definition element for use within <dc-palette>.
 *
 * Defines a fill and/or stroke color that can be matched by label or value range.
 * When a chart uses a palette, elements are colored by matching their label or value
 * against the palette's color definitions.
 *
 * @element dc-color
 *
 * @attr {string} label - Label to match (exact string match)
 * @attr {number} value - Exact value to match (shorthand for min-value and max-value being equal)
 * @attr {number} min-value - Minimum value for range matching (inclusive)
 * @attr {number} max-value - Maximum value for range matching (inclusive)
 * @attr {string} fill - Fill color for matched elements (SVG attribute)
 * @attr {string} stroke - Stroke color for matched elements (SVG attribute)
 *
 * @example
 * <!-- Match by label -->
 * <dc-color label="Revenue" fill="#2563eb" stroke="#1e40af"></dc-color>
 *
 * @example
 * <!-- Match by exact value -->
 * <dc-color value="100" fill="#fbbf24"></dc-color>
 *
 * @example
 * <!-- Match by value range (danger threshold) -->
 * <dc-color max-value="20" fill="#dc2626"></dc-color>
 *
 * @example
 * <!-- Match high values -->
 * <dc-color min-value="80" fill="#16a34a"></dc-color>
 *
 * @example
 * <!-- Match a specific range -->
 * <dc-color min-value="50" max-value="80" fill="#fef3c7"></dc-color>
 */
@customElement('dc-color')
export class ChartColor extends LitElement {
  /**
   * Label to match. If specified, elements with this exact label will use this color.
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

  /**
   * Fill color for matched elements. Uses SVG color format.
   */
  @property({ type: String })
  fill?: string;

  /**
   * Stroke color for matched elements. Uses SVG color format.
   */
  @property({ type: String })
  stroke?: string;

  static styles = css`
    :host {
      display: none !important;
    }
  `;

  /**
   * Check if a value matches this color definition's value range.
   * @param value The numeric value to check
   * @returns true if the value falls within this color's range
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
   * Check if a label matches this color definition.
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
    'dc-color': ChartColor;
  }
}
