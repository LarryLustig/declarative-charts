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

  /**
   * Position for labels on this element.
   * Valid values depend on element type:
   * - Bars: "outside", "inside-top", "inside-center", "inside-bottom", "outside-top", "outside-bottom"
   * - Points: "above", "above-left", "above-right", "below", "below-left", "below-right", "left", "right", "center"
   * - Bubbles: Same as points, plus "inside"
   * - Pie slices: "inside", "outside"
   * - Funnel/Stage: "inside", "outside-left", "outside-right"
   * - Stage chart: Also supports "above", "below"
   * If not set, inherits from parent element or chart-level setting.
   *
   * @attr label-position
   */
  @property({ type: String, attribute: 'label-position' })
  labelPosition?: string;

  /**
   * Horizontal offset for labels in viewBox units.
   * Positive values move right, negative values move left.
   * If not set, inherits from parent element or chart-level setting.
   *
   * @attr label-offset-x
   */
  @property({ type: Number, attribute: 'label-offset-x' })
  labelOffsetX?: number;

  /**
   * Vertical offset for labels in viewBox units.
   * Positive values move down (SVG convention), negative values move up.
   * If not set, inherits from parent element or chart-level setting.
   *
   * @attr label-offset-y
   */
  @property({ type: Number, attribute: 'label-offset-y' })
  labelOffsetY?: number;

  /**
   * Radial offset for labels in viewBox units.
   * Meaning depends on element type:
   * - Bars: away from zero line
   * - Pie/Bubbles: away from center
   * - Points: away from point center
   * - Funnel/Stage: away from stage center
   * Positive values move outward, negative values move inward.
   * If not set, inherits from parent element or chart-level setting.
   *
   * @attr label-offset-r
   */
  @property({ type: Number, attribute: 'label-offset-r' })
  labelOffsetR?: number;

  /**
   * Fill color for labels on this element (SVG text fill).
   * - "auto" (default): Automatically calculate based on background
   *   - Inside shapes: Contrast against shape fill color
   *   - Outside shapes: Use dark text (#333) for light backgrounds
   * - Any CSS color: Use the specified color
   * If not set, inherits from parent element or chart-level setting.
   *
   * @attr label-fill
   */
  @property({ type: String, attribute: 'label-fill' })
  labelFill?: string;

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
    'show-percent',
    'label-position',
    'label-offset-x',
    'label-offset-y',
    'label-offset-r',
    'label-fill'
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
