import { customElement, property } from 'lit/decorators.js';
import { BaseShape } from './base-shape.js';
import { showConditionConverter, type ShowCondition } from './base-chart.js';

/**
 * Individual line element for line charts
 *
 * Supports attribute passthrough for integration with htmx and other libraries.
 * Any attributes not explicitly defined (like hx-get, hx-target, data-*, etc.)
 * will be passed through to the rendered SVG element.
 *
 * @element dc-line
 *
 * @attr {string} stroke - Stroke color for this line (SVG standard, inherited from BaseChartElement)
 * @attr {string} color - @deprecated Use stroke instead. The color of this line (inherited from BaseChartElement)
 * @attr {string} label - The label for this line (for legend, inherited from BaseChartElement)
 * @attr {string} href - Optional URL to navigate to when line is clicked (inherited from BaseChartElement)
 * @attr {string} target - Optional target for the link (e.g., "_blank", inherited from BaseChartElement)
 * @attr {boolean} show-value - Whether to display numeric values for points on this line by default (default: true, can be overridden by chart-level or point-level settings)
 * @attr {boolean} show-percent - Whether to display percentages for points on this line by default (inherits from chart)
 * @attr {string} point-shape - Default shape for points on this line: "circle", "square", "triangle", "diamond", "star", "cross", "plus", or unicode character (default: "circle")
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
 * <!-- With htmx attributes -->
 * <dc-line stroke="#9C27B0" label="Series A"
 *          hx-get="/api/series/a"
 *          hx-target="#details"
 *          hx-swap="innerHTML">
 *   <dc-point value="15" label="Mon"></dc-point>
 * </dc-line>
 */
@customElement('dc-line')
export class ChartLine extends BaseShape {
  // stroke and color are inherited from BaseChartElement
  // For lines, stroke is the preferred attribute (SVG standard for line color)

  /**
   * Get the effective stroke color for this line.
   * Prefers 'stroke' over deprecated 'color'.
   */
  getEffectiveStroke(): string {
    return this.stroke || this.color;
  }

  @property({ attribute: 'show-value', converter: showConditionConverter })
  showValue: ShowCondition = true;

  @property({ attribute: 'show-percent', converter: showConditionConverter })
  showPercent?: ShowCondition;

  @property({ type: String, attribute: 'point-shape' })
  pointShape = 'circle';
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-line': ChartLine;
  }
}
