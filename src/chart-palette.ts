import { LitElement, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { ChartColor } from './chart-color.js';

/**
 * Result of a palette color lookup.
 */
export interface PaletteColorResult {
  fill?: string;
  stroke?: string;
}

/**
 * Palette definition element for defining reusable color schemes.
 *
 * A palette is a container for <dc-color> elements that define colors for
 * chart elements. Charts can reference a palette by its ID using the `palette`
 * attribute, and elements will be colored by matching their label or value
 * against the palette's color definitions.
 *
 * **Matching Priority (first match wins):**
 * 1. Element's own fill/stroke attributes (explicit override)
 * 2. Palette match by value range (min-value/max-value or exact value)
 * 3. Palette match by label (exact string match)
 * 4. Chart's default color sequence
 *
 * When multiple <dc-color> elements could match (e.g., overlapping value ranges),
 * the first match in DOM order wins.
 *
 * @element dc-palette
 *
 * @attr {string} id - Unique identifier for this palette (standard HTML id attribute)
 *
 * @slot - Contains <dc-color> elements defining the palette colors
 *
 * @example
 * <!-- Define a palette with label-based colors -->
 * <dc-palette id="brand-colors">
 *   <dc-color label="Revenue" fill="#2563eb" stroke="#1e40af"></dc-color>
 *   <dc-color label="Expenses" fill="#dc2626"></dc-color>
 *   <dc-color label="Profit" fill="#16a34a"></dc-color>
 * </dc-palette>
 *
 * <!-- Use in a chart -->
 * <dc-chart palette="brand-colors">
 *   <dc-bar label="Revenue" value="100"></dc-bar>
 *   <dc-bar label="Expenses" value="60"></dc-bar>
 *   <dc-bar label="Profit" value="40"></dc-bar>
 * </dc-chart>
 *
 * @example
 * <!-- Define a palette with value-range colors for thresholds -->
 * <dc-palette id="performance">
 *   <dc-color max-value="50" fill="#fee2e2"></dc-color>
 *   <dc-color min-value="50" max-value="80" fill="#fef3c7"></dc-color>
 *   <dc-color min-value="80" fill="#dcfce7"></dc-color>
 * </dc-palette>
 *
 * @example
 * <!-- Combine label and value-range matching -->
 * <dc-palette id="sales-with-alerts">
 *   <!-- Default colors by category -->
 *   <dc-color label="Sales" fill="#2563eb"></dc-color>
 *   <dc-color label="Returns" fill="#6b7280"></dc-color>
 *   <!-- Override: anything below 20 is danger, regardless of label -->
 *   <dc-color max-value="20" fill="#dc2626"></dc-color>
 * </dc-palette>
 */
@customElement('dc-palette')
export class ChartPalette extends LitElement {
  static styles = css`
    :host {
      display: none !important;
    }
  `;

  /**
   * Get all color definitions in this palette.
   * @returns Array of ChartColor elements in DOM order
   */
  getColors(): ChartColor[] {
    return Array.from(this.querySelectorAll('dc-color')) as ChartColor[];
  }

  /**
   * Look up colors for an element based on its label and/or value.
   *
   * Matching priority (first match wins):
   * 1. Value range match (min-value/max-value or exact value)
   * 2. Label match (exact string match)
   *
   * @param label The element's label (optional)
   * @param value The element's value (optional)
   * @returns Object with fill and/or stroke colors, or empty object if no match
   */
  lookup(label?: string, value?: number): PaletteColorResult {
    const colors = this.getColors();

    // First pass: check value matches (higher priority)
    if (value !== undefined) {
      for (const color of colors) {
        if (color.matchesValue(value)) {
          return {
            fill: color.fill,
            stroke: color.stroke
          };
        }
      }
    }

    // Second pass: check label matches
    if (label !== undefined) {
      for (const color of colors) {
        if (color.matchesLabel(label)) {
          return {
            fill: color.fill,
            stroke: color.stroke
          };
        }
      }
    }

    // No match found
    return {};
  }

  /**
   * Check if this palette has any color definitions.
   * @returns true if the palette contains at least one dc-color element
   */
  hasColors(): boolean {
    return this.querySelectorAll('dc-color').length > 0;
  }

  // No visual rendering - this is a data container
  render() {
    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-palette': ChartPalette;
  }
}
