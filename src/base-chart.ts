import { LitElement, css, html, svg, SVGTemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import type { ChartTitle } from './chart-title.js';
import type { ChartEmpty } from './chart-empty.js';
import type { ChartLegend, LegendItem } from './chart-legend.js';
import type { ChartPalette, PaletteColorResult } from './chart-palette.js';
import type { ChartFill } from './chart-fill.js';
import { ColorResolver } from './color-resolver.js';
import { KeyboardNavController } from './keyboard-nav-controller.js';
import { SvgExporter, DEFAULT_SVG_FILENAME } from './svg-exporter.js';
import { PopupController } from './popup-controller.js';
import { ChartLogger } from './chart-logger.js';
import {
  PatternConfig,
  ResolvedPattern,
  ResolvedFillAndPattern,
  PATTERN_DEFINITIONS,
  isPatternType,
  generatePatternId,
  getHighContrastPattern
} from './patterns.js';
import { NumberFormatter } from './format.js';
import { type ShapeBounds } from './chart-utils.js';
import {
  animateChartEntry,
  parseAnimateAttribute,
  type AnimatableChartType
} from './animation.js';
import {
  findDefaultsElement,
  type DefaultableAttribute
} from './chart-defaults.js';
import {
  type ErrorDefinition,
  ErrorCode
} from './errors.js';

// Import and re-export converters from their dedicated module to avoid circular dependencies
import {
  showConditionConverter,
  booleanConverter,
  optionalBooleanConverter,
  type ShowCondition
} from './converters.js';
export {
  showConditionConverter,
  booleanConverter,
  optionalBooleanConverter,
  type ShowCondition
};

/**
 * Options for resolving colors for chart elements.
 */
export interface ColorResolutionOptions {
  /** Per-element color overrides (from element's fill/stroke attribute) */
  elementColors?: (string | undefined)[];
  /** Base colors from palette (user-defined or built-in) */
  paletteColors?: string[];
  /** Default fallback color if nothing else is specified */
  defaultColor?: string;
}

/**
 * Information about an element (title or legend) in a padding area.
 * Used for stacking calculations when both title and legend are on the same side.
 */
export interface PaddingContentItem {
  /** The type of element */
  type: 'title' | 'legend';
  /** Width of the element in viewBox units */
  width: number;
  /** Height of the element in viewBox units */
  height: number;
  /** Reference to the DOM element */
  element: Element;
}


/**
 * Log level for chart logging system.
 * - 'error': Calculation failures, invalid inputs
 * - 'warning': Fallbacks used, deprecated attributes
 * - 'info': Normal derivation messages
 */
/**
 * Payload of the `dc-click`, `dc-mouseenter` and `dc-mouseleave` events.
 *
 * ```js
 * document.querySelector('dc-chart').addEventListener('dc-click', e => {
 *   console.log(e.detail.label, e.detail.value);
 * });
 * ```
 */
export interface ChartInteractionDetail {
  /** The chart the interaction happened in. */
  chart: Element;
  /** The element from your markup, e.g. the `<dc-bar>`. Null if the shape has no backing element. */
  element: Element | null;
  /** The element's label, or '' if unlabelled. */
  label: string;
  /** The element's value. Null for shapes that carry no value, such as a whole line. */
  value: number | null;
  /**
   * Share of the chart total, as a decimal (0.38 means 38%), matching the
   * library's percent convention. Null when a share is undefined - a zero total,
   * or a shape for which it is meaningless.
   */
  percent: number | null;
  /** Index of the element among its siblings. */
  index: number;
  /** For nested shapes - the parent line or stacked bar. Null at the top level. */
  seriesLabel: string | null;
  /** Index of the parent series, or null at the top level. */
  seriesIndex: number | null;
  /** The DOM event behind this, when there was one. */
  originalEvent: MouseEvent | null;
}

/**
 * Payload of the `dc-render` event, fired after each successful render.
 */
export interface ChartRenderDetail {
  chart: Element;
  /** Number of data elements drawn. */
  count: number;
}

declare global {
  /**
   * Types the chart events so `addEventListener` infers `event.detail`
   * without a cast.
   */
  interface HTMLElementEventMap {
    'dc-click': CustomEvent<ChartInteractionDetail>;
    'dc-mouseenter': CustomEvent<ChartInteractionDetail>;
    'dc-mouseleave': CustomEvent<ChartInteractionDetail>;
    'dc-render': CustomEvent<ChartRenderDetail>;
  }
}

export type LogLevel = 'error' | 'warning' | 'info';

/**
 * Represents a focusable element within a chart for keyboard navigation.
 * Used by the roving tabindex pattern to manage focus between chart elements.
 */
export interface FocusableElement {
  /** Unique index for this element (used for data-shape-index) */
  index: number;
  /** Human-readable label for screen readers */
  label: string;
  /** Whether this element has an associated action (href, popup, etc.) */
  hasAction: boolean;
  /** Optional href for link elements */
  href?: string;
  /** Optional popup trigger type */
  popupTrigger?: 'hover' | 'click';
}

/**
 * A single log entry captured during chart rendering.
 */
export interface LogEntry {
  /** Severity level of the log message */
  level: LogLevel;
  /** Dotted path identifying what was calculated (e.g., "padding.left", "slices[0].startAngle") */
  path: string;
  /** Human-readable description of the calculation or message */
  message: string;
  /** The computed value (optional) */
  value?: unknown;
  /** Error code for structured warnings/errors (e.g., "DC001") */
  code?: string;
}


/**
 * Base class for chart components with popup support
 */
export abstract class BaseChart extends LitElement {
  @property({ type: Number })
  width = 600;

  @property({ type: Number })
  height = 400;

  /**
   * Enable entry animations when the chart first renders.
   *
   * - `animations` or `animations="true"` - Enable with default 300ms duration
   * - `animations="500ms"` or `animations="0.5s"` - Enable with custom duration
   * - `animations="false"` - Explicitly disable animations
   *
   * Animations automatically respect the user's `prefers-reduced-motion` setting.
   *
   * @example
   * ```html
   * <dc-chart animations>...</dc-chart>
   * <dc-chart animations="500ms">...</dc-chart>
   * ```
   */
  @property({ type: String, reflect: true })
  animations?: string;

  /** Track whether entry animation has been played */
  private _hasAnimated = false;

  // ============================================================================
  // Popup State
  //
  // The work lives in PopupController (see src/popup-controller.ts); these keep
  // the API render() and every chart subclass already use. They were `@state()`
  // fields, so assignment re-rendered - the controller's setters preserve that.
  // Do not turn them back into plain fields.
  // ============================================================================

  /** HTML content of the popup. */
  protected get popupContent(): string {
    return this.popups.content;
  }

  protected set popupContent(value: string) {
    this.popups.content = value;
  }

  /** Popup left edge, in pixels relative to this element. */
  protected get popupX(): number {
    return this.popups.x;
  }

  protected set popupX(value: number) {
    this.popups.x = value;
  }

  /** Popup top edge, in pixels relative to this element. */
  protected get popupY(): number {
    return this.popups.y;
  }

  protected set popupY(value: number) {
    this.popups.y = value;
  }

  /** Whether the popup is currently showing. Read by all four chart types. */
  protected get popupVisible(): boolean {
    return this.popups.visible;
  }

  protected set popupVisible(value: boolean) {
    this.popups.visible = value;
  }

  /**
   * Default padding percentage used when no padding is specified.
   * This is a percentage of the chart's width (for left/right) or height (for top/bottom).
   */
  protected readonly DEFAULT_PADDING_PERCENT = 5;

  /**
   * Shorthand padding attribute following CSS syntax.
   * Values can be pixels (unitless or with "px") or percentages (with "%"):
   * - Unitless: treated as pixels (e.g., "60" = 60px)
   * - With px: explicit pixels (e.g., "60px")
   * - With %: percentage of chart dimensions (e.g., "12%")
   * Pixel values are converted to percentages based on chart dimensions.
   * Default is 12% on all sides.
   */
  @property({ type: String })
  padding?: string;

  /** Top padding in pixels (e.g., "60" or "60px") or percentage (e.g., "12%") */
  @property({ type: String, attribute: 'padding-top' })
  paddingTop?: string;

  /** Right padding in pixels (e.g., "60" or "60px") or percentage (e.g., "12%") */
  @property({ type: String, attribute: 'padding-right' })
  paddingRight?: string;

  /** Bottom padding in pixels (e.g., "60" or "60px") or percentage (e.g., "12%") */
  @property({ type: String, attribute: 'padding-bottom' })
  paddingBottom?: string;

  /** Left padding in pixels (e.g., "60" or "60px") or percentage (e.g., "12%") */
  @property({ type: String, attribute: 'padding-left' })
  paddingLeft?: string;

  /**
   * Controls logging level for capturing calculation details during rendering.
   * - 'false': No logging at all
   * - 'error': Only errors (calculation failures, invalid inputs)
   * - 'warning' (default): Warnings and errors (fallbacks used, deprecated attributes)
   * - 'info' or 'true': All messages including derivation details
   *
   * Defaults to 'warning' so that misconfiguration is visible. It used to be
   * 'false', which meant a chart could silently draw the wrong thing: a typo in
   * `palette` fell back to generated colours, an unparseable value became 0, and
   * the DC-coded warning explaining why went nowhere. Silent misconfiguration is
   * the worst failure mode for a declarative API, because the markup *looks*
   * right.
   *
   * The verbose derivation logging stays off at this level, so the performance
   * characteristics of the default are unchanged.
   */
  @property({ type: String })
  logging: 'false' | 'error' | 'warning' | 'info' | 'true' = 'warning';

  /**
   * Controls which log messages are also echoed to the browser console.
   * - 'none': No console output
   * - 'error': Echo errors to console.error()
   * - 'warning' (default): Echo warnings and errors to console.warn()/error()
   * - 'info': Echo all messages to console.log()/warn()/error()
   *
   * A message must first pass the `logging` level filter before this one is
   * applied, so `console-log` can only narrow what `logging` captured. To see
   * derivation details in DevTools, set both: `logging="info" console-log="info"`.
   *
   * Set `console-log="none"` to silence a chart you know is misconfigured, or
   * `logging="false"` to switch the whole system off.
   */
  @property({ type: String, attribute: 'console-log' })
  consoleLog: 'none' | 'error' | 'warning' | 'info' = 'warning';

  /**
   * Log entries captured during the last render cycle.
   * Cleared at the start of each render.
   *
   * The array lives on {@link logger}; this stays a writable protected accessor
   * because it was a writable protected field before the extraction.
   */
  protected get logEntries(): LogEntry[] {
    return this.logger.entries;
  }

  protected set logEntries(value: LogEntry[]) {
    this.logger.entries = value;
  }

  /**
   * Whether to show numeric values on chart elements.
   * Can be: true, false, a value threshold (e.g., "100"), or a percent threshold (e.g., "5%")
   * Default varies by chart type. Can be overridden per element.
   */
  @property({ attribute: 'show-value', converter: showConditionConverter })
  showValue: ShowCondition = true;

  /**
   * Whether to show labels on chart elements.
   * Can be: true, false, a value threshold (e.g., "100"), or a percent threshold (e.g., "5%")
   * Default varies by chart type. Can be overridden per element.
   */
  @property({ attribute: 'show-label', converter: showConditionConverter })
  showLabel: ShowCondition = true;

  /**
   * Whether to show percentage values on chart elements.
   * Can be: true, false, a value threshold (e.g., "100"), or a percent threshold (e.g., "5%")
   * Default: false. Can be overridden per element.
   */
  @property({ attribute: 'show-percent', converter: showConditionConverter })
  showPercent: ShowCondition = false;

  // ============================================================================
  // Label Positioning Properties
  // ============================================================================

  /**
   * Default position for labels on chart elements.
   * Valid values depend on element type:
   * - Bars: "outside", "inside-top", "inside-center", "inside-bottom", "outside-top", "outside-bottom"
   * - Points: "above", "above-left", "above-right", "below", "below-left", "below-right", "left", "right", "center"
   * - Bubbles: Same as points, plus "inside"
   * - Pie slices: "inside", "outside"
   * - Funnel/Stage: "inside", "outside-left", "outside-right"
   * - Stage chart: Also supports "above", "below"
   * Can be overridden per element.
   */
  @property({ type: String, attribute: 'label-position' })
  labelPosition?: string;

  /**
   * Horizontal offset for labels in viewBox units.
   * Positive values move right, negative values move left.
   * Can be overridden per element.
   */
  @property({ type: Number, attribute: 'label-offset-x' })
  labelOffsetX?: number;

  /**
   * Vertical offset for labels in viewBox units.
   * Positive values move down (SVG convention), negative values move up.
   * Can be overridden per element.
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
   * Can be overridden per element.
   */
  @property({ type: Number, attribute: 'label-offset-r' })
  labelOffsetR?: number;

  /**
   * Fill color for labels (SVG text fill).
   * - "auto" (default): Automatically calculate based on background
   *   - Inside shapes: Contrast against shape fill color
   *   - Outside shapes: Use dark text (#333) for light backgrounds
   * - Any CSS color: Use the specified color
   * Can be overridden per element.
   */
  @property({ type: String, attribute: 'label-fill' })
  labelFill?: string;

  // ============================================================================
  // Number Formatting Properties
  // ============================================================================

  /**
   * Format for numeric values displayed on chart elements.
   * Supports named presets with compound syntax or d3-format subset.
   *
   * Presets:
   * - "number" or "number N" - Fixed decimals with grouping (default: 2)
   * - "integer" - Whole numbers with grouping
   * - "compact" or "compact N" - SI prefix (K, M, B) with N significant digits
   * - "currency CODE" - Locale-aware currency (e.g., "currency USD")
   * - "percent" or "percent N" - Percentage with N decimals
   *
   * d3-format subset:
   * - ",.2f" - Grouping with 2 decimals
   * - "$,.0f" - Dollar prefix with grouping
   * - ".1s" - SI prefix with 1 significant digit
   * - ".1%" - Percentage with 1 decimal
   */
  @property({ type: String, attribute: 'value-format' })
  valueFormat: string = 'number';

  /**
   * Format for percentage values displayed on chart elements.
   * Uses the same format syntax as value-format.
   * Default: "percent 1" (e.g., "45.6%")
   */
  @property({ type: String, attribute: 'percent-format' })
  percentFormat: string = 'percent 1';

  /**
   * Locale for number formatting (e.g., "en-US", "de-DE", "fr-FR").
   * Affects thousand separators, decimal separators, and currency formatting.
   * Default: browser's navigator.language
   */
  @property({ type: String })
  locale?: string;

  /**
   * Cached NumberFormatter instance.
   * Invalidated when locale changes.
   */
  private _formatter: NumberFormatter | null = null;

  // ============================================================================
  // Color System Properties
  // ============================================================================

  /**
   * Stroke width for all elements (in pixels).
   * Can also be set via the stroke shorthand (e.g., stroke="2 #333").
   */
  @property({ type: Number, attribute: 'stroke-width' })
  strokeWidth?: number;

  /**
   * Shorthand for stroke color and width (e.g., "2 #333" or "#333 2").
   * Parses to extract stroke-width and stroke-color.
   * Individual stroke-width and stroke-color attributes take precedence.
   */
  @property({ type: String })
  stroke?: string;

  /**
   * Palette for chart colors. Can be:
   * - ID of a user-defined <dc-palette> element in the document
   * - Name of a built-in palette (e.g., "category10", "viridis", "cool-to-warm")
   *
   * User-defined palettes take precedence over built-in palettes with the same name.
   *
   * For user-defined palettes, colors are matched by:
   * 1. Value range (min-value/max-value on <dc-fill> elements)
   * 2. Label matching (label attribute on <dc-fill> elements)
   * 3. Index order (first unmatched element gets first color, etc.)
   *
   * For built-in palettes, colors are assigned by index order.
   *
   * Available built-in palettes:
   * - Categorical: default, category10, pastel, vivid, earth, ocean, colorblind-safe, high-contrast
   * - Sequential: cool-to-warm, blues, greens, reds, purples, warm, cool, sunset, viridis
   * - Diverging: red-blue, brown-teal, purple-orange
   *
   * Priority order for color resolution:
   * 1. Element's own fill/stroke attributes (explicit override)
   * 2. Palette match by value range (user-defined palettes only)
   * 3. Palette match by label (user-defined palettes only)
   * 4. Palette colors by index
   * 5. Auto-generated colors
   *
   * @attr palette
   */
  @property({ type: String, attribute: 'palette' })
  paletteId?: string;

  /**
   * Enable high contrast mode for accessibility.
   *
   * When enabled (or auto-detected via OS setting):
   * - Each data element gets a unique pattern for differentiation
   * - Colors are replaced with high-contrast WCAG AA compliant colors
   * - Stroke widths are increased for better visibility
   *
   * The chart will look for a child `<dc-palette high-contrast>` to use
   * custom high-contrast colors. If not found, built-in high-contrast
   * colors are used.
   *
   * Values:
   * - undefined (default): Auto-detect from OS `prefers-contrast: high`
   * - true: Force high contrast mode on
   * - false: Force high contrast mode off
   *
   * @attr high-contrast
   */
  @property({ type: Boolean, attribute: 'high-contrast' })
  highContrast?: boolean;

  // ============================================================================
  // Pattern System Properties
  // ============================================================================

  /**
   * Counter for generating unique chart instance IDs.
   * Used to create unique pattern IDs to avoid conflicts between multiple charts.
   */
  private static chartIdCounter = 0;

  /**
   * Unique ID for this chart instance.
   * Format: "dc-chart-N" where N is a sequential number.
   * Used as prefix for pattern IDs in the SVG <defs> section.
   */
  protected readonly chartInstanceId = `dc-chart-${++BaseChart.chartIdCounter}`;

  /**
   * Patterns used in the current render cycle.
   * Maps pattern ID to resolved pattern configuration.
   * Cleared at the start of each render, populated during data extraction.
   */
  protected usedPatterns: Map<string, ResolvedPattern> = new Map();

  // ============================================================================
  // End Color System Properties
  // ============================================================================

  // ============================================================================
  // Auto Popup Properties
  // ============================================================================

  /**
   * Whether to automatically show a default popup when hovering over chart elements.
   * When true, a standard popup showing label, value, and percentage is displayed.
   * Can be overridden per element using the auto-popup attribute on individual shapes.
   * If an element has an explicit <dc-popup> child, that takes precedence over auto-popup.
   *
   * @attr auto-popup
   */
  @property({ type: Boolean, attribute: 'auto-popup' })
  autoPopup = false;

  // ============================================================================
  // End Auto Popup Properties
  // ============================================================================

  // ============================================================================
  // Accessibility Properties
  // ============================================================================

  /**
   * Custom accessible label for the chart.
   * When provided, overrides the auto-generated label.
   * Used as the aria-label on the SVG element.
   *
   * @attr aria-label
   */
  @property({ type: String, attribute: 'aria-label' })
  override ariaLabel: string | null = null;

  // ============================================================================
  // Keyboard Navigation State
  // ============================================================================

  // Focus state moved to KeyboardNavController; BaseChart exposes it through
  // protected getters further down, since all four chart types read it when
  // drawing their focus indicator.

  /**
   * Custom accessible description for the chart.
   * When provided, overrides the auto-generated description including insights.
   * Used in the SVG's <desc> element.
   *
   * @attr aria-description
   */
  @property({ type: String, attribute: 'aria-description' })
  override ariaDescription: string | null = null;

  /**
   * Controls the level of auto-generated insights in accessibility descriptions.
   * - 'auto' (default): Full statistical analysis with meaningful descriptions
   * - 'basic': Just raw statistics (e.g., "4 bars, values 68-91")
   * - 'none': No auto-generated description (only use explicit aria-description)
   *
   * @attr aria-insights
   */
  @property({ type: String, attribute: 'aria-insights' })
  ariaInsights: 'auto' | 'basic' | 'none' = 'auto';

  /**
   * Counter for generating unique IDs for accessibility elements.
   * Shared across all chart instances.
   */
  private static accessibilityIdCounter = 0;

  /**
   * Unique ID for this chart's description element.
   * Generated once per instance.
   */
  private readonly descriptionId = `dc-desc-${++BaseChart.accessibilityIdCounter}`;

  // ============================================================================
  // End Accessibility Properties
  // ============================================================================

  /**
   * Evaluate a ShowCondition against a value and percent.
   *
   * @param condition The show condition (boolean or threshold)
   * @param value The numeric value of the element
   * @param percent The percentage of the element (0-100)
   * @returns true if the element should be shown, false otherwise
   */
  protected evaluateShowCondition(
    condition: ShowCondition,
    value: number,
    percent: number
  ): boolean {
    if (typeof condition === 'boolean') {
      return condition;
    }
    if (condition.type === 'percent') {
      return percent >= condition.threshold;
    }
    // condition.type === 'value'
    return value >= condition.threshold;
  }

  // ============================================================================
  // Number Formatting Methods
  // ============================================================================

  /**
   * Get or create the NumberFormatter for this chart.
   * The formatter is cached and recreated when locale changes.
   */
  getFormatter(): NumberFormatter {
    if (!this._formatter) {
      this._formatter = new NumberFormatter({
        locale: this.locale,
      });
    }
    return this._formatter;
  }

  /**
   * Invalidate the cached formatter when locale changes.
   * Called by Lit when observed properties change.
   */
  protected willUpdate(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('locale')) {
      this._formatter = null;
    }
    this.renderCache.clear();
  }

  /**
   * Memoized results for the current render pass. Cleared in willUpdate(), so it
   * lives from the start of one update until the start of the next.
   */
  private renderCache = new Map<string, unknown>();

  /**
   * Memoize an expensive derivation for the duration of one render pass.
   *
   * Charts derive their data by querying the DOM, and several of those
   * derivations are reachable from inside per-element loops. Left uncached, a
   * chart with n elements would call an O(n) derivation n times: rendering 400
   * bars once produced 2,900,800 calls to extractBarData and 482,406 text
   * measurements, which is where the render's quadratic cost came from.
   *
   * Deliberately outliving render(): event handlers run after the render and use
   * these same derivations, so they see exactly the data that produced what is on
   * screen rather than recomputing it and risking disagreement.
   *
   * Only safe for derivations of the DOM and of reactive properties. Anything
   * depending on state that can change *within* a render pass must not use this.
   */
  protected cachePerRender<T>(key: string, compute: () => T): T {
    if (this.renderCache.has(key)) {
      return this.renderCache.get(key) as T;
    }
    const value = compute();
    this.renderCache.set(key, value);
    return value;
  }

  /**
   * Format a numeric value using the chart's formatter.
   * @param value The number to format
   * @param format Optional format string (defaults to chart's valueFormat)
   */
  formatValue(value: number, format?: string): string {
    return this.getFormatter().format(value, format ?? this.valueFormat);
  }

  /**
   * Format a percentage value using the chart's formatter.
   * Note: The value should be a decimal (0.456 = 45.6%), not 0-100.
   * @param percent The percentage as a decimal (0-1 range)
   * @param format Optional format string (defaults to chart's percentFormat)
   */
  formatPercent(percent: number, format?: string): string {
    return this.getFormatter().format(percent, format ?? this.percentFormat);
  }

  /**
   * Format a value string based on show-value and show-percent settings.
   *
   * Logic:
   * - Both false: returns null (nothing to display)
   * - show-value only: returns the formatted value
   * - show-percent only: returns the formatted percentage
   * - Both true: returns "value (percent)"
   *
   * @param value The numeric value
   * @param percent The percentage value (0-100 scale for backward compatibility)
   * @param showValue Whether to show the value (after threshold evaluation)
   * @param showPercent Whether to show the percentage (after threshold evaluation)
   * @param elementFormat Optional per-element format override
   * @returns Formatted string or null if nothing should be displayed
   */
  protected formatValueString(
    value: number,
    percent: number,
    showValue: boolean,
    showPercent: boolean,
    elementFormat?: string
  ): string | null {
    if (!showValue && !showPercent) {
      return null;
    }

    const formattedValue = showValue
      ? this.formatValue(value, elementFormat)
      : '';

    // Convert percent from 0-100 to 0-1 for the formatter
    const formattedPercent = showPercent
      ? this.formatPercent(percent / 100)
      : '';

    if (showValue && showPercent) {
      return `${formattedValue} (${formattedPercent})`;
    }
    if (showValue) {
      return formattedValue;
    }
    // showPercent only
    return formattedPercent;
  }

  /**
   * Sentinel value indicating "auto" padding mode.
   * When a padding side is set to "auto", the actual value will be calculated
   * based on legend dimensions (if present) or default to 12%.
   */
  protected static readonly AUTO_PADDING_SENTINEL = -1;

  /**
   * Parse a padding value to a percentage.
   * Follows CSS conventions where unitless values are treated as pixels:
   * - "auto": returns AUTO_PADDING_SENTINEL (-1) to indicate auto-calculation
   * - Plain numbers: treated as pixels (e.g., "60" = 60px, converted to percentage)
   * - With px suffix: explicit pixels (e.g., "60px", converted to percentage)
   * - With % suffix: explicit percentage (e.g., "12%" = 12%)
   * @param value The padding value string to parse
   * @param referenceDimension The chart dimension (width or height) for px-to-percent conversion
   * @returns The percentage value (0-100 scale), AUTO_PADDING_SENTINEL for "auto", or undefined if parsing fails
   */
  protected parsePaddingValue(value: string, referenceDimension: number): number | undefined {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === '') return undefined;

    // Check for "auto" keyword
    if (trimmed === 'auto') {
      return BaseChart.AUTO_PADDING_SENTINEL;
    }

    // Check for explicit % suffix - use as percentage directly
    if (trimmed.endsWith('%')) {
      const percent = parseFloat(trimmed);
      if (!isNaN(percent)) {
        return percent;
      }
      return undefined;
    }

    // Check for explicit px suffix - convert to percentage
    if (trimmed.endsWith('px')) {
      const pixels = parseFloat(trimmed);
      if (!isNaN(pixels) && referenceDimension > 0) {
        return (pixels / referenceDimension) * 100;
      }
      return undefined;
    }

    // Unitless number: treat as pixels (CSS convention), convert to percentage
    const pixels = parseFloat(trimmed);
    if (!isNaN(pixels) && referenceDimension > 0) {
      return (pixels / referenceDimension) * 100;
    }

    return undefined;
  }

  /**
   * Canvas context used for text measurement (cached for performance)
   */
  private _measureCanvas: CanvasRenderingContext2D | null = null;

  /**
   * Get or create a canvas context for text measurement
   */
  private getMeasureContext(): CanvasRenderingContext2D | null {
    if (!this._measureCanvas) {
      const canvas = document.createElement('canvas');
      this._measureCanvas = canvas.getContext('2d');
    }
    return this._measureCanvas;
  }

  /**
   * Measure the width of text using Canvas API
   * @param text The text to measure
   * @param fontSize Font size in pixels (default: 12)
   * @param fontFamily Font family (default: computed from element or 'sans-serif')
   * @returns The width of the text in pixels
   */
  protected measureText(text: string, fontSize: number = 12, fontFamily?: string): number {
    // Measuring the same string at the same size always gives the same answer,
    // and label-fitting asks repeatedly. getComputedStyle() below is itself a
    // layout read, so this cache avoids more than the canvas call.
    return this.cachePerRender(`text:${fontSize}:${fontFamily ?? ''}:${text}`, () => {
      const ctx = this.getMeasureContext();
      if (!ctx) {
        // Fallback to estimation if canvas not available
        return text.length * fontSize * 0.6;
      }

      let family = fontFamily;
      // If no font family specified, try to get computed style from this element
      if (!family) {
        const computedStyle = window.getComputedStyle(this);
        family = computedStyle.fontFamily || 'sans-serif';
      }

      ctx.font = `${fontSize}px ${family}`;
      return ctx.measureText(text).width;
    });
  }

  // ============================================================================
  // Logging System
  //
  // The work lives in ChartLogger; these thin wrappers keep the API that
  // subclasses, <dc-log-console> and the other controllers already call.
  // See src/chart-logger.ts.
  // ============================================================================

  private _logger?: ChartLogger;

  /**
   * Diagnostics for this chart: capture, console echo, filtering, formatting.
   *
   * Built with an explicit adapter rather than passing `this`, for the same
   * reason as {@link colors}: several members it needs are not public. The
   * getters keep `logging` and `console-log` live, so changing either attribute
   * takes effect on the next message.
   *
   * `getTitle` and `log` are forwarded back to the chart on purpose - both are
   * `protected` extension points that subclasses override, and having the logger
   * call its own copies would sever those overrides silently.
   */
  protected get logger(): ChartLogger {
    if (!this._logger) {
      const chart = this;
      this._logger = new ChartLogger({
        get logging() { return chart.logging; },
        get consoleLog() { return chart.consoleLog; },
        get tagName() { return chart.tagName; },
        get id() { return chart.id; },
        getTitle: () => chart.getTitle(),
        log: (level, path, message, value, code) => chart.log(level, path, message, value, code),
        shouldLog: (level) => chart.shouldLog(level),
        shouldEchoToConsole: (level) => chart.shouldEchoToConsole(level),
        getConsoleIdentifier: () => chart.getConsoleIdentifier()
      });
    }
    return this._logger;
  }

  /**
   * Check if a log message at the given level should be captured.
   * @param level The level of the message to check
   * @returns true if the message should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return this.logger.shouldLog(level);
  }

  /**
   * Check if a log message at the given level should be echoed to browser console.
   * @param level The level of the message to check
   * @returns true if the message should be echoed to console
   */
  private shouldEchoToConsole(level: LogLevel): boolean {
    return this.logger.shouldEchoToConsole(level);
  }

  /**
   * Get a human-readable identifier for this chart for console output.
   * Priority: id attribute > title text > tag name only
   * @returns Identifier string like "dc-chart#my-id" or "dc-chart \"Sales\""
   */
  private getConsoleIdentifier(): string {
    // The try/catch is not redundant with the one inside ChartLogger. This label
    // is cosmetic and must never be the reason a render fails, and reaching the
    // logger at all needs a real chart instance - an object that was never
    // upgraded from markup has no `_logger` and no accessors, so the delegation
    // itself is what throws.
    try {
      return this.logger.getConsoleIdentifier();
    } catch {
      return 'chart';
    }
  }

  /**
   * Log a message during chart rendering.
   * Messages are captured in logEntries and can be retrieved via getLogEntries().
   * Only logs if the logging attribute is set to an appropriate level.
   * Optionally echoes to browser console based on console-log attribute.
   *
   * @param level Severity level: 'info', 'warning', or 'error'
   * @param path Dotted path identifying what was calculated (e.g., "padding.left", "slices[0].angle")
   * @param message Human-readable description of the calculation or issue
   * @param value Optional computed value
   * @param code Optional error code (e.g., "DC001")
   */
  protected log(level: LogLevel, path: string, message: string, value?: unknown, code?: string): void {
    this.logger.log(level, path, message, value, code);
  }

  /**
   * Log a structured error/warning using an ErrorDefinition.
   * This is the preferred method for logging warnings and errors as it ensures
   * consistent error codes and message formatting.
   *
   * @param error The error definition from ErrorCode registry
   * @param values Placeholder values to substitute in the message template
   * @param value Optional computed value to include in the log
   *
   * @example
   * this.logError(ErrorCode.DATA_EMPTY, {
   *   chartType: 'Chart',
   *   expectedElements: 'dc-bar, dc-line, or dc-bubble children'
   * });
   */
  protected logError(
    error: ErrorDefinition,
    values: Record<string, string | number | undefined> = {},
    value?: unknown
  ): void {
    this.logger.logError(error, values, value);
  }

  /**
   * Get all log entries from the last render cycle.
   * This method is intended for use by dc-log-console or programmatic access.
   * @returns Array of log entries in the order they were captured
   */
  public getLogEntries(): LogEntry[] {
    return this.logger.getLogEntries();
  }

  /**
   * Clear all log entries. Called automatically at the start of each render.
   * Also closes any open console group from the previous render cycle.
   */
  protected clearLog(): void {
    this.logger.clearLog();
  }

  // ============================================================================
  // Color System Utilities
  // ============================================================================

  // ============================================================================
  // Color System Utilities
  //
  // The work lives in ColorResolver; these thin wrappers keep the API that
  // subclasses already call. See src/color-resolver.ts.
  // ============================================================================

  private _colors?: ColorResolver;

  /**
   * Colour resolution for this chart.
   *
   * Built with an explicit adapter rather than passing `this`. Two of the things
   * the resolver needs - `log` and `getMeasureContext` - are not public, and
   * widening them just to satisfy a structural interface would enlarge the very
   * API this extraction is meant to shrink. The getters keep the values live, so
   * changing `palette` still takes effect.
   */
  protected get colors(): ColorResolver {
    if (!this._colors) {
      const chart = this;
      this._colors = new ColorResolver({
        get paletteId() { return chart.paletteId; },
        get highContrast() { return chart.highContrast ?? false; },
        get stroke() { return chart.stroke ?? ''; },
        get strokeWidth() { return chart.strokeWidth; },
        get chartInstanceId() { return chart.chartInstanceId; },
        querySelector: (selectors: string) => chart.querySelector(selectors),
        getMeasureContext: () => chart.getMeasureContext(),
        log: (level, path, message, value) => chart.log(level, path, message, value),
        logError: (code, params, value) => chart.logError(code, params, value)
      });
    }
    return this._colors;
  }

  protected getPalette(): ChartPalette | null {
    return this.colors.getPalette();
  }

  protected lookupPaletteColor(label?: string, value?: number): PaletteColorResult {
    return this.colors.lookupPaletteColor(label, value);
  }

  protected isHighContrastActive(): boolean {
    return this.colors.isHighContrastActive();
  }

  protected getHighContrastPalette(): ChartPalette | null {
    return this.colors.getHighContrastPalette();
  }

  protected getHighContrastColors(count: number): string[] {
    return this.colors.getHighContrastColors(count);
  }

  protected parseColor(color: string): [number, number, number] | null {
    return this.colors.parseColor(color);
  }

  protected getLuminance(color: string): number {
    return this.colors.getLuminance(color);
  }

  protected getContrastingTextColor(bgColor: string): string {
    // Deliberately routed through this.getLuminance() rather than straight to
    // the resolver, so a subclass overriding getLuminance still changes the
    // contrast decision - the behaviour before the extraction.
    return this.colors.contrastForLuminance(this.getLuminance(bgColor));
  }

  protected calculateLabelFill(
    explicitFill: string | undefined,
    isInsideShape: boolean,
    shapeFill: string,
    chartBackground = '#ffffff'
  ): string {
    return this.colors.calculateLabelFill(explicitFill, isInsideShape, shapeFill, chartBackground);
  }

  protected generatePaletteColors(count: number, seed?: number): string[] {
    return this.colors.generatePaletteColors(count, seed);
  }

  protected resolveColors(count: number, options: ColorResolutionOptions = {}): string[] {
    return this.colors.resolveColors(count, options);
  }

  protected resolveFillColors(
    count: number,
    elementColors?: (string | undefined)[],
    paletteColors?: string[],
    defaultColor?: string
  ): string[] {
    return this.colors.resolveFillColors(count, elementColors, paletteColors, defaultColor);
  }

  protected resolveStrokeColors(
    count: number,
    elementColors?: (string | undefined)[],
    paletteColors?: string[],
    defaultColor?: string
  ): string[] {
    return this.colors.resolveStrokeColors(count, elementColors, paletteColors, defaultColor);
  }

  protected getPaletteColors(count: number, colorType: 'fill' | 'stroke' = 'fill'): string[] | undefined {
    return this.colors.getPaletteColors(count, colorType);
  }

  protected resolveFillColorsWithPalette(
    elements: Array<{ fill?: string; label?: string; value?: number }>,
    defaultColor?: string
  ): string[] {
    return this.colors.resolveFillColorsWithPalette(elements, defaultColor);
  }

  protected resolveStrokeColorsWithPalette(
    elements: Array<{ stroke?: string; label?: string; value?: number }>,
    defaultColor?: string
  ): string[] {
    return this.colors.resolveStrokeColorsWithPalette(elements, defaultColor);
  }

  protected parseStroke(): { color?: string; width?: number } {
    return this.colors.parseStroke();
  }

  protected getEffectiveStroke(defaultColor = '#e0e0e0', defaultWidth = 1): { color: string; width: number } {
    return this.colors.getEffectiveStroke(defaultColor, defaultWidth);
  }

  // ============================================================================
  // High Contrast and Pattern Methods
  // ============================================================================

  /**
   * Clear used patterns at the start of each render cycle.
   */
  protected clearUsedPatterns(): void {
    this.usedPatterns = new Map();
  }

  /**
   * Register a pattern for use and return its fill URL reference.
   *
   * @param config The pattern configuration
   * @param fillColor The fill color to use as pattern fill (if not specified in config)
   * @param index Element index for unique pattern ID
   * @returns Object with patternId and fillUrl for SVG rendering
   */
  protected registerPattern(
    config: PatternConfig,
    fillColor: string,
    index: number
  ): { patternId: string; fillUrl: string } {
    const patternId = generatePatternId(this.chartInstanceId, config.type, index);

    // Determine stroke and fill colors
    const stroke = config.stroke || this.getContrastingTextColor(config.fill || fillColor);
    const fill = config.fill || fillColor;

    const resolved: ResolvedPattern = {
      id: patternId,
      type: config.type,
      stroke,
      fill,
      scale: config.scale || 1
    };

    this.usedPatterns.set(patternId, resolved);

    return {
      patternId,
      fillUrl: `url(#${patternId})`
    };
  }

  /**
   * Resolve a pattern attribute value to a PatternConfig.
   *
   * The pattern attribute can be:
   * - A built-in pattern type name (e.g., "diagonal-lines", "dots")
   * - An ID reference to a <dc-pattern> element
   *
   * @param patternAttr The pattern attribute value
   * @param elementStroke Optional stroke color override from element
   * @param elementFill Optional fill color override from element
   * @param elementScale Optional scale override from element
   * @returns PatternConfig if valid, null otherwise
   */
  protected resolvePatternAttribute(
    patternAttr: string | undefined,
    elementStroke?: string,
    elementFill?: string,
    elementScale?: number
  ): PatternConfig | null {
    if (!patternAttr) return null;

    // Check if it's a built-in pattern type
    if (isPatternType(patternAttr)) {
      return {
        type: patternAttr,
        stroke: elementStroke || '#000',
        fill: elementFill,
        scale: elementScale
      };
    }

    // Try to find a <dc-fill> element by ID
    const fillEl = document.getElementById(patternAttr) as ChartFill | null;
    if (fillEl?.tagName.toLowerCase() === 'dc-fill' && fillEl.hasPattern()) {
      return {
        type: fillEl.pattern!,
        stroke: elementStroke || fillEl.stroke || '#000',
        fill: elementFill || fillEl.fill,
        scale: elementScale ?? fillEl.scale
      };
    }

    this.logError(ErrorCode.PATTERN_NOT_FOUND, { id: patternAttr });
    return null;
  }

  /**
   * Resolve fills and patterns for chart elements with high contrast support.
   *
   * Priority order:
   * 1. Element's own pattern attribute → use pattern with element's fill
   * 2. Palette pattern match → use matched pattern
   * 3. High contrast mode active → use high-contrast colors + auto-assign patterns
   * 4. Normal color resolution → solid fill, no pattern
   *
   * @param elements Array of element info objects
   * @param defaultColor Default fill color if nothing else is specified
   * @returns Array of resolved fill and pattern info
   */
  protected resolveFillsWithPatterns(
    elements: Array<{
      fill?: string;
      stroke?: string;
      label?: string;
      value?: number;
      pattern?: string;
      patternStroke?: string;
      patternFill?: string;
      patternScale?: number;
    }>,
    defaultColor?: string
  ): ResolvedFillAndPattern[] {
    const count = elements.length;
    if (count === 0) return [];

    const highContrast = this.isHighContrastActive();
    const results: ResolvedFillAndPattern[] = [];

    // First resolve base fill colors
    // In high contrast mode, use high contrast colors instead of normal resolution
    let fillColors: string[];
    if (highContrast) {
      fillColors = this.getHighContrastColors(count);
    } else {
      fillColors = this.resolveFillColorsWithPalette(
        elements.map(e => ({ fill: e.fill, label: e.label, value: e.value })),
        defaultColor
      );
    }

    for (let i = 0; i < count; i++) {
      const element = elements[i];
      const baseFill = fillColors[i];
      let patternConfig: PatternConfig | null = null;

      // Priority 1: Element's own pattern attribute
      if (element.pattern) {
        patternConfig = this.resolvePatternAttribute(
          element.pattern,
          element.patternStroke,
          element.patternFill,
          element.patternScale
        );
      }

      // Priority 2: Palette pattern match (only if not high contrast, as HC overrides colors)
      if (!patternConfig && !highContrast && this.paletteId) {
        const paletteResult = this.lookupPaletteColor(element.label, element.value);
        if (paletteResult.pattern) {
          patternConfig = paletteResult.pattern;
        }
      }

      // Priority 3: High contrast auto-pattern
      if (!patternConfig && highContrast) {
        const patternType = getHighContrastPattern(i);
        patternConfig = {
          type: patternType,
          stroke: this.getContrastingTextColor(baseFill),
          fill: baseFill,
          scale: 1
        };
      }

      // Apply pattern if we have one
      if (patternConfig) {
        const { fillUrl } = this.registerPattern(patternConfig, baseFill, i);
        results.push({
          fill: fillUrl,
          patternId: patternConfig.type,
          originalFill: baseFill
        });
      } else {
        results.push({
          fill: baseFill,
          originalFill: baseFill
        });
      }
    }

    return results;
  }

  /**
   * Render SVG <defs> section with all used patterns.
   *
   * @returns SVGTemplateResult with <defs> element, or empty if no patterns used
   */
  protected renderDefs(): SVGTemplateResult {
    if (this.usedPatterns.size === 0) {
      return svg``;
    }

    const patternSvgs: string[] = [];
    for (const pattern of this.usedPatterns.values()) {
      const generator = PATTERN_DEFINITIONS[pattern.type];
      if (generator) {
        patternSvgs.push(generator(pattern.id, pattern.stroke, pattern.fill, pattern.scale));
      }
    }

    return svg`<defs>${unsafeSVG(patternSvgs.join(''))}</defs>`;
  }

  // ============================================================================
  // End High Contrast and Pattern Methods
  // ============================================================================

  // ============================================================================
  // End Color System Utilities
  // ============================================================================

  /**
   * Parse the shorthand padding attribute following CSS syntax.
   * For px values, converts to percentage using the appropriate dimension
   * (height for top/bottom, width for left/right).
   * @returns Object with top, right, bottom, left padding values or undefined values
   */
  protected parsePaddingShorthand(): { top?: number; right?: number; bottom?: number; left?: number } {
    if (!this.padding) {
      return {};
    }

    const parts = this.padding.trim().split(/\s+/);

    // Parse each value with the appropriate reference dimension based on position
    // For shorthand, we need to determine which dimension applies to each value
    switch (parts.length) {
      case 1: {
        // Single value: all sides - use height for top/bottom, width for left/right
        // For simplicity with single value, parse twice with different dimensions
        const vertical = this.parsePaddingValue(parts[0], this.height);
        const horizontal = this.parsePaddingValue(parts[0], this.width);
        return { top: vertical, right: horizontal, bottom: vertical, left: horizontal };
      }
      case 2: {
        // Two values: top/bottom (height), left/right (width)
        const vertical = this.parsePaddingValue(parts[0], this.height);
        const horizontal = this.parsePaddingValue(parts[1], this.width);
        return { top: vertical, right: horizontal, bottom: vertical, left: horizontal };
      }
      case 3: {
        // Three values: top (height), left/right (width), bottom (height)
        const top = this.parsePaddingValue(parts[0], this.height);
        const horizontal = this.parsePaddingValue(parts[1], this.width);
        const bottom = this.parsePaddingValue(parts[2], this.height);
        return { top, right: horizontal, bottom, left: horizontal };
      }
      case 4: {
        // Four values: top (height), right (width), bottom (height), left (width)
        const top = this.parsePaddingValue(parts[0], this.height);
        const right = this.parsePaddingValue(parts[1], this.width);
        const bottom = this.parsePaddingValue(parts[2], this.height);
        const left = this.parsePaddingValue(parts[3], this.width);
        return { top, right, bottom, left };
      }
      default:
        return {};
    }
  }

  /**
   * Get legend items for dimension calculation.
   * Override in subclasses to provide chart-specific legend items.
   * Used by getLegendDimensions() when calculating auto padding.
   * @returns Array of legend items or empty array if not applicable
   */
  protected getLegendItems(): LegendItem[] {
    return [];
  }

  /**
   * Get additional padding needed for axis labels and value labels.
   * Override this in chart subclasses that render axes with labels.
   * The returned values are ADDED to the auto-calculated padding.
   *
   * @returns Object with additional padding needed for each side
   */
  protected getAxisLabelPadding(): { top: number; right: number; bottom: number; left: number } {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  /**
   * Get additional vertical offset for bottom-positioned legends.
   * Override this in chart subclasses that need different offsets.
   * Positive values move the legend DOWN.
   *
   * @returns Vertical offset in viewBox units
   */
  protected getBottomLegendOffset(): number {
    return 10;
  }

  /**
   * Check if a specific side's padding is set to "auto".
   * Used by legend column calculations to determine if explicit padding exists.
   * @param side The side to check
   * @returns true if the side uses auto padding, false if explicitly set
   */
  protected isPaddingAuto(side: 'top' | 'right' | 'bottom' | 'left'): boolean {
    const shorthand = this.parsePaddingShorthand();
    const dimension = (side === 'left' || side === 'right') ? this.width : this.height;

    // Check individual property first
    const individualMap = {
      top: this.paddingTop,
      right: this.paddingRight,
      bottom: this.paddingBottom,
      left: this.paddingLeft
    };

    const individualValue = individualMap[side];
    if (individualValue) {
      const parsed = this.parsePaddingValue(individualValue, dimension);
      // If parsed to sentinel, it's auto; otherwise it's explicit
      return parsed === BaseChart.AUTO_PADDING_SENTINEL;
    }

    // Fall back to shorthand
    const shorthandValue = shorthand[side];
    if (shorthandValue !== undefined) {
      return shorthandValue === BaseChart.AUTO_PADDING_SENTINEL;
    }

    // Default is auto
    return true;
  }

  /**
   * Determine which side of the chart a legend position affects.
   * @param position The legend position string
   * @returns The side ('top' | 'right' | 'bottom' | 'left') or null if position doesn't affect any side
   */
  private getLegendSide(position: string): 'top' | 'right' | 'bottom' | 'left' | null {
    switch (position) {
      case 'right':
        return 'right';
      case 'left':
        return 'left';
      case 'top':
      case 'top-left':
      case 'top-right':
        return 'top';
      case 'bottom':
      case 'bottom-left':
      case 'bottom-right':
        return 'bottom';
      default:
        return null;
    }
  }

  /**
   * Get the computed padding values for all sides in viewBox units.
   * Padding values can be:
   * - "auto": calculated based on title/legend dimensions (default)
   * - Percentages or pixels: converted to viewBox units
   * Priority: explicit side properties > shorthand > default ("auto")
   *
   * Auto padding accounts for:
   * - Title dimensions (if title is on that side)
   * - Legend dimensions (if legend is on that side)
   * - Stacking when both title and legend are on the same side (with separator)
   * - Axis label padding (always added, closest to chart content)
   *
   * @returns Object with top, right, bottom, left padding values in viewBox units
   */
  protected getChartPadding(): { top: number; right: number; bottom: number; left: number } {
    return this.cachePerRender('chartPadding', () => this.computeChartPadding());
  }

  private computeChartPadding(): { top: number; right: number; bottom: number; left: number } {
    const shorthand = this.parsePaddingShorthand();

    // Parse individual properties
    const parsedTop = this.paddingTop ? this.parsePaddingValue(this.paddingTop, this.height) : undefined;
    const parsedRight = this.paddingRight ? this.parsePaddingValue(this.paddingRight, this.width) : undefined;
    const parsedBottom = this.paddingBottom ? this.parsePaddingValue(this.paddingBottom, this.height) : undefined;
    const parsedLeft = this.paddingLeft ? this.parsePaddingValue(this.paddingLeft, this.width) : undefined;

    // Determine raw values with priority (explicit > shorthand > auto)
    const topPercent = parsedTop ?? shorthand.top ?? BaseChart.AUTO_PADDING_SENTINEL;
    const rightPercent = parsedRight ?? shorthand.right ?? BaseChart.AUTO_PADDING_SENTINEL;
    const bottomPercent = parsedBottom ?? shorthand.bottom ?? BaseChart.AUTO_PADDING_SENTINEL;
    const leftPercent = parsedLeft ?? shorthand.left ?? BaseChart.AUTO_PADDING_SENTINEL;

    // Get padding area content and axis label padding if any side is auto
    const hasAuto = [topPercent, rightPercent, bottomPercent, leftPercent].some(
      p => p === BaseChart.AUTO_PADDING_SENTINEL
    );
    let paddingContent: ReturnType<typeof this.getPaddingAreaContent> | null = null;
    let axisLabelPadding = { top: 0, right: 0, bottom: 0, left: 0 };
    let titleDims: { width: number; height: number; position: string } | null = null;
    if (hasAuto) {
      paddingContent = this.getPaddingAreaContent();
      axisLabelPadding = this.getAxisLabelPadding();
      titleDims = this.getTitleDimensions();
    }

    // Calculate separator: half the title height, or 10px default if no title
    const separator = titleDims ? titleDims.height / 2 : 10;

    // Helper to get source description for logging
    const getSource = (
      side: 'top' | 'right' | 'bottom' | 'left',
      parsed: number | undefined,
      shorthandVal: number | undefined
    ): string => {
      if (parsed !== undefined) {
        const attrValue = side === 'top' ? this.paddingTop :
                         side === 'right' ? this.paddingRight :
                         side === 'bottom' ? this.paddingBottom : this.paddingLeft;
        return `padding-${side}="${attrValue}"`;
      }
      if (shorthandVal !== undefined) {
        return `padding="${this.padding}" (${side} from shorthand)`;
      }
      return 'default (auto)';
    };

    // Helper to compute final value and log it
    const computeAndLog = (
      side: 'top' | 'right' | 'bottom' | 'left',
      percent: number,
      dimension: number,
      parsed: number | undefined,
      shorthandVal: number | undefined
    ): number => {
      const source = getSource(side, parsed, shorthandVal);

      if (percent === BaseChart.AUTO_PADDING_SENTINEL) {
        const axisExtra = axisLabelPadding[side];
        const defaultPadding = (this.DEFAULT_PADDING_PERCENT / 100) * dimension;
        const basePadding = Math.max(defaultPadding, axisExtra);

        // Get content on this side (title and/or legend)
        const contentOnSide = paddingContent ? paddingContent[side] : [];

        if (contentOnSide.length === 0) {
          // No title or legend on this side - use base padding
          if (axisExtra > defaultPadding) {
            this.log('info', `padding.${side}`, `auto → no content → axisLabelPadding(${axisExtra.toFixed(1)}) > ${this.DEFAULT_PADDING_PERCENT}% = ${basePadding.toFixed(1)}`, basePadding);
          } else {
            this.log('info', `padding.${side}`, `auto → no content → ${this.DEFAULT_PADDING_PERCENT}% of ${dimension} = ${basePadding.toFixed(1)}`, basePadding);
          }
          return basePadding;
        }

        // Calculate total space needed for stacked elements
        const isHorizontalSide = side === 'left' || side === 'right';
        let totalContentSize = 0;
        const contentDetails: string[] = [];

        for (let i = 0; i < contentOnSide.length; i++) {
          const item = contentOnSide[i];
          const itemSize = isHorizontalSide ? item.width : item.height;
          totalContentSize += itemSize;
          contentDetails.push(`${item.type}(${itemSize.toFixed(1)})`);

          // Add separator between elements (not after last one)
          if (i < contentOnSide.length - 1) {
            totalContentSize += separator;
            contentDetails.push(`sep(${separator.toFixed(1)})`);
          }
        }

        // Add trailing margin between chrome elements and chart content when needed.
        // Axis labels naturally provide a buffer, but if there are no axis labels
        // (or very few), we need to add margin to prevent chrome from touching chart content.
        const minBuffer = 10;
        if (axisExtra < minBuffer) {
          const trailingMargin = minBuffer - axisExtra;
          totalContentSize += trailingMargin;
          contentDetails.push(`trailingMargin(${trailingMargin.toFixed(1)})`);
        }

        // Final padding = content + axis labels
        const finalValue = totalContentSize + axisExtra;
        const contentStr = contentDetails.join(' + ');
        this.log('info', `padding.${side}`, `auto → ${contentStr} + axisLabelPadding(${axisExtra.toFixed(1)}) = ${finalValue.toFixed(1)}`, finalValue);
        return finalValue;
      } else {
        // Explicit value (percentage already calculated)
        const finalValue = (percent / 100) * dimension;
        this.log('info', `padding.${side}`, `${source} → ${percent.toFixed(1)}% of ${dimension} = ${finalValue.toFixed(1)}`, finalValue);
        return finalValue;
      }
    };

    return {
      top: computeAndLog('top', topPercent, this.height, parsedTop, shorthand.top),
      right: computeAndLog('right', rightPercent, this.width, parsedRight, shorthand.right),
      bottom: computeAndLog('bottom', bottomPercent, this.height, parsedBottom, shorthand.bottom),
      left: computeAndLog('left', leftPercent, this.width, parsedLeft, shorthand.left)
    };
  }

  /**
   * Every value a theme is likely to want to change is a custom property with a
   * built-in fallback, so `dc-chart { --dc-surface: #111 }` retheme a whole page
   * without touching markup. Custom properties inherit through the shadow
   * boundary, which is what makes theming-from-outside possible at all.
   *
   * `--dc-font-family` is applied to the <svg>, not to <text>. Presentation
   * attributes beat *inherited* values, so an explicit `font-family` on a
   * <dc-title> still wins - the token only supplies the default.
   *
   * Deliberately not tokenised: `fill` on the <svg>. Fill is inherited in SVG,
   * so a rule there would tint every shape that has no explicit fill, not just
   * the text.
   */
  static styles = css`
    :host {
      display: block;
      border: var(--dc-border, 2px solid #ddd);
      padding: var(--dc-padding, 20px);
      background: var(--dc-surface, white);
      border-radius: var(--dc-border-radius, 8px);
      box-shadow: var(--dc-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
      position: relative;
      box-sizing: border-box;
    }

    svg {
      display: block;
      width: 100%;
      height: auto;
      font-family: var(--dc-font-family, inherit);
    }

    /*
     * fit="fill": take the host's height instead of deriving one from the
     * viewBox aspect, so the plot fills a container of any shape. The viewBox is
     * reshaped to match (see applyFit), so nothing is stretched.
     */
    :host([fit='fill']) {
      height: var(--dc-height, 100%);
    }

    :host([fit='fill']) svg {
      height: 100%;
    }

    /* Focus styles for keyboard navigation */
    svg:focus {
      outline: var(--dc-focus-ring, 2px solid #005fcc);
      outline-offset: var(--dc-focus-ring-offset, 2px);
    }

    svg:focus:not(:focus-visible) {
      outline: none;
    }

    svg:focus-visible {
      outline: var(--dc-focus-ring, 2px solid #005fcc);
      outline-offset: var(--dc-focus-ring-offset, 2px);
    }

    .popup {
      position: absolute;
      background: var(--dc-popup-background, rgba(0, 0, 0, 0.9));
      color: var(--dc-popup-color, white);
      padding: var(--dc-popup-padding, 10px 15px);
      border-radius: var(--dc-popup-border-radius, 6px);
      border: var(--dc-popup-border, none);
      font-size: var(--dc-popup-font-size, 14px);
      pointer-events: auto;
      z-index: var(--dc-popup-z-index, 1000);
      box-shadow: var(--dc-popup-shadow, 0 4px 12px rgba(0, 0, 0, 0.3));
      max-width: var(--dc-popup-max-width, 300px);
      opacity: 0;
      transition: opacity var(--dc-popup-transition-duration, 0.2s);
    }

    .popup.visible {
      opacity: 1;
    }

    .popup a {
      color: inherit;
      text-decoration: underline;
    }

    .popup a:hover {
      opacity: 0.8;
    }

    /* Skeleton bars pulse to say "still coming", not "finished and empty". */
    .skeleton rect {
      animation: dc-skeleton-pulse var(--dc-skeleton-duration, 1.4s) ease-in-out infinite;
    }

    @keyframes dc-skeleton-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }

    @media (prefers-reduced-motion: reduce) {
      .popup {
        transition: none;
      }

      .skeleton rect {
        animation: none;
      }
    }
  `;

  /**
   * Emit an interaction event describing the data element the user touched.
   *
   * Dispatched from the author's own element (the `<dc-bar>`, `<dc-slice>`, ...)
   * when there is one, so a listener can be attached directly to it. Those are
   * light-DOM children of the chart, so the event still bubbles to the chart,
   * and `composed` carries it past any outer shadow boundary.
   *
   * `dc-click` is cancelable. Calling `preventDefault()` suppresses the chart's
   * own response - popup and `href` navigation - which is why the originating
   * MouseEvent is cancelled too.
   *
   * @returns false if a listener cancelled the event, in which case the caller
   *          must not perform its default behaviour.
   */
  protected emitInteraction(
    name: 'dc-click' | 'dc-mouseenter' | 'dc-mouseleave',
    detail: Partial<ChartInteractionDetail>,
    originalEvent?: MouseEvent
  ): boolean {
    const full: ChartInteractionDetail = {
      chart: this,
      element: null,
      label: '',
      value: null,
      percent: null,
      index: -1,
      seriesLabel: null,
      seriesIndex: null,
      originalEvent: originalEvent ?? null,
      ...detail
    };

    const target: EventTarget = full.element ?? this;
    const notCancelled = target.dispatchEvent(
      new CustomEvent<ChartInteractionDetail>(name, {
        detail: full,
        bubbles: true,
        composed: true,
        cancelable: name === 'dc-click'
      })
    );

    // Stop the anchor wrapper from navigating when the click was cancelled.
    if (!notCancelled && originalEvent) originalEvent.preventDefault();
    return notCancelled;
  }

  /**
   * Fraction of a total, guarding the zero-total case. Returns null rather than
   * a misleading 0 when there is nothing to take a share of.
   */
  protected shareOf(value: number, total: number): number | null {
    return total > 0 ? Math.abs(value) / total : null;
  }

  /**
   * The loading or empty placeholder, or null when there is a plot to draw.
   */
  protected renderPlaceholder(): SVGTemplateResult | null {
    if (this.loading) return this.renderLoadingState();
    if (this.getDataElementCount() > 0) return null;
    return this.renderEmptyState();
  }

  /**
   * Message shown when there is nothing to plot.
   *
   * Previously this was a blank bordered box: the chart logged DC001 and drew an
   * empty frame, and because diagnostics are off by default the log went
   * nowhere. The reader was left to guess whether the data was empty, still
   * loading, or broken.
   */
  /**
   * Identifies this chart type for the DC001/DC002 diagnostics.
   *
   * Return null to stay silent. Every chart type should provide one: the
   * message names the elements the author probably meant to add, which is the
   * whole value of the warning.
   */
  protected getEmptyStateDiagnostic(): { chartType: string; expectedElements: string } | null {
    return null;
  }

  /**
   * Emit DC001/DC002 for a chart with nothing to draw.
   *
   * Called from the empty-state path rather than from `renderChart()`. When the
   * placeholder was introduced it replaced `renderChart()` entirely, which
   * silently made both codes unreachable - a chart could be empty for the wrong
   * reason and say nothing about it. The visible "No data" message tells a
   * reader something is absent; the warning tells a developer *what* is missing.
   */
  private logEmptyState(): void {
    const info = this.getEmptyStateDiagnostic();
    if (!info) return;

    const hiddenCount = this.countHiddenDataElements();
    if (hiddenCount > 0) {
      this.logError(ErrorCode.DATA_ALL_HIDDEN, {
        chartType: info.chartType,
        count: hiddenCount,
        elementTypes: info.expectedElements
      });
    } else {
      this.logError(ErrorCode.DATA_EMPTY, {
        chartType: info.chartType,
        expectedElements: info.expectedElements
      });
    }
  }

  protected renderEmptyState(): SVGTemplateResult {
    this.logEmptyState();

    const custom = this.querySelector(':scope > dc-empty') as ChartEmpty | null;
    const hidden = this.hasHiddenDataElements();
    const message = custom?.text
      || (hidden ? 'All series are hidden' : 'No data');

    const fill = custom?.fill || 'var(--dc-empty-color, #9ca3af)';
    const fontSize = this.fontSize(custom?.fontSize ?? 14);

    return svg`
      <text
        part="empty"
        class="empty-message"
        x="${this.width / 2}"
        y="${this.height / 2}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="${fontSize}"
        fill="${fill}"
      >${message}</text>
    `;
  }

  /**
   * Skeleton placeholder shown while data is on its way.
   *
   * Bars rather than a spinner: it occupies the same space the chart will, so
   * nothing jumps when the data lands, and it reads as "a chart is coming"
   * rather than "something is happening somewhere".
   */
  protected renderLoadingState(): SVGTemplateResult {
    const padding = this.getChartPadding();
    const plotWidth = this.width - padding.left - padding.right;
    const plotHeight = this.height - padding.top - padding.bottom;
    if (plotWidth <= 0 || plotHeight <= 0) return svg``;

    const count = 5;
    const gap = plotWidth / (count * 4);
    const barWidth = (plotWidth - gap * (count - 1)) / count;
    // A fixed pattern, not random: a skeleton that reshuffles on every frame
    // is a distraction, and randomness would break visual snapshots.
    const heights = [0.45, 0.7, 0.55, 0.85, 0.6];

    return svg`
      <g part="skeleton" class="skeleton">
        ${heights.slice(0, count).map((fraction, i) => {
          const height = plotHeight * fraction;
          return svg`
            <rect
              part="skeleton-bar"
              x="${padding.left + i * (barWidth + gap)}"
              y="${padding.top + plotHeight - height}"
              width="${barWidth}"
              height="${height}"
              rx="2"
              fill="var(--dc-skeleton-color, #e5e7eb)"
            />
          `;
        })}
      </g>
    `;
  }

  /**
   * True when the chart has data children that are all hidden - worth saying,
   * because "no data" and "you hid everything" call for different reactions.
   */
  protected hasHiddenDataElements(): boolean {
    return this.countHiddenDataElements() > 0;
  }

  /** How many data elements are present but hidden. */
  protected countHiddenDataElements(): number {
    return this.querySelectorAll(':scope > [hidden], :scope > * > [hidden]').length;
  }

  // ============================================================================
  // Popup Methods
  //
  // The work lives in PopupController; these thin wrappers keep the API that
  // ~60 call sites across the chart types already use. See
  // src/popup-controller.ts.
  // ============================================================================

  private _popups?: PopupController;

  /**
   * The hover/click popup for this chart.
   *
   * Built with an explicit adapter rather than passing `this`, for the same
   * reason as {@link colors} and {@link keyboardNav}: several members it needs
   * are not public. The getters keep the values live, so changing `width` or
   * `height` still takes effect.
   */
  protected get popups(): PopupController {
    if (!this._popups) {
      const chart = this;
      this._popups = new PopupController({
        get shadowRoot() { return chart.shadowRoot; },
        get width() { return chart.width; },
        get height() { return chart.height; },
        getBoundingClientRect: () => chart.getBoundingClientRect(),
        showPopup: (content: string, x: number, y: number) => chart.showPopup(content, x, y),
        requestUpdate: () => chart.requestUpdate()
      });
    }
    return this._popups;
  }

  protected showPopup(content: string, x: number, y: number) {
    this.popups.showPopup(content, x, y);
  }

  protected hidePopup() {
    this.popups.hidePopup();
  }

  /**
   * Show popup at the center-top of a shape's bounds.
   * Uses the pure calculatePopupPosition() utility for coordinate conversion.
   *
   * @param content Popup content HTML string
   * @param bounds Shape bounds in viewBox coordinates
   * @returns true if popup was shown, false if SVG element not found
   */
  protected showPopupAtBounds(content: string, bounds: ShapeBounds): boolean {
    return this.popups.showPopupAtBounds(content, bounds);
  }

  /**
   * Render the title as SVG text element with appropriate transforms.
   * Positions title within the padding area, accounting for stacking with legend if present.
   *
   * Uses ChartTitle.generateSvg() to get the SVG at 0,0, then positions it
   * using <g transform="translate(...)"> and rotation for left/right positions.
   */
  protected renderTitle(): SVGTemplateResult {
    // Get the title element directly
    const titleEl = this.querySelector(':scope > dc-title') as ChartTitle | null;
    if (!titleEl || !titleEl.text) return svg``;
    // Supply the scale before anything measures or draws the title.
    titleEl.fontScale = this.fontScale;

    // Log any style warnings
    const warnings = titleEl.getStyleWarnings();
    for (const warning of warnings) {
      this.logError(ErrorCode.TITLE_STYLE_WARNING, { message: warning.message });
    }

    const position = titleEl.position;
    const side = this.getTitleSide(position);
    const paddingContent = this.getPaddingAreaContent();

    // Get dimensions for stacking calculations
    const titleDims = titleEl.getDimensions();
    if (titleDims.width === 0 && titleDims.height === 0) return svg``;

    // Calculate separator: half the title height
    const separator = titleDims.height / 2;

    // Find title's position in the stack and calculate offset from edge
    let offsetFromEdge = 0;
    if (side) {
      const contentOnSide = paddingContent[side];
      const titleIndex = contentOnSide.findIndex(item => item.type === 'title');

      // Sum up dimensions of elements before title in the stack
      const isHorizontalSide = side === 'left' || side === 'right';
      for (let i = 0; i < titleIndex; i++) {
        const item = contentOnSide[i];
        offsetFromEdge += isHorizontalSide ? item.width : item.height;
        offsetFromEdge += separator;
      }
    }

    // Determine text-anchor based on position
    let textAnchor: 'start' | 'middle' | 'end' = 'middle';
    if (position === 'top-left' || position === 'bottom-left') {
      textAnchor = 'start';
    } else if (position === 'top-right' || position === 'bottom-right') {
      textAnchor = 'end';
    }

    // Generate the SVG at 0,0
    const result = titleEl.generateSvg(textAnchor);

    // Base margin from edge
    const edgeMargin = 10;

    // Calculate position based on title position
    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        // Center horizontally, offset from top
        x = (this.width - result.width) / 2;
        y = edgeMargin + offsetFromEdge;
        break;
      case 'top-left':
        x = 20;
        y = edgeMargin + offsetFromEdge;
        break;
      case 'top-right':
        x = this.width - 20 - result.width;
        y = edgeMargin + offsetFromEdge;
        break;

      case 'bottom':
        x = (this.width - result.width) / 2;
        y = this.height - edgeMargin - offsetFromEdge - result.height;
        break;
      case 'bottom-left':
        x = 20;
        y = this.height - edgeMargin - offsetFromEdge - result.height;
        break;
      case 'bottom-right':
        x = this.width - 20 - result.width;
        y = this.height - edgeMargin - offsetFromEdge - result.height;
        break;

      case 'left': {
        // For left side: position at left edge, centered vertically, then rotate -90
        // Use fontSize/2 offset from edge (matching original behavior)
        const fontSize = titleEl.getFontSize();
        const centerX = edgeMargin + offsetFromEdge + fontSize / 2;
        const centerY = this.height / 2;
        // Translate to center point, rotate, then offset by half the text dimensions
        return svg`
          <g transform="translate(${centerX}, ${centerY}) rotate(-90)">
            <g transform="translate(${-result.width / 2}, ${-result.height / 2})">
              ${result.svg}
            </g>
          </g>
        `;
      }

      case 'right': {
        // For right side: position at right edge, centered vertically, then rotate 90
        const fontSize = titleEl.getFontSize();
        const centerX = this.width - edgeMargin - offsetFromEdge - fontSize / 2;
        const centerY = this.height / 2;
        return svg`
          <g transform="translate(${centerX}, ${centerY}) rotate(90)">
            <g transform="translate(${-result.width / 2}, ${-result.height / 2})">
              ${result.svg}
            </g>
          </g>
        `;
      }
    }

    return svg`
      <g transform="translate(${x}, ${y})">
        ${result.svg}
      </g>
    `;
  }

  /**
   * Watches light-DOM children for changes so the chart re-renders itself.
   * See {@link observeChildren}.
   */
  private childObserver?: MutationObserver;

  /** Watches the host's rendered size. See {@link observeSize}. */
  private sizeObserver?: ResizeObserver;

  /** The host's last observed width in CSS pixels. 0 until first measured. */
  private renderedWidth = 0;

  /**
   * How text responds to the chart being scaled to fit its container.
   *
   * The SVG scales to its container via its viewBox, which scales *everything*
   * uniformly - text included. A `font-size` of 14 is 14/600ths of the chart's
   * width, so the same chart renders 28px labels in a wide dashboard and 7px
   * labels in a narrow sidebar.
   *
   * - `proportional` (default) - font sizes are viewBox units and scale with the
   *   chart. Predictable, and correct when the chart is always about one size.
   * - `fixed` - font sizes are CSS pixels and stay constant on screen however
   *   large the chart is drawn.
   */
  @property({ type: String, attribute: 'text-scaling' })
  textScaling: 'proportional' | 'fixed' = 'proportional';

  /**
   * How the chart fits its container.
   *
   * - `aspect` (default) - the chart keeps the ratio implied by `width` and
   *   `height`. Its rendered height follows from its width, so in a container of
   *   a different shape it leaves space or overflows.
   * - `fill` - the chart adopts the container's shape. `width` stays the
   *   coordinate scale, and the layout height is recomputed from the container's
   *   measured aspect, so the plot fills the space with nothing distorted.
   *
   * `fill` needs the container to have a height of its own. Given an
   * auto-height container there is nothing to fill, and the chart keeps its
   * authored ratio.
   */
  @property({ type: String })
  fit: 'aspect' | 'fill' = 'aspect';

  /**
   * Show a loading placeholder instead of the plot.
   *
   * A chart whose markup arrives from the server necessarily has a moment where
   * the element exists and its data does not. That is the normal first frame of
   * every server-driven chart, not an error, so it gets a state of its own -
   * point `hx-indicator` (or the equivalent) at the chart and it resolves itself.
   */
  @property({ type: Boolean })
  loading = false;

  /**
   * How many data elements the chart would draw right now.
   *
   * Drives the empty state. Defaults to the focusable count, which is the set of
   * navigable data elements; chart types whose data is not all focusable
   * override it.
   */
  protected getDataElementCount(): number {
    return this.getFocusableElements().length;
  }

  /**
   * The `height` as authored, before `fit="fill"` adapted it. Kept so the chart
   * can go back to its own proportions if fill mode is turned off.
   */
  private authoredHeight?: number;

  /**
   * viewBox units per CSS pixel, or 1 when text should scale with the chart.
   *
   * Multiplying a nominal font size by this converts "CSS pixels I want on
   * screen" into "viewBox units to write into the attribute".
   */
  protected get fontScale(): number {
    if (this.textScaling !== 'fixed') return 1;
    if (!this.renderedWidth || !this.width) return 1;
    return this.width / this.renderedWidth;
  }

  /**
   * Convert a nominal font size into viewBox units for the current mode.
   *
   * Use for *both* the emitted `font-size` attribute and the `measureText()`
   * call that measures it. `measureText(text, f)` returns a width in units of
   * `f`, so passing the same effective size to both keeps measurement and
   * rendering in agreement - which is what stops labels from being mis-fitted.
   */
  protected fontSize(nominal: number): number {
    const scale = this.fontScale;
    return scale === 1 ? nominal : nominal * scale;
  }

  connectedCallback() {
    super.connectedCallback();
    // Apply defaults from <dc-defaults> elements before first render
    this.applyDefaults();
    // Add data attribute to host element for identification
    this.setAttribute('data-chart-type', this.tagName.toLowerCase());
    this.observeChildren();
    this.observeSize();
  }

  disconnectedCallback() {
    this.childObserver?.disconnect();
    this.childObserver = undefined;
    this.sizeObserver?.disconnect();
    this.sizeObserver = undefined;
    super.disconnectedCallback();
  }

  /**
   * Track the host's rendered width so `fixed` text scaling knows how far the
   * viewBox is being stretched.
   *
   * Only triggers a re-render in `fixed` mode: in the default mode nothing about
   * the output depends on rendered size, so observing is free and re-rendering
   * would be waste. The half-pixel threshold keeps sub-pixel reflow noise from
   * causing a render per frame during a resize drag.
   */
  private observeSize(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.sizeObserver = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      const width = box?.width ?? 0;
      if (!width) return;

      const widthChanged = Math.abs(width - this.renderedWidth) > 0.5;
      this.renderedWidth = width;

      const reshaped = this.applyFit(width, box?.height ?? 0);
      if (reshaped) return;                                    // already re-rendering
      if (widthChanged && this.textScaling === 'fixed') this.requestUpdate();
    });

    this.sizeObserver.observe(this);
  }

  /**
   * Reshape the layout to the container under `fit="fill"`.
   *
   * `width` is left alone: it is the coordinate scale, and changing it would
   * move every percentage padding and font size. Only the layout height is
   * recomputed, from the container's measured aspect, so the viewBox comes to
   * match the container's shape and the plot fills it without stretching.
   *
   * Adapting `this.height` rather than threading a separate layout height
   * through the ~55 places that read it means every existing calculation - and
   * every future one - is correct by default.
   *
   * This settles rather than oscillates. With an auto-height container the
   * measured aspect already equals the viewBox aspect, so the computed height is
   * the one in use and nothing changes: fill mode is correctly a no-op when
   * there is no fixed height to fill.
   *
   * @returns true if a re-render was requested.
   */
  private applyFit(measuredWidth: number, measuredHeight: number): boolean {
    if (this.fit !== 'fill') {
      // Restore the authored proportions if fill mode was switched off.
      if (this.authoredHeight !== undefined && this.height !== this.authoredHeight) {
        this.height = this.authoredHeight;
        return true;
      }
      return false;
    }

    if (!measuredHeight || !measuredWidth || !this.width) return false;
    if (this.authoredHeight === undefined) this.authoredHeight = this.height;

    const target = this.width * (measuredHeight / measuredWidth);
    if (!Number.isFinite(target) || target <= 0) return false;
    if (Math.abs(target - this.height) <= 0.5) return false;

    this.height = target;
    return true;
  }

  /**
   * Re-render whenever the light-DOM children change.
   *
   * Charts read their data by querying children on every render, but nothing
   * told them when that data changed. The `slotchange` event covers children
   * being added or removed; it does not fire when an existing child's attribute
   * changes, so `bar.setAttribute('value', '80')` updated the `<dc-bar>` and the
   * change died there.
   *
   * A Lit `updated()` hook on the data elements would only cover *declared*
   * reactive properties, which misses the cases that matter most: `hidden` is a
   * plain HTML attribute read via `hasAttribute()`, and passthrough attributes
   * (`hx-*`, `data-*`) are undeclared by definition. Observing the DOM catches
   * all of them uniformly, in one place.
   *
   * `characterData` is included because `<dc-title>` and `<dc-legend-item>` take
   * their text from child nodes rather than an attribute.
   */
  private observeChildren(): void {
    if (this.childObserver || typeof MutationObserver === 'undefined') return;

    this.childObserver = new MutationObserver(records => {
      // The chart's own attributes are Lit's business, not ours - reacting to
      // them here would loop on anything we set on ourselves during a render.
      const fromChild = records.some(r => r.target !== this);
      if (fromChild) this.requestUpdate();
    });

    this.childObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
  }

  /**
   * Apply default values from ancestor <dc-defaults> elements.
   *
   * For each defaultable attribute, if the attribute was not explicitly set
   * on this element, look for a value in the nearest <dc-defaults> ancestor.
   *
   * This is called automatically in connectedCallback before the first render.
   */
  protected applyDefaults(): void {
    const defaults = findDefaultsElement(this);
    if (!defaults) return;

    // Map of attribute names to property names
    const defaultableProps: Array<{ attr: DefaultableAttribute; prop: string }> = [
      { attr: 'animations', prop: 'animations' },
      { attr: 'palette', prop: 'paletteId' },
      { attr: 'high-contrast', prop: 'highContrast' },
      { attr: 'show-value', prop: 'showValue' },
      { attr: 'show-label', prop: 'showLabel' },
      { attr: 'show-percent', prop: 'showPercent' },
      { attr: 'value-format', prop: 'valueFormat' },
      { attr: 'percent-format', prop: 'percentFormat' },
      { attr: 'label-position', prop: 'labelPosition' },
      { attr: 'label-fill', prop: 'labelFill' },
      { attr: 'stroke', prop: 'stroke' },
      { attr: 'stroke-width', prop: 'strokeWidth' },
      { attr: 'auto-popup', prop: 'autoPopup' },
      { attr: 'logging', prop: 'logging' },
      { attr: 'console-log', prop: 'consoleLog' },
      { attr: 'padding', prop: 'padding' },
      { attr: 'padding-top', prop: 'paddingTop' },
      { attr: 'padding-right', prop: 'paddingRight' },
      { attr: 'padding-bottom', prop: 'paddingBottom' },
      { attr: 'padding-left', prop: 'paddingLeft' },
    ];

    for (const { attr, prop } of defaultableProps) {
      // Skip if this element has the attribute explicitly set
      if (this.hasAttribute(attr)) continue;

      // Check if the defaults element has this attribute
      if (defaults.hasDefault(attr)) {
        const value = defaults.getDefault(attr);
        if (value !== undefined) {
          // Apply the default value to this element's property
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this as any)[prop] = value;
        }
      }
    }
  }

  /**
   * Called after the first render. Triggers entry animations if enabled.
   * We wait for updateComplete + requestAnimationFrame to ensure:
   * 1. All child elements are connected and upgraded
   * 2. The browser has completed layout (needed for getTotalLength on paths)
   */
  protected override firstUpdated(): void {
    this.updateComplete.then(() => {
      requestAnimationFrame(() => {
        this.playEntryAnimation();
      });
    });
  }

  protected updated(_changedProperties: Map<string, unknown>): void {
    this.applyShadowParts();
    this.emitRender();
    // Close the console group this render opened, rather than leaving it for the
    // next clearLog() that may never come.
    this.logger.endRender();
  }

  /**
   * Selector -> `part` name for elements in the shadow root.
   *
   * Chart types override this to name their own shapes: `data-shape-index` means
   * a bar in one chart and a slice in another, so the mapping cannot live in one
   * place. Merge with `super.getShadowParts()` rather than replacing it.
   */
  protected getShadowParts(): Record<string, string> {
    return {
      'svg': 'chart',
      '.popup': 'popup',
      '.focus-indicator': 'focus-ring',
      '.empty-message': 'empty',
      '.skeleton': 'skeleton'
    };
  }

  /**
   * Stamp `part` attributes onto the rendered shadow DOM so consumers can style
   * internals with `::part()`.
   *
   * Applied after render rather than written into every template: the shapes are
   * emitted from ~50 places across five files, and a selector map is both easier
   * to audit and impossible to get subtly out of step. Lit does not manage the
   * `part` attribute, so re-stamping after each render is safe - the same
   * approach `applyPassthroughAttributes()` already uses.
   */
  protected applyShadowParts(): void {
    const root = this.shadowRoot;
    if (!root) return;

    for (const [selector, part] of Object.entries(this.getShadowParts())) {
      for (const el of root.querySelectorAll(selector)) {
        if (el.getAttribute('part') !== part) el.setAttribute('part', part);
      }
    }
  }

  /**
   * Announce that the chart has drawn. Useful for measuring the SVG, wiring up
   * external legends, or knowing a server-driven swap has finished rendering.
   */
  protected emitRender(): void {
    this.dispatchEvent(
      new CustomEvent<ChartRenderDetail>('dc-render', {
        detail: { chart: this, count: this.getFocusableElements().length },
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * Play entry animation if animate attribute is set and hasn't played yet.
   * Respects prefers-reduced-motion automatically (handled in animation module).
   */
  protected playEntryAnimation(): void {
    // Only play once
    if (this._hasAnimated) return;

    // Parse the animations attribute
    const duration = parseAnimateAttribute(this.animations ?? null);
    if (duration === null) return;

    this._hasAnimated = true;

    // Determine chart type for animation dispatch
    const chartType = this.getAnimatableChartType();

    // Determine orientation (for bar charts)
    const horizontal = (this as unknown as { orientation?: string }).orientation === 'horizontal';

    // Trigger animations
    animateChartEntry(
      this.shadowRoot!,
      chartType,
      { duration },
      horizontal
    );
  }

  /**
   * Get the chart type for animation purposes.
   * Override in subclasses if needed.
   */
  protected getAnimatableChartType(): AnimatableChartType {
    const tagName = this.tagName.toLowerCase();
    if (tagName.includes('pie')) return 'pie';
    if (tagName.includes('funnel')) return 'funnel';
    if (tagName.includes('stage')) return 'stage';
    return 'mixed'; // dc-chart can have bars, lines, areas, etc.
  }

  render() {
    // Clear log entries and used patterns at the start of each render cycle
    this.clearLog();
    this.clearUsedPatterns();

    // Generate accessibility content
    const ariaLabelValue = this.getAriaLabel();
    const descriptionContent = this.generateAccessibilityDescription();

    // Check if chart has focusable elements for keyboard navigation
    const hasFocusableElements = this.getFocusableElements().length > 0;

    // Loading and empty replace the plot entirely: axes, grid and legend all
    // describe data, and drawing them around nothing is noise.
    const placeholder = this.renderPlaceholder();

    return html`
      <svg
        viewBox="0 0 ${this.width} ${this.height}"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="${ariaLabelValue}"
        aria-describedby="${descriptionContent ? this.descriptionId : ''}"
        tabindex="${hasFocusableElements && !placeholder ? 0 : -1}"
        @keydown="${this.handleChartKeyDown}"
        @focus="${this.handleChartFocus}"
        @blur="${this.handleChartBlur}"
      >
        ${this.renderDefs()}
        ${descriptionContent ? svg`<desc id="${this.descriptionId}">${descriptionContent}</desc>` : ''}
        ${this.renderTitle()}
        ${placeholder ?? this.renderChart()}
        ${placeholder ? '' : this.renderFocusIndicator()}
      </svg>
      <div
        class="popup ${this.popupVisible ? 'visible' : ''}"
        style="left: ${this.popupX}px; top: ${this.popupY}px;"
        .innerHTML=${this.popupContent}
      ></div>
      <slot @slotchange=${this.handleSlotChange}></slot>
    `;
  }

  protected handleSlotChange() {
    this.requestUpdate();
  }

  protected getTitle(): string {
    // Use :scope > to only match direct children, not dc-title nested inside dc-legend
    const titleEl = this.querySelector(':scope > dc-title') as ChartTitle | null;
    return titleEl?.text || '';
  }

  /**
   * Calculate the dimensions of the chart title.
   * Used by auto-padding calculations to reserve space for the title.
   *
   * For left/right positioned titles, the text is rotated 90 degrees, so
   * width and height are swapped (text width becomes vertical extent).
   *
   * @returns Object with width, height, and position, or null if no title
   */
  protected getTitleDimensions(): { width: number; height: number; position: string } | null {
    const titleEl = this.querySelector(':scope > dc-title') as ChartTitle | null;
    if (!titleEl || !titleEl.text) return null;

    titleEl.fontScale = this.fontScale;
    const dims = titleEl.getDimensions();
    if (dims.width === 0 && dims.height === 0) return null;

    const position = titleEl.position;
    const isRotated = position === 'left' || position === 'right';

    // Include edge margin (space from border to title)
    // The trailing margin (space from title to next element or chart content) is added
    // by the padding calculation as a separator or trailing margin
    const edgeMargin = 10;

    // For rotated titles, swap width and height since text is rotated 90 degrees
    // The "width" in padding terms is how much horizontal space it needs (for left/right, that's the text height)
    // The "height" in padding terms is how much vertical space it needs (for left/right, that's the text width)
    let totalWidth: number;
    let totalHeight: number;

    if (isRotated) {
      // Text height becomes horizontal extent (padding width)
      // Text width becomes vertical extent (padding height)
      totalWidth = dims.height + edgeMargin;
      totalHeight = dims.width;
    } else {
      totalWidth = dims.width + edgeMargin;
      totalHeight = dims.height + edgeMargin;
    }

    this.log('info', 'title.dimensions', `"${titleEl.text}" at ${position}: fontSize=${titleEl.getFontSize()}, ${isRotated ? 'rotated' : 'horizontal'}, width=${totalWidth.toFixed(1)}, height=${totalHeight.toFixed(1)}`, { width: totalWidth, height: totalHeight, position });

    return {
      width: totalWidth,
      height: totalHeight,
      position
    };
  }

  /**
   * Determine which side of the chart a title position affects.
   * @param position The title position string
   * @returns The side ('top' | 'right' | 'bottom' | 'left') or null if position doesn't affect any side
   */
  private getTitleSide(position: string): 'top' | 'right' | 'bottom' | 'left' | null {
    switch (position) {
      case 'top':
      case 'top-left':
      case 'top-right':
        return 'top';
      case 'bottom':
      case 'bottom-left':
      case 'bottom-right':
        return 'bottom';
      case 'left':
        return 'left';
      case 'right':
        return 'right';
      default:
        return null;
    }
  }

  /**
   * Determine what elements are in each padding area and their stacking order.
   * Returns elements in DOM order with calculated dimensions.
   * Used by getChartPadding() and render methods to coordinate title/legend placement.
   *
   * @returns Object mapping each side to its content elements in DOM order
   */
  protected getPaddingAreaContent(): {
    top: PaddingContentItem[];
    right: PaddingContentItem[];
    bottom: PaddingContentItem[];
    left: PaddingContentItem[];
  } {
    const result: {
      top: PaddingContentItem[];
      right: PaddingContentItem[];
      bottom: PaddingContentItem[];
      left: PaddingContentItem[];
    } = {
      top: [],
      right: [],
      bottom: [],
      left: []
    };

    // Query all direct children that affect padding (title and legend) in DOM order
    const children = Array.from(this.querySelectorAll(':scope > dc-title, :scope > dc-legend'));

    for (const child of children) {
      if (child.tagName.toLowerCase() === 'dc-title') {
        const titleDims = this.getTitleDimensions();
        if (titleDims) {
          const side = this.getTitleSide(titleDims.position);
          if (side) {
            result[side].push({
              type: 'title',
              height: titleDims.height,
              width: titleDims.width,
              element: child
            });
          }
        }
      } else if (child.tagName.toLowerCase() === 'dc-legend') {
        const legendDims = this.getLegendDimensions(this.getLegendItems());
        if (legendDims) {
          const side = this.getLegendSide(legendDims.position);
          if (side) {
            result[side].push({
              type: 'legend',
              height: legendDims.height,
              width: legendDims.width,
              element: child
            });
          }
        }
      }
    }

    // Log stacking info for sides with multiple elements
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      if (result[side].length > 1) {
        const types = result[side].map(item => item.type).join(', ');
        this.log('info', `padding.${side}.stacking`, `Stacking order: ${types}`, result[side].map(i => i.type));
      }
    }

    return result;
  }

  /**
   * Get the legend element if present
   */
  protected getLegend(): ChartLegend | null {
    return this.querySelector('dc-legend') as ChartLegend | null;
  }

  /**
   * Calculate the actual dimensions of the legend based on its content.
   * This is used by getSvgDimensions() and getChartPadding() to determine
   * how much space the legend needs.
   *
   * @param items Array of legend items (if not provided, will return null)
   * @returns Object with width, height, and position, or null if no legend
   */
  protected getLegendDimensions(
    items?: LegendItem[]
  ): { width: number; height: number; position: string } | null {
    const legend = this.getLegend();
    if (!legend) return null;

    const position = legend.position || 'right';

    // If no items provided, we can't calculate dimensions
    // This is a limitation - subclasses should provide items when calling
    if (!items || items.length === 0) {
      // Return conservative estimates based on position
      if (position === 'right' || position === 'left') {
        this.log('info', 'legend.dimensions', `No items, using estimates for ${position} position`, { width: 150, height: 100, position });
        return { width: 150, height: 100, position };
      } else {
        const width = this.width * 0.8;
        this.log('info', 'legend.dimensions', `No items, using estimates for ${position} position`, { width, height: 80, position });
        return { width, height: 80, position };
      }
    }

    // Delegate to ChartLegend.getDimensions()
    // Convert ShowCondition to boolean (threshold conditions count as "show")
    const showValue = this.showValue !== false;
    const showPercent = this.showPercent !== false;
    legend.fontScale = this.fontScale;
    const dims = legend.getDimensions(
      items, this.width, showValue, showPercent,
      this.valueFormat, this.percentFormat, this.locale
    );

    this.log('info', 'legend.position', `Legend position`, position);
    this.log('info', 'legend.dimensions', `width=${dims.width.toFixed(1)}, height=${dims.height.toFixed(1)}`, { width: dims.width, height: dims.height });

    return { width: dims.width, height: dims.height, position };
  }

  /**
   * Render a legend for the chart using ChartLegend.generateSvg()
   * @param items Array of legend items with label, color, value, and optional shape
   */
  protected renderLegend(items: LegendItem[]): SVGTemplateResult {
    const legend = this.getLegend();
    if (!legend) return svg``;

    // Check for common style mistakes and log warnings
    const legendWarnings = legend.getStyleWarnings();
    for (const warning of legendWarnings) {
      this.logError(ErrorCode.LEGEND_STYLE_WARNING, { message: warning.message });
    }

    // Generate the legend SVG at 0,0
    // Convert ShowCondition to boolean (threshold conditions count as "show")
    const showValue = this.showValue !== false;
    const showPercent = this.showPercent !== false;
    legend.fontScale = this.fontScale;
    const result = legend.generateSvg(
      items, this.width, showValue, showPercent,
      this.valueFormat, this.percentFormat, this.locale
    );

    if (result.width === 0 || result.height === 0) {
      return svg``;
    }

    // Calculate position for the legend
    const position = legend.position || 'right';
    const { x, y } = this.calculateLegendPosition(position, result.width, result.height);

    // Return the legend SVG wrapped in a positioned group
    return svg`
      <g transform="translate(${x}, ${y})">
        ${result.svg}
      </g>
    `;
  }

  /**
   * Calculate the position (x, y) for the legend based on its position attribute.
   * This handles all the complex positioning logic including:
   * - Padding area constraints
   * - Axis label padding
   * - Stacking with other chrome elements (title)
   * - Horizontal alignment (left, center, right) for top/bottom positions
   * - Vertical centering for left/right positions
   */
  private calculateLegendPosition(
    position: string,
    legendWidth: number,
    legendHeight: number
  ): { x: number; y: number } {
    // Get padding - this already accounts for legend dimensions on the appropriate side
    const padding = this.getChartPadding();

    // Get axis label padding to know how much space is reserved for axis labels
    const axisLabelPadding = this.getAxisLabelPadding();

    // Get padding area content to determine legend's position in the stack
    const paddingContent = this.getPaddingAreaContent();
    const legendSide = this.getLegendSide(position);

    // Calculate separator based on chart title height
    const chartTitleDims = this.getTitleDimensions();
    const stackSeparator = chartTitleDims ? chartTitleDims.height / 2 : 10;

    // Calculate offset from edge based on elements before legend in DOM order
    let stackOffsetFromEdge = 0;
    if (legendSide) {
      const contentOnSide = paddingContent[legendSide];
      const legendIndex = contentOnSide.findIndex(item => item.type === 'legend');

      // Sum up dimensions of elements before legend in the stack
      const isHorizontalSide = legendSide === 'left' || legendSide === 'right';
      for (let i = 0; i < legendIndex; i++) {
        const item = contentOnSide[i];
        stackOffsetFromEdge += isHorizontalSide ? item.width : item.height;
        stackOffsetFromEdge += stackSeparator;
      }
    }

    // Chart content area
    const chartContentLeft = padding.left;
    const chartContentWidth = this.width - padding.left - padding.right;
    const chartContentHeight = this.height - padding.top - padding.bottom;

    let x = 0;
    let y = 0;

    // Position based on legend position
    if (position === 'right' || position === 'left') {
      // Vertical centering in chart area
      y = padding.top + (chartContentHeight - legendHeight) / 2;

      if (position === 'right') {
        // Legend goes in the right padding area
        // The legend area starts right after axis labels, not offset by stack
        // Stack offset reduces the available width but doesn't change the start position
        const axisSpace = axisLabelPadding.right;
        const legendAreaStart = this.width - padding.right + axisSpace;
        const legendAreaWidth = padding.right - axisSpace - stackOffsetFromEdge;
        // Position with 80% of extra space toward the outer edge
        x = legendAreaStart + (legendAreaWidth - legendWidth) * 0.8;
      } else {
        // Legend goes in the left padding area
        const axisSpace = axisLabelPadding.left;
        const legendAreaWidth = padding.left - axisSpace - stackOffsetFromEdge;
        // Position with 20% of extra space toward the outer edge (80% toward content)
        x = stackOffsetFromEdge + (legendAreaWidth - legendWidth) * 0.2;
      }
    } else if (position.startsWith('top') || position.startsWith('bottom')) {
      // Horizontal alignment
      if (position === 'top-right' || position === 'bottom-right') {
        x = chartContentLeft + chartContentWidth - legendWidth;
      } else if (position === 'top' || position === 'bottom') {
        x = chartContentLeft + (chartContentWidth - legendWidth) / 2;
      } else {
        // top-left or bottom-left
        x = chartContentLeft;
      }

      // Vertical positioning
      if (position.startsWith('top')) {
        // Legend in the top padding area
        const axisSpace = axisLabelPadding.top;
        const legendAreaHeight = padding.top - axisSpace - stackOffsetFromEdge;
        // Position with 20% of extra space toward the outer edge
        y = stackOffsetFromEdge + (legendAreaHeight - legendHeight) * 0.2;
      } else {
        // Legend in the bottom padding area
        const axisSpace = axisLabelPadding.bottom;
        const legendAreaStart = this.height - padding.bottom + axisSpace;
        const legendAreaHeight = padding.bottom - axisSpace - stackOffsetFromEdge;
        // Position with 20% of extra space toward the inner edge
        y = legendAreaStart + (legendAreaHeight - legendHeight) * 0.2 + this.getBottomLegendOffset();
      }
    }

    return { x, y };
  }

  /**
   * Apply passthrough attributes to SVG elements after rendering
   * This is a generic helper used by all chart types to support htmx and other attribute-based libraries
   *
   * @param shapes Array of shape data items that may contain passthroughAttrs
   */
  protected applyPassthroughAttributes<T extends { passthroughAttrs?: Record<string, string> }>(
    shapes: T[]
  ): void {
    const svg = this.shadowRoot?.querySelector('svg');
    if (!svg) return;

    shapes.forEach((shape, index) => {
      if (shape.passthroughAttrs) {
        const element = svg.querySelector(`[data-shape-index="${index}"]`);
        if (element) {
          Object.entries(shape.passthroughAttrs).forEach(([key, value]) => {
            element.setAttribute(key, value);
          });
        }
      }
    });

    // Notify htmx about new elements (if htmx is loaded)
    if (typeof (window as any).htmx !== 'undefined') {
      (window as any).htmx.process(svg);
    }
  }

  // ============================================================================
  // Accessibility Methods
  // ============================================================================

  /**
   * Get the chart type name for accessibility descriptions.
   * Override in subclasses to provide specific chart type names.
   *
   * @returns Human-readable chart type name (e.g., "bar chart", "pie chart")
   */
  protected getChartTypeName(): string {
    return 'chart';
  }

  /**
   * Get basic data summary for accessibility descriptions.
   * Override in subclasses to provide chart-specific summaries.
   *
   * @returns Basic summary string (e.g., "4 bars, values from 10 to 50")
   */
  protected getDataSummary(): string {
    return '';
  }

  /**
   * Get auto-generated insights about the chart data.
   * Override in subclasses to provide chart-specific insights.
   *
   * @returns Insights string describing trends, comparisons, or patterns
   */
  protected getInsights(): string {
    return '';
  }

  /**
   * Get the aria-label for the chart SVG.
   * Uses custom ariaLabel if provided, otherwise generates from title and chart type.
   *
   * @returns The aria-label string
   */
  protected getAriaLabel(): string {
    if (this.ariaLabel) {
      return this.ariaLabel;
    }

    const title = this.getTitle();
    const chartType = this.getChartTypeName();

    // Announce the state rather than describing a chart that is not there.
    if (this.loading || this.getDataElementCount() === 0) {
      const state = this.loading
        ? 'loading'
        : ((this.querySelector(':scope > dc-empty') as ChartEmpty | null)?.text
           || (this.hasHiddenDataElements() ? 'all series hidden' : 'no data'));
      return title ? `${chartType}: ${title} - ${state}` : `${chartType} - ${state}`;
    }

    if (title) {
      return `${chartType}: ${title}`;
    }

    return chartType;
  }

  /**
   * Generate the full accessibility description for the chart.
   * Uses custom ariaDescription if provided, otherwise auto-generates.
   *
   * @returns The description string for the SVG <desc> element
   */
  protected generateAccessibilityDescription(): string {
    // Use custom description if provided
    if (this.ariaDescription) {
      return this.ariaDescription;
    }

    // If insights are disabled, return empty
    if (this.ariaInsights === 'none') {
      return '';
    }

    const parts: string[] = [];

    // Announce high contrast mode at the start for screen reader users
    if (this.isHighContrastActive()) {
      parts.push('High contrast mode active');
    }

    // Add basic data summary
    const summary = this.getDataSummary();
    if (summary) {
      parts.push(summary);
    }

    // Add insights if enabled
    if (this.ariaInsights === 'auto') {
      const insights = this.getInsights();
      if (insights) {
        parts.push(insights);
      }
    }

    return parts.join('. ');
  }

  // ============================================================================
  // End Accessibility Methods
  // ============================================================================

  // ============================================================================
  // Keyboard Navigation Methods
  // ============================================================================

  private _keyboardNav?: KeyboardNavController;

  /**
   * Keyboard navigation state and handling for this chart.
   *
   * Built with an explicit adapter rather than passing `this`, for the same
   * reason as {@link colors}: several members it needs are not public.
   */
  protected get keyboardNav(): KeyboardNavController {
    if (!this._keyboardNav) {
      const chart = this;
      this._keyboardNav = new KeyboardNavController({
        get shadowRoot() { return chart.shadowRoot; },
        getFocusableElements: () => chart.getFocusableElements(),
        showPopupForFocusedElement: (i: number) => chart.showPopupForFocusedElement(i),
        togglePopupForFocusedElement: (i: number) => chart.togglePopupForFocusedElement(i),
        hidePopup: () => chart.hidePopup(),
        navigateToHref: (href: string) => chart.navigateToHref(href),
        focusElement: (i: number) => chart.focusElement(i),
        focusNextElement: () => chart.focusNextElement(),
        focusPreviousElement: () => chart.focusPreviousElement(),
        activateCurrentElement: () => chart.activateCurrentElement(),
        requestUpdate: () => chart.requestUpdate()
      });
    }
    return this._keyboardNav;
  }

  /**
   * Index of the currently focused element, or -1 for none.
   * Read by every chart type when drawing its focus indicator.
   *
   * Writable because it was a plain `@state()` field before the controller
   * existed. Assigning it still re-renders, so anything that set it directly
   * keeps working.
   */
  protected get focusedIndex(): number {
    return this.keyboardNav.focusedIndex;
  }

  protected set focusedIndex(value: number) {
    this.keyboardNav.focusedIndex = value;
    this.requestUpdate();
  }

  /** Whether the chart currently has keyboard focus. */
  protected get keyboardActive(): boolean {
    return this.keyboardNav.keyboardActive;
  }

  protected set keyboardActive(value: boolean) {
    this.keyboardNav.keyboardActive = value;
    this.requestUpdate();
  }

  protected handleChartKeyDown(e: KeyboardEvent): void {
    this.keyboardNav.handleChartKeyDown(e);
  }

  protected handleChartFocus(): void {
    this.keyboardNav.handleChartFocus();
  }

  protected handleChartBlur(e: FocusEvent): void {
    this.keyboardNav.handleChartBlur(e);
  }

  protected focusElement(index: number): void {
    this.keyboardNav.focusElement(index);
  }

  protected focusNextElement(): void {
    this.keyboardNav.focusNextElement();
  }

  protected focusPreviousElement(): void {
    this.keyboardNav.focusPreviousElement();
  }

  protected activateCurrentElement(): void {
    this.keyboardNav.activateCurrentElement();
  }

  protected navigateToHref(href: string): void {
    this.keyboardNav.navigateToHref(href);
  }

  /**
   * Get the list of focusable elements in this chart.
   * Override in subclasses to return chart-specific focusable elements.
   * Elements should be returned in logical navigation order.
   *
   * @returns Array of focusable elements, or empty array if none
   */
  protected getFocusableElements(): FocusableElement[] {
    return [];
  }

  /**
   * Show popup for the focused element.
   * Override in subclasses to provide chart-specific popup content.
   */
  protected showPopupForFocusedElement(_index: number): void {
    // Default implementation - subclasses should override
    // to get the popup content and position
  }

  /**
   * Toggle popup for the focused element (for click-triggered popups).
   * Override in subclasses to provide chart-specific popup handling.
   */
  protected togglePopupForFocusedElement(_index: number): void {
    // Default implementation - subclasses should override
  }

  /**
   * Get the tabindex value for a shape element.
   * In roving tabindex pattern:
   * - The chart SVG has tabindex="0" to be focusable
   * - Individual shapes have tabindex="-1" (focusable via JS, not Tab)
   *
   * @param index The index of the shape
   * @returns The tabindex value (-1 for all shapes in roving pattern)
   */
  protected getShapeTabIndex(_index: number): number {
    // In roving tabindex, shapes are not in the tab order
    // Focus is managed programmatically via the chart's keyboard handler
    return -1;
  }

  /**
   * Check if a shape at the given index is currently focused.
   *
   * @param index The index of the shape
   * @returns true if the shape is focused and keyboard navigation is active
   */
  protected isShapeFocused(index: number): boolean {
    return this.keyboardActive && this.focusedIndex === index;
  }

  /**
   * Generate the aria-label for a shape element.
   * Override in subclasses to provide chart-specific labels.
   *
   * @param index The index of the shape
   * @returns The aria-label string
   */
  protected getShapeAriaLabel(index: number): string {
    const focusable = this.getFocusableElements();
    if (index < 0 || index >= focusable.length) return '';
    return focusable[index].label;
  }

  /**
   * Render a focus indicator for the currently focused shape.
   * This draws a visible focus ring around the focused element.
   * Override in subclasses to provide chart-specific focus indicators.
   *
   * @returns SVG template for the focus indicator, or empty if nothing focused
   */
  protected renderFocusIndicator(): SVGTemplateResult {
    // Default implementation returns nothing
    // Subclasses should override to render a focus ring around the focused shape
    return svg``;
  }

  /**
   * Get the bounding box of a shape element by its index.
   * Used for rendering focus indicators.
   *
   * @param index The index of the shape
   * @returns The bounding box {x, y, width, height} or null if not found
   */
  protected getShapeBounds(index: number): { x: number; y: number; width: number; height: number } | null {
    const svgEl = this.shadowRoot?.querySelector('svg');
    if (!svgEl) return null;

    const shape = svgEl.querySelector(`[data-shape-index="${index}"]`) as SVGGraphicsElement | null;
    if (!shape) return null;

    try {
      const bbox = shape.getBBox();
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      };
    } catch {
      return null;
    }
  }

  // ============================================================================
  // End Keyboard Navigation Methods
  // ============================================================================

  protected abstract renderChart(): SVGTemplateResult;

  // ============================================================================
  // SVG Export / Download
  // ============================================================================

  private _svgExport?: SvgExporter;

  /**
   * SVG export for this chart.
   *
   * Built with an explicit adapter rather than passing `this`, for the same
   * reason as {@link colors}: `prepareSvgForExport` is private, and widening it
   * just to satisfy a structural interface would enlarge the API this
   * extraction exists to shrink. The getters keep the values live, so a width
   * change between two exports takes effect.
   */
  protected get svgExport(): SvgExporter {
    if (!this._svgExport) {
      const chart = this;
      this._svgExport = new SvgExporter({
        get shadowRoot() { return chart.shadowRoot; },
        get width() { return chart.width; },
        get height() { return chart.height; },
        get hostElement() { return chart; },
        prepareSvgForExport: (el: SVGElement) => chart.prepareSvgForExport(el),
        logError: (code, params, value) => chart.logError(code, params, value)
      });
    }
    return this._svgExport;
  }

  /**
   * Download the chart as an SVG file.
   *
   * This method extracts the rendered SVG from the shadow DOM, prepares it for
   * standalone use (inlining necessary styles like font-family), and triggers
   * a browser download.
   *
   * @param filename Optional filename for the downloaded file. Defaults to 'chart.svg'.
   *                 The '.svg' extension will be added if not present.
   *
   * @example
   * ```javascript
   * // Basic usage
   * const chart = document.querySelector('dc-chart');
   * chart.downloadSvg();
   *
   * // With custom filename
   * chart.downloadSvg('sales-report.svg');
   *
   * // Wire up to a button
   * document.querySelector('#download-btn').addEventListener('click', () => {
   *   document.querySelector('dc-chart').downloadSvg('market-share');
   * });
   * ```
   */
  public downloadSvg(filename: string = DEFAULT_SVG_FILENAME): void {
    this.svgExport.downloadSvg(filename);
  }

  /**
   * Prepare an SVG element for standalone export.
   * Inlines computed styles that wouldn't otherwise be available in a standalone SVG file.
   *
   * Stays on `BaseChart` and is called back through the host adapter, so
   * replacing it on an instance or in a subclass still governs the exported
   * output - which it did before the exporter existed.
   *
   * @param svgElement The cloned SVG element to prepare
   */
  private prepareSvgForExport(svgElement: SVGElement): void {
    this.svgExport.prepareSvgForExport(svgElement);
  }
}
