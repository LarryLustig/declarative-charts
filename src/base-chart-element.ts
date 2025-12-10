import { LitElement, css } from 'lit';
import { property } from 'lit/decorators.js';

/**
 * Base class for chart data elements (dc-line, dc-point, dc-bar, etc.)
 * Provides common properties for chart elements
 */
export abstract class BaseChartElement extends LitElement {
  @property({ type: String })
  label = '';

  /**
   * @deprecated Use `fill` instead. Will be removed in a future version.
   */
  @property({ type: String })
  color = '';

  /**
   * Fill color for this element (SVG standard attribute).
   * Takes precedence over chart-level fill-color, fill-colors, and gradient settings.
   */
  @property({ type: String })
  fill = '';

  /**
   * Stroke color for this element (SVG standard attribute).
   * Takes precedence over chart-level stroke-color, stroke-colors, and gradient settings.
   */
  @property({ type: String })
  stroke = '';

  /**
   * Stroke width for this element (SVG standard attribute).
   * Takes precedence over chart-level stroke-width.
   */
  @property({ type: Number, attribute: 'stroke-width' })
  strokeWidth?: number;

  @property({ type: String })
  href = '';

  @property({ type: String })
  target = '';

  static styles = css`
    :host {
      display: none !important;
    }
  `;

  /**
   * Get the effective fill color for this element.
   * Returns `fill` if set, otherwise falls back to `color` for backwards compatibility.
   */
  getEffectiveFill(): string {
    return this.fill || this.color;
  }

  render() {
    // No visual rendering - these elements just hold data
    return null;
  }
}
