import { svg, SVGTemplateResult } from 'lit';
import { BaseChart } from './base-chart.js';
import type { ChartAxis, AxisPosition } from './chart-axis.js';

/**
 * Represents a value range for axis scaling, including information about
 * where the zero line falls when the range spans both positive and negative values.
 */
export interface ValueRange {
  /** Minimum value (may be negative) */
  min: number;
  /** Maximum value */
  max: number;
  /** Position of zero line as fraction from top (0 = top, 1 = bottom), or null if zero not in range */
  zeroPosition: number | null;
  /** Whether the range includes negative values */
  hasNegatives: boolean;
  /** Whether the range includes positive values */
  hasPositives: boolean;
}

/**
 * Configuration for an axis, either from a dc-axis element or defaults.
 */
export interface AxisConfig {
  /** The axis position */
  position: AxisPosition;
  /** Label interval value ('auto' or number) */
  labelInterval: number | 'auto';
  /** Label lines value ('auto' or number) */
  labelLines: number | 'auto';
  /** Axis title text, if any */
  title?: string;
  /** SVG style attributes for the title */
  titleStyles?: Record<string, string>;
  /** SVG style attributes for axis labels */
  labelStyles?: Record<string, string>;
  /** The dc-axis element, if present */
  element?: ChartAxis;
}

/**
 * Abstract base class for charts with axes (bar charts, line charts, etc.)
 * Provides common axis rendering, grid lines, and axis label padding calculations.
 *
 * ## Axis Configuration
 *
 * Axes can be configured using `<dc-axis>` child elements:
 *
 * ```html
 * <dc-chart>
 *   <dc-axis position="bottom" label-interval="2"></dc-axis>
 *   <dc-axis position="left">
 *     <dc-title>Revenue ($)</dc-title>
 *   </dc-axis>
 *   <dc-bar value="30" label="A"></dc-bar>
 * </dc-chart>
 * ```
 *
 * If no `<dc-axis>` elements are present, sensible defaults are used.
 *
 * @abstract
 */
export abstract class AxisChart extends BaseChart {
  /**
   * Number of grid line steps/divisions on the value axis.
   * Controls how many horizontal (vertical charts) or vertical (horizontal charts) grid lines are drawn.
   */
  protected readonly gridSteps = 5;

  /**
   * Get the maximum value from the chart's data.
   * Used for scaling the value axis.
   * @returns The maximum data value, minimum of 1 to avoid division by zero
   */
  protected abstract getMaxValue(): number;

  /**
   * Get the minimum value from the chart's data.
   * Used for scaling the value axis when negative values are present.
   * @returns The minimum data value (may be negative, or 0 if all values are positive)
   */
  protected abstract getMinValue(): number;

  /**
   * Get all values from the chart's data.
   * Used for calculating totals and percentages.
   * @returns Array of all data values
   */
  protected abstract getAllValues(): number[];

  /**
   * Get labels for the category axis (X-axis for vertical charts, Y-axis for horizontal).
   * @returns Array of label strings
   */
  protected abstract getCategoryLabels(): string[];

  /**
   * Get the chart's orientation for axis mapping.
   * Override in subclasses that support multiple orientations.
   * @returns 'vertical' or 'horizontal'
   */
  protected getChartOrientation(): 'vertical' | 'horizontal' {
    return 'vertical';
  }

  // ============================================================================
  // Axis Configuration
  // ============================================================================

  /**
   * Get all dc-axis elements that are direct children of this chart.
   * @returns Array of ChartAxis elements
   */
  protected getAxisElements(): ChartAxis[] {
    const elements = this.querySelectorAll(':scope > dc-axis');
    return Array.from(elements) as ChartAxis[];
  }

