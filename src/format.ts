/**
 * Number formatting module for declarative charts.
 * Supports named presets with compound syntax and d3-format subset.
 */

/** Named preset types */
export type FormatPreset = 'number' | 'compact' | 'currency' | 'percent';

/** Format type from d3-format subset */
export type FormatType = 'f' | 's' | '%' | 'none';

/** Parsed representation of a format string */
export interface ParsedFormat {
  type: 'preset' | 'd3';

  // For presets
  preset?: FormatPreset;
  presetArg?: string;

  // For d3-format
  prefix?: string;
  grouping?: boolean;
  precision?: number;
  formatType?: FormatType;
}

/** Configuration for NumberFormatter */
export interface FormatterConfig {
  locale?: string;
}

/** SI prefixes for compact notation */
const SI_PREFIXES: Array<{ value: number; symbol: string }> = [
  { value: 1e12, symbol: 'T' },
  { value: 1e9, symbol: 'B' },
  { value: 1e6, symbol: 'M' },
  { value: 1e3, symbol: 'K' },
  { value: 1, symbol: '' },
];

/** Preset names for detection */
const PRESET_NAMES: Set<FormatPreset> = new Set(['number', 'compact', 'currency', 'percent']);

/** Regex for d3-format subset: [prefix$][,][.precision][type] */
const D3_FORMAT_REGEX = /^(\$)?(,)?(?:\.(\d+))?([fs%])?$/;

/**
 * Parse a format string into its components.
 * Handles both preset compound syntax and d3-format strings.
 */
export function parseFormat(format: string): ParsedFormat {
  const trimmed = format.trim();

  // Split on whitespace to check for preset syntax
  const parts = trimmed.split(/\s+/);
  const firstToken = parts[0].toLowerCase();

  // Check if it's a preset
  if (PRESET_NAMES.has(firstToken as FormatPreset)) {
    return {
      type: 'preset',
      preset: firstToken as FormatPreset,
      presetArg: parts[1], // May be undefined
    };
  }

  // Try to parse as d3-format
  const match = trimmed.match(D3_FORMAT_REGEX);

  if (!match) {
    // Invalid format - return safe default
    console.warn(`[declarative-charts] Invalid format string: "${format}", using default`);
    return { type: 'd3', formatType: 'none' };
  }

  const [, prefix, grouping, precision, formatType] = match;

  return {
    type: 'd3',
    prefix: prefix || undefined,
    grouping: grouping === ',',
    precision: precision !== undefined ? parseInt(precision, 10) : undefined,
    formatType: (formatType as FormatType) || 'f',
  };
}

/**
 * Main number formatter class.
 * Caches locale info for performance.
 */
export class NumberFormatter {
  private locale: string;

  constructor(config: FormatterConfig = {}) {
    this.locale = config.locale ||
      (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  }

  /** Get the current locale */
  getLocale(): string {
    return this.locale;
  }

  /**
   * Format a number using a format string or preset.
   * @param value - The number to format
   * @param format - Format string (e.g., "$,.2f") or preset (e.g., "currency USD")
   */
  format(value: number, format: string): string {
    // Handle edge cases
    if (!Number.isFinite(value)) {
      return String(value);
    }

    const parsed = parseFormat(format);

    if (parsed.type === 'preset') {
      return this.formatPreset(value, parsed.preset!, parsed.presetArg);
    }

    return this.formatD3(value, parsed);
  }

  /** Format using a named preset */
  private formatPreset(value: number, preset: FormatPreset, arg?: string): string {
    switch (preset) {
      case 'number': {
        const decimals = arg !== undefined ? parseInt(arg, 10) : 2;
        return this.formatFixed(value, decimals, true);
      }

      case 'compact': {
        const sigDigits = arg !== undefined ? parseInt(arg, 10) : 2;
        return this.formatSI(value, sigDigits);
      }

      case 'currency': {
        const currencyCode = arg || 'USD';
        return this.formatCurrency(value, currencyCode);
      }

      case 'percent': {
        const decimals = arg !== undefined ? parseInt(arg, 10) : 1;
        return this.formatPercent(value, decimals);
      }

      default:
        return String(value);
    }
  }

  /** Format using d3-format syntax */
  private formatD3(value: number, parsed: ParsedFormat): string {
    let result: string;

    switch (parsed.formatType) {
      case 's':
        result = this.formatSI(value, parsed.precision ?? 2);
        break;

      case '%':
        result = this.formatPercent(value, parsed.precision ?? 1);
        break;

      case 'f':
      case 'none':
      default:
        result = this.formatFixed(value, parsed.precision ?? 2, parsed.grouping ?? false);
        break;
    }

    // Add literal $ prefix if specified
    if (parsed.prefix === '$') {
      result = '$' + result;
    }

    return result;
  }

  /** Format with fixed decimal places */
  private formatFixed(value: number, precision: number, useGrouping: boolean): string {
    try {
      return new Intl.NumberFormat(this.locale, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
        useGrouping,
      }).format(value);
    } catch {
      return value.toFixed(precision);
    }
  }

  /** Format as percentage (value is decimal: 0.456 -> "45.6%") */
  private formatPercent(value: number, precision: number): string {
    try {
      return new Intl.NumberFormat(this.locale, {
        style: 'percent',
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(value);
    } catch {
      return (value * 100).toFixed(precision) + '%';
    }
  }

  /** Format with SI prefix (K, M, B, T) */
  private formatSI(value: number, precision: number): string {
    const absValue = Math.abs(value);

    // Find appropriate prefix
    const siPrefix = SI_PREFIXES.find(p => absValue >= p.value) ||
      SI_PREFIXES[SI_PREFIXES.length - 1];

    const scaled = value / siPrefix.value;

    // Format the scaled value
    try {
      const formatted = new Intl.NumberFormat(this.locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: precision,
        maximumSignificantDigits: precision + 1,
      }).format(scaled);

      return formatted + siPrefix.symbol;
    } catch {
      return scaled.toFixed(precision) + siPrefix.symbol;
    }
  }

  /** Format as currency with locale-aware symbol placement */
  private formatCurrency(value: number, currencyCode: string): string {
    try {
      return new Intl.NumberFormat(this.locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      // Fallback for invalid currency code
      return '$' + this.formatFixed(value, 2, true);
    }
  }
}

/**
 * Convenience function for one-off formatting.
 */
export function formatNumber(
  value: number,
  format: string,
  config?: FormatterConfig
): string {
  const formatter = new NumberFormatter(config);
  return formatter.format(value, format);
}
