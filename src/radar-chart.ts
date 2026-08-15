import { svg, SVGTemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseChart, showConditionConverter, type FocusableElement, type ShowCondition } from './base-chart.js';
import type { LegendItem } from './chart-legend.js';
import { calculateNiceTicks, popupHtml } from './chart-utils.js';
import { resolveDasharray } from './chart-fill.js';
import { ErrorCode } from './errors.js';
import type { AnimatableChartType } from './animation.js';
import type { ChartRadarAxis } from './chart-radar-axis.js';
import type { ChartRadarSeries } from './chart-radar-series.js';
import type { ChartPoint } from './chart-point.js';
import type { ChartGrid } from './chart-grid.js';

/**
 * Radar (spider) chart — several dimensions plotted on radiating scaled axes.
 *
 * This is the library's third structural seam. `<dc-chart>` has scales on a
 * cartesian grid; `<dc-pie-chart>`, `<dc-funnel-chart>` and `<dc-stage-chart>`
 * are proportional and have no domain at all. A radar has a real radial
 * *domain* — a min, a max, ticks and rings — in a polar coordinate system, and
 * nothing else here did.
 *
 * Note what that means and does not. "Polar" is not the novelty: a pie is
 * already polar, angle and radius. What a pie lacks is a domain — it normalises
 * to a total, so there is nothing to tick and nothing to label.
 *
 * @element dc-radar-chart
 *
 * @attr {number} min-value - Default domain minimum for every axis (default: 0)
 * @attr {number} max-value - Default domain maximum; inferred from the data if omitted
 * @attr {number} rings - Concentric grid rings (default: 5)
 * @attr {string} grid-shape - "polygon" (default) or "circle"
 * @attr {number} start-angle - Degrees for the first axis (default: -90, straight up)
 * @attr {boolean} counter-clockwise - Lay subsequent axes out anticlockwise
 *
 * @example
 * <dc-radar-chart width="500" height="500" max-value="100">
 *   <dc-radar-axis label="Speed"></dc-radar-axis>
 *   <dc-radar-axis label="Power"></dc-radar-axis>
 *   <dc-radar-axis label="Range"></dc-radar-axis>
 *   <dc-radar-series label="Model A" fill="#2563eb">
 *     <dc-point value="80" label="Speed"></dc-point>
 *     <dc-point value="60" label="Power"></dc-point>
 *     <dc-point value="90" label="Range"></dc-point>
 *   </dc-radar-series>
 * </dc-radar-chart>
 */

/** A resolved spoke: its label, its domain, and where it points. */
interface RadarAxisData {
  label: string;
  min: number;
  max: number;
  valueFormat?: string;
  /** Radians, measured from the positive x axis as SVG does. */
  angle: number;
}

/** One vertex of a series polygon. */
interface RadarVertex {
  axisIndex: number;
  value: number;
  /** True when this series has no value for the axis. */
  missing: boolean;
  x: number;
  y: number;
  label: string;
  element?: ChartPoint;
  href?: string;
  target?: string;
  popup?: { content: string; trigger: string };
  autoPopup?: boolean;
  valueFormat?: string;
}

interface RadarSeriesData {
  label: string;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  missing: 'gap' | 'skip' | 'zero';
  showValue: ShowCondition;
  vertices: RadarVertex[];
  element: ChartRadarSeries;
  passthroughAttrs?: Record<string, string>;
  paint?: Record<string, string>;
}

interface RadarLayout {
  centerX: number;
  centerY: number;
  radius: number;
  axes: RadarAxisData[];
  series: RadarSeriesData[];
}

@customElement('dc-radar-chart')
export class RadarChart extends BaseChart {
  /** Default domain minimum for every axis. */
  @property({ type: Number, attribute: 'min-value' })
  minValue = 0;

  /** Default domain maximum. Inferred from the data when omitted. */
  @property({ type: Number, attribute: 'max-value' })
  maxValue?: number;

  /** Concentric grid rings. */
  @property({ type: Number })
  rings = 5;

  /** Whether rings follow the axes as polygons, or are drawn as circles. */
  @property({ type: String, attribute: 'grid-shape' })
  gridShape: 'polygon' | 'circle' = 'polygon';

