import { customElement, property } from 'lit/decorators.js';
import { BaseShape } from './base-shape.js';
import { showConditionConverter, type ShowCondition } from './base-chart.js';

/**
 * Individual point element for line charts
 *
 * @element dc-point
 *
 * @attr {number} value - The numeric value for this point
 * @attr {string} label - The label to display below this point (inherited from BaseChartElement)
 * @attr {string} fill - Fill color for this point, overrides line color (SVG standard, inherited from BaseChartElement)
 * @attr {string} color - @deprecated Use fill instead. Optional color for this specific point (inherited from BaseChartElement)
 * @attr {string} href - Optional URL to navigate to when point is clicked (inherited from BaseChartElement)
 * @attr {string} target - Optional target for the link (e.g., "_blank", inherited from BaseChartElement)
 * @attr {boolean} show-value - Whether to display the numeric value for this point (default: true, can be overridden by line-level or chart-level settings)
 * @attr {boolean} show-percent - Whether to display the percentage for this point (inherits from line or chart)
 * @attr {string} shape - Shape of the point: "circle", "square", "triangle", "diamond", "star", "cross", "plus", or a unicode character (default: "circle")
 *
 * @example
 * <dc-point value="25" label="Monday"></dc-point>
 *
 * @example
 * <dc-point value="25" label="Monday" fill="red"></dc-point>
 *
 * @example
 * <dc-point value="25" label="Monday" href="https://example.com/details" target="_blank"></dc-point>
 *
 * @example
 * <dc-point value="25" label="Monday" show-value="false"></dc-point>
 *
 * @example
 * <dc-point value="25" label="Monday" shape="triangle"></dc-point>
 *
 * @example
 * <dc-point value="25" label="Monday" shape="★"></dc-point>
 */
@customElement('dc-point')
export class ChartPoint extends BaseShape {
  @property({ type: Number })
  value = 0;

  @property({ attribute: 'show-value', converter: showConditionConverter })
  showValue: ShowCondition = true;

  @property({ attribute: 'show-percent', converter: showConditionConverter })
  showPercent?: ShowCondition;

  @property({ type: String })
  shape = 'circle';
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-point': ChartPoint;
  }
}
