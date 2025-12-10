import { svg, SVGTemplateResult } from 'lit';
import { BaseChart } from './base-chart.js';
import type { ChartAxis, AxisPosition } from './chart-axis.js';

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
 * <dc-bar-chart>
 *   <dc-axis position="bottom" label-interval="2"></dc-axis>
 *   <dc-axis position="left">
 *     <dc-title>Revenue ($)</dc-title>
 *   </dc-axis>
 *   <dc-bar value="30" label="A"></dc-bar>
 * </dc-bar-chart>
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
    const max = this.getNiceMax();
    const maxValueStr = max.toFixed(0);
    const maxValueWidth = this.measureText(maxValueStr, 11) + 15; // 11px font + margin

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
   *
   * @param padding Chart padding values
   * @param chartWidth Width of the chart content area
   * @param chartHeight Height of the chart content area
   * @param max Maximum data value for scaling
   * @param orientation 'vertical' for horizontal grid lines, 'horizontal' for vertical grid lines
   * @returns SVG template result for grid lines
   */
  protected renderGridLines(
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    max: number,
    orientation: 'vertical' | 'horizontal' = 'vertical'
  ): SVGTemplateResult {
    if (orientation === 'vertical') {
      // Horizontal grid lines (for vertical bar/line charts)
      return svg`
        ${Array.from({ length: this.gridSteps + 1 }, (_, i) => {
          const value = (max / this.gridSteps) * i;
          const y = this.height - padding.bottom - (value / max) * chartHeight;
          return svg`
            <line
              x1="${padding.left}"
              y1="${y}"
              x2="${this.width - padding.right}"
              y2="${y}"
              stroke="#ddd"
              stroke-width="1"
            />
          `;
        })}
      `;
    } else {
      // Vertical grid lines (for horizontal bar charts)
      return svg`
        ${Array.from({ length: this.gridSteps + 1 }, (_, i) => {
          const value = (max / this.gridSteps) * i;
          const x = padding.left + (value / max) * chartWidth;
          return svg`
            <line
              x1="${x}"
              y1="${padding.top}"
              x2="${x}"
              y2="${this.height - padding.bottom}"
              stroke="#ddd"
              stroke-width="1"
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
   * @returns SVG template result for axes
   */
  protected renderAxes(
    padding: { top: number; right: number; bottom: number; left: number },
    orientation: 'vertical' | 'horizontal' = 'vertical',
    reverse = false
  ): SVGTemplateResult {
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
   *
   * @param padding Chart padding values
   * @param chartWidth Width of the chart content area
   * @param chartHeight Height of the chart content area
   * @param max Maximum data value for scaling
   * @param orientation 'vertical' for Y-axis labels on left, 'horizontal' for X-axis labels at bottom
   * @param reverse If true, adjusts label positions for reverse orientations
   * @returns SVG template result for value axis labels
   */
  protected renderValueAxisLabels(
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    max: number,
    orientation: 'vertical' | 'horizontal' = 'vertical',
    reverse = false
  ): SVGTemplateResult {
    if (orientation === 'vertical') {
      if (reverse) {
        // Vertical-reverse: values increase downward from top
        return svg`
          ${Array.from({ length: this.gridSteps + 1 }, (_, i) => {
            const value = (max / this.gridSteps) * i;
            const y = padding.top + (value / max) * chartHeight;
            return svg`
              <text
                x="${padding.left - 10}"
                y="${y + 4}"
                text-anchor="end"
                font-size="11"
                fill="#666"
              >
                ${value.toFixed(0)}
              </text>
            `;
          })}
        `;
      } else {
        // Standard vertical: values increase upward from bottom
        return svg`
          ${Array.from({ length: this.gridSteps + 1 }, (_, i) => {
            const value = (max / this.gridSteps) * i;
            const y = this.height - padding.bottom - (value / max) * chartHeight;
            return svg`
              <text
                x="${padding.left - 10}"
                y="${y + 4}"
                text-anchor="end"
                font-size="11"
                fill="#666"
              >
                ${value.toFixed(0)}
              </text>
            `;
          })}
        `;
      }
    } else {
      if (reverse) {
        // Horizontal-reverse: values increase from right to left
        return svg`
          ${Array.from({ length: this.gridSteps + 1 }, (_, i) => {
            const value = (max / this.gridSteps) * i;
            const x = this.width - padding.right - (value / max) * chartWidth;
            return svg`
              <text
                x="${x}"
                y="${this.height - padding.bottom + 20}"
                text-anchor="middle"
                font-size="11"
                fill="#666"
              >
                ${value.toFixed(0)}
              </text>
            `;
          })}
        `;
      } else {
        // Standard horizontal: values increase from left to right
        return svg`
          ${Array.from({ length: this.gridSteps + 1 }, (_, i) => {
            const value = (max / this.gridSteps) * i;
            const x = padding.left + (value / max) * chartWidth;
            return svg`
              <text
                x="${x}"
                y="${this.height - padding.bottom + 20}"
                text-anchor="middle"
                font-size="11"
                fill="#666"
              >
                ${value.toFixed(0)}
              </text>
            `;
          })}
        `;
      }
    }
  }
}
