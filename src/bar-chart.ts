import { customElement, property } from 'lit/decorators.js';
import { svg, SVGTemplateResult } from 'lit';
import { AxisChart } from './axis-chart.js';
import { type ShowCondition } from './base-chart.js';
import type { ChartBar } from './chart-bar.js';
import type { ChartBarGroup } from './chart-bar-group.js';
import type { ChartBarSegment } from './chart-bar-segment.js';
import type { ChartPopup } from './chart-popup.js';

/**
 * Data structure for a single segment within a bar
 */
interface SegmentData {
  value: number;
  fill: string;
  label: string;
  href?: string;
  target?: string;
  popup?: { content: string; trigger: string };
  autoPopup?: boolean;
  showValue: ShowCondition;
  showPercent: ShowCondition;
  element?: ChartBarSegment;
  passthroughAttrs?: Record<string, string>;
}

/**
 * Data structure for a single bar
 */
interface BarData {
  value: number;
  fill: string;
  /** The element-level fill if explicitly set (used for color resolution) */
  elementFill?: string;
  label: string;
  href?: string;
  target?: string;
  popup?: { content: string; trigger: string };
  autoPopup?: boolean;
  showValue: ShowCondition;
  showPercent: ShowCondition;
  width?: string;
  gutter?: number;
  element?: ChartBar;
  passthroughAttrs?: Record<string, string>;
  segments?: SegmentData[];
}

/**
 * Data structure for a group of bars
 */
interface BarGroupData {
  label: string;
  bars: BarData[];
  isGroup: true;
  gutter?: number;
}

/**
 * Data structure for an ungrouped bar
 */
interface UngroupedBarData extends BarData {
  isGroup: false;
}

/**
 * Union type representing either a group or an ungrouped bar
 */
type BarOrGroup = BarGroupData | UngroupedBarData;

/**
 * Flattened bar with optional group metadata
 */
interface FlattenedBar extends BarData {
  groupLabel?: string;
  groupIndex?: number;
  barIndexInGroup?: number;
}

/**
 * Bar chart component that renders bars declaratively specified as child elements
 *
 * @element dc-bar-chart
 *
 * @attr {number} width - Width of the chart in pixels (default: 600)
 * @attr {number} height - Height of the chart in pixels (default: 400)
 * @attr {string} orientation - Bar orientation: "vertical" or "horizontal" (default: vertical)
 * @attr {boolean} show-value - Whether to display numeric values on bars by default (default: true)
 * @attr {string} fill-colors - Fill colors for bars. Single color, comma-separated list, or "auto" (default: #4CAF50)
 * @attr {string} bar-color - @deprecated Use fill-colors instead. Default color for bars.
 *
 * @slot - Child elements: dc-title and dc-bar elements
 *
 * @example
 * <dc-bar-chart width="600" height="400">
 *   <dc-title>Sales Data</dc-title>
 *   <dc-bar value="10" color="red" label="Jan"></dc-bar>
 *   <dc-bar value="20" color="blue" label="Feb"></dc-bar>
 * </dc-bar-chart>
 *
 * @example
 * <dc-bar-chart width="600" height="400" orientation="horizontal">
 *   <dc-title>Sales Data (Horizontal)</dc-title>
 *   <dc-bar value="10" color="red" label="Jan"></dc-bar>
 *   <dc-bar value="20" color="blue" label="Feb"></dc-bar>
 * </dc-bar-chart>
 *
 * @example
 * <dc-bar-chart width="600" height="400" show-value="false">
 *   <dc-title>Sales Data (No Values Shown)</dc-title>
 *   <dc-bar value="10" color="red" label="Jan"></dc-bar>
 *   <dc-bar value="20" color="blue" label="Feb"></dc-bar>
 * </dc-bar-chart>
 *
 * @example
 * <dc-bar-chart width="600" height="400" bar-color="#2196F3">
 *   <dc-title>Sales Data (All Blue Bars)</dc-title>
 *   <dc-bar value="10" label="Jan"></dc-bar>
 *   <dc-bar value="20" label="Feb"></dc-bar>
 *   <dc-bar value="30" color="red" label="Mar"></dc-bar>
 * </dc-bar-chart>
 */
@customElement('dc-bar-chart')
export class BarChart extends AxisChart {
  @property({ type: String })
  orientation: 'vertical' | 'horizontal' | 'vertical-reverse' | 'horizontal-reverse' = 'vertical';

  /**
   * Get the chart orientation for axis mapping.
   * Maps 'vertical-reverse' to 'vertical' and 'horizontal-reverse' to 'horizontal'.
   */
  protected override getChartOrientation(): 'vertical' | 'horizontal' {
    return this.orientation.startsWith('horizontal') ? 'horizontal' : 'vertical';
  }

  // showValue is inherited from BaseChart

  /**
   * @deprecated Use `fill-colors` instead. Kept for backwards compatibility.
   */
  @property({ type: String, attribute: 'bar-color' })
  barColor = '#4CAF50';

  @property({ type: String, attribute: 'bar-width' })
  barWidth?: string;

  @property({ type: Number })
  gutter = 10;

  private clickedBarIndex = -1;

  // Cache for segment label to color mapping
  private segmentColorMap: Map<string, string> = new Map();

  /**
   * Get the effective default fill color for bars.
   * Returns fill-colors if set (first color), otherwise falls back to bar-color for backwards compatibility.
   */
  private getDefaultBarFill(): string {
    if (this.fillColors) {
      // Parse first color from palette
      const colors = this.fillColors.split(',').map(c => c.trim()).filter(c => c);
      if (colors.length > 0 && colors[0] !== 'auto') {
        return colors[0];
      }
    }
    return this.barColor;
  }

  /**
   * Parse CSS unit string to pixels
   * Supports: px, rem, em, or unitless (treated as px)
   */
  private parseCSSUnit(value: string | undefined): number | undefined {
    if (!value) return undefined;

    const trimmed = value.trim();
    const match = trimmed.match(/^([\d.]+)(px|rem|em)?$/);

    if (!match) return undefined;

    const num = parseFloat(match[1]);
    const unit = match[2] || 'px';

    switch (unit) {
      case 'px':
        return num;
      case 'rem':
        return num * 16; // 1rem = 16px (standard)
      case 'em':
        return num * 16; // 1em = 16px (using standard, could use computed font size)
      default:
        return num; // Treat unitless as px
    }
  }

  /**
   * Build and cache the segment label to color mapping
   * Collects all unique segment labels across all bars and assigns consistent colors
   * Uses the fill-colors attribute if specified, otherwise falls back to auto-generation
   */
  private buildSegmentColorMap(): void {
    // Collect all unique segment labels in order of first appearance
    const uniqueLabels: string[] = [];

    Array.from(this.children).forEach(child => {
      let barElements: ChartBar[] = [];

      if (child.tagName === 'DC-BAR-GROUP') {
        barElements = Array.from(child.querySelectorAll('dc-bar')) as ChartBar[];
      } else if (child.tagName === 'DC-BAR') {
        barElements = [child as ChartBar];
      }

      barElements.forEach(bar => {
        const segments = Array.from(bar.querySelectorAll('dc-bar-segment')) as ChartBarSegment[];
        segments.forEach(segment => {
          if (segment.label && !uniqueLabels.includes(segment.label)) {
            uniqueLabels.push(segment.label);
          }
        });
      });
    });

    // Generate colors for all unique labels using the color system
    // This respects fill-colors, fill-start-color/fill-end-color, or falls back to auto
    const colors = this.resolveFillColors(uniqueLabels.length, [], undefined);

    // Build the map
    this.segmentColorMap.clear();
    uniqueLabels.forEach((label, index) => {
      this.segmentColorMap.set(label, colors[index]);
    });
  }

