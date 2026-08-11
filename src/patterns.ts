/**
 * Pattern definitions and utilities for SVG pattern fills.
 *
 * This module provides:
 * - Built-in pattern types (8 patterns)
 * - SVG pattern generators for each type
 * - High contrast mode support (pattern sequence + colors)
 * - Helper functions for pattern validation and ID generation
 */

/**
 * Built-in pattern types available in the library.
 */
export type PatternType =
  | 'diagonal-lines'
  | 'diagonal-lines-reverse'
  | 'dots'
  | 'crosshatch'
  | 'horizontal-lines'
  | 'vertical-lines'
  | 'grid'
  | 'checkerboard';

/**
 * All available pattern types as an array for iteration.
 */
export const PATTERN_TYPES: PatternType[] = [
  'diagonal-lines',
  'diagonal-lines-reverse',
  'dots',
  'crosshatch',
  'horizontal-lines',
  'vertical-lines',
  'grid',
  'checkerboard'
];

/**
 * Configuration for a pattern fill.
 */
export interface PatternConfig {
  /** The pattern type */
  type: PatternType;
  /**
   * Color of the pattern elements.
   * For line-based patterns (diagonal-lines, crosshatch, grid, etc.), this is the stroke color.
   * For shape-based patterns (dots, checkerboard), this is the fill color of the shapes.
   */
  stroke: string;
  /** Fill color behind the pattern (transparent if not set) */
  fill?: string;
  /** Size multiplier (default: 1) */
  scale?: number;
}

/**
 * A resolved pattern ready for SVG rendering.
 */
export interface ResolvedPattern {
  /** Unique ID for this pattern instance */
  id: string;
  /** The pattern type */
  type: PatternType;
  /**
   * Color of the pattern elements.
   * For line-based patterns, this is the stroke color.
   * For shape-based patterns (dots, checkerboard), this is the fill color of the shapes.
   */
  stroke: string;
  /** Fill color behind the pattern (never undefined after resolution) */
  fill: string;
  /** Size multiplier (never undefined after resolution) */
  scale: number;
}

/**
 * Result of resolving a fill that may include a pattern.
 */
export interface ResolvedFillAndPattern {
  /** The fill value for SVG (color or pattern URL) */
  fill: string;
  /** Pattern ID if a pattern is used */
  patternId?: string;
  /** Original fill color (for legend display) */
  originalFill: string;
}

/**
 * Escape a value for interpolation into a double-quoted SVG attribute.
 *
 * The pattern generators below build **strings**, and `BaseChart.renderDefs()`
 * hands the result to lit's `unsafeSVG` — which parses it as markup, by design,
 * because a `<pattern>` cannot be expressed as a lit template here. That makes
 * every interpolated value a script-injection vector unless it is escaped.
 *
 * `pattern-stroke` and `pattern-fill` come straight off an author's attribute,
 * and this library's whole premise is that markup is generated from server data.
 * A colour taken from a database row was enough to run script:
 *
 *     pattern-stroke='red"/><image href="x" onerror="…"/><line stroke="'
 *
 * Both `<animate onbegin>` and `<image onerror>` fired in Chromium before this
 * existed. `pattern-scale` is declared `type: Number` and cannot carry a
 * payload, but it is escaped on the same path for the sake of one rule rather
 * than two.
 */
