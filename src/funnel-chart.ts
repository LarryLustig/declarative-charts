import { customElement, property } from 'lit/decorators.js';
import { svg, SVGTemplateResult } from 'lit';
import { BaseChart, type ShowCondition, type FocusableElement } from './base-chart.js';
import type { LegendItem } from './chart-legend.js';
import type { ChartFunnelStage } from './chart-funnel-stage.js';
import type { ChartPopup } from './chart-popup.js';
import { analyzeFunnel, type StageData as InsightStageData } from './accessibility/index.js';

/**
 * Funnel chart component that renders stages as narrowing trapezoids
 *
 * @element dc-funnel-chart
 *
 * @attr {number} width - Width of the chart in pixels (default: 600)
 * @attr {number} height - Height of the chart in pixels (default: 400)
 * @attr {string} segment-height - Height mode: omit for equal heights, use values like "50px"/"2rem" for fixed heights, "value" for proportional scaling, "log-value" for logarithmic scaling, or "value 50px 300px" to include min/max constraints
 * @attr {string} segment-min-height - Minimum height for any segment (e.g., "50px")
 * @attr {string} segment-max-height - Maximum height for any segment (e.g., "300px")
 * @attr {string} chevron - Chevron depth for V-shaped segments: use values like "20px", "2rem", or "10%" (percentage of segment width). Omit or use "0" for straight edges.
 * @attr {number} funnel-factor - Percentage controlling funnel narrowing (default: 70). Positive values narrow from top to bottom (e.g., 70 = bottom is 70% of top width). Negative values narrow from bottom to top (e.g., -70 = top is 70% of bottom width).
 * @attr {string} palette - Palette for stage colors. Can be an ID of a user-defined <dc-palette> or a built-in palette name (default: cool-to-warm gradient).
 * @attr {string} stroke - Shorthand for stroke color and width (e.g., "2 #333" or "#333 2"). Overridden by explicit stroke-color/stroke-width.
 * @attr {string} stroke-color - Stroke color for stage borders (default: #e0e0e0). Can be overridden per stage.
 * @attr {number} stroke-width - Stroke width for stage borders in pixels (default: 0). Can be overridden per stage.
 * @attr {boolean} flat-top - When true and chevron is set, makes the top edge of the first segment horizontal (default: false)
 * @attr {boolean} flat-bottom - When true and chevron is set, makes the bottom edge of the last segment horizontal (default: false)
 *
 * @slot - Child elements: dc-title and dc-funnel-stage elements
 *
 * @example
 * <dc-funnel-chart width="600" height="400">
 *   <dc-title>Sales Funnel</dc-title>
 *   <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
 *   <dc-funnel-stage value="500" label="Leads"></dc-funnel-stage>
 *   <dc-funnel-stage value="100" label="Customers"></dc-funnel-stage>
 * </dc-funnel-chart>
 *
 * @example
 * <dc-funnel-chart stroke="2 #333">
 *   <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
 *   <dc-funnel-stage value="500" label="Leads" stroke="4 red"></dc-funnel-stage>
 * </dc-funnel-chart>
 *
 * @example
 * <dc-funnel-chart stroke-color="#333" stroke-width="2">
 *   <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
 *   <dc-funnel-stage value="500" label="Leads" stroke-width="4"></dc-funnel-stage>
 * </dc-funnel-chart>
 */
@customElement('dc-funnel-chart')
export class FunnelChart extends BaseChart {
  @property({ type: String, attribute: 'segment-height' })
  segmentHeight?: string;

  @property({ type: String, attribute: 'segment-min-height' })
  segmentMinHeight?: string;

  @property({ type: String, attribute: 'segment-max-height' })
  segmentMaxHeight?: string;

  @property({ type: String })
  chevron?: string;

  @property({ type: Number, attribute: 'funnel-factor' })
  funnelFactor?: number;

  // Note: stroke-color and stroke-width are inherited from BaseChart.

  @property({ type: Boolean, attribute: 'flat-top' })
  flatTop = false;

  @property({ type: Boolean, attribute: 'flat-bottom' })
  flatBottom = false;

  private clickedStageIndex = -1;


