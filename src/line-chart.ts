import { customElement, property } from 'lit/decorators.js';
import { svg, SVGTemplateResult } from 'lit';
import { AxisChart } from './axis-chart.js';
import { type ShowCondition } from './base-chart.js';
import type { ChartLine } from './chart-line.js';
import type { ChartPoint } from './chart-point.js';
import type { ChartPopup } from './chart-popup.js';

/**
 * Line chart component that renders multiple lines declaratively specified as child elements
 *
 * @element dc-line-chart
 *
 * @attr {number} width - Width of the chart in pixels (default: 600)
 * @attr {number} height - Height of the chart in pixels (default: 400)
 * @attr {string} stroke-colors - Stroke colors for lines. Single color, comma-separated list, or "auto" (default: #2196F3)
 * @attr {string} line-color - @deprecated Use stroke-colors instead. Default color for lines.
 * @attr {boolean} show-value - Whether to display numeric values for points by default (default: true)
 * @attr {string} point-shape - Default shape for points: "circle", "square", "triangle", "diamond", "star", "cross", "plus", or unicode character (default: "circle")
 *
 * @slot - Child elements: dc-title and dc-line elements (each dc-line contains dc-point elements)
 *
 * @example
 * <dc-line-chart width="600" height="400" stroke-color="#9C27B0">
 *   <dc-title>Temperature Trends</dc-title>
 *   <dc-line label="City A">
 *     <dc-point value="15" label="Mon"></dc-point>
 *     <dc-point value="18" label="Tue"></dc-point>
 *   </dc-line>
 *   <dc-line stroke="#FF5722" label="City B">
 *     <dc-point value="12" label="Mon"></dc-point>
 *     <dc-point value="20" label="Tue"></dc-point>
 *   </dc-line>
 * </dc-line-chart>
 *
 * @example
 * <dc-line-chart width="600" height="400" show-value="false">
 *   <dc-title>Temperature Trends (No Values Shown)</dc-title>
 *   <dc-line label="City A">
 *     <dc-point value="15" label="Mon"></dc-point>
 *     <dc-point value="18" label="Tue"></dc-point>
 *   </dc-line>
 * </dc-line-chart>
 *
 * @example
 * <dc-line-chart width="600" height="400" point-shape="square">
 *   <dc-title>Square Points</dc-title>
 *   <dc-line label="Series A">
 *     <dc-point value="15" label="Mon"></dc-point>
 *     <dc-point value="18" label="Tue"></dc-point>
 *   </dc-line>
 * </dc-line-chart>
 */
@customElement('dc-line-chart')
export class LineChart extends AxisChart {
  /**
   * @deprecated Use `stroke-colors` instead. Kept for backwards compatibility.
   */
  @property({ type: String, attribute: 'line-color' })
  lineColor = '#2196F3';

  // showValue is inherited from BaseChart with default true

  @property({ type: String, attribute: 'point-shape' })
  pointShape = 'circle';

  private clickedPointIndex = { lineIndex: -1, pointIndex: -1 };

  /**
   * Get the effective default stroke color for lines.
   * Returns stroke-colors if set (first color), otherwise falls back to line-color for backwards compatibility.
   */
  private getDefaultLineStroke(): string {
    if (this.strokeColors) {
      // Parse first color from palette
      const colors = this.strokeColors.split(',').map(c => c.trim()).filter(c => c);
      if (colors.length > 0 && colors[0] !== 'auto') {
        return colors[0];
      }
    }
    return this.lineColor;
  }

  // ============================================================================
  // AxisChart Abstract Method Implementations
  // ============================================================================

  /**
   * Get the maximum value from the line chart's data.
   * @returns Maximum point value across all lines, minimum of 1
   */
  protected getMaxValue(): number {
    const lines = this.getLines();
    const allValues = lines.flatMap(line => line.points.map(p => p.value));
    if (allValues.length === 0) return 1;
    return Math.max(...allValues, 1);
  }

  /**
   * Get all values from the line chart's data.
   * @returns Array of all point values across all lines
   */
  protected getAllValues(): number[] {
    const lines = this.getLines();
    return lines.flatMap(line => line.points.map(p => p.value));
  }

  /**
   * Get labels for the category axis (X-axis).
   * Uses labels from the first line's points.
   * @returns Array of point labels from the first line
   */
  protected getCategoryLabels(): string[] {
    const lines = this.getLines();
    if (lines.length === 0) return [];
    return lines[0].points.map(p => p.label);
  }

