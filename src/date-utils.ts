/**
 * Date parsing, formatting, and time axis utilities.
 * Pure functions with no DOM dependencies.
 */

// ============================================================================
// Date Format Tokens
// ============================================================================

/**
 * Supported format tokens for date parsing and formatting.
 *
 * | Token | Example | Description |
 * |-------|---------|-------------|
 * | yyyy  | 2024    | 4-digit year |
 * | yy    | 24      | 2-digit year |
 * | MMM   | Jan     | Short month name |
 * | MM    | 01      | 2-digit month |
 * | M     | 1       | Month number |
 * | dd    | 05      | 2-digit day |
 * | d     | 5       | Day number |
 * | HH    | 14      | 24-hour hour |
 * | hh    | 02      | 12-hour hour (padded) |
 * | h     | 2       | 12-hour hour |
 * | mm    | 30      | Minutes (padded) |
 * | m     | 5       | Minutes |
 * | ss    | 45      | Seconds (padded) |
 * | s     | 5       | Seconds |
 * | a     | AM/PM   | AM/PM indicator |
 */

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ============================================================================
// Date Parsing
// ============================================================================

/**
 * Parse a date string into a Date object.
 * Supports ISO 8601, Unix timestamps, and custom formats.
 *
 * @param value The date string to parse
 * @param format Optional format hint ('timestamp' for Unix seconds, or custom format)
 * @returns Date object or null if parsing fails
 *
 * @example
 * parseDate('2024-01-15')           // ISO date
 * parseDate('2024-01-15T10:30:00')  // ISO datetime
 * parseDate('1705312200', 'timestamp')  // Unix timestamp
 */
export function parseDate(value: string, format?: string): Date | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  // Handle Unix timestamp
  if (format === 'timestamp') {
    const timestamp = parseFloat(trimmed);
    if (isNaN(timestamp)) return null;
    return new Date(timestamp * 1000); // Convert seconds to milliseconds
  }

  // Try ISO 8601 parsing first (most common case)
  const isoDate = parseISODate(trimmed);
  if (isoDate) return isoDate;

  // Try custom format parsing if provided
  if (format && format !== 'timestamp') {
    return parseWithFormat(trimmed, format);
  }

  // Last resort: try native Date parsing
  const nativeDate = new Date(trimmed);
  return isNaN(nativeDate.getTime()) ? null : nativeDate;
}

/**
 * Parse an ISO 8601 date string.
 * Handles: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, YYYY-MM-DDTHH:mm:ssZ, etc.
 */
function parseISODate(value: string): Date | null {
  // Match ISO 8601 patterns
  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?)?([Z]|[+-]\d{2}:?\d{2})?$/;
  const match = value.match(isoPattern);

  if (!match) return null;

  const [, year, month, day, hour = '0', minute = '0', second = '0', ms = '0', tz] = match;

  // Create date in local time or UTC based on timezone indicator
  if (tz === 'Z' || tz) {
    // Use native parsing for timezone handling
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  // No timezone - treat as local time
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second),
    parseInt(ms.padEnd(3, '0'))
  );
}

/**
 * Parse a date string using a custom format.
 * Uses a token-by-token approach to avoid overlap issues.
 */
