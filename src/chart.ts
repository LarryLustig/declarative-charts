import { customElement, property } from 'lit/decorators.js';
import { svg, SVGTemplateResult } from 'lit';
import { AxisChart } from './axis-chart.js';
import { type ShowCondition, type FocusableElement } from './base-chart.js';
import { analyzeLines, analyzeBars, analyzeBubbles, type LineData as InsightLineData, type BarData as InsightBarData, type BubbleData as InsightBubbleData } from './accessibility/index.js';
import type { LegendItem, DimensionlessLegendItem } from './chart-legend.js';
import type { ChartBar } from './chart-bar.js';
import type { ChartBarGroup } from './chart-bar-group.js';
import type { ChartBarSegment } from './chart-bar-segment.js';
import type { ChartLine, CurveFit } from './chart-line.js';
import type { ChartPoint } from './chart-point.js';
import type { ChartBubble } from './chart-bubble.js';
import type { ChartPopup } from './chart-popup.js';

// ============================================================================
// Deferred Label Rendering
// ============================================================================

interface DeferredLabel {
  x: number;
  y: number;
  text: string;
  anchor?: string;
  fontSize?: number;
}

// ============================================================================
// Data Structures for Bars
// ============================================================================

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

interface BarData {
  value: number;
  fill: string;
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
  // Pattern properties
  pattern?: string;
  patternStroke?: string;
  patternFill?: string;
  patternScale?: number;
}

interface BarGroupData {
  label: string;
  bars: BarData[];
  isGroup: true;
  gutter?: number;
}

interface UngroupedBarData extends BarData {
  isGroup: false;
}

type BarOrGroup = BarGroupData | UngroupedBarData;

interface FlattenedBar extends BarData {
  groupLabel?: string;
  groupIndex?: number;
  barIndexInGroup?: number;
  originalFill?: string;  // Original solid color for legend (fill may be pattern URL)
}

// ============================================================================
// Data Structures for Lines
// ============================================================================

interface PointData {
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
}

interface LineData {
  stroke: string;
  elementStroke?: string;
  label: string;
  curveFit: CurveFit;
  href?: string;
  target?: string;
  popup?: { content: string; trigger: string };
  autoPopup?: boolean;
  element?: ChartLine;
  passthroughAttrs?: Record<string, string>;
  points: PointData[];
}

// ============================================================================
// Data Structures for Bubbles
// ============================================================================

interface BubbleData {
  value: number;
  sizeValue: number;
  label: string;
  fill?: string;
  originalFill?: string;  // Original solid color for legend (fill may be pattern URL)
  stroke?: string;
  href?: string;
  target?: string;
  popup?: { content: string; trigger: string };
  autoPopup?: boolean;
  showValue: ShowCondition;
  showPercent: ShowCondition;
  passthroughAttrs?: Record<string, string>;
  // Pattern properties
  pattern?: string;
  patternStroke?: string;
  patternFill?: string;
  patternScale?: number;
}

/**
 * Unified chart component that can render bars, lines, and bubbles together.
 * This is the primary chart component for axis-based visualizations.
 *
 * @element dc-chart
 *
 * @attr {number} width - Width of the chart in pixels (default: 600)
 * @attr {number} height - Height of the chart in pixels (default: 400)
 * @attr {string} orientation - Bar orientation: "vertical" or "horizontal" (default: vertical)
 * @attr {boolean} show-value - Whether to display numeric values by default (default: true)
 * @attr {string} fill-colors - Fill colors for bars/bubbles
 * @attr {string} stroke-colors - Stroke colors for lines
 * @attr {string} bar-width - Default bar width
 * @attr {number} gutter - Spacing between bars (default: 10)
 * @attr {string} point-shape - Default shape for line points (default: "circle")
 * @attr {number} max-bubble-radius - Maximum bubble radius (default: 30)
 * @attr {number} min-bubble-radius - Minimum bubble radius (default: 5)
 *
 * @slot - Child elements: dc-title, dc-legend, dc-axis, dc-bar, dc-bar-group, dc-line, dc-bubble
 *
 * @example
 * <dc-chart width="600" height="400">
 *   <dc-title>Monthly Sales</dc-title>
 *   <dc-bar value="10" fill="red" label="Jan"></dc-bar>
 *   <dc-bar value="25" fill="blue" label="Feb"></dc-bar>
 * </dc-chart>
 *
 * @example
 * <dc-chart width="600" height="400">
 *   <dc-title>Temperature Trend</dc-title>
 *   <dc-line label="City A">
 *     <dc-point value="15" label="Mon"></dc-point>
 *     <dc-point value="18" label="Tue"></dc-point>
 *   </dc-line>
 * </dc-chart>
 *
 * @example
 * <dc-chart width="600" height="400">
 *   <dc-title>Sales with Trend Line</dc-title>
 *   <dc-bar value="30" label="Q1"></dc-bar>
 *   <dc-bar value="45" label="Q2"></dc-bar>
 *   <dc-bar value="35" label="Q3"></dc-bar>
 *   <dc-line stroke="red" label="Target">
 *     <dc-point value="35" label="Q1"></dc-point>
 *     <dc-point value="40" label="Q2"></dc-point>
 *     <dc-point value="45" label="Q3"></dc-point>
 *   </dc-line>
 * </dc-chart>
 */
@customElement('dc-chart')
export class Chart extends AxisChart {
  // Bar-specific properties
  @property({ type: String })
  orientation: 'vertical' | 'horizontal' | 'vertical-reverse' | 'horizontal-reverse' = 'vertical';

  @property({ type: String, attribute: 'bar-color' })
  barColor = '#4CAF50';

  @property({ type: String, attribute: 'bar-width' })
  barWidth?: string;

  @property({ type: Number })
  gutter = 10;

  // Line-specific properties
  @property({ type: String, attribute: 'line-color' })
  lineColor = '#2196F3';

  @property({ type: String, attribute: 'point-shape' })
  pointShape = 'circle';

  @property({ type: String, attribute: 'curve-fit' })
  curveFit: CurveFit = 'linear';

  // Bubble-specific properties
  @property({ type: Number, attribute: 'max-bubble-radius' })
  maxBubbleRadius = 30;

  @property({ type: Number, attribute: 'min-bubble-radius' })
  minBubbleRadius = 5;

  // Internal state
  private clickedBarIndex = -1;
  private clickedPointIndex = { lineIndex: -1, pointIndex: -1 };
  private clickedBubbleIndex = -1;
  private segmentColorMap: Map<string, string> = new Map();

  protected override getChartOrientation(): 'vertical' | 'horizontal' {
    return this.orientation.startsWith('horizontal') ? 'horizontal' : 'vertical';
  }

  // ============================================================================
  // Default Color Getters
  // ============================================================================

  private getDefaultBarFill(): string {
    if (this.fillColors) {
      const colors = this.fillColors.split(',').map(c => c.trim()).filter(c => c);
      if (colors.length > 0 && colors[0] !== 'auto') {
        return colors[0];
      }
    }
    return this.barColor;
  }

  private getDefaultLineStroke(): string {
    if (this.strokeColors) {
      const colors = this.strokeColors.split(',').map(c => c.trim()).filter(c => c);
      if (colors.length > 0 && colors[0] !== 'auto') {
        return colors[0];
      }
    }
    return this.lineColor;
  }

  // ============================================================================
  // CSS Unit Parsing
  // ============================================================================

  private parseCSSUnit(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    const match = trimmed.match(/^([\d.]+)(px|rem|em)?$/);
    if (!match) return undefined;
    const num = parseFloat(match[1]);
    const unit = match[2] || 'px';
    switch (unit) {
      case 'px': return num;
      case 'rem': return num * 16;
      case 'em': return num * 16;
      default: return num;
    }
  }

  // ============================================================================
  // Segment Color Map for Stacked Bars
  // ============================================================================

  private buildSegmentColorMap(): void {
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
    const colors = this.resolveFillColors(uniqueLabels.length, [], undefined);
    this.segmentColorMap.clear();
    uniqueLabels.forEach((label, index) => {
      this.segmentColorMap.set(label, colors[index]);
    });
  }

  private getSegmentColor(label: string): string {
    return this.segmentColorMap.get(label) || '#888888';
  }

  // ============================================================================
  // AxisChart Abstract Method Implementations
  // ============================================================================

  protected getMaxValue(): number {
    const barMax = this.getBarMaxValue();
    const lineMax = this.getLineMaxValue();
    const bubbleMax = this.getBubbleMaxValue();
    return Math.max(barMax, lineMax, bubbleMax, 1);
  }

  private getBarMaxValue(): number {
    const bars = this.getFlattenedBars();
    if (bars.length === 0) return 0;
    return Math.max(...bars.map(b => b.value));
  }

  private getLineMaxValue(): number {
    const lines = this.getLines();
    const allValues = lines.flatMap(line => line.points.map(p => p.value));
    if (allValues.length === 0) return 0;
    return Math.max(...allValues);
  }

  private getBubbleMaxValue(): number {
    const bubbles = this.getBubbles();
    if (bubbles.length === 0) return 0;
    return Math.max(...bubbles.map(b => b.value));
  }

  protected getAllValues(): number[] {
    const barValues = this.getFlattenedBars().map(b => b.value);
    const lineValues = this.getLines().flatMap(line => line.points.map(p => p.value));
    const bubbleValues = this.getBubbles().map(b => b.value);
    return [...barValues, ...lineValues, ...bubbleValues];
  }

  protected getCategoryLabels(): string[] {
    // Prefer bar labels, then line labels, then bubble labels
    const bars = this.getFlattenedBars();
    if (bars.length > 0) return bars.map(b => b.label);

    const lines = this.getLines();
    if (lines.length > 0 && lines[0].points.length > 0) {
      return lines[0].points.map(p => p.label);
    }

    const bubbles = this.getBubbles();
    if (bubbles.length > 0) return bubbles.map(b => b.label);

    return [];
  }

  // ============================================================================
  // Bar Data Extraction
  // ============================================================================

