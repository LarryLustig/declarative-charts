import type { ChartPalette, PaletteColorResult } from './chart-palette.js';
import type { ColorResolutionOptions, LogLevel } from './base-chart.js';
import type { ErrorDefinition } from './errors.js';
import { ErrorCode } from './errors.js';
import {
  isBuiltinPalette,
  getBuiltinPalette,
  generatePaletteColors as generateBuiltinPaletteColors
} from './builtin-palettes.js';
import { HIGH_CONTRAST_COLORS } from './patterns.js';

/**
 * The slice of a chart that colour resolution needs.
 *
 * Deliberately narrow: everything the resolver reads is listed here, so what it
 * actually depends on is legible rather than "any chart". `BaseChart` satisfies
 * it structurally, so it passes itself.
 */
export interface ColorHost {
  /** Value of the `palette` attribute - a `<dc-palette>` id or a built-in name. */
  readonly paletteId?: string;
  /** Whether high-contrast rendering was requested. */
  /**
   * Tri-state on purpose: true and false are the author's explicit answer, and
   * `undefined` means "no attribute, ask the OS". A host that coerces the third
   * case away makes the `prefers-contrast` branch unreachable.
   */
  readonly highContrast: boolean | undefined;
  /** The `stroke` shorthand, e.g. "2 #333". */
  readonly stroke: string;
  /** Explicit `stroke-width`, if set. */
  readonly strokeWidth?: number;
  /** Unique id for this chart, used to namespace generated defs. */
  readonly chartInstanceId: string;
  /** Scoped lookup, for finding a `<dc-palette high-contrast>` child. */
  querySelector(selectors: string): Element | null;

  log(level: LogLevel, path: string, message: string, value?: unknown): void;
  logError(
    code: ErrorDefinition,
    params?: Record<string, string | number | undefined>,
    value?: unknown
  ): void;
}

/**
 * Resolves the colours a chart draws with: palettes, contrast, and the priority
 * between an element's own colour, a matched palette entry, a positional palette
 * colour, and a generated fallback.
 *
 * Extracted from `BaseChart`, which had accumulated colour resolution alongside
 * logging, popups, keyboard navigation, accessibility, layout and SVG export.
 * This is the first of those responsibilities to move out; the class holds it as
 * a field and delegates, so nothing subclasses call had to change.
 *
 * Pattern registration and `<defs>` rendering deliberately stayed behind: they
 * are a separate concern that merely lived in the same region of the file.
 */
export class ColorResolver {
  /**
   * Canvas context used to normalise CSS colour strings to RGB.
   *
   * Its own, rather than borrowed from text measurement. Colour parsing and
   * label fitting both happen to want a 2D context; sharing one coupled two
   * unrelated concerns and meant this class could not be used without a chart
   * that measures text.
   */
  private parseContext: CanvasRenderingContext2D | null = null;

  constructor(private readonly host: ColorHost) {}

  private getParseContext(): CanvasRenderingContext2D | null {
    if (!this.parseContext) {
      this.parseContext = document.createElement('canvas').getContext('2d');
    }
    return this.parseContext;
  }

  /**
   * Get the palette element referenced by the paletteId attribute.
   * @returns The ChartPalette element, or null if not found
   */
  getPalette(): ChartPalette | null {
    if (!this.host.paletteId) return null;
    return document.getElementById(this.host.paletteId) as ChartPalette | null;
  }

  /**
   * Look up colors from the palette for a given label and/or value.
   * @param label The element's label (optional)
   * @param value The element's numeric value (optional)
   * @returns Object with fill and/or stroke colors, or empty object if no match
   */
  lookupPaletteColor(label?: string, value?: number): PaletteColorResult {
    const palette = this.getPalette();
    if (!palette) return {};
    return palette.lookup(label, value);
  }

