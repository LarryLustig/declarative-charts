import { property } from 'lit/decorators.js';
import { BaseChartElement } from './base-chart-element.js';
import type { PatternType } from './patterns.js';
import { showConditionConverter, type ShowCondition } from './base-chart.js';

/**
 * Base class for chart shape elements that have a fill (area-based shapes).
 *
 * This class extends BaseChartElement and adds:
 * - Numeric value
 * - Fill color support
 * - Pattern fill support
 *
 * Use this class for shapes that render filled areas (bars, pie slices, bubbles, etc.)
 * For stroke-only shapes (lines), extend BaseChartElement directly.
 */
export abstract class BaseFilledShape extends BaseChartElement {
  /**
   * The numeric value for this shape element.
   */
  @property({ type: Number })
  value = 0;

  /**
   * Fill color for this element (SVG standard attribute).
   * Takes precedence over chart-level defaults and palette matches.
   */
  @property({ type: String })
  fill = '';

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
   * Whether to show the label on this shape.
   * Can be true/false or a threshold like "5%" or "100".
   * Inherits from chart if not specified.
   */
  @property({ attribute: 'show-label', converter: showConditionConverter })
  showLabel?: ShowCondition;

  /**
   * Known attributes for filled shapes.
   * Extends BaseChartElement.BASE_KNOWN_ATTRS with fill and pattern attributes.
   */
  static override readonly BASE_KNOWN_ATTRS = new Set([
    ...BaseChartElement.BASE_KNOWN_ATTRS,
    'value',
    'fill',
    'pattern',
    'pattern-stroke',
    'pattern-fill',
    'pattern-scale',
    'show-label'
  ]);

  /**
   * Get the effective fill color for this element.
   * Returns `fill` if set, otherwise falls back to `color` for backwards compatibility.
   */
  getEffectiveFill(): string {
    return this.fill;
  }

  /**
   * Override to use BaseFilledShape's extended BASE_KNOWN_ATTRS.
   */
  override getPassthroughAttributes(knownAttrs: Set<string>): Record<string, string> {
    const passthroughAttrs: Record<string, string> = {};

    // Merge base known attrs with provided known attrs
    const allKnownAttrs = new Set([...BaseFilledShape.BASE_KNOWN_ATTRS, ...knownAttrs]);

    for (const attr of Array.from(this.attributes)) {
      if (!allKnownAttrs.has(attr.name)) {
        passthroughAttrs[attr.name] = attr.value;
      }
    }

    return passthroughAttrs;
  }
}

