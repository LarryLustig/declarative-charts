/**
 * Pure utility functions for chart calculations.
 * These functions have no DOM dependencies and are easily testable.
 */

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