function parseWithFormat(value: string, format: string): Date | null {
  // Define token patterns in order of longest to shortest (to match greedily)
  const tokenPatterns: Array<{ token: string; regex: string }> = [
    { token: 'yyyy', regex: '(\\d{4})' },
    { token: 'yy', regex: '(\\d{2})' },
    { token: 'MMMM', regex: '([A-Za-z]+)' },
    { token: 'MMM', regex: '([A-Za-z]+)' },
    { token: 'MM', regex: '(\\d{2})' },
    { token: 'M', regex: '(\\d{1,2})' },
    { token: 'dd', regex: '(\\d{2})' },
    { token: 'd', regex: '(\\d{1,2})' },
    { token: 'HH', regex: '(\\d{2})' },
    { token: 'H', regex: '(\\d{1,2})' },
    { token: 'hh', regex: '(\\d{2})' },
    { token: 'h', regex: '(\\d{1,2})' },
    { token: 'mm', regex: '(\\d{2})' },
    { token: 'm', regex: '(\\d{1,2})' },
    { token: 'ss', regex: '(\\d{2})' },
    { token: 's', regex: '(\\d{1,2})' },
    { token: 'a', regex: '([AaPp][Mm])' },
  ];

  // Build the pattern by scanning the format string character by character
  let pattern = '';
  let i = 0;
  while (i < format.length) {
    let matched = false;
    // Try to match tokens from longest to shortest
    for (const { token, regex } of tokenPatterns) {
      if (format.slice(i, i + token.length) === token) {
        pattern += regex;
        i += token.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Escape special regex characters for literal text
      const char = format[i];
      const specialChars = '/\\^$.|?*+()[]{}';
      if (specialChars.includes(char)) {
        pattern += '\\' + char;
      } else {
        pattern += char;
      }
      i++;
    }
  }

  const regex = new RegExp(`^${pattern}$`);
  const match = value.match(regex);
  if (!match) return null;

  // Extract token order from format (longer tokens first in alternation)
  const tokens = format.match(/(yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|hh|h|mm|m|ss|s|a)/g) || [];

  let year = new Date().getFullYear();
  let month = 0;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;
  let isPM = false;

  tokens.forEach((token, index) => {
    const val = match[index + 1];
    switch (token) {
      case 'yyyy':
        year = parseInt(val);
        break;
      case 'yy':
        year = 2000 + parseInt(val);
        break;
      case 'MMMM':
      case 'MMM': {
        const monthIndex = MONTH_NAMES_SHORT.findIndex(m => m.toLowerCase() === val.slice(0, 3).toLowerCase());
        if (monthIndex >= 0) month = monthIndex;
        break;
      }
      case 'MM':
      case 'M':
        month = parseInt(val) - 1;
        break;
      case 'dd':
      case 'd':
        day = parseInt(val);
        break;
      case 'HH':
      case 'H':
        hour = parseInt(val);
        break;
      case 'hh':
      case 'h':
        hour = parseInt(val);
        break;
      case 'mm':
      case 'm':
        minute = parseInt(val);
        break;
      case 'ss':
      case 's':
        second = parseInt(val);
        break;
      case 'a':
        isPM = val.toLowerCase() === 'pm';
        break;
    }
  });

  // Handle 12-hour time
  if (isPM && hour < 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;

  return new Date(year, month, day, hour, minute, second);
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format a Date object using format tokens.
 *
 * @param date The Date to format
 * @param format Format string with tokens
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date('2024-01-15'), 'MMM d, yyyy')  // "Jan 15, 2024"
 * formatDate(new Date('2024-01-15T14:30'), 'HH:mm')  // "14:30"
 */
export function formatDate(date: Date, format: string): string {
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  const hour12 = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';

  return format
    .replace(/yyyy/g, String(year))
    .replace(/yy/g, String(year).slice(-2))
    .replace(/MMMM/g, MONTH_NAMES_LONG[month])
    .replace(/MMM/g, MONTH_NAMES_SHORT[month])
    .replace(/MM/g, String(month + 1).padStart(2, '0'))
    .replace(/M/g, String(month + 1))
    .replace(/dd/g, String(day).padStart(2, '0'))
    .replace(/d/g, String(day))
    .replace(/HH/g, String(hour).padStart(2, '0'))
    .replace(/H/g, String(hour))
    .replace(/hh/g, String(hour12).padStart(2, '0'))
    .replace(/h/g, String(hour12))
    .replace(/mm/g, String(minute).padStart(2, '0'))
    .replace(/m/g, String(minute))
    .replace(/ss/g, String(second).padStart(2, '0'))
    .replace(/s/g, String(second))
    .replace(/a/g, ampm);
}

// ============================================================================
// Time Range and Positioning
// ============================================================================

/**
 * Get the time range from an array of dates.
 *
 * @param dates Array of Date objects
 * @returns Object with min and max dates, or null if empty
 */
export function getTimeRange(dates: Date[]): { min: Date; max: Date } | null {
  if (!dates || dates.length === 0) return null;

  const validDates = dates.filter(d => d && !isNaN(d.getTime()));
  if (validDates.length === 0) return null;

  const timestamps = validDates.map(d => d.getTime());
  return {
    min: new Date(Math.min(...timestamps)),
    max: new Date(Math.max(...timestamps))
  };
}

/**
 * Convert a date to a position (0-1) within a time range.
 * Used for time-proportional positioning of data points.
 *
 * @param date The date to position
 * @param min Minimum date of the range
 * @param max Maximum date of the range
 * @returns Position as fraction (0 = min, 1 = max)
 */
export function dateToPosition(date: Date, min: Date, max: Date): number {
  const dateTime = date.getTime();
  const minTime = min.getTime();
  const maxTime = max.getTime();

  if (maxTime === minTime) return 0.5; // Avoid division by zero

  return (dateTime - minTime) / (maxTime - minTime);
}

// ============================================================================
// Time Tick Calculation
// ============================================================================

/**
 * Time interval configuration for tick selection.
 */
interface TimeInterval {
  /** Interval in milliseconds */
  ms: number;
  /** Label format for this interval */
  format: string;
  /** Human-readable name */
  name: string;
}

/**
 * Common time intervals for tick selection.
 */
const TIME_INTERVALS: TimeInterval[] = [
  { ms: 1000, format: 'HH:mm:ss', name: '1 second' },
  { ms: 5000, format: 'HH:mm:ss', name: '5 seconds' },
  { ms: 10000, format: 'HH:mm:ss', name: '10 seconds' },
  { ms: 30000, format: 'HH:mm:ss', name: '30 seconds' },
  { ms: 60000, format: 'HH:mm', name: '1 minute' },
  { ms: 300000, format: 'HH:mm', name: '5 minutes' },
  { ms: 600000, format: 'HH:mm', name: '10 minutes' },
  { ms: 1800000, format: 'HH:mm', name: '30 minutes' },
  { ms: 3600000, format: 'HH:mm', name: '1 hour' },
  { ms: 7200000, format: 'HH:mm', name: '2 hours' },
  { ms: 21600000, format: 'HH:mm', name: '6 hours' },
  { ms: 43200000, format: 'MMM d HH:mm', name: '12 hours' },
  { ms: 86400000, format: 'MMM d', name: '1 day' },
  { ms: 172800000, format: 'MMM d', name: '2 days' },
  { ms: 604800000, format: 'MMM d', name: '1 week' },
  { ms: 1209600000, format: 'MMM d', name: '2 weeks' },
  { ms: 2592000000, format: 'MMM yyyy', name: '1 month' },
  { ms: 7776000000, format: 'MMM yyyy', name: '3 months' },
  { ms: 15552000000, format: 'MMM yyyy', name: '6 months' },
  { ms: 31536000000, format: 'yyyy', name: '1 year' },
  { ms: 63072000000, format: 'yyyy', name: '2 years' },
  { ms: 157680000000, format: 'yyyy', name: '5 years' },
];

/**
 * Select an appropriate tick interval based on the time range.
 *
 * @param rangeMs Time range in milliseconds
 * @param targetCount Target number of ticks (default: 5)
 * @returns Object with intervalMs and labelFormat
 */
export function selectTickInterval(rangeMs: number, targetCount: number = 5): { intervalMs: number; labelFormat: string } {
  if (rangeMs <= 0) {
    return { intervalMs: 86400000, labelFormat: 'MMM d' }; // Default to 1 day
  }

  const idealInterval = rangeMs / targetCount;

  // Find the best matching interval
  let best = TIME_INTERVALS[0];
  for (const interval of TIME_INTERVALS) {
    if (interval.ms >= idealInterval * 0.5) {
      best = interval;
      break;
    }
    best = interval;
  }

  return {
    intervalMs: best.ms,
    labelFormat: best.format
  };
}

/**
 * Calculate tick dates for a time axis.
 *
 * @param min Minimum date
 * @param max Maximum date
 * @param targetCount Target number of ticks (default: 5)
 * @returns Object with dates array and format string
 */
export function calculateTimeTicks(
  min: Date,
  max: Date,
  targetCount: number = 5
): { dates: Date[]; format: string } {
  const minTime = min.getTime();
  const maxTime = max.getTime();
  const rangeMs = maxTime - minTime;

  if (rangeMs <= 0) {
    return { dates: [min], format: 'MMM d, yyyy' };
  }

  const { intervalMs, labelFormat } = selectTickInterval(rangeMs, targetCount);

  // Align start to a "nice" boundary
  const startTime = Math.floor(minTime / intervalMs) * intervalMs;

  const ticks: Date[] = [];
  for (let t = startTime; t <= maxTime + intervalMs * 0.001; t += intervalMs) {
    if (t >= minTime && t <= maxTime) {
      ticks.push(new Date(t));
    }
  }

  // Ensure we have at least the endpoints if no ticks fell in range
  if (ticks.length === 0) {
    return { dates: [min, max], format: labelFormat };
  }

  return { dates: ticks, format: labelFormat };
}

/**
 * Result of parsing dates from label values.
 */
export interface ParsedDates {
  /** Array of parsed dates (same length as input) */
  dates: Date[];
  /** Indices of successfully parsed dates */
  validIndices: number[];
  /** Time range of valid dates */
  range: { min: Date; max: Date } | null;
  /** Whether all values were successfully parsed */
  allValid: boolean;
}

/**
 * Parse an array of label values as dates.
 *
 * @param labels Array of label strings
 * @param format Optional date format hint
 * @returns ParsedDates with dates and metadata
 */
export function parseDateLabels(labels: string[], format?: string): ParsedDates {
  const dates: Date[] = [];
  const validIndices: number[] = [];

  labels.forEach((label, index) => {
    const date = parseDate(label, format);
    if (date) {
      dates.push(date);
      validIndices.push(index);
    } else {
      dates.push(new Date(NaN)); // Placeholder for invalid dates
    }
  });

  const validDates = dates.filter((_, i) => validIndices.includes(i));
  const range = getTimeRange(validDates);

  return {
    dates,
    validIndices,
    range,
    allValid: validIndices.length === labels.length
  };
}
