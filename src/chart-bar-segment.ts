import { customElement, property } from 'lit/decorators.js';
import { BaseFilledShape } from './base-filled-shape.js';

/**
 * Segment element for segmented/stacked bars within a dc-bar
 *
 * Used inside a dc-bar to break a bar into multiple colored segments.
 * Each segment represents a portion of the total bar value.
 *
 * Colors are automatically assigned based on the segment's label attribute.
 * All segments with the same label across all bars in the chart will have
 * the same color, ensuring visual consistency.
 *
 * Supports attribute passthrough for integration with htmx and other libraries.
 *
 * @element dc-bar-segment
 *
 * @attr {number} value - The numeric value for this segment (required)
 * @attr {string} label - Label for this segment (required). Used for legend, tooltips, and color assignment.
 *                        All segments with the same label get the same auto-generated color.
 * @attr {boolean} show-value - Whether to display the numeric value on the segment (inherited from parent bar if not specified)
 * @attr {boolean} show-percent - Whether to display the percentage on the segment (inherited from parent bar if not specified)
 * @attr {string} href - Optional URL to navigate to when segment is clicked
 * @attr {string} target - Optional target for the link (e.g., "_blank")
 * @attr {string} legend-href - Makes this segment's legend entry a link to the given URL
 * @attr {string} legend-target - Link target for `legend-href` (e.g. "_blank")
 *
 * @example
 * <dc-bar label="Q1 Sales">
 *   <dc-bar-segment value="100" label="Product A"></dc-bar-segment>
 *   <dc-bar-segment value="75" label="Product B"></dc-bar-segment>
 *   <dc-bar-segment value="50" label="Product C"></dc-bar-segment>
 * </dc-bar>
 * <dc-bar label="Q2 Sales">
 *   <!-- Same labels as Q1, will get the same colors automatically -->
 *   <dc-bar-segment value="120" label="Product A"></dc-bar-segment>
 *   <dc-bar-segment value="90" label="Product B"></dc-bar-segment>
 *   <dc-bar-segment value="60" label="Product C"></dc-bar-segment>
 * </dc-bar>
 *
 * @example
 * <!-- With show-value override -->
 * <dc-bar label="Revenue" show-value="false">
 *   <dc-bar-segment value="500" label="Online" show-value="true"></dc-bar-segment>
 *   <dc-bar-segment value="300" label="In-Store"></dc-bar-segment>
 * </dc-bar>
 */
@customElement('dc-bar-segment')
export class ChartBarSegment extends BaseFilledShape {
  // value is inherited from BaseFilledShape
  // showValue and showPercent are inherited from BaseChartElement

  /**
   * Makes this segment's legend entry a link to the given URL.
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
    'dc-bar-segment': ChartBarSegment;
  }
}