  /**
   * Get the color for a segment based on its label
   * @param label The segment label
   * @returns The color assigned to this label
   */
  private getSegmentColor(label: string): string {
    return this.segmentColorMap.get(label) || '#888888';
  }

  // ============================================================================
  // AxisChart Abstract Method Implementations
  // ============================================================================

  /**
   * Get the maximum value from the bar chart's data.
   * @returns Maximum bar value, minimum of 1
   */
  protected getMaxValue(): number {
    const bars = this.getFlattenedBars();
    if (bars.length === 0) return 1;
    return Math.max(...bars.map(b => b.value), 1);
  }

  /**
   * Get all values from the bar chart's data.
   * @returns Array of all bar values
   */
  protected getAllValues(): number[] {
    return this.getFlattenedBars().map(b => b.value);
  }

  /**
   * Get labels for the category axis.
   * @returns Array of bar labels
   */
  protected getCategoryLabels(): string[] {
    return this.getFlattenedBars().map(b => b.label);
  }

  // ============================================================================
  // End AxisChart Abstract Method Implementations
  // ============================================================================

  /**
   * Calculate unit dimensions (widths for vertical charts, heights for horizontal charts).
   * Single source of truth for all orientation renderers.
   */
  private calculateUnitDimensions(
    structure: BarOrGroup[],
    availableSpace: number
  ): {
    unitSizes: number[];
    totalGutterSpace: number;
    totalCustomSize: number;
    remainingSpace: number;
    defaultUnitSize: number;
    unitsWithoutCustomSize: number;
  } {
    // Calculate total gutter space needed
    let totalGutterSpace = 0;
    structure.forEach(unit => {
      const gutter = unit.isGroup ? (unit.gutter ?? this.gutter) : (unit.gutter ?? this.gutter);
      totalGutterSpace += gutter;
    });

    // Calculate sizes for each unit (group or ungrouped bar)
    const unitSizes: number[] = [];
    let totalCustomSize = 0;
    let unitsWithoutCustomSize = 0;

    structure.forEach(unit => {
      if (unit.isGroup) {
        // For groups, sum custom sizes of bars in the group
        let groupSize = 0;
        let barsWithoutSize = 0;

        unit.bars.forEach(bar => {
          const parsedSize = this.parseCSSUnit(bar.width);
          if (parsedSize !== undefined) {
            groupSize += parsedSize;
          } else {
            barsWithoutSize++;
          }
        });

        if (barsWithoutSize === 0 && groupSize > 0) {
          // All bars have custom sizes
          unitSizes.push(groupSize);
          totalCustomSize += groupSize;
        } else {
          // Some or all bars don't have custom sizes
          unitSizes.push(-1); // Mark for equal distribution
          unitsWithoutCustomSize++;
        }
      } else {
        // Ungrouped bar
        const parsedSize = this.parseCSSUnit(unit.width);
        if (parsedSize !== undefined) {
          unitSizes.push(parsedSize);
          totalCustomSize += parsedSize;
        } else {
          unitSizes.push(-1); // Mark for equal distribution
          unitsWithoutCustomSize++;
        }
      }
    });

    // Calculate size for units without custom sizes (subtract gutter space)
    const remainingSpace = availableSpace - totalCustomSize - totalGutterSpace;
    const defaultUnitSize = unitsWithoutCustomSize > 0 ? remainingSpace / unitsWithoutCustomSize : 0;

    // Replace -1 with actual default sizes
    const finalUnitSizes = unitSizes.map(s => s === -1 ? defaultUnitSize : s);

    // Log unit dimension calculations
    const dimension = this.orientation.startsWith('horizontal') ? 'height' : 'width';
    this.log('info', 'unitDimensions.availableSpace', `Available space for bars (${dimension})`, availableSpace);
    this.log('info', 'unitDimensions.totalGutter', `Total gutter space: ${structure.length} units × gutter`, totalGutterSpace);
    if (totalCustomSize > 0) {
      this.log('info', 'unitDimensions.customSize', `Custom-sized bars total`, totalCustomSize);
    }
    this.log('info', 'unitDimensions.remaining', `Remaining for auto-sized: ${availableSpace.toFixed(1)} - ${totalCustomSize.toFixed(1)} - ${totalGutterSpace.toFixed(1)} = ${remainingSpace.toFixed(1)}`, remainingSpace);
    if (unitsWithoutCustomSize > 0) {
      this.log('info', 'unitDimensions.defaultSize', `Default unit size: ${remainingSpace.toFixed(1)} / ${unitsWithoutCustomSize} = ${defaultUnitSize.toFixed(1)}`, defaultUnitSize);
    }

    return {
      unitSizes: finalUnitSizes,
      totalGutterSpace,
      totalCustomSize,
      remainingSpace,
      defaultUnitSize,
      unitsWithoutCustomSize
    };
  }

  /**
   * Extract segment data from a ChartBarSegment element
   * Fill color is determined by the segment's label (auto-generated)
   */
  private extractSegmentData(segment: ChartBarSegment, _parentFill: string, parentShowValue: ShowCondition, parentShowPercent: ShowCondition): SegmentData {
    const popupEl = segment.querySelector('dc-popup') as ChartPopup | null;
    // Fill is auto-generated based on label
    const segmentFill = this.getSegmentColor(segment.label);
    const showValue = segment.hasAttribute('show-value') ? segment.showValue! : parentShowValue;
    const showPercent = segment.hasAttribute('show-percent') ? segment.showPercent! : parentShowPercent;

    // Extract passthrough attributes (base attrs handled by BaseShape)
    const knownAttrs = new Set(['value', 'href', 'target', 'show-value', 'show-percent']);
    const passthroughAttrs = segment.getPassthroughAttributes(knownAttrs);

    return {
      value: segment.value,
      fill: segmentFill,
      label: segment.label,
      href: segment.href || undefined,
      target: segment.target || undefined,
      popup: popupEl
        ? { content: popupEl.content, trigger: popupEl.trigger }
        : undefined,
      autoPopup: segment.autoPopup,
      showValue,
      showPercent,
      element: segment,
      passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined
    };
  }

  /**
   * Extract bar data from a ChartBar element
   * Handles fill inheritance, popup detection, showValue/showPercent override, width cascade, gutter cascade, and segments
   */
  private extractBarData(bar: ChartBar, groupBarWidth?: string, groupGutter?: number): BarData {
    const popupEl = bar.querySelector('dc-popup') as ChartPopup | null;
    // Get effective fill (prefers 'fill' over deprecated 'color')
    // Store element-level fill separately for color resolution
    const elementFill = bar.getEffectiveFill();
    // Use placeholder for now - will be resolved in renderChart after we know bar count
    const barFill = elementFill || '';
    const showValue = bar.hasAttribute('show-value') ? bar.showValue : this.showValue;
    const showPercent = bar.hasAttribute('show-percent') ? bar.showPercent! : this.showPercent;

    // Width cascade: bar.width > group.barWidth > chart.barWidth
    let width: string | undefined;
    if (bar.hasAttribute('width')) {
      width = bar.width;
    } else if (groupBarWidth) {
      width = groupBarWidth;
    } else if (this.barWidth) {
      width = this.barWidth;
    }

    // Gutter cascade: group.gutter > chart.gutter
    const gutter = groupGutter !== undefined ? groupGutter : this.gutter;

    // Extract passthrough attributes (base attrs handled by BaseShape)
    const knownAttrs = new Set(['value', 'href', 'target', 'show-value', 'show-percent', 'width']);
    const passthroughAttrs = bar.getPassthroughAttributes(knownAttrs);

    // Extract segments if present
    const segmentElements = Array.from(bar.querySelectorAll('dc-bar-segment')) as ChartBarSegment[];
    let segments: SegmentData[] | undefined;
    let totalValue = bar.value;

    if (segmentElements.length > 0) {
      segments = segmentElements.map(seg => this.extractSegmentData(seg, barFill, showValue, showPercent));
      // If bar has segments, the total value is the sum of segment values
      totalValue = segments.reduce((sum, seg) => sum + seg.value, 0);
    }

    return {
      value: totalValue,
      fill: barFill,
      elementFill: elementFill || undefined,
      label: bar.label,
      href: bar.href || undefined,
      target: bar.target || undefined,
      popup: popupEl
        ? { content: popupEl.content, trigger: popupEl.trigger }
        : undefined,
      autoPopup: bar.autoPopup,
      showValue,
      showPercent,
      width,
      gutter,
      element: bar,
      passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined,
      segments
    };
  }

