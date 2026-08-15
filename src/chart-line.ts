import { customElement, property } from 'lit/decorators.js';
import { BaseChartElement } from './base-chart-element.js';
import { showConditionConverter, type ShowCondition } from './base-chart.js';  // for showValue override

/**
 * Type for curve fitting methods
 */
export type CurveFit = 'linear' | 'smooth' | 'monotone' | 'step';

/**
 * Individual line element for line charts
 *
 * Lines are stroke-based elements (no fill), so they extend BaseChartElement directly
 * rather than BaseFilledShape.
 *
 * @element dc-line
 *
 * @attr {string} stroke - Stroke color for this line (SVG standard, inherited from BaseChartElement)
 * @attr {string} label - The label for this line (for legend, inherited from BaseChartElement)
 * @attr {string} href - Optional URL to navigate to when line is clicked (inherited from BaseChartElement)
 * @attr {string} target - Optional target for the link (e.g., "_blank", inherited from BaseChartElement)
 * @attr {boolean} show-value - Whether to display numeric values for points on this line by default (default: true, can be overridden by chart-level or point-level settings)
 * @attr {boolean} show-percent - Whether to display percentages for points on this line by default (inherits from chart)
 * @attr {string} point-shape - Default shape for points on this line: "circle", "square", "triangle", "diamond", "star", "cross", "plus", or unicode character (default: "circle")
 * @attr {string} curve-fit - Curve fitting method: "linear" (straight segments), "smooth" (Catmull-Rom spline), "monotone" (monotonic interpolation), "step" (step-after). Overrides chart-level setting.
 * @attr {string} legend-href - Makes this line's legend entry a link to the given URL
 * @attr {string} legend-target - Link target for `legend-href` (e.g. "_blank")
 *
 * @slot - Child elements: dc-point elements
 *
 * @example
 * <dc-line stroke="#9C27B0" label="Series A">
 *   <dc-point value="15" label="Mon"></dc-point>
 *   <dc-point value="18" label="Tue"></dc-point>
 * </dc-line>
 *
 * @example
 * <dc-line stroke="#FF5722" label="San Francisco" href="https://en.wikipedia.org/wiki/San_Francisco" target="_blank">
 *   <dc-point value="12" label="Mon"></dc-point>
 * </dc-line>
 *
 * @example
 * <dc-line stroke="#9C27B0" label="Series A" show-value="false">
 *   <dc-point value="15" label="Mon"></dc-point>
 *   <dc-point value="18" label="Tue"></dc-point>
 * </dc-line>
 *
 * @example
 * <dc-line stroke="#9C27B0" label="Series A" point-shape="square">
 *   <dc-point value="15" label="Mon"></dc-point>
 *   <dc-point value="18" label="Tue"></dc-point>
 * </dc-line>
 *
 * @example
 * <dc-line stroke="#9C27B0" label="Smooth Curve" curve-fit="smooth">
 *   <dc-point value="15" label="Mon"></dc-point>
 *   <dc-point value="22" label="Tue"></dc-point>
 *   <dc-point value="18" label="Wed"></dc-point>
 * </dc-line>
 */
@customElement('dc-line')
export class ChartLine extends BaseChartElement {
  // stroke and color are inherited from BaseChartElement
  // getEffectiveStroke() is inherited from BaseChartElement

  // Override showValue to default to true for lines (inherited from BaseChartElement)
  @property({ attribute: 'show-value', converter: showConditionConverter })
  override showValue: ShowCondition = true;

  // showPercent is inherited from BaseChartElement

  @property({ type: String, attribute: 'point-shape' })
  pointShape = 'circle';

  /**
   * How to draw positions that have no data.
   *
   * - `gap` (default) - break the series. The absence is visible, which is the
   *   honest rendering: a chart should not imply a value it does not have.
   * - `skip` - join the neighbouring points, ignoring the gap.
   * - `zero` - treat missing as 0. Only correct when absent genuinely means
   *   zero, which is rarely true of real data.
   */
  @property({ type: String })
  missing: 'gap' | 'skip' | 'zero' = 'gap';

  @property({ type: String, attribute: 'curve-fit' })
  curveFit?: CurveFit;

  /**
   * Makes this line's legend entry a link to the given URL.
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
    'dc-line': ChartLine;
  }
}
