/**
 * Pure utility functions for chart calculations.
 * These functions have no DOM dependencies and are easily testable.
 */

import type { TickConfig } from './axis-chart.js';

// ============================================================================
// Nice Number and Tick Calculations
// ============================================================================

/**
 * Calculate a "nice" number for axis scaling.
 * Nice numbers are 1, 2, 5, or 10 multiplied by a power of 10.
 *
 * @param value The raw value to round
 * @param round If true, round to nearest nice number; if false, ceiling
 * @returns A nice number >= value (or nearest if round=true)
 */
export function niceNumber(value: number, round: boolean = false): number {
  if (value === 0) return 0;

  const exponent = Math.floor(Math.log10(value));
  const fraction = value / Math.pow(10, exponent);

  let niceFraction: number;
  if (round) {
    // Round to nearest nice number
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    // Ceiling to next nice number
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }

  return niceFraction * Math.pow(10, exponent);
}

/**
 * Calculate nice tick values for an axis range.
 * Uses the nice number algorithm to produce clean, readable tick values.
 *
 * @param min Minimum value
 * @param max Maximum value
 * @param targetCount Approximate number of ticks desired (default: 5)
 * @returns Array of tick values
 */
export function calculateNiceTicks(min: number, max: number, targetCount: number = 5): number[] {
  if (min >= max) return [min];
  if (targetCount < 1) targetCount = 1;

  const range = max - min;
  const roughInterval = range / targetCount;
  const niceInterval = niceNumber(roughInterval, true);

  // Round min down and max up to nice interval multiples
  const niceMin = Math.floor(min / niceInterval) * niceInterval;
  const niceMax = Math.ceil(max / niceInterval) * niceInterval;

  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + niceInterval * 0.5; v += niceInterval) {
    // Round to avoid floating point precision issues
    const roundedV = Math.round(v / niceInterval) * niceInterval;
    if (roundedV >= min && roundedV <= max) {
      ticks.push(roundedV);
    }
  }

  // Ensure we have at least the endpoints
  if (ticks.length === 0) {
    return [min, max];
  }

  return ticks;
}

/**
 * Calculate tick values using a specific interval.
 *
 * @param min Minimum value
 * @param max Maximum value
 * @param interval Exact interval between ticks
 * @returns Array of tick values at the specified interval
 */
export function calculateTicksByInterval(min: number, max: number, interval: number): number[] {
  if (interval <= 0 || min >= max) return [min];

  // Start at a nice multiple of the interval at or below min
  const startValue = Math.floor(min / interval) * interval;

  const ticks: number[] = [];
  for (let v = startValue; v <= max + interval * 0.001; v += interval) {
    // Round to avoid floating point precision issues
    const roundedV = Math.round(v / interval) * interval;
    if (roundedV >= min && roundedV <= max) {
      ticks.push(roundedV);
    }
  }

  // Ensure we have at least one tick
  if (ticks.length === 0) {
    return [min];
  }

  return ticks;
}

/**
 * Calculate tick values based on tick configuration.
 * Priority: tick-values > tick-interval > tick-count > default (5 divisions)
 *
 * @param min Minimum value
 * @param max Maximum value
 * @param config Optional tick configuration
 * @returns Array of tick values
 */
export function calculateTicks(
  min: number,
  max: number,
  config?: TickConfig
): number[] {
  // Priority 1: Explicit tick values
  if (config?.values && config.values.length > 0) {
    // Filter to only values within range and sort
    return config.values
      .filter(v => v >= min && v <= max)
      .sort((a, b) => a - b);
  }

  // Priority 2: Exact interval
  if (config?.interval !== undefined && config.interval > 0) {
    return calculateTicksByInterval(min, max, config.interval);
  }

  // Priority 3: Tick count (or default to 5)
  const count = config?.count ?? 5;
  return calculateNiceTicks(min, max, count);
}

// ============================================================================
// Label Layout Calculations
// ============================================================================

/**
 * Calculate the minimum number of lines needed to prevent label overlap.
 * Used for label-lines="auto" calculation.
 *
 * @param labelCount Number of labels
 * @param maxLabelWidth Width of the widest label in pixels
 * @param chartWidth Available width for labels in pixels
 * @param maxLines Maximum lines allowed (default: 4)
 * @returns Number of lines needed (1 to maxLines)
 */