  /**
   * Get additional padding needed for axis labels and value labels.
   * Bar charts need extra padding for:
   * - Y-axis numeric labels (vertical) or bar labels (horizontal)
   * - X-axis bar labels (vertical) or numeric labels (horizontal)
   * - Value labels above/beside bars
   * - Group labels if present
   */
  protected override getAxisLabelPadding(): { top: number; right: number; bottom: number; left: number } {
    const structure = this.getBarStructure();
    const bars = this.getFlattenedBars();

    if (bars.length === 0) {
      // No bars yet (initial render before children are parsed)
      // Return reasonable defaults from parent class
      return super.getAxisLabelPadding();
    }

    // Calculate max value for Y-axis label width (use nice max for consistent labels)
    const maxValue = this.getNiceMax();
    const maxValueStr = maxValue.toFixed(0);
    const maxValueWidth = this.measureText(maxValueStr, 11) + 15; // 11px font + margin

    // Check if we have groups (need extra space for group labels)
    const hasGroups = structure.some(item => item.isGroup);

    // Calculate longest bar label width
    // For horizontal charts with label-lines > 1, we need wider padding for staggered labels
    const longestLabel = bars.reduce((longest: string, bar: FlattenedBar) =>
      (bar.label?.length || 0) > (longest?.length || 0) ? bar.label : longest,
      ''
    ) || '';
    const baseLabelWidth = this.measureText(longestLabel, 12) + 15; // 12px font + margin
    const longestGroupLabelWidth = hasGroups
      ? Math.max(...structure.filter(s => s.isGroup).map(s => this.measureText((s as BarGroupData).label, 13))) + 20
      : 0;

    // Calculate value label width (for values shown beside bars in horizontal charts)
    const valueWidth = this.measureText(maxValueStr, 14) + 15; // 14px font + margin

    // Height for bottom labels: bar labels + group labels
    // Multiply by number of label lines for staggered labels
    const labelLines = this.getLabelLinesCount();
    const barLabelHeight = 25 * labelLines; // Space for bar labels (multiplied by lines)
    const groupLabelHeight = hasGroups ? 25 : 0; // Extra space for group labels
    const numericLabelHeight = 25; // Space for numeric axis labels

    // Height for top labels (value labels above bars)
    const valueLabelHeight = 25;

    // Check for axis titles and add space for them
    const leftAxisTitle = this.getAxisTitleDimensions('left');
    const bottomAxisTitle = this.getAxisTitleDimensions('bottom');
    const rightAxisTitle = this.getAxisTitleDimensions('right');
    const topAxisTitle = this.getAxisTitleDimensions('top');

    // Calculate based on orientation
    switch (this.orientation) {
      case 'vertical':
        // Left: Y-axis numeric labels + axis title
        // Bottom: X-axis bar labels + group labels + axis title
        // Top: Value labels above bars
        return {
          top: valueLabelHeight + (topAxisTitle?.height || 0),
          right: (rightAxisTitle?.width || 0),
          bottom: barLabelHeight + groupLabelHeight + (bottomAxisTitle?.height || 0),
          left: maxValueWidth + (leftAxisTitle?.width || 0)
        };

      case 'horizontal':
        // Left: Y-axis bar labels + group labels + axis title
        // Right: Value labels beside bars
        // Bottom: X-axis numeric labels + axis title
        // For horizontal charts, label-lines staggers labels horizontally (multiple columns)
        return {
          top: (topAxisTitle?.height || 0),
          right: valueWidth + (rightAxisTitle?.width || 0),
          bottom: numericLabelHeight + (bottomAxisTitle?.height || 0),
          left: Math.max(baseLabelWidth * labelLines, longestGroupLabelWidth) + (leftAxisTitle?.width || 0)
        };

      case 'vertical-reverse':
        // Left: Y-axis numeric labels + axis title
        // Top: X-axis bar labels + group labels + axis title
        // Bottom: Value labels below bars (inside chart area, so less padding needed)
        return {
          top: barLabelHeight + groupLabelHeight + (topAxisTitle?.height || 0),
          right: (rightAxisTitle?.width || 0),
          bottom: valueLabelHeight + (bottomAxisTitle?.height || 0),
          left: maxValueWidth + (leftAxisTitle?.width || 0)
        };

      case 'horizontal-reverse':
        // Right: Y-axis bar labels + group labels + axis title
        // Left: Value labels beside bars
        // Bottom: X-axis numeric labels + axis title
        // For horizontal charts, label-lines staggers labels horizontally (multiple columns)
        return {
          top: (topAxisTitle?.height || 0),
          right: Math.max(baseLabelWidth * labelLines, longestGroupLabelWidth) + (rightAxisTitle?.width || 0),
          bottom: numericLabelHeight + (bottomAxisTitle?.height || 0),
          left: valueWidth + (leftAxisTitle?.width || 0)
        };

      default:
        return { top: 0, right: 0, bottom: 0, left: 0 };
    }
  }