  private getStages(): Array<{
    value: number;
    label: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    showValue: ShowCondition;
    showLabel: ShowCondition;
    showPercent: ShowCondition;
    popup?: { content: string; trigger: string };
    autoPopup?: boolean;
    passthroughAttrs?: Record<string, string>;
    // Pattern properties
    pattern?: string;
    patternStroke?: string;
    patternFill?: string;
    patternScale?: number;
    valueFormat?: string;
  }> {
    const stageElements = Array.from(
      this.querySelectorAll('dc-funnel-stage')
    ) as ChartFunnelStage[];

    // Known attributes that are handled by the component (base attrs handled by BaseShape)
    const knownAttrs = new Set(['value', 'show-value', 'show-label', 'show-percent']);

    return stageElements.map(stage => {
      // Capture passthrough attributes
      const passthroughAttrs = stage.getPassthroughAttributes(knownAttrs);

      // Get popup element if present
      const popupEl = stage.querySelector('dc-popup') as ChartPopup | null;

      // Inherit show properties from chart if not explicitly set on stage
      const showValue = stage.hasAttribute('show-value') ? stage.showValue! : this.showValue;
      const showLabel = stage.hasAttribute('show-label') ? stage.showLabel! : this.showLabel;
      const showPercent = stage.hasAttribute('show-percent') ? stage.showPercent! : this.showPercent;

      // Get effective fill (prefers 'fill' over deprecated 'color')
      const effectiveFill = stage.getEffectiveFill();

      return {
        value: stage.value,
        label: stage.label,
        fill: effectiveFill || undefined,
        stroke: stage.stroke || undefined,
        strokeWidth: stage.strokeWidth,
        showValue,
        showLabel,
        showPercent,
        popup: popupEl
          ? { content: popupEl.content, trigger: popupEl.trigger }
          : undefined,
        autoPopup: stage.autoPopup,
        passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined,
        // Pattern properties
        pattern: stage.pattern,
        patternStroke: stage.patternStroke,
        patternFill: stage.patternFill,
        patternScale: stage.patternScale,
        valueFormat: stage.valueFormat
      };
    });
  }

  /**
   * Generate a cool-to-warm color gradient (blue to red).
   * This is the default color scheme for funnel charts when no colors are specified.
   * @param count Number of colors to generate
   * @returns Array of color strings in HSL format
   */
  private generateCoolToWarmColors(count: number): string[] {
    const colors: string[] = [];

    for (let i = 0; i < count; i++) {
      // Hue ranges from 240 (blue) to 0 (red)
      // We go: blue (240) -> cyan (180) -> green (120) -> yellow (60) -> red (0)
      const hue = 240 - (i / (count - 1 || 1)) * 240;
      // Saturation at 70% for vibrant but not overwhelming colors
      const saturation = 70;
      // Lightness at 55% for good visibility
      const lightness = 55;

      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }

    return colors;
  }

  /**
   * Parse the chevron value and convert it to pixels
   * @param width The reference width for percentage calculations
   * @returns The chevron depth in pixels, or 0 if not set
   */
  private parseChevronValue(width: number): number {
    if (!this.chevron) return 0;

    const trimmed = this.chevron.trim();
    if (trimmed === '0' || trimmed === '') return 0;

    let result: number;
    let parseMode: string;

    // Check for percentage
    if (trimmed.endsWith('%')) {
      const percent = parseFloat(trimmed);
      if (!isNaN(percent)) {
        result = (percent / 100) * width;
        parseMode = `percentage: ${percent}% of ${width.toFixed(1)} = ${result.toFixed(1)}`;
        this.log('info', 'chevron.parse', parseMode, result);
        return result;
      }
    }

    // Check for rem (convert to pixels, assuming 16px = 1rem)
    if (trimmed.endsWith('rem')) {
      const rem = parseFloat(trimmed);
      if (!isNaN(rem)) {
        result = rem * 16;
        parseMode = `rem: ${rem}rem × 16 = ${result}px`;
        this.log('info', 'chevron.parse', parseMode, result);
        return result;
      }
    }

    // Otherwise, parse as pixels (with or without 'px' suffix)
    const numeric = parseFloat(trimmed);
    if (!isNaN(numeric)) {
      parseMode = `pixels: ${trimmed} = ${numeric}px`;
      this.log('info', 'chevron.parse', parseMode, numeric);
      return numeric;
    }

    this.log('warning', 'chevron.parse', `Could not parse chevron value "${trimmed}", defaulting to 0`, 0);
    return 0;
  }