  /** Degrees for the first axis. -90 puts it straight up, as readers expect. */
  @property({ type: Number, attribute: 'start-angle' })
  startAngle = -90;

  /** Lay subsequent axes out anticlockwise instead of clockwise. */
  @property({ type: Boolean, attribute: 'counter-clockwise' })
  counterClockwise = false;

  /**
   * Values are hidden by default, as on a pie chart.
   *
   * A radar's message is the *shape* — how one silhouette sits inside another.
   * Five axes and two series is ten numbers competing with it, and they are a
   * hover away. Set `show-value` when the figures matter more than the profile.
   */
  @property({ attribute: 'show-value', converter: showConditionConverter })
  override showValue: ShowCondition = false;

  private cachedLayout: RadarLayout | null = null;

  // ==========================================================================
  // Data extraction
  // ==========================================================================

  /** The declared `<dc-radar-axis>` children, excluding hidden ones. */
  private getAxisElements(): ChartRadarAxis[] {
    return Array.from(this.querySelectorAll(':scope > dc-radar-axis'))
      .filter(el => !el.hasAttribute('hidden')) as ChartRadarAxis[];
  }

  private getSeriesElements(): ChartRadarSeries[] {
    return Array.from(this.querySelectorAll(':scope > dc-radar-series'))
      .filter(el => !el.hasAttribute('hidden')) as ChartRadarSeries[];
  }

  /**
   * Axis names in the order they will be drawn.
   *
   * Declared `<dc-radar-axis>` elements win. When there are none they are
   * inferred from the union of point labels in document order, so the simple
   * case needs no axis elements at all; declare them when you need a specific
   * order, a per-axis domain, or an axis no series has data for yet.
   */
  private getAxisNames(): string[] {
    const declared = this.getAxisElements().map(a => a.label).filter(Boolean);
    if (declared.length > 0) return declared;

    const seen: string[] = [];
    for (const series of this.getSeriesElements()) {
      for (const point of Array.from(series.querySelectorAll(':scope > dc-point')) as ChartPoint[]) {
        if (point.label && !seen.includes(point.label)) seen.push(point.label);
      }
    }
    return seen;
  }

  /**
   * Resolve each axis's domain and angle.
   *
   * The domain falls back through three levels: the axis's own min/max, the
   * chart's, then the data. `calculateNiceTicks` supplies the rounding, which
   * is the one piece of the scale machinery that was already free of the
   * cartesian grid - `AxisChart.getNiceRange()` is not, since it expresses zero
   * as a fraction from the top of a rectangle.
   */
  private getAxes(): RadarAxisData[] {
    return this.cachePerRender('radarAxes', () => {
      const names = this.getAxisNames();
      const declared = new Map(this.getAxisElements().map(a => [a.label, a]));
      const step = (this.counterClockwise ? -360 : 360) / (names.length || 1);

      return names.map((label, i) => {
        const el = declared.get(label);
        const min = el?.minValue ?? this.minValue;

        let max = el?.maxValue ?? this.maxValue;
        if (max === undefined) {
          const values = this.valuesForAxis(label);
          const dataMax = values.length > 0 ? Math.max(...values) : 0;
          // Round out to a tick so the outer ring is a readable number.
          const ticks = calculateNiceTicks(min, dataMax > min ? dataMax : min + 1, this.rings);
          max = ticks.length > 0 ? ticks[ticks.length - 1] : min + 1;
        }

        return {
          label,
          min,
          // A zero-width domain puts every vertex in the same place; widen it
          // rather than divide by zero.
          max: max > min ? max : min + 1,
          valueFormat: el?.valueFormat,
          angle: ((this.startAngle + i * step) * Math.PI) / 180
        };
      });
    });
  }

  /** Every finite value any series places on the named axis. */
  private valuesForAxis(label: string): number[] {
    const out: number[] = [];
    for (const series of this.getSeriesElements()) {
      for (const point of Array.from(series.querySelectorAll(':scope > dc-point')) as ChartPoint[]) {
        if (point.label === label && Number.isFinite(point.value)) out.push(point.value);
      }
    }
    return out;
  }