  /**
   * Render bar content (segments or single bar rectangle)
   * @param bar - The bar data
   * @param index - The bar index for data attributes
   * @param orientation - 'vertical' or 'horizontal' for segment stacking direction
   * @param rect - Position and size: { x, y, width, height }
   * @param max - Maximum value for scaling
   * @param chartSize - Chart dimension for scaling (chartHeight for vertical, chartWidth for horizontal)
   * @param total - Total value of all bars for percentage calculations
   * @param reverse - If true, stack in reverse direction (top-to-bottom for vertical, right-to-left for horizontal)
   */
  private renderBarContent(
    bar: FlattenedBar,
    index: number,
    orientation: 'vertical' | 'horizontal',
    rect: { x: number; y: number; width: number; height: number },
    max: number,
    chartSize: number,
    total: number,
    reverse = false
  ): SVGTemplateResult {
    if (bar.segments && bar.segments.length > 0) {
      if (orientation === 'vertical') {
        if (reverse) {
          // Stack segments from top to bottom (for vertical-reverse)
          let segmentY = rect.y;
          return svg`
            ${bar.segments.map((segment, segIndex) => {
              const segmentHeight = (segment.value / max) * chartSize;
              const currentSegmentY = segmentY;
              segmentY += segmentHeight;
              const hasSegmentPopup = segment.href || segment.popup || this.shouldShowAutoPopup(segment.autoPopup);
              const segRect = svg`
                <rect
                  x="${rect.x}"
                  y="${currentSegmentY}"
                  width="${rect.width}"
                  height="${segmentHeight}"
                  fill="${segment.fill}"
                  style="cursor: ${hasSegmentPopup ? 'pointer' : 'default'}"
                  data-shape-index="${index}"
                  data-segment-index="${segIndex}"
                  @mouseenter="${(e: MouseEvent) => this.handleSegmentMouseEnter(e, index, segIndex)}"
                  @mouseleave="${() => this.handleSegmentMouseLeave(index, segIndex)}"
                  @click="${(e: MouseEvent) => this.handleSegmentClick(e, index, segIndex)}"
                />
              `;
              const segPercent = total > 0 ? (segment.value / total) * 100 : 0;
              const segShouldShowValue = this.evaluateShowCondition(segment.showValue, segment.value, segPercent);
              const segShouldShowPercent = this.evaluateShowCondition(segment.showPercent, segment.value, segPercent);
              const segValueString = this.formatValueString(segment.value, segPercent, segShouldShowValue, segShouldShowPercent);
              return svg`
                ${segment.href ? svg`
                  <a href="${segment.href}" target="${segment.target || '_self'}">
                    ${segRect}
                  </a>
                ` : segRect}
                ${segValueString ? svg`
                  <text
                    x="${rect.x + rect.width / 2}"
                    y="${currentSegmentY + segmentHeight / 2 + 4}"
                    text-anchor="middle"
                    font-size="12"
                    fill="#fff"
                  >
                    ${segValueString}
                  </text>
                ` : ''}
              `;
            })}
          `;
        } else {
          // Stack segments from bottom to top
          let segmentY = rect.y + rect.height;
          return svg`
            ${bar.segments.map((segment, segIndex) => {
              const segmentHeight = (segment.value / max) * chartSize;
              segmentY -= segmentHeight;
              const hasSegmentPopup = segment.href || segment.popup || this.shouldShowAutoPopup(segment.autoPopup);
              const segRect = svg`
                <rect
                  x="${rect.x}"
                  y="${segmentY}"
                  width="${rect.width}"
                  height="${segmentHeight}"
                  fill="${segment.fill}"
                  style="cursor: ${hasSegmentPopup ? 'pointer' : 'default'}"
                  data-shape-index="${index}"
                  data-segment-index="${segIndex}"
                  @mouseenter="${(e: MouseEvent) => this.handleSegmentMouseEnter(e, index, segIndex)}"
                  @mouseleave="${() => this.handleSegmentMouseLeave(index, segIndex)}"
                  @click="${(e: MouseEvent) => this.handleSegmentClick(e, index, segIndex)}"
                />
              `;
              const segPercent = total > 0 ? (segment.value / total) * 100 : 0;
              const segShouldShowValue = this.evaluateShowCondition(segment.showValue, segment.value, segPercent);
              const segShouldShowPercent = this.evaluateShowCondition(segment.showPercent, segment.value, segPercent);
              const segValueString = this.formatValueString(segment.value, segPercent, segShouldShowValue, segShouldShowPercent);
              return svg`
                ${segment.href ? svg`
                  <a href="${segment.href}" target="${segment.target || '_self'}">
                    ${segRect}
                  </a>
                ` : segRect}
                ${segValueString ? svg`
                  <text
                    x="${rect.x + rect.width / 2}"
                    y="${segmentY + segmentHeight / 2 + 4}"
                    text-anchor="middle"
                    font-size="12"
                    fill="#fff"
                  >
                    ${segValueString}
                  </text>
                ` : ''}
              `;
            })}
          `;
        }
      } else {
        if (reverse) {
          // Stack segments from right to left (for horizontal-reverse)
          let segmentX = rect.x + rect.width;
          return svg`
            ${bar.segments.map((segment, segIndex) => {
              const segmentWidth = (segment.value / max) * chartSize;
              segmentX -= segmentWidth;
              const hasSegmentPopup = segment.href || segment.popup || this.shouldShowAutoPopup(segment.autoPopup);
              const segRect = svg`
                <rect
                  x="${segmentX}"
                  y="${rect.y}"
                  width="${segmentWidth}"
                  height="${rect.height}"
                  fill="${segment.fill}"
                  style="cursor: ${hasSegmentPopup ? 'pointer' : 'default'}"
                  data-shape-index="${index}"
                  data-segment-index="${segIndex}"
                  @mouseenter="${(e: MouseEvent) => this.handleSegmentMouseEnter(e, index, segIndex)}"
                  @mouseleave="${() => this.handleSegmentMouseLeave(index, segIndex)}"
                  @click="${(e: MouseEvent) => this.handleSegmentClick(e, index, segIndex)}"
                />
              `;
              const segPercent = total > 0 ? (segment.value / total) * 100 : 0;
              const segShouldShowValue = this.evaluateShowCondition(segment.showValue, segment.value, segPercent);
              const segShouldShowPercent = this.evaluateShowCondition(segment.showPercent, segment.value, segPercent);
              const segValueString = this.formatValueString(segment.value, segPercent, segShouldShowValue, segShouldShowPercent);
              return svg`
                ${segment.href ? svg`
                  <a href="${segment.href}" target="${segment.target || '_self'}">
                    ${segRect}
                  </a>
                ` : segRect}
                ${segValueString ? svg`
                  <text
                    x="${segmentX + segmentWidth / 2}"
                    y="${rect.y + rect.height / 2 + 4}"
                    text-anchor="middle"
                    font-size="12"
                    fill="#fff"
                  >
                    ${segValueString}
                  </text>
                ` : ''}
              `;
            })}
          `;
        } else {
          // Stack segments from left to right
          let segmentX = rect.x;
          return svg`
            ${bar.segments.map((segment, segIndex) => {
              const segmentWidth = (segment.value / max) * chartSize;
              const currentSegmentX = segmentX;
              segmentX += segmentWidth;
              const hasSegmentPopup = segment.href || segment.popup || this.shouldShowAutoPopup(segment.autoPopup);
              const segRect = svg`
                <rect
                  x="${currentSegmentX}"
                  y="${rect.y}"
                  width="${segmentWidth}"
                  height="${rect.height}"
                  fill="${segment.fill}"
                  style="cursor: ${hasSegmentPopup ? 'pointer' : 'default'}"
                  data-shape-index="${index}"
                  data-segment-index="${segIndex}"
                  @mouseenter="${(e: MouseEvent) => this.handleSegmentMouseEnter(e, index, segIndex)}"
                  @mouseleave="${() => this.handleSegmentMouseLeave(index, segIndex)}"
                  @click="${(e: MouseEvent) => this.handleSegmentClick(e, index, segIndex)}"
                />
              `;
              const segPercent = total > 0 ? (segment.value / total) * 100 : 0;
              const segShouldShowValue = this.evaluateShowCondition(segment.showValue, segment.value, segPercent);
              const segShouldShowPercent = this.evaluateShowCondition(segment.showPercent, segment.value, segPercent);
              const segValueString = this.formatValueString(segment.value, segPercent, segShouldShowValue, segShouldShowPercent);
              return svg`
                ${segment.href ? svg`
                  <a href="${segment.href}" target="${segment.target || '_self'}">
                    ${segRect}
                  </a>
                ` : segRect}
                ${segValueString ? svg`
                  <text
                    x="${currentSegmentX + segmentWidth / 2}"
                    y="${rect.y + rect.height / 2 + 4}"
                    text-anchor="middle"
                    font-size="12"
                    fill="#fff"
                  >
                    ${segValueString}
                  </text>
                ` : ''}
              `;
            })}
          `;
        }
      }
    } else {
      // Single bar (no segments)
      // Determine if any popup should show (explicit or auto)
      const hasPopup = bar.href || bar.popup || this.shouldShowAutoPopup(bar.autoPopup);

      const barRect = svg`
        <rect
          x="${rect.x}"
          y="${rect.y}"
          width="${rect.width}"
          height="${rect.height}"
          fill="${bar.fill}"
          style="cursor: ${hasPopup ? 'pointer' : 'default'}"
          data-shape-index="${index}"
          @mouseenter="${(e: MouseEvent) => this.handleBarMouseEnter(e, index)}"
          @mouseleave="${() => this.handleBarMouseLeave(index)}"
          @click="${(e: MouseEvent) => this.handleBarClick(e, index)}"
        />
      `;
      return svg`
        ${bar.href ? svg`
          <a href="${bar.href}" target="${bar.target || '_self'}">
            ${barRect}
          </a>
        ` : barRect}
      `;
    }
  }

