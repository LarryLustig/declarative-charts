import { customElement, property } from 'lit/decorators.js';
import { svg, SVGTemplateResult } from 'lit';
import { BaseChart, showConditionConverter, type ShowCondition, type FocusableElement } from './base-chart.js';
import { ErrorCode } from './errors.js';
import type { LegendItem } from './chart-legend.js';
import type { ChartPieSlice } from './chart-pie-slice.js';
import type { ChartPopup } from './chart-popup.js';
import { analyzePie, type SliceData as InsightSliceData } from './accessibility/index.js';

/**
 * Pie chart component that renders slices as circular segments
 *
 * @element dc-pie-chart
 *
 * @attr {number} width - Width of the chart in pixels (default: 600)
 * @attr {number} height - Height of the chart in pixels (default: 400)
 * @attr {string} fill-color - Default fill color for slices without individual fills
 * @attr {string} slice-color - @deprecated Use fill-color instead. Default color for slices.
 * @attr {boolean} show-value - Whether to show values on slices (default: false)
 * @attr {boolean} show-label - Whether to show labels on slices (default: true)
 * @attr {boolean} show-percent - Whether to show percentages on slices (default: true)
 * @attr {number} inner-radius - Inner radius as percentage (0-100) for donut charts (default: 0)
 *
 * @slot - Child elements: dc-title and dc-pie-slice elements
 *
 * @example
 * <dc-pie-chart width="600" height="400">
 *   <dc-title>Sales by Category</dc-title>
 *   <dc-pie-slice value="30" label="Product A"></dc-pie-slice>
 *   <dc-pie-slice value="45" label="Product B"></dc-pie-slice>
 *   <dc-pie-slice value="25" label="Product C"></dc-pie-slice>
 * </dc-pie-chart>
 */
@customElement('dc-pie-chart')
export class PieChart extends BaseChart {
  /**
   * @deprecated Use `fill-colors` instead. Kept for backwards compatibility.
   */
  @property({ type: String, attribute: 'slice-color' })
  sliceColor?: string;

  // Override default from BaseChart - pie charts hide values by default
  @property({ attribute: 'show-value', converter: showConditionConverter })
  override showValue: ShowCondition = false;

  // showLabel is inherited from BaseChart with default true

  // Override default from BaseChart - pie charts show percent by default
  @property({ attribute: 'show-percent', converter: showConditionConverter })
  override showPercent: ShowCondition = true;

  @property({ type: Number, attribute: 'inner-radius' })
  innerRadius = 0;

  private clickedSliceIndex = -1;

  private getSlices(): Array<{
    value: number;
    label: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    pattern?: string;
    patternStroke?: string;
    patternFill?: string;
    patternScale?: number;
    showValue: ShowCondition;
    showLabel: ShowCondition;
    showPercent: ShowCondition;
    popup?: { content: string; trigger: string };
    autoPopup?: boolean;
    element?: ChartPieSlice;
    passthroughAttrs?: Record<string, string>;
    valueFormat?: string;
    labelPosition?: string;
    labelOffsetX?: number;
    labelOffsetY?: number;
    labelOffsetR?: number;
    labelFill?: string;
  }> {
    const sliceElements = Array.from(
      this.querySelectorAll('dc-pie-slice')
    ) as ChartPieSlice[];

    return sliceElements.map(slice => {
      // Extract passthrough attributes (base attrs are handled by BaseShape)
      const knownAttrs = new Set(['value', 'show-value', 'show-label', 'show-percent']);
      const passthroughAttrs = slice.getPassthroughAttributes(knownAttrs);

      // Get popup element if present
      const popupEl = slice.querySelector('dc-popup') as ChartPopup | null;

      // Inherit show properties from chart if not explicitly set on slice
      const showValue = slice.hasAttribute('show-value') ? slice.showValue! : this.showValue;
      const showLabel = slice.hasAttribute('show-label') ? slice.showLabel! : this.showLabel;
      const showPercent = slice.hasAttribute('show-percent') ? slice.showPercent! : this.showPercent;

      // Get effective fill (prefers 'fill' over deprecated 'color')
      const effectiveFill = slice.getEffectiveFill();

      return {
        value: slice.value,
        label: slice.label,
        fill: effectiveFill || undefined,
        stroke: slice.stroke || undefined,
        strokeWidth: slice.strokeWidth,
        pattern: slice.pattern || undefined,
        patternStroke: slice.patternStroke || undefined,
        patternFill: slice.patternFill || undefined,
        patternScale: slice.patternScale || undefined,
        showValue,
        showLabel,
        showPercent,
        popup: popupEl
          ? { content: popupEl.content, trigger: popupEl.trigger }
          : undefined,
        autoPopup: slice.autoPopup,
        element: slice,
        passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined,
        valueFormat: slice.valueFormat,
        // Label positioning: slice → chart → default
        labelPosition: slice.labelPosition ?? this.labelPosition,
        labelOffsetX: slice.labelOffsetX ?? this.labelOffsetX,
        labelOffsetY: slice.labelOffsetY ?? this.labelOffsetY,
        labelOffsetR: slice.labelOffsetR ?? this.labelOffsetR,
        labelFill: slice.labelFill ?? this.labelFill
      };
    });
  }