export function calculateLabelLines(
  labelCount: number,
  maxLabelWidth: number,
  chartWidth: number,
  maxLines = 4
): number {
  if (labelCount === 0) return 1;

  const spacePerLabel = chartWidth / labelCount;
  const linesNeeded = Math.ceil(maxLabelWidth / spacePerLabel);

  return Math.max(1, Math.min(linesNeeded, maxLines));
}

/**
 * Calculate the interval for showing labels to prevent overlap.
 * Used for label-interval="auto" calculation.
 *
 * @param labelCount Number of labels
 * @param maxLabelWidth Width of the widest label in pixels
 * @param chartWidth Available width for labels in pixels
 * @param minGap Minimum gap between labels in pixels (default: 8)
 * @returns Interval value (show every nth label)
 */
export function calculateLabelInterval(
  labelCount: number,
  maxLabelWidth: number,
  chartWidth: number,
  minGap = 8
): number {
  if (labelCount === 0) return 1;

  const spacePerLabel = chartWidth / labelCount;
  const requiredSpace = maxLabelWidth + minGap;
  const interval = Math.ceil(requiredSpace / spacePerLabel);

  return Math.max(1, interval);
}

// ============================================================================
// Label Placement
// ============================================================================

/** What to do when value labels will not all fit. */
export type LabelCollisionMode = 'hide' | 'clamp' | 'show';

/** A label the caller wants drawn, in viewBox units. */
export interface LabelCandidate {
  /** Anchor point, as it would be written to the `x` attribute */
  x: number;
  /** Text baseline, as it would be written to the `y` attribute */
  y: number;
  /** Measured text width */
  width: number;
  /** Nominal font size */
  fontSize: number;
  /** SVG text-anchor: 'start', 'middle' or 'end' */
  anchor: string;
}

/** What the caller should do with each candidate. */
export interface LabelPlacement {
  /** Horizontal shift that keeps the label inside the plot */
  dx: number;
  /** Whether to draw it at all */
  visible: boolean;
}

/** An axis-aligned box, in viewBox units. */
export interface LabelRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * The box a label occupies.
 *
 * The vertical extent is taken from the font size around the baseline — roughly
 * cap height above and descender below. That is an approximation, and a
 * deliberate one: the exact extent needs a rendered glyph, and this has to run
 * during layout.
 */
export function labelRect(label: LabelCandidate): LabelRect {
  const left =
    label.anchor === 'start' ? label.x :
    label.anchor === 'end' ? label.x - label.width :
    label.x - label.width / 2;

  return {
    left,
    right: left + label.width,
    top: label.y - label.fontSize * 0.8,
    bottom: label.y + label.fontSize * 0.2
  };
}

function overlaps(a: LabelRect, b: LabelRect, gap: number): boolean {
  return (
    a.left < b.right + gap &&
    b.left < a.right + gap &&
    a.top < b.bottom + gap &&
    b.top < a.bottom + gap
  );
}

/**
 * Decide where each value label goes, and which ones to drop.
 *
 * Two steps, in order, because they solve different problems and the first
 * loses no information:
 *
 * 1. **Clamp** a label back inside the plot. The first and last points of a
 *    line sit on the plot edges, so their centred labels hang over the axis
 *    gutter and land on the tick labels there — on `line-basic`, four of ten
 *    labels did. A horizontal shift keeps the label at the same height, so it
 *    still reads as belonging to its datapoint; a vertical shift would move it
 *    off its own row, which is why this only ever moves sideways.
 *
 * 2. **Hide** what still overlaps something already placed. Greedy, in the
 *    order given, which for `<dc-chart>` is document order: bars, then areas,
 *    then bubbles, then lines. Predictable beats clever here — a reader who
 *    reorders their markup can see why the outcome changed.
 *
 * @param labels Candidates, in the order they should be considered
 * @param plot The plot area labels should stay within
 * @param mode `hide` does both steps, `clamp` only the first, `show` neither
 * @param gap Minimum clear space between two labels
 */
