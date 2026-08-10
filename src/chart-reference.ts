import { customElement, property } from 'lit/decorators.js';
import { BaseChartElement } from './base-chart-element.js';
import { optionalNumberConverter } from './converters.js';

/**
 * A target, threshold, budget or SLA drawn across the plot.
 *
 * One element covers both shapes an annotation takes, because they are the same
 * idea at different widths:
 *
 * - `value` draws a **line** at that point on the value axis.
 * - `min` and `max` draw a **band** between them.
 * - Either bound alone draws a half-open band — `min="80"` shades everything
 *   from 80 to the top of the plot, which is how a danger zone is usually
 *   stated.
 *
 * Setting `value` alongside a band is not a conflict: it draws the centre line
 * of the band, which is exactly what "acceptable range, target 100" means.
 *
 * A reference is an annotation rather than data. It is not focusable, it does
 * not appear in the legend — its `label` is drawn on the line itself, so a
 * legend entry would only repeat it — and it contributes no value to any total
 * or percentage. It *does* widen an automatic axis range, because a target the
 * axis crops off is worse than no target at all.
 *
 * @element dc-reference
 *
 * @attr {number} value - Where to draw a line on the value axis
 * @attr {number} min - Lower bound of a band
 * @attr {number} max - Upper bound of a band
 * @attr {string} label - Text drawn at the end of the line or band
 * @attr {string} stroke - Line colour (default: #dc2626)
 * @attr {number} stroke-width - Line width (default: 2)
 * @attr {string} stroke-dasharray - Named pattern or dash list (default: dashed)
 * @attr {string} fill - Band fill colour; defaults to the stroke colour
 * @attr {number} fill-opacity - Band opacity (default: 0.12)
 * @attr {string} label-position - "end" (default) or "start" of the line
 *
 * @example
 * <dc-chart width="600" height="400">
 *   <dc-reference min="80" max="120" label="Acceptable"></dc-reference>
 *   <dc-reference value="100" label="Target"></dc-reference>
 *   <dc-bar value="95" label="Q1"></dc-bar>
 * </dc-chart>
 */
@customElement('dc-reference')
export class ChartReference extends BaseChartElement {
  /**
   * Where to draw the line.
   *
   * NaN rather than 0 by default, so an omitted `value` means "no line" instead
   * of a line along the zero axis — the same reason `<dc-point>` defaults this
   * way.
   */
  @property({ converter: optionalNumberConverter })
  value = NaN;

  /** Lower bound of a band. Alone, the band runs from here to the top. */
  @property({ converter: optionalNumberConverter })
  min = NaN;

  /** Upper bound of a band. Alone, the band runs from the bottom to here. */
  @property({ converter: optionalNumberConverter })
  max = NaN;

  /**
   * Line colour.
   *
   * Red by default because the overwhelming majority of these are a limit
   * someone is trying not to cross. Override it for a band that means "good".
   */
  @property({ type: String })
  override stroke = '#dc2626';

  @property({ type: Number, attribute: 'stroke-width' })
  override strokeWidth = 2;

  /**
   * Dash pattern for the line. Accepts the named patterns `<dc-grid>` and
   * `<dc-fill>` take, or a raw SVG dash list.
   *
   * Dashed by default: a solid line the same weight as a data line reads as
   * data, and the whole point of an annotation is that it is not.
   */
  @property({ type: String, attribute: 'stroke-dasharray' })
  strokeDasharray = 'dashed';

  /** Band fill. Falls back to `stroke`, so one colour attribute usually does. */
  @property({ type: String })
  fill?: string;

  @property({ type: Number, attribute: 'fill-opacity' })
  fillOpacity = 0.12;

  /** True when this element asks for a line. */
  get hasLine(): boolean {
    return Number.isFinite(this.value);
  }

  /** True when this element asks for a band, including a half-open one. */
  get hasBand(): boolean {
    return Number.isFinite(this.min) || Number.isFinite(this.max);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-reference': ChartReference;
  }
}
