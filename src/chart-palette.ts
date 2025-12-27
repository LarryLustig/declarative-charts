import { LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ChartFill } from './chart-fill.js';
import type { PatternConfig } from './patterns.js';

/**
 * Result of a palette color lookup.
 */
export interface PaletteColorResult {
  fill?: string;
  stroke?: string;
  /** Pattern configuration if a pattern was matched */
  pattern?: PatternConfig;
}

/**
 * Palette definition element for defining reusable color schemes.
 *
 * A palette is a container for `<dc-fill>` elements that define how chart
 * elements should be filled. Charts can reference a palette by its ID using
 * the `palette` attribute, and elements will be styled by matching their
 * label or value against the palette's fill definitions.
 *
 * **Matching Priority (first match wins):**
 * 1. Element's own fill/stroke/pattern attributes (explicit override)
 * 2. Palette match by value range (min-value/max-value or exact value)
 * 3. Palette match by label (exact string match)
 * 4. Chart's default color sequence
 *
 * Within value/label matching, pattern fills take precedence over solid fills.
 *
 * @element dc-palette
 *
 * @attr {string} id - Unique identifier for this palette (standard HTML id attribute)
 * @attr {boolean} high-contrast - Marks this as a high-contrast palette
 *
 * @slot - Contains `<dc-fill>` elements defining the palette fills
 *
 * @example
 * <!-- Define a palette with solid fills -->
 * <dc-palette id="brand-colors">
 *   <dc-fill label="Revenue" fill="#2563eb"></dc-fill>
 *   <dc-fill label="Expenses" fill="#dc2626"></dc-fill>
 *   <dc-fill label="Profit" fill="#16a34a"></dc-fill>
 * </dc-palette>
 *
 * @example
 * <!-- Mix solid and pattern fills -->
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
 *   <dc-fill min-value="30" max-value="70" fill="#fef3c7"></dc-fill>
 *   <dc-fill min-value="70" fill="#dcfce7"></dc-fill>
 * </dc-palette>
 */
@customElement('dc-palette')
export class ChartPalette extends LitElement {
  /**
   * Marks this palette as a high-contrast palette.
   *
   * When a chart is in high contrast mode (either explicitly via `high-contrast`
   * attribute or via OS `prefers-contrast: high` setting), it will look for a
   * child `<dc-palette high-contrast>` to use instead of the built-in high
   * contrast colors.
   *
   * @attr high-contrast
   */
  @property({ type: Boolean, attribute: 'high-contrast' })
  highContrast = false;

  static styles = css`
    :host {
      display: none !important;
    }
  `;

  /**
   * Get all fill definitions in this palette.
   * @returns Array of ChartFill elements in DOM order
   */
  getFills(): ChartFill[] {
    return Array.from(this.querySelectorAll('dc-fill')) as ChartFill[];
  }

  /**
   * Look up fill styling for an element based on its label and/or value.
   *
   * Matching priority (first match wins):
   * 1. dc-fill with pattern + value match
   * 2. dc-fill with pattern + label match
   * 3. dc-fill (solid) + value match
   * 4. dc-fill (solid) + label match
   *
   * @param label The element's label (optional)
   * @param value The element's value (optional)
   * @returns Object with fill, stroke, and/or pattern, or empty object if no match
   */
  lookup(label?: string, value?: number): PaletteColorResult {
    const fills = this.getFills();

    // Check dc-fill with pattern + value match
    if (value !== undefined) {
      for (const fill of fills) {
        if (fill.hasPattern() && fill.matchesValue(value)) {
          return {
            fill: fill.fill,
            stroke: fill.stroke,
            pattern: {
              type: fill.pattern!,
              stroke: fill.stroke || '#000',
              fill: fill.fill,
              scale: fill.scale
            }
          };
        }
      }
    }

    // Check dc-fill with pattern + label match
    if (label !== undefined) {
      for (const fill of fills) {
        if (fill.hasPattern() && fill.matchesLabel(label)) {
          return {
            fill: fill.fill,
            stroke: fill.stroke,
            pattern: {
              type: fill.pattern!,
              stroke: fill.stroke || '#000',
              fill: fill.fill,
              scale: fill.scale
            }
          };
        }
      }
    }

    // Check dc-fill (solid) + value match
    if (value !== undefined) {
      for (const fill of fills) {
        if (!fill.hasPattern() && fill.matchesValue(value)) {
          return {
            fill: fill.fill,
            stroke: fill.stroke
          };
        }
      }
    }

    // Check dc-fill (solid) + label match
    if (label !== undefined) {
      for (const fill of fills) {
        if (!fill.hasPattern() && fill.matchesLabel(label)) {
          return {
            fill: fill.fill,
            stroke: fill.stroke
          };
        }
      }
    }

    // No match found
    return {};
  }

  /**
   * Check if this palette has any fill definitions.
   * @returns true if the palette contains at least one dc-fill element
   */
  hasFills(): boolean {
    return this.querySelectorAll('dc-fill').length > 0;
  }

  /**
   * Get all fill colors from this palette.
   * Useful for getting colors to use in high-contrast mode.
   * @returns Array of fill color strings (undefined entries filtered out)
   */
  getFillColors(): string[] {
    return this.getFills()
      .map(f => f.fill)
      .filter((f): f is string => f !== undefined);
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