  /**
   * Calculate the height for each segment based on the segment-height mode
   * @param stages Array of stage data
   * @param chartHeight Total available height for all segments
   * @returns Array of heights for each segment
   */
  private calculateSegmentHeights(
    stages: Array<{ value: number; label: string; color?: string }>,
    chartHeight: number
  ): number[] {
    // Parse segment-height to extract mode and optional min/max
    let mode = '';
    let minFromAttr: number | undefined;
    let maxFromAttr: number | undefined;

    if (this.segmentHeight) {
      const parts = this.segmentHeight.trim().split(/\s+/);
      mode = parts[0].toLowerCase();

      // If there are additional parts, they are min and max
      if (parts.length >= 2) {
        minFromAttr = parseFloat(parts[1]);
      }
      if (parts.length >= 3) {
        maxFromAttr = parseFloat(parts[2]);
      }
    }

    // Get min/max from separate attributes (combined format takes precedence)
    const minHeight = minFromAttr ?? (this.segmentMinHeight ? parseFloat(this.segmentMinHeight) : undefined);
    const maxHeight = maxFromAttr ?? (this.segmentMaxHeight ? parseFloat(this.segmentMaxHeight) : undefined);

    // Calculate initial heights based on mode
    let heights: number[];
    let heightMode: string;

    if (!mode) {
      // Default: equal heights
      const equalHeight = chartHeight / stages.length;
      heights = stages.map(() => equalHeight);
      heightMode = 'equal';
    } else if (mode === 'value') {
      // Proportional to value
      const totalValue = stages.reduce((sum, stage) => sum + stage.value, 0);
      if (totalValue === 0) {
        // Fallback to equal heights if total is 0
        const equalHeight = chartHeight / stages.length;
        heights = stages.map(() => equalHeight);
        heightMode = 'equal (total=0 fallback)';
      } else {
        heights = stages.map(stage => (stage.value / totalValue) * chartHeight);
        heightMode = 'proportional (value)';
      }
    } else if (mode === 'log-value') {
      // Logarithmic scaling - use log(value + 1) to handle 0 and small values
      const logValues = stages.map(stage => Math.log10(stage.value + 1));
      const totalLog = logValues.reduce((sum, logVal) => sum + logVal, 0);
      if (totalLog === 0) {
        // Fallback to equal heights
        const equalHeight = chartHeight / stages.length;
        heights = stages.map(() => equalHeight);
        heightMode = 'equal (log=0 fallback)';
      } else {
        heights = logValues.map(logVal => (logVal / totalLog) * chartHeight);
        heightMode = 'logarithmic (log-value)';
      }
    } else {
      // Fixed height value (e.g., "50px", "2rem", etc.)
      // Parse the numeric value from the mode string
      const numericValue = parseFloat(mode);
      if (!isNaN(numericValue)) {
        heights = stages.map(() => numericValue);
        heightMode = `fixed (${numericValue}px)`;
      } else {
        // Fallback to equal heights if mode is not recognized
        const equalHeight = chartHeight / stages.length;
        heights = stages.map(() => equalHeight);
        heightMode = 'equal (unrecognized mode fallback)';
      }
    }

    // Log the height calculation
    this.log('info', 'segmentHeights.mode', `Height calculation mode: ${heightMode}`, heightMode);
    this.log('info', 'segmentHeights.chartHeight', `Available height for segments`, chartHeight);

    // Apply min/max constraints
    let constraintsApplied = 0;
    if (minHeight !== undefined || maxHeight !== undefined) {
      heights = heights.map(h => {
        let constrainedHeight = h;
        if (minHeight !== undefined && !isNaN(minHeight) && h < minHeight) {
          constrainedHeight = minHeight;
          constraintsApplied++;
        }
        if (maxHeight !== undefined && !isNaN(maxHeight) && h > maxHeight) {
          constrainedHeight = maxHeight;
          constraintsApplied++;
        }
        return constrainedHeight;
      });

      if (minHeight !== undefined) {
        this.log('info', 'segmentHeights.minHeight', `Minimum height constraint`, minHeight);
      }
      if (maxHeight !== undefined) {
        this.log('info', 'segmentHeights.maxHeight', `Maximum height constraint`, maxHeight);
      }
      if (constraintsApplied > 0) {
        this.log('info', 'segmentHeights.constrained', `${constraintsApplied} segment(s) hit min/max constraints`, constraintsApplied);
      }
    }

    return heights;
  }

