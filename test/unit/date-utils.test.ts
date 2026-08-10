import { describe, it, expect } from 'vitest';
import {
  parseDate,
  formatDate,
  getTimeRange,
  dateToPosition,
  selectTickInterval,
  calculateTimeTicks,
  parseDateLabels
} from '../../src/date-utils';

/**
 * Tests for date-utils.ts
 *
 * Covers:
 * - parseDate(): ISO 8601, Unix timestamps, custom formats
 * - formatDate(): Format token replacement
 * - getTimeRange(): Min/max extraction
 * - dateToPosition(): Position calculation
 * - selectTickInterval(): Smart interval selection
 * - calculateTimeTicks(): Tick generation
 * - parseDateLabels(): Batch parsing
 */

describe('parseDate', () => {
  describe('ISO 8601 parsing', () => {
    it('parses YYYY-MM-DD format', () => {
      const date = parseDate('2024-01-15');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(0); // January
      expect(date!.getDate()).toBe(15);
    });

    it('parses YYYY-MM-DDTHH:mm:ss format', () => {
      const date = parseDate('2024-06-20T14:30:45');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(5); // June
      expect(date!.getDate()).toBe(20);
      expect(date!.getHours()).toBe(14);
      expect(date!.getMinutes()).toBe(30);
      expect(date!.getSeconds()).toBe(45);
    });

    it('parses ISO with milliseconds', () => {
      const date = parseDate('2024-03-10T08:15:30.123');
      expect(date).not.toBeNull();
      expect(date!.getMilliseconds()).toBe(123);
    });

    it('parses ISO with Z timezone', () => {
      const date = parseDate('2024-01-15T12:00:00Z');
      expect(date).not.toBeNull();
      // Should be a valid date (exact time depends on local timezone)
      expect(date!.getFullYear()).toBe(2024);
    });

    it('parses ISO with timezone offset', () => {
      const date = parseDate('2024-01-15T12:00:00+05:00');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
    });
  });

  describe('Unix timestamp parsing', () => {
    it('parses Unix timestamp with format hint', () => {
      // 2024-01-15 00:00:00 UTC
      const timestamp = '1705276800';
      const date = parseDate(timestamp, 'timestamp');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
    });

    it('parses decimal Unix timestamp', () => {
      const date = parseDate('1705276800.5', 'timestamp');
      expect(date).not.toBeNull();
    });

    it('returns null for invalid timestamp', () => {
      const date = parseDate('not-a-number', 'timestamp');
      expect(date).toBeNull();
    });
  });

  describe('custom format parsing', () => {
    it('parses MM/dd/yyyy format', () => {
      const date = parseDate('01/15/2024', 'MM/dd/yyyy');
      expect(date).not.toBeNull();
      expect(date!.getMonth()).toBe(0);
      expect(date!.getDate()).toBe(15);
      expect(date!.getFullYear()).toBe(2024);
    });

    it('parses dd-MM-yyyy format', () => {
      const date = parseDate('15-06-2024', 'dd-MM-yyyy');
      expect(date).not.toBeNull();
      expect(date!.getDate()).toBe(15);
      expect(date!.getMonth()).toBe(5);
      expect(date!.getFullYear()).toBe(2024);
    });

    it('parses MMM d, yyyy format', () => {
      const date = parseDate('Jan 15, 2024', 'MMM d, yyyy');
      expect(date).not.toBeNull();
      expect(date!.getMonth()).toBe(0);
      expect(date!.getDate()).toBe(15);
      expect(date!.getFullYear()).toBe(2024);
    });

    it('parses yy-MM-dd format (2-digit year)', () => {
      const date = parseDate('24-06-20', 'yy-MM-dd');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(5);
      expect(date!.getDate()).toBe(20);
    });

    it('parses time with 12-hour format and AM/PM', () => {
      const date = parseDate('02:30 PM', 'hh:mm a');
      expect(date).not.toBeNull();
      expect(date!.getHours()).toBe(14);
      expect(date!.getMinutes()).toBe(30);
    });

    it('parses time with AM', () => {
      const date = parseDate('10:15 AM', 'hh:mm a');
      expect(date).not.toBeNull();
      expect(date!.getHours()).toBe(10);
    });

    it('handles 12:00 AM as midnight', () => {
      const date = parseDate('12:00 AM', 'hh:mm a');
      expect(date).not.toBeNull();
      expect(date!.getHours()).toBe(0);
    });

    it('handles 12:00 PM as noon', () => {
      const date = parseDate('12:00 PM', 'hh:mm a');
      expect(date).not.toBeNull();
      expect(date!.getHours()).toBe(12);
    });
  });

  describe('edge cases', () => {
    it('returns null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(parseDate(null as any)).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(parseDate(123 as any)).toBeNull();
    });

    it('trims whitespace', () => {
      const date = parseDate('  2024-01-15  ');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
    });

    it('falls back to native Date for ambiguous formats', () => {
      // Native Date can parse some formats
      const date = parseDate('January 15, 2024');
      expect(date).not.toBeNull();
    });

    it('returns null for completely invalid input', () => {
      expect(parseDate('not a date at all')).toBeNull();
    });
  });
});

