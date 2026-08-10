import { customElement, property } from 'lit/decorators.js';
import { BaseFilledShape } from './base-filled-shape.js';

/**
 * One polygon on a radar chart — a container for the `<dc-point>` values that
 * make up a single series.
 *
 * Mirrors `<dc-line>`: the series element carries the styling and the points
 * carry the data. It extends `BaseFilledShape` rather than `BaseChartElement`
 * because a radar series is filled as well as stroked.
 *
 * @element dc-radar-series
 *
 * @attr {string} label - Series name, used by the legend
 * @attr {string} fill - Fill colour for the polygon
 * @attr {number} fill-opacity - Fill opacity (default: 0.25, see below)
 * @attr {string} stroke - Outline colour
 * @attr {number} stroke-width - Outline width
 * @attr {string} stroke-dasharray - Outline dash pattern
 * @attr {string} missing - How to treat an axis with no value: "gap", "skip" or "zero"
 *
 * @example
 * <dc-radar-series label="Model A" fill="#2563eb">
 *   <dc-point value="80" label="Speed"></dc-point>
 *   <dc-point value="60" label="Power"></dc-point>
 * </dc-radar-series>
 */
@customElement('dc-radar-series')
export class ChartRadarSeries extends BaseFilledShape {
  /**
   * Fill opacity for the polygon.
   *
   * Translucent by default, which is a default rather than an option: two
   * opaque polygons hide each other, and comparing series is the only reason to
   * draw more than one.
   */
  @property({ type: Number, attribute: 'fill-opacity' })
  fillOpacity = 0.25;

  /** Dash pattern for the outline. */
  @property({ type: String, attribute: 'stroke-dasharray' })
  strokeDasharray?: string;

  /**
   * How to draw an axis this series has no value for.
   *
   * The same policy `<dc-line>` and `<dc-area>` use, and it means the
   * corresponding thing here:
   *
   * - `gap` (default) - break the polygon at that axis. The absence is visible.
   * - `skip` - join the two neighbouring axes directly, closing the shape over
   *   the gap.
   * - `zero` - pull the vertex to the centre. Only correct when absent really
   *   means zero, and on a radar it distorts the whole silhouette, so it lies
   *   more loudly here than it does on a line.
   */
  @property({ type: String })
  missing: 'gap' | 'skip' | 'zero' = 'gap';
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-radar-series': ChartRadarSeries;
  }
}