  /**
   * Check if high contrast mode is currently active.
   *
   * Priority:
   * 1. Explicit highContrast attribute (true/false)
   * 2. OS prefers-contrast: high media query
   *
   * @returns true if high contrast mode should be used
   */
  isHighContrastActive(): boolean {
    // Explicit attribute takes precedence
    if (this.host.highContrast === true) return true;
    if (this.host.highContrast === false) return false;

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
  getHighContrastPalette(): ChartPalette | null {
    const palette = this.host.querySelector(':scope > dc-palette[high-contrast]') as ChartPalette | null;
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
  getHighContrastColors(count: number): string[] {
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
   * Parse a CSS color string to RGB values.
   * Uses a canvas context to normalize any valid CSS color to RGB.
   *
   * @param color CSS color string (hex, rgb, hsl, named color, etc.)
   * @returns RGB values as [r, g, b] where each component is 0-255, or null if invalid
   */
  parseColor(color: string): [number, number, number] | null {
    const ctx = this.getParseContext();
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
  getLuminance(color: string): number {
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
  getContrastingTextColor(bgColor: string): string {
    return this.contrastForLuminance(this.getLuminance(bgColor));
  }

  /**
   * The text colour for a given background luminance.
   *
   * Split out so `BaseChart` can feed it a luminance obtained through its own
   * `getLuminance()`. That keeps a subclass's override of `getLuminance`
   * affecting contrast, which it did before this class existed, without
   * duplicating the threshold in two places.
   */
  contrastForLuminance(luminance: number): string {
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
  calculateLabelFill(
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
  generatePaletteColors(count: number, seed?: number): string[] {
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
  resolveColors(count: number, options: ColorResolutionOptions = {}): string[] {
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

    this.host.log('info', 'colors.mode', `Color resolution mode: ${colorMode}`, colorMode);
    if (overrideCount > 0) {
      this.host.log('info', 'colors.overrides', `${overrideCount} element-level color override(s)`, overrideCount);
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
  resolveFillColors(
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
  parseStroke(): { color?: string; width?: number } {
    if (!this.host.stroke) return {};

    const parts = this.host.stroke.trim().split(/\s+/);
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
  getEffectiveStroke(defaultColor = '#e0e0e0', defaultWidth = 1): { color: string; width: number } {
    const parsed = this.parseStroke();
    return {
      color: parsed.color || defaultColor,
      width: this.host.strokeWidth ?? parsed.width ?? defaultWidth
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
  resolveStrokeColors(
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
  getPaletteColors(count: number, colorType: 'fill' | 'stroke' = 'fill'): string[] | undefined {
    if (!this.host.paletteId) return undefined;

    // Check for user-defined DOM palette first
    const domPalette = this.getPalette();
    if (domPalette) {
      // User-defined palette - extract colors in order from <dc-fill> children
      const fills = domPalette.getFills();
      if (fills.length > 0) {
        const colors = fills.map(f => colorType === 'fill' ? f.fill : f.stroke).filter((c): c is string => !!c);
        if (colors.length > 0) {
          this.host.log('info', 'colors.palette', `Using user-defined palette "${this.host.paletteId}" [${colors.length} colors]`);
          return colors;
        }
      }
    }

    // Fall back to built-in palette
    if (isBuiltinPalette(this.host.paletteId)) {
      const builtinPalette = getBuiltinPalette(this.host.paletteId)!;
      const colors = generateBuiltinPaletteColors(builtinPalette, count);
      this.host.log('info', 'colors.palette', `Using built-in palette "${this.host.paletteId}" (${builtinPalette.type})`);
      return colors;
    }

    // No palette found
    this.host.logError(ErrorCode.PALETTE_NOT_FOUND, { id: this.host.paletteId });
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
  resolveFillColorsWithPalette(
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
      this.host.log('info', 'colors.palette.matches', `Palette "${this.host.paletteId}" matched ${paletteMatchCount} element(s) by label/value`);
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
  resolveStrokeColorsWithPalette(
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
}