describe('formatDate', () => {
  // Use a fixed date for consistent testing
  const testDate = new Date(2024, 5, 15, 14, 30, 45); // June 15, 2024, 2:30:45 PM

  describe('year tokens', () => {
    it('formats yyyy as 4-digit year', () => {
      expect(formatDate(testDate, 'yyyy')).toBe('2024');
    });

    it('formats yy as 2-digit year', () => {
      expect(formatDate(testDate, 'yy')).toBe('24');
    });
  });

  describe('month tokens', () => {
    it('formats MMMM as full month name', () => {
      expect(formatDate(testDate, 'MMMM')).toBe('June');
    });

    it('formats MMM as short month name', () => {
      expect(formatDate(testDate, 'MMM')).toBe('Jun');
    });

    /**
     * Chained `.replace()` calls substituted into their own output: `MMM` gave
     * "Jan", and the trailing `/a/g` -> AM|PM then rewrote the "a" inside it,
     * so "MMM d" rendered "JPMn 3".
     *
     * Every test above uses June, whose names contain no 'a', which is the only
     * reason this went unnoticed. These use the months that expose it.
     */
    it.each([
      [0, 'Jan', 'January'],
      [2, 'Mar', 'March'],
      [4, 'May', 'May'],
      [7, 'Aug', 'August']
    ])('formats month %i without mangling its name', (monthIndex, short, long) => {
      const d = new Date(2024, monthIndex, 3, 14, 30);
      expect(formatDate(d, 'MMM')).toBe(short);
      expect(formatDate(d, 'MMMM')).toBe(long);
      expect(formatDate(d, 'MMM d')).toBe(`${short} 3`);
    });

    it('still formats the meridiem token itself', () => {
      expect(formatDate(new Date(2024, 0, 3, 14, 30), 'h:mm a')).toBe('2:30 PM');
      expect(formatDate(new Date(2024, 0, 3, 9, 5), 'h:mm a')).toBe('9:05 AM');
    });

    it('does not re-substitute a value it has just written', () => {
      // 11 contains no tokens, but a chained implementation could still walk
      // back over "Nov" and the digits it had already produced.
      expect(formatDate(new Date(2024, 10, 11), 'MMM dd, yyyy')).toBe('Nov 11, 2024');
    });

    it('formats MM as zero-padded month', () => {
      expect(formatDate(testDate, 'MM')).toBe('06');
    });

    it('formats M as month number', () => {
      expect(formatDate(testDate, 'M')).toBe('6');
    });
  });

  describe('day tokens', () => {
    it('formats dd as zero-padded day', () => {
      expect(formatDate(testDate, 'dd')).toBe('15');
    });

    it('formats d as day number', () => {
      expect(formatDate(testDate, 'd')).toBe('15');
    });

    it('formats single-digit day without padding for d', () => {
      const date = new Date(2024, 0, 5);
      expect(formatDate(date, 'd')).toBe('5');
    });

    it('formats single-digit day with padding for dd', () => {
      const date = new Date(2024, 0, 5);
      expect(formatDate(date, 'dd')).toBe('05');
    });
  });

  describe('hour tokens', () => {
    it('formats HH as 24-hour zero-padded', () => {
      expect(formatDate(testDate, 'HH')).toBe('14');
    });

    it('formats H as 24-hour', () => {
      expect(formatDate(testDate, 'H')).toBe('14');
    });

    it('formats hh as 12-hour zero-padded', () => {
      expect(formatDate(testDate, 'hh')).toBe('02');
    });

    it('formats h as 12-hour', () => {
      expect(formatDate(testDate, 'h')).toBe('2');
    });

    it('formats midnight hour correctly', () => {
      const midnight = new Date(2024, 0, 1, 0, 0, 0);
      expect(formatDate(midnight, 'h')).toBe('12');
      expect(formatDate(midnight, 'HH')).toBe('00');
    });

    it('formats noon hour correctly', () => {
      const noon = new Date(2024, 0, 1, 12, 0, 0);
      expect(formatDate(noon, 'h')).toBe('12');
      expect(formatDate(noon, 'HH')).toBe('12');
    });
  });

  describe('minute and second tokens', () => {
    it('formats mm as zero-padded minutes', () => {
      expect(formatDate(testDate, 'mm')).toBe('30');
    });

    it('formats m as minutes', () => {
      expect(formatDate(testDate, 'm')).toBe('30');
    });

    it('formats ss as zero-padded seconds', () => {
      expect(formatDate(testDate, 'ss')).toBe('45');
    });

    it('formats s as seconds', () => {
      expect(formatDate(testDate, 's')).toBe('45');
    });
  });

  describe('AM/PM token', () => {
    it('formats a as PM for afternoon', () => {
      expect(formatDate(testDate, 'a')).toBe('PM');
    });

    it('formats a as AM for morning', () => {
      const morning = new Date(2024, 0, 1, 9, 0, 0);
      expect(formatDate(morning, 'a')).toBe('AM');
    });
  });

  describe('combined formats', () => {
    it('formats MMM d, yyyy', () => {
      expect(formatDate(testDate, 'MMM d, yyyy')).toBe('Jun 15, 2024');
    });

    it('formats yyyy-MM-dd', () => {
      expect(formatDate(testDate, 'yyyy-MM-dd')).toBe('2024-06-15');
    });

    it('formats HH:mm:ss', () => {
      expect(formatDate(testDate, 'HH:mm:ss')).toBe('14:30:45');
    });

    it('formats h:mm a', () => {
      expect(formatDate(testDate, 'h:mm a')).toBe('2:30 PM');
    });

    it('formats MMMM d, yyyy at h:mm a', () => {
      expect(formatDate(testDate, 'MMMM d, yyyy')).toBe('June 15, 2024');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for null date', () => {
      expect(formatDate(null as any, 'yyyy')).toBe('');
    });

    it('returns empty string for invalid date', () => {
      expect(formatDate(new Date('invalid'), 'yyyy')).toBe('');
    });
  });
});

