import { customElement, property } from 'lit/decorators.js';
import { BaseFilledShape } from './base-filled-shape.js';

/**
 * Shape types supported by stage charts
 */
export type StageShape = 'rectangle' | 'square' | 'oval' | 'circle';

/**
 * Individual stage element for stage charts
 *
 * Supports attribute passthrough for integration with htmx and other libraries.
 * Any attributes not explicitly defined (like hx-get, hx-target, data-*, etc.)
 * will be passed through to the rendered SVG element.
 *
 * @element dc-stage
 *
 * @attr {number} value - The numeric value for this stage
 * @attr {string} label - The label for this stage (inherited from BaseChartElement)
 * @attr {string} fill - Fill color for this stage (inherited from BaseChartElement)
 * @attr {string} stroke - Stroke shorthand (e.g., "2 #333")
 * @attr {number} stroke-width - Stroke width for this stage (inherited from BaseChartElement)
 * @attr {StageShape} shape - Override chart's shape for this stage
 * @attr {string} corner-radius - Override corner radius for rectangles
 * @attr {boolean} show-value - Whether to show the value on this stage (inherits from chart)
 * @attr {boolean} show-label - Whether to show the label on this stage (inherits from chart)
 * @attr {boolean} show-percent - Whether to show the percentage on this stage (inherits from chart)
 * @attr {string} legend-href - Makes this stage's legend entry a link to the given URL
 * @attr {string} legend-target - Link target for `legend-href` (e.g. "_blank")
 *
 * @example
 * <dc-stage value="100" label="Step 1"></dc-stage>
 *
 * @example
 * <dc-stage value="200" label="Peak" fill="#4285f4" shape="circle"></dc-stage>
 *
 * @example
 * <!-- Override chart defaults for this stage -->
 * <dc-stage value="50" label="End" show-value="false" shape="oval"></dc-stage>
 *
 * @example
 * <!-- With htmx attributes -->
 * <dc-stage value="150" label="Active"
 *           hx-get="/api/stage/active"
 *           hx-target="#details"
 *           hx-swap="innerHTML"></dc-stage>
 */
@customElement('dc-stage')
export class ChartStage extends BaseFilledShape {
  // value and showLabel are inherited from BaseFilledShape
  // stroke and strokeWidth are inherited from BaseChartElement
  // showValue and showPercent are inherited from BaseChartElement

  /**
   * Override shape for this stage.
   * If not set, inherits from chart's shape attribute.
   */
  @property({ type: String })
  shape?: StageShape;

  /**
   * Override corner radius for this stage (only applies to rectangle shape).
   * If not set, inherits from chart's corner-radius attribute.
   */
  @property({ type: String, attribute: 'corner-radius' })
  cornerRadius?: string;

  /**
   * Makes this stage's legend entry a link to the given URL.
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
    'dc-stage': ChartStage;
  }
}
