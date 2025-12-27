import { describe, it, expect, beforeEach } from 'vitest';
import { parseFormat, NumberFormatter, formatNumber, type ParsedFormat } from '../../src/format';

describe('parseFormat', () => {
  describe('preset formats', () => {
    it('parses "number" preset with default precision', () => {
      const result = parseFormat('number');
      expect(result).toEqual({
        type: 'preset',
        preset: 'number',
      });
    });

    it('parses "number" preset with precision argument', () => {
      const result = parseFormat('number 2');
      expect(result).toEqual({
        type: 'preset',
        preset: 'number',
        presetArg: '2',
      });
    });

    it('parses "number 0" for integers', () => {
      const result = parseFormat('number 0');
      expect(result).toEqual({
        type: 'preset',
        preset: 'number',
        presetArg: '0',
      });
    });

    it('parses "compact" preset with default precision', () => {
      const result = parseFormat('compact');
      expect(result).toEqual({
        type: 'preset',
        preset: 'compact',
      });
    });

    it('parses "compact 1" for single significant digit', () => {
      const result = parseFormat('compact 1');
      expect(result).toEqual({
        type: 'preset',
        preset: 'compact',
        presetArg: '1',
      });
    });

    it('parses "currency USD"', () => {
      const result = parseFormat('currency USD');
      expect(result).toEqual({
        type: 'preset',
        preset: 'currency',
        presetArg: 'USD',
      });
    });

    it('parses "currency EUR"', () => {
      const result = parseFormat('currency EUR');
      expect(result).toEqual({
        type: 'preset',
        preset: 'currency',
        presetArg: 'EUR',
      });
    });

    it('parses "currency USD compact"', () => {
      const result = parseFormat('currency USD compact');
      expect(result).toEqual({
        type: 'preset',
        preset: 'currency',
        presetArg: 'USD',
        compact: true,
      });
    });

    it('parses "currency USD compact 1" with precision', () => {
      const result = parseFormat('currency USD compact 1');
      expect(result).toEqual({
        type: 'preset',
        preset: 'currency',
        presetArg: 'USD',
        compact: true,
        compactPrecision: 1,
      });
    });

    it('parses "currency EUR compact 2"', () => {
      const result = parseFormat('currency EUR compact 2');
      expect(result).toEqual({
        type: 'preset',
        preset: 'currency',
        presetArg: 'EUR',
        compact: true,
        compactPrecision: 2,
      });
    });

    it('parses "percent" preset with default precision', () => {
      const result = parseFormat('percent');
      expect(result).toEqual({
        type: 'preset',
        preset: 'percent',
      });
    });

    it('parses "percent 0" for no decimals', () => {
      const result = parseFormat('percent 0');
      expect(result).toEqual({
        type: 'preset',
        preset: 'percent',
        presetArg: '0',
      });
    });

    it('parses "percent 2" for two decimals', () => {
      const result = parseFormat('percent 2');
      expect(result).toEqual({
        type: 'preset',
        preset: 'percent',
        presetArg: '2',
      });
    });

    it('is case-insensitive for preset names', () => {
      expect(parseFormat('NUMBER 2').preset).toBe('number');
      expect(parseFormat('Currency USD').preset).toBe('currency');
      expect(parseFormat('PERCENT 0').preset).toBe('percent');
      expect(parseFormat('Compact 1').preset).toBe('compact');
    });

    it('is case-insensitive for compact modifier', () => {
      const result = parseFormat('currency USD COMPACT 1');
      expect(result.compact).toBe(true);
      expect(result.compactPrecision).toBe(1);
    });

    it('handles extra whitespace', () => {
      const result = parseFormat('  currency   USD   compact   2  ');
      expect(result).toEqual({
        type: 'preset',
        preset: 'currency',
        presetArg: 'USD',
        compact: true,
        compactPrecision: 2,
      });
    });
  });

  describe('d3-format strings', () => {
    it('parses ",.2f" (grouped fixed)', () => {
      const result = parseFormat(',.2f');
      expect(result).toEqual({
        type: 'd3',
        prefix: undefined,
        grouping: true,
        precision: 2,
        formatType: 'f',
      });
    });

    it('parses ".2f" (fixed without grouping)', () => {
      const result = parseFormat('.2f');
      expect(result).toEqual({
        type: 'd3',
        prefix: undefined,
        grouping: false,
        precision: 2,
        formatType: 'f',
      });
    });

    it('parses "$,.2f" (currency-style)', () => {
      const result = parseFormat('$,.2f');
      expect(result).toEqual({
        type: 'd3',
        prefix: '$',
        grouping: true,
        precision: 2,
        formatType: 'f',
      });
    });

    it('parses ".1s" (SI notation)', () => {
      const result = parseFormat('.1s');
      expect(result).toEqual({
        type: 'd3',
        prefix: undefined,
        grouping: false,
        precision: 1,
        formatType: 's',
      });
    });

    it('parses ".2s" (SI notation with 2 digits)', () => {
      const result = parseFormat('.2s');
      expect(result).toEqual({
        type: 'd3',
        prefix: undefined,
        grouping: false,
        precision: 2,
        formatType: 's',
      });
    });

    it('parses ".0%" (percentage)', () => {
      const result = parseFormat('.0%');
      expect(result).toEqual({
        type: 'd3',
        prefix: undefined,
        grouping: false,
        precision: 0,
        formatType: '%',
      });
    });

    it('parses ".1%" (percentage with 1 decimal)', () => {
      const result = parseFormat('.1%');
      expect(result).toEqual({
        type: 'd3',
        prefix: undefined,
        grouping: false,
        precision: 1,
        formatType: '%',
      });
    });

    it('parses "," (grouping only)', () => {
      const result = parseFormat(',');
      expect(result).toEqual({
        type: 'd3',
        prefix: undefined,
        grouping: true,
        precision: undefined,
        formatType: 'f',
      });
    });

    it('parses ".0f" (integer)', () => {
      const result = parseFormat('.0f');
      expect(result).toEqual({
        type: 'd3',
        prefix: undefined,
        grouping: false,
        precision: 0,
        formatType: 'f',
      });
    });
  });

  describe('invalid formats', () => {
    it('returns default for invalid format strings', () => {
      // The function logs a warning but returns a safe default
      const result = parseFormat('invalid format string');
      expect(result.type).toBe('d3');
      expect(result.formatType).toBe('none');
    });

    it('returns default for empty strings', () => {
      const result = parseFormat('');
      expect(result.type).toBe('d3');
    });
  });
});