describe('getTimeRange', () => {
  it('returns min and max from array of dates', () => {
    const dates = [
      new Date(2024, 0, 15),
      new Date(2024, 0, 10),
      new Date(2024, 0, 20)
    ];
    const range = getTimeRange(dates);
    expect(range).not.toBeNull();
    expect(range!.min.getDate()).toBe(10);
    expect(range!.max.getDate()).toBe(20);
  });

  it('returns same date for single-element array', () => {
    const dates = [new Date(2024, 0, 15)];
    const range = getTimeRange(dates);
    expect(range).not.toBeNull();
    expect(range!.min.getTime()).toBe(range!.max.getTime());
  });

  it('returns null for empty array', () => {
    expect(getTimeRange([])).toBeNull();
  });

  it('returns null for null input', () => {
    expect(getTimeRange(null as any)).toBeNull();
  });

  it('filters out invalid dates', () => {
    const dates = [
      new Date(2024, 0, 15),
      new Date('invalid'),
      new Date(2024, 0, 20)
    ];
    const range = getTimeRange(dates);
    expect(range).not.toBeNull();
    expect(range!.min.getDate()).toBe(15);
    expect(range!.max.getDate()).toBe(20);
  });

  it('returns null if all dates are invalid', () => {
    const dates = [new Date('invalid'), new Date('also invalid')];
    expect(getTimeRange(dates)).toBeNull();
  });
});

