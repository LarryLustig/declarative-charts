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
 * @attr {string} legend-href - Makes this series's legend entry a link to the given URL
 * @attr {string} legend-target - Link target for `legend-href` (e.g. "_blank")
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

  /**
   * Makes this series's legend entry a link to the given URL.
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
    'dc-scatter': ChartScatter;
  }
}
