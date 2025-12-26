import { customElement, property } from 'lit/decorators.js';
import { BaseShape } from './base-shape.js';
import { showConditionConverter, type ShowCondition } from './base-chart.js';

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
 * @attr {string} color - @deprecated Use fill instead. Optional color for this specific bubble (inherited from BaseChartElement)
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
export class ChartBubble extends BaseShape {
  /**
   * The Y-axis value for this bubble
   */
  @property({ type: Number })
  value = 0;

  /**
   * The size value for this bubble.
   * Used for area-based scaling - bubbles with equal size values will have equal areas.
   */
  @property({ type: Number, attribute: 'size-value' })
  sizeValue = 10;

  /**
   * Whether to display the numeric value for this bubble.
   * Can be true, false, a percentage threshold (e.g., "5%"), or a value threshold (e.g., "100").
   */
  @property({ attribute: 'show-value', converter: showConditionConverter })
  showValue: ShowCondition = true;

  /**
   * Whether to display the percentage for this bubble.
   * If not set, inherits from chart-level setting.
   */
  @property({ attribute: 'show-percent', converter: showConditionConverter })
  showPercent?: ShowCondition;
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-bubble': ChartBubble;
  }
}