describe('dateToPosition', () => {
  const min = new Date(2024, 0, 1);  // Jan 1
  const max = new Date(2024, 0, 31); // Jan 31

  it('returns 0 for min date', () => {
    expect(dateToPosition(min, min, max)).toBe(0);
  });

  it('returns 1 for max date', () => {
    expect(dateToPosition(max, min, max)).toBe(1);
  });

  it('returns 0.5 for midpoint', () => {
    const mid = new Date(2024, 0, 16); // Jan 16 is roughly midpoint
    const position = dateToPosition(mid, min, max);
    expect(position).toBeCloseTo(0.5, 1);
  });

  it('returns correct position for arbitrary date', () => {
    const date = new Date(2024, 0, 8); // Jan 8 is 7/30 = ~0.233
    const position = dateToPosition(date, min, max);
    expect(position).toBeGreaterThan(0.2);
    expect(position).toBeLessThan(0.3);
  });

  it('returns 0.5 when min equals max', () => {
    const same = new Date(2024, 0, 15);
    expect(dateToPosition(same, same, same)).toBe(0.5);
  });
});

describe('selectTickInterval', () => {
  it('selects seconds for sub-minute range', () => {
    const rangeMs = 30 * 1000; // 30 seconds
    const { intervalMs, labelFormat } = selectTickInterval(rangeMs);
    expect(intervalMs).toBeLessThanOrEqual(30 * 1000);
    expect(labelFormat).toContain(':');
  });

  it('selects minutes for minute-range', () => {
    const rangeMs = 30 * 60 * 1000; // 30 minutes
    const { intervalMs, labelFormat } = selectTickInterval(rangeMs);
    expect(intervalMs).toBeLessThanOrEqual(10 * 60 * 1000);
    expect(labelFormat).toBe('HH:mm');
  });

  it('selects hours for hour-range', () => {
    const rangeMs = 12 * 60 * 60 * 1000; // 12 hours
    const { intervalMs, labelFormat } = selectTickInterval(rangeMs);
    expect(intervalMs).toBeGreaterThanOrEqual(60 * 60 * 1000);
    expect(labelFormat).toContain(':');
  });

  it('selects days for day-range', () => {
    const rangeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const { intervalMs, labelFormat } = selectTickInterval(rangeMs);
    expect(intervalMs).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
    expect(labelFormat).toContain('MMM');
  });

  it('selects months for month-range', () => {
    const rangeMs = 90 * 24 * 60 * 60 * 1000; // ~3 months
    const { intervalMs, labelFormat } = selectTickInterval(rangeMs);
    expect(labelFormat).toContain('MMM');
  });

  it('selects years for year-range', () => {
    const rangeMs = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
    const { intervalMs, labelFormat } = selectTickInterval(rangeMs);
    // With 10 years / 5 ticks = 2 years per tick, should select yearly format
    expect(labelFormat).toBe('yyyy');
  });

  it('uses targetCount to adjust interval', () => {
    const rangeMs = 24 * 60 * 60 * 1000; // 1 day
    const result3 = selectTickInterval(rangeMs, 3);
    const result10 = selectTickInterval(rangeMs, 10);
    // More ticks should select smaller interval
    expect(result10.intervalMs).toBeLessThanOrEqual(result3.intervalMs);
  });

  it('defaults to 1 day for zero or negative range', () => {
    const { intervalMs, labelFormat } = selectTickInterval(0);
    expect(intervalMs).toBe(86400000); // 1 day in ms
    expect(labelFormat).toBe('MMM d');
  });
});

