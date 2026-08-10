import { svg, SVGTemplateResult } from 'lit';
import { BaseChart } from './base-chart.js';
import { ErrorCode } from './errors.js';
import type { ChartAxis, AxisPosition, AxisType } from './chart-axis.js';
import type { GridConfig } from './chart-grid.js';
import type { ChartReference } from './chart-reference.js';
import { resolveDasharray } from './chart-fill.js';
import { calculateLabelLines, calculateLabelInterval, calculateTicks,
  niceNumber
} from './chart-utils.js';
import { parseDateLabels, calculateTimeTicks, formatDate, dateToPosition } from './date-utils.js';
import type { ParsedDates } from './date-utils.js';

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
 * A resolved `<dc-reference>`: a line, a band, or both.
 *
 * `min`/`max` are already normalised — swapped if given the wrong way round,
 * and left as NaN where the band is half-open, which the renderer reads as
 * "clamp to the edge of the plot".
 */
export interface ReferenceData {
  /** Value axis position of the line, or NaN when this is a band only */
  value: number;
  /** Lower bound of the band, or NaN for open-ended below */
  min: number;
  /** Upper bound of the band, or NaN for open-ended above */
  max: number;
  hasLine: boolean;
  hasBand: boolean;
  label: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray: string;
  fill: string;
  fillOpacity: number;
  labelPosition: string;
  valueFormat?: string;
  element: ChartReference;
}

/**
 * Configuration for tick generation on value/time axes.
 */
export interface TickConfig {
  /** Approximate number of ticks (default: 5) */
  count?: number;
  /** Exact interval between ticks */
  interval?: number;
  /** Explicit tick values */
  values?: number[];
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

  // === Phase 1: Value Axis Controls ===

  /** Axis type (value, label, or time) - inferred if not specified */
  type: AxisType;
  /** Minimum axis value (undefined = auto-calculate from data) */
  minValue?: number | 'auto';
  /** Maximum axis value (undefined = auto-calculate from data) */
  maxValue?: number | 'auto';
  /** Range padding as decimal (e.g., 0.1 = 10%) */
  rangePadding?: number;
  /** Tick configuration */
  ticks?: TickConfig;
  /** Value format for axis labels */
  valueFormat?: string;

  // === Phase 2: Grid Styling ===

  /** Grid configuration from dc-grid element, if present */
  grid?: GridConfig;

  // === Phase 3: Time Axis ===

  /** Date parsing format (for time axes) */
  dateFormat?: string;
  /** Date label format (for time axes) */
  dateLabelFormat?: string;
}

/**
 * Time scale data for time-proportional axis positioning.
 */
export interface TimeScale {
  /** Minimum date in the range */
  min: Date;
  /** Maximum date in the range */
  max: Date;
  /** Parsed date for each label (may include invalid dates) */
  dates: Date[];
  /** Indices of valid (parseable) dates */
  validIndices: number[];
  /** Tick dates for axis labels */
  tickDates: Date[];
  /** Format string for tick labels */
  tickFormat: string;
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
    // Infer axis type based on position and orientation
    const inferredType = this.inferAxisType(position);

    if (axisElement) {
      const titleInfo = axisElement.getTitleInfo();
      // Build tick configuration if any tick properties are set
      const tickCount = axisElement.getTickCount();
      const tickInterval = axisElement.getTickInterval();
      const tickValues = axisElement.getTickValues();
      const ticks = (tickCount !== undefined || tickInterval !== undefined || tickValues !== undefined)
        ? { count: tickCount, interval: tickInterval, values: tickValues }
        : undefined;

      return {
        position,
        labelInterval: axisElement.getLabelIntervalValue(),
        labelLines: axisElement.getLabelLinesValue(),
        title: titleInfo?.text,
        titleStyles: titleInfo?.svgStyles,
        labelStyles: axisElement.getSvgStyleAttributes(),
        element: axisElement,
        // Phase 1: Value axis controls
        type: axisElement.getTypeValue() ?? inferredType,
        minValue: axisElement.getMinValue(),
        maxValue: axisElement.getMaxValue(),
        rangePadding: axisElement.getRangePadding(),
        ticks,
        valueFormat: axisElement.valueFormat,
        // Phase 2: Grid styling
        grid: axisElement.getGridConfig() ?? undefined,
        // Phase 3: Time axis
        dateFormat: axisElement.getDateFormat(),
        dateLabelFormat: axisElement.getDateLabelFormat(),
      };
    }

