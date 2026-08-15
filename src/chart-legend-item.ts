import { LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { LegendShape } from './chart-legend.js';

/**
 * Custom legend item element for defining legend entries manually.
 *
 * Use this element inside `<dc-legend>` to override auto-generated legend items.
 * This is useful for semantic coloring scenarios where multiple data elements
 * share the same color but represent different concepts.
 *
 * When `<dc-legend-item>` children are present, they completely replace the
 * auto-generated legend items from chart data.
 *
 * @element dc-legend-item
 *
 * @attr {string} label - Legend item label (required)
 * @attr {string} fill - Fill color for squares/circles (bars, areas, pie slices)
 * @attr {string} stroke - Stroke color for lines
 * @attr {string} stroke-dasharray - Dash pattern for lines ("dashed", "dotted", or numeric)
 * @attr {string} shape - Shape indicator: "square" (default), "circle", "line"
 * @attr {string} pattern - Pattern type for patterned fills
 * @attr {number} value - Value for aggregated legends (enables value/percent display)
 * @attr {string} href - Makes this entry a link to the given URL
 * @attr {string} target - Link target for `href` (e.g. "_blank")
 *
 * @example
 * <!-- Semantic coloring - same color, different meaning -->
 * <dc-legend>
 *   <dc-legend-item fill="#4CAF50" label="Above Target"></dc-legend-item>
 *   <dc-legend-item fill="#FF9800" label="Near Target"></dc-legend-item>
 *   <dc-legend-item fill="#F44336" label="Below Target"></dc-legend-item>
 * </dc-legend>
 *
 * @example
 * <!-- Line legend with stroke -->
 * <dc-legend>
 *   <dc-legend-item stroke="#2196F3" label="Actual" shape="line"></dc-legend-item>
 *   <dc-legend-item stroke="#F44336" stroke-dasharray="dashed" label="Target" shape="line"></dc-legend-item>
 * </dc-legend>
 *
 * @example
 * <!-- Aggregated legend with values -->
 * <dc-legend show-value show-percent>
 *   <dc-legend-item fill="#4CAF50" label="Above Target" value="177"></dc-legend-item>
 *   <dc-legend-item fill="#FF9800" label="Near Target" value="78"></dc-legend-item>
 *   <dc-legend-item fill="#F44336" label="Below Target" value="72"></dc-legend-item>
 * </dc-legend>
 */
@customElement('dc-legend-item')
export class ChartLegendItem extends LitElement {
  /**
   * Legend item label (required).
   */
  @property({ type: String })
  label?: string;

  /**
   * Fill color for the legend indicator.
   * Used for bars, areas, pie slices, and other filled shapes.
   */
  @property({ type: String })
  fill?: string;

  /**
   * Stroke color for the legend indicator.
   * Used for lines. If stroke is set without fill, shape defaults to "line".
   */
  @property({ type: String })
  stroke?: string;

  /**
   * Stroke dash pattern for line indicators.
   * Can be a named pattern ("dashed", "dotted", "solid", "dash-dot", "long-dash")
   * or a numeric SVG dasharray value (e.g., "5 3").
   */
  @property({ type: String, attribute: 'stroke-dasharray' })
  strokeDasharray?: string;

  /**
   * Shape for the legend indicator.
   * - "square": Filled square (default for fill-based items)
   * - "circle": Filled circle (for bubbles)
   * - "line": Horizontal line (default for stroke-only items)
   */
  @property({ type: String })
  shape?: LegendShape;

  /**
   * Pattern type for patterned fills.
   * Available patterns: diagonal-lines, diagonal-lines-reverse, horizontal-lines,
   * vertical-lines, dots, crosshatch, grid, checkerboard
   */
  @property({ type: String })
  pattern?: string;

  /**
   * Value for aggregated legends.
   * When set, the item will be treated as a ValuedLegendItem and can display
   * value and percentage in the legend (controlled by show-value/show-percent on dc-legend).
   */
  @property({ type: Number })
  value?: number;

  /**
   * Makes this entry a link.
   *
   * The whole entry becomes the target - swatch, label and value - because a
   * link covering only the words is a smaller hit area than it looks. Rendered
   * as a real SVG `<a>`, so middle-click and open-in-new-tab work.
   */
  @property({ type: String })
  href?: string;

  /** Link target for {@link href}, as on any other element that takes one. */
  @property({ type: String })
  target?: string;

  static styles = css`
    :host {
      display: none !important;
    }
  `;

  /**
   * Get the effective shape for this item.
   * If not explicitly set, defaults to 'line' for stroke-only items,
   * 'square' for fill-based items.
   */
  getEffectiveShape(): LegendShape {
    if (this.shape) return this.shape;
    // If stroke is set without fill, default to line
    if (this.stroke && !this.fill) return 'line';
    return 'square';
  }

  /**
   * Get the effective color for this item.
   * Returns fill if set, otherwise stroke, otherwise a default gray.
   */
  getEffectiveColor(): string {
    return this.fill || this.stroke || '#666';
  }

  // No visual rendering - this is a data container
  render() {
    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-legend-item': ChartLegendItem;
  }
}
