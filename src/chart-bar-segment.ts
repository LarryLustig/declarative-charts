import { customElement, property } from 'lit/decorators.js';
import { BaseShape } from './base-shape.js';
import { showConditionConverter, type ShowCondition } from './base-chart.js';

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
export class ChartBarSegment extends BaseShape {
  @property({ type: Number })
  value = 0;

  @property({ attribute: 'show-value', converter: showConditionConverter })
  showValue?: ShowCondition;

  @property({ attribute: 'show-percent', converter: showConditionConverter })
  showPercent?: ShowCondition;
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-bar-segment': ChartBarSegment;
  }
}