  /**
   * Check if a point is inside a pie slice (within the ring between inner and outer radius).
   * Used for label fill calculation.
   */
  private isPointInsidePieRing(
    pointX: number, pointY: number,
    centerX: number, centerY: number,
    innerRadius: number, outerRadius: number
  ): boolean {
    const dx = pointX - centerX;
    const dy = pointY - centerY;
    const distanceSquared = dx * dx + dy * dy;
    const innerSquared = innerRadius * innerRadius;
    const outerSquared = outerRadius * outerRadius;
    return distanceSquared >= innerSquared && distanceSquared <= outerSquared;
  }

  /**
   * Calculate layout for all slices. Single source of truth for rendering, legend, and logging.
   * @returns Layout calculations for all slices, or null if no slices
   */
  private calculateSliceLayout(): {
    slices: Array<{
      index: number;
      label: string;
      value: number;
      startAngle: number;
      endAngle: number;
      midAngle: number;
      sliceAngle: number;
      percentage: number;
      labelX: number;
      labelY: number;
      textAnchor: string;
      color: string;
      originalColor: string;
      stroke: string;
      strokeWidth: number;
      showValue: ShowCondition;
      showLabel: ShowCondition;
      showPercent: ShowCondition;
      popup?: { content: string; trigger: string };
      autoPopup?: boolean;
      passthroughAttrs?: Record<string, string>;
      valueFormat?: string;
      labelFill?: string;
    }>;
    centerX: number;
    centerY: number;
    radius: number;
    innerRadiusPixels: number;
    totalValue: number;
    chartWidth: number;
    chartHeight: number;
  } | null {
    const sliceData = this.getSlices();
    if (sliceData.length === 0) {
      this.logError(ErrorCode.DATA_EMPTY, {
        chartType: 'Pie chart',
        expectedElements: 'dc-pie-slice children'
      });
      return null;
    }

    // Check for zero/negative values
    const invalidSlices = sliceData.filter(s => s.value <= 0);
    if (invalidSlices.length > 0) {
      const labels = invalidSlices.map(s => `${s.label || '(unlabeled)'} (${s.value})`).join(', ');
      this.logError(ErrorCode.DATA_INVALID_VALUES, {
        count: invalidSlices.length,
        elementType: 'slice',
        labels,
        chartType: 'Pie chart'
      });
    }

    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;
    const chartHeight = this.height - padding.top - padding.bottom;

    const centerX = padding.left + chartWidth / 2;
    const centerY = padding.top + chartHeight / 2;
    this.log('info', 'layout.center', `padding.left(${padding.left.toFixed(1)}) + chartWidth(${chartWidth.toFixed(1)})/2, padding.top(${padding.top.toFixed(1)}) + chartHeight(${chartHeight.toFixed(1)})/2`, { x: centerX, y: centerY });

    const radius = Math.min(chartWidth, chartHeight) / 2;
    const innerRadiusPixels = (this.innerRadius / 100) * radius;
    this.log('info', 'layout.radius', `min(chartWidth(${chartWidth.toFixed(1)}), chartHeight(${chartHeight.toFixed(1)})) / 2 = ${radius.toFixed(1)}`, radius);
    this.log('info', 'layout.innerRadius', `${this.innerRadius}% of radius(${radius.toFixed(1)}) = ${innerRadiusPixels.toFixed(1)}`, innerRadiusPixels);

    // Warn about invalid inner radius
    if (this.innerRadius < 0) {
      this.logError(ErrorCode.DONUT_INVALID_RADIUS, {
        value: this.innerRadius,
        reason: 'negative',
        suggestion: 'Using 0 (solid pie).'
      });
    } else if (this.innerRadius >= 100) {
      this.logError(ErrorCode.DONUT_INVALID_RADIUS, {
        value: this.innerRadius,
        reason: '>= 100%',
        suggestion: 'Pie will not be visible. Use a value between 0-99.'
      });
    } else if (this.innerRadius >= 90) {
      this.log('info', 'donut.thinRing', `inner-radius="${this.innerRadius}" creates a very thin ring. Labels may not fit inside slices.`);
    }

    // Resolve fill colors and patterns with high contrast support
    // Pass sliceColor as default for backwards compatibility
    const elements = sliceData.map(s => ({
      fill: s.fill,
      label: s.label,
      value: s.value,
      pattern: s.pattern,
      patternStroke: s.patternStroke,
      patternFill: s.patternFill,
      patternScale: s.patternScale
    }));
    const resolvedFills = this.resolveFillsWithPatterns(elements, this.sliceColor);

    // Get effective stroke from shorthand or explicit attributes (default: white, 2px)
    const effectiveStroke = this.getEffectiveStroke('white', 2);

    // Resolve stroke colors for each slice
    const elementStrokes = sliceData.map(s => s.stroke);
    const strokeColors = this.resolveStrokeColors(sliceData.length, elementStrokes, undefined, effectiveStroke.color);
    const defaultStrokeWidth = effectiveStroke.width;

    const totalValue = sliceData.reduce((sum, slice) => sum + slice.value, 0);
    if (totalValue === 0) {
      this.logError(ErrorCode.DATA_ZERO_TOTAL, {
        elementType: 'slice',
        chartType: 'Pie chart'
      });
      return null;
    }
    this.log('info', 'data.totalValue', `Sum of all slice values`, totalValue);
    this.log('info', 'data.sliceCount', `Number of slices`, sliceData.length);

    // Default label radius (inside, center of slice arc)
    const insideLabelRadius = innerRadiusPixels + (radius - innerRadiusPixels) * 0.5;
    // Outside label radius (beyond the pie edge)
    const outsideLabelRadius = radius + 20;

    let currentAngle = -Math.PI / 2; // Start at top (12 o'clock)

    const slices = sliceData.map((slice, index) => {
      const sliceAngle = (slice.value / totalValue) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      const midAngle = (startAngle + endAngle) / 2;

      currentAngle = endAngle;

      const percentage = (slice.value / totalValue) * 100;

      // Calculate label position based on labelPosition attribute
      const position = slice.labelPosition || 'inside';
      const offsetR = slice.labelOffsetR || 0;
      const offsetX = slice.labelOffsetX || 0;
      const offsetY = slice.labelOffsetY || 0;

      let labelRadius: number;
      let textAnchor: string;

      if (position === 'outside') {
        labelRadius = outsideLabelRadius + offsetR;
        // For outside labels, anchor based on which side of the pie they're on
        // Right side (midAngle between -π/2 and π/2): start
        // Left side: end
        const normalizedAngle = midAngle % (2 * Math.PI);
        const isRightSide = normalizedAngle > -Math.PI / 2 && normalizedAngle < Math.PI / 2;
        textAnchor = isRightSide ? 'start' : 'end';
      } else {
        // Default 'inside' positioning
        labelRadius = insideLabelRadius + offsetR;
        textAnchor = 'middle';
      }

      const labelX = centerX + labelRadius * Math.cos(midAngle) + offsetX;
      const labelY = centerY + labelRadius * Math.sin(midAngle) + offsetY;

      this.log('info', `slices[${index}]`, `"${slice.label}": value=${slice.value}, ${percentage.toFixed(1)}%, angle=${(sliceAngle * 180 / Math.PI).toFixed(1)}°`, {
        label: slice.label,
        value: slice.value,
        percentage: percentage.toFixed(1) + '%',
        startAngle: (startAngle * 180 / Math.PI).toFixed(1) + '°',
        endAngle: (endAngle * 180 / Math.PI).toFixed(1) + '°',
        labelPosition: { x: labelX.toFixed(1), y: labelY.toFixed(1) }
      });

      return {
        index,
        label: slice.label,
        value: slice.value,
        startAngle,
        endAngle,
        midAngle,
        sliceAngle,
        percentage,
        labelX,
        labelY,
        textAnchor,
        color: resolvedFills[index].fill,
        originalColor: resolvedFills[index].originalFill,
        stroke: strokeColors[index],
        strokeWidth: slice.strokeWidth ?? defaultStrokeWidth,
        showValue: slice.showValue,
        showLabel: slice.showLabel,
        showPercent: slice.showPercent,
        popup: slice.popup,
        autoPopup: slice.autoPopup,
        passthroughAttrs: slice.passthroughAttrs,
        valueFormat: slice.valueFormat,
        labelFill: slice.labelFill
      };
    });

    // Warn about very small slices (< 3%) that may be hard to see or interact with
    const smallSlices = slices.filter(s => s.percentage < 3);
    if (smallSlices.length > 0) {
      const labels = smallSlices.map(s => `${s.label || '(unlabeled)'} (${s.percentage.toFixed(1)}%)`).join(', ');
      this.log('info', 'slices.small', `${smallSlices.length} slice(s) are < 3% and may be hard to see or click: ${labels}. Consider grouping small values into an "Other" category.`);
    }

    // Warn if all slices have the same color
    if (slices.length > 1) {
      const uniqueColors = new Set(slices.map(s => s.originalColor));
      if (uniqueColors.size === 1) {
        const color = slices[0].originalColor;
        this.log('info', 'slices.sameColor', `All ${slices.length} slices have the same color (${color}). Set fill on slices or configure a palette for distinct colors.`);
      }
    }

    return {
      slices,
      centerX,
      centerY,
      radius,
      innerRadiusPixels,
      totalValue,
      chartWidth,
      chartHeight
    };
  }

