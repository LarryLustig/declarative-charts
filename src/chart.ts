import { customElement, property } from 'lit/decorators.js';
import { svg, SVGTemplateResult } from 'lit';
import { AxisChart, type ValueRange } from './axis-chart.js';
import { type ShowCondition, type FocusableElement, type AnimatableChartType } from './base-chart.js';
import { ErrorCode } from './errors.js';
import { analyzeLines, analyzeBars, analyzeBubbles, analyzeScatter, type LineData as InsightLineData, type BarData as InsightBarData, type BubbleData as InsightBubbleData } from './accessibility/index.js';
import type { LegendItem, DimensionlessLegendItem } from './chart-legend.js';
import type { ChartBar } from './chart-bar.js';
import type { ChartBarGroup } from './chart-bar-group.js';
import type { ChartBarSegment } from './chart-bar-segment.js';
import type { ChartLine, CurveFit } from './chart-line.js';
import type { ChartPoint } from './chart-point.js';
import type { ChartScatter } from './chart-scatter.js';
import { calculateNiceTicks } from './chart-utils.js';
import type { ChartBubble } from './chart-bubble.js';
import type { ChartPopup } from './chart-popup.js';
import type { ChartArea } from './chart-area.js';

// ============================================================================
// Deferred Label Rendering
// ============================================================================

interface DeferredLabel {
  x: number;
  y: number;
  text: string;
  anchor?: string;
  fontSize?: number;
  fill?: string;
}

// ============================================================================
// Data Structures for Bars
// ============================================================================

interface SegmentData {
  value: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  label: string;
  href?: string;
  target?: string;
  popup?: { content: string; trigger: string };
  autoPopup?: boolean;
  showValue: ShowCondition;
  showPercent: ShowCondition;
  element?: ChartBarSegment;
  passthroughAttrs?: Record<string, string>;
  /** SVG paint attributes inherited from a matched <dc-fill>. */
  paint?: Record<string, string>;
  valueFormat?: string;
}

interface BarData {
  value: number;
  fill: string;
  elementFill?: string;
  stroke?: string;
  strokeWidth?: number;
  label: string;
  href?: string;
  target?: string;
  popup?: { content: string; trigger: string };
  autoPopup?: boolean;
  showValue: ShowCondition;
  /** Per-element show-label, resolved against the chart default. */
  showLabel?: ShowCondition;
  showPercent: ShowCondition;
  width?: string;
  gutter?: number;
  element?: ChartBar;
  passthroughAttrs?: Record<string, string>;
  /** SVG paint attributes inherited from a matched <dc-fill>. */
  paint?: Record<string, string>;
  segments?: SegmentData[];
  // Pattern properties
  pattern?: string;
  patternStroke?: string;
  patternFill?: string;
  patternScale?: number;
  valueFormat?: string;
  // Label positioning
  labelPosition?: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelOffsetR?: number;
  labelFill?: string;
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

/** One marker in a scatter series. */
interface ScatterPoint {
  x: number;
  value: number;
  label: string;
  fill?: string;
  href?: string;
  target?: string;
  autoPopup?: boolean;
  valueFormat?: string;
  element: ChartPoint;
}

/** One scatter series. */
interface ScatterData {
  label: string;
  fill: string;
  originalFill: string;
  fillOpacity: number;
  shape: string;
  size: number;
  autoPopup?: boolean;
  element: ChartScatter;
  passthroughAttrs?: Record<string, string>;
  paint?: Record<string, string>;
  points: ScatterPoint[];
}

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
  element?: ChartPoint;
  /** True when this position has no data. `value` is not meaningful. */
  missing?: boolean;
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
  valueFormat?: string;
  // Label positioning
  labelPosition?: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelOffsetR?: number;
  labelFill?: string;
}

type MissingPolicy = 'gap' | 'skip' | 'zero';

interface LineData {
  missing: MissingPolicy;
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
  /** SVG paint attributes inherited from a matched <dc-fill>. */
  paint?: Record<string, string>;
  points: PointData[];
  // Label positioning (inherited by child points)
  labelPosition?: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelOffsetR?: number;
  labelFill?: string;
}

// ============================================================================
// Data Structures for Areas
// ============================================================================

interface AreaData {
  missing: MissingPolicy;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  label: string;
  curveFit: CurveFit;
  points: PointData[];
  // Pattern properties
  pattern?: string;
  patternStroke?: string;
  patternFill?: string;
  patternScale?: number;
  originalFill?: string;  // Original solid color for legend (fill may be pattern URL)
  // Common properties
  href?: string;
  target?: string;
  popup?: { content: string; trigger: string };
  autoPopup?: boolean;
  element?: ChartArea;
  passthroughAttrs?: Record<string, string>;
  /** SVG paint attributes inherited from a matched <dc-fill>. */
  paint?: Record<string, string>;
  valueFormat?: string;
  // Label positioning (inherited by child points)
  labelPosition?: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelOffsetR?: number;
  labelFill?: string;
}

// ============================================================================
// Data Structures for Bubbles
// ============================================================================

interface BubbleData {
  element?: ChartBubble;
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
  /** SVG paint attributes inherited from a matched <dc-fill>. */
  paint?: Record<string, string>;
  // Pattern properties
  pattern?: string;
  patternStroke?: string;
  patternFill?: string;
  patternScale?: number;
  valueFormat?: string;
  // Label positioning
  labelPosition?: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelOffsetR?: number;
  labelFill?: string;
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
  /**
   * Smallest width (or height, when horizontal) a bar may occupy, in viewBox units.
   * Bars are never allowed below this: a zero or negative dimension is invalid SVG
   * and causes the browser to drop the shape entirely.
   */
  private static readonly MIN_UNIT_SIZE = 1;

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

