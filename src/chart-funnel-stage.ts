import { customElement } from 'lit/decorators.js';
import { BaseFilledShape } from './base-filled-shape.js';

/**
 * Individual stage element for funnel charts
 *
 * Supports attribute passthrough for integration with htmx and other libraries.
 * Any attributes not explicitly defined (like hx-get, hx-target, data-*, etc.)
 * will be passed through to the rendered SVG element.
 *
 * @element dc-funnel-stage
 *
 * @attr {number} value - The numeric value for this stage
 * @attr {string} label - The label for this stage (inherited from BaseChartElement)
 * @attr {string} fill - Fill color for this stage (inherited from BaseChartElement)
 * @attr {string} color - @deprecated Use fill instead. Optional color for this stage (inherited from BaseChartElement)
 * @attr {string} stroke - Stroke color for this stage (inherited from BaseChartElement). Note: funnel-chart also supports shorthand syntax.
 * @attr {number} stroke-width - Stroke width for this stage (inherited from BaseChartElement)
 * @attr {boolean} show-value - Whether to show the value on this stage (inherits from chart)
 * @attr {boolean} show-label - Whether to show the label on this stage (inherits from chart)
 * @attr {boolean} show-percent - Whether to show the percentage on this stage (inherits from chart)
 *
 * @example
 * <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
 *
 * @example
 * <dc-funnel-stage value="500" label="Signups" fill="#FF5722"></dc-funnel-stage>
 *
 * @example
 * <dc-funnel-stage value="500" label="Signups" stroke="#333" stroke-width="3"></dc-funnel-stage>
 *
 * @example
 * <!-- Override chart defaults for this stage -->
 * <dc-funnel-stage value="500" label="Signups" show-value="false"></dc-funnel-stage>
 *
 * @example
 * <!-- With htmx attributes -->
 * <dc-funnel-stage value="500" label="Signups"
 *                  hx-get="/api/stage/signups"
 *                  hx-target="#details"
 *                  hx-swap="innerHTML"></dc-funnel-stage>
 */
@customElement('dc-funnel-stage')
export class ChartFunnelStage extends BaseFilledShape {
  // value and showLabel are inherited from BaseFilledShape
  // stroke and strokeWidth are inherited from BaseChartElement
  // showValue and showPercent are inherited from BaseChartElement
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-funnel-stage': ChartFunnelStage;
  }
}
