/**
 * Error code registry for declarative-charts.
 *
 * Error codes are organized by category:
 * - DC001-DC099: Data errors (empty charts, invalid values, all hidden)
 * - DC100-DC199: Configuration errors (invalid attributes, bad settings)
 * - DC200-DC299: Reference errors (palette not found, pattern not found, element not found)
 * - DC300-DC399: Style warnings (CSS conventions used instead of SVG)
 * - DC400-DC499: Informational (suboptimal but functional configurations)
 *
 * Each error includes:
 * - code: Unique identifier (e.g., "DC001")
 * - message: Human-readable description template
 * - path: Default log path for this error type
 */

/**
 * Log level for error definitions.
 * Duplicated here to avoid circular dependency with base-chart.ts.
 */
export type ErrorLevel = 'error' | 'warning' | 'info';

/**
 * Structure for error code definitions
 */
export interface ErrorDefinition {
  /** Unique error code (e.g., "DC001") */
  code: string;
  /** Default severity level */
  level: ErrorLevel;
  /** Default log path */
  path: string;
  /** Human-readable message template. Use {placeholders} for dynamic values. */
  message: string;
}

/**
 * Error code registry.
 * Use ErrorCode.XXX to reference errors throughout the codebase.
 */
export const ErrorCode = {
  // ===========================================================================
  // DC001-DC099: Data Errors
  // ===========================================================================

  /**
   * Chart has no data elements
   */
  DATA_EMPTY: {
    code: 'DC001',
    level: 'warning',
    path: 'data.empty',
    message: '{chartType} has no {expectedElements}. Add {expectedElements} to display data.'
  },

  /**
   * All data elements are hidden
   */
  DATA_ALL_HIDDEN: {
    code: 'DC002',
    level: 'warning',
    path: 'data.allHidden',
    message: '{chartType} has {count} data element(s) but all are hidden. Check for hidden attributes on {elementTypes}.'
  },

  /**
   * Total of all values is zero (pie chart)
   */
  DATA_ZERO_TOTAL: {
    code: 'DC003',
    level: 'warning',
    path: 'data.zeroTotal',
    message: 'All {elementType} values sum to 0. {chartType} cannot be rendered. Check that {elementType}s have positive values.'
  },

  /**
   * Elements have zero or negative values where positive is required
   */
  DATA_INVALID_VALUES: {
    code: 'DC004',
    level: 'warning',
    path: 'data.invalidValues',
    message: '{count} {elementType}(s) have zero or negative values and will not be visible: {labels}. {chartType}s require positive values.'
  },

  /**
   * Bars have value 0 and will not render
   */
  DATA_ZERO_BARS: {
    code: 'DC005',
    level: 'warning',
    path: 'bars.zeroValue',
    message: '{count} bar(s) have value 0 and will not be visible: {labels}'
  },

  /**
   * Elements have negative values (stage chart warning)
   */
  DATA_NEGATIVE_VALUES: {
    code: 'DC006',
    level: 'warning',
    path: 'data.negativeValues',
    message: '{count} {elementType}(s) have negative values which may not display correctly: {labels}'
  },

  // ===========================================================================
  // DC100-DC199: Configuration Errors
  // ===========================================================================

  /**
   * Line element has no points
   */
  LINE_NO_POINTS: {
    code: 'DC101',
    level: 'warning',
    path: 'lines.noPoints',
    message: "Line '{label}' has no dc-point children and will not be visible."
  },

  /**
   * Area element has no points
   */
  AREA_NO_POINTS: {
    code: 'DC102',
    level: 'warning',
    path: 'areas.noPoints',
    message: "Area '{label}' has no dc-point children and will not be visible."
  },

  /**
   * Invalid inner radius for donut chart
   */
  DONUT_INVALID_RADIUS: {
    code: 'DC103',
    level: 'warning',
    path: 'donut.invalidInnerRadius',
    message: 'inner-radius="{value}" is {reason}. {suggestion}'
  },

  /**
   * Could not parse attribute value
   */
  PARSE_ERROR: {
    code: 'DC104',
    level: 'warning',
    path: 'parse',
    message: 'Could not parse {attribute} value "{value}", defaulting to {default}'
  },

  /**
   * Invalid format string
   */
  FORMAT_INVALID: {
    code: 'DC105',
    level: 'warning',
    path: 'format.invalid',
    message: 'Invalid format string: "{format}", using default'
  },

  /**
   * Time axis has insufficient valid dates
   */
  TIME_AXIS_FEW_DATES: {
    code: 'DC106',
    level: 'warning',
    path: 'timeAxis',
    message: "Type is 'time' but only {count} valid date(s) found"
  },

  // ===========================================================================
  // DC200-DC299: Reference Errors
  // ===========================================================================

  /**
   * Palette not found
   */
  PALETTE_NOT_FOUND: {
    code: 'DC201',
    level: 'warning',
    path: 'colors.palette',
    message: 'Palette "{id}" not found (no DOM element or built-in with that name)'
  },

  /**
   * Pattern not found or invalid
   */
  PATTERN_NOT_FOUND: {
    code: 'DC202',
    level: 'warning',
    path: 'pattern.resolve',
    message: 'Pattern "{id}" is not a valid type or ID reference'
  },

  /**
   * Zero-fill element not found
   */
  ZERO_FILL_NOT_FOUND: {
    code: 'DC203',
    level: 'warning',
    path: 'zero.fillNotFound',
    message: 'Zero-fill element with id "{id}" not found'
  },

  /**
   * SVG element not found in shadow DOM (internal error)
   */
  SVG_NOT_FOUND: {
    code: 'DC204',
    level: 'warning',
    path: 'render.svgNotFound',
    message: 'No SVG element found in chart shadow DOM'
  },

  // ===========================================================================
  // DC300-DC399: Style Warnings
  // ===========================================================================

  /**
   * CSS attribute used instead of SVG attribute on title
   */
  TITLE_STYLE_WARNING: {
    code: 'DC301',
    level: 'warning',
    path: 'title.style',
    message: '{message}'
  },

  /**
   * CSS attribute used instead of SVG attribute on legend
   */
  LEGEND_STYLE_WARNING: {
    code: 'DC302',
    level: 'warning',
    path: 'legend.style',
    message: '{message}'
  },

  /**
   * CSS attribute used instead of SVG attribute on axis
   */
  AXIS_STYLE_WARNING: {
    code: 'DC303',
    level: 'warning',
    path: 'axis.style',
    message: '{message}'
  },

  // ===========================================================================
  // DC400-DC499: Informational Warnings
  // ===========================================================================

  /**
   * All elements have the same color (consider using palette)
   */
  COLORS_UNIFORM: {
    code: 'DC401',
    level: 'warning',
    path: 'colors.uniform',
    message: 'All {count} {elementType}s have the same fill color - consider using a palette for visual distinction'
  }

} as const;

/**
 * Type for error code keys
 */
export type ErrorCodeKey = keyof typeof ErrorCode;

/**
 * Get error definition by code string (e.g., "DC001")
 */
export function getErrorByCode(code: string): ErrorDefinition | undefined {
  for (const key in ErrorCode) {
    const def = ErrorCode[key as ErrorCodeKey];
    if (def.code === code) {
      return def;
    }
  }
  return undefined;
}

/**
 * Format an error message by replacing placeholders with values.
 *
 * @param template Message template with {placeholders}
 * @param values Object mapping placeholder names to values
 * @returns Formatted message string
 *
 * @example
 * formatErrorMessage('{count} items found', { count: 5 })
 * // Returns: "5 items found"
 */
export function formatErrorMessage(
  template: string,
  values: Record<string, string | number | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Create a formatted log message with error code prefix.
 *
 * @param error Error definition
 * @param values Placeholder values for the message
 * @returns Object with formatted message and metadata
 */
export function createErrorLog(
  error: ErrorDefinition,
  values: Record<string, string | number | undefined> = {}
): { code: string; level: ErrorLevel; path: string; message: string } {
  return {
    code: error.code,
    level: error.level,
    path: error.path,
    message: formatErrorMessage(error.message, values)
  };
}