describe('calculateTimeTicks', () => {
  it('returns array of tick dates', () => {
    const min = new Date(2024, 0, 1);
    const max = new Date(2024, 0, 10);
    const { dates, format } = calculateTimeTicks(min, max);
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.every(d => d instanceof Date)).toBe(true);
    expect(format).toBeTruthy();
  });

  it('returns appropriate format for date range', () => {
    const min = new Date(2024, 0, 1);
    const max = new Date(2024, 0, 7);
    const { format } = calculateTimeTicks(min, max);
    expect(format).toContain('d'); // Should include day
  });

  it('respects targetCount parameter', () => {
    const min = new Date(2024, 0, 1);
    const max = new Date(2024, 11, 31);
    const result3 = calculateTimeTicks(min, max, 3);
    const result10 = calculateTimeTicks(min, max, 10);
    // More target ticks should generally produce more ticks
    expect(result10.dates.length).toBeGreaterThanOrEqual(result3.dates.length);
  });

  it('handles single-day range', () => {
    const min = new Date(2024, 0, 15, 0, 0, 0);
    const max = new Date(2024, 0, 15, 23, 59, 59);
    const { dates, format } = calculateTimeTicks(min, max);
    expect(dates.length).toBeGreaterThan(0);
    expect(format).toContain(':'); // Should show time
  });

  it('handles multi-year range', () => {
    const min = new Date(2020, 0, 1);
    const max = new Date(2024, 11, 31);
    const { dates, format } = calculateTimeTicks(min, max);
    expect(dates.length).toBeGreaterThan(0);
    expect(format).toBe('yyyy');
  });

  it('returns endpoints when no ticks fall in range', () => {
    const min = new Date(2024, 0, 15);
    const max = new Date(2024, 0, 15); // Same date
    const { dates } = calculateTimeTicks(min, max);
    expect(dates.length).toBe(1);
  });

  it('all ticks fall within range', () => {
    const min = new Date(2024, 0, 1);
    const max = new Date(2024, 5, 30);
    const { dates } = calculateTimeTicks(min, max);
    dates.forEach(date => {
      expect(date.getTime()).toBeGreaterThanOrEqual(min.getTime());
      expect(date.getTime()).toBeLessThanOrEqual(max.getTime());
    });
  });
});

describe('parseDateLabels', () => {
  it('parses array of ISO date strings', () => {
    const labels = ['2024-01-01', '2024-01-15', '2024-02-01'];
    const result = parseDateLabels(labels);
    expect(result.allValid).toBe(true);
    expect(result.dates).toHaveLength(3);
    expect(result.validIndices).toEqual([0, 1, 2]);
  });

  it('returns range for valid dates', () => {
    const labels = ['2024-01-01', '2024-01-15', '2024-02-01'];
    const result = parseDateLabels(labels);
    expect(result.range).not.toBeNull();
    expect(result.range!.min.getMonth()).toBe(0);
    expect(result.range!.max.getMonth()).toBe(1);
  });

  it('handles mixed valid and invalid dates', () => {
    const labels = ['2024-01-01', 'not a date', '2024-02-01'];
    const result = parseDateLabels(labels);
    expect(result.allValid).toBe(false);
    expect(result.validIndices).toEqual([0, 2]);
    expect(result.dates).toHaveLength(3);
  });

  it('marks invalid dates with NaN time', () => {
    const labels = ['2024-01-01', 'invalid'];
    const result = parseDateLabels(labels);
    expect(isNaN(result.dates[1].getTime())).toBe(true);
  });

  it('uses format hint for parsing', () => {
    const labels = ['01/15/2024', '02/20/2024'];
    const result = parseDateLabels(labels, 'MM/dd/yyyy');
    expect(result.allValid).toBe(true);
    expect(result.dates[0].getMonth()).toBe(0);
    expect(result.dates[0].getDate()).toBe(15);
  });

  it('returns null range when all dates invalid', () => {
    const labels = ['invalid1', 'invalid2'];
    const result = parseDateLabels(labels);
    expect(result.range).toBeNull();
    expect(result.allValid).toBe(false);
  });

  it('handles empty array', () => {
    const result = parseDateLabels([]);
    expect(result.dates).toHaveLength(0);
    expect(result.validIndices).toHaveLength(0);
    expect(result.range).toBeNull();
    expect(result.allValid).toBe(true); // Empty is technically "all valid"
  });
});