    // Default configuration when no dc-axis element is present
    return {
      position,
      labelInterval: 'auto',
      labelLines: 1,
      type: inferredType,
    };
  }

  /**
   * Infer the axis type based on position and chart orientation.
   * - Vertical charts: left/right = 'value', top/bottom = 'label'
   * - Horizontal charts: left/right = 'label', top/bottom = 'value'
   *
   * @param position The axis position
   * @returns The inferred axis type
   */
  protected inferAxisType(position: AxisPosition): AxisType {
    const orientation = this.getChartOrientation();
    const isVerticalAxis = position === 'left' || position === 'right';

    if (orientation === 'vertical') {
      // Vertical charts: left/right are value axes, top/bottom are label axes
      return isVerticalAxis ? 'value' : 'label';
    } else {
      // Horizontal charts: left/right are label axes, top/bottom are value axes
      return isVerticalAxis ? 'label' : 'value';
    }
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
      // A <dc-grid> child validates itself, but nothing used to ask it, so an
      // invalid dash pattern was silently ignored.
      const gridEl = axis.getGridElement();
      if (gridEl) warnings.push(...gridEl.getStyleWarnings());
      for (const warning of warnings) {
        this.logError(ErrorCode.AXIS_STYLE_WARNING, { message: warning.message });
      }
    }
  }

  // ============================================================================
  // Nice Numbers for Value Axis
  // ============================================================================


  /**
   * Get a "nice" maximum value for the value axis.
   * Rounds the actual max up to a nice number that divides evenly by gridSteps.
   * @returns A nice maximum value for axis labels
   */
  protected getNiceMax(): number {
    const rawMax = this.getMaxValue();
    if (rawMax <= 0) return 1;

    // Calculate the range we need to cover
    const range = niceNumber(rawMax, false);

    // Calculate nice tick spacing
    const tickSpacing = niceNumber(range / this.gridSteps, true);

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
   * @param axisConfig Optional axis configuration for explicit min/max values
   * @returns ValueRange with nice bounds and zero line position info
   */
  protected getNiceRange(axisConfig?: AxisConfig): ValueRange {
    const rawMax = this.getMaxValue();
    const rawMin = this.getMinValue();

    this.log('info', 'valueAxis.rawRange', `Raw data range: [${rawMin}, ${rawMax}]`, { min: rawMin, max: rawMax });

    // Check for explicit min/max values from axis config
    const explicitMin = axisConfig?.minValue;
    const explicitMax = axisConfig?.maxValue;
    const rangePadding = axisConfig?.rangePadding ?? 0;

    // Apply explicit min if specified (not 'auto')
    let effectiveMin = rawMin;
    if (typeof explicitMin === 'number') {
      effectiveMin = explicitMin;
      this.log('info', 'valueAxis.explicitMin', `Using explicit min-value`, explicitMin);
    }

    // Apply explicit max if specified (not 'auto')
    let effectiveMax = rawMax;
    if (typeof explicitMax === 'number') {
      effectiveMax = explicitMax;
      this.log('info', 'valueAxis.explicitMax', `Using explicit max-value`, explicitMax);
    }

    // Apply range padding if specified
    if (rangePadding > 0 && (explicitMin === 'auto' || explicitMin === undefined || explicitMax === 'auto' || explicitMax === undefined)) {
      const currentRange = effectiveMax - effectiveMin;
      const paddingAmount = currentRange * rangePadding;

      if (explicitMin === 'auto' || explicitMin === undefined) {
        effectiveMin = effectiveMin - paddingAmount;
        this.log('info', 'valueAxis.rangePadding', `Applied ${(rangePadding * 100).toFixed(0)}% padding to min`, effectiveMin);
      }
      if (explicitMax === 'auto' || explicitMax === undefined) {
        effectiveMax = effectiveMax + paddingAmount;
        this.log('info', 'valueAxis.rangePadding', `Applied ${(rangePadding * 100).toFixed(0)}% padding to max`, effectiveMax);
      }
    }

    // If both explicit, use them directly (no nice rounding)
    if (typeof explicitMin === 'number' && typeof explicitMax === 'number') {
      const totalRange = effectiveMax - effectiveMin;
      const hasNegatives = effectiveMin < 0;
      const hasPositives = effectiveMax > 0;
      let zeroPosition: number | null = null;

      if (hasNegatives && hasPositives) {
        zeroPosition = effectiveMax / totalRange;
      } else if (hasNegatives) {
        zeroPosition = 0;
      } else {
        zeroPosition = 1;
      }

      this.log('info', 'valueAxis.range', `Explicit range: [${effectiveMin}, ${effectiveMax}]`, { min: effectiveMin, max: effectiveMax });
      return {
        min: effectiveMin,
        max: effectiveMax,
        zeroPosition,
        hasNegatives,
        hasPositives
      };
    }

    // Case 1: All positive (or zero) - use existing behavior
    if (effectiveMin >= 0) {
      // Use explicit max if provided, otherwise calculate nice max
      let niceMax: number;
      if (typeof explicitMax === 'number') {
        niceMax = explicitMax;
      } else {
        niceMax = this.getNiceMax();
      }
      this.log('info', 'valueAxis.range', `All positive: range [0, ${niceMax}], zero at bottom`, { min: 0, max: niceMax });
      return {
        min: typeof explicitMin === 'number' ? explicitMin : 0,
        max: niceMax,
        zeroPosition: 1, // Zero at bottom (fraction = 1)
        hasNegatives: false,
        hasPositives: rawMax > 0  // Use rawMax to reflect actual data, not display range
      };
    }

    // Case 2: All negative
    if (effectiveMax <= 0) {
      // Calculate nice minimum (negative value)
      const absMin = Math.abs(effectiveMin);
      const range = niceNumber(absMin, false);
      const tickSpacing = niceNumber(range / this.gridSteps, true);
      const niceAbsMin = Math.ceil(absMin / tickSpacing) * tickSpacing;

      const niceMin = typeof explicitMin === 'number' ? explicitMin : -niceAbsMin;
      const niceMaxVal = typeof explicitMax === 'number' ? explicitMax : 0;

      this.log('info', 'valueAxis.range', `All negative: range [${niceMin}, ${niceMaxVal}], zero at top`, { min: niceMin, max: niceMaxVal });
      return {
        min: niceMin,
        max: niceMaxVal,
        zeroPosition: 0, // Zero at top (fraction = 0)
        hasNegatives: true,
        hasPositives: false
      };
    }

    // Case 3: Mixed positive and negative
    // Calculate tick spacing based on the larger absolute value to get consistent intervals
    const maxAbsValue = Math.max(effectiveMax, Math.abs(effectiveMin));
    const tickSpacing = niceNumber(maxAbsValue / this.gridSteps, true);

    // Round max up and min down to tick spacing multiples
    const niceMax = typeof explicitMax === 'number' ? explicitMax : Math.ceil(effectiveMax / tickSpacing) * tickSpacing;
    const niceMin = typeof explicitMin === 'number' ? explicitMin : Math.floor(effectiveMin / tickSpacing) * tickSpacing;

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
    // Called once per label from the render loop; the auto branch below is O(n).
    return this.cachePerRender('labelLines', () => this.computeLabelLinesCount());
  }

  private computeLabelLinesCount(): number {
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
    // Called once per label from the render loop; the auto branch below is O(n).
    return this.cachePerRender('labelInterval', () => this.computeLabelIntervalValue());
  }

  private computeLabelIntervalValue(): number {
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
   * Uses the pure calculateLabelLines() utility function.
   * @returns Number of lines needed (capped at 4)
   */
  protected calculateAutoLabelLines(): number {
    const labels = this.getCategoryLabels();
    if (labels.length === 0) return 1;

    const maxLabelWidth = Math.max(...labels.map(l => this.measureText(l, this.fontSize(12))));
    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;

    const lines = calculateLabelLines(labels.length, maxLabelWidth, chartWidth);

    this.log('info', 'labels.lines', `Auto: maxLabelWidth=${maxLabelWidth.toFixed(1)}, chartWidth=${chartWidth.toFixed(1)} → ${lines} line(s)`, lines);
    return lines;
  }

  /**
   * Calculate interval to prevent label overlap when using single line.
   * Uses the pure calculateLabelInterval() utility function.
   * @returns Interval for showing labels
   */
  protected calculateAutoLabelInterval(): number {
    const labels = this.getCategoryLabels();
    if (labels.length === 0) return 1;

    const maxLabelWidth = Math.max(...labels.map(l => this.measureText(l, this.fontSize(12))));
    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;

    const interval = calculateLabelInterval(labels.length, maxLabelWidth, chartWidth);

    this.log('info', 'labels.interval', `Auto: maxLabelWidth=${maxLabelWidth.toFixed(1)}, chartWidth=${chartWidth.toFixed(1)} → interval=${interval}`, interval);
    return interval;
  }

  /**
   * Check if a label at given index should be shown based on interval.
   * Always shows first and last labels to provide context.
   * Intermediate labels are shown based on interval, but skipped if
   * they would overlap with the last label.
   * @param index The label index
   * @param totalLabels Total number of labels
   * @returns True if the label should be rendered
   */
  protected shouldShowLabel(index: number, totalLabels: number): boolean {
    // `show-label="false"` switches category labels off entirely. It used to be
    // declared on BaseChart, documented as supported on bar and line charts,
    // and read only by <dc-pie-chart> - so setting it here did nothing at all.
    // Checked before the interval logic, because "none" outranks "every other".
    if (this.showLabel === false) return false;

    const interval = this.getLabelIntervalValue();
    if (interval <= 1) return true;

    // Always show first label
    if (index === 0) return true;

    // Always show last label to provide context for the data range
    if (index === totalLabels - 1) return true;

    // Check if this is an interval position
    if (index % interval !== 0) return false;

    // Skip intermediate labels that are too close to the last label
    const gapToEnd = (totalLabels - 1) - index;
    if (gapToEnd < interval) return false;

    return true;
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

    const textWidth = this.measureText(config.title, this.fontSize(fontSize));
    const textHeight = this.fontSize(fontSize) * 1.2;

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
            part="axis-title"
            x="${x}"
            y="${centerY}"
            text-anchor="middle"
            font-size="${this.fontSize(fontSizeNum)}"
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
            part="axis-title"
            x="${x}"
            y="${centerY}"
            text-anchor="middle"
            font-size="${this.fontSize(fontSizeNum)}"
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
            part="axis-title"
            x="${centerX}"
            y="${y}"
            text-anchor="middle"
            font-size="${this.fontSize(fontSizeNum)}"
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
            part="axis-title"
            x="${centerX}"
            y="${y}"
            text-anchor="middle"
            font-size="${this.fontSize(fontSizeNum)}"
            font-family="${fontFamily}"
            font-weight="${fontWeight}"
            fill="${fill}"
          >
            ${config.title}
          </text>
        `;
      }
      // No default case needed - all AxisPosition values are handled
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
      this.measureText(maxValueStr, this.fontSize(11)),
      this.measureText(minValueStr, this.fontSize(11))
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
   * @param axisConfig Optional axis configuration for tick customization
   * @returns SVG template result for grid lines
   */
  // ============================================================================
  // Reference Lines and Bands
  // ============================================================================

  /**
   * Resolved `<dc-reference>` children.
   *
   * Cached per render: it is read by the range calculation, by two render
   * passes and by the insight generator, and it walks the DOM.
   */
  protected getReferences(): ReferenceData[] {
    return this.cachePerRender('references', () => this.extractReferences());
  }

  private extractReferences(): ReferenceData[] {
    const elements = Array.from(this.querySelectorAll('dc-reference'))
      .filter(el => !el.hasAttribute('hidden')) as ChartReference[];
    if (elements.length === 0) return [];

    const empty = elements.filter(el => !el.hasLine && !el.hasBand);
    if (empty.length > 0) {
      this.logError(ErrorCode.REFERENCE_EMPTY, { count: empty.length }, empty.length);
    }

    return elements
      .filter(el => el.hasLine || el.hasBand)
      .map(el => {
        // A band given the wrong way round is a typo, not an instruction to
        // draw nothing. Both bounds are only comparable when both are present.
        let min = el.min;
        let max = el.max;
        if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
          [min, max] = [max, min];
        }

        return {
          value: el.value,
          min,
          max,
          hasLine: el.hasLine,
          hasBand: el.hasBand,
          label: el.label || '',
          stroke: el.stroke,
          strokeWidth: el.strokeWidth,
          strokeDasharray: resolveDasharray(el.strokeDasharray) ?? '',
          fill: el.fill || el.stroke,
          fillOpacity: el.fillOpacity,
          labelPosition: el.labelPosition || 'end',
          valueFormat: el.valueFormat,
          element: el
        };
      });
  }

  /**
   * Every value a reference asks the axis to reach.
   *
   * Folded into the chart's own min/max so an automatic axis grows to show the
   * target. A target the axis crops off is worse than no target: the chart
   * looks complete and quietly omits the thing it was annotated with.
   */
  protected getReferenceValues(): number[] {
    return this.getReferences().flatMap(r =>
      [r.value, r.min, r.max].filter(v => Number.isFinite(v))
    );
  }

  /** Value axis coordinate for a value, in the given orientation. */
  private referenceCoordinate(
    value: number,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange,
    orientation: 'vertical' | 'horizontal'
  ): number {
    const totalRange = range.max - range.min || 1;
    const fraction = (value - range.min) / totalRange;
    return orientation === 'vertical'
      ? this.height - padding.bottom - fraction * chartHeight
      : padding.left + fraction * chartWidth;
  }

  /**
   * Bands, drawn behind the data.
   *
   * A band is a region of the plot rather than a mark on it, so anything it
   * overlaps must stay readable — which means underneath. Lines go on top, in
   * `renderReferenceLines()`.
   */
  protected renderReferenceBands(
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange,
    orientation: 'vertical' | 'horizontal' = 'vertical'
  ): SVGTemplateResult {
    const bands = this.getReferences().filter(r => r.hasBand);
    if (bands.length === 0) return svg``;

    const at = (v: number) =>
      this.referenceCoordinate(v, padding, chartWidth, chartHeight, range, orientation);

    return svg`
      ${bands.map(band => {
        // An open end is the edge of the plot. Clamping rather than skipping is
        // right for a band: a range that runs off the top is still partly on
        // screen, and showing that part is the honest thing to draw.
        const lo = Number.isFinite(band.min) ? Math.max(band.min, range.min) : range.min;
        const hi = Number.isFinite(band.max) ? Math.min(band.max, range.max) : range.max;
        if (hi <= lo) return '';

        const a = at(lo);
        const b = at(hi);

        return orientation === 'vertical'
          ? svg`
            <rect
              class="reference-band"
              x="${padding.left}"
              y="${Math.min(a, b)}"
              width="${chartWidth}"
              height="${Math.abs(b - a)}"
              fill="${band.fill}"
              fill-opacity="${band.fillOpacity}"
            />`
          : svg`
            <rect
              class="reference-band"
              x="${Math.min(a, b)}"
              y="${padding.top}"
              width="${Math.abs(b - a)}"
              height="${chartHeight}"
              fill="${band.fill}"
              fill-opacity="${band.fillOpacity}"
            />`;
      })}
    `;
  }

  /**
   * Lines and their labels, drawn over the data.
   *
   * A line outside the axis range is skipped rather than clamped. Clamping a
   * band shows part of a region that really is partly on screen; clamping a
   * line would draw it somewhere it is not, which is a lie the reader cannot
   * detect.
   */
  protected renderReferenceLines(
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange,
    orientation: 'vertical' | 'horizontal' = 'vertical'
  ): SVGTemplateResult {
    const withLine = this.getReferences().filter(r => r.hasLine);
    const labelled = this.getReferences().filter(r => r.label && (r.hasLine || r.hasBand));
    if (withLine.length === 0 && labelled.length === 0) return svg``;

    const inRange = (v: number) => v >= range.min && v <= range.max;
    const at = (v: number) =>
      this.referenceCoordinate(v, padding, chartWidth, chartHeight, range, orientation);

    const drawn = withLine.filter(r => {
      if (inRange(r.value)) return true;
      this.logError(ErrorCode.REFERENCE_OUT_OF_RANGE, {
        label: r.label ? `"${r.label}"` : '(unlabelled)',
        value: this.formatValue(r.value, r.valueFormat),
        min: this.formatValue(range.min),
        max: this.formatValue(range.max)
      }, r.value);
      return false;
    });

    const fontSize = this.fontSize(11);

    return svg`
      ${drawn.map(ref => {
        const c = at(ref.value);
        return orientation === 'vertical'
          ? svg`
            <line
              class="reference-line"
              x1="${padding.left}" y1="${c}"
              x2="${this.width - padding.right}" y2="${c}"
              stroke="${ref.stroke}"
              stroke-width="${ref.strokeWidth}"
              stroke-dasharray="${ref.strokeDasharray}"
            />`
          : svg`
            <line
              class="reference-line"
              x1="${c}" y1="${padding.top}"
              x2="${c}" y2="${this.height - padding.bottom}"
              stroke="${ref.stroke}"
              stroke-width="${ref.strokeWidth}"
              stroke-dasharray="${ref.strokeDasharray}"
            />`;
      })}
      ${labelled.map(ref => {
        // A band labels its own upper edge; a line labels itself. Where an
        // element is both, the line wins - it is the more precise statement.
        const anchorValue = ref.hasLine
          ? ref.value
          : Number.isFinite(ref.max) ? ref.max : ref.min;
        if (!inRange(anchorValue)) return '';

        const c = at(anchorValue);
        const atStart = ref.labelPosition === 'start';
        // A band with no line has no stroke on screen, so `fill` is the colour
        // the reader associates with it. Taking `stroke` here painted a green
        // band's label in the default red.
        const labelFill = ref.hasLine ? ref.stroke : ref.fill;

        if (orientation === 'vertical') {
          const x = atStart ? padding.left + 4 : this.width - padding.right - 4;
          return svg`
            <text
              class="reference-label"
              x="${x}"
              y="${c - 4}"
              text-anchor="${atStart ? 'start' : 'end'}"
              font-size="${fontSize}"
              fill="${labelFill}"
            >${ref.label}</text>`;
        }

        // On a horizontal chart the label runs sideways from the line, so a
        // reference near the right-hand edge - which is exactly where a limit
        // or an over-budget band sits - pushes its label off the plot. Measure
        // rather than guess, and put it on the other side when it will not fit.
        const y = atStart ? this.height - padding.bottom - 4 : padding.top + fontSize;
        const labelWidth = this.measureText(ref.label, fontSize);
        const overflows = c + 4 + labelWidth > this.width - padding.right;

        return svg`
          <text
            class="reference-label"
            x="${overflows ? c - 4 : c + 4}"
            y="${y}"
            text-anchor="${overflows ? 'end' : 'start'}"
            font-size="${fontSize}"
            fill="${labelFill}"
          >${ref.label}</text>`;
      })}
    `;
  }

  protected renderGridLines(
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange | number,
    orientation: 'vertical' | 'horizontal' = 'vertical',
    axisConfig?: AxisConfig
  ): SVGTemplateResult {
    // Check if grid is explicitly hidden
    if (axisConfig?.grid && !axisConfig.grid.show) {
      return svg``;
    }

    // Support both ValueRange and legacy number (max) parameter
    const valueRange: ValueRange = typeof range === 'number'
      ? { min: 0, max: range, zeroPosition: 1, hasNegatives: false, hasPositives: true }
      : range;

    const { min, max, hasNegatives, hasPositives } = valueRange;
    const totalRange = max - min;

    // Use calculateTicks with axis config, falling back to default tick count
    const tickConfig = axisConfig?.ticks ?? { count: this.gridSteps };
    const tickValues = calculateTicks(min, max, tickConfig);

    // Ensure zero is included when range spans both positive and negative
    if (hasNegatives && hasPositives && !tickValues.some(v => Math.abs(v) < totalRange * 0.0001)) {
      tickValues.push(0);
      tickValues.sort((a, b) => a - b);
    }

    // Get grid styling from config, with defaults
    const gridColor = axisConfig?.grid?.stroke ?? '#ddd';
    const gridDasharray = axisConfig?.grid?.strokeDasharray ?? '';

    if (orientation === 'vertical') {
      // Horizontal grid lines (for vertical bar/line charts)
      return svg`
        ${tickValues.map(value => {
          const y = this.height - padding.bottom - ((value - min) / totalRange) * chartHeight;
          // Check if this is the zero line (within small tolerance for floating point)
          const isZeroLine = Math.abs(value) < totalRange * 0.0001 && hasNegatives && hasPositives;
          return svg`
            <line
              part="${isZeroLine ? 'grid-line zero-line' : 'grid-line'}"
              x1="${padding.left}"
              y1="${y}"
              x2="${this.width - padding.right}"
              y2="${y}"
              stroke="${isZeroLine ? '#666' : gridColor}"
              stroke-width="${isZeroLine ? 1.5 : 1}"
              stroke-dasharray="${isZeroLine ? '' : gridDasharray}"
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
              part="${isZeroLine ? 'grid-line zero-line' : 'grid-line'}"
              x1="${x}"
              y1="${padding.top}"
              x2="${x}"
              y2="${this.height - padding.bottom}"
              stroke="${isZeroLine ? '#666' : gridColor}"
              stroke-width="${isZeroLine ? 1.5 : 1}"
              stroke-dasharray="${isZeroLine ? '' : gridDasharray}"
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
            part="axis-line"
            x1="${padding.left}"
            y1="${padding.top - extend}"
            x2="${padding.left}"
            y2="${this.height - padding.bottom}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
          <line
            part="axis-line"
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
            part="axis-line"
            x1="${padding.left}"
            y1="${padding.top - extend}"
            x2="${padding.left}"
            y2="${this.height - padding.bottom}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
          <line
            part="axis-line"
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
            part="axis-line"
            x1="${padding.left}"
            y1="${padding.top}"
            x2="${padding.left}"
            y2="${this.height - padding.bottom + extend}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
          <line
            part="axis-line"
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
            part="axis-line"
            x1="${this.width - padding.right}"
            y1="${padding.top}"
            x2="${this.width - padding.right}"
            y2="${this.height - padding.bottom + extend}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
          <line
            part="axis-line"
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
            part="axis-line"
            x1="${padding.left}"
            y1="${padding.top}"
            x2="${padding.left}"
            y2="${this.height - padding.bottom + extend}"
            stroke="#333"
            stroke-width="${strokeWidth}"
          />
          <line
            part="axis-line"
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
   * @param axisConfig Optional axis configuration for tick customization and formatting
   * @returns SVG template result for value axis labels
   */
  protected renderValueAxisLabels(
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange | number,
    orientation: 'vertical' | 'horizontal' = 'vertical',
    reverse = false,
    axisConfig?: AxisConfig
  ): SVGTemplateResult {
    // Support both ValueRange and legacy number (max) parameter
    const valueRange: ValueRange = typeof range === 'number'
      ? { min: 0, max: range, zeroPosition: 1, hasNegatives: false, hasPositives: true }
      : range;

    const { min, max } = valueRange;
    const totalRange = max - min;

    // Use axis format if provided, otherwise fall back to chart's valueFormat
    const format = axisConfig?.valueFormat ?? this.valueFormat;

    // Use calculateTicks with axis config, falling back to default tick count
    const tickConfig = axisConfig?.ticks ?? { count: this.gridSteps };
    const tickValues = calculateTicks(min, max, tickConfig);

    if (orientation === 'vertical') {
      if (reverse) {
        // Vertical-reverse: values increase downward from top
        return svg`
          ${tickValues.map(value => {
            const y = padding.top + ((value - min) / totalRange) * chartHeight;
            return svg`
              <text
                part="axis-label"
                x="${padding.left - 10}"
                y="${y + 4}"
                text-anchor="end"
                font-size="${this.fontSize(11)}"
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
                part="axis-label"
                x="${padding.left - 10}"
                y="${y + 4}"
                text-anchor="end"
                font-size="${this.fontSize(11)}"
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
                part="axis-label"
                x="${x}"
                y="${this.height - padding.bottom + 20}"
                text-anchor="middle"
                font-size="${this.fontSize(11)}"
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
                part="axis-label"
                x="${x}"
                y="${this.height - padding.bottom + 20}"
                text-anchor="middle"
                font-size="${this.fontSize(11)}"
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

  // ============================================================================
  // Time Axis Helpers
  // ============================================================================

  /**
   * Parse category labels as dates and calculate time scale.
   * Returns null if labels can't be parsed as valid dates.
   *
   * @param labels Array of label strings
   * @param axisConfig Axis configuration with date format options
   * @returns TimeScale object or null if not a time axis
   */
  protected parseTimeScale(labels: string[], axisConfig: AxisConfig): TimeScale | null {
    // Only process if type is explicitly 'time'
    if (axisConfig.type !== 'time') {
      return null;
    }

    // Parse labels as dates
    const parsed: ParsedDates = parseDateLabels(labels, axisConfig.dateFormat);

    // Need at least 2 valid dates for a time scale
    if (parsed.validIndices.length < 2 || !parsed.range) {
      this.logError(ErrorCode.TIME_AXIS_FEW_DATES, { count: parsed.validIndices.length }, labels);
      return null;
    }

    // Calculate tick dates and format
    const targetTicks = axisConfig.ticks?.count ?? 5;
    const { dates: tickDates, format: autoFormat } = calculateTimeTicks(
      parsed.range.min,
      parsed.range.max,
      targetTicks
    );

    // Use explicit date-label-format if provided, otherwise use auto-detected format
    const tickFormat = axisConfig.dateLabelFormat ?? autoFormat;

    this.log('info', 'timeAxis', `Time scale: ${parsed.validIndices.length} dates, range ${formatDate(parsed.range.min, 'yyyy-MM-dd')} to ${formatDate(parsed.range.max, 'yyyy-MM-dd')}`, { tickDates: tickDates.length, tickFormat });

    return {
      min: parsed.range.min,
      max: parsed.range.max,
      dates: parsed.dates,
      validIndices: parsed.validIndices,
      tickDates,
      tickFormat,
    };
  }

  /**
   * The active time scale, or null when this is not a time axis.
   *
   * Cached per render: `parseTimeScale` parses every category label, and this is
   * reached from inside per-point render loops. Uncached it would be the same
   * quadratic shape that `getChartPadding` once was.
   *
   * A time scale is only active when the chart has no bars. Bars occupy fixed
   * slots along the category axis, so positioning their labels by date would
   * put the ticks somewhere the bars are not.
   */
  protected getTimeScale(): TimeScale | null {
    return this.cachePerRender('timeScale', () => this.computeTimeScale());
  }

  private computeTimeScale(): TimeScale | null {
    const config = this.getAxisConfig(this.getCategoryAxisPosition());
    if (config.type !== 'time') return null;

    if (this.hasCategorySlots()) {
      this.log('info', 'timeAxis', 'Ignoring type="time": this chart positions categories in slots');
      return null;
    }

    return this.parseTimeScale(this.getCategoryLabels(), config);
  }

  /**
   * Whether the category axis places elements in fixed slots rather than along
   * a continuous scale. Bar charts do; point-based series do not.
   */
  protected hasCategorySlots(): boolean {
    return false;
  }

  /**
   * X coordinate for a label under the active time scale, or null when there is
   * no time scale or the label is not a date.
   *
   * Parsed per distinct label and memoized, so a chart with several series
   * sharing dates parses each one once.
   */
  protected getTimeXForLabel(
    label: string,
    chartLeft: number,
    chartWidth: number
  ): number | null {
    const scale = this.getTimeScale();
    if (!scale) return null;

    const date = this.getTimeDateForLabel(label);
    return date ? this.getTimeX(date, scale, chartLeft, chartWidth) : null;
  }

  /** Parsed date for one category label, memoized for the render. */
  protected getTimeDateForLabel(label: string): Date | null {
    const scale = this.getTimeScale();
    if (!scale) return null;

    return this.cachePerRender(`timeDate:${label}`, () => {
      const config = this.getAxisConfig(this.getCategoryAxisPosition());
      const parsed = parseDateLabels([label], config.dateFormat);
      return parsed.dates[0] ?? null;
    });
  }

  /**
   * Calculate the position (0-1) for a date within the time scale.
   *
   * @param date The date to position
   * @param timeScale The time scale
   * @returns Position as fraction (0 = min, 1 = max)
   */
  protected getTimePosition(date: Date, timeScale: TimeScale): number {
    return dateToPosition(date, timeScale.min, timeScale.max);
  }

  /**
   * Calculate the X coordinate for a date on a time axis.
   *
   * @param date The date to position
   * @param timeScale The time scale
   * @param chartLeft Left edge of chart area
   * @param chartWidth Width of chart area
   * @returns X coordinate in viewBox units
   */
  protected getTimeX(date: Date, timeScale: TimeScale, chartLeft: number, chartWidth: number): number {
    const position = this.getTimePosition(date, timeScale);
    return chartLeft + position * chartWidth;
  }

  /**
   * Render time axis labels at calculated tick positions.
   *
   * @param timeScale The time scale
   * @param padding Chart padding
   * @param chartWidth Width of chart area
   * @returns SVG template result for time axis labels
   */
  protected renderTimeAxisLabels(
    timeScale: TimeScale,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number
  ): SVGTemplateResult {
    return svg`
      ${timeScale.tickDates.map(date => {
        const x = this.getTimeX(date, timeScale, padding.left, chartWidth);
        const label = formatDate(date, timeScale.tickFormat);
        return svg`
          <text
            part="axis-label"
            x="${x}"
            y="${this.height - padding.bottom + 20}"
            text-anchor="middle"
            font-size="${this.fontSize(11)}"
            fill="#666"
          >${label}</text>
        `;
      })}
    `;
  }
}