  /**
   * Get additional padding needed for axis labels and value labels.
   * Line charts need padding for Y-axis labels on the left and X-axis labels at the bottom.
   */
  protected override getAxisLabelPadding(): { top: number; right: number; bottom: number; left: number } {
    const max = this.getNiceMax();
    const maxValueStr = max.toFixed(0);
    const maxValueWidth = this.measureText(maxValueStr, 11) + 15; // 11px font + margin

    // Height for labels - multiply by number of label lines for staggered labels
    const labelLines = this.getLabelLinesCount();
    const valueLabelHeight = 25; // Space for value labels above points
    const xAxisLabelHeight = 25 * labelLines; // Space for X-axis labels

    return {
      top: valueLabelHeight,
      right: 0,
      bottom: xAxisLabelHeight,
      left: maxValueWidth
    };
  }

  // ============================================================================
  // End AxisChart Abstract Method Implementations
  // ============================================================================

  private renderPointShape(
    shape: string,
    x: number,
    y: number,
    size: number,
    color: string,
    cursor: string,
    handlers: {
      mouseenter: (e: MouseEvent) => void;
      mouseleave: () => void;
      click: (e: MouseEvent) => void;
    }
  ): SVGTemplateResult {
    const lowerShape = shape.toLowerCase();

    switch (lowerShape) {
      case 'circle':
        return svg`
          <circle
            cx="${x}"
            cy="${y}"
            r="${size}"
            fill="${color}"
            style="cursor: ${cursor}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;

      case 'square':
        return svg`
          <rect
            x="${x - size}"
            y="${y - size}"
            width="${size * 2}"
            height="${size * 2}"
            fill="${color}"
            style="cursor: ${cursor}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;

      case 'triangle':
        const height = size * 1.7;
        return svg`
          <polygon
            points="${x},${y - height} ${x - size},${y + size} ${x + size},${y + size}"
            fill="${color}"
            style="cursor: ${cursor}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;

      case 'diamond':
        return svg`
          <polygon
            points="${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}"
            fill="${color}"
            style="cursor: ${cursor}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;

      case 'star':
        const outerRadius = size;
        const innerRadius = size * 0.4;
        const points = [];
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          points.push(`${x + radius * Math.cos(angle)},${y + radius * Math.sin(angle)}`);
        }
        return svg`
          <polygon
            points="${points.join(' ')}"
            fill="${color}"
            style="cursor: ${cursor}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;

      case 'cross':
        const crossSize = size * 1.4;
        return svg`
          <path
            d="M ${x - crossSize},${y - crossSize} L ${x + crossSize},${y + crossSize} M ${x + crossSize},${y - crossSize} L ${x - crossSize},${y + crossSize}"
            stroke="${color}"
            stroke-width="2"
            style="cursor: ${cursor}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;

      case 'plus':
        const plusSize = size * 1.4;
        return svg`
          <path
            d="M ${x},${y - plusSize} L ${x},${y + plusSize} M ${x - plusSize},${y} L ${x + plusSize},${y}"
            stroke="${color}"
            stroke-width="2"
            style="cursor: ${cursor}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;

      default:
        // Unicode character or custom shape
        return svg`
          <text
            x="${x}"
            y="${y}"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="${size * 2.5}"
            fill="${color}"
            style="cursor: ${cursor}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          >
            ${shape}
          </text>
        `;
    }
  }

  private getLines(): Array<{
    stroke: string;
    /** The element-level stroke if explicitly set (used for color resolution) */
    elementStroke?: string;
    label: string;
    href?: string;
    target?: string;
    popup?: { content: string; trigger: string };
    autoPopup?: boolean;
    element?: ChartLine;
    passthroughAttrs?: Record<string, string>;
    points: Array<{
      value: number;
      label: string;
      fill?: string;
      href?: string;
      target?: string;
      popup?: { content: string; trigger: string };
      autoPopup?: boolean;
      showValue: ShowCondition;
      showPercent: ShowCondition;
      shape: string;
    }>;
  }> {
    const lineElements = Array.from(
      this.querySelectorAll('dc-line')
    ) as ChartLine[];

    const linesData = lineElements.map(line => {
      const pointElements = Array.from(
        line.querySelectorAll('dc-point')
      ) as ChartPoint[];

      // Get effective stroke (prefers 'stroke' over deprecated 'color')
      // Store element-level stroke separately for color resolution
      const elementStroke = line.getEffectiveStroke();
      // Use placeholder for now - will be resolved after we know line count
      const lineStroke = elementStroke || '';

      // Use the line's showValue if explicitly set, otherwise use the chart's showValue
      const lineShowValue = line.hasAttribute('show-value') ? line.showValue : this.showValue;

      // Use the line's showPercent if explicitly set, otherwise use the chart's showPercent
      const lineShowPercent = line.hasAttribute('show-percent') ? line.showPercent! : this.showPercent;

      // Use the line's pointShape if explicitly set, otherwise use the chart's pointShape
      const linePointShape = line.hasAttribute('point-shape') ? line.pointShape : this.pointShape;

      // Get popup for the line itself (direct child, not nested in points)
      const linePopupEl = Array.from(line.children).find(
        child => child.tagName.toLowerCase() === 'dc-popup'
      ) as ChartPopup | null;

      // Extract passthrough attributes
      const knownAttrs = new Set(['label', 'color', 'stroke', 'fill', 'href', 'target', 'show-value', 'show-percent', 'point-shape']);
      const passthroughAttrs = line.getPassthroughAttributes(knownAttrs);

      return {
        stroke: lineStroke,
        elementStroke: elementStroke || undefined,
        label: line.label,
        href: line.href || undefined,
        target: line.target || undefined,
        popup: linePopupEl
          ? { content: linePopupEl.content, trigger: linePopupEl.trigger }
          : undefined,
        autoPopup: line.autoPopup,
        element: line,
        passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined,
        points: pointElements.map(point => {
          const popupEl = point.querySelector('dc-popup') as ChartPopup | null;
          // Use point's showValue if explicitly set, otherwise fall back to line's showValue
          const showValue = point.hasAttribute('show-value') ? point.showValue : lineShowValue;
          // Use point's showPercent if explicitly set, otherwise fall back to line's showPercent
          const showPercent = point.hasAttribute('show-percent') ? point.showPercent! : lineShowPercent;
          // Use point's shape if explicitly set, otherwise fall back to line's pointShape
          const shape = point.hasAttribute('shape') ? point.shape : linePointShape;
          // Get effective fill (prefers 'fill' over deprecated 'color')
          const effectiveFill = point.getEffectiveFill();
          return {
            value: point.value,
            label: point.label,
            fill: effectiveFill || undefined,
            href: point.href || undefined,
            target: point.target || undefined,
            popup: popupEl
              ? { content: popupEl.content, trigger: popupEl.trigger }
              : undefined,
            autoPopup: point.autoPopup,
            showValue,
            showPercent,
            shape
          };
        })
      };
    });

    // Resolve stroke colors using the color system
    // Priority: element stroke > gradient > palette > single color > auto
    if (linesData.length > 0) {
      const elementStrokes = linesData.map(l => l.elementStroke);
      const strokeColors = this.resolveStrokeColors(
        linesData.length,
        elementStrokes,
        this.getDefaultLineStroke()
      );

      // Apply resolved colors to lines
      linesData.forEach((line, index) => {
        line.stroke = strokeColors[index];
      });
    }

    return linesData;
  }

  /**
   * Calculate layout for all lines and points. Single source of truth for rendering and legend.
   */
  private calculateLineLayout(): {
    lines: Array<{
      index: number;
      stroke: string;
      label: string;
      href?: string;
      target?: string;
      popup?: { content: string; trigger: string };
      autoPopup?: boolean;
      passthroughAttrs?: Record<string, string>;
      points: Array<{
        index: number;
        value: number;
        label: string;
        x: number;
        y: number;
        fill: string;
        href?: string;
        target?: string;
        popup?: { content: string; trigger: string };
        autoPopup?: boolean;
        showValue: ShowCondition;
        showPercent: ShowCondition;
        shape: string;
      }>;
    }>;
    padding: { top: number; right: number; bottom: number; left: number };
    chartWidth: number;
    chartHeight: number;
    max: number;
    total: number;
    pointCount: number;
    stepX: number;
    xLabels: string[];
    gridSteps: number;
  } | null {
    const linesData = this.getLines();
    if (linesData.length === 0) return null;

    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;
    const chartHeight = this.height - padding.top - padding.bottom;

    const allValues = linesData.flatMap(line => line.points.map(p => p.value));
    const max = this.getNiceMax();
    const total = allValues.reduce((sum, v) => sum + v, 0);

    const xLabels = linesData[0]?.points.map(p => p.label) || [];
    const pointCount = Math.max(...linesData.map(line => line.points.length), 1);
    const stepX = chartWidth / (pointCount - 1 || 1);

    const gridSteps = 5;

    // Log layout info
    this.log('info', 'data.lineCount', `Number of lines`, linesData.length);
    this.log('info', 'data.maxValue', `Maximum point value`, max);
    this.log('info', 'data.totalValue', `Sum of all point values`, total);
    this.log('info', 'layout.chartArea', `chartWidth=${chartWidth.toFixed(1)}, chartHeight=${chartHeight.toFixed(1)}`, { width: chartWidth, height: chartHeight });
    this.log('info', 'layout.pointCount', `Maximum points per line`, pointCount);
    this.log('info', 'layout.stepX', `Horizontal spacing between points`, stepX);

    // Calculate positions for all points
    const lines = linesData.map((line, lineIndex) => ({
      index: lineIndex,
      stroke: line.stroke,
      label: line.label,
      href: line.href,
      target: line.target,
      popup: line.popup,
      autoPopup: line.autoPopup,
      passthroughAttrs: line.passthroughAttrs,
      points: line.points.map((point, pointIndex) => {
        const x = padding.left + pointIndex * stepX;
        const y = this.height - padding.bottom - (point.value / max) * chartHeight;
        this.log('info', `lines[${lineIndex}].points[${pointIndex}]`, `"${point.label}": value=${point.value}, x=${x.toFixed(1)}, y=${y.toFixed(1)}`, { label: point.label, value: point.value, x, y });
        return {
          index: pointIndex,
          value: point.value,
          label: point.label,
          x,
          y,
          fill: point.fill || line.stroke,
          href: point.href,
          target: point.target,
          popup: point.popup,
          autoPopup: point.autoPopup,
          showValue: point.showValue,
          showPercent: point.showPercent,
          shape: point.shape
        };
      })
    }));

    return {
      lines,
      padding,
      chartWidth,
      chartHeight,
      max,
      total,
      pointCount,
      stepX,
      xLabels,
      gridSteps
    };
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    this.applyPassthroughAttributes(this.getLines());
  }

  protected renderChart(): SVGTemplateResult {
    const layout = this.calculateLineLayout();
    if (!layout) return svg``;

    const { lines, padding, chartHeight, max, total, stepX, xLabels, gridSteps } = layout;

    return svg`
      <!-- Grid lines -->
      ${Array.from({ length: gridSteps + 1 }, (_, i) => {
        const value = (max / gridSteps) * i;
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

      <!-- Lines -->
      ${lines.map((line) => {
        if (line.points.length === 0) return '';

        // Build path data using pre-calculated positions
        const pathData = line.points
          .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
          .join(' ');

        // Determine if any popup should show for the line (explicit or auto)
        const lineHasPopup = line.href || line.popup || this.shouldShowAutoPopup(line.autoPopup);

        const linePath = svg`
          <path
            d="${pathData}"
            stroke="${line.stroke}"
            stroke-width="3"
            fill="none"
            style="cursor: ${lineHasPopup ? 'pointer' : 'default'}"
            data-shape-index="${line.index}"
            @mouseenter="${(e: MouseEvent) => this.handleLineMouseEnter(e, line.index)}"
            @mouseleave="${() => this.handleLineMouseLeave(line.index)}"
            @click="${(e: MouseEvent) => this.handleLineClick(e, line.index)}"
          />
        `;

        return svg`
          <!-- Line path -->
          ${line.href ? svg`
            <a href="${line.href}" target="${line.target || '_self'}">
              ${linePath}
            </a>
          ` : linePath}

          <!-- Points -->
          ${line.points.map((point) => {
            // Determine if any popup should show for the point (explicit or auto)
            const pointHasPopup = point.href || point.popup || this.shouldShowAutoPopup(point.autoPopup, line.autoPopup);

            const pointShape = this.renderPointShape(
              point.shape,
              point.x,
              point.y,
              5,
              point.fill,
              pointHasPopup ? 'pointer' : 'default',
              {
                mouseenter: (e: MouseEvent) => this.handlePointMouseEnter(e, line.index, point.index),
                mouseleave: () => this.handlePointMouseLeave(line.index, point.index),
                click: (e: MouseEvent) => this.handlePointClick(e, line.index, point.index)
              }
            );

            const percent = total > 0 ? (point.value / total) * 100 : 0;
            const shouldShowValue = this.evaluateShowCondition(point.showValue, point.value, percent);
            const shouldShowPercent = this.evaluateShowCondition(point.showPercent, point.value, percent);
            const valueString = this.formatValueString(point.value, percent, shouldShowValue, shouldShowPercent);

            return svg`
              <!-- Point shape -->
              ${point.href ? svg`
                <a href="${point.href}" target="${point.target || '_self'}">
                  ${pointShape}
                </a>
              ` : pointShape}

              <!-- Value label -->
              ${valueString ? svg`
                <text
                  x="${point.x}"
                  y="${point.y - 10}"
                  text-anchor="middle"
                  font-size="12"
                  fill="#333"
                >
                  ${valueString}
                </text>
              ` : ''}
            `;
          })}
        `;
      })}

      <!-- Axes (rendered after lines so they appear on top) -->
      ${this.renderAxes(padding, 'vertical', false)}

      <!-- Y-axis labels -->
      ${Array.from({ length: gridSteps + 1 }, (_, i) => {
        const value = (max / gridSteps) * i;
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

      <!-- X-axis labels -->
      ${xLabels.map((label, index) => {
        const x = padding.left + index * stepX;
        return label && this.shouldShowLabel(index, xLabels.length) ? svg`
          <text
            x="${x}"
            y="${this.height - padding.bottom + 20 + this.getLabelLineOffset(index)}"
            text-anchor="middle"
            font-size="12"
            fill="#666"
          >
            ${label}
          </text>
        ` : '';
      })}

      <!-- Legend -->
      ${this.renderLegend(
        lines.map(line => ({
          label: line.label,
          color: line.stroke,
          value: 0  // Line charts don't have a single value per line
        }))
      )}
    `;
  }

  /**
   * Determine if auto-popup should be shown for an element.
   * For line charts, auto-popup can be set at chart, line, or point level.
   * @param elementAutoPopup The auto-popup setting from the element (undefined = inherit)
   * @param lineAutoPopup The auto-popup setting from the line (undefined = inherit from chart)
   * @returns true if auto-popup should be shown
   */
  private shouldShowAutoPopup(elementAutoPopup?: boolean, lineAutoPopup?: boolean): boolean {
    // Element-level setting takes precedence
    if (elementAutoPopup !== undefined) {
      return elementAutoPopup;
    }
    // Line-level setting is next
    if (lineAutoPopup !== undefined) {
      return lineAutoPopup;
    }
    // Otherwise inherit from chart
    return this.autoPopup;
  }

  /**
   * Generate default popup content for a line.
   * @param line The line data
   * @returns HTML string for the popup
   */
  private generateLinePopupContent(line: { label: string; points: Array<{ value: number }> }): string {
    const total = line.points.reduce((sum, p) => sum + p.value, 0);
    const avg = line.points.length > 0 ? (total / line.points.length).toFixed(1) : '0';
    return `<strong>${line.label}</strong><br>Points: ${line.points.length}<br>Avg: ${avg}`;
  }

  /**
   * Generate default popup content for a point.
   * @param point The point data
   * @param lineName The name of the line the point belongs to
   * @param totalValue Total value for percentage calculation
   * @returns HTML string for the popup
   */
  private generatePointPopupContent(point: { label: string; value: number }, lineName: string, totalValue: number): string {
    const percentage = totalValue > 0 ? ((point.value / totalValue) * 100).toFixed(1) : '0.0';
    return `<strong>${point.label}</strong><br>${lineName}<br>Value: ${point.value}<br>${percentage}%`;
  }

  private handleLineMouseEnter(e: MouseEvent, lineIndex: number) {
    const lines = this.getLines();
    const line = lines[lineIndex];

    // Explicit popup takes precedence over auto-popup
    if (line.popup?.trigger === 'hover') {
      this.showPopup(line.popup.content, e.clientX, e.clientY);
    } else if (!line.popup && this.shouldShowAutoPopup(line.autoPopup)) {
      // Show auto-popup for line
      const content = this.generateLinePopupContent(line);
      this.showPopup(content, e.clientX, e.clientY);
    }
  }

  private handleLineMouseLeave(lineIndex: number) {
    const lines = this.getLines();
    const line = lines[lineIndex];

    // Hide popup if it's a hover-triggered popup (explicit or auto) and not clicked
    const isHoverPopup = line.popup?.trigger === 'hover' ||
      (!line.popup && this.shouldShowAutoPopup(line.autoPopup));

    if (isHoverPopup && this.clickedPointIndex.lineIndex !== lineIndex) {
      this.hidePopup();
    }
  }

  private handleLineClick(e: MouseEvent, lineIndex: number) {
    const lines = this.getLines();
    const line = lines[lineIndex];

    // Only explicit click-triggered popups respond to clicks
    if (line.popup?.trigger === 'click') {
      if (this.clickedPointIndex.lineIndex === lineIndex &&
          this.clickedPointIndex.pointIndex === -1) {
        // Clicking same line again - hide popup
        this.hidePopup();
        this.clickedPointIndex = { lineIndex: -1, pointIndex: -1 };
      } else {
        // Show popup for clicked line
        this.clickedPointIndex = { lineIndex, pointIndex: -1 };
        this.showPopup(line.popup.content, e.clientX, e.clientY);
      }
    }
  }

  private handlePointMouseEnter(e: MouseEvent, lineIndex: number, pointIndex: number) {
    const lines = this.getLines();
    const line = lines[lineIndex];
    const point = line.points[pointIndex];

    // Explicit popup takes precedence over auto-popup
    if (point.popup?.trigger === 'hover') {
      this.showPopup(point.popup.content, e.clientX, e.clientY);
    } else if (!point.popup && this.shouldShowAutoPopup(point.autoPopup, line.autoPopup)) {
      // Show auto-popup for point
      const allValues = lines.flatMap(l => l.points.map(p => p.value));
      const totalValue = allValues.reduce((sum, v) => sum + v, 0);
      const content = this.generatePointPopupContent(point, line.label, totalValue);
      this.showPopup(content, e.clientX, e.clientY);
    }
  }

  private handlePointMouseLeave(lineIndex: number, pointIndex: number) {
    const lines = this.getLines();
    const line = lines[lineIndex];
    const point = line.points[pointIndex];

    // Hide popup if it's a hover-triggered popup (explicit or auto) and not clicked
    const isHoverPopup = point.popup?.trigger === 'hover' ||
      (!point.popup && this.shouldShowAutoPopup(point.autoPopup, line.autoPopup));

    if (isHoverPopup &&
        (this.clickedPointIndex.lineIndex !== lineIndex ||
         this.clickedPointIndex.pointIndex !== pointIndex)) {
      this.hidePopup();
    }
  }

  private handlePointClick(e: MouseEvent, lineIndex: number, pointIndex: number) {
    const lines = this.getLines();
    const point = lines[lineIndex].points[pointIndex];

    // Only explicit click-triggered popups respond to clicks
    if (point.popup?.trigger === 'click') {
      if (this.clickedPointIndex.lineIndex === lineIndex &&
          this.clickedPointIndex.pointIndex === pointIndex) {
        // Clicking same point again - hide popup
        this.hidePopup();
        this.clickedPointIndex = { lineIndex: -1, pointIndex: -1 };
      } else {
        // Show popup for clicked point
        this.clickedPointIndex = { lineIndex, pointIndex };
        this.showPopup(point.popup.content, e.clientX, e.clientY);
      }
    } else {
      // Clicked point without click-popup - clear any clicked state
      this.hidePopup();
      this.clickedPointIndex = { lineIndex: -1, pointIndex: -1 };
    }
  }

  /**
   * Get legend items for dimension calculation.
   * Returns line data formatted for legend rendering.
   *
   * NOTE: This method must NOT call calculateLineLayout() as that would create
   * a circular dependency (getChartPadding -> getLegendItems -> calculateLineLayout -> getChartPadding).
   * Instead, we get the data directly from getLines() which already resolves stroke colors.
   */
  protected override getLegendItems(): Array<{ label: string; color: string; value: number }> {
    const linesData = this.getLines();
    if (linesData.length === 0) return [];

    return linesData.map(line => ({
      label: line.label,
      color: line.stroke,
      value: 0  // Line charts don't have a single value per line
    }));
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'dc-line-chart': LineChart;
  }
}