  /**
   * Build hierarchical structure of bars and groups
   * Returns array maintaining DOM structure for group label positioning
   */
  private getBarStructure(): BarOrGroup[] {
    const structure: BarOrGroup[] = [];

    // Iterate through direct children only (not nested)
    Array.from(this.children).forEach(child => {
      if (child.tagName === 'DC-BAR-GROUP') {
        const groupEl = child as ChartBarGroup;
        const barElements = Array.from(
          groupEl.querySelectorAll('dc-bar')
        ) as ChartBar[];

        // Skip empty groups
        if (barElements.length === 0) return;

        // Pass group's bar-width and gutter to children for cascade
        const groupBars = barElements.map(bar => this.extractBarData(bar, groupEl.barWidth, groupEl.gutter));

        // Gutter cascade for the group itself
        const groupGutter = groupEl.gutter !== undefined ? groupEl.gutter : this.gutter;

        structure.push({
          label: groupEl.label,
          bars: groupBars,
          isGroup: true,
          gutter: groupGutter
        });
      } else if (child.tagName === 'DC-BAR') {
        const barEl = child as ChartBar;
        const barData = this.extractBarData(barEl);

        structure.push({
          ...barData,
          isGroup: false
        });
      }
    });

    return structure;
  }

  /**
   * Create flattened array of all bars for rendering and event handling
   * Adds group metadata to each bar while maintaining index-based ordering
   */
  private getFlattenedBars(): FlattenedBar[] {
    const structure = this.getBarStructure();
    const flattened: FlattenedBar[] = [];

    structure.forEach((item, groupIndex) => {
      if (item.isGroup) {
        item.bars.forEach((bar, barIndexInGroup) => {
          flattened.push({
            ...bar,
            groupLabel: item.label,
            groupIndex,
            barIndexInGroup
          });
        });
      } else {
        flattened.push({
          ...item,
          groupLabel: undefined,
          groupIndex: undefined,
          barIndexInGroup: undefined
        });
      }
    });

    // Resolve fill colors using the new color system
    // Priority: element fill > gradient > palette > single color > auto
    if (flattened.length > 0) {
      const elementFills = flattened.map(b => b.elementFill);
      const fillColors = this.resolveFillColors(
        flattened.length,
        elementFills,
        this.getDefaultBarFill()
      );

      // Apply resolved colors to bars
      flattened.forEach((bar, index) => {
        bar.fill = fillColors[index];
      });
    }

    return flattened;
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    this.applyPassthroughAttributes(this.getFlattenedBars());
  }

  protected renderChart(): SVGTemplateResult {
    // Build segment color map before extracting bar data
    this.buildSegmentColorMap();

    const bars = this.getFlattenedBars();
    const structure = this.getBarStructure();

    if (bars.length === 0) return svg``;

    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;
    const chartHeight = this.height - padding.top - padding.bottom;

    const values = bars.map(b => b.value);
    const max = this.getNiceMax();
    const total = values.reduce((sum, v) => sum + v, 0);

    // Log layout info
    this.log('info', 'data.barCount', `Number of bars`, bars.length);
    this.log('info', 'data.maxValue', `Maximum bar value`, max);
    this.log('info', 'data.totalValue', `Sum of all bar values`, total);
    this.log('info', 'layout.orientation', `Chart orientation`, this.orientation);
    this.log('info', 'layout.chartArea', `chartWidth=${chartWidth.toFixed(1)}, chartHeight=${chartHeight.toFixed(1)}`, { width: chartWidth, height: chartHeight });
    this.log('info', 'layout.gutter', `Default gutter spacing`, this.gutter);

    // Log bar data
    bars.forEach((bar, index) => {
      const percentage = total > 0 ? (bar.value / total) * 100 : 0;
      this.log('info', `bars[${index}]`, `"${bar.label}": value=${bar.value}, ${percentage.toFixed(1)}%${bar.groupLabel ? `, group="${bar.groupLabel}"` : ''}`, {
        label: bar.label,
        value: bar.value,
        percentage: percentage.toFixed(1) + '%',
        fill: bar.fill,
        groupLabel: bar.groupLabel || null,
        hasSegments: bar.segments ? bar.segments.length : 0
      });
    });

    let barsRendering: SVGTemplateResult;
    if (this.orientation === 'vertical') {
      barsRendering = this.renderVerticalBars(bars, structure, padding, chartWidth, chartHeight, max, total);
    } else if (this.orientation === 'horizontal') {
      barsRendering = this.renderHorizontalBars(bars, structure, padding, chartWidth, chartHeight, max, total);
    } else if (this.orientation === 'vertical-reverse') {
      barsRendering = this.renderVerticalReverseBars(bars, structure, padding, chartWidth, chartHeight, max, total);
    } else {
      barsRendering = this.renderHorizontalReverseBars(bars, structure, padding, chartWidth, chartHeight, max, total);
    }

    return svg`
      ${barsRendering}

      <!-- Axis Titles -->
      ${this.renderAxisTitle('left', padding, chartWidth, chartHeight)}
      ${this.renderAxisTitle('bottom', padding, chartWidth, chartHeight)}
      ${this.renderAxisTitle('right', padding, chartWidth, chartHeight)}
      ${this.renderAxisTitle('top', padding, chartWidth, chartHeight)}

      <!-- Legend -->
      ${this.renderLegend(this.getLegendItems())}
    `;
  }