export function placeLabels(
  labels: LabelCandidate[],
  plot: LabelRect,
  mode: LabelCollisionMode = 'hide',
  gap = 2
): LabelPlacement[] {
  if (mode === 'show') return labels.map(() => ({ dx: 0, visible: true }));

  const placed: LabelRect[] = [];

  return labels.map(label => {
    const rect = labelRect(label);

    // A label wider than the plot cannot be brought inside, and shifting it
    // would only trade one overhang for another.
    let dx = 0;
    if (rect.right - rect.left <= plot.right - plot.left) {
      if (rect.left < plot.left) dx = plot.left - rect.left;
      else if (rect.right > plot.right) dx = plot.right - rect.right;
    }

    if (mode === 'clamp') return { dx, visible: true };

    const shifted: LabelRect = { ...rect, left: rect.left + dx, right: rect.right + dx };
    if (placed.some(other => overlaps(shifted, other, gap))) {
      return { dx, visible: false };
    }

    placed.push(shifted);
    return { dx, visible: true };
  });
}

/**
 * Horizontal space one category label needs, given a tilt.
 *
 * Unrotated, a label needs its whole width. Tilted, neighbours slide past each
 * other and what has to clear is the perpendicular gap between baselines —
 * `height / sin(theta)` — so the space needed collapses as the angle steepens:
 * a 45-degree tilt costs about 1.4 line-heights per label regardless of how
 * long the text is. That is the whole reason to rotate.
 *
 * The width still bounds it: rotating cannot make a label need *more* room than
 * standing it upright would.
 *
 * @param width Measured text width
 * @param height Line height, near enough the font size
 * @param degrees Tilt, 0 for upright
 */
export function rotatedLabelFootprint(width: number, height: number, degrees: number): number {
  const angle = Math.abs(degrees) % 180;
  if (angle === 0) return width;

  const radians = (angle * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  // Exactly vertical: labels need only their own height side to side.
  if (sin < 1e-9) return width;

  return Math.min(width, height / sin);
}

/**
 * Vertical space a tilted label occupies below its axis.
 *
 * The bounding box of a rotated rectangle: `w*sin + h*cos`. At 0 degrees that
 * is just the line height, which is what the unrotated path already reserves.
 */
export function rotatedLabelHeight(width: number, height: number, degrees: number): number {
  const radians = (Math.abs(degrees) % 180 * Math.PI) / 180;
  return Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
}

// ============================================================================
// Popup Position Calculations
// ============================================================================

/**
 * Shape bounds in viewBox coordinates.
 */
export interface ShapeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Rectangle dimensions from getBoundingClientRect().
 */
export interface ClientRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Calculate popup screen position from shape bounds.
 * Converts viewBox coordinates to screen coordinates.
 *
 * @param bounds Shape bounds in viewBox coordinates
 * @param chartRect Chart element's bounding client rect
 * @param svgRect SVG element's bounding client rect
 * @param viewBoxWidth Chart viewBox width
 * @param viewBoxHeight Chart viewBox height
 * @returns Screen coordinates {x, y} for popup positioning
 */
export function calculatePopupPosition(
  bounds: ShapeBounds,
  chartRect: ClientRect,
  svgRect: ClientRect,
  viewBoxWidth: number,
  viewBoxHeight: number
): { x: number; y: number } {
  const scaleX = svgRect.width / viewBoxWidth;
  const scaleY = svgRect.height / viewBoxHeight;

  return {
    x: chartRect.left + (bounds.x + bounds.width / 2) * scaleX,
    y: chartRect.top + bounds.y * scaleY
  };
}

/**
 * Helper to show popup at shape bounds if content is provided.
 * This is a convenience function that handles the common popup positioning pattern.
 *
 * @param content Popup content (null/undefined = don't show)
 * @param bounds Shape bounds (null = can't position)
 * @param getChartRect Function to get chart bounding rect
 * @param getSvgRect Function to get SVG bounding rect (returns null if no SVG)
 * @param viewBoxDimensions Chart viewBox dimensions
 * @param showPopup Function to actually show the popup
 * @returns true if popup was shown, false otherwise
 */
export function showPopupAtBounds(
  content: string | null | undefined,
  bounds: ShapeBounds | null,
  getChartRect: () => ClientRect,
  getSvgRect: () => ClientRect | null,
  viewBoxDimensions: { width: number; height: number },
  showPopup: (content: string, x: number, y: number) => void
): boolean {
  if (!content || !bounds) return false;

  const svgRect = getSvgRect();
  if (!svgRect) return false;

  const chartRect = getChartRect();
  const pos = calculatePopupPosition(
    bounds,
    chartRect,
    svgRect,
    viewBoxDimensions.width,
    viewBoxDimensions.height
  );

  showPopup(content, pos.x, pos.y);
  return true;
}