  /**
   * Calculate layout for all stages. Single source of truth for rendering and legend.
   */
  private calculateStageLayout(): {
    stages: Array<{
      index: number;
      label: string;
      value: number;
      y: number;
      height: number;
      topWidth: number;
      bottomWidth: number;
      topLeft: number;
      topRight: number;
      bottomLeft: number;
      bottomRight: number;
      fillColor: string;
      originalColor: string;  // Original solid color for legend (fillColor may be pattern URL)
      strokeColor: string;
      strokeWidth: number;
      showValue: ShowCondition;
      showLabel: ShowCondition;
      showPercent: ShowCondition;
      popup?: { content: string; trigger: string };
      autoPopup?: boolean;
      passthroughAttrs?: Record<string, string>;
      valueFormat?: string;
    }>;
    padding: { top: number; right: number; bottom: number; left: number };
    chartWidth: number;
    chartHeight: number;
    total: number;
    funnelFactor: number;
    topWidth: number;
    bottomWidth: number;
    widthReduction: number;
    chevronDepth: number;
    chartCenterX: number;
    heightMode: string;
  } | null {
    const stagesData = this.getStages();
    if (stagesData.length === 0) return null;

    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;
    const chartHeight = this.height - padding.top - padding.bottom;

    // Calculate total for percentage calculations
    const total = stagesData.reduce((sum, stage) => sum + stage.value, 0);

    // Determine base colors using palette system
    let baseColors: string[];
    const paletteColors = this.getPaletteColors(stagesData.length, 'fill');
    if (paletteColors) {
      baseColors = paletteColors;
    } else {
      // Default to cool-to-warm gradient for funnel charts
      baseColors = this.generateCoolToWarmColors(stagesData.length);
    }

    // Clear used patterns before resolving fills
    this.clearUsedPatterns();

    // Prepare elements for pattern-aware fill resolution
    const elementsForResolution = stagesData.map((s, i) => ({
      fill: s.fill,
      label: s.label,
      value: s.value,
      pattern: s.pattern,
      patternStroke: s.patternStroke,
      patternFill: s.patternFill,
      patternScale: s.patternScale,
      defaultColor: baseColors[i]
    }));

    // Resolve fills with pattern support
    const resolvedFills = this.resolveFillsWithPatterns(elementsForResolution);

    // Extract fill colors and original colors for legend
    const fillColors = resolvedFills.map(r => r.fill);
    const originalColors = resolvedFills.map(r => r.originalFill);

    // Get effective stroke from shorthand or explicit attributes (default: no border)
    const effectiveStroke = this.getEffectiveStroke('#e0e0e0', 0);

    // Resolve stroke colors for each element
    const elementStrokes = stagesData.map(s => s.stroke);
    const strokeColors = this.resolveStrokeColors(stagesData.length, elementStrokes, undefined, effectiveStroke.color);
    const defaultStrokeWidth = effectiveStroke.width;

    // Parse height mode
    let heightMode = 'equal';
    if (this.segmentHeight) {
      const mode = this.segmentHeight.trim().split(/\s+/)[0].toLowerCase();
      if (mode === 'value') heightMode = 'proportional';
      else if (mode === 'log-value') heightMode = 'logarithmic';
      else if (!isNaN(parseFloat(mode))) heightMode = 'fixed (' + mode + ')';
    }

    // Calculate heights for each segment
    const segmentHeights = this.calculateSegmentHeights(stagesData, chartHeight);

    // Calculate funnel factor and widths
    const factor = this.funnelFactor ?? 70;
    let topWidth: number;
    let bottomWidth: number;

    if (factor >= 0) {
      topWidth = chartWidth;
      bottomWidth = chartWidth * (factor / 100);
    } else {
      bottomWidth = chartWidth;
      topWidth = chartWidth * (Math.abs(factor) / 100);
    }

    const widthReduction = (topWidth - bottomWidth) / stagesData.length;

    // Calculate chevron depth
    const avgWidth = (topWidth + bottomWidth) / 2;
    const chevronDepth = this.parseChevronValue(avgWidth);

    // Calculate center X accounting for asymmetric left/right padding
    const chartCenterX = padding.left + chartWidth / 2;

    // Log layout info
    this.log('info', 'data.stageCount', `Number of stages`, stagesData.length);
    this.log('info', 'data.totalValue', `Sum of all stage values`, total);
    this.log('info', 'layout.chartArea', `chartWidth=${chartWidth.toFixed(1)}, chartHeight=${chartHeight.toFixed(1)}`, { width: chartWidth, height: chartHeight });
    this.log('info', 'layout.heightMode', `Segment height mode`, heightMode);
    this.log('info', 'layout.funnelFactor', `Funnel factor (${factor >= 0 ? 'narrows down' : 'narrows up'})`, factor);
    this.log('info', 'layout.topWidth', `Width at top of funnel`, topWidth);
    this.log('info', 'layout.bottomWidth', `Width at bottom of funnel`, bottomWidth);
    this.log('info', 'layout.widthReduction', `Width reduction per stage`, widthReduction);
    this.log('info', 'layout.chevronDepth', `Chevron depth in pixels`, chevronDepth);
    this.log('info', 'layout.centerX', `Horizontal center of funnel`, chartCenterX);

    // Build stage data with positions
    let cumulativeY = padding.top;
    const stages = stagesData.map((stage, index) => {
      const y = cumulativeY;
      let stageHeight = segmentHeights[index];

      // When flat-top is enabled with chevron, the first segment has a flat top
      if (index === 0 && chevronDepth > 0 && this.flatTop) {
        stageHeight = stageHeight - chevronDepth;
      }

      cumulativeY += stageHeight;

      // Width at top and bottom of this stage
      const stageTopWidth = topWidth - (index * widthReduction);
      const stageBottomWidth = topWidth - ((index + 1) * widthReduction);

      // Center the trapezoid horizontally within the chart area
      const topLeft = chartCenterX - stageTopWidth / 2;
      const topRight = chartCenterX + stageTopWidth / 2;
      const bottomLeft = chartCenterX - stageBottomWidth / 2;
      const bottomRight = chartCenterX + stageBottomWidth / 2;

      const percentage = total > 0 ? (stage.value / total) * 100 : 0;
      this.log('info', `stages[${index}]`, `"${stage.label}": value=${stage.value}, ${percentage.toFixed(1)}%, y=${y.toFixed(1)}, height=${stageHeight.toFixed(1)}`, {
        label: stage.label,
        value: stage.value,
        percentage: percentage.toFixed(1) + '%',
        y: y.toFixed(1),
        height: stageHeight.toFixed(1),
        topWidth: stageTopWidth.toFixed(1),
        bottomWidth: stageBottomWidth.toFixed(1)
      });

      return {
        index,
        label: stage.label,
        value: stage.value,
        y,
        height: stageHeight,
        topWidth: stageTopWidth,
        bottomWidth: stageBottomWidth,
        topLeft,
        topRight,
        bottomLeft,
        bottomRight,
        fillColor: fillColors[index],
        originalColor: originalColors[index],
        strokeColor: strokeColors[index],
        strokeWidth: stage.strokeWidth ?? defaultStrokeWidth,
        showValue: stage.showValue,
        showLabel: stage.showLabel,
        showPercent: stage.showPercent,
        popup: stage.popup,
        autoPopup: stage.autoPopup,
        passthroughAttrs: stage.passthroughAttrs,
        valueFormat: stage.valueFormat
      };
    });

    return {
      stages,
      padding,
      chartWidth,
      chartHeight,
      total,
      funnelFactor: factor,
      topWidth,
      bottomWidth,
      widthReduction,
      chevronDepth,
      chartCenterX,
      heightMode
    };
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    this.applyPassthroughAttributes(this.getStages());
  }

