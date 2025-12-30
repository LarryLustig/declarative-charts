import { LitElement, css } from 'lit';
import { property } from 'lit/decorators.js';
import { optionalBooleanConverter, showConditionConverter, type ShowCondition } from './base-chart.js';

/**
 * Base class for chart data elements (dc-line, dc-point, dc-bar, etc.)
 * Provides common properties for chart elements.
 *
 * This class provides stroke-related properties, popup support, and attribute passthrough.
 * For elements that also need fill and pattern support, use BaseFilledShape instead.
 */
export abstract class BaseChartElement extends LitElement {
  @property({ type: String })
  label = '';

  /**
   * @deprecated Use `fill` or `stroke` instead. Will be removed in a future version.
   * For stroke-based elements (lines), this falls back to stroke.
   * For fill-based elements, this falls back to fill.
   */
  @property({ type: String })
  color = '';

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

  /**
   * Whether to show an automatic popup for this element.
   * - undefined: inherit from chart's auto-popup setting
   * - true: show auto popup (unless explicit <dc-popup> is present)
   * - false: do not show auto popup
   *
   * If an explicit <dc-popup> child element is present, it takes precedence.
   *
   * @attr auto-popup
   */
  @property({ attribute: 'auto-popup', converter: optionalBooleanConverter })
  autoPopup?: boolean;

  /**
   * Format for values displayed on this element's label.
   * Overrides the chart's value-format for this element only.
   * Uses the same format syntax as chart's value-format attribute.
   *
   * @example
   * <dc-bar value="1234567" value-format="currency USD"></dc-bar>
   * <dc-pie-slice value="1234567" value-format="compact 1"></dc-pie-slice>
   *
   * @attr value-format
   */
  @property({ type: String, attribute: 'value-format' })
  valueFormat?: string;

  /**
   * Whether to display the numeric value on this element.
   * Can be true, false, a percentage threshold (e.g., "5%"), or a value threshold (e.g., "100").
   * If not set, inherits from parent element or chart-level setting.
   *
   * @attr show-value
   */
  @property({ attribute: 'show-value', converter: showConditionConverter })
  showValue?: ShowCondition;

  /**
   * Whether to display the percentage on this element.
   * Can be true, false, a percentage threshold (e.g., "5%"), or a value threshold (e.g., "100").
   * If not set, inherits from parent element or chart-level setting.
   *
   * @attr show-percent
   */
  @property({ attribute: 'show-percent', converter: showConditionConverter })
  showPercent?: ShowCondition;

  static styles = css`
    :host {
      display: none !important;
    }
  `;

  /**
   * Common attributes handled by BaseChartElement.
   * Subclasses should merge their own known attributes with this set.
   */
  static readonly BASE_KNOWN_ATTRS = new Set([
    'label',
    'color',      // deprecated
    'stroke',
    'stroke-width',
    'href',
    'target',
    'auto-popup',
    'value-format',
    'show-value',
    'show-percent'
  ]);

  /**
   * Get the effective stroke color for this element.
   * Returns `stroke` if set, otherwise falls back to `color` for backwards compatibility.
   */
  getEffectiveStroke(): string {
    return this.stroke || this.color;
  }

  /**
   * Get all attributes that should be passed through to rendered SVG elements.
   * @param knownAttrs Set of attribute names that are handled by the component
   * @returns Object containing passthrough attribute names and values
   */
  getPassthroughAttributes(knownAttrs: Set<string>): Record<string, string> {
    const passthroughAttrs: Record<string, string> = {};

    // Merge base known attrs with provided known attrs
    const allKnownAttrs = new Set([...BaseChartElement.BASE_KNOWN_ATTRS, ...knownAttrs]);

    for (const attr of Array.from(this.attributes)) {
      if (!allKnownAttrs.has(attr.name)) {
        passthroughAttrs[attr.name] = attr.value;
      }
    }

    return passthroughAttrs;
  }

  render() {
    // No visual rendering - these elements just hold data
    return null;
  }
}