  private extractSegmentData(segment: ChartBarSegment, _parentFill: string, parentShowValue: ShowCondition, parentShowPercent: ShowCondition): SegmentData {
    const popupEl = segment.querySelector('dc-popup') as ChartPopup | null;
    const segmentFill = this.getSegmentColor(segment.label);
    const showValue = segment.hasAttribute('show-value') ? segment.showValue! : parentShowValue;
    const showPercent = segment.hasAttribute('show-percent') ? segment.showPercent! : parentShowPercent;
    const knownAttrs = new Set(['value', 'href', 'target', 'show-value', 'show-percent']);
    const passthroughAttrs = segment.getPassthroughAttributes(knownAttrs);

    return {
      value: segment.value,
      fill: segmentFill,
      label: segment.label,
      href: segment.href || undefined,
      target: segment.target || undefined,
      popup: popupEl ? { content: popupEl.content, trigger: popupEl.trigger } : undefined,
      autoPopup: segment.autoPopup,
      showValue,
      showPercent,
      element: segment,
      passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined
    };
  }

  private extractBarData(bar: ChartBar, groupBarWidth?: string, groupGutter?: number): BarData {
    const popupEl = bar.querySelector('dc-popup') as ChartPopup | null;
    const elementFill = bar.getEffectiveFill();
    const barFill = elementFill || '';
    const showValue = bar.hasAttribute('show-value') ? bar.showValue : this.showValue;
    const showPercent = bar.hasAttribute('show-percent') ? bar.showPercent! : this.showPercent;

    let width: string | undefined;
    if (bar.hasAttribute('width')) {
      width = bar.width;
    } else if (groupBarWidth) {
      width = groupBarWidth;
    } else if (this.barWidth) {
      width = this.barWidth;
    }

    const gutter = groupGutter !== undefined ? groupGutter : this.gutter;
    const knownAttrs = new Set(['value', 'href', 'target', 'show-value', 'show-percent', 'width']);
    const passthroughAttrs = bar.getPassthroughAttributes(knownAttrs);

    const segmentElements = Array.from(bar.querySelectorAll('dc-bar-segment')) as ChartBarSegment[];
    let segments: SegmentData[] | undefined;
    let totalValue = bar.value;

    if (segmentElements.length > 0) {
      segments = segmentElements.map(seg => this.extractSegmentData(seg, barFill, showValue, showPercent));
      totalValue = segments.reduce((sum, seg) => sum + seg.value, 0);
    }

    return {
      value: totalValue,
      fill: barFill,
      elementFill: elementFill || undefined,
      label: bar.label,
      href: bar.href || undefined,
      target: bar.target || undefined,
      popup: popupEl ? { content: popupEl.content, trigger: popupEl.trigger } : undefined,
      autoPopup: bar.autoPopup,
      showValue,
      showPercent,
      width,
      gutter,
      element: bar,
      passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined,
      segments,
      // Pattern properties
      pattern: bar.pattern,
      patternStroke: bar.patternStroke,
      patternFill: bar.patternFill,
      patternScale: bar.patternScale
    };
  }

  private getBarStructure(): BarOrGroup[] {
    const structure: BarOrGroup[] = [];
    Array.from(this.children).forEach(child => {
      // Skip hidden elements
      if (child.hasAttribute('hidden')) return;

      if (child.tagName === 'DC-BAR-GROUP') {
        const groupEl = child as ChartBarGroup;
        // Filter out hidden bars within the group
        const barElements = Array.from(groupEl.querySelectorAll('dc-bar'))
          .filter(el => !el.hasAttribute('hidden')) as ChartBar[];
        if (barElements.length === 0) return;
        const groupBars = barElements.map(bar => this.extractBarData(bar, groupEl.barWidth, groupEl.gutter));
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
        structure.push({ ...barData, isGroup: false });
      }
    });
    return structure;
  }

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

    if (flattened.length > 0) {
      // Prepare elements for pattern-aware fill resolution
      const elements = flattened.map(b => ({
        fill: b.elementFill,
        label: b.label,
        value: b.value,
        pattern: b.pattern,
        patternStroke: b.patternStroke,
        patternFill: b.patternFill,
        patternScale: b.patternScale,
        defaultColor: this.getDefaultBarFill()
      }));
      const resolvedFills = this.resolveFillsWithPatterns(elements);
      flattened.forEach((bar, index) => {
        bar.fill = resolvedFills[index].fill;
        bar.originalFill = resolvedFills[index].originalFill;
      });
    }

