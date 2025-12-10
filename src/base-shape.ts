import { property } from 'lit/decorators.js';
import { BaseChartElement } from './base-chart-element.js';
import { optionalBooleanConverter } from './base-chart.js';

/**
 * Base class for chart shape elements that support attribute passthrough
 * (dc-bar, dc-line, dc-pie-slice, dc-funnel-stage)
 *
 * This class extends BaseChartElement and adds support for passing through
 * any attributes that aren't explicitly defined by the component to the
 * rendered SVG elements. This enables integration with libraries like htmx.
 */
export abstract class BaseShape extends BaseChartElement {
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
   * Common attributes handled by BaseChartElement and BaseShape.
   * Subclasses should merge their own known attributes with this set.
   */
  static readonly BASE_KNOWN_ATTRS = new Set([
    'label',
    'color',      // deprecated, use 'fill'
    'fill',
    'stroke',
    'stroke-width',
    'href',
    'target',
    'auto-popup'
  ]);

  /**
   * Get all attributes that should be passed through to rendered SVG elements
   * @param knownAttrs Set of attribute names that are handled by the component
   * @returns Object containing passthrough attribute names and values
   */
  getPassthroughAttributes(knownAttrs: Set<string>): Record<string, string> {
    const passthroughAttrs: Record<string, string> = {};

    // Merge base known attrs with provided known attrs
    const allKnownAttrs = new Set([...BaseShape.BASE_KNOWN_ATTRS, ...knownAttrs]);

    for (const attr of Array.from(this.attributes)) {
      if (!allKnownAttrs.has(attr.name)) {
        passthroughAttrs[attr.name] = attr.value;
      }
    }

    return passthroughAttrs;
  }
}
