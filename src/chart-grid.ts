import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Grid line style options.
 */
export type GridLineStyle = 'solid' | 'dashed' | 'dotted';

/**
 * Configuration for grid lines derived from a dc-grid element.
 */
export interface GridConfig {
  /** Whether grid lines should be shown */
  show: boolean;
  /** Grid line color */
  color: string;
  /** Grid line style */
  lineStyle: GridLineStyle;
}

/**
 * The `<dc-grid>` element configures grid line appearance for an axis.
 * It should be placed as a child of `<dc-axis>`.
 *
 * @example
 * ```html
 * <!-- Show grid with custom styling -->
 * <dc-axis position="left">
 *   <dc-grid color="#eee" style="dashed"></dc-grid>
 * </dc-axis>
 *
 * <!-- No grid (omit element) -->
 * <dc-axis position="left"></dc-axis>
 *
 * <!-- Default grid (element with no attrs) -->
 * <dc-axis position="left">
 *   <dc-grid></dc-grid>
 * </dc-axis>
 *
 * <!-- Explicitly hide grid -->
 * <dc-axis position="left">
 *   <dc-grid hidden></dc-grid>
 * </dc-axis>
 * ```
 */
@customElement('dc-grid')
export class ChartGrid extends LitElement {
  /**
   * Grid line color.
   * Accepts any CSS color value.
   */
  @property({ type: String })
  color: string = '#ddd';

  /**
   * Grid line style.
   * Options: 'solid', 'dashed', 'dotted'.
   */
  @property({ type: String, attribute: 'style' })
  lineStyle: GridLineStyle = 'solid';

  /**
   * Standard HTML hidden attribute.
   * When true, grid lines are not rendered.
   */
  @property({ type: Boolean, reflect: true })
  override hidden: boolean = false;

  /**
   * Don't use shadow DOM - allow parent to query this element.
   */
  protected override createRenderRoot() {
    return this;
  }

  /**
   * Get the grid configuration from this element's properties.
   * @returns GridConfig object
   */
  getGridConfig(): GridConfig {
    return {
      show: !this.hidden,
      color: this.color,
      lineStyle: this.lineStyle
    };
  }

  /**
   * Get the stroke-dasharray value for SVG line rendering.
   * @returns Dasharray string for SVG stroke-dasharray attribute
   */
  getStrokeDasharray(): string {
    switch (this.lineStyle) {
      case 'dashed':
        return '5,5';
      case 'dotted':
        return '2,4';
      case 'solid':
      default:
        return '';
    }
  }

  /**
   * Get style warnings for invalid configurations.
   * @returns Array of warning objects with message and attribute
   */
  getStyleWarnings(): Array<{ message: string; attribute: string }> {
    const warnings: Array<{ message: string; attribute: string }> = [];

    // Validate lineStyle
    const validStyles: GridLineStyle[] = ['solid', 'dashed', 'dotted'];
    if (!validStyles.includes(this.lineStyle)) {
      warnings.push({
        message: `[dc-grid] Invalid style "${this.lineStyle}". Use "solid", "dashed", or "dotted".`,
        attribute: 'style'
      });
    }

    return warnings;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-grid': ChartGrid;
  }
}
