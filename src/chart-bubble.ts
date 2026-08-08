import { customElement, property } from 'lit/decorators.js';
import { BaseFilledShape } from './base-filled-shape.js';
import { showConditionConverter, type ShowCondition } from './base-chart.js';  // for showValue override

/**
 * Individual bubble element for bubble charts
 *
 * @element dc-bubble
 *
 * @attr {number} value - The numeric Y-axis value for this bubble
 * @attr {number} size-value - The size value for this bubble (used for area-based scaling)
 * @attr {string} label - The label for this bubble (used as X-axis category, inherited from BaseChartElement)
 * @attr {string} fill - Fill color for this bubble (SVG standard, inherited from BaseChartElement)
 * @attr {string} stroke - Stroke color for this bubble (SVG standard, inherited from BaseChartElement)
 * @attr {string} href - Optional URL to navigate to when bubble is clicked (inherited from BaseChartElement)
 * @attr {string} target - Optional target for the link (e.g., "_blank", inherited from BaseChartElement)
 * @attr {boolean} show-value - Whether to display the numeric value for this bubble (default: true)
 * @attr {boolean} show-percent - Whether to display the percentage for this bubble (inherits from chart)
 *
 * @example
 * <dc-bubble label="Q1" value="30" size-value="100"></dc-bubble>
 *
 * @example
 * <dc-bubble label="Q2" value="45" size-value="200" fill="red"></dc-bubble>
 *
 * @example
 * <dc-bubble label="Q3" value="35" size-value="150" href="https://example.com/q3" target="_blank"></dc-bubble>
 *
 * @example
 * <dc-bubble label="Q4" value="60" size-value="300" show-value="false"></dc-bubble>
 */
@customElement('dc-bubble')
export class ChartBubble extends BaseFilledShape {
  // value is inherited from BaseFilledShape (Y-axis value for this bubble)

  /**
   * The size value for this bubble.
   * Used for area-based scaling - bubbles with equal size values will have equal areas.
   */
  @property({ type: Number, attribute: 'size-value' })
  sizeValue = 10;

  // Override showValue to default to true for bubbles (inherited from BaseChartElement)
  @property({ attribute: 'show-value', converter: showConditionConverter })
  override showValue: ShowCondition = true;

  // showPercent is inherited from BaseChartElement
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-bubble': ChartBubble;
  }
}