  /**
   * Get the dc-axis element for a specific position.
   * Supports both positional names (left, right, top, bottom) and
   * traditional names (x, y) which are mapped based on chart orientation.
   *
   * @param position The axis position to find
   * @returns The ChartAxis element or null if not found
   */
  protected getAxisElement(position: AxisPosition): ChartAxis | null {
    const orientation = this.getChartOrientation();
    const axes = this.getAxisElements();

    for (const axis of axes) {
      const resolvedPosition = axis.getResolvedPosition(orientation);
      if (resolvedPosition === position) {
        return axis;
      }
    }

    return null;
  }

  /**
   * Get configuration for a specific axis position.
   * Returns configuration from dc-axis element if present, otherwise defaults.
   *
   * @param position The axis position
   * @returns AxisConfig object with all configuration values
   */
  protected getAxisConfig(position: AxisPosition): AxisConfig {
    const axisElement = this.getAxisElement(position);

    if (axisElement) {
      const titleInfo = axisElement.getTitleInfo();
      return {
        position,
        labelInterval: axisElement.getLabelIntervalValue(),
        labelLines: axisElement.getLabelLinesValue(),
        title: titleInfo?.text,
        titleStyles: titleInfo?.svgStyles,
        labelStyles: axisElement.getSvgStyleAttributes(),
        element: axisElement,
      };
    }

    // Default configuration when no dc-axis element is present
    return {
      position,
      labelInterval: 'auto',
      labelLines: 1,
    };
  }

  /**
   * Get the category axis position based on chart orientation.
   * @returns The position where category labels appear
   */
  protected getCategoryAxisPosition(): AxisPosition {
    const orientation = this.getChartOrientation();
    return orientation === 'horizontal' ? 'left' : 'bottom';
  }

  /**
   * Get the value axis position based on chart orientation.
   * @returns The position where value labels appear
   */
  protected getValueAxisPosition(): AxisPosition {
    const orientation = this.getChartOrientation();
    return orientation === 'horizontal' ? 'bottom' : 'left';
  }

  /**
   * Log style warnings from all dc-axis elements.
   * Called during render to notify users of potential issues.
   */
  protected logAxisStyleWarnings(): void {
    const axes = this.getAxisElements();
    for (const axis of axes) {
      const warnings = axis.getStyleWarnings();
      for (const warning of warnings) {
        console.warn(warning.message);
      }
    }
  }

  // ============================================================================
  // Nice Numbers for Value Axis
  // ============================================================================