  /**
   * Generate SVG path data for a pie slice
   * @param centerX Center X coordinate
   * @param centerY Center Y coordinate
   * @param radius Outer radius
   * @param innerRadius Inner radius (for donut charts)
   * @param startAngle Start angle in radians
   * @param endAngle End angle in radians
   * @returns SVG path data string
   */
  private createSlicePath(
    centerX: number,
    centerY: number,
    radius: number,
    innerRadius: number,
    startAngle: number,
    endAngle: number
  ): string {
    // Calculate outer arc points
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    // Determine if we need a large arc
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

    if (innerRadius === 0) {
      // Regular pie slice
      return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    } else {
      // Donut slice
      const ix1 = centerX + innerRadius * Math.cos(startAngle);
      const iy1 = centerY + innerRadius * Math.sin(startAngle);
      const ix2 = centerX + innerRadius * Math.cos(endAngle);
      const iy2 = centerY + innerRadius * Math.sin(endAngle);

      return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1} Z`;
    }
  }

  protected override getShadowParts(): Record<string, string> {
    return { ...super.getShadowParts(), 'path[data-shape-index]': 'slice' };
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    this.applyPassthroughAttributes(this.getSlices());
  }

  protected renderChart(): SVGTemplateResult {
    const layout = this.calculateSliceLayout();
    if (!layout) return svg``;

    const { slices, centerX, centerY, radius, innerRadiusPixels } = layout;

    return svg`
      ${this.renderDefs()}
      <!-- Pie slices -->
      ${slices.map((slice) => {
        const path = this.createSlicePath(
          centerX,
          centerY,
          radius,
          innerRadiusPixels,
          slice.startAngle,
          slice.endAngle
        );

        // Evaluate show conditions
        const shouldShowValue = this.evaluateShowCondition(slice.showValue, slice.value, slice.percentage);
        const shouldShowLabel = this.evaluateShowCondition(slice.showLabel, slice.value, slice.percentage);
        const shouldShowPercent = this.evaluateShowCondition(slice.showPercent, slice.value, slice.percentage);
        const valueString = this.formatValueString(slice.value, slice.percentage, shouldShowValue, shouldShowPercent, slice.valueFormat);

        // Determine if any popup should show (explicit or auto)
        const hasPopup = slice.popup || this.shouldShowAutoPopup(slice.autoPopup);

        // Calculate label fill using geometric hit-testing
        const isInsideSlice = this.isPointInsidePieRing(
          slice.labelX, slice.labelY,
          centerX, centerY,
          innerRadiusPixels, radius
        );
        const labelFill = this.calculateLabelFill(slice.labelFill, isInsideSlice, slice.originalColor);

        return svg`
          <!-- Slice path -->
          <path
            d="${path}"
            fill="${slice.color}"
            stroke="${slice.stroke}"
            stroke-width="${slice.strokeWidth}"
            style="cursor: ${hasPopup ? 'pointer' : 'default'}"
            data-shape-index="${slice.index}"
            @mouseenter="${(e: MouseEvent) => this.handleSliceMouseEnter(e, slice.index)}"
            @mouseleave="${() => this.handleSliceMouseLeave(slice.index)}"
            @click="${(e: MouseEvent) => this.handleSliceClick(e, slice.index)}"
          />

          ${shouldShowLabel ? svg`
            <!-- Slice label -->
            <text
              part="label"
              x="${slice.labelX}"
              y="${slice.labelY - (valueString ? 8 : 0)}"
              text-anchor="${slice.textAnchor}"
              dominant-baseline="middle"
              font-size="14"
              font-weight="bold"
              fill="${labelFill}"
            >
              ${slice.label}
            </text>
          ` : ''}

          ${valueString ? svg`
            <!-- Slice value/percent -->
            <text
              part="label"
              x="${slice.labelX}"
              y="${slice.labelY + (shouldShowLabel ? 10 : 0)}"
              text-anchor="${slice.textAnchor}"
              dominant-baseline="middle"
              font-size="12"
              fill="${labelFill}"
            >
              ${valueString}
            </text>
          ` : ''}
        `;
      })}

      <!-- Legend -->
      ${this.renderLegend(
        slices.map((slice) => ({
          label: slice.label,
          color: slice.originalColor,
          value: slice.value
        }))
      )}
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
   * Generate default popup content for a pie slice.
   * @param slice The slice data
   * @param totalValue The total of all slice values
   * @returns HTML string for the popup
   */
  private generateSlicePopupContent(slice: { label: string; value: number }, totalValue: number): string {
    const percentage = totalValue > 0 ? ((slice.value / totalValue) * 100).toFixed(1) : '0.0';
    return `<strong>${slice.label}</strong><br>Value: ${slice.value}<br>${percentage}%`;
  }

  private sliceDetail(
    slice: { element?: Element; label: string; value: number },
    index: number,
    slices?: Array<{ value: number }>
  ) {
    const all = slices ?? this.getSlices();
    const total = all.reduce((sum, sl) => sum + Math.abs(sl.value), 0);
    return {
      element: slice.element ?? null,
      label: slice.label,
      value: slice.value,
      // Decimal, matching the library's percent convention (0.25 means 25%).
      percent: this.shareOf(slice.value, total),
      index,
      seriesLabel: null,
      seriesIndex: null
    };
  }

  private handleSliceMouseEnter(e: MouseEvent, index: number) {
    const layout = this.calculateSliceLayout();
    if (!layout) return;

    const slice = layout.slices[index];
    const sliceData = this.getSlices()[index];

    this.emitInteraction('dc-mouseenter', this.sliceDetail(sliceData, index), e);
    // Explicit popup takes precedence over auto-popup
    if (sliceData.popup?.trigger === 'hover') {
      this.showPopup(sliceData.popup.content, e.clientX, e.clientY);
    } else if (!sliceData.popup && this.shouldShowAutoPopup(sliceData.autoPopup)) {
      // Show auto-popup (auto-popup always uses hover trigger)
      const content = this.generateSlicePopupContent(slice, layout.totalValue);
      this.showPopup(content, e.clientX, e.clientY);
    }
  }

  private handleSliceMouseLeave(index: number) {
    const sliceData = this.getSlices()[index];
    this.emitInteraction('dc-mouseleave', this.sliceDetail(sliceData, index));

    // Hide popup if it's a hover-triggered popup (explicit or auto) and not clicked
    const isHoverPopup = sliceData.popup?.trigger === 'hover' ||
      (!sliceData.popup && this.shouldShowAutoPopup(sliceData.autoPopup));

    if (isHoverPopup && this.clickedSliceIndex !== index) {
      this.hidePopup();
    }
  }

  private handleSliceClick(e: MouseEvent, index: number) {
    const sliceData = this.getSlices()[index];
    if (!this.emitInteraction('dc-click', this.sliceDetail(sliceData, index), e)) return;

    // Only explicit click-triggered popups respond to clicks
    if (sliceData.popup?.trigger === 'click') {
      if (this.clickedSliceIndex === index) {
        // Clicking same slice again - hide popup
        this.hidePopup();
        this.clickedSliceIndex = -1;
      } else {
        // Show popup for clicked slice
        this.clickedSliceIndex = index;
        this.showPopup(sliceData.popup.content, e.clientX, e.clientY);
      }
    } else {
      // Clicked slice without click-popup - clear any clicked state
      this.hidePopup();
      this.clickedSliceIndex = -1;
    }
  }

  /**
   * Get legend items for dimension calculation.
   * Returns slice data formatted for legend rendering.
   *
   * NOTE: This method must NOT call calculateSliceLayout() as that would create
   * a circular dependency (getChartPadding -> getLegendItems -> calculateSliceLayout -> getChartPadding).
   * Instead, we get the data directly from getSlices() and resolve colors independently.
   */
  protected override getLegendItems(): LegendItem[] {
    const sliceData = this.getSlices();
    if (sliceData.length === 0) return [];

    // Resolve colors with palette support without calling calculateSliceLayout
    // Pass sliceColor as default for backwards compatibility
    const elements = sliceData.map(s => ({
      fill: s.fill,
      label: s.label,
      value: s.value
    }));
    const fillColors = this.resolveFillColorsWithPalette(elements, this.sliceColor);

    return sliceData.map((slice, index) => ({
      label: slice.label,
      color: fillColors[index],
      value: slice.value,
      shape: 'square' as const  // Pie slices use squares in legend
    }));
  }

  // ============================================================================
  // Accessibility Methods
  // ============================================================================

  /**
   * Returns the chart type name for accessibility descriptions.
   */
  protected override getChartTypeName(): string {
    return this.innerRadius > 0 ? 'donut chart' : 'pie chart';
  }

  /**
   * Returns a basic data summary for accessibility descriptions.
   */
  protected override getDataSummary(): string {
    const slices = this.getSlices();
    if (slices.length === 0) return '';

    const total = slices.reduce((sum, s) => sum + s.value, 0);
    return `${slices.length} slices totaling ${total}`;
  }

  /**
   * Returns auto-generated insights about the pie chart data.
   */
  protected override getInsights(): string {
    if (this.ariaInsights === 'none') return '';

    const slices = this.getSlices();
    if (slices.length === 0) return '';

    // Create a formatter function for insight generation
    const formatValue = (value: number) => this.formatValue(value);

    // Convert to insight format
    const insightSlices: InsightSliceData[] = slices.map(s => ({
      label: s.label,
      value: s.value
    }));

    return analyzePie(insightSlices, formatValue);
  }

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  /**
   * Get the list of focusable elements (pie slices).
   */
  protected override getFocusableElements(): FocusableElement[] {
    const slices = this.getSlices();
    const total = slices.reduce((sum, s) => sum + s.value, 0);

    return slices.map((slice, index) => {
      const hasAction = !!(slice.popup || this.shouldShowAutoPopup(slice.autoPopup));
      const percent = total > 0 ? (slice.value / total) * 100 : 0;
      return {
        index,
        label: `${slice.label}: ${slice.value} (${percent.toFixed(1)}%)`,
        hasAction,
        popupTrigger: slice.popup?.trigger as 'hover' | 'click' | undefined ||
                      (this.shouldShowAutoPopup(slice.autoPopup) ? 'hover' : undefined)
      };
    });
  }

  /**
   * Render a focus indicator for the currently focused slice.
   */
  protected override renderFocusIndicator(): SVGTemplateResult {
    if (!this.keyboardActive || this.focusedIndex < 0) {
      return svg``;
    }

    const bounds = this.getShapeBounds(this.focusedIndex);
    if (!bounds) return svg``;

    // For pie slices, draw a focus ring around the bounding box
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
   * Show popup for the focused slice.
   * Uses showPopupAtBounds() helper for consistent popup positioning.
   */
  protected override showPopupForFocusedElement(index: number): void {
    const slices = this.getSlices();
    if (index < 0 || index >= slices.length) return;

    const slice = slices[index];
    let content: string | null = null;

    if (slice.popup) {
      content = slice.popup.content;
    } else if (this.shouldShowAutoPopup(slice.autoPopup)) {
      const total = slices.reduce((sum, s) => sum + s.value, 0);
      const percent = total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0';
      content = `<strong>${slice.label}</strong><br>Value: ${slice.value}<br>Percent: ${percent}%`;
    }

    if (content) {
      const bounds = this.getShapeBounds(index);
      if (bounds) {
        this.showPopupAtBounds(content, bounds);
      }
    }
  }

  /**
   * Toggle popup for the focused slice.
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
    'dc-pie-chart': PieChart;
  }
}

