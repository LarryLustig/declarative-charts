import { LitElement, css, html, svg, SVGTemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { ChartTitle } from './chart-title.js';
import type { ChartLegend } from './chart-legend.js';

/**
 * Color mode for resolving chart element colors.
 * - 'single': Use a single color for all elements
 * - 'palette': Cycle through a list of colors
 * - 'gradient': Interpolate between start and end colors
 * - 'auto': Auto-generate colors using golden ratio algorithm
 */
export type ColorMode = 'single' | 'palette' | 'gradient' | 'auto';

/**
 * Options for resolving colors for chart elements.
 */
export interface ColorResolutionOptions {
  /** Per-element color overrides (from element's fill attribute) */
  elementColors?: (string | undefined)[];
  /** Start color for gradient mode */
  startColor?: string;
  /** End color for gradient mode */
  endColor?: string;
  /** Palette of colors (array, comma-separated string, or "auto" for auto-generation) */
  palette?: string | string[];
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
 * Represents a show condition that can be:
 * - boolean: true/false for always show/hide
 * - { type: 'value', threshold: number }: show only when value >= threshold
 * - { type: 'percent', threshold: number }: show only when percent >= threshold
 */
export type ShowCondition =
  | boolean
  | { type: 'value'; threshold: number }
  | { type: 'percent'; threshold: number };

/**
 * Custom converter for show-* attributes that handles:
 * - "false" or absent → false
 * - "true" or "" (present without value) → true
 * - "5%" → { type: 'percent', threshold: 5 }
 * - "100" or "100px" (number without %) → { type: 'value', threshold: 100 }
 */
export const showConditionConverter = {
  fromAttribute: (value: string | null): ShowCondition => {
    if (value === null) return false;
    if (value === 'false') return false;
    if (value === '' || value === 'true') return true;

    // Check for percentage threshold
    if (value.endsWith('%')) {
      const threshold = parseFloat(value);
      if (!isNaN(threshold)) {
        return { type: 'percent', threshold };
      }
    }

    // Check for value threshold (number, optionally with px suffix)
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return { type: 'value', threshold: numValue };
    }

    // Default to true for any other non-empty string
    return true;
  },
  toAttribute: (value: ShowCondition): string | null => {
    if (typeof value === 'boolean') {
      return value ? '' : null;
    }
    if (value.type === 'percent') {
      return `${value.threshold}%`;
    }
    return `${value.threshold}`;
  }
};

/**
 * Log level for chart logging system.
 * - 'error': Calculation failures, invalid inputs
 * - 'warning': Fallbacks used, deprecated attributes
 * - 'info': Normal derivation messages
 */
export type LogLevel = 'error' | 'warning' | 'info';

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
}

/**
 * @deprecated Use showConditionConverter instead
 * Legacy converter kept for backwards compatibility
 */
export const booleanConverter = {
  fromAttribute: (value: string | null) => {
    if (value === null) return false;
    if (value === 'false') return false;
    return true;
  },
  toAttribute: (value: boolean) => {
    return value ? '' : null;
  }
};

/**
 * Converter for optional boolean attributes that need to distinguish between
 * undefined (attribute absent), true, and false.
 *
 * Use this for attributes that inherit from a parent when not specified.
 * Standard Lit Boolean type treats ANY attribute presence as true.
 * This converter properly handles attribute="false".
 *
 * - null (absent) → undefined (inherit from parent)
 * - "false" → false (explicitly disabled)
 * - "" or "true" or any other value → true (explicitly enabled)
 */
export const optionalBooleanConverter = {
  fromAttribute(value: string | null): boolean | undefined {
    if (value === null) {
      return undefined; // Attribute not present - inherit from parent
    }
    // Attribute present - check if explicitly "false"
    return value.toLowerCase() !== 'false';
  },
  toAttribute(value: boolean | undefined): string | null {
    if (value === undefined) {
      return null; // Remove attribute
    }
    return value ? '' : 'false';
  }
};

/**
 * Base class for chart components with popup support
 */
export abstract class BaseChart extends LitElement {
  @property({ type: Number })
  width = 600;

  @property({ type: Number })
  height = 400;

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
   * Log entries captured during the last render cycle.
   * Cleared at the start of each render.
   */
  protected logEntries: LogEntry[] = [];

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
  // Color System Properties
  // ============================================================================

  /**
   * Fill colors for elements.
   * Can be a single color (e.g., "#f00"), a comma-separated list (e.g., "#f00,#0f0,#00f"),
   * or "auto" for algorithmic generation using golden ratio.
   * Colors cycle if there are more elements than colors.
   */
  @property({ type: String, attribute: 'fill-colors' })
  fillColors?: string;

  /**
   * Start color for gradient fill mode.
   * When both fill-start-color and fill-end-color are set,
   * colors are interpolated between them using HSL for vibrant intermediates.
   * Takes precedence over fill-colors.
   */
  @property({ type: String, attribute: 'fill-start-color' })
  fillStartColor?: string;

  /**
   * End color for gradient fill mode.
   * Used with fill-start-color to create color gradients.
   */
  @property({ type: String, attribute: 'fill-end-color' })
  fillEndColor?: string;

  /**
   * Stroke colors for elements.
   * Can be a single color, a comma-separated list, or "auto".
   * Colors cycle if there are more elements than colors.
   */
  @property({ type: String, attribute: 'stroke-colors' })
  strokeColors?: string;

  /**
   * Start color for gradient stroke mode.
   */
  @property({ type: String, attribute: 'stroke-start-color' })
  strokeStartColor?: string;

  /**
   * End color for gradient stroke mode.
   */
  @property({ type: String, attribute: 'stroke-end-color' })
  strokeEndColor?: string;

  /**
   * Stroke width for all elements (in pixels).
   */
  @property({ type: Number, attribute: 'stroke-width' })
  strokeWidth?: number;

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