  /** Fraction of the radius a value occupies on an axis, clamped to [0, 1]. */
  private radiusFraction(value: number, axis: RadarAxisData): number {
    const fraction = (value - axis.min) / (axis.max - axis.min);
    return Math.max(0, Math.min(1, fraction));
  }

  // ==========================================================================
  // Layout
  // ==========================================================================

  private calculateLayout(): RadarLayout | null {
    const axes = this.getAxes();
    const seriesElements = this.getSeriesElements();
    if (axes.length === 0 || seriesElements.length === 0) return null;

    if (axes.length < 3) {
      this.logError(ErrorCode.RADAR_TOO_FEW_AXES, { count: axes.length });
    }

    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;
    const chartHeight = this.height - padding.top - padding.bottom;
    const centerX = padding.left + chartWidth / 2;
    const centerY = padding.top + chartHeight / 2;
    // Leave room for the axis labels sitting outside the outer ring.
    const radius = Math.max(0, Math.min(chartWidth, chartHeight) / 2 - this.fontSize(14));

    const elements = seriesElements.map(s => ({
      fill: s.fill || undefined,
      label: s.label,
      value: undefined as number | undefined,
      pattern: s.pattern,
      patternStroke: s.patternStroke,
      patternFill: s.patternFill,
      patternScale: s.patternScale
    }));
    const resolved = this.resolveFillsWithPatterns(elements);

    const series: RadarSeriesData[] = seriesElements.map((el, i) => {
      const points = Array.from(el.querySelectorAll(':scope > dc-point')) as ChartPoint[];
      const byLabel = new Map<string, ChartPoint>();
      for (const p of points) {
        if (p.label) byLabel.set(p.label, p);
        else continue;
      }

      // A point naming an axis that does not exist is data the chart cannot
      // show. Dropping it silently is how a reader comes to see four of five
      // measurements and not know it.
      const axisNames = new Set(axes.map(a => a.label));
      const orphans = points.filter(p => p.label && !axisNames.has(p.label)).map(p => p.label);
      if (orphans.length > 0) {
        this.logError(ErrorCode.RADAR_POINT_NO_AXIS, {
          count: orphans.length,
          labels: orphans.join(', '),
          series: el.label || `series ${i + 1}`
        });
      }

      const missing = el.missing ?? 'gap';
      const vertices: RadarVertex[] = axes.map((axis, axisIndex) => {
        const point = byLabel.get(axis.label);
        const raw = point?.value;
        const absent = point === undefined || !Number.isFinite(raw as number);
        const value = absent ? (missing === 'zero' ? axis.min : NaN) : (raw as number);

        const fraction = absent && missing !== 'zero' ? 0 : this.radiusFraction(value, axis);
        const r = fraction * radius;
        const popupEl = point?.querySelector('dc-popup') as
          | (Element & { content: string; trigger: string })
          | null;

        return {
          axisIndex,
          value,
          missing: absent && missing !== 'zero',
          x: centerX + r * Math.cos(axis.angle),
          y: centerY + r * Math.sin(axis.angle),
          label: axis.label,
          element: point,
          href: point?.href || undefined,
          target: point?.target || undefined,
          popup: popupEl ? { content: popupEl.content, trigger: popupEl.trigger } : undefined,
          autoPopup: point?.autoPopup,
          valueFormat: point?.valueFormat ?? axis.valueFormat
        };
      });

      const effectiveStroke = this.getEffectiveStroke(resolved[i].originalFill, 2);

      return {
        label: el.label,
        fill: resolved[i].fill,
        fillOpacity: el.fillOpacity ?? 0.25,
        stroke: el.stroke || effectiveStroke.color || resolved[i].originalFill,
        strokeWidth: el.strokeWidth ?? 2,
        strokeDasharray: resolveDasharray(el.strokeDasharray),
        missing,
        showValue: (el.hasAttribute('show-value') ? el.showValue : this.showValue) ?? false,
        vertices,
        element: el,
        passthroughAttrs: el.getPassthroughAttributes(
          new Set(['label', 'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'missing'])
        ),
        paint: this.getPalettePaint(el)
      };
    });

    return { centerX, centerY, radius, axes, series };
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================

  /** A point on the outer ring, at `fraction` of the radius along `axis`. */
  private pointAt(layout: RadarLayout, axis: RadarAxisData, fraction: number) {
    const r = layout.radius * fraction;
    return {
      x: layout.centerX + r * Math.cos(axis.angle),
      y: layout.centerY + r * Math.sin(axis.angle)
    };
  }

  private getGridElement(): ChartGrid | null {
    return this.querySelector(':scope > dc-grid') as ChartGrid | null;
  }

  private renderRings(layout: RadarLayout): SVGTemplateResult {
    const grid = this.getGridElement();
    if (grid?.hidden) return svg``;

    const stroke = grid?.stroke ?? '#ddd';
    const dash = grid?.getStrokeDasharray() ?? '';
    const count = Math.max(1, Math.round(this.rings));

    return svg`
      ${Array.from({ length: count }, (_, i) => {
        const fraction = (i + 1) / count;
        if (this.gridShape === 'circle') {
          return svg`
            <circle
              part="grid-line"
              cx="${layout.centerX}" cy="${layout.centerY}"
              r="${layout.radius * fraction}"
              fill="none" stroke="${stroke}" stroke-width="1"
              stroke-dasharray="${dash}"
            />`;
        }
        const points = layout.axes
          .map(axis => {
            const p = this.pointAt(layout, axis, fraction);
            return `${p.x},${p.y}`;
          })
          .join(' ');
        return svg`
          <polygon
            part="grid-line"
            points="${points}"
            fill="none" stroke="${stroke}" stroke-width="1"
            stroke-dasharray="${dash}"
          />`;
      })}
    `;
  }

  private renderSpokes(layout: RadarLayout): SVGTemplateResult {
    const grid = this.getGridElement();
    const stroke = grid?.stroke ?? '#ddd';

    return svg`
      ${layout.axes.map(axis => {
        const outer = this.pointAt(layout, axis, 1);
        return svg`
          <line
            part="axis-line"
            x1="${layout.centerX}" y1="${layout.centerY}"
            x2="${outer.x}" y2="${outer.y}"
            stroke="${stroke}" stroke-width="1"
          />`;
      })}
    `;
  }

  /**
   * Polygon outlines for one series, split at gaps.
   *
   * `gap` breaks the ring into open runs; `skip` and `zero` both produce a
   * single closed shape, differing only in whether the absent vertex sits on
   * the neighbour's chord or at the centre.
   */
  private seriesPaths(series: RadarSeriesData): string[] {
    const usable = series.vertices.filter(v => !v.missing);
    if (usable.length === 0) return [];

    if (series.missing !== 'gap') {
      return [`M ${usable.map(v => `${v.x} ${v.y}`).join(' L ')} Z`];
    }

    // Walk the ring from the first gap so a run is never split across the seam.
    const n = series.vertices.length;
    const start = series.vertices.findIndex(v => v.missing);
    if (start === -1) {
      return [`M ${usable.map(v => `${v.x} ${v.y}`).join(' L ')} Z`];
    }

    const runs: RadarVertex[][] = [];
    let run: RadarVertex[] = [];
    for (let step = 1; step <= n; step++) {
      const v = series.vertices[(start + step) % n];
      if (v.missing) {
        if (run.length > 0) runs.push(run);
        run = [];
      } else {
        run.push(v);
      }
    }
    if (run.length > 0) runs.push(run);

    return runs
      .filter(r => r.length > 1)
      .map(r => `M ${r.map(v => `${v.x} ${v.y}`).join(' L ')}`);
  }

  private renderSeries(layout: RadarLayout): SVGTemplateResult {
    return svg`
      ${layout.series.map((series, seriesIndex) => {
        const paths = this.seriesPaths(series);
        const closed = series.missing !== 'gap' || !series.vertices.some(v => v.missing);

        return svg`
          <g part="radar-series">
            ${paths.map(
              d => svg`
                <path
                  class="radar-shape"
                  data-shape-index="${seriesIndex}"
                  d="${d}"
                  fill="${closed ? series.fill : 'none'}"
                  fill-opacity="${closed ? series.fillOpacity : 0}"
                  stroke="${series.stroke}"
                  stroke-width="${series.strokeWidth}"
                  stroke-dasharray="${series.strokeDasharray ?? ''}"
                  stroke-linejoin="round"
                />`
            )}
            ${series.vertices
              .filter(v => !v.missing)
              .map(
                v => svg`
                  <circle
                    part="radar-point"
                    cx="${v.x}" cy="${v.y}" r="${this.fontSize(3)}"
                    fill="${series.stroke}"
                    @mouseenter="${(e: MouseEvent) => this.handleVertexEnter(e, seriesIndex, v)}"
                    @mouseleave="${() => this.handleVertexLeave(seriesIndex, v)}"
                    @click="${(e: MouseEvent) => this.handleVertexClick(e, seriesIndex, v)}"
                    style="cursor: ${v.href || v.popup ? 'pointer' : 'default'}"
                  />`
              )}
            ${series.vertices
              .filter(
                v => !v.missing && this.evaluateShowCondition(series.showValue, v.value, 0)
              )
              .map(v => {
                // Nudged outward along the spoke so the number clears the
                // polygon edge rather than sitting on it.
                const axis = layout.axes[v.axisIndex];
                const out = this.fontSize(10);
                return svg`
                  <text
                    part="label"
                    x="${v.x + Math.cos(axis.angle) * out}"
                    y="${v.y + Math.sin(axis.angle) * out}"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    font-size="${this.fontSize(11)}"
                    fill="${series.stroke}"
                  >${this.formatValue(v.value, v.valueFormat)}</text>`;
              })}
          </g>`;
      })}
    `;
  }

  private renderAxisLabels(layout: RadarLayout): SVGTemplateResult {
    const gap = this.fontSize(12);

    return svg`
      ${layout.axes.map(axis => {
        const outer = this.pointAt(layout, axis, 1);
        const dx = Math.cos(axis.angle);
        const dy = Math.sin(axis.angle);
        // Anchor away from the centre so a label never overlaps its spoke.
        const anchor = Math.abs(dx) < 0.1 ? 'middle' : dx > 0 ? 'start' : 'end';

        return svg`
          <text
            part="axis-label"
            x="${outer.x + dx * gap}"
            y="${outer.y + dy * gap}"
            text-anchor="${anchor}"
            dominant-baseline="middle"
            font-size="${this.fontSize(12)}"
            fill="#666"
          >${axis.label}</text>`;
      })}
    `;
  }

  protected renderChart(): SVGTemplateResult {
    const layout = this.calculateLayout();
    this.cachedLayout = layout;
    if (!layout) return svg``;

    return svg`
      ${this.renderDefs()}
      ${this.renderRings(layout)}
      ${this.renderSeries(layout)}
      ${this.renderSpokes(layout)}
      ${this.renderAxisLabels(layout)}
      ${this.renderLegend(this.getLegendItems())}
    `;
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (this.cachedLayout) this.applyPassthroughAttributes(this.cachedLayout.series);
  }

  // ==========================================================================
  // Interaction
  // ==========================================================================

  private vertexDetail(seriesIndex: number, v: RadarVertex) {
    const series = this.cachedLayout?.series[seriesIndex];
    return {
      chart: this,
      element: v.element ?? series?.element,
      index: seriesIndex,
      label: `${series?.label ?? ''} — ${v.label}`.trim(),
      value: v.value,
      percent: null
    };
  }

  private handleVertexEnter(e: MouseEvent, seriesIndex: number, v: RadarVertex): void {
    this.emitInteraction('dc-mouseenter', this.vertexDetail(seriesIndex, v), e);

    if (v.popup?.trigger === 'hover') {
      this.showPopup(v.popup.content, e.clientX, e.clientY);
    } else if (!v.popup && this.shouldShowAutoPopup(v.autoPopup)) {
      this.showPopup(this.vertexPopupContent(seriesIndex, v), e.clientX, e.clientY);
    }
  }

  private handleVertexLeave(seriesIndex: number, v: RadarVertex): void {
    this.emitInteraction('dc-mouseleave', this.vertexDetail(seriesIndex, v));
    this.hidePopup();
  }

  private handleVertexClick(e: MouseEvent, seriesIndex: number, v: RadarVertex): void {
    if (!this.emitInteraction('dc-click', this.vertexDetail(seriesIndex, v), e)) return;
    if (v.href) this.navigateToHref(v.href);
  }

  private vertexPopupContent(seriesIndex: number, v: RadarVertex): string {
    const series = this.cachedLayout?.series[seriesIndex];
    const name = series?.label ? `<strong>${series.label}</strong><br>` : '';
    return popupHtml`${name}${v.label}: ${this.formatValue(v.value, v.valueFormat)}`;
  }

  // ==========================================================================
  // BaseChart hooks
  // ==========================================================================

  protected getAnimatableChartType(): AnimatableChartType {
    return 'radar';
  }

  protected override getChartTypeName(): string {
    return 'radar chart';
  }

  protected override getEmptyStateDiagnostic(): { chartType: string; expectedElements: string } {
    return { chartType: 'Radar chart', expectedElements: 'dc-radar-series children' };
  }

  protected override getDataElementCount(): number {
    return this.getSeriesElements().length;
  }

  /**
   * Legend items, built from the series elements directly.
   *
   * **Must not call `calculateLayout()`.** The legend is sized during
   * `getChartPadding()`, and the layout needs the padding — so going through
   * the layout here recurses until the stack gives out. `<dc-pie-chart>` has
   * the same note for the same reason.
   *
   * Colours are resolved independently, which is safe because the resolver
   * depends on the elements and the palette, not on any geometry.
   */
  protected override getLegendItems(): LegendItem[] {
    const seriesElements = this.getSeriesElements();
    if (seriesElements.length === 0) return [];

    const colors = this.resolveFillColorsWithPalette(
      seriesElements.map(el => ({ fill: el.fill || undefined, label: el.label }))
    );

    return seriesElements.map((el, i) => ({
      label: el.label,
      color: el.stroke || colors[i],
      shape: 'square' as const,
      dimensionless: true as const
    }));
  }

  protected override getFocusableElements(): FocusableElement[] {
    const layout = this.cachedLayout ?? this.calculateLayout();
    if (!layout) return [];

    return layout.series.map((s, index) => ({
      index,
      label: `${s.label}: ${s.vertices
        .filter(v => !v.missing)
        .map(v => `${v.label} ${this.formatValue(v.value, v.valueFormat)}`)
        .join(', ')}`,
      hasAction: s.vertices.some(v => !!v.href || !!v.popup),
      href: undefined
    }));
  }

  protected override getShapeBounds(
    index: number
  ): { x: number; y: number; width: number; height: number } | null {
    const series = this.cachedLayout?.series[index];
    if (!series) return null;

    const usable = series.vertices.filter(v => !v.missing);
    if (usable.length === 0) return null;

    const xs = usable.map(v => v.x);
    const ys = usable.map(v => v.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  }

  protected override getDataSummary(): string {
    const layout = this.cachedLayout ?? this.calculateLayout();
    if (!layout) return '';
    return `${layout.series.length} series across ${layout.axes.length} axes: ` +
      layout.axes.map(a => a.label).join(', ');
  }

  protected override getInsights(): string {
    const layout = this.cachedLayout ?? this.calculateLayout();
    if (!layout || layout.series.length === 0) return '';

    // Strongest dimension per series, normalised so axes with different domains
    // stay comparable - the raw numbers are not.
    const parts = layout.series.map(s => {
      const scored = s.vertices
        .filter(v => !v.missing)
        .map(v => ({ v, score: this.radiusFraction(v.value, layout.axes[v.axisIndex]) }));
      if (scored.length === 0) return `${s.label} has no data`;

      const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
      return `${s.label} is strongest on ${best.v.label} at ${this.formatValue(best.v.value, best.v.valueFormat)}`;
    });

    return parts.join('. ') + '.';
  }

  protected override getShadowParts(): Record<string, string> {
    return {
      ...super.getShadowParts(),
      'path.radar-shape': 'radar-shape'
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-radar-chart': RadarChart;
  }
}