    return flattened;
  }

  // ============================================================================
  // Curve Fitting Path Generation
  // ============================================================================

  /**
   * Generate SVG path data for the given points using the specified curve fitting method.
   * @param points Array of {x, y} coordinates
   * @param curveFit The curve fitting method to use
   * @returns SVG path data string
   */
  private generatePathData(points: Array<{ x: number; y: number }>, curveFit: CurveFit): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    switch (curveFit) {
      case 'smooth':
        return this.generateCatmullRomPath(points);
      case 'monotone':
        return this.generateMonotonePath(points);
      case 'step':
        return this.generateStepPath(points);
      case 'linear':
      default:
        return this.generateLinearPath(points);
    }
  }

  /**
   * Generate linear path (straight line segments between points).
   */
  private generateLinearPath(points: Array<{ x: number; y: number }>): string {
    return points
      .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }

  /**
   * Generate step path (step-after: horizontal then vertical).
   */
  private generateStepPath(points: Array<{ x: number; y: number }>): string {
    if (points.length === 0) return '';

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Horizontal line to next x, then vertical line to next y
      path += ` H ${points[i].x} V ${points[i].y}`;
    }
    return path;
  }

  /**
   * Generate Catmull-Rom spline path (smooth curve through all points).
   * Uses cubic Bezier curves with control points derived from neighboring points.
   */
  private generateCatmullRomPath(points: Array<{ x: number; y: number }>, tension = 0.5): string {
    if (points.length < 2) return this.generateLinearPath(points);
    if (points.length === 2) return this.generateLinearPath(points);

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Calculate control points using Catmull-Rom to Bezier conversion
      const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
      const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
      const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
      const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  }

  /**
   * Generate monotone cubic interpolation path.
   * Ensures the curve doesn't overshoot between data points.
   * Uses Fritsch-Carlson method for monotonic cubic splines.
   */
  private generateMonotonePath(points: Array<{ x: number; y: number }>): string {
    if (points.length < 2) return this.generateLinearPath(points);
    if (points.length === 2) return this.generateLinearPath(points);

    const n = points.length;

    // Calculate secants (slopes between consecutive points)
    const deltas: number[] = [];
    const slopes: number[] = [];

    for (let i = 0; i < n - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      deltas.push(dx);
      slopes.push(dx === 0 ? 0 : dy / dx);
    }

    // Calculate tangents at each point using Fritsch-Carlson method
    const tangents: number[] = [];

    // First point tangent
    tangents.push(slopes[0]);

    // Interior point tangents
    for (let i = 1; i < n - 1; i++) {
      const m0 = slopes[i - 1];
      const m1 = slopes[i];

      // If slopes have different signs or either is zero, tangent is zero
      if (m0 * m1 <= 0) {
        tangents.push(0);
      } else {
        // Harmonic mean of slopes
        tangents.push(2 / (1 / m0 + 1 / m1));
      }
    }

    // Last point tangent
    tangents.push(slopes[n - 2]);

    // Ensure monotonicity by limiting tangent magnitudes
    for (let i = 0; i < n - 1; i++) {
      const m = slopes[i];
      if (m === 0) {
        tangents[i] = 0;
        tangents[i + 1] = 0;
      } else {
        const alpha = tangents[i] / m;
        const beta = tangents[i + 1] / m;

        // Limit to circle of radius 3
        const tau = alpha * alpha + beta * beta;
        if (tau > 9) {
          const t = 3 / Math.sqrt(tau);
          tangents[i] = t * alpha * m;
          tangents[i + 1] = t * beta * m;
        }
      }
    }

    // Build path using cubic Bezier curves
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < n - 1; i++) {
      const dx = deltas[i] / 3;
      const cp1x = points[i].x + dx;
      const cp1y = points[i].y + tangents[i] * dx;
      const cp2x = points[i + 1].x - dx;
      const cp2y = points[i + 1].y - tangents[i + 1] * dx;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i + 1].x} ${points[i + 1].y}`;
    }

    return path;
  }

  // ============================================================================
  // Line Data Extraction
  // ============================================================================

  private getLines(): LineData[] {
    const lineElements = Array.from(this.querySelectorAll('dc-line'))
      .filter(el => !el.hasAttribute('hidden')) as ChartLine[];

    const linesData = lineElements.map(line => {
      const pointElements = Array.from(line.querySelectorAll('dc-point')) as ChartPoint[];
      const elementStroke = line.getEffectiveStroke();
      const lineStroke = elementStroke || '';
      const lineShowValue = line.hasAttribute('show-value') ? line.showValue : this.showValue;
      const lineShowPercent = line.hasAttribute('show-percent') ? line.showPercent! : this.showPercent;
      const linePointShape = line.hasAttribute('point-shape') ? line.pointShape : this.pointShape;
      const lineCurveFit = line.hasAttribute('curve-fit') ? line.curveFit! : this.curveFit;

      const linePopupEl = Array.from(line.children).find(
        child => child.tagName.toLowerCase() === 'dc-popup'
      ) as ChartPopup | null;

      const knownAttrs = new Set(['label', 'color', 'stroke', 'fill', 'href', 'target', 'show-value', 'show-percent', 'point-shape', 'curve-fit']);
      const passthroughAttrs = line.getPassthroughAttributes(knownAttrs);

      return {
        stroke: lineStroke,
        elementStroke: elementStroke || undefined,
        label: line.label,
        curveFit: lineCurveFit,
        href: line.href || undefined,
        target: line.target || undefined,
        popup: linePopupEl ? { content: linePopupEl.content, trigger: linePopupEl.trigger } : undefined,
        autoPopup: line.autoPopup,
        element: line,
        passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined,
        points: pointElements.map(point => {
          const popupEl = point.querySelector('dc-popup') as ChartPopup | null;
          const showValue = point.hasAttribute('show-value') ? point.showValue : lineShowValue;
          const showPercent = point.hasAttribute('show-percent') ? point.showPercent! : lineShowPercent;
          const shape = point.hasAttribute('shape') ? point.shape : linePointShape;
          const effectiveFill = point.getEffectiveFill();
          return {
            value: point.value,
            label: point.label,
            fill: effectiveFill || undefined,
            href: point.href || undefined,
            target: point.target || undefined,
            popup: popupEl ? { content: popupEl.content, trigger: popupEl.trigger } : undefined,
            autoPopup: point.autoPopup,
            showValue,
            showPercent,
            shape
          };
        })
      };
    });

    if (linesData.length > 0) {
      const elements = linesData.map(l => ({
        stroke: l.elementStroke,
        label: l.label
      }));
      const strokeColors = this.resolveStrokeColorsWithPalette(elements, this.getDefaultLineStroke());
      linesData.forEach((line, index) => {
        line.stroke = strokeColors[index];
      });
    }

    return linesData;
  }

  // ============================================================================
  // Bubble Data Extraction
  // ============================================================================

  private getBubbles(): BubbleData[] {
    const bubbleElements = Array.from(this.querySelectorAll('dc-bubble'))
      .filter(el => !el.hasAttribute('hidden')) as ChartBubble[];

    const bubblesData = bubbleElements.map(bubble => {
      const popupEl = bubble.querySelector('dc-popup') as ChartPopup | null;
      const showValue = bubble.hasAttribute('show-value') ? bubble.showValue : this.showValue;
      const showPercent = bubble.hasAttribute('show-percent') ? bubble.showPercent! : this.showPercent;
      const effectiveFill = bubble.getEffectiveFill();
      const knownAttrs = new Set(['value', 'size-value', 'label', 'fill', 'stroke', 'href', 'target', 'show-value', 'show-percent']);
      const passthroughAttrs = bubble.getPassthroughAttributes(knownAttrs);

      return {
        value: bubble.value,
        sizeValue: bubble.sizeValue,
        label: bubble.label,
        fill: effectiveFill || undefined,
        originalFill: undefined as string | undefined,  // Will be set after pattern resolution
        stroke: bubble.stroke || undefined,
        href: bubble.href || undefined,
        target: bubble.target || undefined,
        popup: popupEl ? { content: popupEl.content, trigger: popupEl.trigger } : undefined,
        autoPopup: bubble.autoPopup,
        showValue,
        showPercent,
        passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined,
        // Pattern properties
        pattern: bubble.pattern,
        patternStroke: bubble.patternStroke,
        patternFill: bubble.patternFill,
        patternScale: bubble.patternScale
      };
    });

    if (bubblesData.length > 0) {
      // Prepare elements for pattern-aware fill resolution
      const elements = bubblesData.map(b => ({
        fill: b.fill,
        label: b.label,
        value: b.value,
        pattern: b.pattern,
        patternStroke: b.patternStroke,
        patternFill: b.patternFill,
        patternScale: b.patternScale,
        defaultColor: '#4CAF50'
      }));
      const resolvedFills = this.resolveFillsWithPatterns(elements);
      bubblesData.forEach((bubble, index) => {
        bubble.fill = resolvedFills[index].fill;
        bubble.originalFill = resolvedFills[index].originalFill;
      });
    }

    return bubblesData;
  }

  // ============================================================================
  // Axis Label Padding
  // ============================================================================

  protected override getAxisLabelPadding(): { top: number; right: number; bottom: number; left: number } {
    const bars = this.getFlattenedBars();
    const lines = this.getLines();
    const bubbles = this.getBubbles();
    const structure = this.getBarStructure();

    // If no data yet, return defaults
    if (bars.length === 0 && lines.length === 0 && bubbles.length === 0) {
      return super.getAxisLabelPadding();
    }

    const maxValue = this.getNiceMax();
    const maxValueStr = maxValue.toFixed(0);
    const maxValueWidth = this.measureText(maxValueStr, 11) + 15;

    const hasGroups = structure.some(item => item.isGroup);
    const labelLines = this.getLabelLinesCount();
    const barLabelHeight = 25 * labelLines;
    const groupLabelHeight = hasGroups ? 25 : 0;
    const numericLabelHeight = 25;
    const valueLabelHeight = 25;

    // Check for axis titles
    const leftAxisTitle = this.getAxisTitleDimensions('left');
    const bottomAxisTitle = this.getAxisTitleDimensions('bottom');
    const rightAxisTitle = this.getAxisTitleDimensions('right');
    const topAxisTitle = this.getAxisTitleDimensions('top');

    // Extra padding for bubbles
    const bubbleTopPadding = bubbles.length > 0 ? this.maxBubbleRadius : 0;
    const bubbleRightPadding = bubbles.length > 0 ? this.maxBubbleRadius : 0;

    // Calculate based on orientation (for bars)
    if (bars.length > 0 && this.orientation === 'horizontal') {
      const longestLabel = bars.reduce((longest: string, bar: FlattenedBar) =>
        (bar.label?.length || 0) > (longest?.length || 0) ? bar.label : longest,
        ''
      ) || '';
      const baseLabelWidth = this.measureText(longestLabel, 12) + 15;
      const longestGroupLabelWidth = hasGroups
        ? Math.max(...structure.filter(s => s.isGroup).map(s => this.measureText((s as BarGroupData).label, 13))) + 20
        : 0;
      const valueWidth = this.measureText(maxValueStr, 14) + 15;

      return {
        top: (topAxisTitle?.height || 0) + bubbleTopPadding,
        right: valueWidth + (rightAxisTitle?.width || 0) + bubbleRightPadding,
        bottom: numericLabelHeight + (bottomAxisTitle?.height || 0),
        left: Math.max(baseLabelWidth * labelLines, longestGroupLabelWidth) + (leftAxisTitle?.width || 0)
      };
    }

    // Default: vertical orientation
    return {
      top: valueLabelHeight + (topAxisTitle?.height || 0) + bubbleTopPadding,
      right: (rightAxisTitle?.width || 0) + bubbleRightPadding,
      bottom: barLabelHeight + groupLabelHeight + (bottomAxisTitle?.height || 0),
      left: maxValueWidth + (leftAxisTitle?.width || 0)
    };
  }

  // ============================================================================
  // Unit Dimension Calculations (for bars)
  // ============================================================================

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
    let totalGutterSpace = 0;
    structure.forEach(unit => {
      const gutter = unit.isGroup ? (unit.gutter ?? this.gutter) : (unit.gutter ?? this.gutter);
      totalGutterSpace += gutter;
    });

    const unitSizes: number[] = [];
    let totalCustomSize = 0;
    let unitsWithoutCustomSize = 0;

    structure.forEach(unit => {
      if (unit.isGroup) {
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
          unitSizes.push(groupSize);
          totalCustomSize += groupSize;
        } else {
          unitSizes.push(-1);
          unitsWithoutCustomSize++;
        }
      } else {
        const parsedSize = this.parseCSSUnit(unit.width);
        if (parsedSize !== undefined) {
          unitSizes.push(parsedSize);
          totalCustomSize += parsedSize;
        } else {
          unitSizes.push(-1);
          unitsWithoutCustomSize++;
        }
      }
    });

    const remainingSpace = availableSpace - totalCustomSize - totalGutterSpace;
    const defaultUnitSize = unitsWithoutCustomSize > 0 ? remainingSpace / unitsWithoutCustomSize : 0;
    const finalUnitSizes = unitSizes.map(s => s === -1 ? defaultUnitSize : s);

    return {
      unitSizes: finalUnitSizes,
      totalGutterSpace,
      totalCustomSize,
      remainingSpace,
      defaultUnitSize,
      unitsWithoutCustomSize
    };
  }

  // ============================================================================
  // Bubble Radius Calculation
  // ============================================================================

  private calculateBubbleRadius(sizeValue: number, maxSizeValue: number): number {
    if (maxSizeValue <= 0) return this.minBubbleRadius;
    const normalizedArea = sizeValue / maxSizeValue;
    const radius = Math.sqrt(normalizedArea) * this.maxBubbleRadius;
    return Math.max(radius, this.minBubbleRadius);
  }

  // ============================================================================
  // Point Shape Rendering
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
            cx="${x}" cy="${y}" r="${size}"
            fill="${color}" style="cursor: ${cursor}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;

      case 'square':
        return svg`
          <rect
            x="${x - size}" y="${y - size}"
            width="${size * 2}" height="${size * 2}"
            fill="${color}" style="cursor: ${cursor}"
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
            fill="${color}" style="cursor: ${cursor}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;

      case 'diamond':
        return svg`
          <polygon
            points="${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}"
            fill="${color}" style="cursor: ${cursor}"
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
            fill="${color}" style="cursor: ${cursor}"
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
            stroke="${color}" stroke-width="2" style="cursor: ${cursor}"
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
            stroke="${color}" stroke-width="2" style="cursor: ${cursor}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;

      default:
        return svg`
          <text
            x="${x}" y="${y}"
            text-anchor="middle" dominant-baseline="middle"
            font-size="${size * 2.5}" fill="${color}"
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

  // ============================================================================
  // Bar Content Rendering (including segments)
  // ============================================================================

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
      return this.renderSegmentedBar(bar, index, orientation, rect, max, chartSize, total, reverse);
    }

    const hasPopup = bar.href || bar.popup || this.shouldShowAutoPopup(bar.autoPopup);
    const barRect = svg`
      <rect
        x="${rect.x}" y="${rect.y}"
        width="${rect.width}" height="${rect.height}"
        fill="${bar.fill}"
        style="cursor: ${hasPopup ? 'pointer' : 'default'}"
        data-shape-index="${index}"
        @mouseenter="${(e: MouseEvent) => this.handleBarMouseEnter(e, index)}"
        @mouseleave="${() => this.handleBarMouseLeave(index)}"
        @click="${(e: MouseEvent) => this.handleBarClick(e, index)}"
      />
    `;

    return svg`
      ${bar.href ? svg`<a href="${bar.href}" target="${bar.target || '_self'}">${barRect}</a>` : barRect}
    `;
  }

  private renderSegmentedBar(
    bar: FlattenedBar,
    index: number,
    orientation: 'vertical' | 'horizontal',
    rect: { x: number; y: number; width: number; height: number },
    max: number,
    chartSize: number,
    total: number,
    reverse: boolean
  ): SVGTemplateResult {
    const segments = bar.segments!;

    if (orientation === 'vertical') {
      let segmentY = reverse ? rect.y : rect.y + rect.height;

      return svg`
        ${segments.map((segment, segIndex) => {
          const segmentHeight = (segment.value / max) * chartSize;
          const currentY = reverse ? segmentY : segmentY - segmentHeight;
          if (reverse) {
            segmentY += segmentHeight;
          } else {
            segmentY -= segmentHeight;
          }

          const hasSegmentPopup = segment.href || segment.popup || this.shouldShowAutoPopup(segment.autoPopup);
          const segRect = svg`
            <rect
              x="${rect.x}" y="${currentY}"
              width="${rect.width}" height="${segmentHeight}"
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
            ${segment.href ? svg`<a href="${segment.href}" target="${segment.target || '_self'}">${segRect}</a>` : segRect}
            ${segValueString ? svg`
              <text
                x="${rect.x + rect.width / 2}"
                y="${currentY + segmentHeight / 2 + 4}"
                text-anchor="middle" font-size="12" fill="#fff"
              >${segValueString}</text>
            ` : ''}
          `;
        })}
      `;
    } else {
      // Horizontal
      let segmentX = reverse ? rect.x + rect.width : rect.x;

      return svg`
        ${segments.map((segment, segIndex) => {
          const segmentWidth = (segment.value / max) * chartSize;
          const currentX = reverse ? segmentX - segmentWidth : segmentX;
          if (reverse) {
            segmentX -= segmentWidth;
          } else {
            segmentX += segmentWidth;
          }

          const hasSegmentPopup = segment.href || segment.popup || this.shouldShowAutoPopup(segment.autoPopup);
          const segRect = svg`
            <rect
              x="${currentX}" y="${rect.y}"
              width="${segmentWidth}" height="${rect.height}"
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
            ${segment.href ? svg`<a href="${segment.href}" target="${segment.target || '_self'}">${segRect}</a>` : segRect}
            ${segValueString ? svg`
              <text
                x="${currentX + segmentWidth / 2}"
                y="${rect.y + rect.height / 2 + 4}"
                text-anchor="middle" font-size="12" fill="#fff"
              >${segValueString}</text>
            ` : ''}
          `;
        })}
      `;
    }
  }

  // ============================================================================
  // Main Render Method
  // ============================================================================

  protected updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    // Apply passthrough attributes for all element types
    this.applyPassthroughAttributes(this.getFlattenedBars());
    this.applyPassthroughAttributes(this.getLines());
    this.applyPassthroughAttributes(this.getBubbles());
  }

  protected renderChart(): SVGTemplateResult {
    // Clear used patterns before resolving fills
    this.clearUsedPatterns();
    this.buildSegmentColorMap();

    const bars = this.getFlattenedBars();
    const lines = this.getLines();
    const bubbles = this.getBubbles();
    const structure = this.getBarStructure();

    if (bars.length === 0 && lines.length === 0 && bubbles.length === 0) {
      return svg``;
    }

    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;
    const chartHeight = this.height - padding.top - padding.bottom;
    const max = this.getNiceMax();
    const allValues = this.getAllValues();
    const total = allValues.reduce((sum, v) => sum + v, 0);

    // Log layout info
    this.log('info', 'data.barCount', `Number of bars`, bars.length);
    this.log('info', 'data.lineCount', `Number of lines`, lines.length);
    this.log('info', 'data.bubbleCount', `Number of bubbles`, bubbles.length);
    this.log('info', 'data.maxValue', `Maximum value`, max);
    this.log('info', 'layout.chartArea', `chartWidth=${chartWidth.toFixed(1)}, chartHeight=${chartHeight.toFixed(1)}`, { width: chartWidth, height: chartHeight });

    const isHorizontal = this.orientation.startsWith('horizontal');
    const isReverse = this.orientation.includes('reverse');

    // Collect value labels to render them last (on top of lines)
    const deferredLabels: DeferredLabel[] = [];

    return svg`
      ${this.renderDefs()}

      <!-- Grid lines -->
      ${this.renderGridLines(padding, chartWidth, chartHeight, max, isHorizontal ? 'horizontal' : 'vertical')}

      <!-- Bars -->
      ${bars.length > 0 ? this.renderBars(bars, structure, padding, chartWidth, chartHeight, max, total, deferredLabels) : ''}

      <!-- Bubbles (rendered after bars but before lines) -->
      ${bubbles.length > 0 ? this.renderBubbles(bubbles, padding, chartWidth, chartHeight, max, total, deferredLabels) : ''}

      <!-- Lines (rendered on top of shapes) -->
      ${lines.length > 0 ? this.renderLines(lines, padding, chartWidth, chartHeight, max, total, deferredLabels) : ''}

      <!-- Value labels (rendered last, on top of everything) -->
      ${deferredLabels.map(label => svg`
        <text
          x="${label.x}"
          y="${label.y}"
          text-anchor="${label.anchor || 'middle'}"
          font-size="${label.fontSize || 14}"
          fill="#333"
        >${label.text}</text>
      `)}

      <!-- Axes -->
      ${this.renderAxes(padding, isHorizontal ? 'horizontal' : 'vertical', isReverse)}

      <!-- Value axis labels -->
      ${this.renderValueAxisLabels(padding, chartWidth, chartHeight, max, isHorizontal ? 'horizontal' : 'vertical', isReverse)}

      <!-- Category axis labels -->
      ${this.renderCategoryAxisLabels(bars, lines, bubbles, padding, chartWidth, chartHeight, structure)}

      <!-- Axis Titles -->
      ${this.renderAxisTitle('left', padding, chartWidth, chartHeight)}
      ${this.renderAxisTitle('bottom', padding, chartWidth, chartHeight)}
      ${this.renderAxisTitle('right', padding, chartWidth, chartHeight)}
      ${this.renderAxisTitle('top', padding, chartWidth, chartHeight)}

      <!-- Legend -->
      ${this.renderLegend(this.getLegendItems())}

      ${this.renderFocusIndicator()}
    `;
  }

  // ============================================================================
  // Bar Rendering
  // ============================================================================

  private renderBars(
    bars: FlattenedBar[],
    structure: BarOrGroup[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    max: number,
    total: number,
    deferredLabels: DeferredLabel[]
  ): SVGTemplateResult {
    const isHorizontal = this.orientation.startsWith('horizontal');
    const isReverse = this.orientation.includes('reverse');

    if (isHorizontal) {
      return this.renderHorizontalBars(bars, structure, padding, chartWidth, chartHeight, max, total, isReverse, deferredLabels);
    } else {
      return this.renderVerticalBars(bars, structure, padding, chartWidth, chartHeight, max, total, isReverse, deferredLabels);
    }
  }

  private renderVerticalBars(
    bars: FlattenedBar[],
    structure: BarOrGroup[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    max: number,
    total: number,
    reverse: boolean,
    deferredLabels: DeferredLabel[]
  ): SVGTemplateResult {
    const { unitSizes: finalUnitWidths } = this.calculateUnitDimensions(structure, chartWidth);

    let barIndex = 0;
    let unitIndex = 0;
    let cumulativeX = padding.left;

    return svg`
      ${bars.map((bar, index) => {
        const barHeight = (bar.value / max) * chartHeight;
        const y = reverse ? padding.top : this.height - padding.bottom - barHeight;

        const currentUnit = structure[unitIndex];
        const currentUnitWidth = finalUnitWidths[unitIndex];
        const currentGutter = currentUnit.isGroup ? (currentUnit.gutter ?? this.gutter) : (currentUnit.gutter ?? this.gutter);
        let x: number;
        let barWidth: number;

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
            cumulativeX += currentGutter / 2;
            unitIndex++;
          }
        } else {
          x = cumulativeX;
          barWidth = currentUnitWidth;
          cumulativeX += currentUnitWidth + currentGutter / 2;
          barIndex = 0;
          unitIndex++;
        }

        const percent = total > 0 ? (bar.value / total) * 100 : 0;
        const shouldShowValue = this.evaluateShowCondition(bar.showValue, bar.value, percent);
        const shouldShowPercent = this.evaluateShowCondition(bar.showPercent, bar.value, percent);
        const valueString = this.formatValueString(bar.value, percent, shouldShowValue, shouldShowPercent);

        // Defer label rendering to ensure it appears on top of lines
        if (valueString) {
          deferredLabels.push({
            x: x + barWidth / 2,
            y: reverse ? y + barHeight + 15 : y - 8,
            text: valueString,
            anchor: 'middle',
            fontSize: 14
          });
        }

        return svg`
          ${this.renderBarContent(bar, index, 'vertical', { x, y, width: barWidth, height: barHeight }, max, chartHeight, total, reverse)}
        `;
      })}
    `;
  }

  private renderHorizontalBars(
    bars: FlattenedBar[],
    structure: BarOrGroup[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    max: number,
    total: number,
    reverse: boolean,
    deferredLabels: DeferredLabel[]
  ): SVGTemplateResult {
    const { unitSizes: finalUnitHeights } = this.calculateUnitDimensions(structure, chartHeight);

    let barIndex = 0;
    let unitIndex = 0;
    let cumulativeY = padding.top;

    return svg`
      ${bars.map((bar, index) => {
        const barWidth = (bar.value / max) * chartWidth;
        const x = reverse ? this.width - padding.right - barWidth : padding.left;

        const currentUnit = structure[unitIndex];
        const currentUnitHeight = finalUnitHeights[unitIndex];
        const currentGutter = currentUnit.isGroup ? (currentUnit.gutter ?? this.gutter) : (currentUnit.gutter ?? this.gutter);
        let y: number;
        let barHeight: number;

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
            cumulativeY += currentGutter / 2;
            unitIndex++;
          }
        } else {
          y = cumulativeY;
          barHeight = currentUnitHeight;
          cumulativeY += currentUnitHeight + currentGutter / 2;
          barIndex = 0;
          unitIndex++;
        }

        const percent = total > 0 ? (bar.value / total) * 100 : 0;
        const shouldShowValue = this.evaluateShowCondition(bar.showValue, bar.value, percent);
        const shouldShowPercent = this.evaluateShowCondition(bar.showPercent, bar.value, percent);
        const valueString = this.formatValueString(bar.value, percent, shouldShowValue, shouldShowPercent);

        // Defer label rendering to ensure it appears on top of lines
        if (valueString) {
          deferredLabels.push({
            x: reverse ? x - 8 : x + barWidth + 8,
            y: y + barHeight / 2 + 4,
            text: valueString,
            anchor: reverse ? 'end' : 'start',
            fontSize: 14
          });
        }

        return svg`
          ${this.renderBarContent(bar, index, 'horizontal', { x, y, width: barWidth, height: barHeight }, max, chartWidth, total, reverse)}
        `;
      })}
    `;
  }

  // ============================================================================
  // Line Rendering
  // ============================================================================

  private renderLines(
    lines: LineData[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    max: number,
    total: number,
    deferredLabels: DeferredLabel[]
  ): SVGTemplateResult {
    const isHorizontal = this.orientation.startsWith('horizontal');
    const isReverse = this.orientation.includes('reverse');

    const bars = this.getFlattenedBars();
    const structure = this.getBarStructure();

    // Build label-to-position map for matching line points to bars/groups
    // Priority: group labels > individual bar labels > index-based fallback
    // NOTE: Future enhancement (Option C) may need label+index matching for
    // cases where bar labels repeat across groups (e.g., "North" in Q1, Q2, Q3, Q4)
    const labelPositions = new Map<string, number>();

    if (!isHorizontal && bars.length > 0) {
      // Vertical orientation: build X position map
      const { unitSizes: finalUnitWidths } = this.calculateUnitDimensions(structure, chartWidth);
      let cumulativeX = padding.left;

      structure.forEach((unit, unitIndex) => {
        const currentUnitWidth = finalUnitWidths[unitIndex];
        const currentGutter = unit.isGroup ? (unit.gutter ?? this.gutter) : (unit.gutter ?? this.gutter);

        cumulativeX += currentGutter / 2;
        const unitCenterX = cumulativeX + currentUnitWidth / 2;

        if (unit.isGroup) {
          // Group label -> group center X (takes priority)
          labelPositions.set(unit.label, unitCenterX);
        } else {
          // Individual bar label -> bar center X
          labelPositions.set(unit.label, unitCenterX);
        }

        cumulativeX += currentUnitWidth + currentGutter / 2;
      });
    } else if (isHorizontal && bars.length > 0) {
      // Horizontal orientation: build Y position map
      const { unitSizes: finalUnitHeights } = this.calculateUnitDimensions(structure, chartHeight);
      let cumulativeY = padding.top;

      structure.forEach((unit, unitIndex) => {
        const currentUnitHeight = finalUnitHeights[unitIndex];
        const currentGutter = unit.isGroup ? (unit.gutter ?? this.gutter) : (unit.gutter ?? this.gutter);

        cumulativeY += currentGutter / 2;
        const unitCenterY = cumulativeY + currentUnitHeight / 2;

        if (unit.isGroup) {
          // Group label -> group center Y (takes priority)
          labelPositions.set(unit.label, unitCenterY);
        } else {
          // Individual bar label -> bar center Y
          labelPositions.set(unit.label, unitCenterY);
        }

        cumulativeY += currentUnitHeight + currentGutter / 2;
      });
    }

    // Calculate fallback step for index-based positioning (when no label match)
    const pointCount = bars.length > 0
      ? bars.length
      : Math.max(...lines.map(line => line.points.length), 1);

    const stepX = bars.length > 0
      ? chartWidth / pointCount
      : chartWidth / (pointCount - 1 || 1);
    const stepY = bars.length > 0
      ? chartHeight / pointCount
      : chartHeight / (pointCount - 1 || 1);

    return svg`
      ${lines.map((line, lineIndex) => {
        if (line.points.length === 0) return '';

        // Calculate point positions based on orientation
        // Use label matching first, then fall back to index-based positioning
        const pointPositions = line.points.map((point, pointIndex) => {
          let x: number;
          let y: number;

          if (isHorizontal) {
            // Horizontal orientation: x is value-based, y is category-based
            const valueX = (point.value / max) * chartWidth;
            x = isReverse ? this.width - padding.right - valueX : padding.left + valueX;

            // Try label matching first, then fall back to index-based
            if (labelPositions.has(point.label)) {
              y = labelPositions.get(point.label)!;
            } else {
              y = bars.length > 0
                ? padding.top + stepY / 2 + pointIndex * stepY
                : padding.top + pointIndex * stepY;
            }
          } else {
            // Vertical orientation (default): x is category-based, y is value-based
            // Try label matching first, then fall back to index-based
            if (labelPositions.has(point.label)) {
              x = labelPositions.get(point.label)!;
            } else {
              x = bars.length > 0
                ? padding.left + stepX / 2 + pointIndex * stepX
                : padding.left + pointIndex * stepX;
            }
            y = this.height - padding.bottom - (point.value / max) * chartHeight;
          }

          return { x, y, ...point };
        });

        // Generate path using the line's curve fitting method
        const pathData = this.generatePathData(pointPositions, line.curveFit);

        const lineHasPopup = line.href || line.popup || this.shouldShowAutoPopup(line.autoPopup);

        const linePath = svg`
          <path
            d="${pathData}"
            stroke="${line.stroke}"
            stroke-width="3"
            fill="none"
            style="cursor: ${lineHasPopup ? 'pointer' : 'default'}"
            data-shape-index="${lineIndex}"
            @mouseenter="${(e: MouseEvent) => this.handleLineMouseEnter(e, lineIndex)}"
            @mouseleave="${() => this.handleLineMouseLeave(lineIndex)}"
            @click="${(e: MouseEvent) => this.handleLineClick(e, lineIndex)}"
          />
        `;

        return svg`
          ${line.href ? svg`<a href="${line.href}" target="${line.target || '_self'}">${linePath}</a>` : linePath}
          ${pointPositions.map((pos, pointIndex) => {
            const pointHasPopup = pos.href || pos.popup || this.shouldShowAutoPopup(pos.autoPopup, line.autoPopup);
            const pointColor = pos.fill || line.stroke;

            const pointShape = this.renderPointShape(
              pos.shape,
              pos.x,
              pos.y,
              5,
              pointColor,
              pointHasPopup ? 'pointer' : 'default',
              {
                mouseenter: (e: MouseEvent) => this.handlePointMouseEnter(e, lineIndex, pointIndex),
                mouseleave: () => this.handlePointMouseLeave(lineIndex, pointIndex),
                click: (e: MouseEvent) => this.handlePointClick(e, lineIndex, pointIndex)
              }
            );

            const percent = total > 0 ? (pos.value / total) * 100 : 0;
            const shouldShowValue = this.evaluateShowCondition(pos.showValue, pos.value, percent);
            const shouldShowPercent = this.evaluateShowCondition(pos.showPercent, pos.value, percent);
            const valueString = this.formatValueString(pos.value, percent, shouldShowValue, shouldShowPercent);

            // Defer label rendering to ensure it appears on top of bars
            if (valueString) {
              deferredLabels.push({
                x: pos.x,
                y: pos.y - 10,
                text: valueString,
                anchor: 'middle',
                fontSize: 12
              });
            }

            return svg`
              ${pos.href ? svg`<a href="${pos.href}" target="${pos.target || '_self'}">${pointShape}</a>` : pointShape}
            `;
          })}
        `;
      })}
    `;
  }

  // ============================================================================
  // Bubble Rendering
  // ============================================================================

  private renderBubbles(
    bubbles: BubbleData[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    max: number,
    total: number,
    deferredLabels: DeferredLabel[]
  ): SVGTemplateResult {
    const maxSizeValue = Math.max(...bubbles.map(b => b.sizeValue), 1);
    const stepX = chartWidth / bubbles.length;

    return svg`
      ${bubbles.map((bubble, index) => {
        const x = padding.left + stepX / 2 + index * stepX;
        const y = this.height - padding.bottom - (bubble.value / max) * chartHeight;
        const radius = this.calculateBubbleRadius(bubble.sizeValue, maxSizeValue);

        const bubbleHasPopup = bubble.href || bubble.popup || this.shouldShowAutoPopup(bubble.autoPopup);

        const bubbleCircle = svg`
          <circle
            cx="${x}" cy="${y}" r="${radius}"
            fill="${bubble.fill}"
            stroke="${bubble.stroke || 'none'}"
            stroke-width="${bubble.stroke ? 2 : 0}"
            opacity="0.7"
            data-shape-index="${index}"
            style="cursor: ${bubbleHasPopup ? 'pointer' : 'default'}"
            @mouseenter="${(e: MouseEvent) => this.handleBubbleMouseEnter(e, index)}"
            @mouseleave="${() => this.handleBubbleMouseLeave(index)}"
            @click="${(e: MouseEvent) => this.handleBubbleClick(e, index)}"
          />
        `;

        const percent = total > 0 ? (bubble.value / total) * 100 : 0;
        const shouldShowValue = this.evaluateShowCondition(bubble.showValue, bubble.value, percent);
        const shouldShowPercent = this.evaluateShowCondition(bubble.showPercent, bubble.value, percent);
        const valueString = this.formatValueString(bubble.value, percent, shouldShowValue, shouldShowPercent);

        // Defer label rendering to ensure it appears on top of lines
        if (valueString) {
          deferredLabels.push({
            x,
            y: y - radius - 8,
            text: valueString,
            anchor: 'middle',
            fontSize: 12
          });
        }

        return svg`
          ${bubble.href ? svg`<a href="${bubble.href}" target="${bubble.target || '_self'}">${bubbleCircle}</a>` : bubbleCircle}
        `;
      })}
    `;
  }

  // ============================================================================
  // Category Axis Labels
  // ============================================================================

  private renderCategoryAxisLabels(
    bars: FlattenedBar[],
    lines: LineData[],
    bubbles: BubbleData[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    structure: BarOrGroup[]
  ): SVGTemplateResult {
    const isHorizontal = this.orientation.startsWith('horizontal');
    const isReverse = this.orientation.includes('reverse');

    // Determine labels and positions
    if (bars.length > 0) {
      return this.renderBarCategoryLabels(bars, structure, padding, chartWidth, chartHeight, isHorizontal, isReverse);
    } else if (lines.length > 0 && lines[0].points.length > 0) {
      return this.renderLineCategoryLabels(lines[0].points, padding, chartWidth);
    } else if (bubbles.length > 0) {
      return this.renderBubbleCategoryLabels(bubbles, padding, chartWidth);
    }

    return svg``;
  }

  private renderBarCategoryLabels(
    bars: FlattenedBar[],
    structure: BarOrGroup[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    isHorizontal: boolean,
    isReverse: boolean
  ): SVGTemplateResult {
    const { unitSizes } = this.calculateUnitDimensions(structure, isHorizontal ? chartHeight : chartWidth);

    if (isHorizontal) {
      // Horizontal bars: labels on the left (or right if reverse)
      let barIndex = 0;
      let unitIndex = 0;
      let cumulativeY = padding.top;

      return svg`
        ${bars.map((bar, index) => {
          const currentUnit = structure[unitIndex];
          const currentUnitHeight = unitSizes[unitIndex];
          const currentGutter = currentUnit.isGroup ? (currentUnit.gutter ?? this.gutter) : (currentUnit.gutter ?? this.gutter);
          let y: number;
          let barHeight: number;

          if (barIndex === 0) {
            cumulativeY += currentGutter / 2;
          }

          if (currentUnit.isGroup) {
            const groupBarCount = currentUnit.bars.length;
            const barHeightInGroup = currentUnitHeight / groupBarCount;
            y = cumulativeY + barIndex * barHeightInGroup;
            barHeight = barHeightInGroup;

            barIndex++;
            if (barIndex >= groupBarCount) {
              barIndex = 0;
              cumulativeY += currentUnitHeight + currentGutter / 2;
              unitIndex++;
            }
          } else {
            y = cumulativeY;
            barHeight = currentUnitHeight;
            cumulativeY += currentUnitHeight + currentGutter / 2;
            barIndex = 0;
            unitIndex++;
          }

          if (!bar.label || !this.shouldShowLabel(index, bars.length)) return '';

          const labelX = isReverse
            ? this.width - padding.right + 10 + this.getLabelLineOffset(index, 60)
            : padding.left - 10 - this.getLabelLineOffset(index, 60);

          return svg`
            <text
              x="${labelX}"
              y="${y + barHeight / 2 + 4}"
              text-anchor="${isReverse ? 'start' : 'end'}"
              font-size="12" fill="#666"
            >${bar.label}</text>
          `;
        })}

        <!-- Group labels -->
        ${(() => {
          let cY = padding.top;
          return structure.map((item, uIndex) => {
            const unitHeight = unitSizes[uIndex];
            const groupCenterY = cY + unitHeight / 2;
            cY += unitHeight;

            if (!item.isGroup) return '';

            const labelX = isReverse
              ? this.width - padding.right + 30
              : padding.left - 30;

            return svg`
              <text
                x="${labelX}"
                y="${groupCenterY + 4}"
                text-anchor="${isReverse ? 'start' : 'end'}"
                font-size="13" font-weight="bold" fill="#333"
              >${item.label}</text>
            `;
          });
        })()}
      `;
    } else {
      // Vertical bars: labels at the bottom (or top if reverse)
      let barIndex = 0;
      let unitIndex = 0;
      let cumulativeX = padding.left;

      return svg`
        ${bars.map((bar, index) => {
          const currentUnit = structure[unitIndex];
          const currentUnitWidth = unitSizes[unitIndex];
          const currentGutter = currentUnit.isGroup ? (currentUnit.gutter ?? this.gutter) : (currentUnit.gutter ?? this.gutter);
          let x: number;
          let barWidth: number;

          if (barIndex === 0) {
            cumulativeX += currentGutter / 2;
          }

          if (currentUnit.isGroup) {
            const groupBarCount = currentUnit.bars.length;
            const barWidthInGroup = currentUnitWidth / groupBarCount;
            x = cumulativeX + barIndex * barWidthInGroup;
            barWidth = barWidthInGroup;

            barIndex++;
            if (barIndex >= groupBarCount) {
              barIndex = 0;
              cumulativeX += currentUnitWidth + currentGutter / 2;
              unitIndex++;
            }
          } else {
            x = cumulativeX;
            barWidth = currentUnitWidth;
            cumulativeX += currentUnitWidth + currentGutter / 2;
            barIndex = 0;
            unitIndex++;
          }

          if (!bar.label || !this.shouldShowLabel(index, bars.length)) return '';

          const labelY = isReverse
            ? padding.top - 8 - this.getLabelLineOffset(index)
            : this.height - padding.bottom + 20 + this.getLabelLineOffset(index);

          return svg`
            <text
              x="${x + barWidth / 2}"
              y="${labelY}"
              text-anchor="middle"
              font-size="12" fill="#666"
            >${bar.label}</text>
          `;
        })}

        <!-- Group labels -->
        ${(() => {
          let cX = padding.left;
          return structure.map((item, uIndex) => {
            const unitWidth = unitSizes[uIndex];
            const groupCenterX = cX + unitWidth / 2;
            cX += unitWidth;

            if (!item.isGroup) return '';

            const labelY = isReverse
              ? padding.top - 28
              : this.height - padding.bottom + 40;

            return svg`
              <text
                x="${groupCenterX}"
                y="${labelY}"
                text-anchor="middle"
                font-size="13" font-weight="bold" fill="#333"
              >${item.label}</text>
            `;
          });
        })()}
      `;
    }
  }

  private renderLineCategoryLabels(
    points: PointData[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number
  ): SVGTemplateResult {
    const stepX = chartWidth / (points.length - 1 || 1);

    return svg`
      ${points.map((point, index) => {
        const x = padding.left + index * stepX;
        if (!point.label || !this.shouldShowLabel(index, points.length)) return '';

        return svg`
          <text
            x="${x}"
            y="${this.height - padding.bottom + 20 + this.getLabelLineOffset(index)}"
            text-anchor="middle"
            font-size="12" fill="#666"
          >${point.label}</text>
        `;
      })}
    `;
  }

  private renderBubbleCategoryLabels(
    bubbles: BubbleData[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number
  ): SVGTemplateResult {
    const stepX = chartWidth / bubbles.length;

    return svg`
      ${bubbles.map((bubble, index) => {
        const x = padding.left + stepX / 2 + index * stepX;
        if (!bubble.label || !this.shouldShowLabel(index, bubbles.length)) return '';

        return svg`
          <text
            x="${x}"
            y="${this.height - padding.bottom + 20 + this.getLabelLineOffset(index)}"
            text-anchor="middle"
            font-size="12" fill="#666"
          >${bubble.label}</text>
        `;
      })}
    `;
  }

  // ============================================================================
  // Auto-Popup Helper
  // ============================================================================

  private shouldShowAutoPopup(elementAutoPopup?: boolean, lineAutoPopup?: boolean): boolean {
    if (elementAutoPopup !== undefined) return elementAutoPopup;
    if (lineAutoPopup !== undefined) return lineAutoPopup;
    return this.autoPopup;
  }

  // ============================================================================
  // Popup Content Generators
  // ============================================================================

  private generateBarPopupContent(bar: { label: string; value: number; groupLabel?: string }, totalValue: number): string {
    const percentage = totalValue > 0 ? ((bar.value / totalValue) * 100).toFixed(1) : '0.0';
    let content = `<strong>${bar.label}</strong>`;
    if (bar.groupLabel) content += `<br>${bar.groupLabel}`;
    content += `<br>Value: ${bar.value}<br>${percentage}%`;
    return content;
  }

  private generateSegmentPopupContent(
    segment: { label: string; value: number },
    bar: { label: string; groupLabel?: string },
    barTotal: number
  ): string {
    const percentOfBar = barTotal > 0 ? ((segment.value / barTotal) * 100).toFixed(1) : '0.0';
    let content = `<strong>${segment.label}</strong>`;
    content += `<br>${bar.label}`;
    if (bar.groupLabel) content += ` (${bar.groupLabel})`;
    content += `<br>Value: ${segment.value}<br>${percentOfBar}% of bar`;
    return content;
  }

  private generateLinePopupContent(line: { label: string; points: Array<{ value: number }> }): string {
    const total = line.points.reduce((sum, p) => sum + p.value, 0);
    const avg = line.points.length > 0 ? (total / line.points.length).toFixed(1) : '0';
    return `<strong>${line.label}</strong><br>Points: ${line.points.length}<br>Avg: ${avg}`;
  }

  private generatePointPopupContent(point: { label: string; value: number }, lineName: string, totalValue: number): string {
    const percentage = totalValue > 0 ? ((point.value / totalValue) * 100).toFixed(1) : '0.0';
    return `<strong>${point.label}</strong><br>${lineName}<br>Value: ${point.value}<br>${percentage}%`;
  }

  private generateBubblePopupContent(bubble: { label: string; value: number; sizeValue: number }, totalValue: number): string {
    const percentage = totalValue > 0 ? ((bubble.value / totalValue) * 100).toFixed(1) : '0.0';
    return `<strong>${bubble.label}</strong><br>Value: ${bubble.value}<br>Size: ${bubble.sizeValue}<br>${percentage}%`;
  }

  // ============================================================================
  // Bar Event Handlers
  // ============================================================================

  private handleBarMouseEnter(e: MouseEvent, index: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[index];
    if (bar.popup?.trigger === 'hover') {
      this.showPopup(bar.popup.content, e.clientX, e.clientY);
    } else if (!bar.popup && this.shouldShowAutoPopup(bar.autoPopup)) {
      const totalValue = bars.reduce((sum, b) => sum + b.value, 0);
      const content = this.generateBarPopupContent(bar, totalValue);
      this.showPopup(content, e.clientX, e.clientY);
    }
  }

  private handleBarMouseLeave(index: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[index];
    const isHoverPopup = bar.popup?.trigger === 'hover' || (!bar.popup && this.shouldShowAutoPopup(bar.autoPopup));
    if (isHoverPopup && this.clickedBarIndex !== index) {
      this.hidePopup();
    }
  }

  private handleBarClick(e: MouseEvent, index: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[index];
    if (bar.popup?.trigger === 'click') {
      if (this.clickedBarIndex === index) {
        this.hidePopup();
        this.clickedBarIndex = -1;
      } else {
        this.clickedBarIndex = index;
        this.showPopup(bar.popup.content, e.clientX, e.clientY);
      }
    } else {
      this.hidePopup();
      this.clickedBarIndex = -1;
    }
  }

  private handleSegmentMouseEnter(e: MouseEvent, barIndex: number, segmentIndex: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[barIndex];
    const segment = bar.segments?.[segmentIndex];
    if (!segment) return;

    if (segment.popup?.trigger === 'hover') {
      this.showPopup(segment.popup.content, e.clientX, e.clientY);
    } else if (!segment.popup && this.shouldShowAutoPopup(segment.autoPopup)) {
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

    const isHoverPopup = segment.popup?.trigger === 'hover' || (!segment.popup && this.shouldShowAutoPopup(segment.autoPopup));
    if (isHoverPopup) {
      this.hidePopup();
    }
  }

  private handleSegmentClick(e: MouseEvent, barIndex: number, segmentIndex: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[barIndex];
    const segment = bar.segments?.[segmentIndex];
    if (!segment) return;

    if (segment.popup?.trigger === 'click') {
      const clickKey = barIndex * 1000 + segmentIndex;
      if (this.clickedBarIndex === clickKey) {
        this.hidePopup();
        this.clickedBarIndex = -1;
      } else {
        this.clickedBarIndex = clickKey;
        this.showPopup(segment.popup.content, e.clientX, e.clientY);
      }
    } else {
      this.hidePopup();
      this.clickedBarIndex = -1;
    }
  }

  // ============================================================================
  // Line Event Handlers
  // ============================================================================

  private handleLineMouseEnter(e: MouseEvent, lineIndex: number) {
    const lines = this.getLines();
    const line = lines[lineIndex];
    if (line.popup?.trigger === 'hover') {
      this.showPopup(line.popup.content, e.clientX, e.clientY);
    } else if (!line.popup && this.shouldShowAutoPopup(line.autoPopup)) {
      const content = this.generateLinePopupContent(line);
      this.showPopup(content, e.clientX, e.clientY);
    }
  }

  private handleLineMouseLeave(lineIndex: number) {
    const lines = this.getLines();
    const line = lines[lineIndex];
    const isHoverPopup = line.popup?.trigger === 'hover' || (!line.popup && this.shouldShowAutoPopup(line.autoPopup));
    if (isHoverPopup && this.clickedPointIndex.lineIndex !== lineIndex) {
      this.hidePopup();
    }
  }

  private handleLineClick(e: MouseEvent, lineIndex: number) {
    const lines = this.getLines();
    const line = lines[lineIndex];
    if (line.popup?.trigger === 'click') {
      if (this.clickedPointIndex.lineIndex === lineIndex && this.clickedPointIndex.pointIndex === -1) {
        this.hidePopup();
        this.clickedPointIndex = { lineIndex: -1, pointIndex: -1 };
      } else {
        this.clickedPointIndex = { lineIndex, pointIndex: -1 };
        this.showPopup(line.popup.content, e.clientX, e.clientY);
      }
    }
  }

  private handlePointMouseEnter(e: MouseEvent, lineIndex: number, pointIndex: number) {
    const lines = this.getLines();
    const line = lines[lineIndex];
    const point = line.points[pointIndex];
    if (point.popup?.trigger === 'hover') {
      this.showPopup(point.popup.content, e.clientX, e.clientY);
    } else if (!point.popup && this.shouldShowAutoPopup(point.autoPopup, line.autoPopup)) {
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
    const isHoverPopup = point.popup?.trigger === 'hover' || (!point.popup && this.shouldShowAutoPopup(point.autoPopup, line.autoPopup));
    if (isHoverPopup && (this.clickedPointIndex.lineIndex !== lineIndex || this.clickedPointIndex.pointIndex !== pointIndex)) {
      this.hidePopup();
    }
  }

  private handlePointClick(e: MouseEvent, lineIndex: number, pointIndex: number) {
    const lines = this.getLines();
    const point = lines[lineIndex].points[pointIndex];
    if (point.popup?.trigger === 'click') {
      if (this.clickedPointIndex.lineIndex === lineIndex && this.clickedPointIndex.pointIndex === pointIndex) {
        this.hidePopup();
        this.clickedPointIndex = { lineIndex: -1, pointIndex: -1 };
      } else {
        this.clickedPointIndex = { lineIndex, pointIndex };
        this.showPopup(point.popup.content, e.clientX, e.clientY);
      }
    } else {
      this.hidePopup();
      this.clickedPointIndex = { lineIndex: -1, pointIndex: -1 };
    }
  }

  // ============================================================================
  // Bubble Event Handlers
  // ============================================================================

  private handleBubbleMouseEnter(e: MouseEvent, bubbleIndex: number) {
    const bubbles = this.getBubbles();
    const bubble = bubbles[bubbleIndex];
    if (bubble.popup?.trigger === 'hover') {
      this.showPopup(bubble.popup.content, e.clientX, e.clientY);
    } else if (!bubble.popup && this.shouldShowAutoPopup(bubble.autoPopup)) {
      const totalValue = bubbles.reduce((sum, b) => sum + b.value, 0);
      const content = this.generateBubblePopupContent(bubble, totalValue);
      this.showPopup(content, e.clientX, e.clientY);
    }
  }

  private handleBubbleMouseLeave(bubbleIndex: number) {
    const bubbles = this.getBubbles();
    const bubble = bubbles[bubbleIndex];
    const isHoverPopup = bubble.popup?.trigger === 'hover' || (!bubble.popup && this.shouldShowAutoPopup(bubble.autoPopup));
    if (isHoverPopup && this.clickedBubbleIndex !== bubbleIndex) {
      this.hidePopup();
    }
  }

  private handleBubbleClick(e: MouseEvent, bubbleIndex: number) {
    const bubbles = this.getBubbles();
    const bubble = bubbles[bubbleIndex];
    if (bubble.popup?.trigger === 'click') {
      if (this.clickedBubbleIndex === bubbleIndex) {
        this.hidePopup();
        this.clickedBubbleIndex = -1;
      } else {
        this.clickedBubbleIndex = bubbleIndex;
        this.showPopup(bubble.popup.content, e.clientX, e.clientY);
      }
    } else {
      this.hidePopup();
      this.clickedBubbleIndex = -1;
    }
  }

  // ============================================================================
  // Legend Items
  // ============================================================================

  protected override getLegendItems(): LegendItem[] {
    // Build segment color map if needed
    if (this.segmentColorMap.size === 0) {
      this.buildSegmentColorMap();
    }

    const bars = this.getFlattenedBars();
    const lines = this.getLines();
    const bubbles = this.getBubbles();

    // If we have stacked bars, return segment labels
    const hasSegments = bars.some(bar => bar.segments && bar.segments.length > 0);
    if (hasSegments) {
      const segmentTotals = new Map<string, number>();
      bars.forEach(bar => {
        if (bar.segments) {
          bar.segments.forEach(segment => {
            const current = segmentTotals.get(segment.label) || 0;
            segmentTotals.set(segment.label, current + segment.value);
          });
        }
      });

      const legendItems: LegendItem[] = [];
      this.segmentColorMap.forEach((color, label) => {
        legendItems.push({
          label,
          color,
          value: segmentTotals.get(label) || 0,
          shape: 'square'  // Segments are bar pieces
        });
      });

      // Also add line items if present (combo chart with stacked bars + lines)
      // Lines are dimensionless - they don't have a single aggregate value
      lines.forEach(line => {
        legendItems.push({
          label: line.label,
          color: line.stroke,
          dimensionless: true,
          shape: 'line'
        } as DimensionlessLegendItem);
      });

      return legendItems;
    }

    // Otherwise, combine items from all element types
    const items: LegendItem[] = [];

    // Add bar items (shape: square)
    // Use originalFill for legend (fill may be pattern URL)
    bars.forEach(bar => {
      items.push({
        label: bar.label,
        color: bar.originalFill || bar.fill,
        value: bar.value,
        shape: 'square'
      });
    });

    // Add line items (shape: line)
    // Lines are dimensionless - they don't have a single aggregate value
    lines.forEach(line => {
      items.push({
        label: line.label,
        color: line.stroke,
        dimensionless: true,
        shape: 'line'
      } as DimensionlessLegendItem);
    });

    // Add bubble items (shape: circle)
    // Use originalFill for legend (fill may be pattern URL)
    bubbles.forEach(bubble => {
      items.push({
        label: bubble.label,
        color: bubble.originalFill || bubble.fill || '#4CAF50',
        value: bubble.value,
        shape: 'circle'
      });
    });

    return items;
  }

  // ============================================================================
  // Accessibility Methods
  // ============================================================================

  /**
   * Get the chart type name for accessibility descriptions.
   * Returns specific type based on what data elements are present.
   */
  protected override getChartTypeName(): string {
    const hasBars = this.getFlattenedBars().length > 0;
    const hasLines = this.getLines().length > 0;
    const hasBubbles = this.getBubbles().length > 0;

    const types: string[] = [];
    if (hasBars) types.push('bar');
    if (hasLines) types.push('line');
    if (hasBubbles) types.push('bubble');

    if (types.length === 0) return 'chart';
    if (types.length === 1) return `${types[0]} chart`;
    return `${types.join(' and ')} chart`;
  }

  /**
   * Get basic data summary for accessibility descriptions.
   */
  protected override getDataSummary(): string {
    const bars = this.getFlattenedBars();
    const lines = this.getLines();
    const bubbles = this.getBubbles();

    const parts: string[] = [];

    if (bars.length > 0) {
      const values = bars.map(b => b.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      parts.push(`${bars.length} bar${bars.length !== 1 ? 's' : ''}, values from ${min} to ${max}`);
    }

    if (lines.length > 0) {
      const totalPoints = lines.reduce((sum, line) => sum + line.points.length, 0);
      parts.push(`${lines.length} line${lines.length !== 1 ? 's' : ''} with ${totalPoints} point${totalPoints !== 1 ? 's' : ''}`);
    }

    if (bubbles.length > 0) {
      const values = bubbles.map(b => b.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      parts.push(`${bubbles.length} bubble${bubbles.length !== 1 ? 's' : ''}, values from ${min} to ${max}`);
    }

    return parts.join('; ');
  }

  /**
   * Get auto-generated insights about the chart data.
   */
  protected override getInsights(): string {
    const bars = this.getFlattenedBars();
    const lines = this.getLines();
    const bubbles = this.getBubbles();

    const insights: string[] = [];

    // Generate bar insights
    if (bars.length > 0) {
      const barData: InsightBarData[] = bars.map(b => ({
        label: b.label,
        value: b.value
      }));
      // Stub for reference line - will be implemented when that feature exists
      const referenceValue = this.getReferenceLineValue();
      const barInsight = analyzeBars(barData, referenceValue);
      if (barInsight) {
        insights.push(barInsight);
      }
    }

    // Generate line insights
    if (lines.length > 0) {
      const lineData: InsightLineData[] = lines.map(line => ({
        label: line.label,
        points: line.points.map(p => ({ value: p.value, label: p.label }))
      }));
      const lineInsight = analyzeLines(lineData);
      if (lineInsight) {
        insights.push(lineInsight);
      }
    }

    // Generate bubble insights
    if (bubbles.length > 0) {
      const bubbleData: InsightBubbleData[] = bubbles.map(b => ({
        label: b.label,
        value: b.value,
        sizeValue: b.sizeValue
      }));
      const bubbleInsight = analyzeBubbles(bubbleData);
      if (bubbleInsight) {
        insights.push(bubbleInsight);
      }
    }

    return insights.join('. ');
  }

  /**
   * Get the reference line value for target comparisons.
   * Stub - returns undefined until reference lines feature is implemented.
   */
  private getReferenceLineValue(): number | undefined {
    // TODO: Implement when reference lines feature is added
    // This would query for <dc-reference-line> elements and return the value
    return undefined;
  }

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  /**
   * Get the list of focusable elements in this chart.
   * Returns bars, line points, and bubbles that have actions (href, popup).
   */
  protected override getFocusableElements(): FocusableElement[] {
    const elements: FocusableElement[] = [];
    const bars = this.getFlattenedBars();
    const lines = this.getLines();
    const bubbles = this.getBubbles();
    const total = bars.reduce((sum, b) => sum + b.value, 0) +
                  lines.flatMap(l => l.points).reduce((sum, p) => sum + p.value, 0) +
                  bubbles.reduce((sum, b) => sum + b.value, 0);

    let index = 0;

    // Add bars as focusable elements
    bars.forEach((bar) => {
      const hasAction = !!(bar.href || bar.popup || this.shouldShowAutoPopup(bar.autoPopup));
      const percent = total > 0 ? (bar.value / total) * 100 : 0;
      elements.push({
        index,
        label: `${bar.label}: ${bar.value}${percent > 0 ? ` (${percent.toFixed(1)}%)` : ''}`,
        hasAction,
        href: bar.href,
        popupTrigger: bar.popup?.trigger as 'hover' | 'click' | undefined ||
                      (this.shouldShowAutoPopup(bar.autoPopup) ? 'hover' : undefined)
      });
      index++;
    });

    // Add line points as focusable elements (lines are navigable but points are the targets)
    lines.forEach((line) => {
      line.points.forEach((point) => {
        const hasAction = !!(point.href || point.popup || this.shouldShowAutoPopup(point.autoPopup));
        elements.push({
          index,
          label: `${line.label}, ${point.label}: ${point.value}`,
          hasAction,
          href: point.href,
          popupTrigger: point.popup?.trigger as 'hover' | 'click' | undefined ||
                        (this.shouldShowAutoPopup(point.autoPopup) ? 'hover' : undefined)
        });
        index++;
      });
    });

    // Add bubbles as focusable elements
    bubbles.forEach((bubble) => {
      const hasAction = !!(bubble.href || bubble.popup || this.shouldShowAutoPopup(bubble.autoPopup));
      elements.push({
        index,
        label: `${bubble.label}: value ${bubble.value}, size ${bubble.sizeValue}`,
        hasAction,
        href: bubble.href,
        popupTrigger: bubble.popup?.trigger as 'hover' | 'click' | undefined ||
                      (this.shouldShowAutoPopup(bubble.autoPopup) ? 'hover' : undefined)
      });
      index++;
    });

    return elements;
  }

  /**
   * Render a focus indicator for the currently focused shape.
   */
  protected override renderFocusIndicator(): SVGTemplateResult {
    if (!this.keyboardActive || this.focusedIndex < 0) {
      return svg``;
    }

    const bounds = this.getShapeBounds(this.focusedIndex);
    if (!bounds) return svg``;

    // Draw a focus ring around the shape
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
   * Get the bounds of a shape by index, accounting for different element types.
   */
  protected override getShapeBounds(index: number): { x: number; y: number; width: number; height: number } | null {
    // First try the parent's implementation
    const parentBounds = super.getShapeBounds(index);
    if (parentBounds) return parentBounds;

    // For line points, we need special handling since they may be circles or other shapes
    const svgEl = this.shadowRoot?.querySelector('svg');
    if (!svgEl) return null;

    // Try finding a circle (for line points)
    const circle = svgEl.querySelector(`circle[data-shape-index="${index}"]`) as SVGCircleElement | null;
    if (circle) {
      const cx = parseFloat(circle.getAttribute('cx') || '0');
      const cy = parseFloat(circle.getAttribute('cy') || '0');
      const r = parseFloat(circle.getAttribute('r') || '0');
      return {
        x: cx - r,
        y: cy - r,
        width: r * 2,
        height: r * 2
      };
    }

    return null;
  }

  /**
   * Show popup for the focused element.
   */
  protected override showPopupForFocusedElement(index: number): void {
    const bars = this.getFlattenedBars();
    const lines = this.getLines();
    const bubbles = this.getBubbles();

    // Determine which element is focused
    if (index < bars.length) {
      // It's a bar
      const bar = bars[index];
      const content = this.getBarPopupContent(bar, index);
      if (content) {
        const bounds = this.getShapeBounds(index);
        if (bounds) {
          // Position popup near the center of the bar
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
    } else {
      // Check if it's a line point or bubble
      let adjustedIndex = index - bars.length;
      const totalPoints = lines.reduce((sum, l) => sum + l.points.length, 0);

      if (adjustedIndex < totalPoints) {
        // It's a line point - find which line and point
        let lineIndex = 0;
        let pointIndex = adjustedIndex;
        for (const line of lines) {
          if (pointIndex < line.points.length) {
            const point = line.points[pointIndex];
            const content = this.getPointPopupContent(line, point, lineIndex, pointIndex);
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
            break;
          }
          pointIndex -= line.points.length;
          lineIndex++;
        }
      } else {
        // It's a bubble
        const bubbleIndex = adjustedIndex - totalPoints;
        if (bubbleIndex < bubbles.length) {
          const bubble = bubbles[bubbleIndex];
          const content = this.getBubblePopupContent(bubble, bubbleIndex);
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
      }
    }
  }

  /**
   * Toggle popup for the focused element (for click-triggered popups).
   */
  protected override togglePopupForFocusedElement(index: number): void {
    if (this.popupVisible) {
      this.hidePopup();
    } else {
      this.showPopupForFocusedElement(index);
    }
  }

  /**
   * Get popup content for a bar.
   */
  private getBarPopupContent(bar: FlattenedBar, _index: number): string | null {
    if (bar.popup) {
      return bar.popup.content;
    }
    if (this.shouldShowAutoPopup(bar.autoPopup)) {
      const bars = this.getFlattenedBars();
      const total = bars.reduce((sum, b) => sum + b.value, 0);
      const percent = total > 0 ? ((bar.value / total) * 100).toFixed(1) : '0';
      return `<strong>${bar.label}</strong><br>Value: ${bar.value}<br>Percent: ${percent}%`;
    }
    return null;
  }

  /**
   * Get popup content for a line point.
   */
  private getPointPopupContent(line: LineData, point: PointData, _lineIndex: number, _pointIndex: number): string | null {
    if (point.popup) {
      return point.popup.content;
    }
    if (this.shouldShowAutoPopup(point.autoPopup)) {
      return `<strong>${line.label}</strong><br>${point.label}: ${point.value}`;
    }
    return null;
  }

  /**
   * Get popup content for a bubble.
   */
  private getBubblePopupContent(bubble: BubbleData, _index: number): string | null {
    if (bubble.popup) {
      return bubble.popup.content;
    }
    if (this.shouldShowAutoPopup(bubble.autoPopup)) {
      return `<strong>${bubble.label}</strong><br>Value: ${bubble.value}<br>Size: ${bubble.sizeValue}`;
    }
    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-chart': Chart;
  }
}
