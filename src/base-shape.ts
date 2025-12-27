import { property } from 'lit/decorators.js';
import { BaseChartElement } from './base-chart-element.js';
import { optionalBooleanConverter } from './base-chart.js';
import type { PatternType } from './patterns.js';

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
   * Pattern to apply to this shape.
   *
   * Can be:
   * - A built-in pattern type name (e.g., "diagonal-lines", "dots", "crosshatch")
   * - An ID reference to a <dc-pattern> element defined elsewhere in the document
   *
   * @attr pattern
   */
  @property({ type: String })
  pattern?: string | PatternType;

  /**
   * Color of the pattern elements.
   *
   * For line-based patterns (diagonal-lines, crosshatch, etc.), this is the stroke color.
   * For shape-based patterns (dots, checkerboard), this is the fill color of the shapes.
   *
   * If not set, a contrasting color will be auto-calculated based on the pattern fill.
   *
   * @attr pattern-stroke
   */
  @property({ type: String, attribute: 'pattern-stroke' })
  patternStroke?: string;

  /**
   * Fill color behind the pattern.
   *
   * If not set, the element's fill color will be used.
   *
   * @attr pattern-fill
   */
  @property({ type: String, attribute: 'pattern-fill' })
  patternFill?: string;

  /**
   * Size multiplier for the pattern. Default is 1.
   *
   * Larger values create bigger pattern elements, which can be useful
   * for larger charts or when patterns need to be more visible.
   *
   * @attr pattern-scale
   */
  @property({ type: Number, attribute: 'pattern-scale' })
  patternScale?: number;

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
    'auto-popup',
    'pattern',
    'pattern-stroke',
    'pattern-fill',
    'pattern-scale'
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
