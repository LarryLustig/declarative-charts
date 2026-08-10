import { customElement, property } from 'lit/decorators.js';
import { BaseFilledShape } from './base-filled-shape.js';

/**
 * A set of unconnected points — one series of a scatter plot.
 *
 * A container for `<dc-point>` children, the way `<dc-line>` and
 * `<dc-area>` are, and the same points: what distinguishes a scatter is that
 * nothing is drawn between them, and that each point states its own `x`.
 *
 * A series rather than loose points because a scatter usually compares groups,
 * and a group needs a name for the legend and a colour of its own.
 *
 * @element dc-scatter
 *
 * @attr {string} label - Series name, used by the legend
 * @attr {string} fill - Marker colour
 * @attr {number} fill-opacity - Marker opacity; useful when points overlap
 * @attr {string} shape - Marker shape: "circle" (default), "square", "triangle", "diamond", "cross", "plus", "star"
 * @attr {number} size - Marker radius in viewBox units (default: 4)
 *
 * @example
 * <dc-chart width="600" height="400">
 *   <dc-scatter label="Control" fill="#2563eb">
 *     <dc-point x="10" value="22"></dc-point>
 *     <dc-point x="15" value="35"></dc-point>
 *   </dc-scatter>
 * </dc-chart>
 */
@customElement('dc-scatter')
export class ChartScatter extends BaseFilledShape {
  /** Marker shape. The same vocabulary `<dc-line point-shape>` uses. */
  @property({ type: String })
  shape = 'circle';

  /** Marker radius, in viewBox units. */
  @property({ type: Number })
  size = 4;

  /**
   * Marker opacity.
   *
   * Scatter points overlap by nature, and a translucent marker shows density
   * where an opaque one shows only the topmost point. Left at 1 by default so a
   * sparse plot stays crisp; lower it when the cloud is dense.
   */
  @property({ type: Number, attribute: 'fill-opacity' })
  fillOpacity = 1;
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-scatter': ChartScatter;
  }
}