  protected renderChart(): SVGTemplateResult {
    const layout = this.calculateStageLayout();
    if (!layout) return svg``;

    const { stages, total, chevronDepth, chartCenterX } = layout;

    return svg`
      ${this.renderDefs()}

      <!-- Funnel stages -->
      ${stages.map((stage) => {
        const y = stage.y;
        const nextY = y + stage.height;
        const { topLeft, topRight, bottomLeft, bottomRight } = stage;

        // Use originalColor for text contrast (fillColor may be pattern URL)
        const textColor = this.getContrastingTextColor(stage.originalColor);

        // Create polygon points based on whether chevron is enabled
        let polygonPoints: string;
        if (chevronDepth > 0) {
          // Determine if this segment should have flat top or bottom
          const isFirstSegment = stage.index === 0;
          const isLastSegment = stage.index === stages.length - 1;
          const useFlatTop = isFirstSegment && this.flatTop;
          const useFlatBottom = isLastSegment && this.flatBottom;

          if (useFlatTop && useFlatBottom) {
            // Both flat: simple trapezoid
            polygonPoints = `${topLeft},${y} ${topRight},${y} ${bottomRight},${nextY} ${bottomLeft},${nextY}`;
          } else if (useFlatTop) {
            // Flat top, chevron bottom (5 points)
            polygonPoints = [
              `${topLeft},${y}`,
              `${topRight},${y}`,
              `${bottomRight},${nextY}`,
              `${chartCenterX},${nextY + chevronDepth}`,
              `${bottomLeft},${nextY}`
            ].join(' ');
          } else if (useFlatBottom) {
            // Chevron top, flat bottom (5 points)
            polygonPoints = [
              `${topLeft},${y}`,
              `${chartCenterX},${y + chevronDepth}`,
              `${topRight},${y}`,
              `${bottomRight},${nextY}`,
              `${bottomLeft},${nextY}`
            ].join(' ');
          } else {
            // Full chevron shape (6 points)
            polygonPoints = [
              `${topLeft},${y}`,
              `${chartCenterX},${y + chevronDepth}`,
              `${topRight},${y}`,
              `${bottomRight},${nextY}`,
              `${chartCenterX},${nextY + chevronDepth}`,
              `${bottomLeft},${nextY}`
            ].join(' ');
          }
        } else {
          // Four-point trapezoid shape (default)
          polygonPoints = `${topLeft},${y} ${topRight},${y} ${bottomRight},${nextY} ${bottomLeft},${nextY}`;
        }

        // Calculate text position based on visual bounds of the shape
        const isFirstSegment = stage.index === 0;
        const isLastSegment = stage.index === stages.length - 1;
        const hasChevronTop = chevronDepth > 0 && !(isFirstSegment && this.flatTop);
        const hasChevronBottom = chevronDepth > 0 && !(isLastSegment && this.flatBottom);

        // Visual bounds depend on whether chevron points are present
        const visualTop = y;
        const visualBottom = hasChevronBottom ? nextY + chevronDepth : nextY;
        const visualHeight = visualBottom - visualTop;
        const textCenterY = visualTop + visualHeight / 2;

        const hasAnyChevron = hasChevronTop || hasChevronBottom;

        // Calculate percentage and evaluate show conditions
        const percent = total > 0 ? (stage.value / total) * 100 : 0;
        const shouldShowValue = this.evaluateShowCondition(stage.showValue, stage.value, percent);
        const shouldShowLabel = this.evaluateShowCondition(stage.showLabel, stage.value, percent);
        const shouldShowPercent = this.evaluateShowCondition(stage.showPercent, stage.value, percent);
        const valueString = this.formatValueString(stage.value, percent, shouldShowValue, shouldShowPercent, stage.valueFormat);

        // Calculate text positions based on what's being shown
        let labelY: number;
        let valueY: number;
        const hasValueString = valueString !== null;

        if (shouldShowLabel && hasValueString) {
          labelY = hasAnyChevron ? textCenterY + 5 : textCenterY - 10;
          valueY = hasAnyChevron ? textCenterY + 25 : textCenterY + 10;
        } else {
          labelY = hasAnyChevron ? textCenterY + 12 : textCenterY;
          valueY = hasAnyChevron ? textCenterY + 12 : textCenterY;
        }

        // When flat-top is enabled, shift text to account for reduced height
        if (isFirstSegment && chevronDepth > 0 && this.flatTop) {
          labelY -= chevronDepth / 2;
          valueY -= chevronDepth / 2;
        }

        // Determine if any popup should show (explicit or auto)
        const hasPopup = stage.popup || this.shouldShowAutoPopup(stage.autoPopup);

        return svg`
          <!-- Trapezoid/Chevron shape -->
          <polygon
            points="${polygonPoints}"
            fill="${stage.fillColor}"
            stroke="${stage.strokeColor}"
            stroke-width="${stage.strokeWidth}"
            style="cursor: ${hasPopup ? 'pointer' : 'default'}"
            data-shape-index="${stage.index}"
            @mouseenter="${(e: MouseEvent) => this.handleStageMouseEnter(e, stage.index)}"
            @mouseleave="${() => this.handleStageMouseLeave(stage.index)}"
            @click="${(e: MouseEvent) => this.handleStageClick(e, stage.index)}"
          />

          ${shouldShowLabel ? svg`
            <!-- Stage label -->
            <text
              x="${chartCenterX}"
              y="${labelY}"
              text-anchor="middle"
              dominant-baseline="middle"
              font-size="16"
              font-weight="bold"
              fill="${textColor}"
              pointer-events="none"
            >
              ${stage.label}
            </text>
          ` : ''}

          ${valueString ? svg`
            <!-- Stage value/percent -->
            <text
              x="${chartCenterX}"
              y="${valueY}"
              text-anchor="middle"
              dominant-baseline="middle"
              font-size="14"
              fill="${textColor}"
              pointer-events="none"
            >
              ${valueString}
            </text>
          ` : ''}
        `;
      })}

      <!-- Legend -->
      ${this.renderLegend(
        stages.map((stage) => ({
          label: stage.label,
          color: stage.originalColor,  // Use originalColor (fillColor may be pattern URL)
          value: stage.value
        }))
      )}

      ${this.renderFocusIndicator()}
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
   * Generate default popup content for a funnel stage.
   * @param stage The stage data
   * @param totalValue The total of all stage values (first stage value for funnels)
   * @returns HTML string for the popup
   */
  private generateStagePopupContent(stage: { label: string; value: number }, totalValue: number): string {
    const percentage = totalValue > 0 ? ((stage.value / totalValue) * 100).toFixed(1) : '0.0';
    return `<strong>${stage.label}</strong><br>Value: ${stage.value}<br>${percentage}%`;
  }

  private handleStageMouseEnter(e: MouseEvent, index: number) {
    const stages = this.getStages();
    const stage = stages[index];

    // Explicit popup takes precedence over auto-popup
    if (stage.popup?.trigger === 'hover') {
      this.showPopup(stage.popup.content, e.clientX, e.clientY);
    } else if (!stage.popup && this.shouldShowAutoPopup(stage.autoPopup)) {
      // Show auto-popup (auto-popup always uses hover trigger)
      const totalValue = stages.length > 0 ? stages[0].value : 0;
      const content = this.generateStagePopupContent(stage, totalValue);
      this.showPopup(content, e.clientX, e.clientY);
    }
  }

  private handleStageMouseLeave(index: number) {
    const stage = this.getStages()[index];

    // Hide popup if it's a hover-triggered popup (explicit or auto) and not clicked
    const isHoverPopup = stage.popup?.trigger === 'hover' ||
      (!stage.popup && this.shouldShowAutoPopup(stage.autoPopup));

    if (isHoverPopup && this.clickedStageIndex !== index) {
      this.hidePopup();
    }
  }

  private handleStageClick(e: MouseEvent, index: number) {
    const stage = this.getStages()[index];

    // Only explicit click-triggered popups respond to clicks
    if (stage.popup?.trigger === 'click') {
      if (this.clickedStageIndex === index) {
        // Clicking same stage again - hide popup
        this.hidePopup();
        this.clickedStageIndex = -1;
      } else {
        // Show popup for clicked stage
        this.clickedStageIndex = index;
        this.showPopup(stage.popup.content, e.clientX, e.clientY);
      }
    } else {
      // Clicked stage without click-popup - clear any clicked state
      this.hidePopup();
      this.clickedStageIndex = -1;
    }
  }

  /**
   * Get legend items for dimension calculation.
   * Returns stage data formatted for legend rendering.
   *
   * NOTE: This method must NOT call calculateStageLayout() as that would create
   * a circular dependency (getChartPadding -> getLegendItems -> calculateStageLayout -> getChartPadding).
   * Instead, we get the data directly from getStages() and resolve colors independently.
   */
  protected override getLegendItems(): LegendItem[] {
    const stagesData = this.getStages();
    if (stagesData.length === 0) return [];

    // Determine base colors using palette system
    let baseColors: string[];
    const paletteColors = this.getPaletteColors(stagesData.length, 'fill');
    if (paletteColors) {
      baseColors = paletteColors;
    } else {
      // Default to cool-to-warm gradient for funnel charts
      baseColors = this.generateCoolToWarmColors(stagesData.length);
    }

    // Prepare elements for pattern-aware fill resolution
    const elementsForResolution = stagesData.map((s, i) => ({
      fill: s.fill,
      label: s.label,
      value: s.value,
      pattern: s.pattern,
      patternStroke: s.patternStroke,
      patternFill: s.patternFill,
      patternScale: s.patternScale,
      defaultColor: baseColors[i]
    }));

    // Resolve fills with pattern support (but we only need originalFill for legend)
    const resolvedFills = this.resolveFillsWithPatterns(elementsForResolution);

    return stagesData.map((stage, index) => ({
      label: stage.label,
      color: resolvedFills[index].originalFill,  // Use originalFill for legend (not pattern URL)
      value: stage.value,
      shape: 'square' as const  // Funnel stages use squares in legend
    }));
  }

  // ============================================================================
  // Accessibility Methods
  // ============================================================================

  /**
   * Returns the chart type name for accessibility descriptions.
   */
  protected override getChartTypeName(): string {
    return 'funnel chart';
  }

  /**
   * Returns a basic data summary for accessibility descriptions.
   */
  protected override getDataSummary(): string {
    const stages = this.getStages();
    if (stages.length === 0) return '';

    const first = stages[0].value;
    const last = stages[stages.length - 1].value;
    return `${stages.length} stages from ${first} to ${last}`;
  }

  /**
   * Returns auto-generated insights about the funnel chart data.
   */
  protected override getInsights(): string {
    if (this.ariaInsights === 'none') return '';

    const stages = this.getStages();
    if (stages.length === 0) return '';

    // Create a formatter function for insight generation
    const formatValue = (value: number) => this.formatValue(value);

    // Convert to insight format
    const insightStages: InsightStageData[] = stages.map(s => ({
      label: s.label,
      value: s.value
    }));

    return analyzeFunnel(insightStages, formatValue);
  }

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  /**
   * Get the list of focusable elements (funnel stages).
   */
  protected override getFocusableElements(): FocusableElement[] {
    const stages = this.getStages();
    const firstValue = stages.length > 0 ? stages[0].value : 0;

    return stages.map((stage, index) => {
      const hasAction = !!(stage.popup || this.shouldShowAutoPopup(stage.autoPopup));
      const conversionRate = firstValue > 0 ? (stage.value / firstValue) * 100 : 0;
      return {
        index,
        label: `${stage.label}: ${stage.value} (${conversionRate.toFixed(1)}% of total)`,
        hasAction,
        popupTrigger: stage.popup?.trigger as 'hover' | 'click' | undefined ||
                      (this.shouldShowAutoPopup(stage.autoPopup) ? 'hover' : undefined)
      };
    });
  }

  /**
   * Render a focus indicator for the currently focused stage.
   */
  protected override renderFocusIndicator(): SVGTemplateResult {
    if (!this.keyboardActive || this.focusedIndex < 0) {
      return svg``;
    }

    const bounds = this.getShapeBounds(this.focusedIndex);
    if (!bounds) return svg``;

    // Draw a focus ring around the stage
    const padding = 3;
    return svg`
      <rect
        class="focus-indicator"
        x="${bounds.x - padding}"
        y="${bounds.y - padding}"
        width="${bounds.width + padding * 2}"
        height="${bounds.height + padding * 2}"
        fill="none"
        stroke="#005fcc"
        stroke-width="2"
        stroke-dasharray="4 2"
        pointer-events="none"
      />
    `;
  }

  /**
   * Show popup for the focused stage.
   * Uses showPopupAtBounds() helper for consistent popup positioning.
   */
  protected override showPopupForFocusedElement(index: number): void {
    const stages = this.getStages();
    if (index < 0 || index >= stages.length) return;

    const stage = stages[index];
    let content: string | null = null;

    if (stage.popup) {
      content = stage.popup.content;
    } else if (this.shouldShowAutoPopup(stage.autoPopup)) {
      const firstValue = stages.length > 0 ? stages[0].value : 0;
      const conversionRate = firstValue > 0 ? ((stage.value / firstValue) * 100).toFixed(1) : '0';
      content = `<strong>${stage.label}</strong><br>Value: ${stage.value}<br>Conversion: ${conversionRate}%`;
    }

    if (content) {
      const bounds = this.getShapeBounds(index);
      if (bounds) {
        this.showPopupAtBounds(content, bounds);
      }
    }
  }

  /**
   * Toggle popup for the focused stage.
   */
  protected override togglePopupForFocusedElement(index: number): void {
    if (this.popupVisible) {
      this.hidePopup();
    } else {
      this.showPopupForFocusedElement(index);
    }
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'dc-funnel-chart': FunnelChart;
  }
}

