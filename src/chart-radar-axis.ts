import { LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * One dimension of a radar chart — a spoke radiating from the centre.
 *
 * A distinct element rather than a reuse of `<dc-axis>`: that element's
 * `position="left|bottom"` is cartesian by definition, and giving one tag two
 * meanings depending on its parent is the mistake `<dc-grid style>` made.
 *
 * @element dc-radar-axis
 *
 * @attr {string} label - The dimension's name. Points bind to it, so it is required
 * @attr {number} min-value - Domain minimum for this axis, overriding the chart's
 * @attr {number} max-value - Domain maximum for this axis, overriding the chart's
 * @attr {string} value-format - Number format for this axis's values
 * @attr {boolean} hidden - Removes the spoke and any points bound to it
 *
 * @example
 * <!-- Independent domains: km/h and hp are not the same units -->
 * <dc-radar-chart max-value="100">
 *   <dc-radar-axis label="Speed"></dc-radar-axis>
 *   <dc-radar-axis label="Power" max-value="500" value-format="number 0"></dc-radar-axis>
 * </dc-radar-chart>
 */
@customElement('dc-radar-axis')
export class ChartRadarAxis extends LitElement {
  /**
   * The dimension's name.
   *
   * Points bind to an axis by matching this, the way line points align with bar
   * categories in a combo chart. Order in the markup then decides only where
   * the spoke is drawn, not which values land on it.
   */
  @property({ type: String })
  label = '';

  /**
   * Domain minimum for this axis. Falls back to the chart's `min-value`.
   *
   * Radar conventionally starts at zero: a non-zero origin exaggerates small
   * differences into large-looking ones, and the polygon is the whole message.
   */
  @property({ type: Number, attribute: 'min-value' })
  minValue?: number;

  /**
   * Domain maximum for this axis. Falls back to the chart's `max-value`, and
   * then to the largest value any series puts on this axis.
   *
   * Per-axis domains are what make a radar honest. One shared scale is only
   * meaningful when every dimension is commensurable, which is rare; separate
   * domains let speed in km/h sit beside power in hp without the shape implying
   * a relationship between the numbers that does not exist.
   */
  @property({ type: Number, attribute: 'max-value' })
  maxValue?: number;

  /** Number format for values on this axis. Falls back to the chart's. */
  @property({ type: String, attribute: 'value-format' })
  valueFormat?: string;

  /** Standard HTML hidden attribute. Removes the spoke entirely. */
  @property({ type: Boolean, reflect: true })
  override hidden = false;

  static styles = css`
    :host {
      display: none !important;
    }
  `;

  /** No visual rendering - this element is configuration. */
  override render() {
    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-radar-axis': ChartRadarAxis;
  }
}