  /**
   * Calculate a "nice" number for axis scaling.
   * Nice numbers are 1, 2, 5, or 10 multiplied by a power of 10.
   * @param value The raw value to round
   * @param round If true, round to nearest nice number; if false, ceiling
   * @returns A nice number >= value (or nearest if round=true)
   */
  protected niceNumber(value: number, round: boolean = false): number {
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
   * Get a "nice" maximum value for the value axis.
   * Rounds the actual max up to a nice number that divides evenly by gridSteps.
   * @returns A nice maximum value for axis labels
   */
  protected getNiceMax(): number {
    const rawMax = this.getMaxValue();
    if (rawMax <= 0) return 1;

    // Calculate the range we need to cover
    const range = this.niceNumber(rawMax, false);

    // Calculate nice tick spacing
    const tickSpacing = this.niceNumber(range / this.gridSteps, true);

    // Calculate nice max that's a multiple of tick spacing
    const niceMax = Math.ceil(rawMax / tickSpacing) * tickSpacing;

    this.log('info', 'valueAxis.rawMax', `Raw maximum data value`, rawMax);
    this.log('info', 'valueAxis.tickSpacing', `Nice tick spacing: niceNumber(${(rawMax / this.gridSteps).toFixed(1)}) = ${tickSpacing}`, tickSpacing);
    this.log('info', 'valueAxis.niceMax', `Nice maximum: ceil(${rawMax}/${tickSpacing}) × ${tickSpacing} = ${niceMax}`, niceMax);

    return niceMax;
  }

  /**
   * Get a "nice" value range for the value axis, handling both positive and negative values.
   * Returns min/max bounds that create clean tick intervals, plus information about
   * the zero line position for charts with mixed positive/negative data.
   *
   * @returns ValueRange with nice bounds and zero line position info
   */
  protected getNiceRange(): ValueRange {
    const rawMax = this.getMaxValue();
    const rawMin = this.getMinValue();

    this.log('info', 'valueAxis.rawRange', `Raw data range: [${rawMin}, ${rawMax}]`, { min: rawMin, max: rawMax });

    // Case 1: All positive (or zero) - use existing behavior
    if (rawMin >= 0) {
      const niceMax = this.getNiceMax();
      this.log('info', 'valueAxis.range', `All positive: range [0, ${niceMax}], zero at bottom`, { min: 0, max: niceMax });
      return {
        min: 0,
        max: niceMax,
        zeroPosition: 1, // Zero at bottom (fraction = 1)
        hasNegatives: false,
        hasPositives: rawMax > 0
      };
    }

    // Case 2: All negative
    if (rawMax <= 0) {
      // Calculate nice minimum (negative value)
      const absMin = Math.abs(rawMin);
      const range = this.niceNumber(absMin, false);
      const tickSpacing = this.niceNumber(range / this.gridSteps, true);
      const niceAbsMin = Math.ceil(absMin / tickSpacing) * tickSpacing;

      this.log('info', 'valueAxis.range', `All negative: range [${-niceAbsMin}, 0], zero at top`, { min: -niceAbsMin, max: 0 });
      return {
        min: -niceAbsMin,
        max: 0,
        zeroPosition: 0, // Zero at top (fraction = 0)
        hasNegatives: true,
        hasPositives: false
      };
    }

    // Case 3: Mixed positive and negative
    // Calculate tick spacing based on the larger absolute value to get consistent intervals
    const maxAbsValue = Math.max(rawMax, Math.abs(rawMin));
    const tickSpacing = this.niceNumber(maxAbsValue / this.gridSteps, true);

    // Round max up and min down to tick spacing multiples
    const niceMax = Math.ceil(rawMax / tickSpacing) * tickSpacing;
    const niceMin = Math.floor(rawMin / tickSpacing) * tickSpacing;

    const totalRange = niceMax - niceMin;
    // Zero position: how far from the top is zero? (as fraction 0-1)
    // zeroPosition = niceMax / totalRange
    const zeroPosition = niceMax / totalRange;

    this.log('info', 'valueAxis.tickSpacing', `Mixed range tick spacing`, tickSpacing);
    this.log('info', 'valueAxis.range', `Mixed: range [${niceMin}, ${niceMax}], zero at ${(zeroPosition * 100).toFixed(0)}% from top`, {
      min: niceMin,
      max: niceMax,
      zeroPosition
    });

    return {
      min: niceMin,
      max: niceMax,
      zeroPosition,
      hasNegatives: true,
      hasPositives: true
    };
  }

  // ============================================================================
  // End Nice Numbers for Value Axis
  // ============================================================================

  // ============================================================================
  // Label Lines and Label Interval Helper Methods
  // ============================================================================

  /**
   * Get the effective number of label lines for the category axis.
   * Checks dc-axis configuration first, then calculates auto if needed.
   * @returns Number of lines to use for category labels (1 = single line)
   */
  protected getLabelLinesCount(): number {
    const categoryAxisPosition = this.getCategoryAxisPosition();
    const config = this.getAxisConfig(categoryAxisPosition);

    if (config.labelLines === 'auto') {
      return this.calculateAutoLabelLines();
    }

    const lines = typeof config.labelLines === 'number' ? config.labelLines : 1;
    this.log('info', 'labels.lines', `Using ${lines} label line(s)`, lines);
    return lines;
  }

  /**
   * Get the effective label interval for the category axis.
   * Checks dc-axis configuration first, then calculates auto if needed.
   * @returns Interval for showing labels (1 = show all, 2 = every other, etc.)
   */
  protected getLabelIntervalValue(): number {
    const categoryAxisPosition = this.getCategoryAxisPosition();
    const config = this.getAxisConfig(categoryAxisPosition);

    if (config.labelInterval === 'auto') {
      return this.calculateAutoLabelInterval();
    }

    const interval = typeof config.labelInterval === 'number' ? config.labelInterval : 1;
    this.log('info', 'labels.interval', `Showing every ${interval === 1 ? '' : interval + 'th '}label`, interval);
    return interval;
  }

  /**
   * Calculate the minimum number of lines needed to prevent label overlap.
   * Used when label-lines="auto".
   * @returns Number of lines needed (capped at 4)
   */
  protected calculateAutoLabelLines(): number {
    const labels = this.getCategoryLabels();
    if (labels.length === 0) return 1;

    // Measure widest label
    const maxLabelWidth = Math.max(...labels.map(l => this.measureText(l, 12)));

    // Calculate available space per label (approximate)
    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;
    const spacePerLabel = chartWidth / labels.length;

    // How many lines needed?
    const linesNeeded = Math.ceil(maxLabelWidth / spacePerLabel);
    const lines = Math.max(1, Math.min(linesNeeded, 4)); // Cap at 4 lines

    this.log('info', 'labels.lines', `Auto: maxLabelWidth=${maxLabelWidth.toFixed(1)}, spacePerLabel=${spacePerLabel.toFixed(1)} → ${lines} line(s)`, lines);
    return lines;
  }

  /**
   * Calculate interval to prevent label overlap when using single line.
   * Used when label-interval="auto".
   * @returns Interval for showing labels
   */
  protected calculateAutoLabelInterval(): number {
    const labels = this.getCategoryLabels();
    if (labels.length === 0) return 1;

    // Measure widest label
    const maxLabelWidth = Math.max(...labels.map(l => this.measureText(l, 12)));

    // Calculate available space per label
    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;
    const spacePerLabel = chartWidth / labels.length;

    // Add minimum gap between labels (8px)
    const minGap = 8;
    const requiredSpace = maxLabelWidth + minGap;

    // Calculate interval
    const interval = Math.ceil(requiredSpace / spacePerLabel);
    const result = Math.max(1, interval);

    this.log('info', 'labels.interval', `Auto: maxLabelWidth=${maxLabelWidth.toFixed(1)} + gap=${minGap} = ${requiredSpace.toFixed(1)}, spacePerLabel=${spacePerLabel.toFixed(1)} → interval=${result}`, result);
    return result;
  }

  /**
   * Check if a label at given index should be shown based on interval.
   * Always shows first label. Shows last label only if it won't overlap
   * with the previous shown label.
   * @param index The label index
   * @param totalLabels Total number of labels
   * @returns True if the label should be rendered
   */
  protected shouldShowLabel(index: number, totalLabels: number): boolean {
    const interval = this.getLabelIntervalValue();
    if (interval <= 1) return true;

    // Always show first label
    if (index === 0) return true;

    // For the last label, check if it would be too close to the previous shown label
    if (index === totalLabels - 1) {
      // Find the index of the last label that would be shown by interval
      const lastShownByInterval = Math.floor((totalLabels - 2) / interval) * interval;
      // Gap between last shown label and final label
      const gapToEnd = index - lastShownByInterval;
      // Only show last label if gap is at least half the interval (to avoid overlap)
      return gapToEnd >= interval;
    }

    // Show based on interval
    return index % interval === 0;
  }

  /**
   * Get the Y offset (or X offset for horizontal) for a label based on its line assignment.
   * Labels are distributed across lines in round-robin fashion.
   * @param index The label index
   * @param baseLineHeight Height/width per line (default 18px for vertical text stacking)
   * @returns Offset in pixels
   */
  protected getLabelLineOffset(index: number, baseLineHeight: number = 18): number {
    const lines = this.getLabelLinesCount();
    if (lines <= 1) return 0;

    const lineIndex = index % lines;
    return lineIndex * baseLineHeight;
  }

  // ============================================================================
  // End Label Lines and Label Interval Helper Methods
  // ============================================================================

  // ============================================================================
  // Axis Title Rendering
  // ============================================================================

  /**
   * Get axis title dimensions for a specific position.
   * Used for padding calculations.
   *
   * @param position The axis position
   * @returns Object with width, height, and title text, or null if no title
   */
  protected getAxisTitleDimensions(position: AxisPosition): { width: number; height: number; text: string } | null {
    const config = this.getAxisConfig(position);
    if (!config.title) return null;

    const fontSize = config.titleStyles?.['font-size']
      ? parseFloat(config.titleStyles['font-size'])
      : 14;

    const textWidth = this.measureText(config.title, fontSize);
    const textHeight = fontSize * 1.2;

    // For left/right axes, title is rotated 90 degrees
    if (position === 'left' || position === 'right') {
      return {
        width: textHeight + 10, // Height becomes width when rotated, plus margin
        height: textWidth,
        text: config.title,
      };
    }

    // For top/bottom axes
    return {
      width: textWidth,
      height: textHeight + 10, // Plus margin
      text: config.title,
    };
  }

  /**
   * Render an axis title at the specified position.
   * The title is positioned within the padding area, after axis labels.
   *
   * @param position The axis position
   * @param padding Chart padding values
   * @param chartWidth Width of the chart content area
   * @param chartHeight Height of the chart content area
   * @returns SVG template result for the axis title, or empty
   */
  protected renderAxisTitle(
    position: AxisPosition,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number
  ): SVGTemplateResult {
    const config = this.getAxisConfig(position);
    if (!config.title) return svg``;

    const fontSize = config.titleStyles?.['font-size'] || '14';
    const fill = config.titleStyles?.fill || '#333';
    const fontFamily = config.titleStyles?.['font-family'] || '';
    const fontWeight = config.titleStyles?.['font-weight'] || 'normal';
    const fontSizeNum = parseFloat(String(fontSize));

    // Calculate center position for the axis
    const centerX = padding.left + chartWidth / 2;
    const centerY = padding.top + chartHeight / 2;

    // Margin between axis labels and axis title
    const titleMargin = 8;

    switch (position) {
      case 'left': {
        // Rotated text on the left side, positioned near the left edge of the SVG
        // Position is: edge margin + half the font size (since rotated text is centered)
        const x = titleMargin + fontSizeNum / 2;
        return svg`
          <text
            x="${x}"
            y="${centerY}"
            text-anchor="middle"
            font-size="${fontSize}"
            font-family="${fontFamily}"
            font-weight="${fontWeight}"
            fill="${fill}"
            transform="rotate(-90, ${x}, ${centerY})"
          >
            ${config.title}
          </text>
        `;
      }

      case 'right': {
        // Rotated text on the right side
        const x = this.width - titleMargin - fontSizeNum / 2;
        return svg`
          <text
            x="${x}"
            y="${centerY}"
            text-anchor="middle"
            font-size="${fontSize}"
            font-family="${fontFamily}"
            font-weight="${fontWeight}"
            fill="${fill}"
            transform="rotate(90, ${x}, ${centerY})"
          >
            ${config.title}
          </text>
        `;
      }

      case 'top': {
        // Horizontal text at the top
        const y = titleMargin + fontSizeNum;
        return svg`
          <text
            x="${centerX}"
            y="${y}"
            text-anchor="middle"
            font-size="${fontSize}"
            font-family="${fontFamily}"
            font-weight="${fontWeight}"
            fill="${fill}"
          >
            ${config.title}
          </text>
        `;
      }

      case 'bottom': {
        // Horizontal text at the bottom
        // Position near the bottom edge, with some margin
        const y = this.height - titleMargin;
        return svg`
          <text
            x="${centerX}"
            y="${y}"
            text-anchor="middle"
            font-size="${fontSize}"
            font-family="${fontFamily}"
            font-weight="${fontWeight}"
            fill="${fill}"
          >
            ${config.title}
          </text>
        `;
      }

      default:
        return svg``;
    }
  }

  // ============================================================================
  // End Axis Title Rendering
  // ============================================================================

  /**
   * Get additional padding needed for axis labels and value labels.
   * Override this in chart subclasses to account for label dimensions.
   *
   * Default implementation provides reasonable estimates for typical axis-based charts.
   * Subclasses should override for more accurate calculations based on actual data.
   *
   * @returns Object with additional padding needed for each side
   */
  protected override getAxisLabelPadding(): { top: number; right: number; bottom: number; left: number } {
    const range = this.getNiceRange();
    // Measure both min and max formatted strings to find the widest
    const maxValueStr = this.formatValue(range.max);
    const minValueStr = this.formatValue(range.min);
    const maxValueWidth = Math.max(
      this.measureText(maxValueStr, 11),
      this.measureText(minValueStr, 11)
    ) + 15; // 11px font + margin

    // Height for axis labels
    const labelHeight = 25;
    const valueLabelHeight = 25;

    // Check for axis titles and add space for them
    const leftAxisTitle = this.getAxisTitleDimensions('left');
    const bottomAxisTitle = this.getAxisTitleDimensions('bottom');
    const rightAxisTitle = this.getAxisTitleDimensions('right');
    const topAxisTitle = this.getAxisTitleDimensions('top');

    // Default: vertical orientation (assumes Y-axis labels on left, X-axis labels at bottom)
    // Subclasses should override for more specific calculations based on orientation and data
    const padding = {
      top: valueLabelHeight + (topAxisTitle?.height || 0),
      right: (rightAxisTitle?.width || 0),
      bottom: labelHeight + (bottomAxisTitle?.height || 0),
      left: maxValueWidth + (leftAxisTitle?.width || 0)
    };

    this.log('info', 'axisLabelPadding.top', `Space for value labels above bars${topAxisTitle ? ` + axis title "${topAxisTitle.text}"` : ''}`, padding.top);
    this.log('info', 'axisLabelPadding.left', `Y-axis label width: measureText("${maxValueStr}") + margin = ${maxValueWidth.toFixed(1)}${leftAxisTitle ? ` + axis title "${leftAxisTitle.text}" (${leftAxisTitle.width.toFixed(1)})` : ''}`, padding.left);
    this.log('info', 'axisLabelPadding.bottom', `X-axis label height${bottomAxisTitle ? ` + axis title "${bottomAxisTitle.text}"` : ''}`, padding.bottom);
    if (rightAxisTitle) {
      this.log('info', 'axisLabelPadding.right', `Right axis title "${rightAxisTitle.text}"`, padding.right);
    }

    return padding;
  }

  /**
   * Render horizontal grid lines for vertical charts or vertical grid lines for horizontal charts.
   * Supports negative value ranges and renders zero line with distinct styling when applicable.
   *
   * @param padding Chart padding values
   * @param chartWidth Width of the chart content area
   * @param chartHeight Height of the chart content area
   * @param range Value range (min, max) for scaling, or just max for backward compatibility
   * @param orientation 'vertical' for horizontal grid lines, 'horizontal' for vertical grid lines
   * @returns SVG template result for grid lines
   */
  protected renderGridLines(
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange | number,
    orientation: 'vertical' | 'horizontal' = 'vertical'
  ): SVGTemplateResult {
    // Support both ValueRange and legacy number (max) parameter
    const valueRange: ValueRange = typeof range === 'number'
      ? { min: 0, max: range, zeroPosition: 1, hasNegatives: false, hasPositives: true }
      : range;

    const { min, max, hasNegatives, hasPositives } = valueRange;
    const totalRange = max - min;

    // Generate tick values from min to max
    const tickValues: number[] = [];
    for (let i = 0; i <= this.gridSteps; i++) {
      tickValues.push(min + (totalRange / this.gridSteps) * i);
    }

    // Ensure zero is included when range spans both positive and negative
    if (hasNegatives && hasPositives && !tickValues.some(v => Math.abs(v) < totalRange * 0.0001)) {
      tickValues.push(0);
      tickValues.sort((a, b) => a - b);
    }

    if (orientation === 'vertical') {
      // Horizontal grid lines (for vertical bar/line charts)
      return svg`
        ${tickValues.map(value => {
          const y = this.height - padding.bottom - ((value - min) / totalRange) * chartHeight;
          // Check if this is the zero line (within small tolerance for floating point)
          const isZeroLine = Math.abs(value) < totalRange * 0.0001 && hasNegatives && hasPositives;
          return svg`
            <line
              x1="${padding.left}"
              y1="${y}"
              x2="${this.width - padding.right}"
              y2="${y}"
              stroke="${isZeroLine ? '#666' : '#ddd'}"
              stroke-width="${isZeroLine ? 1.5 : 1}"
            />
          `;
        })}
      `;
    } else {
      // Vertical grid lines (for horizontal bar charts)
      return svg`
        ${tickValues.map(value => {
          const x = padding.left + ((value - min) / totalRange) * chartWidth;
          // Check if this is the zero line
          const isZeroLine = Math.abs(value) < totalRange * 0.0001 && hasNegatives && hasPositives;
          return svg`
            <line
              x1="${x}"
              y1="${padding.top}"
              x2="${x}"
              y2="${this.height - padding.bottom}"
              stroke="${isZeroLine ? '#666' : '#ddd'}"
              stroke-width="${isZeroLine ? 1.5 : 1}"
            />
          `;
        })}
      `;
    }
  }

  /**
   * Stroke width for axis lines.
   * Used to calculate the extension needed at axis intersections to eliminate notches.
   */
  protected readonly axisStrokeWidth = 2;

  /**
   * Render the X and Y axes lines.
   *
   * @param padding Chart padding values
   * @param orientation 'vertical' for standard axes, 'horizontal' for swapped axes
   * @param reverse If true, adjusts axis positions for reverse orientations
   * @param range Optional value range - when all-negative, category axis moves to zero line
   * @returns SVG template result for axes
   */
  protected renderAxes(
    padding: { top: number; right: number; bottom: number; left: number },
    orientation: 'vertical' | 'horizontal' = 'vertical',
    reverse = false,
    range?: ValueRange
  ): SVGTemplateResult {
    // For all-negative vertical charts, position the category axis at top (where zero is)
    const allNegative = range && !range.hasPositives;
    const categoryAxisAtTop = orientation === 'vertical' && !reverse && allNegative;
    const strokeWidth = this.axisStrokeWidth;
    // Extend axes by half the stroke width at intersection to eliminate notch
    const extend = strokeWidth / 2;

    if (orientation === 'vertical') {
      if (reverse) {
        // Vertical-reverse: Y-axis on left, X-axis at top
        return svg`
          <line
            x1="${padding.left}"
            y1="${padding.top - extend}"
            x2="${padding.left}"
            y2="${this.height - padding.bottom}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
          <line
            x1="${padding.left - extend}"
            y1="${padding.top}"
            x2="${this.width - padding.right}"
            y2="${padding.top}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
        `;
      } else if (categoryAxisAtTop) {
        // All-negative vertical: Y-axis on left (full height), X-axis at top (where zero is)
        return svg`
          <line
            x1="${padding.left}"
            y1="${padding.top - extend}"
            x2="${padding.left}"
            y2="${this.height - padding.bottom}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
          <line
            x1="${padding.left - extend}"
            y1="${padding.top}"
            x2="${this.width - padding.right}"
            y2="${padding.top}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
        `;
      } else {
        // Standard vertical: Y-axis on left, X-axis at bottom
        return svg`
          <line
            x1="${padding.left}"
            y1="${padding.top}"
            x2="${padding.left}"
            y2="${this.height - padding.bottom + extend}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
          <line
            x1="${padding.left - extend}"
            y1="${this.height - padding.bottom}"
            x2="${this.width - padding.right}"
            y2="${this.height - padding.bottom}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
        `;
      }
    } else {
      if (reverse) {
        // Horizontal-reverse: Y-axis on right, X-axis at bottom
        return svg`
          <line
            x1="${this.width - padding.right}"
            y1="${padding.top}"
            x2="${this.width - padding.right}"
            y2="${this.height - padding.bottom + extend}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
          <line
            x1="${padding.left}"
            y1="${this.height - padding.bottom}"
            x2="${this.width - padding.right + extend}"
            y2="${this.height - padding.bottom}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
        `;
      } else {
        // Standard horizontal: Y-axis on left, X-axis at bottom
        return svg`
          <line
            x1="${padding.left}"
            y1="${padding.top}"
            x2="${padding.left}"
            y2="${this.height - padding.bottom + extend}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
          <line
            x1="${padding.left - extend}"
            y1="${this.height - padding.bottom}"
            x2="${this.width - padding.right}"
            y2="${this.height - padding.bottom}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
        `;
      }
    }
  }

  /**
   * Render numeric labels along the value axis.
   * Supports negative value ranges.
   *
   * @param padding Chart padding values
   * @param chartWidth Width of the chart content area
   * @param chartHeight Height of the chart content area
   * @param range Value range (min, max) for scaling, or just max for backward compatibility
   * @param orientation 'vertical' for Y-axis labels on left, 'horizontal' for X-axis labels at bottom
   * @param reverse If true, adjusts label positions for reverse orientations
   * @param axisFormat Optional format string for axis labels
   * @returns SVG template result for value axis labels
   */
  protected renderValueAxisLabels(
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange | number,
    orientation: 'vertical' | 'horizontal' = 'vertical',
    reverse = false,
    axisFormat?: string
  ): SVGTemplateResult {
    // Support both ValueRange and legacy number (max) parameter
    const valueRange: ValueRange = typeof range === 'number'
      ? { min: 0, max: range, zeroPosition: 1, hasNegatives: false, hasPositives: true }
      : range;

    const { min, max } = valueRange;
    const totalRange = max - min;

    // Use axis format if provided, otherwise fall back to chart's valueFormat
    const format = axisFormat ?? this.valueFormat;

    // Generate tick values from min to max
    const tickValues: number[] = [];
    for (let i = 0; i <= this.gridSteps; i++) {
      tickValues.push(min + (totalRange / this.gridSteps) * i);
    }

    if (orientation === 'vertical') {
      if (reverse) {
        // Vertical-reverse: values increase downward from top
        return svg`
          ${tickValues.map(value => {
            const y = padding.top + ((value - min) / totalRange) * chartHeight;
            return svg`
              <text
                x="${padding.left - 10}"
                y="${y + 4}"
                text-anchor="end"
                font-size="11"
                fill="#666"
              >
                ${this.formatValue(value, format)}
              </text>
            `;
          })}
        `;
      } else {
        // Standard vertical: values increase upward from bottom
        return svg`
          ${tickValues.map(value => {
            const y = this.height - padding.bottom - ((value - min) / totalRange) * chartHeight;
            return svg`
              <text
                x="${padding.left - 10}"
                y="${y + 4}"
                text-anchor="end"
                font-size="11"
                fill="#666"
              >
                ${this.formatValue(value, format)}
              </text>
            `;
          })}
        `;
      }
    } else {
      if (reverse) {
        // Horizontal-reverse: values increase from right to left
        return svg`
          ${tickValues.map(value => {
            const x = this.width - padding.right - ((value - min) / totalRange) * chartWidth;
            return svg`
              <text
                x="${x}"
                y="${this.height - padding.bottom + 20}"
                text-anchor="middle"
                font-size="11"
                fill="#666"
              >
                ${this.formatValue(value, format)}
              </text>
            `;
          })}
        `;
      } else {
        // Standard horizontal: values increase from left to right
        return svg`
          ${tickValues.map(value => {
            const x = padding.left + ((value - min) / totalRange) * chartWidth;
            return svg`
              <text
                x="${x}"
                y="${this.height - padding.bottom + 20}"
                text-anchor="middle"
                font-size="11"
                fill="#666"
              >
                ${this.formatValue(value, format)}
              </text>
            `;
          })}
        `;
      }
    }
  }
}
