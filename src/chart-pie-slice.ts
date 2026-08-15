import { customElement, property } from 'lit/decorators.js';
import { BaseFilledShape } from './base-filled-shape.js';

/**
 * Individual slice element for pie charts
 *
 * Supports attribute passthrough for integration with htmx and other libraries.
 * Any attributes not explicitly defined (like hx-get, hx-target, data-*, etc.)
 * will be passed through to the rendered SVG element.
 *
 * @element dc-pie-slice
 *
 * @attr {number} value - The numeric value for this slice
 * @attr {string} label - The label for this slice (inherited from BaseChartElement)
 * @attr {string} fill - Fill color for this slice (SVG standard, inherited from BaseChartElement)
 * @attr {boolean|string} show-value - Whether to show the value on this slice (inherits from chart). Can be true/false or a threshold like "5%" or "100"
 * @attr {boolean|string} show-label - Whether to show the label on this slice (inherits from chart). Can be true/false or a threshold like "5%" or "100"
 * @attr {boolean|string} show-percent - Whether to show the percentage on this slice (inherits from chart). Can be true/false or a threshold like "5%" or "100"
 * @attr {string} legend-href - Makes this slice's legend entry a link to the given URL
 * @attr {string} legend-target - Link target for `legend-href` (e.g. "_blank")
 *
 * @example
 * <dc-pie-slice value="30" label="Category A"></dc-pie-slice>
 *
 * @example
 * <dc-pie-slice value="45" label="Category B" fill="#FF5722"></dc-pie-slice>
 *
 * @example
 * <!-- With htmx attributes -->
 * <dc-pie-slice value="45" label="Category B" color="#FF5722"
 *               hx-get="/api/category/b"
 *               hx-target="#details"
 *               hx-swap="innerHTML"></dc-pie-slice>
 *
 * @example
 * <!-- Override chart defaults for this slice -->
 * <dc-pie-slice value="45" label="Category B" show-value="false" show-percent="true"></dc-pie-slice>
 *
 * @example
 * <!-- Show label only for slices >= 5% of total -->
 * <dc-pie-slice value="45" label="Category B" show-label="5%"></dc-pie-slice>
 */
@customElement('dc-pie-slice')
export class ChartPieSlice extends BaseFilledShape {
  // value and showLabel are inherited from BaseFilledShape
  // showValue and showPercent are inherited from BaseChartElement

  /**
   * Makes this slice's legend entry a link to the given URL.
   *
   * Deliberately separate from `href`: a chart whose marks link somewhere did
   * not thereby ask its legend to navigate too, and the two often want
   * different destinations. Set it to opt in.
   */
  @property({ type: String, attribute: 'legend-href' })
  legendHref?: string;

  /** Link target for {@link legendHref}, as on any other element with an `href`. */
  @property({ type: String, attribute: 'legend-target' })
  legendTarget?: string;

}

declare global {
  interface HTMLElementTagNameMap {
    'dc-pie-slice': ChartPieSlice;
  }
}
