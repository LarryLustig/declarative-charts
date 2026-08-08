import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resolveDasharray, NAMED_DASH_PATTERNS } from './chart-fill.js';
import type { TitleStyleWarning } from './chart-title.js';

/**
 * Configuration for grid lines derived from a dc-grid element.
 */
export interface GridConfig {
  /** Whether grid lines should be shown */
  show: boolean;
  /** Grid line colour, as an SVG `stroke` value */
  stroke: string;
  /** Resolved SVG `stroke-dasharray` value, ready to emit */
  strokeDasharray: string;
}

/**
 * The `<dc-grid>` element configures grid line appearance for an axis.
 * It should be placed as a child of `<dc-axis>`.
 *
 * Attributes are named for the SVG properties they set - `stroke` and
 * `stroke-dasharray` - matching `<dc-fill>` and the rest of the library.
 *
 * `stroke-dasharray` accepts the same named patterns as `<dc-fill>`
 * (`solid`, `dashed`, `dotted`, `dash-dot`, `long-dash`) or a raw SVG dash
 * list such as `"5 3"`.
 *
 * @example
 * ```html
 * <!-- Show grid with custom styling -->
 * <dc-axis position="left">
 *   <dc-grid stroke="#eee" stroke-dasharray="dashed"></dc-grid>
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
   * Grid line colour. Accepts any CSS colour value.
   *
   * Named `stroke`, not `color`: this draws a line, and SVG spells that
   * `stroke`. `color` would also have implied it could be set from CSS.
   */
  @property({ type: String })
  stroke: string = '#ddd';

  /**
   * Grid line dash pattern.
   *
   * Named `stroke-dasharray` rather than `style`. Every HTML element already
   * has a `style` attribute, so the old name shadowed a global one and put
   * invalid CSS in the DOM - `<dc-grid style="dashed">` is a declaration the
   * browser tries, and fails, to parse.
   */
  @property({ type: String, attribute: 'stroke-dasharray' })
  strokeDasharray: string = 'solid';

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
   *
   * The dasharray is resolved here rather than by the caller. It used to be
   * resolved twice - once in this file and once in `axis-chart.ts` - from two
   * separate copies of the named-pattern table, and only the axis-chart copy
   * was ever reached.
   *
   * @returns GridConfig object
   */
  getGridConfig(): GridConfig {
    return {
      show: !this.hidden,
      stroke: this.stroke,
      strokeDasharray: this.getStrokeDasharray()
    };
  }

  /**
   * Get the stroke-dasharray value for SVG line rendering.
   * @returns Dasharray string for the SVG stroke-dasharray attribute
   */
  getStrokeDasharray(): string {
    return resolveDasharray(this.strokeDasharray) ?? '';
  }

  /**
   * Get style warnings for invalid configurations.
   * @returns Array of warning objects with message and attribute
   */
  getStyleWarnings(): TitleStyleWarning[] {
    const warnings: TitleStyleWarning[] = [];

    const raw = (this.strokeDasharray ?? '').trim().toLowerCase();
    // A dasharray is either one of the named patterns or a raw SVG dash list.
    const isNamed = raw in NAMED_DASH_PATTERNS;
    const isNumeric = /^[\d.]+([\s,]+[\d.]+)*$/.test(raw);
    if (raw && !isNamed && !isNumeric) {
      warnings.push({
        message:
          `[dc-grid] Invalid stroke-dasharray "${this.strokeDasharray}". ` +
          `Use a named pattern (${Object.keys(NAMED_DASH_PATTERNS).join(', ')}) ` +
          `or a dash list such as "5 3".`,
        attribute: 'stroke-dasharray',
        value: this.strokeDasharray
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