  // Area-specific properties
  /**
   * Disable stacking for multiple areas.
   * When false (default), multiple areas stack on top of each other.
   * When true, areas overlap with transparency.
   */
  @property({ type: Boolean })
  overlapping = false;

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
    return this.barColor;
  }

  private getDefaultLineStroke(): string {
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
  // Scatter
  // ============================================================================

  /**
   * Scatter series, with each point's numeric position resolved.
   *
   * Cached per render, like the other extractions: this is reached from inside
   * per-point render loops and from the padding calculation.
   */
  private getScatterSeries(): ScatterData[] {
    return this.cachePerRender('scatter', () => this.extractScatterSeries());
  }

  private extractScatterSeries(): ScatterData[] {
    const elements = Array.from(this.querySelectorAll('dc-scatter'))
      .filter(el => !el.hasAttribute('hidden')) as ChartScatter[];
    if (elements.length === 0) return [];

    const resolved = this.resolveFillsWithPatterns(
      elements.map(el => ({
        fill: el.fill || undefined,
        label: el.label,
        pattern: el.pattern,
        patternStroke: el.patternStroke,
        patternFill: el.patternFill,
        patternScale: el.patternScale
      }))
    );

    return elements.map((el, index) => {
      const points = Array.from(el.querySelectorAll('dc-point')) as ChartPoint[];
      return {
        label: el.label,
        fill: resolved[index].fill,
        originalFill: resolved[index].originalFill,
        fillOpacity: el.fillOpacity ?? 1,
        shape: el.shape || 'circle',
        size: el.size ?? 4,
        autoPopup: el.autoPopup,
        element: el,
        passthroughAttrs: el.getPassthroughAttributes(
          new Set(['label', 'fill', 'fill-opacity', 'shape', 'size'])
        ),
        paint: this.getPalettePaint(el),
        points: points
          .filter(pt => Number.isFinite(pt.value))
          .map(pt => ({
            x: pt.x,
            value: pt.value,
            label: pt.label,
            fill: pt.fill || undefined,
            href: pt.href || undefined,
            target: pt.target || undefined,
            autoPopup: pt.autoPopup,
            valueFormat: pt.valueFormat,
            element: pt
          }))
      };
    });
  }

  /**
   * Whether any point states a numeric `x`, making the category axis numeric.
   *
   * Inferred rather than requiring `type="value"` on the axis: an `x` that a
   * chart silently ignored because a second attribute was missing is precisely
   * the failure this project keeps finding. Declaring the axis type still
   * works, and is worth doing for the axis title.
   */
  protected hasNumericX(): boolean {
    return this.cachePerRender('hasNumericX', () => {
      const points = Array.from(this.querySelectorAll('dc-point')) as ChartPoint[];
      return points.some(pt => pt.hasX);
    });
  }

  /** Domain of the numeric category axis, or null when there is not one. */
  protected getXRange(): { min: number; max: number } | null {
    return this.cachePerRender('xRange', () => {
      if (!this.hasNumericX()) return null;

      const xs = (Array.from(this.querySelectorAll('dc-point')) as ChartPoint[])
        .filter(pt => pt.hasX && Number.isFinite(pt.value))
        .map(pt => pt.x);
      if (xs.length === 0) return null;

      const config = this.getAxisConfig(this.getCategoryAxisPosition());
      const hasMin = typeof config.minValue === 'number';
      const hasMax = typeof config.maxValue === 'number';
      let min = hasMin ? (config.minValue as number) : Math.min(...xs);
      let max = hasMax ? (config.maxValue as number) : Math.max(...xs);

      // A single x, or every x identical, gives a zero-width domain that would
      // stack the whole series on one pixel. Widen it around the value.
      if (max <= min) return { min: min - 1, max: max + 1 };

      // Round the ends outward to whole ticks, the way the value axis does.
      // Without it the domain ends exactly at the extreme readings, so the
      // outermost markers straddle the axis lines - and the tick labels there
      // are whatever the data happened to be rather than round numbers.
      const ticks = calculateNiceTicks(min, max, this.gridSteps);
      const step = ticks.length > 1 ? ticks[1] - ticks[0] : 0;
      if (step > 0) {
        if (!hasMin) min = Math.floor(min / step) * step;
        if (!hasMax) max = Math.ceil(max / step) * step;
      }

      // `range-padding` then applies on top, as it does on a value axis, and
      // only where the bound was not stated outright.
      const rangePadding = config.rangePadding ?? 0;
      if (rangePadding > 0) {
        const span = (max - min) * rangePadding;
        if (!hasMin) min -= span;
        if (!hasMax) max += span;
      }

      return { min, max };
    });
  }

  /** X coordinate for a numeric position, or null when the axis is categorical. */
  protected getNumericX(x: number, padding: { left: number }, chartWidth: number): number | null {
    const range = this.getXRange();
    if (!range || !Number.isFinite(x)) return null;
    return padding.left + ((x - range.min) / (range.max - range.min)) * chartWidth;
  }

  private getScatterMaxValue(): number {
    const values = this.getScatterSeries().flatMap(s => s.points.map(p => p.value));
    return values.length > 0 ? Math.max(...values) : -Infinity;
  }

  private getScatterMinValue(): number {
    const values = this.getScatterSeries().flatMap(s => s.points.map(p => p.value));
    return values.length > 0 ? Math.min(...values) : Infinity;
  }

  // ============================================================================
  // AxisChart Abstract Method Implementations
  // ============================================================================

  protected getMaxValue(): number {
    const barMax = this.getBarMaxValue();
    const lineMax = this.getLineMaxValue();
    const bubbleMax = this.getBubbleMaxValue();
    const areaMax = this.getAreaMaxValue();
    const scatterMax = this.getScatterMaxValue();
    const referenceValues = this.getReferenceValues();
    const referenceMax = referenceValues.length > 0 ? Math.max(...referenceValues) : -Infinity;
    return Math.max(barMax, lineMax, bubbleMax, areaMax, scatterMax, referenceMax);
  }

  protected getMinValue(): number {
    const barMin = this.getBarMinValue();
    const lineMin = this.getLineMinValue();
    const bubbleMin = this.getBubbleMinValue();
    const areaMin = this.getAreaMinValue();
    const scatterMin = this.getScatterMinValue();
    const referenceValues = this.getReferenceValues();
    const referenceMin = referenceValues.length > 0 ? Math.min(...referenceValues) : Infinity;
    // Return the minimum, but don't go below 0 if all values are positive
    return Math.min(barMin, lineMin, bubbleMin, areaMin, scatterMin, referenceMin);
  }

  private getBarMaxValue(): number {
    const bars = this.getFlattenedBars();
    if (bars.length === 0) return 0;
    return Math.max(...bars.map(b => b.value));
  }

  private getBarMinValue(): number {
    const bars = this.getFlattenedBars();
    if (bars.length === 0) return 0;
    // Return min of all bar values, but cap at 0 (we don't extend into positive if all positive)
    return Math.min(...bars.map(b => b.value), 0);
  }

  private getLineMaxValue(): number {
    const lines = this.getLines();
    const allValues = lines.flatMap(line => line.points.map(p => p.value)).filter(Number.isFinite);
    if (allValues.length === 0) return 0;
    return Math.max(...allValues);
  }

  private getLineMinValue(): number {
    const lines = this.getLines();
    const allValues = lines.flatMap(line => line.points.map(p => p.value)).filter(Number.isFinite);
    if (allValues.length === 0) return 0;
    return Math.min(...allValues, 0);
  }

  private getBubbleMaxValue(): number {
    const bubbles = this.getBubbles();
    if (bubbles.length === 0) return 0;
    return Math.max(...bubbles.map(b => b.value));
  }

  private getBubbleMinValue(): number {
    const bubbles = this.getBubbles();
    if (bubbles.length === 0) return 0;
    return Math.min(...bubbles.map(b => b.value), 0);
  }

  private getAreaMaxValue(): number {
    const areas = this.getAreas();
    if (areas.length === 0) return 0;

    // For stacked areas, we need to include the cumulative maximum
    const stackedMaximums = this.getAreaStackedMaximums();
    const areaValues = areas.flatMap(a => a.points.map(p => p.value)).filter(Number.isFinite);
    const individualMax = areaValues.length > 0 ? Math.max(...areaValues) : 0;
    const stackedMax = stackedMaximums.length > 0 ? Math.max(...stackedMaximums) : 0;

    return Math.max(individualMax, stackedMax);
  }

  private getAreaMinValue(): number {
    const areas = this.getAreas();
    if (areas.length === 0) return 0;
    const allValues = areas.flatMap(area => area.points.map(p => p.value)).filter(Number.isFinite);
    return Math.min(...allValues, 0);
  }

  protected getAllValues(): number[] {
    const barValues = this.getFlattenedBars().map(b => b.value);
    const lineValues = this.getLines().flatMap(line => line.points.map(p => p.value)).filter(Number.isFinite);
    const bubbleValues = this.getBubbles().map(b => b.value);
    const areaValues = this.getAreas().flatMap(area => area.points.map(p => p.value)).filter(Number.isFinite);
    // Scatter values are deliberately absent: this feeds the percentage
    // denominator, and a cloud of readings has no share of a whole. Including
    // them would quietly change the percentages shown on the bars beside them.
    // Axis scaling comes from getMaxValue()/getMinValue(), which do count them.
    const stackedMaximums = this.getAreaStackedMaximums();
    return [...barValues, ...lineValues, ...bubbleValues, ...areaValues, ...stackedMaximums];
  }

  /** Bars occupy fixed slots, so a time scale is not applied when any exist. */
  protected override hasCategorySlots(): boolean {
    return this.getFlattenedBars().length > 0;
  }

  protected getCategoryLabels(): string[] {
    // Prefer bar labels, then line labels, then area labels, then bubble labels
    const bars = this.getFlattenedBars();
    if (bars.length > 0) return bars.map(b => b.label);

    const lines = this.getLines();
    if (lines.length > 0 && lines[0].points.length > 0) {
      return lines[0].points.map(p => p.label);
    }

    const areas = this.getAreas();
    if (areas.length > 0 && areas[0].points.length > 0) {
      return areas[0].points.map(p => p.label);
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
      stroke: segment.stroke || undefined,
      strokeWidth: segment.strokeWidth,
      label: segment.label,
      href: segment.href || undefined,
      target: segment.target || undefined,
      popup: popupEl ? { content: popupEl.content, trigger: popupEl.trigger } : undefined,
      autoPopup: segment.autoPopup,
      showValue,
      showPercent,
      element: segment,
      passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined,
      valueFormat: segment.valueFormat
    };
  }

  private extractBarData(bar: ChartBar, groupBarWidth?: string, groupGutter?: number): BarData {
    const popupEl = bar.querySelector('dc-popup') as ChartPopup | null;
    const elementFill = bar.getEffectiveFill();
    const barFill = elementFill || '';
    const showValue = bar.hasAttribute('show-value') ? bar.showValue : this.showValue;
    const showPercent = bar.hasAttribute('show-percent') ? bar.showPercent! : this.showPercent;
    // Per-element show-label. BaseFilledShape declared it from the start and
    // nothing here read it, so <dc-bar show-label="false"> was inert.
    const showLabel = bar.hasAttribute('show-label') ? bar.showLabel! : this.showLabel;
    const paint = this.getPalettePaint(bar);

    let width: string | undefined;
    if (bar.hasAttribute('bar-width')) {
      width = bar.barWidth;
    } else if (groupBarWidth) {
      width = groupBarWidth;
    } else if (this.barWidth) {
      width = this.barWidth;
    }

    const gutter = groupGutter !== undefined ? groupGutter : this.gutter;
    // 'width' stays listed even though it no longer does anything. Unknown
    // attributes are passed through onto the SVG shape, so dropping it from
    // this set would let a leftover width="80" land on the <rect> and silently
    // override the computed geometry - a worse failure than being ignored.
    if (bar.hasAttribute('width')) {
      this.logError(ErrorCode.PARSE_ERROR, {
        attribute: 'width on <dc-bar>',
        value: bar.getAttribute('width') ?? '',
        default: 'ignored - it was renamed to bar-width'
      });
    }
    const knownAttrs = new Set([
      'value', 'href', 'target', 'show-value', 'show-percent', 'bar-width', 'width'
    ]);
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
      stroke: bar.stroke || undefined,
      strokeWidth: bar.strokeWidth,
      label: bar.label,
      href: bar.href || undefined,
      target: bar.target || undefined,
      popup: popupEl ? { content: popupEl.content, trigger: popupEl.trigger } : undefined,
      autoPopup: bar.autoPopup,
      showValue,
      showPercent,
      showLabel,
      paint,
      width,
      gutter,
      element: bar,
      passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined,
      segments,
      // Pattern properties
      pattern: bar.pattern,
      patternStroke: bar.patternStroke,
      patternFill: bar.patternFill,
      patternScale: bar.patternScale,
      valueFormat: bar.valueFormat,
      // Label positioning (inherit from chart if not set on element)
      labelPosition: bar.labelPosition ?? this.labelPosition,
      labelOffsetX: bar.labelOffsetX ?? this.labelOffsetX,
      labelOffsetY: bar.labelOffsetY ?? this.labelOffsetY,
      labelOffsetR: bar.labelOffsetR ?? this.labelOffsetR,
      labelFill: bar.labelFill ?? this.labelFill
    };
  }

  private getBarStructure(): BarOrGroup[] {
    return this.cachePerRender('barStructure', () => this.computeBarStructure());
  }

  private computeBarStructure(): BarOrGroup[] {
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
    return this.cachePerRender('flattenedBars', () => this.computeFlattenedBars());
  }

  private computeFlattenedBars(): FlattenedBar[] {
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
        patternScale: b.patternScale
      }));
      // `defaultColor` is the *second argument* of resolveFillsWithPatterns.
      // It used to be set as a field on each element instead, where nothing
      // read it - the parameter type does not declare it, and an excess
      // property check does not apply to a variable, so tsc never objected.
      // `bar-color` was therefore silently dead: bars always auto-generated.
      //
      // Guarded on the attribute being present rather than on `this.barColor`,
      // which has a truthy default. Passing that unconditionally would make
      // every default bar chart a single flat green.
      const resolvedFills = this.resolveFillsWithPatterns(
        elements,
        this.hasAttribute('bar-color') ? this.getDefaultBarFill() : undefined
      );

      // Get effective stroke from chart-level shorthand (default: no stroke for bars)
      const effectiveStroke = this.getEffectiveStroke('none', 0);

      flattened.forEach((bar, index) => {
        bar.fill = resolvedFills[index].fill;
        bar.originalFill = resolvedFills[index].originalFill;
        // Apply stroke: element > chart-level shorthand > default (none)
        bar.stroke = bar.stroke || effectiveStroke.color;
        bar.strokeWidth = bar.strokeWidth ?? effectiveStroke.width;
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
  /**
   * Build the `d` for a series, breaking it wherever data is missing.
   *
   * Emits one subpath per unbroken run, so a gap is a genuine break rather than
   * a line drawn through nothing. Each run is fitted independently, which also
   * stops a spline from overshooting *across* a gap and corrupting the segments
   * on either side of it.
   */
  private generatePathData(
    points: Array<{ x: number; y: number; missing?: boolean }>,
    curveFit: CurveFit
  ): string {
    return this.splitAtGaps(points)
      .map(segment => this.generateSubpath(segment, curveFit))
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Break a series into its unbroken runs. A run is a stretch of consecutive
   * positions that all have data; the gaps between them are what the caller
   * must not draw across.
   */
  private splitAtGaps<T extends { missing?: boolean }>(points: T[]): T[][] {
    const runs: T[][] = [];
    let run: T[] = [];

    for (const point of points) {
      if (point.missing) {
        if (run.length > 0) runs.push(run);
        run = [];
      } else {
        run.push(point);
      }
    }
    if (run.length > 0) runs.push(run);
    return runs;
  }

  private generateSubpath(points: Array<{ x: number; y: number }>, curveFit: CurveFit): string {
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

    const linesData = lineElements.map((line, lineIndex) => {
      const pointElements = Array.from(line.querySelectorAll('dc-point')) as ChartPoint[];

      // Warn if line has no points
      if (pointElements.length === 0) {
        const lineLabel = line.label || `line[${lineIndex}]`;
        this.logError(ErrorCode.LINE_NO_POINTS, { label: lineLabel });
      }
      const elementStroke = line.getEffectiveStroke();
      const lineStroke = elementStroke || '';
      const lineShowValue = line.hasAttribute('show-value') ? line.showValue : this.showValue;
      const lineShowPercent = line.hasAttribute('show-percent') ? line.showPercent! : this.showPercent;
      const linePointShape = line.hasAttribute('point-shape') ? line.pointShape : this.pointShape;
      const lineCurveFit = line.hasAttribute('curve-fit') ? line.curveFit! : this.curveFit;
      const linePolicy: MissingPolicy = line.missing ?? 'gap';

      const linePopupEl = Array.from(line.children).find(
        child => child.tagName.toLowerCase() === 'dc-popup'
      ) as ChartPopup | null;

      const knownAttrs = new Set(['label', 'color', 'stroke', 'fill', 'href', 'target', 'show-value', 'show-percent', 'point-shape', 'curve-fit']);
      const passthroughAttrs = line.getPassthroughAttributes(knownAttrs);

      // Label positioning inheritance: point → line → chart → default
      const lineLabelPosition = line.labelPosition ?? this.labelPosition;
      const lineLabelOffsetX = line.labelOffsetX ?? this.labelOffsetX;
      const lineLabelOffsetY = line.labelOffsetY ?? this.labelOffsetY;
      const lineLabelOffsetR = line.labelOffsetR ?? this.labelOffsetR;
      const lineLabelFill = line.labelFill ?? this.labelFill;

      return {
        stroke: lineStroke,
        elementStroke: elementStroke || undefined,
        label: line.label,
        missing: linePolicy,
        curveFit: lineCurveFit,
        href: line.href || undefined,
        target: line.target || undefined,
        popup: linePopupEl ? { content: linePopupEl.content, trigger: linePopupEl.trigger } : undefined,
        autoPopup: line.autoPopup,
        element: line,
        passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined,
        labelPosition: lineLabelPosition,
        labelOffsetX: lineLabelOffsetX,
        labelOffsetY: lineLabelOffsetY,
        labelOffsetR: lineLabelOffsetR,
        labelFill: lineLabelFill,
        points: pointElements.map(point => {
          const popupEl = point.querySelector('dc-popup') as ChartPopup | null;
          const showValue = point.hasAttribute('show-value') ? point.showValue : lineShowValue;
          const showPercent = point.hasAttribute('show-percent') ? point.showPercent! : lineShowPercent;
          const shape = point.hasAttribute('shape') ? point.shape : linePointShape;
          const effectiveFill = point.getEffectiveFill();
          // Resolve absence once, here, so nothing downstream has to think
          // about NaN. Under `zero` a missing point becomes a real 0.
          const isMissing = !Number.isFinite(point.value);
          const missing = isMissing && linePolicy !== 'zero';
          return {
            element: point,
            missing,
            value: missing ? NaN : (isMissing ? 0 : point.value),
            label: point.label,
            fill: effectiveFill || undefined,
            href: point.href || undefined,
            target: point.target || undefined,
            popup: popupEl ? { content: popupEl.content, trigger: popupEl.trigger } : undefined,
            autoPopup: point.autoPopup,
            showValue,
            showPercent,
            shape,
            valueFormat: point.valueFormat,
            // Label positioning: point → line → chart → default
            labelPosition: point.labelPosition ?? lineLabelPosition,
            labelOffsetX: point.labelOffsetX ?? lineLabelOffsetX,
            labelOffsetY: point.labelOffsetY ?? lineLabelOffsetY,
            labelOffsetR: point.labelOffsetR ?? lineLabelOffsetR,
            labelFill: point.labelFill ?? lineLabelFill
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
  // Area Data Extraction
  // ============================================================================

  private getAreas(): AreaData[] {
    const areaElements = Array.from(this.querySelectorAll('dc-area'))
      .filter(el => !el.hasAttribute('hidden')) as ChartArea[];

    if (areaElements.length === 0) return [];

    const areasData = areaElements.map((area, areaIndex) => {
      const pointElements = Array.from(area.querySelectorAll('dc-point')) as ChartPoint[];

      // Warn if area has no points
      if (pointElements.length === 0) {
        const areaLabel = area.label || `area[${areaIndex}]`;
        this.logError(ErrorCode.AREA_NO_POINTS, { label: areaLabel });
      }

      const elementFill = area.getEffectiveFill();
      const areaFill = elementFill || '';
      const areaShowValue = area.hasAttribute('show-value') ? area.showValue : this.showValue;
      const areaShowPercent = area.hasAttribute('show-percent') ? area.showPercent! : this.showPercent;
      const areaCurveFit = area.hasAttribute('curve-fit') ? area.curveFit! : this.curveFit;
      const areaPolicy: MissingPolicy = area.missing ?? 'gap';

      const areaPopupEl = Array.from(area.children).find(
        child => child.tagName.toLowerCase() === 'dc-popup'
      ) as ChartPopup | null;

      const knownAttrs = new Set(['label', 'fill', 'fill-opacity', 'stroke', 'stroke-width', 'href', 'target', 'show-value', 'show-percent', 'curve-fit', 'pattern', 'pattern-stroke', 'pattern-fill', 'pattern-scale']);
      const passthroughAttrs = area.getPassthroughAttributes(knownAttrs);

      // Label positioning inheritance: point → area → chart → default
      const areaLabelPosition = area.labelPosition ?? this.labelPosition;
      const areaLabelOffsetX = area.labelOffsetX ?? this.labelOffsetX;
      const areaLabelOffsetY = area.labelOffsetY ?? this.labelOffsetY;
      const areaLabelOffsetR = area.labelOffsetR ?? this.labelOffsetR;
      const areaLabelFill = area.labelFill ?? this.labelFill;

      return {
        fill: areaFill,
        fillOpacity: area.fillOpacity ?? 0.5,
        stroke: area.getEffectiveStroke() || areaFill,
        strokeWidth: area.strokeWidth ?? 2,
        label: area.label || `Area ${areaIndex + 1}`,
        curveFit: areaCurveFit,
        missing: areaPolicy,
        href: area.href || undefined,
        target: area.target || undefined,
        popup: areaPopupEl ? { content: areaPopupEl.content, trigger: areaPopupEl.trigger } : undefined,
        autoPopup: area.autoPopup,
        element: area,
        passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined,
        pattern: area.pattern,
        patternStroke: area.patternStroke,
        patternFill: area.patternFill,
        patternScale: area.patternScale,
        originalFill: undefined as string | undefined,
        valueFormat: area.valueFormat,
        labelPosition: areaLabelPosition,
        labelOffsetX: areaLabelOffsetX,
        labelOffsetY: areaLabelOffsetY,
        labelOffsetR: areaLabelOffsetR,
        paint: this.getPalettePaint(area),
        labelFill: areaLabelFill,
        points: pointElements.map(point => {
          const pointPopupEl = point.querySelector('dc-popup') as ChartPopup | null;
          const showValue = point.hasAttribute('show-value') ? point.showValue : areaShowValue;
          const showPercent = point.hasAttribute('show-percent') ? point.showPercent! : areaShowPercent;
          // Inherit label positioning from point → area → chart
          const pointLabelPosition = point.labelPosition ?? areaLabelPosition;
          const pointLabelOffsetX = point.labelOffsetX ?? areaLabelOffsetX;
          const pointLabelOffsetY = point.labelOffsetY ?? areaLabelOffsetY;
          const pointLabelOffsetR = point.labelOffsetR ?? areaLabelOffsetR;
          const pointLabelFill = point.labelFill ?? areaLabelFill;

          const isMissing = !Number.isFinite(point.value);
          const missing = isMissing && areaPolicy !== 'zero';
          return {
            missing,
            value: missing ? NaN : (isMissing ? 0 : point.value),
            label: point.label,
            fill: point.fill || undefined,
            href: point.href || undefined,
            target: point.target || undefined,
            popup: pointPopupEl ? { content: pointPopupEl.content, trigger: pointPopupEl.trigger } : undefined,
            autoPopup: point.autoPopup,
            showValue,
            showPercent,
            shape: point.shape || 'circle',
            valueFormat: point.valueFormat,
            labelPosition: pointLabelPosition,
            labelOffsetX: pointLabelOffsetX,
            labelOffsetY: pointLabelOffsetY,
            labelOffsetR: pointLabelOffsetR,
            labelFill: pointLabelFill
          };
        })
      };
    });

    // Resolve fills with patterns
    if (areasData.length > 0) {
      const elements = areasData.map(a => ({
        fill: a.fill || undefined,
        label: a.label,
        value: 0,  // Areas don't have a single value
        pattern: a.pattern,
        patternStroke: a.patternStroke,
        patternFill: a.patternFill,
        patternScale: a.patternScale,
        defaultColor: this.lineColor  // Use line color as default for areas
      }));
      const resolvedFills = this.resolveFillsWithPatterns(elements);

      areasData.forEach((area, index) => {
        area.fill = resolvedFills[index].fill;
        area.originalFill = resolvedFills[index].originalFill;
        // Update stroke to match fill if not explicitly set
        if (!areaElements[index].getEffectiveStroke()) {
          area.stroke = resolvedFills[index].originalFill || resolvedFills[index].fill;
        }
      });
    }

    return areasData;
  }

  /**
   * Get maximum stacked value for areas (for axis scaling).
   * Returns the cumulative sum at each x-position.
   */
  private getAreaStackedMaximums(): number[] {
    const areas = this.getAreas();
    if (areas.length <= 1 || this.overlapping) {
      // No stacking - return empty (individual values are sufficient)
      return [];
    }

    // Calculate cumulative values per x-position
    const cumulativeByIndex = new Map<number, number>();

    areas.forEach(area => {
      area.points.forEach((point, pointIndex) => {
        const current = cumulativeByIndex.get(pointIndex) || 0;
        // A missing point contributes nothing to the stack rather than NaN,
        // which would otherwise wipe out the axis range.
        cumulativeByIndex.set(pointIndex, current + (Number.isFinite(point.value) ? point.value : 0));
      });
    });

    return Array.from(cumulativeByIndex.values());
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
        element: bubble,
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
        patternScale: bubble.patternScale,
        valueFormat: bubble.valueFormat,
        // Label positioning: bubble → chart → default
        labelPosition: bubble.labelPosition ?? this.labelPosition,
        labelOffsetX: bubble.labelOffsetX ?? this.labelOffsetX,
        labelOffsetY: bubble.labelOffsetY ?? this.labelOffsetY,
        labelOffsetR: bubble.labelOffsetR ?? this.labelOffsetR,
        labelFill: bubble.labelFill ?? this.labelFill,
        paint: this.getPalettePaint(bubble)
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

    const range = this.getNiceRange();
    // Measure both min and max to find widest (important for negative values)
    const maxValueStr = this.formatValue(range.max);
    const minValueStr = this.formatValue(range.min);
    const maxValueWidth = Math.max(
      this.measureText(maxValueStr, this.fontSize(11)),
      this.measureText(minValueStr, this.fontSize(11))
    ) + 15;

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
      const baseLabelWidth = this.measureText(longestLabel, this.fontSize(12)) + 15;
      const longestGroupLabelWidth = hasGroups
        ? Math.max(...structure.filter(s => s.isGroup).map(s => this.measureText((s as BarGroupData).label, this.fontSize(13)))) + 20
        : 0;
      const valueWidth = Math.max(
        this.measureText(maxValueStr, this.fontSize(14)),
        this.measureText(minValueStr, this.fontSize(14))
      ) + 15;

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

  /**
   * Spacing to apply on either side of a unit, honouring any per-unit override and
   * the compression factor from {@link calculateUnitDimensions}.
   */
  private unitGutter(unit: BarOrGroup, gutterScale = 1): number {
    return (unit.gutter ?? this.gutter) * gutterScale;
  }

  private calculateUnitDimensions(
    structure: BarOrGroup[],
    availableSpace: number
  ): {
    unitSizes: number[];
    totalGutterSpace: number;
    /** Factor applied to every gutter to fit bars in the available space (1 = uncompressed). */
    gutterScale: number;
    totalCustomSize: number;
    remainingSpace: number;
    defaultUnitSize: number;
    unitsWithoutCustomSize: number;
  } {
    let totalGutterSpace = 0;
    structure.forEach(unit => {
      const gutter = this.unitGutter(unit);
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

    // Gutters are a fixed cost per unit, so past a certain bar count they consume
    // the entire plot area and the leftover space for bars turns negative. A negative
    // width makes the browser reject every <rect>, so the chart silently renders
    // nothing. Compress the gutters instead, keeping bars at least MIN_UNIT_SIZE wide.
    const rawGutterSpace = totalGutterSpace;
    let gutterScale = 1;

    if (unitsWithoutCustomSize > 0 && rawGutterSpace > 0) {
      const minNeeded = unitsWithoutCustomSize * Chart.MIN_UNIT_SIZE;
      if (availableSpace - totalCustomSize - rawGutterSpace < minNeeded) {
        const allowedGutterSpace = Math.max(0, availableSpace - totalCustomSize - minNeeded);
        gutterScale = Math.min(1, allowedGutterSpace / rawGutterSpace);
        totalGutterSpace = rawGutterSpace * gutterScale;

        this.logError(ErrorCode.BAR_SPACE_EXHAUSTED, {
          count: structure.length,
          available: Math.round(availableSpace),
          gutterScale: gutterScale.toFixed(2),
          minSize: Chart.MIN_UNIT_SIZE
        });
      }
    }

    const remainingSpace = availableSpace - totalCustomSize - totalGutterSpace;
    // Never negative: a negative width is invalid SVG and drops the shape entirely.
    const defaultUnitSize = unitsWithoutCustomSize > 0
      ? Math.max(Chart.MIN_UNIT_SIZE, remainingSpace / unitsWithoutCustomSize)
      : 0;
    const finalUnitSizes = unitSizes.map(s => s === -1 ? defaultUnitSize : s);

    return {
      unitSizes: finalUnitSizes,
      totalGutterSpace,
      gutterScale,
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

  /**
   * Point markers render as one of several shapes, none of which carry an
   * identifying attribute of their own. Wrapping in a group gives them a single
   * stable hook for `::part(point)` regardless of which shape was chosen.
   */
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
    return svg`<g class="point-marker">${
      this.renderPointShapeGeometry(shape, x, y, size, color, cursor, handlers)
    }</g>`;
  }

  private renderPointShapeGeometry(
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
            font-size="${this.fontSize(size * 2.5)}" fill="${color}"
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
    range: ValueRange | number,
    chartSize: number,
    total: number,
    reverse = false
  ): SVGTemplateResult {
    if (bar.segments && bar.segments.length > 0) {
      // For segmented bars, extract max for legacy calculation
      // (negative segments in stacked bars is future work)
      const max = typeof range === 'number' ? range : range.max;
      return this.renderSegmentedBar(bar, index, orientation, rect, max, chartSize, total, reverse);
    }

    const hasPopup = bar.href || bar.popup || this.shouldShowAutoPopup(bar.autoPopup);
    const barRect = svg`
      <rect
        x="${rect.x}" y="${rect.y}"
        width="${rect.width}" height="${rect.height}"
        fill="${bar.fill}"
        stroke="${bar.stroke || 'none'}"
        stroke-width="${bar.strokeWidth || 0}"
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
          // Segment stroke: element > bar-level > chart-level
          const segStroke = segment.stroke || bar.stroke || 'none';
          const segStrokeWidth = segment.strokeWidth ?? bar.strokeWidth ?? 0;
          const segRect = svg`
            <rect
              x="${rect.x}" y="${currentY}"
              width="${rect.width}" height="${segmentHeight}"
              fill="${segment.fill}"
              stroke="${segStroke}"
              stroke-width="${segStrokeWidth}"
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
          const segValueString = this.formatValueString(segment.value, segPercent, segShouldShowValue, segShouldShowPercent, segment.valueFormat);

          return svg`
            ${segment.href ? svg`<a href="${segment.href}" target="${segment.target || '_self'}">${segRect}</a>` : segRect}
            ${segValueString ? svg`
              <text
                part="label"
                x="${rect.x + rect.width / 2}"
                y="${currentY + segmentHeight / 2 + 4}"
                text-anchor="middle" font-size="${this.fontSize(12)}" fill="#fff"
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
          // Segment stroke: element > bar-level > chart-level
          const segStroke = segment.stroke || bar.stroke || 'none';
          const segStrokeWidth = segment.strokeWidth ?? bar.strokeWidth ?? 0;
          const segRect = svg`
            <rect
              x="${currentX}" y="${rect.y}"
              width="${segmentWidth}" height="${rect.height}"
              fill="${segment.fill}"
              stroke="${segStroke}"
              stroke-width="${segStrokeWidth}"
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
          const segValueString = this.formatValueString(segment.value, segPercent, segShouldShowValue, segShouldShowPercent, segment.valueFormat);

          return svg`
            ${segment.href ? svg`<a href="${segment.href}" target="${segment.target || '_self'}">${segRect}</a>` : segRect}
            ${segValueString ? svg`
              <text
                part="label"
                x="${currentX + segmentWidth / 2}"
                y="${rect.y + rect.height / 2 + 4}"
                text-anchor="middle" font-size="${this.fontSize(12)}" fill="#fff"
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

  protected override getShadowParts(): Record<string, string> {
    return {
      ...super.getShadowParts(),
      'rect[data-shape-index]': 'bar',
      'path.line-path': 'line',
      'path.area-path': 'area',
      'g.point-marker': 'point',
      'circle.bubble-shape': 'bubble',
      '[data-segment-index]': 'bar-segment',
      'line.reference-line': 'reference-line',
      'rect.reference-band': 'reference-band',
      'text.reference-label': 'reference-label'
    };
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    // Apply passthrough attributes for all element types
    this.applyPassthroughAttributes(this.getFlattenedBars());
    this.applyPassthroughAttributes(this.getLines());
    this.applyPassthroughAttributes(this.getAreas());
    this.applyPassthroughAttributes(this.getBubbles());
    this.applyPassthroughAttributes(this.getScatterSeries());
  }

  protected renderChart(): SVGTemplateResult {
    // Clear used patterns before resolving fills
    this.clearUsedPatterns();
    this.buildSegmentColorMap();

    const bars = this.getFlattenedBars();
    const lines = this.getLines();
    const areas = this.getAreas();
    const bubbles = this.getBubbles();
    const scatter = this.getScatterSeries();
    const structure = this.getBarStructure();

    if (bars.length === 0 && lines.length === 0 && areas.length === 0 && bubbles.length === 0
        && scatter.length === 0) {
      // DC001/DC002 are emitted from the empty-state path in BaseChart, which
      // replaces this method entirely when there is no data - see
      // getEmptyStateDiagnostic().
      return svg``;
    }

    const isHorizontal = this.orientation.startsWith('horizontal');
    const isReverse = this.orientation.includes('reverse');

    // Get value axis config for grid lines, labels, and range calculation
    const valueAxisPosition = isHorizontal ? 'bottom' : 'left';
    const valueAxisConfig = this.getAxisConfig(valueAxisPosition);

    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;
    const chartHeight = this.height - padding.top - padding.bottom;
    const range = this.getNiceRange(valueAxisConfig);
    const allValues = this.getAllValues();
    const total = allValues.reduce((sum, v) => sum + Math.abs(v), 0);  // Use absolute values for total

    // Log layout info
    this.log('info', 'data.barCount', `Number of bars`, bars.length);
    this.log('info', 'data.lineCount', `Number of lines`, lines.length);
    this.log('info', 'data.areaCount', `Number of areas`, areas.length);
    this.log('info', 'data.bubbleCount', `Number of bubbles`, bubbles.length);
    this.log('info', 'data.range', `Value range [${range.min}, ${range.max}]`, range);
    this.log('info', 'layout.chartArea', `chartWidth=${chartWidth.toFixed(1)}, chartHeight=${chartHeight.toFixed(1)}`, { width: chartWidth, height: chartHeight });

    // Warn about zero-value bars (invisible)
    const zeroBars = bars.filter(b => b.value === 0);
    if (zeroBars.length > 0) {
      const labels = zeroBars.map(b => b.label || '(unlabeled)').join(', ');
      this.logError(ErrorCode.DATA_ZERO_BARS, { count: zeroBars.length, labels });
    }

    // Warn about all bars having the same color (potential config issue)
    if (bars.length > 1) {
      const uniqueColors = new Set(bars.map(b => b.originalFill || b.fill));
      if (uniqueColors.size === 1) {
        const color = bars[0].originalFill || bars[0].fill;
        this.log('info', 'bars.sameColor', `All ${bars.length} bars have the same color (${color}). Set fill attributes on bars or configure a palette for distinct colors.`);
      }
    }

    // Collect value labels to render them last (on top of lines)
    const deferredLabels: DeferredLabel[] = [];

    // Build label positions map for aligning areas/lines with bars
    const labelPositions = new Map<string, number>();
    if (bars.length > 0) {
      const stepX = chartWidth / bars.length;
      bars.forEach((bar, index) => {
        const x = padding.left + stepX / 2 + index * stepX;
        labelPositions.set(bar.label, x);
      });
    }

    return svg`
      ${this.renderDefs()}

      <!-- Grid lines -->
      ${this.renderGridLines(padding, chartWidth, chartHeight, range, isHorizontal ? 'horizontal' : 'vertical', valueAxisConfig)}

      <!-- Reference bands (a region of the plot, so beneath everything drawn on it) -->
      ${this.renderReferenceBands(padding, chartWidth, chartHeight, range, isHorizontal ? 'horizontal' : 'vertical')}

      <!-- Bars -->
      ${bars.length > 0 ? this.renderBars(bars, structure, padding, chartWidth, chartHeight, range, total, deferredLabels) : ''}

      <!-- Areas (rendered after bars but before lines) -->
      ${areas.length > 0 ? this.renderAreas(areas, padding, chartWidth, chartHeight, range, total, deferredLabels, labelPositions) : ''}

      <!-- Scatter markers (individual readings, beneath any fitted line) -->
      ${scatter.length > 0 ? this.renderScatter(scatter, padding, chartWidth, chartHeight, range) : ''}

      <!-- Bubbles (rendered after areas but before lines) -->
      ${bubbles.length > 0 ? this.renderBubbles(bubbles, padding, chartWidth, chartHeight, range, total, deferredLabels) : ''}

      <!-- Lines (rendered on top of shapes) -->
      ${lines.length > 0 ? this.renderLines(lines, padding, chartWidth, chartHeight, range, total, deferredLabels) : ''}

      <!-- Value labels (rendered last, on top of everything) -->
      ${deferredLabels.map(label => svg`
        <text
          part="label"
          x="${label.x}"
          y="${label.y}"
          text-anchor="${label.anchor || 'middle'}"
          font-size="${this.fontSize(label.fontSize || 14)}"
          fill="${label.fill || '#333'}"
        >${label.text}</text>
      `)}

      <!-- Axes -->
      ${this.renderAxes(padding, isHorizontal ? 'horizontal' : 'vertical', isReverse, range)}

      <!-- Value axis labels -->
      ${this.renderValueAxisLabels(
        padding, chartWidth, chartHeight, range,
        isHorizontal ? 'horizontal' : 'vertical',
        isReverse,
        valueAxisConfig
      )}

      <!-- Category axis labels -->
      ${this.hasNumericX()
        ? this.renderNumericCategoryLabels(padding, chartWidth, chartHeight)
        : this.renderCategoryAxisLabels(bars, lines, bubbles, padding, chartWidth, chartHeight, structure, range)}

      <!-- Reference lines and their labels, over the data they annotate -->
      ${this.renderReferenceLines(padding, chartWidth, chartHeight, range, isHorizontal ? 'horizontal' : 'vertical')}

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
    range: ValueRange,
    total: number,
    deferredLabels: DeferredLabel[]
  ): SVGTemplateResult {
    const isHorizontal = this.orientation.startsWith('horizontal');
    const isReverse = this.orientation.includes('reverse');

    if (isHorizontal) {
      return this.renderHorizontalBars(bars, structure, padding, chartWidth, chartHeight, range, total, isReverse, deferredLabels);
    } else {
      return this.renderVerticalBars(bars, structure, padding, chartWidth, chartHeight, range, total, isReverse, deferredLabels);
    }
  }

  // ============================================================================
  // Label Fill Calculation (Geometric Hit-Testing)
  // ============================================================================

  /**
   * Check if a point is inside a rectangular bar.
   */
  private isPointInsideBar(
    pointX: number, pointY: number,
    barX: number, barY: number, barWidth: number, barHeight: number
  ): boolean {
    return pointX >= barX && pointX <= barX + barWidth &&
           pointY >= barY && pointY <= barY + barHeight;
  }

  /**
   * Check if a point is inside a circle (for bubbles).
   */
  private isPointInsideCircle(
    pointX: number, pointY: number,
    centerX: number, centerY: number, radius: number
  ): boolean {
    const dx = pointX - centerX;
    const dy = pointY - centerY;
    return (dx * dx + dy * dy) <= (radius * radius);
  }

  /**
   * Calculate the fill color for a bar label using geometric hit-testing.
   */
  private calculateBarLabelFill(
    labelX: number, labelY: number,
    barX: number, barY: number, barWidth: number, barHeight: number,
    shapeFill: string,
    explicitFill?: string
  ): string {
    const isInside = this.isPointInsideBar(labelX, labelY, barX, barY, barWidth, barHeight);
    return this.calculateLabelFill(explicitFill, isInside, shapeFill);
  }

  /**
   * Calculate the fill color for a bubble label using geometric hit-testing.
   */
  private calculateBubbleLabelFill(
    labelX: number, labelY: number,
    centerX: number, centerY: number, radius: number,
    shapeFill: string,
    explicitFill?: string
  ): string {
    const isInside = this.isPointInsideCircle(labelX, labelY, centerX, centerY, radius);
    return this.calculateLabelFill(explicitFill, isInside, shapeFill);
  }

  /**
   * Calculate the fill color for a point label.
   * Points are small, so labels are typically outside.
   */
  private calculatePointLabelFill(explicitFill?: string): string {
    // Points are small - labels are essentially always outside
    return this.calculateLabelFill(explicitFill, false, '#ffffff');
  }

  /**
   * Calculate label position for a vertical bar.
   * @param x Bar x position
   * @param y Bar y position (top edge for positive, bottom edge for negative)
   * @param barWidth Bar width
   * @param barHeight Bar height (always positive)
   * @param isNegative Whether the bar value is negative
   * @param reverse Whether the chart is in reverse orientation
   * @param position Label position: outside, inside-top, inside-center, inside-bottom, outside-top, outside-bottom
   * @param offsetX Horizontal offset
   * @param offsetY Vertical offset
   * @param offsetR Radial offset (away from zero line)
   * @param fontSize Font size for label
   * @returns Position and anchor for the label
   */
  private calculateVerticalBarLabelPosition(
    x: number, y: number, barWidth: number, barHeight: number,
    isNegative: boolean, reverse: boolean,
    position: string | undefined,
    offsetX: number, offsetY: number, offsetR: number,
    fontSize: number
  ): { x: number; y: number; anchor: string } {
    // Normalize position - outside and outside-top are the same
    const pos = position === 'outside-top' ? 'outside' : (position || 'outside');

    // Base x is always centered
    const labelX = x + barWidth / 2 + offsetX;

    // For vertical bars, "top" means away from zero, "bottom" means toward zero
    // For positive bars (normal): top is visually above, bottom is visually below
    // For negative bars (normal): top is visually below (away from zero at top), bottom is above (toward zero)
    // Reverse orientation flips the visual direction

    let labelY: number;
    let anchor = 'middle';

    // Determine the visual direction based on value sign and reverse orientation
    // valueEndY = the y coordinate at the "top" of the value (away from zero)
    // zeroEndY = the y coordinate at the "bottom" of the value (toward zero)
    const valueEndY = isNegative
      ? (reverse ? y : y + barHeight)  // Negative: bottom visually (or top if reversed)
      : (reverse ? y + barHeight : y); // Positive: top visually (or bottom if reversed)
    const zeroEndY = isNegative
      ? (reverse ? y + barHeight : y)  // Negative: top visually (toward zero)
      : (reverse ? y : y + barHeight); // Positive: bottom visually (toward zero)

    switch (pos) {
      case 'inside-top':
        // Inside bar, near the value end (away from zero)
        labelY = valueEndY + (isNegative !== reverse ? -fontSize - 4 : fontSize + 4);
        labelY += offsetR * (isNegative !== reverse ? 1 : -1);
        break;
      case 'inside-center':
        // Inside bar, centered
        labelY = y + barHeight / 2 + fontSize / 3;
        break;
      case 'inside-bottom':
        // Inside bar, near zero
        labelY = zeroEndY + (isNegative !== reverse ? fontSize + 4 : -fontSize - 4);
        labelY += offsetR * (isNegative !== reverse ? -1 : 1);
        break;
      case 'outside-bottom':
        // Outside bar, toward zero (rarely used but supported)
        labelY = zeroEndY + (isNegative !== reverse ? -8 : 15);
        labelY += offsetR * (isNegative !== reverse ? 1 : -1);
        break;
      case 'outside':
      default:
        // Outside bar, away from zero (default behavior)
        labelY = valueEndY + (isNegative !== reverse ? 15 : -8);
        labelY += offsetR * (isNegative !== reverse ? -1 : 1);
        break;
    }

    labelY += offsetY;

    return { x: labelX, y: labelY, anchor };
  }

  /**
   * Calculate label position for a horizontal bar.
   * @param x Bar x position (left edge for positive, right edge for negative)
   * @param y Bar y position
   * @param barWidth Bar width (always positive, represents distance from zero)
   * @param barHeight Bar height
   * @param isNegative Whether the bar value is negative
   * @param reverse Whether the chart is in reverse orientation
   * @param position Label position: outside, inside-top, inside-center, inside-bottom, outside-top, outside-bottom
   * @param offsetX Horizontal offset
   * @param offsetY Vertical offset
   * @param offsetR Radial offset (away from zero line)
   * @param fontSize Font size for label
   * @returns Position and anchor for the label
   */
  private calculateHorizontalBarLabelPosition(
    x: number, y: number, barWidth: number, barHeight: number,
    isNegative: boolean, reverse: boolean,
    position: string | undefined,
    offsetX: number, offsetY: number, offsetR: number
  ): { x: number; y: number; anchor: string } {
    // Normalize position - outside and outside-top are the same
    const pos = position === 'outside-top' ? 'outside' : (position || 'outside');

    // Base y is always centered vertically in the bar
    const labelY = y + barHeight / 2 + 4 + offsetY;

    // For horizontal bars, "top" means away from zero, "bottom" means toward zero
    // In horizontal orientation, this translates to left/right instead of up/down
    // For positive bars (normal): "top" is right (away from zero at left), "bottom" is left
    // For negative bars (normal): "top" is left (away from zero at right), "bottom" is right
    // Reverse orientation flips this

    let labelX: number;
    let anchor: string;

    // valueEndX = the x coordinate at the "top" of the value (away from zero)
    // zeroEndX = the x coordinate at the "bottom" of the value (toward zero)
    const valueEndX = isNegative
      ? (reverse ? x + barWidth : x)  // Negative: left visually (or right if reversed)
      : (reverse ? x : x + barWidth); // Positive: right visually (or left if reversed)
    const zeroEndX = isNegative
      ? (reverse ? x : x + barWidth)  // Negative: right visually (toward zero)
      : (reverse ? x + barWidth : x); // Positive: left visually (toward zero)

    switch (pos) {
      case 'inside-top':
        // Inside bar, near the value end (away from zero)
        // Use proper anchor to keep text inside bar boundaries
        if (isNegative !== reverse) {
          // Value end is on the left side
          labelX = valueEndX + 8;
          anchor = 'start';
        } else {
          // Value end is on the right side
          labelX = valueEndX - 8;
          anchor = 'end';
        }
        labelX += offsetR * (isNegative !== reverse ? 1 : -1);
        break;
      case 'inside-center':
        // Inside bar, centered
        labelX = x + barWidth / 2;
        anchor = 'middle';
        break;
      case 'inside-bottom':
        // Inside bar, near zero
        // Use proper anchor to keep text inside bar boundaries
        if (isNegative !== reverse) {
          // Zero end is on the right side
          labelX = zeroEndX - 8;
          anchor = 'end';
        } else {
          // Zero end is on the left side
          labelX = zeroEndX + 8;
          anchor = 'start';
        }
        labelX += offsetR * (isNegative !== reverse ? -1 : 1);
        break;
      case 'outside-bottom':
        // Outside bar, toward zero (rarely used but supported)
        labelX = zeroEndX + (isNegative !== reverse ? 8 : -8);
        labelX += offsetR * (isNegative !== reverse ? 1 : -1);
        anchor = isNegative !== reverse ? 'start' : 'end';
        break;
      case 'outside':
      default:
        // Outside bar, away from zero (default behavior)
        labelX = valueEndX + (isNegative !== reverse ? -8 : 8);
        labelX += offsetR * (isNegative !== reverse ? -1 : 1);
        anchor = isNegative !== reverse ? 'end' : 'start';
        break;
    }

    labelX += offsetX;

    return { x: labelX, y: labelY, anchor };
  }

  /**
   * Calculate label position for point elements (on lines)
   * Supports 9 position values: above, above-left, above-right, below, below-left, below-right, left, right, center
   */
  private calculatePointLabelPosition(
    x: number, y: number,
    position: string | undefined,
    offsetX: number, offsetY: number, offsetR: number,
    fontSize: number
  ): { x: number; y: number; anchor: string } {
    const pos = position || 'above';
    const baseOffset = fontSize; // Base distance from point center
    const halfFont = fontSize / 2;

    let labelX: number;
    let labelY: number;
    let anchor: string;

    switch (pos) {
      case 'above':
        labelX = x;
        labelY = y - baseOffset - offsetR;
        anchor = 'middle';
        break;
      case 'above-left':
        labelX = x - halfFont;
        labelY = y - baseOffset - offsetR;
        anchor = 'end';
        break;
      case 'above-right':
        labelX = x + halfFont;
        labelY = y - baseOffset - offsetR;
        anchor = 'start';
        break;
      case 'below':
        labelX = x;
        labelY = y + baseOffset + halfFont + offsetR;
        anchor = 'middle';
        break;
      case 'below-left':
        labelX = x - halfFont;
        labelY = y + baseOffset + halfFont + offsetR;
        anchor = 'end';
        break;
      case 'below-right':
        labelX = x + halfFont;
        labelY = y + baseOffset + halfFont + offsetR;
        anchor = 'start';
        break;
      case 'left':
        labelX = x - baseOffset - offsetR;
        labelY = y + halfFont;
        anchor = 'end';
        break;
      case 'right':
        labelX = x + baseOffset + offsetR;
        labelY = y + halfFont;
        anchor = 'start';
        break;
      case 'center':
        labelX = x;
        labelY = y + halfFont;
        anchor = 'middle';
        break;
      default:
        // Default to 'above'
        labelX = x;
        labelY = y - baseOffset - offsetR;
        anchor = 'middle';
        break;
    }

    // Apply additional offsets
    labelX += offsetX;
    labelY += offsetY;

    return { x: labelX, y: labelY, anchor };
  }

  /**
   * Calculate label position for bubble elements
   * Supports 10 position values: all point positions plus 'inside'
   */
  private calculateBubbleLabelPosition(
    x: number, y: number, radius: number,
    position: string | undefined,
    offsetX: number, offsetY: number, offsetR: number,
    fontSize: number
  ): { x: number; y: number; anchor: string } {
    const pos = position || 'above';
    const halfFont = fontSize / 2;

    // For bubbles, 'inside' means centered inside the bubble
    if (pos === 'inside') {
      return {
        x: x + offsetX,
        y: y + halfFont + offsetY,
        anchor: 'middle'
      };
    }

    // For other positions, use the bubble edge as the base (like points but at radius distance)
    const baseOffset = radius + 8; // Distance from bubble edge

    let labelX: number;
    let labelY: number;
    let anchor: string;

    switch (pos) {
      case 'above':
        labelX = x;
        labelY = y - baseOffset - offsetR;
        anchor = 'middle';
        break;
      case 'above-left':
        labelX = x - halfFont;
        labelY = y - baseOffset - offsetR;
        anchor = 'end';
        break;
      case 'above-right':
        labelX = x + halfFont;
        labelY = y - baseOffset - offsetR;
        anchor = 'start';
        break;
      case 'below':
        labelX = x;
        labelY = y + baseOffset + halfFont + offsetR;
        anchor = 'middle';
        break;
      case 'below-left':
        labelX = x - halfFont;
        labelY = y + baseOffset + halfFont + offsetR;
        anchor = 'end';
        break;
      case 'below-right':
        labelX = x + halfFont;
        labelY = y + baseOffset + halfFont + offsetR;
        anchor = 'start';
        break;
      case 'left':
        labelX = x - baseOffset - offsetR;
        labelY = y + halfFont;
        anchor = 'end';
        break;
      case 'right':
        labelX = x + baseOffset + offsetR;
        labelY = y + halfFont;
        anchor = 'start';
        break;
      case 'center':
        labelX = x;
        labelY = y + halfFont;
        anchor = 'middle';
        break;
      default:
        // Default to 'above'
        labelX = x;
        labelY = y - baseOffset - offsetR;
        anchor = 'middle';
        break;
    }

    // Apply additional offsets
    labelX += offsetX;
    labelY += offsetY;

    return { x: labelX, y: labelY, anchor };
  }

  /**
   * Walk the bar structure once and return each bar's position along the
   * category axis.
   *
   * Orientation-agnostic: the traversal only ever moves along the category axis,
   * so `start`/`size` are x/width for a vertical chart and y/height for a
   * horizontal one. The value axis is the caller's business.
   *
   * This exists because the walk used to be written out four times - twice to
   * draw bars and twice to place their category labels - and the copies had
   * drifted. The label copies never gained the branch that honours an explicit
   * per-bar `width`, so a group of bars with differing widths drew its labels
   * from the group average: 15 units of drift, every label off its bar. One
   * traversal makes that class of bug impossible rather than merely fixed.
   */
  private computeBarLayout(
    bars: FlattenedBar[],
    structure: BarOrGroup[],
    unitSizes: number[],
    gutterScale: number,
    origin: number
  ): {
    slots: Array<{ start: number; size: number; center: number }>;
    units: Array<{ start: number; end: number; center: number }>;
  } {
    const layout: Array<{ start: number; size: number; center: number }> = [];
    const unitBounds = new Map<number, { start: number; end: number }>();
    let barIndex = 0;
    let unitIndex = 0;
    let cursor = origin;

    for (let i = 0; i < bars.length; i++) {
      const unit = structure[unitIndex];
      if (!unit) break;

      const unitSize = unitSizes[unitIndex];
      const gutter = this.unitGutter(unit, gutterScale);
      let start: number;
      let size: number;

      if (barIndex === 0) cursor += gutter / 2;

      if (unit.isGroup) {
        const groupBarCount = unit.bars.length;
        const allBarsHaveWidth = unit.bars.every(b => this.parseCSSUnit(b.width) !== undefined);

        if (allBarsHaveWidth) {
          size = this.parseCSSUnit(bars[i].width)!;
          start = cursor;
          cursor += size;
        } else {
          size = unitSize / groupBarCount;
          start = cursor + barIndex * size;
        }

        barIndex++;
        if (barIndex >= groupBarCount) {
          barIndex = 0;
          if (!allBarsHaveWidth) cursor += unitSize;
          cursor += gutter / 2;
          unitIndex++;
        }
      } else {
        start = cursor;
        size = unitSize;
        cursor += unitSize + gutter / 2;
        barIndex = 0;
        unitIndex++;
      }

      layout.push({ start, size, center: start + size / 2 });

      // Track each unit's true extent so a group label can sit over the group
      // it names. Derived from the bars themselves rather than re-walked, which
      // is how the old group-label loops came to ignore gutters entirely.
      const owner = unit.isGroup ? unitIndex - (barIndex === 0 ? 1 : 0) : unitIndex - 1;
      const bounds = unitBounds.get(owner);
      if (bounds) {
        bounds.start = Math.min(bounds.start, start);
        bounds.end = Math.max(bounds.end, start + size);
      } else {
        unitBounds.set(owner, { start, end: start + size });
      }
    }

    const units = structure.map((_, i) => {
      const bounds = unitBounds.get(i) ?? { start: origin, end: origin };
      return { ...bounds, center: (bounds.start + bounds.end) / 2 };
    });

    return { slots: layout, units };
  }

  private renderVerticalBars(
    bars: FlattenedBar[],
    structure: BarOrGroup[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange,
    total: number,
    reverse: boolean,
    deferredLabels: DeferredLabel[]
  ): SVGTemplateResult {
    const { unitSizes: finalUnitWidths, gutterScale } = this.calculateUnitDimensions(structure, chartWidth);
    const { min, max } = range;
    const totalRange = max - min;

    // Calculate zero line Y position
    // For normal orientation:
    //   - all-positive: zero is at bottom (this.height - padding.bottom)
    //   - all-negative: zero is at top (padding.top)
    //   - mixed: zero is proportionally positioned
    // For reverse orientation:
    //   - all-positive: zero is at top (padding.top)
    //   - all-negative: zero is at bottom (this.height - padding.bottom)
    //   - mixed: zero is proportionally positioned (inverted)
    const zeroY = reverse
      ? padding.top + ((0 - min) / totalRange) * chartHeight
      : this.height - padding.bottom - ((0 - min) / totalRange) * chartHeight;

    const { slots } = this.computeBarLayout(bars, structure, finalUnitWidths, gutterScale, padding.left);

    return svg`
      ${bars.map((bar, index) => {
        const isNegative = bar.value < 0;
        const barHeightRaw = (Math.abs(bar.value) / totalRange) * chartHeight;

        let y: number;
        let barHeight: number;

        if (reverse) {
          // Reverse orientation: flip the logic
          if (isNegative) {
            y = zeroY - barHeightRaw;
            barHeight = barHeightRaw;
          } else {
            y = zeroY;
            barHeight = barHeightRaw;
          }
        } else {
          // Normal orientation
          if (isNegative) {
            // Negative bar: starts at zero line, extends downward
            y = zeroY;
            barHeight = barHeightRaw;
          } else {
            // Positive bar: ends at zero line, extends upward
            y = zeroY - barHeightRaw;
            barHeight = barHeightRaw;
          }
        }

        const slot = slots[index];
        const x = slot.start;
        const barWidth = slot.size;

        const percent = total > 0 ? (Math.abs(bar.value) / total) * 100 : 0;
        const shouldShowValue = this.evaluateShowCondition(bar.showValue, bar.value, percent);
        const shouldShowPercent = this.evaluateShowCondition(bar.showPercent, bar.value, percent);
        const valueString = this.formatValueString(bar.value, percent, shouldShowValue, shouldShowPercent, bar.valueFormat);

        // Defer label rendering to ensure it appears on top of lines
        if (valueString) {
          const fontSize = 14;
          const labelPos = this.calculateVerticalBarLabelPosition(
            x, y, barWidth, barHeight,
            isNegative, reverse,
            bar.labelPosition,
            bar.labelOffsetX || 0,
            bar.labelOffsetY || 0,
            bar.labelOffsetR || 0,
            fontSize
          );
          // Calculate label fill using geometric hit-testing
          const labelFill = this.calculateBarLabelFill(
            labelPos.x, labelPos.y,
            x, y, barWidth, barHeight,
            bar.originalFill || bar.fill,
            bar.labelFill
          );
          deferredLabels.push({
            x: labelPos.x,
            y: labelPos.y,
            text: valueString,
            anchor: labelPos.anchor,
            fontSize,
            fill: labelFill
          });
        }

        return svg`
          ${this.renderBarContent(bar, index, 'vertical', { x, y, width: barWidth, height: barHeight }, range, chartHeight, total, reverse)}
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
    range: ValueRange,
    total: number,
    reverse: boolean,
    deferredLabels: DeferredLabel[]
  ): SVGTemplateResult {
    const { unitSizes: finalUnitHeights, gutterScale } = this.calculateUnitDimensions(structure, chartHeight);
    const { min, max } = range;
    const totalRange = max - min;

    // Calculate zero line X position
    // For normal orientation:
    //   - all-positive: zero is at left (padding.left)
    //   - all-negative: zero is at right (this.width - padding.right)
    //   - mixed: zero is proportionally positioned
    // For reverse orientation:
    //   - all-positive: zero is at right (this.width - padding.right)
    //   - all-negative: zero is at left (padding.left)
    //   - mixed: zero is proportionally positioned (inverted)
    const zeroX = reverse
      ? this.width - padding.right - ((0 - min) / totalRange) * chartWidth
      : padding.left + ((0 - min) / totalRange) * chartWidth;

    const { slots } = this.computeBarLayout(bars, structure, finalUnitHeights, gutterScale, padding.top);

    return svg`
      ${bars.map((bar, index) => {
        const isNegative = bar.value < 0;
        const barWidthRaw = (Math.abs(bar.value) / totalRange) * chartWidth;

        let x: number;
        let barWidth: number;

        if (reverse) {
          // Reverse orientation: flip the logic
          if (isNegative) {
            x = zeroX;
            barWidth = barWidthRaw;
          } else {
            x = zeroX - barWidthRaw;
            barWidth = barWidthRaw;
          }
        } else {
          // Normal orientation
          if (isNegative) {
            // Negative bar: extends leftward from zero line
            x = zeroX - barWidthRaw;
            barWidth = barWidthRaw;
          } else {
            // Positive bar: extends rightward from zero line
            x = zeroX;
            barWidth = barWidthRaw;
          }
        }

        const slot = slots[index];
        const y = slot.start;
        const barHeight = slot.size;

        const percent = total > 0 ? (Math.abs(bar.value) / total) * 100 : 0;
        const shouldShowValue = this.evaluateShowCondition(bar.showValue, bar.value, percent);
        const shouldShowPercent = this.evaluateShowCondition(bar.showPercent, bar.value, percent);
        const valueString = this.formatValueString(bar.value, percent, shouldShowValue, shouldShowPercent, bar.valueFormat);

        // Defer label rendering to ensure it appears on top of lines
        if (valueString) {
          const fontSize = 14;
          const labelPos = this.calculateHorizontalBarLabelPosition(
            x, y, barWidth, barHeight,
            isNegative, reverse,
            bar.labelPosition,
            bar.labelOffsetX || 0,
            bar.labelOffsetY || 0,
            bar.labelOffsetR || 0
          );
          // Calculate label fill using geometric hit-testing
          const labelFill = this.calculateBarLabelFill(
            labelPos.x, labelPos.y,
            x, y, barWidth, barHeight,
            bar.originalFill || bar.fill,
            bar.labelFill
          );
          deferredLabels.push({
            x: labelPos.x,
            y: labelPos.y,
            text: valueString,
            anchor: labelPos.anchor,
            fontSize,
            fill: labelFill
          });
        }

        return svg`
          ${this.renderBarContent(bar, index, 'horizontal', { x, y, width: barWidth, height: barHeight }, range, chartWidth, total, reverse)}
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
    range: ValueRange,
    total: number,
    deferredLabels: DeferredLabel[]
  ): SVGTemplateResult {
    const isHorizontal = this.orientation.startsWith('horizontal');
    const isReverse = this.orientation.includes('reverse');
    const { min, max } = range;
    const totalRange = max - min;

    const bars = this.getFlattenedBars();
    const structure = this.getBarStructure();

    // Build label-to-position map for matching line points to bars/groups
    // Priority: group labels > individual bar labels > index-based fallback
    // NOTE: Future enhancement (Option C) may need label+index matching for
    // cases where bar labels repeat across groups (e.g., "North" in Q1, Q2, Q3, Q4)
    const labelPositions = new Map<string, number>();

    if (!isHorizontal && bars.length > 0) {
      // Vertical orientation: build X position map
      const { unitSizes: finalUnitWidths, gutterScale } = this.calculateUnitDimensions(structure, chartWidth);
      let cumulativeX = padding.left;

      structure.forEach((unit, unitIndex) => {
        const currentUnitWidth = finalUnitWidths[unitIndex];
        const currentGutter = this.unitGutter(unit, gutterScale);

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
      const { unitSizes: finalUnitHeights, gutterScale } = this.calculateUnitDimensions(structure, chartHeight);
      let cumulativeY = padding.top;

      structure.forEach((unit, unitIndex) => {
        const currentUnitHeight = finalUnitHeights[unitIndex];
        const currentGutter = this.unitGutter(unit, gutterScale);

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
            const valueX = ((point.value - min) / totalRange) * chartWidth;
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
            // A time axis places the point by its date; otherwise match the
            // label against the categories, and fall back to the index.
            const timeX = this.getTimeXForLabel(point.label, padding.left, chartWidth);
            if (timeX !== null) {
              x = timeX;
            } else if (labelPositions.has(point.label)) {
              x = labelPositions.get(point.label)!;
            } else {
              x = bars.length > 0
                ? padding.left + stepX / 2 + pointIndex * stepX
                : padding.left + pointIndex * stepX;
            }
            y = this.height - padding.bottom - ((point.value - min) / totalRange) * chartHeight;
          }

          return { x, y, ...point };
        });

        // `skip` joins the neighbours, so the missing positions are dropped
        // before fitting. `gap` keeps them, and generatePathData breaks there.
        const pathPoints = line.missing === 'skip'
          ? pointPositions.filter(p => !p.missing)
          : pointPositions;
        const pathData = this.generatePathData(pathPoints, line.curveFit);

        const lineHasPopup = line.href || line.popup || this.shouldShowAutoPopup(line.autoPopup);

        const linePath = svg`
          <path
            class="line-path"
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
            // No marker and no label where there is no data - drawing either
            // would assert a value, and the y coordinate is not meaningful.
            if (pos.missing) return '';

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
            const valueString = this.formatValueString(pos.value, percent, shouldShowValue, shouldShowPercent, pos.valueFormat);

            // Defer label rendering to ensure it appears on top of bars
            if (valueString) {
              const fontSize = 12;
              const labelPos = this.calculatePointLabelPosition(
                pos.x, pos.y,
                pos.labelPosition,
                pos.labelOffsetX || 0,
                pos.labelOffsetY || 0,
                pos.labelOffsetR || 0,
                fontSize
              );
              // Calculate label fill (points are small, labels are effectively outside)
              const labelFill = this.calculatePointLabelFill(pos.labelFill);
              deferredLabels.push({
                x: labelPos.x,
                y: labelPos.y,
                text: valueString,
                anchor: labelPos.anchor,
                fontSize,
                fill: labelFill
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
  // Area Rendering
  // ============================================================================

  /**
   * Generate SVG path data for an area fill.
   * Creates a closed path from the line path back to the zero line.
   *
   * @param points Array of {x, y} coordinates forming the top edge
   * @param zeroY Y coordinate of the zero/baseline
   * @param curveFit The curve fitting method (for top edge consistency)
   * @returns SVG path data string for a closed area shape
   */
  /**
   * Build an area fill, closing each unbroken run separately.
   *
   * Closing the whole series in one shape would fill straight across a gap and
   * hide the very absence the gap exists to show.
   */
  private generateAreaPath(
    points: Array<{ x: number; y: number; missing?: boolean }>,
    zeroY: number,
    curveFit: CurveFit
  ): string {
    return this.splitAtGaps(points)
      .map(run => {
        if (run.length === 0) return '';
        if (run.length === 1) {
          // Single point: small vertical line
          return `M ${run[0].x} ${zeroY} L ${run[0].x} ${run[0].y} Z`;
        }
        const topEdge = this.generateSubpath(run, curveFit);
        const first = run[0];
        const last = run[run.length - 1];
        return `${topEdge} L ${last.x} ${zeroY} L ${first.x} ${zeroY} Z`;
      })
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Generate SVG path for a stacked area.
   * Uses the previous area's top edge as this area's baseline.
   */
  private generateStackedAreaPath(
    topPoints: Array<{ x: number; y: number }>,
    bottomPoints: Array<{ x: number; y: number }>,
    curveFit: CurveFit
  ): string {
    if (topPoints.length === 0 || bottomPoints.length === 0) return '';
    if (topPoints.length < 2) return '';

    // Top edge (forward direction)
    const topEdge = this.generatePathData(topPoints, curveFit);

    // Bottom edge (reverse direction)
    const reversedBottom = [...bottomPoints].reverse();
    const bottomEdge = this.generatePathData(reversedBottom, curveFit)
      .replace(/^M/, 'L'); // Change initial M to L for continuity

    return `${topEdge} ${bottomEdge} Z`;
  }

  /**
   * Calculate stacked area baselines (cumulative positions).
   */
  private calculateStackedAreaBaselines(
    areas: AreaData[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange,
    labelPositions: Map<string, number>
  ): { topPoints: Array<{ x: number; y: number }>[]; bottomPoints: Array<{ x: number; y: number }>[] } {
    const { min, max } = range;
    const totalRange = max - min;
    const zeroY = this.height - padding.bottom - ((0 - min) / totalRange) * chartHeight;

    const result: { topPoints: Array<{ x: number; y: number }>[]; bottomPoints: Array<{ x: number; y: number }>[] } = {
      topPoints: [],
      bottomPoints: []
    };

    // Track cumulative Y values per x-position
    const cumulativeY = new Map<number, number>();

    areas.forEach(area => {
      const topPoints: Array<{ x: number; y: number }> = [];
      const bottomPoints: Array<{ x: number; y: number }> = [];

      area.points.forEach((point, pointIndex) => {
        // Calculate X position
        const stepX = chartWidth / area.points.length;
        let x = padding.left + stepX / 2 + pointIndex * stepX;

        // Try to align with existing label positions (for combo charts)
        if (point.label && labelPositions.has(point.label)) {
          x = labelPositions.get(point.label)!;
        }
        // A time axis positions by date, ahead of label matching.
        const timeX = this.getTimeXForLabel(point.label, padding.left, chartWidth);
        if (timeX !== null) x = timeX;

        const valueHeight = Number.isFinite(point.value)
          ? (point.value / totalRange) * chartHeight
          : 0;

        // Get the baseline for this x position
        const baseY = cumulativeY.get(pointIndex) ?? zeroY;
        const topY = baseY - valueHeight; // SVG y is inverted

        bottomPoints.push({ x, y: baseY });
        topPoints.push({ x, y: topY });

        // Update cumulative for next area
        cumulativeY.set(pointIndex, topY);
      });

      result.bottomPoints.push(bottomPoints);
      result.topPoints.push(topPoints);
    });

    return result;
  }

  private renderAreas(
    areas: AreaData[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange,
    total: number,
    deferredLabels: DeferredLabel[],
    labelPositions: Map<string, number>
  ): SVGTemplateResult {
    if (areas.length === 0) return svg``;

    const { min, max } = range;
    const totalRange = max - min;
    const zeroY = this.height - padding.bottom - ((0 - min) / totalRange) * chartHeight;

    // Determine stacking mode
    const shouldStack = areas.length > 1 && !this.overlapping;

    if (shouldStack) {
      return this.renderStackedAreas(areas, padding, chartWidth, chartHeight, range, total, deferredLabels, labelPositions);
    } else {
      return this.renderOverlappingAreas(areas, padding, chartWidth, chartHeight, range, total, deferredLabels, labelPositions, zeroY);
    }
  }

  private renderOverlappingAreas(
    areas: AreaData[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange,
    total: number,
    deferredLabels: DeferredLabel[],
    labelPositions: Map<string, number>,
    zeroY: number
  ): SVGTemplateResult {
    const { min, max } = range;
    const totalRange = max - min;

    return svg`
      ${areas.map((area, areaIndex) => {
        if (area.points.length === 0) return '';

        // Calculate point positions
        const stepX = chartWidth / area.points.length;
        const positions = area.points.map((point, pointIndex) => {
          let x = padding.left + stepX / 2 + pointIndex * stepX;

          // Align with existing label positions if available
          if (point.label && labelPositions.has(point.label)) {
            x = labelPositions.get(point.label)!;
          }

          // A time axis positions by date, ahead of label matching.
          const timeXPos = this.getTimeXForLabel(point.label, padding.left, chartWidth);
          if (timeXPos !== null) x = timeXPos;

          const y = this.height - padding.bottom - ((point.value - min) / totalRange) * chartHeight;

          return { x, y, point, missing: point.missing };
        });

        const fillPositions = area.missing === 'skip'
          ? positions.filter(p => !p.missing)
          : positions;
        const areaPath = this.generateAreaPath(
          fillPositions.map(p => ({ x: p.x, y: p.y, missing: p.missing })),
          zeroY,
          area.curveFit
        );

        const strokePath = this.generatePathData(
          fillPositions.map(p => ({ x: p.x, y: p.y, missing: p.missing })),
          area.curveFit
        );

        // Add deferred labels for points
        positions.forEach(pos => {
          if (pos.missing) return;

          const percent = total > 0 ? (pos.point.value / total) * 100 : 0;
          const shouldShowValue = this.evaluateShowCondition(pos.point.showValue, pos.point.value, percent);
          const shouldShowPercent = this.evaluateShowCondition(pos.point.showPercent, pos.point.value, percent);
          const valueString = this.formatValueString(
            pos.point.value,
            percent,
            shouldShowValue,
            shouldShowPercent,
            pos.point.valueFormat
          );

          if (valueString) {
            deferredLabels.push({
              x: pos.x,
              y: pos.y - 10,  // Above the point
              text: valueString,
              anchor: 'middle',
              fontSize: 12,
              fill: pos.point.labelFill || '#333'
            });
          }
        });

        return svg`
          <!-- Area fill -->
          <path
            class="area-path"
            d="${areaPath}"
            fill="${area.fill}"
            fill-opacity="${area.fillOpacity}"
            stroke="none"
            data-shape-index="${areaIndex}"
            data-area="true"
          />
          <!-- Top edge stroke -->
          <path
            d="${strokePath}"
            fill="none"
            stroke="${area.stroke}"
            stroke-width="${area.strokeWidth}"
            data-shape-index="${areaIndex}"
            data-area-stroke="true"
          />
          <!-- Points -->
          ${positions.map((pos, pointIndex) => {
            if (pos.missing) return '';

            const pointFill = pos.point.fill || area.originalFill || area.fill;
            return svg`
              <circle
                cx="${pos.x}"
                cy="${pos.y}"
                r="4"
                fill="${pointFill}"
                stroke="white"
                stroke-width="1"
                data-shape-index="${areaIndex}"
                data-point-index="${pointIndex}"
              />
            `;
          })}
        `;
      })}
    `;
  }

  private renderStackedAreas(
    areas: AreaData[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange,
    total: number,
    deferredLabels: DeferredLabel[],
    labelPositions: Map<string, number>
  ): SVGTemplateResult {
    const baselines = this.calculateStackedAreaBaselines(
      areas, padding, chartWidth, chartHeight, range, labelPositions
    );

    return svg`
      ${areas.map((area, areaIndex) => {
        if (area.points.length === 0) return '';

        const topPoints = baselines.topPoints[areaIndex];
        const bottomPoints = baselines.bottomPoints[areaIndex];

        if (!topPoints || !bottomPoints) return '';

        const areaPath = this.generateStackedAreaPath(topPoints, bottomPoints, area.curveFit);
        const strokePath = this.generatePathData(topPoints, area.curveFit);

        // Add deferred labels for points on the top edge
        topPoints.forEach((pos, pointIndex) => {
          const point = area.points[pointIndex];
          if (!point) return;
          // Stacked areas have their own label pass; a gap has nothing to label.
          if (point.missing) return;

          const percent = total > 0 ? (point.value / total) * 100 : 0;
          const shouldShowValue = this.evaluateShowCondition(point.showValue, point.value, percent);
          const shouldShowPercent = this.evaluateShowCondition(point.showPercent, point.value, percent);
          const valueString = this.formatValueString(
            point.value,
            percent,
            shouldShowValue,
            shouldShowPercent,
            point.valueFormat
          );

          if (valueString) {
            deferredLabels.push({
              x: pos.x,
              y: pos.y - 10,  // Above the point
              text: valueString,
              anchor: 'middle',
              fontSize: 12,
              fill: point.labelFill || '#333'
            });
          }
        });

        return svg`
          <!-- Area fill -->
          <path
            class="area-path"
            d="${areaPath}"
            fill="${area.fill}"
            fill-opacity="${area.fillOpacity}"
            stroke="none"
            data-shape-index="${areaIndex}"
            data-area="true"
          />
          <!-- Top edge stroke -->
          <path
            d="${strokePath}"
            fill="none"
            stroke="${area.stroke}"
            stroke-width="${area.strokeWidth}"
            data-shape-index="${areaIndex}"
            data-area-stroke="true"
          />
          <!-- Points on top edge -->
          ${topPoints.map((pos, pointIndex) => {
            const point = area.points[pointIndex];
            if (!point) return '';
            const pointFill = point.fill || area.originalFill || area.fill;
            return svg`
              <circle
                cx="${pos.x}"
                cy="${pos.y}"
                r="4"
                fill="${pointFill}"
                stroke="white"
                stroke-width="1"
                data-shape-index="${areaIndex}"
                data-point-index="${pointIndex}"
              />
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
    range: ValueRange,
    total: number,
    deferredLabels: DeferredLabel[]
  ): SVGTemplateResult {
    const { min, max } = range;
    const totalRange = max - min;
    const maxSizeValue = Math.max(...bubbles.map(b => b.sizeValue), 1);
    const stepX = chartWidth / bubbles.length;

    return svg`
      ${bubbles.map((bubble, index) => {
        const x = this.getTimeXForLabel(bubble.label, padding.left, chartWidth)
          ?? padding.left + stepX / 2 + index * stepX;
        const y = this.height - padding.bottom - ((bubble.value - min) / totalRange) * chartHeight;
        const radius = this.calculateBubbleRadius(bubble.sizeValue, maxSizeValue);

        const bubbleHasPopup = bubble.href || bubble.popup || this.shouldShowAutoPopup(bubble.autoPopup);

        const bubbleCircle = svg`
          <circle
            class="bubble-shape"
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
        const valueString = this.formatValueString(bubble.value, percent, shouldShowValue, shouldShowPercent, bubble.valueFormat);

        // Defer label rendering to ensure it appears on top of lines
        if (valueString) {
          const fontSize = 12;
          const labelPos = this.calculateBubbleLabelPosition(
            x, y, radius,
            bubble.labelPosition,
            bubble.labelOffsetX || 0,
            bubble.labelOffsetY || 0,
            bubble.labelOffsetR || 0,
            fontSize
          );
          // Calculate label fill using geometric hit-testing
          const labelFill = this.calculateBubbleLabelFill(
            labelPos.x, labelPos.y,
            x, y, radius,
            bubble.originalFill || bubble.fill || '#999',
            bubble.labelFill
          );
          deferredLabels.push({
            x: labelPos.x,
            y: labelPos.y,
            text: valueString,
            anchor: labelPos.anchor,
            fontSize,
            fill: labelFill
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

  /**
   * Scatter markers.
   *
   * Drawn beneath lines and above areas, matching where bubbles sit: a scatter
   * is a cloud of individual readings, and a line drawn through the same data
   * should stay legible on top of it.
   */
  private renderScatter(
    series: ScatterData[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    range: ValueRange
  ): SVGTemplateResult {
    const { min, max } = range;
    const totalRange = max - min || 1;

    return svg`
      ${series.map((s, seriesIndex) => svg`
        <g part="scatter-series">
          ${s.points.map((point, pointIndex) => {
            const x = this.getNumericX(point.x, padding, chartWidth);
            if (x === null) return '';
            const y = this.height - padding.bottom - ((point.value - min) / totalRange) * chartHeight;

            const hasPopup = point.href || this.shouldShowAutoPopup(point.autoPopup, s.autoPopup);
            // Reuses the marker vocabulary `point-shape` already defines, so a
            // scatter and a line's points draw the same shapes from one place.
            // Opacity rides on the wrapping group, which covers every shape
            // whether it is filled or stroked.
            const marker = svg`
              <g
                class="scatter-marker"
                data-shape-index="${seriesIndex}"
                opacity="${s.fillOpacity}"
              >
                ${this.renderPointShape(
                  s.shape,
                  x,
                  y,
                  s.size,
                  point.fill || s.fill,
                  hasPopup ? 'pointer' : 'default',
                  {
                    mouseenter: (e: MouseEvent) => this.handleScatterEnter(e, seriesIndex, pointIndex),
                    mouseleave: () => this.handleScatterLeave(seriesIndex, pointIndex),
                    click: (e: MouseEvent) => this.handleScatterClick(e, seriesIndex, pointIndex)
                  }
                )}
              </g>`;

            return point.href
              ? svg`<a href="${point.href}" target="${point.target || '_self'}">${marker}</a>`
              : marker;
          })}
        </g>`)}
    `;
  }

  private scatterDetail(seriesIndex: number, pointIndex: number) {
    const series = this.getScatterSeries()[seriesIndex];
    const point = series?.points[pointIndex];
    return {
      chart: this,
      element: point?.element ?? series?.element,
      index: pointIndex,
      label: point?.label || series?.label || '',
      value: point?.value ?? NaN,
      percent: null
    };
  }

  /**
   * Popup content for a scatter marker.
   *
   * Both coordinates are reported, because a scatter marker means nothing
   * without its x - unlike every other element here, whose position along the
   * category axis is already spelled out as a label.
   */
  private getScatterPopupContent(series: ScatterData, point: ScatterPoint): string | null {
    if (!this.shouldShowAutoPopup(point.autoPopup, series.autoPopup)) return null;

    const name = point.label || series.label;
    return `${name ? `<strong>${name}</strong><br>` : ''}`
      + `x: ${this.formatValue(point.x, point.valueFormat)}<br>`
      + `y: ${this.formatValue(point.value, point.valueFormat)}`;
  }

  private handleScatterEnter(e: MouseEvent, seriesIndex: number, pointIndex: number): void {
    this.emitInteraction('dc-mouseenter', this.scatterDetail(seriesIndex, pointIndex), e);
    const series = this.getScatterSeries()[seriesIndex];
    const point = series?.points[pointIndex];
    if (!point) return;

    const content = this.getScatterPopupContent(series, point);
    if (content) this.showPopup(content, e.clientX, e.clientY);
  }

  private handleScatterLeave(seriesIndex: number, pointIndex: number): void {
    this.emitInteraction('dc-mouseleave', this.scatterDetail(seriesIndex, pointIndex));
    this.hidePopup();
  }

  private handleScatterClick(e: MouseEvent, seriesIndex: number, pointIndex: number): void {
    this.emitInteraction('dc-click', this.scatterDetail(seriesIndex, pointIndex), e);
  }

  /**
   * Ticks for a numeric category axis.
   *
   * Reuses `renderValueAxisLabels` in its horizontal orientation, which already
   * draws evenly spaced numeric ticks along the bottom — the same job, and the
   * reason a scatter needed no new axis rendering at all.
   */
  private renderNumericCategoryLabels(
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number
  ): SVGTemplateResult {
    const xRange = this.getXRange();
    if (!xRange) return svg``;

    const config = this.getAxisConfig(this.getCategoryAxisPosition());
    return this.renderValueAxisLabels(
      padding,
      chartWidth,
      chartHeight,
      { ...xRange, zeroPosition: 1, hasNegatives: xRange.min < 0, hasPositives: xRange.max > 0 },
      'horizontal',
      false,
      config
    );
  }

  private renderCategoryAxisLabels(
    bars: FlattenedBar[],
    lines: LineData[],
    bubbles: BubbleData[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    structure: BarOrGroup[],
    range: ValueRange
  ): SVGTemplateResult {
    const isHorizontal = this.orientation.startsWith('horizontal');
    const isReverse = this.orientation.includes('reverse');

    // Determine labels and positions
    if (bars.length > 0) {
      return this.renderBarCategoryLabels(bars, structure, padding, chartWidth, chartHeight, isHorizontal, isReverse, range);
    } else if (lines.length > 0 && lines[0].points.length > 0) {
      return this.renderLineCategoryLabels(lines[0].points, padding, chartWidth, range);
    } else if (bubbles.length > 0) {
      return this.renderBubbleCategoryLabels(bubbles, padding, chartWidth, range);
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
    isReverse: boolean,
    range: ValueRange
  ): SVGTemplateResult {
    const { unitSizes, gutterScale } = this.calculateUnitDimensions(structure, isHorizontal ? chartHeight : chartWidth);
    // For all-negative vertical charts, position labels at top (where zero is)
    const allNegative = !range.hasPositives;
    const labelsAtTop = !isHorizontal && !isReverse && allNegative;

    // The same traversal the bars are drawn from, so a label can never sit
    // anywhere other than on its bar.
    const { slots, units: unitSpans } = this.computeBarLayout(
      bars, structure, unitSizes, gutterScale, isHorizontal ? padding.top : padding.left);

    // Summed once, not per label. Deriving a total inside the label loop is
    // exactly the shape that made rendering quadratic before (see CLAUDE.md).
    const labelTotal = bars.reduce((sum, b) => sum + (Number.isFinite(b.value) ? b.value : 0), 0);
    const labelPercent = (value: number) =>
      labelTotal > 0 && Number.isFinite(value) ? (value / labelTotal) * 100 : 0;

    if (isHorizontal) {
      // Horizontal bars: labels on the left (or right if reverse)
      return svg`
        ${bars.map((bar, index) => {
          const slot = slots[index];

          // Per-element show-label. `shouldShowLabel` handles the interval and
          // the chart-level switch; this is the element's own say.
          if (!bar.label || !this.shouldShowLabel(index, bars.length)) return '';
          if (bar.showLabel !== undefined &&
              !this.evaluateShowCondition(bar.showLabel, bar.value, labelPercent(bar.value))) {
            return '';
          }

          const labelX = isReverse
            ? this.width - padding.right + 10 + this.getLabelLineOffset(index, 60)
            : padding.left - 10 - this.getLabelLineOffset(index, 60);

          return svg`
            <text
              part="label"
              x="${labelX}"
              y="${slot.center + 4}"
              text-anchor="${isReverse ? 'start' : 'end'}"
              font-size="${this.fontSize(12)}" fill="#666"
            >${bar.label}</text>
          `;
        })}

        <!-- Group labels -->
        ${(() => {
          return structure.map((item, uIndex) => {
            const groupCenterY = unitSpans[uIndex].center;

            if (!item.isGroup) return '';

            const labelX = isReverse
              ? this.width - padding.right + 30
              : padding.left - 30;

            return svg`
              <text
                part="label"
                x="${labelX}"
                y="${groupCenterY + 4}"
                text-anchor="${isReverse ? 'start' : 'end'}"
                font-size="${this.fontSize(13)}" font-weight="bold" fill="#333"
              >${item.label}</text>
            `;
          });
        })()}
      `;
    } else {
      // Vertical bars: labels at the bottom (or top if reverse)
      return svg`
        ${bars.map((bar, index) => {
          const slot = slots[index];

          // Per-element show-label. `shouldShowLabel` handles the interval and
          // the chart-level switch; this is the element's own say.
          if (!bar.label || !this.shouldShowLabel(index, bars.length)) return '';
          if (bar.showLabel !== undefined &&
              !this.evaluateShowCondition(bar.showLabel, bar.value, labelPercent(bar.value))) {
            return '';
          }

          // Position at top for reverse OR all-negative charts
          const labelY = (isReverse || labelsAtTop)
            ? padding.top - 8 - this.getLabelLineOffset(index)
            : this.height - padding.bottom + 20 + this.getLabelLineOffset(index);

          return svg`
            <text
              part="label"
              x="${slot.center}"
              y="${labelY}"
              text-anchor="middle"
              font-size="${this.fontSize(12)}" fill="#666"
            >${bar.label}</text>
          `;
        })}

        <!-- Group labels -->
        ${(() => {
          return structure.map((item, uIndex) => {
            const groupCenterX = unitSpans[uIndex].center;

            if (!item.isGroup) return '';

            // Position at top for reverse OR all-negative charts
            const labelY = (isReverse || labelsAtTop)
              ? padding.top - 28
              : this.height - padding.bottom + 40;

            return svg`
              <text
                part="label"
                x="${groupCenterX}"
                y="${labelY}"
                text-anchor="middle"
                font-size="${this.fontSize(13)}" font-weight="bold" fill="#333"
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
    chartWidth: number,
    range: ValueRange
  ): SVGTemplateResult {
    // A time axis labels its own tick dates rather than every datapoint: with
    // daily data over a year, one label per point is unreadable, and the ticks
    // land on round dates instead of wherever the samples happen to fall.
    const timeScale = this.getTimeScale();
    if (timeScale) {
      return this.renderTimeAxisLabels(timeScale, padding, chartWidth);
    }

    const stepX = chartWidth / (points.length - 1 || 1);
    // For all-negative charts, position labels at top (where zero is)
    const labelsAtTop = !range.hasPositives;

    return svg`
      ${points.map((point, index) => {
        const x = padding.left + index * stepX;
        if (!point.label || !this.shouldShowLabel(index, points.length)) return '';

        const labelY = labelsAtTop
          ? padding.top - 8 - this.getLabelLineOffset(index)
          : this.height - padding.bottom + 20 + this.getLabelLineOffset(index);

        return svg`
          <text
            part="label"
            x="${x}"
            y="${labelY}"
            text-anchor="middle"
            font-size="${this.fontSize(12)}" fill="#666"
          >${point.label}</text>
        `;
      })}
    `;
  }

  private renderBubbleCategoryLabels(
    bubbles: BubbleData[],
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    range: ValueRange
  ): SVGTemplateResult {
    const stepX = chartWidth / bubbles.length;
    // For all-negative charts, position labels at top (where zero is)
    const labelsAtTop = !range.hasPositives;

    return svg`
      ${bubbles.map((bubble, index) => {
        const x = padding.left + stepX / 2 + index * stepX;
        if (!bubble.label || !this.shouldShowLabel(index, bubbles.length)) return '';

        const labelY = labelsAtTop
          ? padding.top - 8 - this.getLabelLineOffset(index)
          : this.height - padding.bottom + 20 + this.getLabelLineOffset(index);

        return svg`
          <text
            part="label"
            x="${x}"
            y="${labelY}"
            text-anchor="middle"
            font-size="${this.fontSize(12)}" fill="#666"
          >${bubble.label}</text>
        `;
      })}
    `;
  }

  // ============================================================================
  // Auto-Popup Helper
  // ============================================================================


  // ============================================================================
  // Popup Content Generators
  // ============================================================================

  private generateBarPopupContent(
    bar: { label: string; value: number; groupLabel?: string; valueFormat?: string },
    totalValue: number
  ): string {
    let content = `<strong>${bar.label}</strong>`;
    if (bar.groupLabel) content += `<br>${bar.groupLabel}`;
    content += `<br>Value: ${this.formatValue(bar.value, bar.valueFormat)}`;
    content += `<br>${this.formatPercent(this.shareOf(bar.value, totalValue) ?? 0)}`;
    return content;
  }

  private generateSegmentPopupContent(
    segment: { label: string; value: number; valueFormat?: string },
    bar: { label: string; groupLabel?: string },
    barTotal: number
  ): string {
    let content = `<strong>${segment.label}</strong>`;
    content += `<br>${bar.label}`;
    if (bar.groupLabel) content += ` (${bar.groupLabel})`;
    content += `<br>Value: ${this.formatValue(segment.value, segment.valueFormat)}`;
    content += `<br>${this.formatPercent(this.shareOf(segment.value, barTotal) ?? 0)} of bar`;
    return content;
  }

  private generateLinePopupContent(line: { label: string; points: Array<{ value: number }> }): string {
    // Missing points are excluded from the average rather than counted as zero.
    const present = line.points.filter(p => Number.isFinite(p.value));
    const total = present.reduce((sum, p) => sum + p.value, 0);
    const avg = present.length > 0 ? total / present.length : 0;
    return `<strong>${line.label}</strong><br>Points: ${present.length}`
      + `<br>Avg: ${this.formatValue(avg)}`;
  }

  private generatePointPopupContent(
    point: { label: string; value: number; valueFormat?: string },
    lineName: string,
    totalValue: number
  ): string {
    return `<strong>${point.label}</strong><br>${lineName}`
      + `<br>Value: ${this.formatValue(point.value, point.valueFormat)}`
      + `<br>${this.formatPercent(this.shareOf(point.value, totalValue) ?? 0)}`;
  }

  private generateBubblePopupContent(
    bubble: { label: string; value: number; sizeValue: number; valueFormat?: string },
    totalValue: number
  ): string {
    return `<strong>${bubble.label}</strong>`
      + `<br>Value: ${this.formatValue(bubble.value, bubble.valueFormat)}`
      + `<br>Size: ${this.formatValue(bubble.sizeValue, bubble.valueFormat)}`
      + `<br>${this.formatPercent(this.shareOf(bubble.value, totalValue) ?? 0)}`;
  }

  // ============================================================================
  // Bar Event Handlers
  // ============================================================================

  // ==========================================================================
  // Interaction event details
  // ==========================================================================

  private barDetail(bar: FlattenedBar, index: number, bars: FlattenedBar[]) {
    const total = bars.reduce((sum, b) => sum + Math.abs(b.value), 0);
    return {
      element: bar.element ?? null,
      label: bar.label,
      value: bar.value,
      percent: this.shareOf(bar.value, total),
      index,
      seriesLabel: bar.groupLabel ?? null,
      seriesIndex: bar.groupIndex ?? null
    };
  }

  private segmentDetail(
    segment: { element?: Element; label: string; value: number },
    segmentIndex: number,
    bar: FlattenedBar,
    barIndex: number
  ) {
    const total = (bar.segments ?? []).reduce((sum, sg) => sum + Math.abs(sg.value), 0);
    return {
      element: segment.element ?? null,
      label: segment.label,
      value: segment.value,
      percent: this.shareOf(segment.value, total),
      index: segmentIndex,
      seriesLabel: bar.label,
      seriesIndex: barIndex
    };
  }

  private lineDetail(line: LineData, lineIndex: number) {
    return {
      element: line.element ?? null,
      label: line.label,
      // A line as a whole has no single value.
      value: null,
      percent: null,
      index: lineIndex,
      seriesLabel: null,
      seriesIndex: null
    };
  }

  private pointDetail(
    point: PointData,
    pointIndex: number,
    line: LineData,
    lineIndex: number,
    lines: LineData[]
  ) {
    const total = lines.reduce(
      (sum, l) => sum + l.points.reduce((s, pt) => s + Math.abs(pt.value), 0), 0);
    return {
      element: point.element ?? null,
      label: point.label,
      value: point.value,
      percent: this.shareOf(point.value, total),
      index: pointIndex,
      seriesLabel: line.label,
      seriesIndex: lineIndex
    };
  }

  private bubbleDetail(bubble: BubbleData, index: number, bubbles: BubbleData[]) {
    const total = bubbles.reduce((sum, b) => sum + Math.abs(b.value), 0);
    return {
      element: bubble.element ?? null,
      label: bubble.label,
      value: bubble.value,
      percent: this.shareOf(bubble.value, total),
      index,
      seriesLabel: null,
      seriesIndex: null
    };
  }

  private handleBarMouseEnter(e: MouseEvent, index: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[index];
    this.emitInteraction('dc-mouseenter', this.barDetail(bar, index, bars), e);
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
    this.emitInteraction('dc-mouseleave', this.barDetail(bar, index, bars));
    const isHoverPopup = bar.popup?.trigger === 'hover' || (!bar.popup && this.shouldShowAutoPopup(bar.autoPopup));
    if (isHoverPopup && this.clickedBarIndex !== index) {
      this.hidePopup();
    }
  }

  private handleBarClick(e: MouseEvent, index: number) {
    const bars = this.getFlattenedBars();
    const bar = bars[index];
    if (!this.emitInteraction('dc-click', this.barDetail(bar, index, bars), e)) return;
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

    this.emitInteraction('dc-mouseenter', this.segmentDetail(segment, segmentIndex, bar, barIndex), e);
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

    this.emitInteraction('dc-mouseleave', this.segmentDetail(segment, segmentIndex, bar, barIndex));
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

    if (!this.emitInteraction('dc-click', this.segmentDetail(segment, segmentIndex, bar, barIndex), e)) return;
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
    this.emitInteraction('dc-mouseenter', this.lineDetail(line, lineIndex), e);
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
    this.emitInteraction('dc-mouseleave', this.lineDetail(line, lineIndex));
    const isHoverPopup = line.popup?.trigger === 'hover' || (!line.popup && this.shouldShowAutoPopup(line.autoPopup));
    if (isHoverPopup && this.clickedPointIndex.lineIndex !== lineIndex) {
      this.hidePopup();
    }
  }

  private handleLineClick(e: MouseEvent, lineIndex: number) {
    const lines = this.getLines();
    const line = lines[lineIndex];
    if (!this.emitInteraction('dc-click', this.lineDetail(line, lineIndex), e)) return;
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
    this.emitInteraction('dc-mouseenter', this.pointDetail(point, pointIndex, line, lineIndex, lines), e);
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
    this.emitInteraction('dc-mouseleave', this.pointDetail(point, pointIndex, line, lineIndex, lines));
    const isHoverPopup = point.popup?.trigger === 'hover' || (!point.popup && this.shouldShowAutoPopup(point.autoPopup, line.autoPopup));
    if (isHoverPopup && (this.clickedPointIndex.lineIndex !== lineIndex || this.clickedPointIndex.pointIndex !== pointIndex)) {
      this.hidePopup();
    }
  }

  private handlePointClick(e: MouseEvent, lineIndex: number, pointIndex: number) {
    const lines = this.getLines();
    const point = lines[lineIndex].points[pointIndex];
    if (!this.emitInteraction('dc-click',
      this.pointDetail(point, pointIndex, lines[lineIndex], lineIndex, lines), e)) return;
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
    this.emitInteraction('dc-mouseenter', this.bubbleDetail(bubble, bubbleIndex, bubbles), e);
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
    this.emitInteraction('dc-mouseleave', this.bubbleDetail(bubble, bubbleIndex, bubbles));
    const isHoverPopup = bubble.popup?.trigger === 'hover' || (!bubble.popup && this.shouldShowAutoPopup(bubble.autoPopup));
    if (isHoverPopup && this.clickedBubbleIndex !== bubbleIndex) {
      this.hidePopup();
    }
  }

  private handleBubbleClick(e: MouseEvent, bubbleIndex: number) {
    const bubbles = this.getBubbles();
    const bubble = bubbles[bubbleIndex];
    if (!this.emitInteraction('dc-click', this.bubbleDetail(bubble, bubbleIndex, bubbles), e)) return;
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
    const areas = this.getAreas();
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

      // Also add area items if present (combo chart with stacked bars + areas)
      areas.forEach(area => {
        legendItems.push({
          label: area.label,
          color: area.originalFill || area.fill,
          dimensionless: true,
          shape: 'square'  // Areas use square shape (filled regions)
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

    // Add area items (shape: square)
    // Areas are dimensionless - they show trend, not single aggregate value
    // Use originalFill for legend (fill may be pattern URL)
    areas.forEach(area => {
      items.push({
        label: area.label,
        color: area.originalFill || area.fill,
        dimensionless: true,
        shape: 'square'  // Areas use square shape (filled regions)
      } as DimensionlessLegendItem);
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

    // Add scatter items (shape: circle)
    // Dimensionless like lines and areas: a cloud of readings has no single
    // aggregate value, and summing them would invent one.
    this.getScatterSeries().forEach(series => {
      items.push({
        label: series.label,
        color: series.originalFill || series.fill,
        dimensionless: true,
        shape: 'circle'
      } as DimensionlessLegendItem);
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
    const hasAreas = this.getAreas().length > 0;
    const hasBubbles = this.getBubbles().length > 0;
    const hasScatter = this.getScatterSeries().length > 0;

    const types: string[] = [];
    if (hasBars) types.push('bar');
    if (hasAreas) types.push('area');
    if (hasLines) types.push('line');
    if (hasBubbles) types.push('bubble');
    // "scatter chart" is not what anyone calls it, so it names itself in full
    // and the shared suffix is dropped when it is the only kind present.
    if (hasScatter) types.push('scatter');

    if (types.length === 0) return 'chart';
    if (types.length === 1) return types[0] === 'scatter' ? 'scatter plot' : `${types[0]} chart`;
    return `${types.join(' and ')} chart`;
  }

  /**
   * Get basic data summary for accessibility descriptions.
   */
  protected override getDataSummary(): string {
    const bars = this.getFlattenedBars();
    const lines = this.getLines();
    const areas = this.getAreas();
    const bubbles = this.getBubbles();

    const parts: string[] = [];

    if (bars.length > 0) {
      const values = bars.map(b => b.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      parts.push(`${bars.length} bar${bars.length !== 1 ? 's' : ''}, values from ${this.formatValue(min)} to ${this.formatValue(max)}`);
    }

    if (areas.length > 0) {
      const totalPoints = areas.reduce((sum, area) => sum + area.points.length, 0);
      const stacking = areas.length > 1 && !this.overlapping ? 'stacked' : 'overlapping';
      parts.push(`${areas.length} ${stacking} area${areas.length !== 1 ? 's' : ''} with ${totalPoints} point${totalPoints !== 1 ? 's' : ''}`);
    }

    if (lines.length > 0) {
      const totalPoints = lines.reduce((sum, line) => sum + line.points.length, 0);
      parts.push(`${lines.length} line${lines.length !== 1 ? 's' : ''} with ${totalPoints} point${totalPoints !== 1 ? 's' : ''}`);
    }

    if (bubbles.length > 0) {
      const values = bubbles.map(b => b.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      parts.push(`${bubbles.length} bubble${bubbles.length !== 1 ? 's' : ''}, values from ${this.formatValue(min)} to ${this.formatValue(max)}`);
    }

    const scatter = this.getScatterSeries();
    if (scatter.length > 0) {
      const totalPoints = scatter.reduce((sum, s) => sum + s.points.length, 0);
      const xRange = this.getXRange();
      const xSpan = xRange ? `, x from ${this.formatValue(xRange.min)} to ${this.formatValue(xRange.max)}` : '';
      parts.push(
        `${scatter.length} scatter series with ${totalPoints} point${totalPoints !== 1 ? 's' : ''}${xSpan}`
      );
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

    // Create a formatter function for insight generation
    const formatValue = (value: number) => this.formatValue(value);

    // Generate bar insights
    if (bars.length > 0) {
      const barData: InsightBarData[] = bars.map(b => ({
        label: b.label,
        value: b.value
      }));
      // Stub for reference line - will be implemented when that feature exists
      const referenceValue = this.getReferenceLineValue();
      const barInsight = analyzeBars(barData, referenceValue, formatValue);
      if (barInsight) {
        insights.push(barInsight);
      }
    }

    // Generate line insights
    if (lines.length > 0) {
      const lineData: InsightLineData[] = lines.map(line => ({
        label: line.label,
        // Missing points are excluded: a trend analysis over NaN produces
        // "highest at undefined (NaN)" in the screen-reader description.
        points: line.points
          .filter(p => !p.missing)
          .map(p => ({ value: p.value, label: p.label }))
      }));
      const lineInsight = analyzeLines(lineData, formatValue);
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
      const bubbleInsight = analyzeBubbles(bubbleData, formatValue);
      if (bubbleInsight) {
        insights.push(bubbleInsight);
      }
    }

    // Generate scatter insights
    const scatter = this.getScatterSeries();
    if (scatter.length > 0) {
      const scatterInsight = analyzeScatter(
        scatter.map(s => ({
          label: s.label,
          points: s.points.map(p => ({ x: p.x, value: p.value }))
        })),
        formatValue
      );
      if (scatterInsight) {
        insights.push(scatterInsight);
      }
    }

    return insights.join('. ');
  }

  /**
   * The value a screen-reader description compares the bars against.
   *
   * The first `<dc-reference>` that draws a line. A chart can carry several -
   * a target and a limit, say - but the insight sentence reads "all exceed
   * target", singular, and naming which one is meant would need the sentence
   * rewritten. First-declared is at least predictable from the markup.
   *
   * A band alone is not a target: "between 80 and 120" has no single number to
   * be above or below.
   */
  private getReferenceLineValue(): number | undefined {
    const line = this.getReferences().find(r => r.hasLine);
    return line?.value;
  }

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  /**
   * Get the list of focusable elements in this chart.
   * Returns bars, line points, and bubbles that have actions (href, popup).
   */
  /**
   * Areas are not focusable, so the inherited focusable count would report an
   * area-only chart as empty. Count the data itself instead.
   */
  /** bars, lines, areas and bubbles can all appear in one <dc-chart>. */
  protected override isHorizontalChart(): boolean {
    return this.getChartOrientation() === 'horizontal';
  }

  protected override getAnimatableChartType(): AnimatableChartType {
    return 'mixed';
  }

  protected override getEmptyStateDiagnostic(): { chartType: string; expectedElements: string } {
    return { chartType: 'Chart', expectedElements: 'dc-bar, dc-line, dc-area, or dc-bubble children' };
  }

  protected override getDataElementCount(): number {
    return this.getFlattenedBars().length
      + this.getBubbles().length
      + this.getLines().reduce((sum, line) => sum + line.points.length, 0)
      + this.getAreas().reduce((sum, area) => sum + area.points.length, 0)
      + this.getScatterSeries().reduce((sum, s) => sum + s.points.length, 0);
  }

  protected override getFocusableElements(): FocusableElement[] {
    const elements: FocusableElement[] = [];
    const bars = this.getFlattenedBars();
    const lines = this.getLines();
    const bubbles = this.getBubbles();
    // Missing points contribute nothing; adding NaN would make every announced
    // percentage NaN.
    const total = bars.reduce((sum, b) => sum + b.value, 0) +
                  lines.flatMap(l => l.points)
                       .reduce((sum, p) => sum + (Number.isFinite(p.value) ? p.value : 0), 0) +
                  bubbles.reduce((sum, b) => sum + b.value, 0);

    let index = 0;

    // Add bars as focusable elements
    bars.forEach((bar) => {
      const hasAction = !!(bar.href || bar.popup || this.shouldShowAutoPopup(bar.autoPopup));
      const percent = total > 0 ? (bar.value / total) * 100 : 0;
      elements.push({
        index,
        label: `${bar.label}: ${this.formatValue(bar.value, bar.valueFormat)}`
          + `${percent > 0 ? ` (${this.formatPercent(percent / 100)})` : ''}`,
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
        // Nothing is drawn at a gap, so there is nothing to focus - and a screen
        // reader should not announce a value that does not exist.
        if (point.missing) return;

        const hasAction = !!(point.href || point.popup || this.shouldShowAutoPopup(point.autoPopup));
        elements.push({
          index,
          label: `${line.label}, ${point.label}: ${this.formatValue(point.value, point.valueFormat)}`,
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
        label: `${bubble.label}: value ${this.formatValue(bubble.value, bubble.valueFormat)}`
          + `, size ${this.formatValue(bubble.sizeValue, bubble.valueFormat)}`,
        hasAction,
        href: bubble.href,
        popupTrigger: bubble.popup?.trigger as 'hover' | 'click' | undefined ||
                      (this.shouldShowAutoPopup(bubble.autoPopup) ? 'hover' : undefined)
      });
      index++;
    });

    // Add scatter markers as focusable elements
    this.getScatterSeries().forEach(series => {
      series.points.forEach(point => {
        const hasAction = !!(point.href || this.shouldShowAutoPopup(point.autoPopup, series.autoPopup));
        const name = point.label ? `${series.label}, ${point.label}` : series.label;
        elements.push({
          index,
          // Both coordinates, in the reading order of the axes.
          label: `${name}: x ${this.formatValue(point.x, point.valueFormat)}`
            + `, y ${this.formatValue(point.value, point.valueFormat)}`,
          hasAction,
          href: point.href,
          popupTrigger: this.shouldShowAutoPopup(point.autoPopup, series.autoPopup) ? 'hover' : undefined
        });
        index++;
      });
    });

    return elements;
  }


  /**
   * Get the bounds of a shape by index, accounting for different element types.
   */
  /**
   * Where a scatter marker sits, computed rather than looked up.
   *
   * Markers share one `data-shape-index` per series, the way a line's path does,
   * so the DOM cannot distinguish one point from another. Recomputing from the
   * same layout the renderer used is exact, and needs no per-point attribute.
   */
  private getScatterMarkerBounds(
    seriesIndex: number,
    pointIndex: number
  ): { x: number; y: number; width: number; height: number } | null {
    const series = this.getScatterSeries()[seriesIndex];
    const point = series?.points[pointIndex];
    if (!point) return null;

    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;
    const chartHeight = this.height - padding.top - padding.bottom;
    const x = this.getNumericX(point.x, padding, chartWidth);
    if (x === null) return null;

    const range = this.getNiceRange(this.getAxisConfig('left'));
    const totalRange = range.max - range.min || 1;
    const y = this.height - padding.bottom - ((point.value - range.min) / totalRange) * chartHeight;

    return { x: x - series.size, y: y - series.size, width: series.size * 2, height: series.size * 2 };
  }

  /** Resolve a focus index that falls past the bars, line points and bubbles. */
  private locateScatterFocus(index: number): { seriesIndex: number; pointIndex: number } | null {
    let remaining = index
      - this.getFlattenedBars().length
      - this.getLines().reduce((sum, l) => sum + l.points.filter(p => !p.missing).length, 0)
      - this.getBubbles().length;
    if (remaining < 0) return null;

    const series = this.getScatterSeries();
    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
      if (remaining < series[seriesIndex].points.length) {
        return { seriesIndex, pointIndex: remaining };
      }
      remaining -= series[seriesIndex].points.length;
    }
    return null;
  }

  protected override getShapeBounds(index: number): { x: number; y: number; width: number; height: number } | null {
    // Scatter is checked first: its markers share a per-series `data-shape-index`
    // with nothing to tell the points apart, so a DOM lookup would land on the
    // wrong one.
    const scatterFocus = this.locateScatterFocus(index);
    if (scatterFocus) {
      return this.getScatterMarkerBounds(scatterFocus.seriesIndex, scatterFocus.pointIndex);
    }

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
   * Uses showPopupAtBounds() helper for consistent popup positioning.
   */
  protected override showPopupForFocusedElement(index: number): void {
    const bars = this.getFlattenedBars();
    const lines = this.getLines();
    const bubbles = this.getBubbles();

    // Get content and bounds based on element type
    let content: string | null = null;
    const bounds = this.getShapeBounds(index);
    if (!bounds) return;

    const scatterFocus = this.locateScatterFocus(index);
    if (scatterFocus) {
      const series = this.getScatterSeries()[scatterFocus.seriesIndex];
      const content = this.getScatterPopupContent(series, series.points[scatterFocus.pointIndex]);
      if (content) this.showPopupAtBounds(content, bounds);
      return;
    }

    if (index < bars.length) {
      // It's a bar
      content = this.getBarPopupContent(bars[index], index);
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
            content = this.getPointPopupContent(line, point, lineIndex, pointIndex);
            break;
          }
          pointIndex -= line.points.length;
          lineIndex++;
        }
      } else {
        // It's a bubble
        const bubbleIndex = adjustedIndex - totalPoints;
        if (bubbleIndex < bubbles.length) {
          content = this.getBubblePopupContent(bubbles[bubbleIndex], bubbleIndex);
        }
      }
    }

    // Show popup if we have content
    if (content) {
      this.showPopupAtBounds(content, bounds);
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