export function escapeSvgAttribute(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Type for pattern SVG generator functions.
 */
type PatternGenerator = (
  id: string,
  stroke: string,
  fill: string,
  scale: number
) => string;

/**
 * SVG pattern generators for each pattern type.
 *
 * Each generator returns an SVG <pattern> element string.
 * Patterns use userSpaceOnUse for consistent sizing across shapes.
 */
export const PATTERN_DEFINITIONS: Record<PatternType, PatternGenerator> = {
  /**
   * Diagonal lines from bottom-left to top-right (/)
   */
  'diagonal-lines': (id, stroke, fill, scale) => {
    const size = 10 * scale;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${fill}"/>
      <line x1="0" y1="${size}" x2="${size}" y2="0" stroke="${stroke}" stroke-width="${1.5 * scale}"/>
    </pattern>`;
  },

  /**
   * Diagonal lines from top-left to bottom-right (\)
   */
  'diagonal-lines-reverse': (id, stroke, fill, scale) => {
    const size = 10 * scale;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${fill}"/>
      <line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${stroke}" stroke-width="${1.5 * scale}"/>
    </pattern>`;
  },

  /**
   * Regular dot grid.
   * Note: `stroke` is used as the fill color for the dots.
   */
  'dots': (id, stroke, fill, scale) => {
    const size = 10 * scale;
    const radius = 2 * scale;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${fill}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="${stroke}"/>
    </pattern>`;
  },

  /**
   * Diagonal lines in both directions (X pattern)
   */
  'crosshatch': (id, stroke, fill, scale) => {
    const size = 10 * scale;
    const strokeWidth = 1.5 * scale;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${fill}"/>
      <line x1="0" y1="${size}" x2="${size}" y2="0" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    </pattern>`;
  },

  /**
   * Horizontal parallel lines
   */
  'horizontal-lines': (id, stroke, fill, scale) => {
    const size = 8 * scale;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${fill}"/>
      <line x1="0" y1="${size / 2}" x2="${size}" y2="${size / 2}" stroke="${stroke}" stroke-width="${1.5 * scale}"/>
    </pattern>`;
  },

  /**
   * Vertical parallel lines
   */
  'vertical-lines': (id, stroke, fill, scale) => {
    const size = 8 * scale;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${fill}"/>
      <line x1="${size / 2}" y1="0" x2="${size / 2}" y2="${size}" stroke="${stroke}" stroke-width="${1.5 * scale}"/>
    </pattern>`;
  },

  /**
   * Horizontal + vertical lines forming a grid
   */
  'grid': (id, stroke, fill, scale) => {
    const size = 10 * scale;
    const strokeWidth = 1 * scale;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${fill}"/>
      <line x1="0" y1="${size / 2}" x2="${size}" y2="${size / 2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${size / 2}" y1="0" x2="${size / 2}" y2="${size}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    </pattern>`;
  },

  /**
   * Alternating filled squares (checkerboard pattern).
   * Note: `stroke` is used as the fill color for the alternating squares.
   */
  'checkerboard': (id, stroke, fill, scale) => {
    const size = 10 * scale;
    const half = size / 2;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${fill}"/>
      <rect x="0" y="0" width="${half}" height="${half}" fill="${stroke}"/>
      <rect x="${half}" y="${half}" width="${half}" height="${half}" fill="${stroke}"/>
    </pattern>`;
  }
};

/**
 * Pattern sequence for high contrast mode auto-assignment.
 *
 * These patterns are ordered to maximize visual distinction between
 * adjacent elements. The first patterns are the most visually distinct.
 */
export const HIGH_CONTRAST_PATTERN_SEQUENCE: PatternType[] = [
  'diagonal-lines',
  'dots',
  'crosshatch',
  'horizontal-lines',
  'diagonal-lines-reverse',
  'vertical-lines',
  'grid',
  'checkerboard'
];

/**
 * WCAG AA compliant colors for high contrast mode.
 *
 * These colors are selected to:
 * - Have sufficient contrast against white backgrounds
 * - Be visually distinct from each other
 * - Work well with pattern overlays
 */
export const HIGH_CONTRAST_COLORS: string[] = [
  '#0057b8', // Strong blue
  '#d32f2f', // Strong red
  '#2e7d32', // Strong green
  '#7b1fa2', // Strong purple
  '#e65100', // Strong orange
  '#0097a7', // Strong cyan
  '#c2185b', // Strong pink
  '#5d4037'  // Strong brown
];

/**
 * Check if a value is a valid built-in pattern type.
 */
export function isPatternType(value: string): value is PatternType {
  return PATTERN_TYPES.includes(value as PatternType);
}

/**
 * Generate a unique pattern ID for a chart instance.
 *
 * @param chartId - The chart's instance ID (e.g., "dc-chart-1")
 * @param type - The pattern type
 * @param index - Element index for uniqueness
 * @returns A unique pattern ID like "dc-chart-1-diagonal-lines-0"
 */
export function generatePatternId(
  chartId: string,
  type: PatternType,
  index: number
): string {
  return `${chartId}-${type}-${index}`;
}

/**
 * Get high contrast colors for a given count.
 *
 * If count exceeds available colors, colors are cycled.
 *
 * @param count - Number of colors needed
 * @returns Array of color strings
 */
export function getHighContrastColors(count: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(HIGH_CONTRAST_COLORS[i % HIGH_CONTRAST_COLORS.length]);
  }
  return colors;
}

/**
 * Get the pattern type for a given index in high contrast mode.
 *
 * Cycles through the pattern sequence.
 *
 * @param index - Element index
 * @returns Pattern type for that index
 */
export function getHighContrastPattern(index: number): PatternType {
  return HIGH_CONTRAST_PATTERN_SEQUENCE[index % HIGH_CONTRAST_PATTERN_SEQUENCE.length];
}