  /**
   * Format a value string based on show-value and show-percent settings.
   *
   * Logic:
   * - Both false: returns null (nothing to display)
   * - show-value only: returns the value as string
   * - show-percent only: returns the percentage with % suffix
   * - Both true: returns "value (percent%)"
   *
   * @param value The numeric value
   * @param percent The percentage value (0-100)
   * @param showValue Whether to show the value (after threshold evaluation)
   * @param showPercent Whether to show the percentage (after threshold evaluation)
   * @returns Formatted string or null if nothing should be displayed
   */
  protected formatValueString(
    value: number,
    percent: number,
    showValue: boolean,
    showPercent: boolean
  ): string | null {
    if (!showValue && !showPercent) {
      return null;
    }
    if (showValue && showPercent) {
      return `${value} (${percent.toFixed(1)}%)`;
    }
    if (showValue) {
      return `${value}`;
    }
    // showPercent only
    return `${percent.toFixed(1)}%`;
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
   * Parse a CSS value that may include percentages
   * Supports: plain numbers, px, rem, em (assumes 16px = 1rem/em), and % (of reference value)
   * @param value The CSS value string to parse
   * @param referenceValue The reference value for percentage calculations
   * @returns The calculated pixel value, or undefined if parsing fails
   */
  protected parseCSSValueWithPercent(value: string, referenceValue: number): number | undefined {
    const trimmed = value.trim();
    if (trimmed === '') return undefined;

    // Check for percentage
    if (trimmed.endsWith('%')) {
      const percent = parseFloat(trimmed);
      if (!isNaN(percent)) {
        return (percent / 100) * referenceValue;
      }
      return undefined;
    }

    // Check for rem
    if (trimmed.endsWith('rem')) {
      const rem = parseFloat(trimmed);
      if (!isNaN(rem)) {
        return rem * 16;
      }
      return undefined;
    }

    // Check for em
    if (trimmed.endsWith('em')) {
      const em = parseFloat(trimmed);
      if (!isNaN(em)) {
        return em * 16;
      }
      return undefined;
    }

    // Otherwise, parse as pixels (with or without 'px' suffix)
    const numeric = parseFloat(trimmed);
    if (!isNaN(numeric)) {
      return numeric;
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
    const ctx = this.getMeasureContext();
    if (!ctx) {
      // Fallback to estimation if canvas not available
      return text.length * fontSize * 0.6;
    }

    // If no font family specified, try to get computed style from this element
    if (!fontFamily) {
      const computedStyle = window.getComputedStyle(this);
      fontFamily = computedStyle.fontFamily || 'sans-serif';
    }

    ctx.font = `${fontSize}px ${fontFamily}`;
    return ctx.measureText(text).width;
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
   * Log a message during chart rendering.
   * Messages are captured in logEntries and can be retrieved via getLogEntries().
   * Only logs if the logging attribute is set to an appropriate level.
   *
   * @param level Severity level: 'info', 'warning', or 'error'
   * @param path Dotted path identifying what was calculated (e.g., "padding.left", "slices[0].angle")
   * @param message Human-readable description of the calculation or issue
   * @param value Optional computed value
   */
  protected log(level: LogLevel, path: string, message: string, value?: unknown): void {
    if (this.shouldLog(level)) {
      this.logEntries.push({ level, path, message, value });
    }
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
   */
  protected clearLog(): void {
    this.logEntries = [];
  }

  // ============================================================================
  // Color System Utilities
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
   * Convert RGB color values to HSL (Hue, Saturation, Lightness).
   *
   * @param r Red component (0-255)
   * @param g Green component (0-255)
   * @param b Blue component (0-255)
   * @returns [hue (0-360), saturation (0-1), lightness (0-1)]
   */
  protected rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
      // Achromatic (gray)
      return [0, 0, l];
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h: number;
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }

    return [h * 360, s, l];
  }

  /**
   * Convert HSL color values to RGB.
   *
   * @param h Hue (0-360)
   * @param s Saturation (0-1)
   * @param l Lightness (0-1)
   * @returns [red (0-255), green (0-255), blue (0-255)]
   */
  protected hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = h / 360;

    if (s === 0) {
      // Achromatic (gray)
      const gray = Math.round(l * 255);
      return [gray, gray, gray];
    }

    const hueToRgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return [
      Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
      Math.round(hueToRgb(p, q, h) * 255),
      Math.round(hueToRgb(p, q, h - 1 / 3) * 255)
    ];
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
   * Generate a gradient of colors between two colors.
   * Uses linear RGB interpolation for smooth color transitions.
   *
   * @param startColor Starting color (CSS color string)
   * @param endColor Ending color (CSS color string)
   * @param count Number of colors to generate
   * @returns Array of color strings in RGB format, or null if colors cannot be parsed
   */
  protected generateGradientColors(
    startColor: string,
    endColor: string,
    count: number
  ): string[] | null {
    const startRgb = this.parseColor(startColor);
    const endRgb = this.parseColor(endColor);

    if (!startRgb || !endRgb) return null;

    // Convert to HSL for perceptually uniform interpolation
    const startHsl = this.rgbToHsl(startRgb[0], startRgb[1], startRgb[2]);
    const endHsl = this.rgbToHsl(endRgb[0], endRgb[1], endRgb[2]);

    // Calculate the shortest path around the hue wheel
    let hueDiff = endHsl[0] - startHsl[0];
    if (hueDiff > 180) {
      hueDiff -= 360;
    } else if (hueDiff < -180) {
      hueDiff += 360;
    }

    const colors: string[] = [];

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);

      // Interpolate in HSL space
      let h = startHsl[0] + hueDiff * t;
      // Normalize hue to 0-360
      if (h < 0) h += 360;
      if (h >= 360) h -= 360;

      const s = startHsl[1] + (endHsl[1] - startHsl[1]) * t;
      const l = startHsl[2] + (endHsl[2] - startHsl[2]) * t;

      // Convert back to RGB
      const [r, g, b] = this.hslToRgb(h, s, l);
      colors.push(`rgb(${r}, ${g}, ${b})`);
    }

    return colors;
  }