describe('NumberFormatter', () => {
  let formatter: NumberFormatter;

  beforeEach(() => {
    // Use en-US locale for consistent test results
    formatter = new NumberFormatter({ locale: 'en-US' });
  });

  describe('getLocale', () => {
    it('returns the configured locale', () => {
      expect(formatter.getLocale()).toBe('en-US');
    });

    it('uses navigator.language when no locale provided (in browser)', () => {
      // In Node test environment, falls back to en-US
      const defaultFormatter = new NumberFormatter();
      expect(defaultFormatter.getLocale()).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('formats NaN as "NaN"', () => {
      expect(formatter.format(NaN, 'number 2')).toBe('NaN');
    });

    it('formats Infinity as "Infinity"', () => {
      expect(formatter.format(Infinity, 'number 2')).toBe('Infinity');
    });

    it('formats -Infinity as "-Infinity"', () => {
      expect(formatter.format(-Infinity, 'number 2')).toBe('-Infinity');
    });

    it('formats zero correctly', () => {
      expect(formatter.format(0, 'number 2')).toBe('0.00');
    });

    it('formats negative zero (preserves sign per Intl spec)', () => {
      // Intl.NumberFormat preserves the sign of -0
      expect(formatter.format(-0, 'number 2')).toBe('-0.00');
    });
  });

  describe('number preset', () => {
    it('formats with default precision (2 decimals)', () => {
      expect(formatter.format(1234.567, 'number')).toBe('1,234.57');
    });

    it('formats with specified precision', () => {
      expect(formatter.format(1234.567, 'number 3')).toBe('1,234.567');
    });

    it('formats integers with "number 0"', () => {
      expect(formatter.format(1234.567, 'number 0')).toBe('1,235');
    });

    it('formats small numbers correctly', () => {
      expect(formatter.format(0.123, 'number 2')).toBe('0.12');
    });

    it('formats negative numbers', () => {
      expect(formatter.format(-1234.56, 'number 2')).toBe('-1,234.56');
    });

    it('adds trailing zeros when needed', () => {
      expect(formatter.format(100, 'number 2')).toBe('100.00');
    });
  });

  describe('compact preset', () => {
    it('formats thousands with K suffix', () => {
      const result = formatter.format(1234, 'compact');
      expect(result).toMatch(/1\.2.*K/);
    });

    it('formats millions with M suffix', () => {
      const result = formatter.format(1234567, 'compact');
      expect(result).toMatch(/1\.2.*M/);
    });

    it('formats billions with B suffix', () => {
      const result = formatter.format(1234567890, 'compact');
      expect(result).toMatch(/1\.2.*B/);
    });

    it('formats trillions with T suffix', () => {
      const result = formatter.format(1234567890123, 'compact');
      expect(result).toMatch(/1\.2.*T/);
    });

    it('formats with single significant digit when precision is 1', () => {
      const result = formatter.format(1500000, 'compact 1');
      expect(result).toMatch(/1\.?5?M|2M/); // Could be 1.5M or 2M depending on rounding
    });

    it('formats small numbers without suffix', () => {
      const result = formatter.format(123, 'compact');
      expect(result).toBe('123');
    });

    it('formats negative numbers with suffix', () => {
      const result = formatter.format(-1234567, 'compact');
      expect(result).toMatch(/-1\.2.*M/);
    });
  });

  describe('currency preset', () => {
    it('formats USD currency', () => {
      expect(formatter.format(1234.56, 'currency USD')).toBe('$1,234.56');
    });

    it('formats currency with default (USD) when no code provided', () => {
      expect(formatter.format(1234.56, 'currency')).toBe('$1,234.56');
    });

    it('formats negative currency', () => {
      const result = formatter.format(-1234.56, 'currency USD');
      // Different locales may format negative currency differently
      expect(result).toMatch(/[-−]?\$1,234\.56|-?\$1,234\.56|\(\$1,234\.56\)/);
    });

    it('formats EUR currency', () => {
      const result = formatter.format(1234.56, 'currency EUR');
      // EUR format varies by locale, but should contain 1,234.56 and € symbol
      expect(result).toMatch(/€|EUR/);
      expect(result).toMatch(/1,234\.56/);
    });

    it('formats compact currency', () => {
      const result = formatter.format(1234567, 'currency USD compact');
      expect(result).toMatch(/\$.*M/);
    });

    it('formats compact currency with precision', () => {
      const result = formatter.format(1234567, 'currency USD compact 1');
      expect(result).toMatch(/\$.*M/);
    });
  });

  describe('percent preset', () => {
    it('formats decimal as percentage (0.456 -> 45.6%)', () => {
      expect(formatter.format(0.456, 'percent')).toBe('45.6%');
    });

    it('formats with no decimals', () => {
      expect(formatter.format(0.456, 'percent 0')).toBe('46%');
    });

    it('formats with 2 decimals', () => {
      expect(formatter.format(0.4567, 'percent 2')).toBe('45.67%');
    });

    it('formats 100% correctly', () => {
      expect(formatter.format(1, 'percent 0')).toBe('100%');
    });

    it('formats 0% correctly', () => {
      expect(formatter.format(0, 'percent 0')).toBe('0%');
    });

    it('formats percentages over 100%', () => {
      expect(formatter.format(1.5, 'percent 0')).toBe('150%');
    });

    it('formats negative percentages', () => {
      const result = formatter.format(-0.25, 'percent 0');
      expect(result).toMatch(/-25%|−25%/);
    });
  });

  describe('d3-format strings', () => {
    it('formats with ,.2f (grouped fixed)', () => {
      expect(formatter.format(1234567.89, ',.2f')).toBe('1,234,567.89');
    });

    it('formats with .2f (fixed without grouping)', () => {
      expect(formatter.format(1234.567, '.2f')).toBe('1234.57');
    });

    it('formats with $,.2f (dollar prefix)', () => {
      expect(formatter.format(1234.56, '$,.2f')).toBe('$1,234.56');
    });

    it('formats with .1s (SI notation)', () => {
      const result = formatter.format(1500000, '.1s');
      expect(result).toMatch(/1\.5M|2M/);
    });

    it('formats with .2s (SI notation)', () => {
      const result = formatter.format(1234567, '.2s');
      expect(result).toMatch(/1\.2.*M/);
    });

    it('formats with .0% (percentage)', () => {
      expect(formatter.format(0.456, '.0%')).toBe('46%');
    });

    it('formats with .1% (percentage with 1 decimal)', () => {
      expect(formatter.format(0.4567, '.1%')).toBe('45.7%');
    });

    it('formats with , (grouping only, default precision)', () => {
      expect(formatter.format(1234567.89, ',')).toBe('1,234,567.89');
    });

    it('formats with .0f (integer)', () => {
      expect(formatter.format(1234.567, '.0f')).toBe('1235');
    });
  });

  describe('SI prefix boundaries', () => {
    it('uses K for values >= 1,000', () => {
      const result = formatter.format(1000, 'compact');
      expect(result).toMatch(/1.*K/);
    });

    it('uses M for values >= 1,000,000', () => {
      const result = formatter.format(1000000, 'compact');
      expect(result).toMatch(/1.*M/);
    });

    it('uses B for values >= 1,000,000,000', () => {
      const result = formatter.format(1000000000, 'compact');
      expect(result).toMatch(/1.*B/);
    });

    it('uses T for values >= 1,000,000,000,000', () => {
      const result = formatter.format(1000000000000, 'compact');
      expect(result).toMatch(/1.*T/);
    });

    it('handles values just below thresholds', () => {
      const result = formatter.format(999, 'compact');
      expect(result).toBe('999');
    });
  });
});

describe('formatNumber convenience function', () => {
  it('formats with default config', () => {
    const result = formatNumber(1234.56, 'number 2');
    expect(result).toMatch(/1.?234\.56/);
  });

  it('formats with custom locale', () => {
    const result = formatNumber(1234.56, 'number 2', { locale: 'en-US' });
    expect(result).toBe('1,234.56');
  });

  it('works with all format types', () => {
    expect(formatNumber(1234567, 'compact', { locale: 'en-US' })).toMatch(/1\.2.*M/);
    expect(formatNumber(1234.56, 'currency USD', { locale: 'en-US' })).toBe('$1,234.56');
    expect(formatNumber(0.456, 'percent 0', { locale: 'en-US' })).toBe('46%');
  });
});

describe('NumberFormatter fallbacks', () => {
  // Test fallback behavior when Intl.NumberFormat throws
  // This covers catch blocks at lines 222, 235, 259, 274, 290
  // Note: Line 181 (default case in formatPreset) is unreachable because
  // parseFormat only returns valid preset names from PRESET_NAMES set.

  it('formatFixed falls back to toFixed when Intl throws', () => {
    const formatter = new NumberFormatter({ locale: 'en-US' });
    const originalNumberFormat = Intl.NumberFormat;

    // Mock Intl.NumberFormat to throw
    (Intl as { NumberFormat: unknown }).NumberFormat = function() {
      throw new Error('Intl not supported');
    };

    try {
      const result = formatter.format(1234.56, 'number 2');
      expect(result).toBe('1234.56');
    } finally {
      (Intl as { NumberFormat: unknown }).NumberFormat = originalNumberFormat;
    }
  });

  it('formatPercent falls back to manual calculation when Intl throws', () => {
    const formatter = new NumberFormatter({ locale: 'en-US' });
    const originalNumberFormat = Intl.NumberFormat;

    (Intl as { NumberFormat: unknown }).NumberFormat = function() {
      throw new Error('Intl not supported');
    };

    try {
      const result = formatter.format(0.456, 'percent 1');
      expect(result).toBe('45.6%');
    } finally {
      (Intl as { NumberFormat: unknown }).NumberFormat = originalNumberFormat;
    }
  });

  it('formatSI falls back to toFixed when Intl throws', () => {
    const formatter = new NumberFormatter({ locale: 'en-US' });
    const originalNumberFormat = Intl.NumberFormat;

    (Intl as { NumberFormat: unknown }).NumberFormat = function() {
      throw new Error('Intl not supported');
    };

    try {
      const result = formatter.format(1500000, 'compact 2');
      expect(result).toBe('1.50M');
    } finally {
      (Intl as { NumberFormat: unknown }).NumberFormat = originalNumberFormat;
    }
  });

  it('formatCurrency falls back to $ prefix when Intl throws', () => {
    const formatter = new NumberFormatter({ locale: 'en-US' });
    const originalNumberFormat = Intl.NumberFormat;

    (Intl as { NumberFormat: unknown }).NumberFormat = function() {
      throw new Error('Intl not supported');
    };

    try {
      const result = formatter.format(1234.56, 'currency USD');
      expect(result).toBe('$1234.56');
    } finally {
      (Intl as { NumberFormat: unknown }).NumberFormat = originalNumberFormat;
    }
  });

  it('formatCompactCurrency falls back to SI format when Intl throws', () => {
    const formatter = new NumberFormatter({ locale: 'en-US' });
    const originalNumberFormat = Intl.NumberFormat;

    (Intl as { NumberFormat: unknown }).NumberFormat = function() {
      throw new Error('Intl not supported');
    };

    try {
      const result = formatter.format(1500000, 'currency USD compact 2');
      expect(result).toBe('$1.50M');
    } finally {
      (Intl as { NumberFormat: unknown }).NumberFormat = originalNumberFormat;
    }
  });
});
