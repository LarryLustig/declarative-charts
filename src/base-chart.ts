import { LitElement, css, html, svg, SVGTemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import type { ChartTitle } from './chart-title.js';
import type { ChartLegend, LegendItem } from './chart-legend.js';
import type { ChartPalette, PaletteColorResult } from './chart-palette.js';
import type { ChartFill } from './chart-fill.js';
import {
  PatternConfig,
  ResolvedPattern,
  ResolvedFillAndPattern,
  PATTERN_DEFINITIONS,
  HIGH_CONTRAST_COLORS,
  isPatternType,
  generatePatternId,
  getHighContrastPattern
} from './patterns.js';
import { NumberFormatter } from './format.js';
import { calculatePopupPosition, type ShapeBounds } from './chart-utils.js';
import {
  isBuiltinPalette,
  getBuiltinPalette,
  generatePaletteColors as generateBuiltinPaletteColors
} from './builtin-palettes.js';
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
  formatErrorMessage,
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

  @state()
  protected popupContent = '';

  @state()
  protected popupX = 0;

  @state()
  protected popupY = 0;

  @state()
  protected popupVisible = false;

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
   * - 'false' (default): No logging, best performance
   * - 'error': Only errors (calculation failures, invalid inputs)
   * - 'warning': Warnings and errors (fallbacks used, deprecated attributes)
   * - 'info' or 'true': All messages including derivation details
   */
  @property({ type: String })
  logging: 'false' | 'error' | 'warning' | 'info' | 'true' = 'false';

  /**
   * Controls which log messages are also echoed to the browser console.
   * This is independent of the `logging` attribute which controls capture.
   * - 'none' (default): No console output
   * - 'error': Echo errors to console.error()
   * - 'warning': Echo warnings and errors to console.warn()/error()
   * - 'info': Echo all messages to console.log()/warn()/error()
   *
   * Note: A message must first pass the `logging` level filter before
   * the `console-log` filter is applied. Set `logging="info"` to capture
   * all messages, then use `console-log` to control which appear in DevTools.
   */
  @property({ type: String, attribute: 'console-log' })
  consoleLog: 'none' | 'error' | 'warning' | 'info' = 'none';

  /**
   * Log entries captured during the last render cycle.
   * Cleared at the start of each render.
   */
  protected logEntries: LogEntry[] = [];

  /**
   * Whether a console group is currently open for this render cycle.
   * Used to group related log messages in the browser console.
   */
  private consoleGroupOpen = false;

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

  /**
   * Index of the currently focused element within the chart.
   * -1 means no element is focused (chart level focus).
   * Used for roving tabindex pattern.
   */
  @state()
  protected focusedIndex = -1;

  /**
   * Whether keyboard navigation is currently active (chart has focus).
   */
  @state()
  protected keyboardActive = false;

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
  // ============================================================================

  /**
   * Check if a log message at the given level should be captured.
   * @param level The level of the message to check
   * @returns true if the message should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.logging === 'false') return false;
    if (this.logging === 'true' || this.logging === 'info') return true;
    if (this.logging === 'warning') return level === 'warning' || level === 'error';
    if (this.logging === 'error') return level === 'error';
    return false;
  }

  /**
   * Check if a log message at the given level should be echoed to browser console.
   * @param level The level of the message to check
   * @returns true if the message should be echoed to console
   */
  private shouldEchoToConsole(level: LogLevel): boolean {
    if (this.consoleLog === 'none') return false;
    if (this.consoleLog === 'info') return true;
    if (this.consoleLog === 'warning') return level === 'warning' || level === 'error';
    if (this.consoleLog === 'error') return level === 'error';
    return false;
  }

  /**
   * Get a human-readable identifier for this chart for console output.
   * Priority: id attribute > title text > tag name only
   * @returns Identifier string like "dc-chart#my-id" or "dc-chart \"Sales\""
   */
  private getConsoleIdentifier(): string {
    const tagName = this.tagName.toLowerCase();
    if (this.id) {
      return `${tagName}#${this.id}`;
    }
    const title = this.getTitle();
    if (title) {
      // Truncate long titles for console readability
      const truncatedTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
      return `${tagName} "${truncatedTitle}"`;
    }
    return tagName;
  }

  /**
   * Start a console group for this render cycle if not already open.
   * Groups all log messages together under a collapsible header.
   */
  private startConsoleGroup(): void {
    if (!this.consoleGroupOpen && this.consoleLog !== 'none') {
      const identifier = this.getConsoleIdentifier();
      console.groupCollapsed(`${identifier} render`);
      this.consoleGroupOpen = true;
    }
  }

  /**
   * End the console group for this render cycle if open.
   */
  private endConsoleGroup(): void {
    if (this.consoleGroupOpen) {
      console.groupEnd();
      this.consoleGroupOpen = false;
    }
  }

  /**
   * Echo a log message to the browser console with appropriate formatting.
   * Messages are grouped by render cycle under a collapsible header.
   * @param level The log level
   * @param path The path identifier
   * @param message The log message
   * @param value Optional value
   * @param code Optional error code (e.g., "DC001")
   */
  private echoToConsole(level: LogLevel, path: string, message: string, value?: unknown, code?: string): void {
    // Start a group for this render cycle if not already open
    this.startConsoleGroup();

    // Format: "[DC001] path: message" or "path: message" if no code
    const prefix = code ? `[${code}] ` : '';
    const fullMessage = `${prefix}${path}: ${message}`;

    const consoleFn = level === 'error' ? console.error
                    : level === 'warning' ? console.warn
                    : console.log;

    if (value !== undefined) {
      consoleFn(fullMessage, value);
    } else {
      consoleFn(fullMessage);
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
    if (this.shouldLog(level)) {
      this.logEntries.push({ level, path, message, value, code });

      // Also echo to browser console if configured
      if (this.shouldEchoToConsole(level)) {
        this.echoToConsole(level, path, message, value, code);
      }
    }
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
    const message = formatErrorMessage(error.message, values);
    this.log(error.level, error.path, message, value, error.code);
  }

  /**
   * Get all log entries from the last render cycle.
   * This method is intended for use by dc-log-console or programmatic access.
   * @returns Array of log entries in the order they were captured
   */
  public getLogEntries(): LogEntry[] {
    return this.logEntries;
  }

  /**
   * Clear all log entries. Called automatically at the start of each render.
   * Also closes any open console group from the previous render cycle.
   */
  protected clearLog(): void {
    // Close any open console group from previous render
    this.endConsoleGroup();
    this.logEntries = [];
  }

  // ============================================================================
  // Color System Utilities
  // ============================================================================

  /**
   * Get the palette element referenced by the paletteId attribute.
   * @returns The ChartPalette element, or null if not found
   */
  protected getPalette(): ChartPalette | null {
    if (!this.paletteId) return null;
    return document.getElementById(this.paletteId) as ChartPalette | null;
  }

  /**
   * Look up colors from the palette for a given label and/or value.
   * @param label The element's label (optional)
   * @param value The element's numeric value (optional)
   * @returns Object with fill and/or stroke colors, or empty object if no match
   */
  protected lookupPaletteColor(label?: string, value?: number): PaletteColorResult {
    const palette = this.getPalette();
    if (!palette) return {};
    return palette.lookup(label, value);
  }

  // ============================================================================
  // High Contrast and Pattern Methods
  // ============================================================================

  /**
   * Check if high contrast mode is currently active.
   *
   * Priority:
   * 1. Explicit highContrast attribute (true/false)
   * 2. OS prefers-contrast: high media query
   *
   * @returns true if high contrast mode should be used
   */
  protected isHighContrastActive(): boolean {
    // Explicit attribute takes precedence
    if (this.highContrast === true) return true;
    if (this.highContrast === false) return false;

    // Auto-detect from OS setting
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-contrast: high)').matches;
    }
    return false;
  }

  /**
   * Find a child <dc-palette high-contrast> element for custom high-contrast colors.
   *
   * @returns The high-contrast palette, or null if not found
   */
  protected getHighContrastPalette(): ChartPalette | null {
    const palette = this.querySelector(':scope > dc-palette[high-contrast]') as ChartPalette | null;
    return palette;
  }

  /**
   * Get high contrast colors for a given count.
   *
   * If a custom high-contrast palette is provided, uses those colors.
   * Otherwise, uses the built-in HIGH_CONTRAST_COLORS.
   *
   * @param count Number of colors needed
   * @returns Array of color strings
   */
  protected getHighContrastColors(count: number): string[] {
    // Check for custom high-contrast palette
    const palette = this.getHighContrastPalette();
    if (palette && palette.hasFills()) {
      const customColors = palette.getFillColors();
      if (customColors.length > 0) {
        // Cycle through custom colors if count exceeds available
        const colors: string[] = [];
        for (let i = 0; i < count; i++) {
          colors.push(customColors[i % customColors.length]);
        }
        return colors;
      }
    }

    // Use built-in high contrast colors
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(HIGH_CONTRAST_COLORS[i % HIGH_CONTRAST_COLORS.length]);
    }
    return colors;
  }

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

  /**
   * Parse a CSS color string to RGB values.
   * Uses a canvas context to normalize any valid CSS color to RGB.
   *
   * @param color CSS color string (hex, rgb, hsl, named color, etc.)
   * @returns RGB values as [r, g, b] where each component is 0-255, or null if invalid
   */
  protected parseColor(color: string): [number, number, number] | null {
    const ctx = this.getMeasureContext();
    if (!ctx) return null;

    // Set the color and read it back as normalized RGB
    ctx.fillStyle = color;
    const computedColor = ctx.fillStyle;

    // Parse rgb/rgba format
    const rgbMatch = computedColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return [
        parseInt(rgbMatch[1], 10),
        parseInt(rgbMatch[2], 10),
        parseInt(rgbMatch[3], 10)
      ];
    }

    // Parse hex format
    if (computedColor.startsWith('#')) {
      const hex = computedColor.slice(1);
      if (hex.length === 3) {
        return [
          parseInt(hex[0] + hex[0], 16),
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16)
        ];
      } else if (hex.length === 6) {
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16)
        ];
      }
    }

    return null;
  }

  /**
   * Calculate the relative luminance of a color using WCAG formula.
   *
   * @param color CSS color string
   * @returns Luminance value (0-1), or 0.5 if color cannot be parsed
   */
  protected getLuminance(color: string): number {
    const rgb = this.parseColor(color);
    if (!rgb) return 0.5;

    // Convert to linear RGB and calculate luminance
    const [r, g, b] = rgb.map(c => {
      const sRGB = c / 255;
      return sRGB <= 0.03928
        ? sRGB / 12.92
        : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Get a contrasting text color for a given background color.
   * Uses WCAG luminance formula to determine if text should be dark or light.
   *
   * @param bgColor Background color (CSS color string)
   * @returns 'white' for dark backgrounds, '#333' for light backgrounds
   */
  protected getContrastingTextColor(bgColor: string): string {
    const luminance = this.getLuminance(bgColor);
    return luminance > 0.5 ? '#333' : 'white';
  }

  /**
   * Calculate the fill color for a label based on its position relative to a shape.
   * This is a common utility for all chart types that need label fill calculation.
   *
   * @param explicitFill User-specified label-fill value (or undefined for auto)
   * @param isInsideShape Whether the label center is inside the shape (determined by caller)
   * @param shapeFill Fill color of the shape
   * @param chartBackground Background color of the chart (default white)
   * @returns The fill color to use for the label
   */
  protected calculateLabelFill(
    explicitFill: string | undefined,
    isInsideShape: boolean,
    shapeFill: string,
    chartBackground = '#ffffff'
  ): string {
    // If explicit fill is specified (and not "auto"), use it
    if (explicitFill && explicitFill !== 'auto') {
      return explicitFill;
    }

    // Calculate contrast based on whether label is inside or outside the shape
    if (isInsideShape) {
      return this.getContrastingTextColor(shapeFill);
    } else {
      return this.getContrastingTextColor(chartBackground);
    }
  }

  /**
   * Generate a palette of colors using the golden ratio conjugate.
   * This produces visually distinct, non-repeating colors.
   *
   * @param count Number of colors to generate
   * @param seed Optional seed for starting hue (0-1). If not provided, uses a fixed seed for consistency.
   * @returns Array of color strings in HSL format
   */
  protected generatePaletteColors(count: number, seed?: number): string[] {
    const colors: string[] = [];
    const goldenRatioConjugate = 0.618033988749895;
    let hue = seed ?? 0.1; // Use fixed seed for consistent colors across renders

    for (let i = 0; i < count; i++) {
      hue += goldenRatioConjugate;
      hue %= 1;

      // Convert to degrees and use high saturation and medium lightness
      const hueDegrees = hue * 360;
      colors.push(`hsl(${hueDegrees}, 70%, 55%)`);
    }

    return colors;
  }

  /**
   * Resolve colors for chart elements based on the color resolution order:
   * 1. Element-level color (highest priority)
   * 2. Palette colors (from user-defined or built-in palette)
   * 3. Default/fallback (auto-generated)
   *
   * @param count Number of colors needed
   * @param options Color resolution options
   * @returns Array of resolved color strings
   */
  protected resolveColors(count: number, options: ColorResolutionOptions = {}): string[] {
    const {
      elementColors = [],
      paletteColors,
      defaultColor
    } = options;

    // Start with base colors based on priority
    let baseColors: string[];
    let colorMode: string;

    if (paletteColors && paletteColors.length > 0) {
      // Use palette colors, cycling if needed
      baseColors = Array.from({ length: count }, (_, i) => paletteColors[i % paletteColors.length]);
      colorMode = `palette [${paletteColors.length} colors]`;
    } else if (defaultColor) {
      baseColors = Array(count).fill(defaultColor);
      colorMode = `default (${defaultColor})`;
    } else {
      baseColors = this.generatePaletteColors(count);
      colorMode = 'auto';
    }

    // Apply element-level overrides (highest priority)
    const finalColors = baseColors.map((color, i) => elementColors[i] || color);

    // Count element overrides
    const overrideCount = elementColors.filter(c => c !== undefined && c !== '').length;

    this.log('info', 'colors.mode', `Color resolution mode: ${colorMode}`, colorMode);
    if (overrideCount > 0) {
      this.log('info', 'colors.overrides', `${overrideCount} element-level color override(s)`, overrideCount);
    }

    return finalColors;
  }

  /**
   * Resolve fill colors for chart elements.
   *
   * @param count Number of colors needed
   * @param elementColors Optional per-element color overrides
   * @param paletteColors Optional palette colors to use as base
   * @param defaultColor Optional default color if nothing else is specified
   * @returns Array of resolved fill colors
   */
  protected resolveFillColors(
    count: number,
    elementColors?: (string | undefined)[],
    paletteColors?: string[],
    defaultColor?: string
  ): string[] {
    return this.resolveColors(count, {
      elementColors,
      paletteColors,
      defaultColor
    });
  }

  /**
   * Parse the stroke shorthand attribute to extract color and width.
   * Supports formats like "2 #333", "#333 2", "2", "#333", "red 3".
   *
   * @returns Object with optional color and width properties
   */
  protected parseStroke(): { color?: string; width?: number } {
    if (!this.stroke) return {};

    const parts = this.stroke.trim().split(/\s+/);
    const result: { color?: string; width?: number } = {};

    for (const part of parts) {
      // Check if it looks like a color (hex, rgb, hsl, or named color)
      if (part.startsWith('#') || part.startsWith('rgb') || part.startsWith('hsl') ||
          /^[a-z]+$/i.test(part)) {
        result.color = part;
      } else {
        // Try to parse as a number (stroke width)
        const value = parseFloat(part);
        if (!isNaN(value)) {
          result.width = value;
        }
      }
    }

    return result;
  }

  /**
   * Get the effective stroke color and width, combining shorthand parsing
   * with explicit stroke-width attribute. Explicit attributes take precedence.
   *
   * @param defaultColor Default color if not specified (default: '#e0e0e0')
   * @param defaultWidth Default width if not specified (default: 1)
   * @returns Object with resolved color and width
   */
  protected getEffectiveStroke(defaultColor = '#e0e0e0', defaultWidth = 1): { color: string; width: number } {
    const parsed = this.parseStroke();
    return {
      color: parsed.color || defaultColor,
      width: this.strokeWidth ?? parsed.width ?? defaultWidth
    };
  }

  /**
   * Resolve stroke colors for chart elements.
   *
   * @param count Number of colors needed
   * @param elementColors Optional per-element color overrides
   * @param paletteColors Optional palette colors to use as base
   * @param defaultColor Optional default color if nothing else is specified
   * @returns Array of resolved stroke colors
   */
  protected resolveStrokeColors(
    count: number,
    elementColors?: (string | undefined)[],
    paletteColors?: string[],
    defaultColor?: string
  ): string[] {
    return this.resolveColors(count, {
      elementColors,
      paletteColors,
      defaultColor
    });
  }

  /**
   * Get base palette colors for the current palette setting.
   * Checks for user-defined DOM palette first, then falls back to built-in palettes.
   *
   * @param count Number of colors needed
   * @param colorType Which color to extract from user-defined palette ('fill' or 'stroke')
   * @returns Array of palette colors, or undefined if no palette is set
   */
  protected getPaletteColors(count: number, colorType: 'fill' | 'stroke' = 'fill'): string[] | undefined {
    if (!this.paletteId) return undefined;

    // Check for user-defined DOM palette first
    const domPalette = this.getPalette();
    if (domPalette) {
      // User-defined palette - extract colors in order from <dc-fill> children
      const fills = domPalette.getFills();
      if (fills.length > 0) {
        const colors = fills.map(f => colorType === 'fill' ? f.fill : f.stroke).filter((c): c is string => !!c);
        if (colors.length > 0) {
          this.log('info', 'colors.palette', `Using user-defined palette "${this.paletteId}" [${colors.length} colors]`);
          return colors;
        }
      }
    }

    // Fall back to built-in palette
    if (isBuiltinPalette(this.paletteId)) {
      const builtinPalette = getBuiltinPalette(this.paletteId)!;
      const colors = generateBuiltinPaletteColors(builtinPalette, count);
      this.log('info', 'colors.palette', `Using built-in palette "${this.paletteId}" (${builtinPalette.type})`);
      return colors;
    }

    // No palette found
    this.logError(ErrorCode.PALETTE_NOT_FOUND, { id: this.paletteId });
    return undefined;
  }

  /**
   * Resolve fill colors for chart elements with palette support.
   *
   * Priority order:
   * 1. Element's own fill attribute (explicit override)
   * 2. Palette match by value range (user-defined palettes only)
   * 3. Palette match by label (user-defined palettes only)
   * 4. Palette colors by index
   * 5. Auto-generated colors
   *
   * @param elements Array of element metadata for color resolution
   * @param defaultColor Optional default color if nothing else is specified
   * @returns Array of resolved fill colors
   */
  protected resolveFillColorsWithPalette(
    elements: Array<{ fill?: string; label?: string; value?: number }>,
    defaultColor?: string
  ): string[] {
    const count = elements.length;
    if (count === 0) return [];

    // Check for user-defined palette matches (label/value matching)
    const domPalette = this.getPalette();
    const paletteMatches: (string | undefined)[] = elements.map(el => {
      // Skip palette lookup if element has explicit fill
      if (el.fill) return undefined;
      // Only do label/value matching for user-defined palettes
      if (!domPalette) return undefined;

      const result = this.lookupPaletteColor(el.label, el.value);
      return result.fill;
    });

    // Combine element fills with palette matches (element > palette match)
    const effectiveFills = elements.map((el, i) => el.fill || paletteMatches[i]);

    // Log palette match usage
    const paletteMatchCount = paletteMatches.filter(c => c !== undefined).length;
    if (domPalette && paletteMatchCount > 0) {
      this.log('info', 'colors.palette.matches', `Palette "${this.paletteId}" matched ${paletteMatchCount} element(s) by label/value`);
    }

    // Get base palette colors (from user-defined or built-in palette)
    const basePaletteColors = this.getPaletteColors(count, 'fill');

    // Fall back to standard color resolution
    return this.resolveFillColors(count, effectiveFills, basePaletteColors, defaultColor);
  }

  /**
   * Resolve stroke colors for chart elements with palette support.
   *
   * Priority order:
   * 1. Element's own stroke attribute (explicit override)
   * 2. Palette match by value range (user-defined palettes only)
   * 3. Palette match by label (user-defined palettes only)
   * 4. Palette colors by index
   * 5. Auto-generated or default colors
   *
   * @param elements Array of element metadata for color resolution
   * @param defaultColor Optional default color if nothing else is specified
   * @returns Array of resolved stroke colors
   */
  protected resolveStrokeColorsWithPalette(
    elements: Array<{ stroke?: string; label?: string; value?: number }>,
    defaultColor?: string
  ): string[] {
    const count = elements.length;
    if (count === 0) return [];

    // Check for user-defined palette matches (label/value matching)
    const domPalette = this.getPalette();
    const paletteMatches: (string | undefined)[] = elements.map(el => {
      // Skip palette lookup if element has explicit stroke
      if (el.stroke) return undefined;
      // Only do label/value matching for user-defined palettes
      if (!domPalette) return undefined;

      const result = this.lookupPaletteColor(el.label, el.value);
      return result.stroke;
    });

    // Combine element strokes with palette matches (element > palette match)
    const effectiveStrokes = elements.map((el, i) => el.stroke || paletteMatches[i]);

    // Get base palette colors (from user-defined or built-in palette)
    const basePaletteColors = this.getPaletteColors(count, 'stroke');

    // Fall back to standard color resolution
    return this.resolveStrokeColors(count, effectiveStrokes, basePaletteColors, defaultColor);
  }

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

  static styles = css`
    :host {
      display: block;
      border: 2px solid #ddd;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      position: relative;
      box-sizing: border-box;
    }

    svg {
      display: block;
      width: 100%;
      height: auto;
    }

    /* Focus styles for keyboard navigation */
    svg:focus {
      outline: 2px solid #005fcc;
      outline-offset: 2px;
    }

    svg:focus:not(:focus-visible) {
      outline: none;
    }

    svg:focus-visible {
      outline: 2px solid #005fcc;
      outline-offset: 2px;
    }

    .popup {
      position: absolute;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 14px;
      pointer-events: auto;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-width: 300px;
      opacity: 0;
      transition: opacity 0.2s;
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

  protected showPopup(content: string, x: number, y: number) {
    this.popupContent = content;
    // Position popup offset from cursor (relative to host element)
    const rect = this.getBoundingClientRect();
    this.popupX = x - rect.left + 15;
    this.popupY = y - rect.top - 10;
    this.popupVisible = true;
  }

  protected hidePopup() {
    this.popupVisible = false;
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
    const svgEl = this.shadowRoot?.querySelector('svg');
    if (!svgEl) return false;

    const chartRect = this.getBoundingClientRect();
    const svgRect = svgEl.getBoundingClientRect();

    const pos = calculatePopupPosition(
      bounds,
      chartRect,
      svgRect,
      this.width,
      this.height
    );

    this.showPopup(content, pos.x, pos.y);
    return true;
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

  connectedCallback() {
    super.connectedCallback();
    // Apply defaults from <dc-defaults> elements before first render
    this.applyDefaults();
    // Add data attribute to host element for identification
    this.setAttribute('data-chart-type', this.tagName.toLowerCase());
    this.observeChildren();
  }

  disconnectedCallback() {
    this.childObserver?.disconnect();
    this.childObserver = undefined;
    super.disconnectedCallback();
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
    this.emitRender();
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

    return html`
      <svg
        viewBox="0 0 ${this.width} ${this.height}"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="${ariaLabelValue}"
        aria-describedby="${descriptionContent ? this.descriptionId : ''}"
        tabindex="${hasFocusableElements ? 0 : -1}"
        @keydown="${this.handleChartKeyDown}"
        @focus="${this.handleChartFocus}"
        @blur="${this.handleChartBlur}"
      >
        ${this.renderDefs()}
        ${descriptionContent ? svg`<desc id="${this.descriptionId}">${descriptionContent}</desc>` : ''}
        ${this.renderTitle()}
        ${this.renderChart()}
        ${this.renderFocusIndicator()}
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
   * Handle keyboard events on the chart SVG.
   * Implements roving tabindex navigation pattern.
   */
  protected handleChartKeyDown(e: KeyboardEvent): void {
    const focusable = this.getFocusableElements();
    if (focusable.length === 0) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        this.focusNextElement();
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        this.focusPreviousElement();
        break;

      case 'Home':
        e.preventDefault();
        this.focusElement(0);
        break;

      case 'End':
        e.preventDefault();
        this.focusElement(focusable.length - 1);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        this.activateCurrentElement();
        break;

      case 'Escape':
        e.preventDefault();
        this.hidePopup();
        // Return focus to the chart container
        this.focusedIndex = -1;
        this.keyboardActive = false;
        const svg = this.shadowRoot?.querySelector('svg');
        svg?.blur();
        break;
    }
  }

  /**
   * Handle focus entering the chart SVG.
   */
  protected handleChartFocus(): void {
    this.keyboardActive = true;
    const focusable = this.getFocusableElements();
    // If no element is focused yet, focus the first one
    if (this.focusedIndex === -1 && focusable.length > 0) {
      this.focusedIndex = 0;
    }
  }

  /**
   * Handle focus leaving the chart SVG.
   */
  protected handleChartBlur(e: FocusEvent): void {
    // Only deactivate if focus is leaving the chart entirely
    const relatedTarget = e.relatedTarget as Element | null;
    if (!relatedTarget || !this.shadowRoot?.contains(relatedTarget)) {
      this.keyboardActive = false;
      // Keep focusedIndex so we return to the same element
    }
  }

  /**
   * Focus a specific element by index.
   */
  protected focusElement(index: number): void {
    const focusable = this.getFocusableElements();
    if (index < 0 || index >= focusable.length) return;

    this.focusedIndex = index;
    this.keyboardActive = true;

    // Find the SVG element and focus it (the visual indicator shows on the shape)
    const svg = this.shadowRoot?.querySelector('svg');
    if (svg && document.activeElement !== svg) {
      svg.focus();
    }

    // Show popup for the focused element if it has a hover popup
    const element = focusable[index];
    if (element.popupTrigger === 'hover') {
      this.showPopupForFocusedElement(index);
    }
  }

  /**
   * Focus the next element in the list.
   */
  protected focusNextElement(): void {
    const focusable = this.getFocusableElements();
    if (focusable.length === 0) return;

    const nextIndex = this.focusedIndex < focusable.length - 1
      ? this.focusedIndex + 1
      : 0; // Wrap to beginning

    this.focusElement(nextIndex);
  }

  /**
   * Focus the previous element in the list.
   */
  protected focusPreviousElement(): void {
    const focusable = this.getFocusableElements();
    if (focusable.length === 0) return;

    const prevIndex = this.focusedIndex > 0
      ? this.focusedIndex - 1
      : focusable.length - 1; // Wrap to end

    this.focusElement(prevIndex);
  }

  /**
   * Activate the currently focused element.
   * - If it has an href, navigate to it
   * - If it has a click popup, toggle the popup
   */
  protected activateCurrentElement(): void {
    const focusable = this.getFocusableElements();
    if (this.focusedIndex < 0 || this.focusedIndex >= focusable.length) return;

    const element = focusable[this.focusedIndex];

    // If it has an href, navigate to it
    if (element.href) {
      this.navigateToHref(element.href);
      return;
    }

    // If it has a click popup, toggle it
    if (element.popupTrigger === 'click') {
      this.togglePopupForFocusedElement(this.focusedIndex);
    }
  }

  /**
   * Navigate to the specified URL.
   * Extracted for testability - can be mocked in tests.
   */
  protected navigateToHref(href: string): void {
    window.location.href = href;
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
  public downloadSvg(filename: string = 'chart.svg'): void {
    const svg = this.shadowRoot?.querySelector('svg');
    if (!svg) {
      console.warn(`[${ErrorCode.SVG_NOT_FOUND.code}] ${ErrorCode.SVG_NOT_FOUND.message}`);
      return;
    }

    // Ensure filename has .svg extension
    if (!filename.toLowerCase().endsWith('.svg')) {
      filename += '.svg';
    }

    // Clone the SVG so we don't modify the live DOM
    const svgClone = svg.cloneNode(true) as SVGElement;

    // Prepare the SVG for standalone use
    this.prepareSvgForExport(svgClone);

    // Serialize to string
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgClone);

    // Add XML declaration for proper standalone SVG
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

    // Create Blob and trigger download
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL
    URL.revokeObjectURL(url);
  }

  /**
   * Prepare an SVG element for standalone export.
   * Inlines computed styles that wouldn't otherwise be available in a standalone SVG file.
   *
   * @param svgElement The cloned SVG element to prepare
   */
  private prepareSvgForExport(svgElement: SVGElement): void {
    // Add xmlns attribute if not present (required for standalone SVG)
    if (!svgElement.hasAttribute('xmlns')) {
      svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    // Get the computed font-family from the host element
    const computedStyle = window.getComputedStyle(this);
    const fontFamily = computedStyle.fontFamily;

    // Apply font-family to all text elements that don't have an explicit font-family
    const textElements = svgElement.querySelectorAll('text');
    textElements.forEach(textEl => {
      if (!textEl.hasAttribute('font-family') || textEl.getAttribute('font-family') === '') {
        textEl.setAttribute('font-family', fontFamily);
      }
    });

    // Set explicit width/height attributes based on viewBox for better compatibility
    // with image editors and viewers that don't handle viewBox-only sizing well
    if (!svgElement.hasAttribute('width') || !svgElement.hasAttribute('height')) {
      svgElement.setAttribute('width', String(this.width));
      svgElement.setAttribute('height', String(this.height));
    }
  }
}
