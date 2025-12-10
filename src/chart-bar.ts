import { customElement, property } from 'lit/decorators.js';
import { BaseShape } from './base-shape.js';
import { showConditionConverter, type ShowCondition } from './base-chart.js';

/**
 * Individual bar element for bar charts
 *
 * Supports attribute passthrough for integration with htmx and other libraries.
 * Any attributes not explicitly defined (like hx-get, hx-target, data-*, etc.)
 * will be passed through to the rendered SVG element.
 *
 * @element dc-bar
 *
 * @attr {number} value - The numeric value for this bar
 * @attr {string} fill - Fill color for this bar (SVG standard, inherited from BaseChartElement)
 * @attr {string} color - @deprecated Use fill instead. The color of this bar (CSS color, inherited from BaseChartElement)
 * @attr {string} label - The label to display below this bar (inherited from BaseChartElement)
 * @attr {string} href - Optional URL to navigate to when bar is clicked (inherited from BaseChartElement)
 * @attr {string} target - Optional target for the link (e.g., "_blank", inherited from BaseChartElement)
 * @attr {boolean} show-value - Whether to display the numeric value on the chart (default: true, can be overridden by chart-level setting)
 * @attr {boolean} show-percent - Whether to display the percentage on the chart (inherits from chart)
 *
 * @example
 * <dc-bar value="25" fill="red" label="January"></dc-bar>
 *
 * @example
 * <dc-bar value="25" fill="red" label="January" href="https://example.com/jan-report" target="_blank"></dc-bar>
 *
 * @example
 * <dc-bar value="25" fill="red" label="January" show-value="false"></dc-bar>
 *
 * @example
 * <!-- With htmx attributes -->
 * <dc-bar value="25" fill="red" label="January"
 *         hx-get="/api/details/jan"
 *         hx-target="#details"
 *         hx-swap="innerHTML"></dc-bar>
 */
@customElement('dc-bar')
export class ChartBar extends BaseShape {
  @property({ type: Number })
  value = 0;

  // fill and stroke are inherited from BaseChartElement
  // color is inherited but deprecated in favor of fill

  @property({ attribute: 'show-value', converter: showConditionConverter })
  showValue: ShowCondition = true;

  @property({ attribute: 'show-percent', converter: showConditionConverter })
  showPercent?: ShowCondition;

  @property({ type: String })
  width?: string;
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-bar': ChartBar;
  }
}
