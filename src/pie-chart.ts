import { customElement, property } from 'lit/decorators.js';
import { svg, SVGTemplateResult } from 'lit';
import { BaseChart, showConditionConverter, type ShowCondition, type FocusableElement } from './base-chart.js';
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
    showValue: ShowCondition;
    showLabel: ShowCondition;
    showPercent: ShowCondition;
    popup?: { content: string; trigger: string };
    autoPopup?: boolean;
    element?: ChartPieSlice;
    passthroughAttrs?: Record<string, string>;
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
        showValue,
        showLabel,
        showPercent,
        popup: popupEl
          ? { content: popupEl.content, trigger: popupEl.trigger }
          : undefined,
        autoPopup: slice.autoPopup,
        element: slice,
        passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined
      };
    });
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
      color: string;
      stroke: string;
      strokeWidth: number;
      showValue: ShowCondition;
      showLabel: ShowCondition;
      showPercent: ShowCondition;
      popup?: { content: string; trigger: string };
      autoPopup?: boolean;
      passthroughAttrs?: Record<string, string>;
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
    if (sliceData.length === 0) return null;

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

    // Resolve fill colors with palette support
    // Pass sliceColor as default for backwards compatibility
    const elements = sliceData.map(s => ({
      fill: s.fill,
      label: s.label,
      value: s.value
    }));
    const fillColors = this.resolveFillColorsWithPalette(elements, this.sliceColor);

    // Resolve stroke colors
    const elementStrokes = sliceData.map(s => s.stroke);
    const strokeColors = this.resolveStrokeColors(sliceData.length, elementStrokes, 'white');

    const defaultStrokeWidth = this.strokeWidth ?? 2;

    const totalValue = sliceData.reduce((sum, slice) => sum + slice.value, 0);
    if (totalValue === 0) return null;
    this.log('info', 'data.totalValue', `Sum of all slice values`, totalValue);
    this.log('info', 'data.sliceCount', `Number of slices`, sliceData.length);

    const labelRadius = innerRadiusPixels + (radius - innerRadiusPixels) * 0.5;

    let currentAngle = -Math.PI / 2; // Start at top (12 o'clock)

    const slices = sliceData.map((slice, index) => {
      const sliceAngle = (slice.value / totalValue) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      const midAngle = (startAngle + endAngle) / 2;

      currentAngle = endAngle;

      const labelX = centerX + labelRadius * Math.cos(midAngle);
      const labelY = centerY + labelRadius * Math.sin(midAngle);
      const percentage = (slice.value / totalValue) * 100;

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
        color: fillColors[index],
        stroke: strokeColors[index],
        strokeWidth: slice.strokeWidth ?? defaultStrokeWidth,
        showValue: slice.showValue,
        showLabel: slice.showLabel,
        showPercent: slice.showPercent,
        popup: slice.popup,
        autoPopup: slice.autoPopup,
        passthroughAttrs: slice.passthroughAttrs
      };
    });

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

  protected updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    this.applyPassthroughAttributes(this.getSlices());
  }

  protected renderChart(): SVGTemplateResult {
    const layout = this.calculateSliceLayout();
    if (!layout) return svg``;

    const { slices, centerX, centerY, radius, innerRadiusPixels } = layout;

    return svg`
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
        const valueString = this.formatValueString(slice.value, slice.percentage, shouldShowValue, shouldShowPercent);

        // Determine if any popup should show (explicit or auto)
        const hasPopup = slice.popup || this.shouldShowAutoPopup(slice.autoPopup);

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
              x="${slice.labelX}"
              y="${slice.labelY - (valueString ? 8 : 0)}"
              text-anchor="middle"
              dominant-baseline="middle"
              font-size="14"
              font-weight="bold"
              fill="white"
            >
              ${slice.label}
            </text>
          ` : ''}

          ${valueString ? svg`
            <!-- Slice value/percent -->
            <text
              x="${slice.labelX}"
              y="${slice.labelY + (shouldShowLabel ? 10 : 0)}"
              text-anchor="middle"
              dominant-baseline="middle"
              font-size="12"
              fill="white"
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
          color: slice.color,
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

  private handleSliceMouseEnter(e: MouseEvent, index: number) {
    const layout = this.calculateSliceLayout();
    if (!layout) return;

    const slice = layout.slices[index];
    const sliceData = this.getSlices()[index];

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

    // Hide popup if it's a hover-triggered popup (explicit or auto) and not clicked
    const isHoverPopup = sliceData.popup?.trigger === 'hover' ||
      (!sliceData.popup && this.shouldShowAutoPopup(sliceData.autoPopup));

    if (isHoverPopup && this.clickedSliceIndex !== index) {
      this.hidePopup();
    }
  }

  private handleSliceClick(e: MouseEvent, index: number) {
    const sliceData = this.getSlices()[index];

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

    // Convert to insight format
    const insightSlices: InsightSliceData[] = slices.map(s => ({
      label: s.label,
      value: s.value
    }));

    return analyzePie(insightSlices);
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
        const rect = this.getBoundingClientRect();
        const svgEl = this.shadowRoot?.querySelector('svg');
        if (svgEl) {
          const svgRect = svgEl.getBoundingClientRect();
          const scaleX = svgRect.width / this.width;
          const scaleY = svgRect.height / this.height;
          const x = rect.left + (bounds.x + bounds.width / 2) * scaleX;
          const y = rect.top + bounds.y * scaleY;
          this.showPopup(content, x, y);
        }
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

