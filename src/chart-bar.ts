import { customElement, property } from 'lit/decorators.js';
import { BaseFilledShape } from './base-filled-shape.js';
import { showConditionConverter, type ShowCondition } from './base-chart.js';  // for showValue override

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
 * @attr {string} label - The label to display below this bar (inherited from BaseChartElement)
 * @attr {string} href - Optional URL to navigate to when bar is clicked (inherited from BaseChartElement)
 * @attr {string} target - Optional target for the link (e.g., "_blank", inherited from BaseChartElement)
 * @attr {boolean} show-value - Whether to display the numeric value on the chart (default: true, can be overridden by chart-level setting)
 * @attr {boolean} show-percent - Whether to display the percentage on the chart (inherits from chart)
 * @attr {string} legend-href - Makes this bar's legend entry a link to the given URL
 * @attr {string} legend-target - Link target for `legend-href` (e.g. "_blank")
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
export class ChartBar extends BaseFilledShape {
  // value is inherited from BaseFilledShape
  // fill and stroke are inherited from BaseChartElement
  // color is inherited but deprecated in favor of fill

  // Override showValue to default to true for bars (inherited from BaseChartElement)
  @property({ attribute: 'show-value', converter: showConditionConverter })
  override showValue: ShowCondition = true;

  // showPercent is inherited from BaseChartElement

  /**
   * Thickness of this bar, e.g. "40" or "12%".
   *
   * Named `bar-width`, not `width`: `<dc-chart width>` is the width of the whole
   * chart and `<dc-bar-group bar-width>` already spelled the same idea this way,
   * so `<dc-bar width>` was the odd one of three - and a homonym of a chart
   * attribute a reader already knows.
   */
  @property({ type: String, attribute: 'bar-width' })
  barWidth?: string;

  /**
   * Makes this bar's legend entry a link to the given URL.
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
    'dc-bar': ChartBar;
  }
}
