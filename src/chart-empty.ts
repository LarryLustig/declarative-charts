import { customElement, property } from 'lit/decorators.js';
import { BaseChartElement } from './base-chart-element.js';

/**
 * Message shown when a chart has no data to draw.
 *
 * Renders nothing itself; the parent chart reads its text and draws it in the
 * plot area. Without one the chart falls back to a built-in message, so an empty
 * chart is never just a blank frame.
 *
 * Because the text lives in your markup, it is translated by whatever rendered
 * the page - no configuration API needed.
 *
 * @element dc-empty
 *
 * @attr {string} fill - Text colour (SVG standard). Defaults to a muted grey.
 * @attr {number} font-size - Text size in viewBox units (default: 14)
 *
 * @example
 * <dc-chart>
 *   <dc-empty>No sales recorded this quarter</dc-empty>
 * </dc-chart>
 *
 * @example
 * <!-- Shown while a server-driven swap is in flight -->
 * <dc-chart loading>
 *   <dc-empty>Nothing to show</dc-empty>
 * </dc-chart>
 */
@customElement('dc-empty')
export class ChartEmpty extends BaseChartElement {
  /** Text colour (SVG standard attribute). Empty means use the themed default. */
  @property({ type: String })
  fill = '';

  /** Text size in viewBox units. */
  @property({ type: Number, attribute: 'font-size' })
  fontSize = 14;

  /** The message text, taken from the element's content. */
  get text(): string {
    return this.textContent?.trim() || '';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-empty': ChartEmpty;
  }
}