  /**
   * Resolve colors for chart elements based on the color resolution order:
   * 1. Element-level color (highest priority)
   * 2. Gradient (if both start and end are present)
   * 3. Palette (if present, or "auto" for generation)
   * 4. Default/fallback (auto-generated)
   *
   * @param count Number of colors needed
   * @param options Color resolution options
   * @returns Array of resolved color strings
   */
  protected resolveColors(count: number, options: ColorResolutionOptions = {}): string[] {
    const {
      elementColors = [],
      startColor,
      endColor,
      palette,
      defaultColor
    } = options;

    // Start with base colors based on priority
    let baseColors: string[];
    let colorMode: string;

    // Priority 2: Gradient (if both start and end are present)
    if (startColor && endColor) {
      const gradientColors = this.generateGradientColors(startColor, endColor, count);
      if (gradientColors) {
        baseColors = gradientColors;
        colorMode = `gradient (${startColor} → ${endColor})`;
      } else {
        // Fallback to auto if gradient generation fails
        baseColors = this.generatePaletteColors(count);
        colorMode = 'auto (gradient failed)';
      }
    }
    // Priority 3: Palette (can be single color, comma-separated list, or "auto")
    else if (palette) {
      if (palette === 'auto') {
        baseColors = this.generatePaletteColors(count);
        colorMode = 'auto (palette="auto")';
      } else if (Array.isArray(palette)) {
        // Use palette colors, cycling if needed
        baseColors = Array.from({ length: count }, (_, i) => palette[i % palette.length]);
        colorMode = `palette array [${palette.length} colors]`;
      } else {
        // Parse comma-separated string (single color works too - just one item in array)
        const paletteArray = palette.split(',').map(c => c.trim()).filter(c => c);
        if (paletteArray.length > 0) {
          baseColors = Array.from({ length: count }, (_, i) => paletteArray[i % paletteArray.length]);
          colorMode = paletteArray.length === 1
            ? `single color (${paletteArray[0]})`
            : `palette [${paletteArray.length} colors]`;
        } else {
          baseColors = this.generatePaletteColors(count);
          colorMode = 'auto (empty palette)';
        }
      }
    }
    // Priority 4: Default or auto-generate
    else if (defaultColor) {
      baseColors = Array(count).fill(defaultColor);
      colorMode = `default (${defaultColor})`;
    } else {
      baseColors = this.generatePaletteColors(count);
      colorMode = 'auto (no colors specified)';
    }

    // Priority 1: Apply element-level overrides
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
   * Resolve fill colors for chart elements using the chart's fill-* properties.
   * This is a convenience method that wraps resolveColors with the fill properties.
   *
   * @param count Number of colors needed
   * @param elementColors Optional per-element color overrides
   * @param defaultColor Optional default color if nothing else is specified
   * @returns Array of resolved fill colors
   */
  protected resolveFillColors(
    count: number,
    elementColors?: (string | undefined)[],
    defaultColor?: string
  ): string[] {
    return this.resolveColors(count, {
      elementColors,
      startColor: this.fillStartColor,
      endColor: this.fillEndColor,
      palette: this.fillColors,
      defaultColor
    });
  }

  /**
   * Resolve stroke colors for chart elements using the chart's stroke-* properties.
   *
   * @param count Number of colors needed
   * @param elementColors Optional per-element color overrides
   * @param defaultColor Optional default color if nothing else is specified
   * @returns Array of resolved stroke colors
   */
  protected resolveStrokeColors(
    count: number,
    elementColors?: (string | undefined)[],
    defaultColor?: string
  ): string[] {
    return this.resolveColors(count, {
      elementColors,
      startColor: this.strokeStartColor,
      endColor: this.strokeEndColor,
      palette: this.strokeColors,
      defaultColor
    });
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
  protected getLegendItems(): Array<{ label: string; color: string; value: number }> {
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
   * Calculate the optimal number of columns for a legend with columns="auto".
   * For top/bottom legends: calculates how many columns fit in chart width
   * For left/right legends: if padding is explicit, calculates columns that fit; if auto, returns 1
   *
   * @param items Legend items with display values already computed
   * @param position Legend position
   * @param columnWidth Width of a single column in the tabular layout
   * @param columnGap Gap between columns
   * @returns The calculated number of columns
   */
  protected calculateAutoColumns(
    items: Array<{ label: string; color: string; value: number; displayValue: string | null }>,
    position: string,
    columnWidth: number,
    columnGap: number
  ): number {
    const numItems = items.length;
    if (numItems === 0) return 1;

    const isHorizontalPosition = position.startsWith('top') || position.startsWith('bottom');

    if (isHorizontalPosition) {
      // Top/bottom legends: calculate how many columns fit in chart width
      // Available width = chart width - some margin for background padding (40px total)
      const availableWidth = this.width - 40;

      // Calculate max columns that fit: columns * columnWidth + (columns-1) * columnGap <= availableWidth
      // columns * (columnWidth + columnGap) - columnGap <= availableWidth
      // columns <= (availableWidth + columnGap) / (columnWidth + columnGap)
      const maxColumnsByWidth = Math.floor((availableWidth + columnGap) / (columnWidth + columnGap));

      // Don't use more columns than items
      return Math.max(1, Math.min(maxColumnsByWidth, numItems));
    } else {
      // Left/right legends: check if padding is explicit or auto
      const side = position === 'left' ? 'left' : 'right';
      const isAuto = this.isPaddingAuto(side);

      if (isAuto) {
        // Can't calculate columns when padding is auto (circular dependency) - use 1
        return 1;
      }

      // Padding is explicit - calculate how many columns fit
      const padding = this.getChartPadding();
      const availablePadding = side === 'left' ? padding.left : padding.right;

      // Available width = padding - some margin for background (40px total, so 20px per side inside legend)
      const availableWidth = availablePadding - 40;
      if (availableWidth <= columnWidth) {
        return 1;
      }

      const maxColumnsByWidth = Math.floor((availableWidth + columnGap) / (columnWidth + columnGap));
      return Math.max(1, Math.min(maxColumnsByWidth, numItems));
    }
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

        // Add trailing margin after the last element, but only if it's a title
        // (legend dimensions already include internal padding/margin)
        const lastItem = contentOnSide[contentOnSide.length - 1];
        if (lastItem.type === 'title') {
          const trailingMargin = 10;
          totalContentSize += trailingMargin;
          contentDetails.push(`trailingMargin(${trailingMargin})`);
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
      this.log('warning', 'title.style', warning.message);
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

  connectedCallback() {
    super.connectedCallback();
    // Add data attribute to host element for identification
    this.setAttribute('data-chart-type', this.tagName.toLowerCase());
  }

  render() {
    // Clear log entries at the start of each render cycle
    this.clearLog();

    return html`
      <svg
        viewBox="0 0 ${this.width} ${this.height}"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${this.renderTitle()}
        ${this.renderChart()}
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
    items?: Array<{ label: string; color: string; value: number }>
  ): { width: number; height: number; position: string } | null {
    const legend = this.getLegend();
    if (!legend) return null;

    // If no items provided, we can't calculate dimensions
    // This is a limitation - subclasses should provide items when calling
    if (!items || items.length === 0) {
      // Return conservative estimates based on position
      const position = legend.position || 'right';
      if (position === 'right' || position === 'left') {
        this.log('info', 'legend.dimensions', `No items, using estimates for ${position} position`, { width: 150, height: 100, position });
        return { width: 150, height: 100, position };
      } else {
        const width = this.width * 0.8;
        this.log('info', 'legend.dimensions', `No items, using estimates for ${position} position`, { width, height: 80, position });
        return { width, height: 80, position };
      }
    }

    const position = legend.position || 'right';
    const columns = legend.columns || '1';
    const showLabel = legend.hasAttribute('show-label') ? legend.showLabel : true;
    const showValue = legend.hasAttribute('show-value') ? legend.showValue : this.showValue;
    const showPercent = legend.hasAttribute('show-percent') ? legend.showPercent : this.showPercent;
    const titleInfo = legend.getTitleInfo();

    // Determine if position is horizontal (top/bottom) or vertical (left/right)
    const isHorizontalPosition = position.startsWith('top') || position.startsWith('bottom');

    // Calculate total for percentage computation
    const total = items.reduce((sum, item) => sum + item.value, 0);

    // Pre-compute display strings for each item
    const itemsWithDisplay = items.map(item => {
      const percent = total > 0 ? (item.value / total) * 100 : 0;
      let displayValue: string | null = null;

      if (showValue || showPercent) {
        if (showValue && showPercent) {
          displayValue = `${item.value} (${percent.toFixed(1)}%)`;
        } else if (showValue) {
          displayValue = `${item.value}`;
        } else {
          displayValue = `${percent.toFixed(1)}%`;
        }
      }

      return { ...item, displayValue };
    });

    // Layout constants
    const colorBoxWidth = 18;
    const colorBoxGap = 7;
    const labelValueGap = 10;
    const itemPadding = 5;
    const fontSize = 13;
    const itemHeight = 25;
    const columnGap = 15;

    // Calculate text widths using actual font metrics
    const labelWidth = showLabel
      ? Math.max(...itemsWithDisplay.map(item => this.measureText(item.label || '', fontSize)))
      : 0;
    const displayValueWidth = Math.max(
      ...itemsWithDisplay.map(item => this.measureText(item.displayValue || '', fontSize - 1))
    );

    let legendWidth: number;
    let legendHeight: number;
    let layoutType: string;
    let numColumns: number;

    // Calculate columnWidth first (needed for both explicit columns and auto calculation)
    const columnWidth = colorBoxWidth + colorBoxGap + labelWidth +
      (showLabel && displayValueWidth > 0 ? labelValueGap : 0) +
      displayValueWidth + itemPadding;

    // Calculate title contributions for positioned titles
    const titleFontSize = 14;
    const titleHeight = 25; // Height for title row

    // For left/right titles: rotated text needs space for font height, not text width
    let titleWidthContribution = 0;
    if (titleInfo && (titleInfo.position === 'left' || titleInfo.position === 'right')) {
      titleWidthContribution = titleFontSize + 10; // font height + small gap
    }

    // For top/bottom titles: need vertical space for the title
    let titleHeightContribution = 0;
    if (titleInfo && (titleInfo.position === 'top' || titleInfo.position === 'bottom' ||
        titleInfo.position?.startsWith('top') || titleInfo.position?.startsWith('bottom'))) {
      titleHeightContribution = titleHeight;
    }

    if (columns === '*') {
      // Wrapped layout
      layoutType = 'wrapped';
      numColumns = 0; // Not applicable for wrapped
      const lineHeight = 20;
      const wrappedColorBoxWidth = 12;
      const wrappedColorBoxGap = 4;
      const wrappedItemGap = 12;
      const wrappedFontSize = 12;

      // Calculate maxWidth for wrapping
      let maxWidth: number;
      if (legend.maxWidth) {
        const parsedMaxWidth = this.parseCSSValueWithPercent(legend.maxWidth, this.width);
        maxWidth = parsedMaxWidth ?? this.width * 0.8;
      } else if (isHorizontalPosition) {
        maxWidth = this.width * 0.8;
      } else {
        maxWidth = this.width * 0.25;
      }

      // Simulate wrapping to calculate height
      let currentX = 0;
      let currentY = 0;

      for (const item of itemsWithDisplay) {
        let text = '';
        if (showLabel) text += item.label;
        if (item.displayValue) {
          text += showLabel ? ` (${item.displayValue})` : item.displayValue;
        }

        const textWidth = this.measureText(text, wrappedFontSize);
        const itemWidth = wrappedColorBoxWidth + wrappedColorBoxGap + textWidth + wrappedItemGap;

        if (currentX + itemWidth > maxWidth && currentX > 0) {
          currentX = 0;
          currentY += lineHeight;
        }
        currentX += itemWidth;
      }

      legendWidth = maxWidth + titleWidthContribution + 20; // Add title width (if left/right) + margin
      legendHeight = currentY + lineHeight + titleHeightContribution + 20 + 20; // content + title height (if top/bottom) + padding + margin
    } else {
      // Tabular layout - resolve column count (may be 'auto' or explicit number)
      layoutType = 'tabular';
      if (columns === 'auto') {
        numColumns = this.calculateAutoColumns(itemsWithDisplay, position, columnWidth, columnGap);
      } else {
        numColumns = Math.max(1, parseInt(columns, 10) || 1);
      }

      legendWidth = numColumns * columnWidth + (numColumns - 1) * columnGap + titleWidthContribution + 20 + 20; // content + title width (if left/right) + padding + margin
      const rowCount = Math.ceil(items.length / numColumns);
      legendHeight = rowCount * itemHeight + titleHeightContribution + 20 + 20; // content + title height (if top/bottom) + padding + margin
    }

    this.log('info', 'legend.position', `Legend position`, position);
    this.log('info', 'legend.layout', `Layout: ${layoutType}${numColumns > 0 ? `, ${numColumns} column(s)` : ''}`, { layout: layoutType, columns: numColumns });
    this.log('info', 'legend.dimensions', `width=${legendWidth.toFixed(1)}, height=${legendHeight.toFixed(1)}`, { width: legendWidth, height: legendHeight });
    if (titleInfo) {
      this.log('info', 'legend.title', `Title "${titleInfo.text}" at ${titleInfo.position}`, titleInfo);
    }

    return { width: legendWidth, height: legendHeight, position };
  }

  /**
   * Render a legend for the chart using absolute SVG coordinates
   * @param items Array of legend items with label, color, and value
   */
  protected renderLegend(
    items: Array<{ label: string; color: string; value: number }>
  ): SVGTemplateResult {
    const legend = this.getLegend();
    if (!legend) return svg``;

    // Check for common style mistakes and log warnings
    const legendWarnings = legend.getStyleWarnings();
    for (const warning of legendWarnings) {
      this.log('warning', 'legend.style', warning.message);
    }

    const titleInfo = legend.getTitleInfo(); // null if no <dc-title> inside legend

    // Calculate title width contribution early - needed for positioning calculations
    // For rotated text (left/right titles), we need space for the font height, not text width
    const titleFontSizeEarly = 14;
    const titleHeightEarly = 25;
    const titlePosition = titleInfo?.position || 'top';
    // Only right-positioned titles affect the width positioning calculation
    // Left-positioned titles expand the background to the left, not affecting the content start position
    const titleWidthForPositioning = (titleInfo && titlePosition === 'right') ? titleFontSizeEarly + 10 : 0;
    // Full title width contribution (for both left and right) - used in dimension calculations
    const isTitleVertical = titlePosition === 'left' || titlePosition === 'right';
    const titleWidthContribution = (titleInfo && isTitleVertical) ? titleFontSizeEarly + 10 : 0;
    // Title height contribution for top/bottom titles - affects legend total height in positioning
    const isTitleHorizontal = titlePosition === 'top' || titlePosition === 'bottom' ||
        titlePosition?.startsWith('top') || titlePosition?.startsWith('bottom');
    const titleHeightForPositioning = (titleInfo && isTitleHorizontal) ? titleHeightEarly : 0;
    // Only TOP-positioned titles need to offset the content start position
    const isTitleAtTop = titlePosition === 'top' || titlePosition?.startsWith('top');
    const titleHeightForContentOffset = (titleInfo && isTitleAtTop) ? titleHeightEarly : 0;

    // Inherit show-label from legend if explicitly set, otherwise default to true
    const showLabel = legend.hasAttribute('show-label') ? legend.showLabel : true;
    // Inherit show-value and show-percent from chart if not explicitly set on legend
    const showValue = legend.hasAttribute('show-value') ? legend.showValue : this.showValue;
    const showPercent = legend.hasAttribute('show-percent') ? legend.showPercent : this.showPercent;
    const columns = legend.columns || '1';
    const position = legend.position || 'right';

    // Determine if position is horizontal (top/bottom) or vertical (left/right)
    const isHorizontalPosition = position.startsWith('top') || position.startsWith('bottom');

    // Calculate total for percentage computation
    const total = items.reduce((sum, item) => sum + item.value, 0);

    // Pre-compute display strings for each item using formatValueString logic
    const itemsWithDisplay = items.map(item => {
      const percent = total > 0 ? (item.value / total) * 100 : 0;
      let displayValue: string | null = null;

      if (showValue || showPercent) {
        if (showValue && showPercent) {
          displayValue = `${item.value} (${percent.toFixed(1)}%)`;
        } else if (showValue) {
          displayValue = `${item.value}`;
        } else {
          displayValue = `${percent.toFixed(1)}%`;
        }
      }

      return { ...item, displayValue };
    });

    // x and y will be set to absolute SVG coordinates (where legend content starts)
    // Legends are now positioned within the chart's padding area (not in expanded SVG space)
    let x = 0;
    let y = 0;

    // Get padding - this already accounts for legend dimensions on the appropriate side
    const padding = this.getChartPadding();

    // Get axis label padding to know how much space is reserved for axis labels
    // The legend should be positioned AFTER the axis labels, not overlapping them
    const axisLabelPadding = this.getAxisLabelPadding();

    // Get padding area content to determine legend's position in the stack
    const paddingContent = this.getPaddingAreaContent();
    const legendSide = this.getLegendSide(position);

    // Calculate title dimensions for separator calculation
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

    // For right/left legends, calculate y position (centered vertically in chart area)
    if (position === 'right' || position === 'left') {
      const chartHeight = this.height - padding.top - padding.bottom;
      const legendHeight = items.length * 25 + 60;
      // Center legend vertically within the chart content area
      y = padding.top + (chartHeight - legendHeight) / 2 + 20;
    }

    // Layout constants for tabular legend
    const itemHeight = 25;
    const colorBoxWidth = 18;
    const colorBoxGap = 7; // Gap after color box
    const labelValueGap = 10; // Gap between label and value
    const itemPadding = 5; // Padding at end of item
    const fontSize = 13; // Font size used in tabular legend
    const columnGap = 15; // Gap between columns

    // Find the maximum label width and display value width using actual font metrics
    const labelWidth = showLabel
      ? Math.max(...itemsWithDisplay.map(item => this.measureText(item.label || '', fontSize)))
      : 0;
    const displayValueWidth = Math.max(
      ...itemsWithDisplay.map(item => this.measureText(item.displayValue || '', fontSize - 1))
    );
    const columnWidth = colorBoxWidth + colorBoxGap + labelWidth +
      (showLabel && displayValueWidth > 0 ? labelValueGap : 0) +
      displayValueWidth + itemPadding;

    // Calculate number of columns - handle 'auto', '*', or explicit number
    let numColumns: number;
    if (columns === '*') {
      numColumns = 1; // Wrapped layout doesn't use column count the same way
    } else if (columns === 'auto') {
      numColumns = this.calculateAutoColumns(itemsWithDisplay, position, columnWidth, columnGap);
    } else {
      numColumns = Math.max(1, parseInt(columns, 10) || 1);
    }

    const calculatedTabularWidth = numColumns * columnWidth + (numColumns - 1) * columnGap;

    // Calculate maxWidth for legend
    // Priority: explicit max-width attribute > position-based default
    let maxWidth: number;
    if (legend.maxWidth) {
      // Parse the explicit max-width value (supports px, rem, em, %)
      const parsedMaxWidth = this.parseCSSValueWithPercent(legend.maxWidth, this.width);
      maxWidth = parsedMaxWidth ?? this.width * 0.8; // Fallback to 80% if parsing fails
    } else {
      // Calculate default based on position and column layout
      if (isHorizontalPosition) {
        // Top/bottom positions: 80% of chart width
        maxWidth = this.width * 0.8;
      } else {
        // Left/right positions
        if (columns === '*') {
          // Wrapped layout: 25% of chart width
          maxWidth = this.width * 0.25;
        } else {
          // Tabular layout: use calculated content width
          maxWidth = calculatedTabularWidth;
        }
      }
    }

    // Chart content area (where the chart itself draws, excluding padding)
    const chartContentLeft = padding.left;
    const chartContentWidth = this.width - padding.left - padding.right;

    // columns="*" means wrapped layout
    if (columns === '*') {
      // For right/left positioned wrapped legends, position in the padding area
      if (position === 'right' || position === 'left') {
        const actualBackgroundWidth = maxWidth + titleWidthForPositioning + 20;

        if (position === 'right') {
          // Legend goes in the right padding area
          // The legend area starts AFTER the axis labels (if any on right) and any stacked elements
          const axisSpace = axisLabelPadding.right;
          const legendAreaStart = this.width - padding.right + axisSpace + stackOffsetFromEdge;
          const legendAreaWidth = padding.right - axisSpace - stackOffsetFromEdge;
          x = legendAreaStart + (legendAreaWidth - actualBackgroundWidth) * 0.8 + 10;
        } else {
          // Legend goes in the left padding area
          // The legend area ends BEFORE the axis labels (not at the chart content edge)
          // Stack offset pushes legend inward from the edge
          const axisSpace = axisLabelPadding.left;
          const legendAreaWidth = padding.left - axisSpace - stackOffsetFromEdge;
          x = stackOffsetFromEdge + (legendAreaWidth - actualBackgroundWidth) * 0.2 + 10;
        }
      }

      // For top/bottom positioned wrapped legends, position in the padding area
      if (position.startsWith('top') || position.startsWith('bottom')) {
        // Set x position based on horizontal alignment (left, center, right)
        if (position === 'top-right' || position === 'bottom-right') {
          x = chartContentLeft + chartContentWidth - maxWidth;
        } else if (position === 'top' || position === 'bottom') {
          x = chartContentLeft + (chartContentWidth - maxWidth) / 2;
        } else {
          // top-left or bottom-left
          x = chartContentLeft;
        }

        // Set y position in padding area, accounting for stacked elements
        if (position.startsWith('top')) {
          // Legend in the top padding area
          // Stack offset pushes legend down from the top edge
          const axisSpace = axisLabelPadding.top;
          const legendAreaHeight = padding.top - axisSpace - stackOffsetFromEdge;
          y = stackOffsetFromEdge + legendAreaHeight * 0.2 + 10;
        } else {
          // Legend in the bottom padding area
          // Stack offset reduces available space from the bottom edge
          const axisSpace = axisLabelPadding.bottom;
          const legendAreaStart = this.height - padding.bottom + axisSpace;
          const legendAreaHeight = padding.bottom - axisSpace - stackOffsetFromEdge;
          // Apply chart-specific offset for bottom legends
          y = legendAreaStart + legendAreaHeight * 0.2 + 10 + this.getBottomLegendOffset();
        }
      }

      return this.renderWrappedLegend(itemsWithDisplay, x, y, titleInfo, showLabel, maxWidth);
    }

    // Use calculated tabular width for actual rendering
    const totalWidth = calculatedTabularWidth;
    const rowCount = Math.ceil(itemsWithDisplay.length / numColumns);

    // Handle x positioning for right/left legends
    // Legends are positioned in the padding area (not expanded SVG space)
    if (position === 'right' || position === 'left') {
      const actualBackgroundWidth = totalWidth + titleWidthForPositioning + 20;

      if (position === 'right') {
        // Legend goes in the right padding area
        // The legend area starts AFTER the axis labels (if any on right) and any stacked elements
        const axisSpace = axisLabelPadding.right;
        const legendAreaStart = this.width - padding.right + axisSpace + stackOffsetFromEdge;
        const legendAreaWidth = padding.right - axisSpace - stackOffsetFromEdge;
        const backgroundX = legendAreaStart + (legendAreaWidth - actualBackgroundWidth) * 0.8;
        x = backgroundX + 10;
      } else {
        // Legend goes in the left padding area
        // The legend area ends BEFORE the axis labels (not at the chart content edge)
        // Stack offset pushes legend inward from the edge
        const axisSpace = axisLabelPadding.left;
        const legendAreaWidth = padding.left - axisSpace - stackOffsetFromEdge;
        const backgroundX = stackOffsetFromEdge + (legendAreaWidth - actualBackgroundWidth) * 0.2;
        x = backgroundX + 10;
      }
    }

    // Handle x and y positioning for top/bottom legends
    // Legends are positioned in the padding area (not expanded SVG space)
    if (position.startsWith('top') || position.startsWith('bottom')) {
      // Set x position based on horizontal alignment (left, center, right)
      // Use totalWidth (actual tabular width) for accurate positioning
      if (position === 'top-right' || position === 'bottom-right') {
        x = chartContentLeft + chartContentWidth - totalWidth;
      } else if (position === 'top' || position === 'bottom') {
        x = chartContentLeft + (chartContentWidth - totalWidth) / 2;
      } else {
        // top-left or bottom-left
        x = chartContentLeft;
      }

      // Calculate actual background dimensions for positioning
      // Background height = content + title (if horizontal) + padding
      const contentHeightForCalc = rowCount * itemHeight;
      const bgHeightForCalc = contentHeightForCalc + titleHeightForPositioning + 20;

      // Position so that 80% of extra space is toward the outer edge (top of chart for top legends,
      // bottom of chart for bottom legends), accounting for stacked elements
      if (position.startsWith('top')) {
        // Legend in the top padding area
        // Stack offset pushes legend down from the top edge
        const axisSpace = axisLabelPadding.top;
        const legendAreaHeight = padding.top - axisSpace - stackOffsetFromEdge;
        const extraSpace = legendAreaHeight - bgHeightForCalc;
        // 20% margin at outer edge (top of chart), 80% at inner edge (toward content)
        const bgY = stackOffsetFromEdge + extraSpace * 0.2;
        // Content starts after background padding (10px) + title height (if at top)
        y = bgY + 10 + titleHeightForContentOffset;
      } else {
        // Legend in the bottom padding area
        // Stack offset reduces available space from the bottom edge
        const axisSpace = axisLabelPadding.bottom;
        const legendAreaStart = this.height - padding.bottom + axisSpace;
        const legendAreaHeight = padding.bottom - axisSpace - stackOffsetFromEdge;
        const extraSpace = legendAreaHeight - bgHeightForCalc;
        // 80% margin at outer edge (bottom of chart), 20% at inner edge (toward content)
        const bgY = legendAreaStart + extraSpace * 0.2;
        // Content starts after background padding (10px) + title height (if at top)
        // Apply chart-specific offset for bottom legends
        y = bgY + 10 + titleHeightForContentOffset + this.getBottomLegendOffset();
      }
    }

    // Calculate title-related dimensions
    const hasTitle = titleInfo !== null;
    const titleFontSize = titleFontSizeEarly;
    const titleHeight = 25;

    // titleWidthReserved is the same as titleWidthContribution (calculated early for positioning)
    const titleWidthReserved = titleWidthContribution;

    // Adjust content area based on title position
    let contentX = x;
    let contentY = y;
    const contentWidth = totalWidth;
    const contentHeight = rowCount * itemHeight;

    // Calculate background dimensions
    let bgX = x - 10;
    let bgY = y - 10;
    let bgWidth = totalWidth + 20;
    let bgHeight = contentHeight + 20;

    // Adjust for title
    if (hasTitle) {
      if (titlePosition === 'top' || titlePosition.startsWith('top')) {
        bgY = y - titleHeight - 10;
        bgHeight = contentHeight + titleHeight + 20;
      } else if (titlePosition === 'bottom' || titlePosition.startsWith('bottom')) {
        bgHeight = contentHeight + titleHeight + 20;
      } else if (titlePosition === 'left') {
        bgX = x - titleWidthReserved - 10;
        bgWidth = totalWidth + titleWidthReserved + 20;
        contentX = x;
      } else if (titlePosition === 'right') {
        bgWidth = totalWidth + titleWidthReserved + 20;
      }
    }

    // Render title based on position
    const renderTabularTitle = () => {
      if (!hasTitle) return svg``;

      const titleText = titleInfo!.text;
      let titleX: number;
      let titleY: number;
      let textAnchor = 'middle';
      let transform = '';

      switch (titlePosition) {
        case 'top':
          titleX = contentX + contentWidth / 2;
          titleY = contentY - 15;
          break;
        case 'top-left':
          titleX = contentX;
          titleY = contentY - 15;
          textAnchor = 'start';
          break;
        case 'top-right':
          titleX = contentX + contentWidth;
          titleY = contentY - 15;
          textAnchor = 'end';
          break;
        case 'bottom':
          titleX = contentX + contentWidth / 2;
          titleY = contentY + contentHeight + titleHeight - 5;
          break;
        case 'bottom-left':
          titleX = contentX;
          titleY = contentY + contentHeight + titleHeight - 5;
          textAnchor = 'start';
          break;
        case 'bottom-right':
          titleX = contentX + contentWidth;
          titleY = contentY + contentHeight + titleHeight - 5;
          textAnchor = 'end';
          break;
        case 'left':
          titleX = bgX + titleFontSize + 10;
          titleY = contentY + contentHeight / 2;
          textAnchor = 'middle';
          transform = `rotate(-90, ${titleX}, ${titleY})`;
          break;
        case 'right':
          titleX = bgX + bgWidth - titleFontSize;
          titleY = contentY + contentHeight / 2;
          textAnchor = 'middle';
          transform = `rotate(90, ${titleX}, ${titleY})`;
          break;
        default:
          titleX = contentX + contentWidth / 2;
          titleY = contentY - 15;
      }

      return svg`
        <text
          x="${titleX}"
          y="${titleY}"
          text-anchor="${textAnchor}"
          font-size="${titleFontSize}"
          font-weight="bold"
          fill="#333"
          transform="${transform}"
        >
          ${titleText}
        </text>
      `;
    };

    return svg`
      <!-- Legend background -->
      <rect
        x="${bgX}"
        y="${bgY}"
        width="${bgWidth}"
        height="${bgHeight}"
        fill="white"
        stroke="#ddd"
        stroke-width="1"
        rx="4"
      />

      ${renderTabularTitle()}

      <!-- Legend items -->
      ${itemsWithDisplay.map((item, index) => {
        const col = index % numColumns;
        const row = Math.floor(index / numColumns);
        const itemX = contentX + col * (columnWidth + columnGap);
        const itemY = contentY + row * itemHeight;
        const labelX = itemX + colorBoxWidth + colorBoxGap;
        const valueX = labelX + labelWidth + (showLabel ? labelValueGap : 0);
        return svg`
          <!-- Color box -->
          <rect
            x="${itemX}"
            y="${itemY}"
            width="18"
            height="18"
            fill="${item.color}"
            stroke="white"
            stroke-width="1"
          />

          ${showLabel ? svg`
            <!-- Label -->
            <text
              x="${labelX}"
              y="${itemY + 13}"
              font-size="13"
              fill="#333"
            >
              ${item.label}
            </text>
          ` : ''}

          ${item.displayValue ? svg`
            <!-- Value/Percent -->
            <text
              x="${valueX}"
              y="${itemY + 13}"
              font-size="12"
              fill="#666"
            >
              ${item.displayValue}
            </text>
          ` : ''}
        `;
      })}
    `;
  }

  private renderWrappedLegend(
    items: Array<{ label: string; color: string; value: number; displayValue: string | null }>,
    x: number,
    y: number,
    titleInfo: { text: string; position: string } | null,
    showLabel: boolean,
    maxWidth: number
  ): SVGTemplateResult {
    const lineHeight = 20;
    const startX = x;

    // Layout constants
    const colorBoxWidth = 12;
    const colorBoxGap = 4;  // Gap after color box
    const itemGap = 12;     // Gap between items
    const fontSize = 12;    // Font size used in legend text
    const titleFontSize = 14;
    const titleHeight = 20; // Height for title

    // Calculate title dimensions if present
    const hasTitle = titleInfo !== null;
    const titlePosition = titleInfo?.position || 'top';
    const isTitleVertical = titlePosition === 'left' || titlePosition === 'right';

    // For left/right title positions, we need to reserve horizontal space
    // For rotated text, we only need space for the font height, not text width
    let titleWidthReserved = 0;
    if (hasTitle && isTitleVertical) {
      titleWidthReserved = titleFontSize + 10; // font height + small gap
    }

    // Adjust starting positions based on title position
    let contentStartX = x;
    let contentStartY = y;
    let effectiveMaxWidth = maxWidth;

    if (hasTitle) {
      if (titlePosition === 'left') {
        contentStartX = x + titleWidthReserved;
        effectiveMaxWidth = maxWidth - titleWidthReserved;
      } else if (titlePosition === 'right') {
        effectiveMaxWidth = maxWidth - titleWidthReserved;
      } else if (titlePosition === 'top' || titlePosition.startsWith('top')) {
        // Title above items - adjust y
        contentStartY = y; // Items start at y, title will be above
      } else if (titlePosition === 'bottom' || titlePosition.startsWith('bottom')) {
        // Title below items - no adjustment needed for content start
      }
    }

    // Build positioned items with wrapping
    let currentX = contentStartX;
    let currentY = contentStartY;

    const positionedItems = items.map(item => {
      let text = '';
      if (showLabel) text += item.label;
      if (item.displayValue) {
        text += showLabel ? ` (${item.displayValue})` : item.displayValue;
      }

      // Use exact text measurement
      const textWidth = this.measureText(text, fontSize);
      const itemWidth = colorBoxWidth + colorBoxGap + textWidth + itemGap;

      // Check if we need to wrap
      if (currentX + itemWidth > contentStartX + effectiveMaxWidth && currentX > contentStartX) {
        currentX = contentStartX;
        currentY += lineHeight;
      }

      const itemX = currentX;
      const itemY = currentY;

      currentX += itemWidth;

      return { ...item, x: itemX, y: itemY, text };
    });

    // Calculate content height
    const contentHeight = currentY - contentStartY + lineHeight;

    // Calculate total background dimensions
    let bgX = startX - 10;
    let bgY = y - 10;
    let bgWidth = maxWidth + 20;
    let bgHeight = contentHeight + 20;

    // Adjust background for title
    if (hasTitle) {
      if (titlePosition === 'top' || titlePosition.startsWith('top')) {
        bgY = y - 10 - titleHeight - 5;
        bgHeight = contentHeight + titleHeight + 25;
      } else if (titlePosition === 'bottom' || titlePosition.startsWith('bottom')) {
        bgHeight = contentHeight + titleHeight + 25;
      } else if (titlePosition === 'left') {
        bgX = startX - titleWidthReserved - 10;
        bgWidth = maxWidth + titleWidthReserved + 20;
      } else if (titlePosition === 'right') {
        bgWidth = maxWidth + titleWidthReserved + 20;
      }
    }

    // Render title based on position
    const renderTitle = () => {
      if (!hasTitle) return svg``;

      const titleText = titleInfo!.text;
      let titleX: number;
      let titleY: number;
      let textAnchor = 'middle';
      let transform = '';

      switch (titlePosition) {
        case 'top':
          titleX = startX + maxWidth / 2;
          titleY = y - 15;
          break;
        case 'top-left':
          titleX = startX;
          titleY = y - 15;
          textAnchor = 'start';
          break;
        case 'top-right':
          titleX = startX + maxWidth;
          titleY = y - 15;
          textAnchor = 'end';
          break;
        case 'bottom':
          titleX = startX + maxWidth / 2;
          titleY = contentStartY + contentHeight + titleHeight;
          break;
        case 'bottom-left':
          titleX = startX;
          titleY = contentStartY + contentHeight + titleHeight;
          textAnchor = 'start';
          break;
        case 'bottom-right':
          titleX = startX + maxWidth;
          titleY = contentStartY + contentHeight + titleHeight;
          textAnchor = 'end';
          break;
        case 'left':
          titleX = bgX + titleFontSize + 10;
          titleY = contentStartY + contentHeight / 2;
          textAnchor = 'middle';
          transform = `rotate(-90, ${titleX}, ${titleY})`;
          break;
        case 'right':
          titleX = bgX + bgWidth - titleFontSize;
          titleY = contentStartY + contentHeight / 2;
          textAnchor = 'middle';
          transform = `rotate(90, ${titleX}, ${titleY})`;
          break;
        default:
          titleX = startX + maxWidth / 2;
          titleY = y - 15;
      }

      return svg`
        <text
          x="${titleX}"
          y="${titleY}"
          text-anchor="${textAnchor}"
          font-size="${titleFontSize}"
          font-weight="bold"
          fill="#333"
          transform="${transform}"
        >
          ${titleText}
        </text>
      `;
    };

    return svg`
      <!-- Legend background -->
      <rect
        x="${bgX}"
        y="${bgY}"
        width="${bgWidth}"
        height="${bgHeight}"
        fill="white"
        stroke="#ddd"
        stroke-width="1"
        rx="4"
      />

      ${renderTitle()}

      <!-- Wrapped legend items -->
      ${positionedItems.map(item => svg`
        <!-- Color indicator -->
        <circle
          cx="${item.x + 6}"
          cy="${item.y + 6}"
          r="6"
          fill="${item.color}"
          stroke="white"
          stroke-width="1"
        />

        <!-- Item text -->
        <text
          x="${item.x + colorBoxWidth + colorBoxGap}"
          y="${item.y + 10}"
          font-size="${fontSize}"
          fill="#333"
        >
          ${item.text}
        </text>
      `)}
    `;
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
   * const chart = document.querySelector('dc-bar-chart');
   * chart.downloadSvg();
   *
   * // With custom filename
   * chart.downloadSvg('sales-report.svg');
   *
   * // Wire up to a button
   * document.querySelector('#download-btn').addEventListener('click', () => {
   *   document.querySelector('dc-pie-chart').downloadSvg('market-share');
   * });
   * ```
   */
  public downloadSvg(filename: string = 'chart.svg'): void {
    const svg = this.shadowRoot?.querySelector('svg');
    if (!svg) {
      console.warn('No SVG element found in chart shadow DOM');
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