  private renderVerticalBars(
    bars: FlattenedBar[],
    structure: BarOrGroup[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    max: number,
    total: number
  ): SVGTemplateResult {
    const { unitSizes: finalUnitWidths } = this.calculateUnitDimensions(structure, chartWidth);

    const steps = 5;

    return svg`
      <!-- Grid lines -->
      ${Array.from({ length: steps + 1 }, (_, i) => {
        const value = (max / steps) * i;
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

      <!-- Bars -->
      ${(() => {
        let barIndex = 0;
        let unitIndex = 0;
        let cumulativeX = padding.left;

        return bars.map((bar, index) => {
          const barHeight = (bar.value / max) * chartHeight;
          const y = this.height - padding.bottom - barHeight;

          // Find which unit (group or ungrouped bar) this bar belongs to
          const currentUnit = structure[unitIndex];
          const currentUnitWidth = finalUnitWidths[unitIndex];
          const currentGutter = currentUnit.isGroup ? (currentUnit.gutter ?? this.gutter) : (currentUnit.gutter ?? this.gutter);
          let x: number;
          let barWidth: number;

          // Add gutter/2 at the start of each unit
          if (barIndex === 0) {
            cumulativeX += currentGutter / 2;
          }

          if (currentUnit.isGroup) {
            const groupBarCount = currentUnit.bars.length;

            // Check if all bars in group have custom widths
            const allBarsHaveWidth = currentUnit.bars.every(b => this.parseCSSUnit(b.width) !== undefined);

            if (allBarsHaveWidth) {
              // Use individual bar widths
              const parsedWidth = this.parseCSSUnit(bar.width)!;
              barWidth = parsedWidth;
              x = cumulativeX;
              cumulativeX += barWidth;
            } else {
              // Distribute group width equally among bars
              const barWidthInGroup = currentUnitWidth / groupBarCount;
              x = cumulativeX + barIndex * barWidthInGroup;
              barWidth = barWidthInGroup;
            }

            barIndex++;
            if (barIndex >= groupBarCount) {
              barIndex = 0;
              if (!allBarsHaveWidth) {
                cumulativeX += currentUnitWidth;
              }
              cumulativeX += currentGutter / 2; // Add gutter/2 at end of group
              unitIndex++;
            }
          } else {
            x = cumulativeX;
            barWidth = currentUnitWidth;
            cumulativeX += currentUnitWidth + currentGutter / 2; // Add gutter/2 at end of bar
            barIndex = 0;
            unitIndex++;
          }

          // Bars within groups touch; no additional margins needed
          const xPos = x;
          const width = barWidth;

          const percent = total > 0 ? (bar.value / total) * 100 : 0;
          const shouldShowValue = this.evaluateShowCondition(bar.showValue, bar.value, percent);
          const shouldShowPercent = this.evaluateShowCondition(bar.showPercent, bar.value, percent);
          const valueString = this.formatValueString(bar.value, percent, shouldShowValue, shouldShowPercent);

          return svg`
            ${this.renderBarContent(bar, index, 'vertical', { x: xPos, y, width, height: barHeight }, max, chartHeight, total)}

            <!-- Value label (total for segmented bars) -->
            ${valueString ? svg`
              <text
                x="${x + barWidth / 2}"
                y="${y - 8}"
                text-anchor="middle"
                font-size="14"
                fill="#333"
              >
                ${valueString}
              </text>
            ` : ''}

            <!-- X-axis label -->
            ${bar.label && this.shouldShowLabel(index, bars.length) ? svg`
              <text
                x="${x + barWidth / 2}"
                y="${this.height - padding.bottom + 20 + this.getLabelLineOffset(index)}"
                text-anchor="middle"
                font-size="12"
                fill="#666"
              >
                ${bar.label}
              </text>
            ` : ''}
          `;
        });
      })()}

      <!-- Axes (rendered after bars so they appear on top) -->
      ${this.renderAxes(padding, 'vertical', false)}

      <!-- Y-axis labels -->
      ${Array.from({ length: steps + 1 }, (_, i) => {
        const value = (max / steps) * i;
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

      <!-- Group labels -->
      ${(() => {
        let cumulativeX = padding.left;
        return structure.map((item, unitIndex) => {
          const unitWidth = finalUnitWidths[unitIndex];
          const groupStartX = cumulativeX;
          const groupCenterX = groupStartX + unitWidth / 2;
          cumulativeX += unitWidth;

          if (item.isGroup) {
            return svg`
              <text
                x="${groupCenterX}"
                y="${this.height - padding.bottom + 40}"
                text-anchor="middle"
                font-size="13"
                font-weight="bold"
                fill="#333"
              >
                ${item.label}
              </text>
            `;
          }
          return svg``;
        });
      })()}
    `;
  }

  private renderHorizontalBars(
    bars: FlattenedBar[],
    structure: BarOrGroup[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    max: number,
    total: number
  ): SVGTemplateResult {
    // For horizontal charts, width/bar-width controls HEIGHT
    const { unitSizes: finalUnitHeights } = this.calculateUnitDimensions(structure, chartHeight);

    const steps = 5;

    return svg`
      <!-- Grid lines -->
      ${Array.from({ length: steps + 1 }, (_, i) => {
        const value = (max / steps) * i;
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

      <!-- Bars -->
      ${(() => {
        let barIndex = 0;
        let unitIndex = 0;
        let cumulativeY = padding.top;

        return bars.map((bar, index) => {
          const barWidth = (bar.value / max) * chartWidth;
          const x = padding.left;

          // Find which unit (group or ungrouped bar) this bar belongs to
          const currentUnit = structure[unitIndex];
          const currentUnitHeight = finalUnitHeights[unitIndex];
          const currentGutter = currentUnit.isGroup ? (currentUnit.gutter ?? this.gutter) : (currentUnit.gutter ?? this.gutter);
          let y: number;
          let barHeight: number;

          // Add gutter/2 at the start of each unit
          if (barIndex === 0) {
            cumulativeY += currentGutter / 2;
          }

          if (currentUnit.isGroup) {
            const groupBarCount = currentUnit.bars.length;
            const allBarsHaveHeight = currentUnit.bars.every(b => this.parseCSSUnit(b.width) !== undefined);

            if (allBarsHaveHeight) {
              const parsedHeight = this.parseCSSUnit(bar.width)!;
              barHeight = parsedHeight;
              y = cumulativeY;
              cumulativeY += barHeight;
            } else {
              const barHeightInGroup = currentUnitHeight / groupBarCount;
              y = cumulativeY + barIndex * barHeightInGroup;
              barHeight = barHeightInGroup;
            }

            barIndex++;
            if (barIndex >= groupBarCount) {
              barIndex = 0;
              if (!allBarsHaveHeight) {
                cumulativeY += currentUnitHeight;
              }
              cumulativeY += currentGutter / 2; // Add gutter/2 at end of group
              unitIndex++;
            }
          } else {
            y = cumulativeY;
            barHeight = currentUnitHeight;
            cumulativeY += currentUnitHeight + currentGutter / 2; // Add gutter/2 at end of bar
            barIndex = 0;
            unitIndex++;
          }

          // Bars within groups touch; no additional margins needed
          const yPos = y;
          const height = barHeight;

          const percent = total > 0 ? (bar.value / total) * 100 : 0;
          const shouldShowValue = this.evaluateShowCondition(bar.showValue, bar.value, percent);
          const shouldShowPercent = this.evaluateShowCondition(bar.showPercent, bar.value, percent);
          const valueString = this.formatValueString(bar.value, percent, shouldShowValue, shouldShowPercent);

          return svg`
            ${this.renderBarContent(bar, index, 'horizontal', { x, y: yPos, width: barWidth, height }, max, chartWidth, total)}

            <!-- Value label (total for segmented bars) -->
            ${valueString ? svg`
              <text
                x="${x + barWidth + 8}"
                y="${y + barHeight / 2 + 4}"
                text-anchor="start"
                font-size="14"
                fill="#333"
              >
                ${valueString}
              </text>
            ` : ''}

            <!-- Y-axis label -->
            ${bar.label && this.shouldShowLabel(index, bars.length) ? svg`
              <text
                x="${padding.left - 10 - this.getLabelLineOffset(index, 60)}"
                y="${y + barHeight / 2 + 4}"
                text-anchor="end"
                font-size="12"
                fill="#666"
              >
                ${bar.label}
              </text>
            ` : ''}
          `;
        });
      })()}

      <!-- Axes (rendered after bars so they appear on top) -->
      ${this.renderAxes(padding, 'horizontal', false)}

      <!-- X-axis labels -->
      ${Array.from({ length: steps + 1 }, (_, i) => {
        const value = (max / steps) * i;
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

      <!-- Group labels -->
      ${(() => {
        let cumulativeY = padding.top;
        return structure.map((item, unitIndex) => {
          const unitHeight = finalUnitHeights[unitIndex];
          const groupStartY = cumulativeY;
          const groupCenterY = groupStartY + unitHeight / 2;
          cumulativeY += unitHeight;

          if (item.isGroup) {
            return svg`
              <text
                x="${padding.left - 30}"
                y="${groupCenterY + 4}"
                text-anchor="end"
                font-size="13"
                font-weight="bold"
                fill="#333"
              >
                ${item.label}
              </text>
            `;
          }
          return svg``;
        });
      })()}
    `;
  }

  private renderVerticalReverseBars(
    bars: FlattenedBar[],
    structure: BarOrGroup[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    max: number,
    total: number
  ): SVGTemplateResult {
    const { unitSizes: finalUnitWidths } = this.calculateUnitDimensions(structure, chartWidth);

    const steps = 5;

    return svg`
      <!-- Grid lines -->
      ${Array.from({ length: steps + 1 }, (_, i) => {
        const value = (max / steps) * i;
        const y = padding.top + (value / max) * chartHeight;
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

      <!-- Bars -->
      ${(() => {
        let barIndex = 0;
        let unitIndex = 0;
        let cumulativeX = padding.left;

        return bars.map((bar, index) => {
          const barHeight = (bar.value / max) * chartHeight;
          const y = padding.top;

          // Find which unit (group or ungrouped bar) this bar belongs to
          const currentUnit = structure[unitIndex];
          const currentUnitWidth = finalUnitWidths[unitIndex];
          const currentGutter = currentUnit.isGroup ? (currentUnit.gutter ?? this.gutter) : (currentUnit.gutter ?? this.gutter);
          let x: number;
          let barWidth: number;

          // Add gutter/2 at the start of each unit
          if (barIndex === 0) {
            cumulativeX += currentGutter / 2;
          }

          if (currentUnit.isGroup) {
            const groupBarCount = currentUnit.bars.length;
            const allBarsHaveWidth = currentUnit.bars.every(b => this.parseCSSUnit(b.width) !== undefined);

            if (allBarsHaveWidth) {
              const parsedWidth = this.parseCSSUnit(bar.width)!;
              barWidth = parsedWidth;
              x = cumulativeX;
              cumulativeX += barWidth;
            } else {
              const barWidthInGroup = currentUnitWidth / groupBarCount;
              x = cumulativeX + barIndex * barWidthInGroup;
              barWidth = barWidthInGroup;
            }

            barIndex++;
            if (barIndex >= groupBarCount) {
              barIndex = 0;
              if (!allBarsHaveWidth) {
                cumulativeX += currentUnitWidth;
              }
              cumulativeX += currentGutter / 2; // Add gutter/2 at end of group
              unitIndex++;
            }
          } else {
            x = cumulativeX;
            barWidth = currentUnitWidth;
            cumulativeX += currentUnitWidth + currentGutter / 2; // Add gutter/2 at end of bar
            barIndex = 0;
            unitIndex++;
          }

          // Bars within groups touch; no additional margins needed
          const xPos = x;
          const width = barWidth;

          const percent = total > 0 ? (bar.value / total) * 100 : 0;
          const shouldShowValue = this.evaluateShowCondition(bar.showValue, bar.value, percent);
          const shouldShowPercent = this.evaluateShowCondition(bar.showPercent, bar.value, percent);
          const valueString = this.formatValueString(bar.value, percent, shouldShowValue, shouldShowPercent);

          return svg`
            ${this.renderBarContent(bar, index, 'vertical', { x: xPos, y, width, height: barHeight }, max, chartHeight, total, true)}

            <!-- Value label (total for segmented bars) -->
            ${valueString ? svg`
              <text
                x="${x + barWidth / 2}"
                y="${y + barHeight + 15}"
                text-anchor="middle"
                font-size="14"
                fill="#333"
              >
                ${valueString}
              </text>
            ` : ''}

            <!-- X-axis label -->
            ${bar.label && this.shouldShowLabel(index, bars.length) ? svg`
              <text
                x="${x + barWidth / 2}"
                y="${padding.top - 8 - this.getLabelLineOffset(index)}"
                text-anchor="middle"
                font-size="12"
                fill="#666"
              >
                ${bar.label}
              </text>
            ` : ''}
          `;
        });
      })()}

      <!-- Axes (rendered after bars so they appear on top) -->
      ${this.renderAxes(padding, 'vertical', true)}

      <!-- Y-axis labels -->
      ${Array.from({ length: steps + 1 }, (_, i) => {
        const value = (max / steps) * i;
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

      <!-- Group labels -->
      ${(() => {
        let cumulativeX = padding.left;
        return structure.map((item, unitIndex) => {
          const unitWidth = finalUnitWidths[unitIndex];
          const groupStartX = cumulativeX;
          const groupCenterX = groupStartX + unitWidth / 2;
          cumulativeX += unitWidth;

          if (item.isGroup) {
            return svg`
              <text
                x="${groupCenterX}"
                y="${padding.top - 28}"
                text-anchor="middle"
                font-size="13"
                font-weight="bold"
                fill="#333"
              >
                ${item.label}
              </text>
            `;
          }
          return svg``;
        });
      })()}
    `;
  }

  private renderHorizontalReverseBars(
    bars: FlattenedBar[],
    structure: BarOrGroup[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    max: number,
    total: number
  ): SVGTemplateResult {
    // For horizontal charts, width/bar-width controls HEIGHT
    const { unitSizes: finalUnitHeights } = this.calculateUnitDimensions(structure, chartHeight);

    const steps = 5;

    return svg`
      <!-- Grid lines -->
      ${Array.from({ length: steps + 1 }, (_, i) => {
        const value = (max / steps) * i;
        const x = this.width - padding.right - (value / max) * chartWidth;
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

      <!-- Bars -->
      ${(() => {
        let barIndex = 0;
        let unitIndex = 0;
        let cumulativeY = padding.top;

        return bars.map((bar, index) => {
          const barWidth = (bar.value / max) * chartWidth;
          const x = this.width - padding.right - barWidth;

          // Find which unit (group or ungrouped bar) this bar belongs to
          const currentUnit = structure[unitIndex];
          const currentUnitHeight = finalUnitHeights[unitIndex];
          let y: number;
          let barHeight: number;

          if (currentUnit.isGroup) {
            const groupBarCount = currentUnit.bars.length;
            const allBarsHaveHeight = currentUnit.bars.every(b => this.parseCSSUnit(b.width) !== undefined);

            if (allBarsHaveHeight) {
              const parsedHeight = this.parseCSSUnit(bar.width)!;
              barHeight = parsedHeight;
              y = cumulativeY;
              cumulativeY += barHeight;
            } else {
              const barHeightInGroup = currentUnitHeight / groupBarCount;
              y = cumulativeY + barIndex * barHeightInGroup;
              barHeight = barHeightInGroup;
            }

            barIndex++;
            if (barIndex >= groupBarCount) {
              barIndex = 0;
              if (!allBarsHaveHeight) {
                cumulativeY += currentUnitHeight;
              }
              unitIndex++;
            }
          } else {
            y = cumulativeY;
            barHeight = currentUnitHeight;
            cumulativeY += currentUnitHeight;
            barIndex = 0;
            unitIndex++;
          }

          // For ungrouped bars, add margins; for grouped bars, no margins
          const isGrouped = bar.groupLabel !== undefined;
          const yPos = isGrouped ? y : y + 5;
          const height = isGrouped ? barHeight : barHeight - 10;

          const percent = total > 0 ? (bar.value / total) * 100 : 0;
          const shouldShowValue = this.evaluateShowCondition(bar.showValue, bar.value, percent);
          const shouldShowPercent = this.evaluateShowCondition(bar.showPercent, bar.value, percent);
          const valueString = this.formatValueString(bar.value, percent, shouldShowValue, shouldShowPercent);

          return svg`
            ${this.renderBarContent(bar, index, 'horizontal', { x, y: yPos, width: barWidth, height }, max, chartWidth, total, true)}

            <!-- Value label (total for segmented bars) -->
            ${valueString ? svg`
              <text
                x="${x - 8}"
                y="${y + barHeight / 2 + 4}"
                text-anchor="end"
                font-size="14"
                fill="#333"
              >
                ${valueString}
              </text>
            ` : ''}

            <!-- Y-axis label -->
            ${bar.label && this.shouldShowLabel(index, bars.length) ? svg`
              <text
                x="${this.width - padding.right + 10 + this.getLabelLineOffset(index, 60)}"
                y="${y + barHeight / 2 + 4}"
                text-anchor="start"
                font-size="12"
                fill="#666"
              >
                ${bar.label}
              </text>
            ` : ''}
          `;
        });
      })()}

      <!-- Axes (rendered after bars so they appear on top) -->
      ${this.renderAxes(padding, 'horizontal', true)}

      <!-- X-axis labels -->
      ${Array.from({ length: steps + 1 }, (_, i) => {
        const value = (max / steps) * i;
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

      <!-- Group labels -->
      ${(() => {
        let cumulativeY = padding.top;
        return structure.map((item, unitIndex) => {
          const unitHeight = finalUnitHeights[unitIndex];
          const groupStartY = cumulativeY;
          const groupCenterY = groupStartY + unitHeight / 2;
          cumulativeY += unitHeight;

          if (item.isGroup) {
            return svg`
              <text
                x="${this.width - padding.right + 30}"
                y="${groupCenterY + 4}"
                text-anchor="start"
                font-size="13"
                font-weight="bold"
                fill="#333"
              >
                ${item.label}
              </text>
            `;
          }
          return svg``;
        });
      })()}
    `;
  }

  /**
   * Determine if auto-popup should be shown for a shape.
   * @param elementAutoPopup The auto-popup setting from the element (undefined = inherit, true/false = explicit)
   * @returns true if auto-popup should be shown
   */
  private shouldShowAutoPopup(elementAutoPopup?: boolean): boolean {
    // Element-level setting takes precedence
    if (elementAutoPopup !== undefined) {
      return elementAutoPopup;
    }
    // Otherwise inherit from chart
    return this.autoPopup;
  }

  /**
   * Generate default popup content for a bar.
   * @param bar The bar data
   * @param totalValue The total of all bar values
   * @returns HTML string for the popup
   */
  private generateBarPopupContent(bar: { label: string; value: number; groupLabel?: string }, totalValue: number): string {
    const percentage = totalValue > 0 ? ((bar.value / totalValue) * 100).toFixed(1) : '0.0';
    let content = `<strong>${bar.label}</strong>`;
    if (bar.groupLabel) {
      content += `<br>${bar.groupLabel}`;
    }
    content += `<br>Value: ${bar.value}<br>${percentage}%`;
    return content;
  }

  /**
   * Generate default popup content for a segment within a stacked bar.
   * @param segment The segment data
   * @param bar The parent bar data
   * @param barTotal The total value of the parent bar (sum of all segments)
   * @returns HTML string for the popup
   */
  private generateSegmentPopupContent(
    segment: { label: string; value: number },
    bar: { label: string; groupLabel?: string },
    barTotal: number
  ): string {
    const percentOfBar = barTotal > 0 ? ((segment.value / barTotal) * 100).toFixed(1) : '0.0';
    let content = `<strong>${segment.label}</strong>`;
    content += `<br>${bar.label}`;
    if (bar.groupLabel) {
      content += ` (${bar.groupLabel})`;
    }
    content += `<br>Value: ${segment.value}<br>${percentOfBar}% of bar`;
    return content;
  }

  private handleBarMouseEnter(e: MouseEvent, index: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[index];

    // Explicit popup takes precedence over auto-popup
    if (bar.popup?.trigger === 'hover') {
      this.showPopup(bar.popup.content, e.clientX, e.clientY);
    } else if (!bar.popup && this.shouldShowAutoPopup(bar.autoPopup)) {
      // Show auto-popup (auto-popup always uses hover trigger)
      const totalValue = bars.reduce((sum, b) => sum + b.value, 0);
      const content = this.generateBarPopupContent(bar, totalValue);
      this.showPopup(content, e.clientX, e.clientY);
    }
  }

  private handleBarMouseLeave(index: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[index];

    // Hide popup if it's a hover-triggered popup (explicit or auto) and not clicked
    const isHoverPopup = bar.popup?.trigger === 'hover' ||
      (!bar.popup && this.shouldShowAutoPopup(bar.autoPopup));

    if (isHoverPopup && this.clickedBarIndex !== index) {
      this.hidePopup();
    }
  }

  private handleBarClick(e: MouseEvent, index: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[index];

    // Only explicit click-triggered popups respond to clicks
    if (bar.popup?.trigger === 'click') {
      if (this.clickedBarIndex === index) {
        // Clicking same bar again - hide popup
        this.hidePopup();
        this.clickedBarIndex = -1;
      } else {
        // Show popup for clicked bar
        this.clickedBarIndex = index;
        this.showPopup(bar.popup.content, e.clientX, e.clientY);
      }
    } else {
      // Clicked bar without click-popup - clear any clicked state
      this.hidePopup();
      this.clickedBarIndex = -1;
    }
  }

  private handleSegmentMouseEnter(e: MouseEvent, barIndex: number, segmentIndex: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[barIndex];
    const segment = bar.segments?.[segmentIndex];
    if (!segment) return;

    // Explicit popup takes precedence over auto-popup
    if (segment.popup?.trigger === 'hover') {
      this.showPopup(segment.popup.content, e.clientX, e.clientY);
    } else if (!segment.popup && this.shouldShowAutoPopup(segment.autoPopup)) {
      // Show auto-popup (auto-popup always uses hover trigger)
      const barTotal = bar.segments?.reduce((sum, s) => sum + s.value, 0) || 0;
      const content = this.generateSegmentPopupContent(segment, bar, barTotal);
      this.showPopup(content, e.clientX, e.clientY);
    }
  }

  private handleSegmentMouseLeave(barIndex: number, segmentIndex: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[barIndex];
    const segment = bar.segments?.[segmentIndex];
    if (!segment) return;

    // Hide popup if it's a hover-triggered popup (explicit or auto)
    const isHoverPopup = segment.popup?.trigger === 'hover' ||
      (!segment.popup && this.shouldShowAutoPopup(segment.autoPopup));

    if (isHoverPopup) {
      this.hidePopup();
    }
  }

  private handleSegmentClick(e: MouseEvent, barIndex: number, segmentIndex: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[barIndex];
    const segment = bar.segments?.[segmentIndex];
    if (!segment) return;

    // Only explicit click-triggered popups respond to clicks
    if (segment.popup?.trigger === 'click') {
      // For segments, we use a combined key for tracking clicked state
      const clickKey = barIndex * 1000 + segmentIndex;
      if (this.clickedBarIndex === clickKey) {
        // Clicking same segment again - hide popup
        this.hidePopup();
        this.clickedBarIndex = -1;
      } else {
        // Show popup for clicked segment
        this.clickedBarIndex = clickKey;
        this.showPopup(segment.popup.content, e.clientX, e.clientY);
      }
    } else {
      // Clicked segment without click-popup - clear any clicked state
      this.hidePopup();
      this.clickedBarIndex = -1;
    }
  }

  /**
   * Get legend items for dimension calculation.
   * For stacked bar charts, returns unique segment labels with their colors.
   * For regular bar charts, returns bar data formatted for legend rendering.
   */
  protected override getLegendItems(): Array<{ label: string; color: string; value: number }> {
    // Ensure segment color map is built
    if (this.segmentColorMap.size === 0) {
      this.buildSegmentColorMap();
    }

    const bars = this.getFlattenedBars();

    // Check if any bar has segments (stacked bar chart)
    const hasSegments = bars.some(bar => bar.segments && bar.segments.length > 0);

    if (hasSegments) {
      // For stacked bars, return unique segment labels with their total values
      const segmentTotals = new Map<string, number>();

      bars.forEach(bar => {
        if (bar.segments) {
          bar.segments.forEach(segment => {
            const current = segmentTotals.get(segment.label) || 0;
            segmentTotals.set(segment.label, current + segment.value);
          });
        }
      });

      // Return legend items in the order they appear in segmentColorMap
      const legendItems: Array<{ label: string; color: string; value: number }> = [];
      this.segmentColorMap.forEach((color, label) => {
        legendItems.push({
          label,
          color,
          value: segmentTotals.get(label) || 0
        });
      });

      return legendItems;
    }

    // Regular bar chart - return bar labels
    return bars.map(bar => ({
      label: bar.label,
      color: bar.fill,
      value: bar.value
    }));
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'dc-bar-chart': BarChart;
  }
}
