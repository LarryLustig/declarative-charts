import { customElement, property } from 'lit/decorators.js';
import { BaseFilledShape } from './base-filled-shape.js';
import { showConditionConverter, type ShowCondition } from './base-chart.js';

/**
 * Type for curve fitting methods
 */
export type CurveFit = 'linear' | 'smooth' | 'monotone' | 'step';

/**
 * Area chart element for filled region charts.
 *
 * Areas are filled regions bounded by data points above and the zero line (or chart bottom)
 * below. When multiple areas are present, they stack by default (each area's baseline is
 * the cumulative sum of previous areas). Use the `overlapping` attribute on the parent
 * `<dc-chart>` to disable stacking.
 *
 * Areas extend BaseFilledShape and inherit all fill and pattern properties.
 *
 * @element dc-area
 *
 * @attr {string} fill - Fill color for the area (inherited from BaseFilledShape)
 * @attr {number} fill-opacity - Opacity of the area fill, 0-1 (default: 0.5)
 * @attr {string} stroke - Stroke color for the top edge line (inherited from BaseChartElement)
 * @attr {number} stroke-width - Width of the top edge stroke (default: 2)
 * @attr {string} label - Legend label for this area (inherited from BaseChartElement)
 * @attr {string} pattern - Pattern type or ID reference (inherited from BaseFilledShape)
 * @attr {string} pattern-stroke - Pattern element color (inherited from BaseFilledShape)
 * @attr {string} pattern-fill - Pattern background color (inherited from BaseFilledShape)
 * @attr {number} pattern-scale - Pattern size multiplier (inherited from BaseFilledShape)
 * @attr {string} curve-fit - Curve fitting method: "linear", "smooth", "monotone", "step" (default: "linear")
 * @attr {boolean|string} show-value - Whether to display values on points (default: true)
 * @attr {boolean|string} show-percent - Whether to display percentages on points (inherited)
 * @attr {string} href - Optional URL to navigate to when area is clicked (inherited)
 * @attr {string} target - Optional target for the link (inherited)
 *
 * @slot - Child elements: dc-point elements
 *
 * @example
 * <dc-area fill="#4CAF50" fill-opacity="0.5" label="Revenue">
 *   <dc-point value="100" label="Q1"></dc-point>
 *   <dc-point value="150" label="Q2"></dc-point>
 *   <dc-point value="120" label="Q3"></dc-point>
 * </dc-area>
 *
 * @example
 * <dc-chart>
 *   <dc-area fill="#4CAF50" label="Product A">
 *     <dc-point value="100" label="Q1"></dc-point>
 *     <dc-point value="120" label="Q2"></dc-point>
 *   </dc-area>
 *   <dc-area fill="#2196F3" label="Product B">
 *     <dc-point value="80" label="Q1"></dc-point>
 *     <dc-point value="90" label="Q2"></dc-point>
 *   </dc-area>
 * </dc-chart>
 *
 * @example
 * <dc-area fill="#9C27B0" pattern="diagonal-lines" label="Sales" curve-fit="smooth">
 *   <dc-point value="50" label="Jan"></dc-point>
 *   <dc-point value="80" label="Feb"></dc-point>
 *   <dc-point value="65" label="Mar"></dc-point>
 * </dc-area>
 */
@customElement('dc-area')
export class ChartArea extends BaseFilledShape {
  // fill, pattern, patternStroke, patternFill, patternScale inherited from BaseFilledShape
  // stroke, strokeWidth, label, href, target inherited from BaseChartElement
  // getEffectiveFill(), getEffectiveStroke() inherited

  /**
   * Opacity of the area fill (0-1).
   * Default is 0.5 for semi-transparent areas that allow overlapping visualization.
   *
   * @attr fill-opacity
   */
  @property({ type: Number, attribute: 'fill-opacity' })
  fillOpacity = 0.5;

  /**
   * Width of the stroke on the top edge of the area.
   * Default is 2 for visible but not overpowering edge definition.
   *
   * @attr stroke-width
   */
  @property({ type: Number, attribute: 'stroke-width' })
  override strokeWidth = 2;

  /**
   * Curve fitting method for the area's top edge.
   *
   * - "linear": Straight line segments between points (default)
   * - "smooth": Catmull-Rom spline for smooth curves through all points
   * - "monotone": Monotonic cubic interpolation (prevents overshoot)
   * - "step": Step function (horizontal then vertical segments)
   *
   * Inherits from chart-level `curve-fit` if not specified.
   *
   * @attr curve-fit
   */
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
   * Whether to display numeric values on points.
   * Default is true for areas.
   *
   * @attr show-value
   */
  @property({ attribute: 'show-value', converter: showConditionConverter })
  override showValue: ShowCondition = true;

  /**
   * Known attributes for area elements.
   * Extends BaseFilledShape.BASE_KNOWN_ATTRS with area-specific attributes.
   */
  static override readonly BASE_KNOWN_ATTRS = new Set([
    ...BaseFilledShape.BASE_KNOWN_ATTRS,
    'fill-opacity',
    'curve-fit'
  ]);
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-area': ChartArea;
  }
}
