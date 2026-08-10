import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';

/**
 * Tests for `<dc-scatter>`.
 *
 * A scatter is the first thing in `<dc-chart>` whose horizontal position comes
 * from data rather than from a slot, so most of these assert on **coordinates**:
 * a point at fraction f of the x domain must sit exactly f of the way across the
 * plot. That is the whole claim, and it is checkable.
 *
 * The rest cover what a numeric x-axis changes about everything around it —
 * axis labels, the empty-state check, value-range aggregation — because each of
 * those was a separate place that only knew about bars, lines, areas and
 * bubbles, and each failed in turn while this was built.
 */

const SIZE = { width: '600', height: '400' };

const chart = (inner: string, attrs: Record<string, string> = {}) =>
  fixture<Chart>('dc-chart', { ...SIZE, ...attrs }, inner);

const series = (label: string, points: Array<[number | null, number]>, attrs = '') =>
  `<dc-scatter label="${label}" ${attrs}>` +
  points
    .map(([x, v]) => `<dc-point ${x === null ? '' : `x="${x}"`} value="${v}"></dc-point>`)
    .join('') +
  '</dc-scatter>';

/** Marker centres, in viewBox units, in document order. */
const markers = (c: Chart) =>
  [...c.shadowRoot!.querySelectorAll('g.scatter-marker')].map(g => {
    const shape = g.querySelector('circle, rect, polygon, path, text')!;
    if (shape.tagName === 'circle') {
      return { x: +shape.getAttribute('cx')!, y: +shape.getAttribute('cy')! };
    }
    if (shape.tagName === 'rect') {
      return {
        x: +shape.getAttribute('x')! + +shape.getAttribute('width')! / 2,
        y: +shape.getAttribute('y')! + +shape.getAttribute('height')! / 2
      };
    }
    return { x: NaN, y: NaN };
  });

const axisTexts = (c: Chart) =>
  [...c.shadowRoot!.querySelectorAll('text')].map(t => t.textContent!.trim()).filter(Boolean);

describe('<dc-scatter>', () => {
  describe('rendering', () => {
    it('draws one marker per point', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20], [3, 30]]));
      expect(markers(c)).toHaveLength(3);
    });

    it('draws markers for every series', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20]]) + series('B', [[3, 30]]));
      expect(markers(c)).toHaveLength(3);
    });

    it('renders nothing for a series with no points', async () => {
      const c = await chart(series('A', []) + series('B', [[1, 10], [2, 20]]));
      expect(markers(c)).toHaveLength(2);
    });

    it('skips a point with no x', async () => {
      // A point with a value but no position cannot be placed. Drawing it
      // somewhere would assert a coordinate the markup never gave.
      const c = await chart(series('A', [[1, 10], [null, 20], [3, 30]]));
      expect(markers(c)).toHaveLength(2);
    });

    it('omits a hidden series', async () => {
      const c = await chart(
        series('A', [[1, 10], [2, 20]]) + series('B', [[3, 30]], 'hidden')
      );
      expect(markers(c)).toHaveLength(2);
    });

    it('uses the series fill', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20]], 'fill="#ff0000"'));
      const fills = [...c.shadowRoot!.querySelectorAll('g.scatter-marker circle')]
        .map(e => e.getAttribute('fill'));
      expect(fills).toEqual(['#ff0000', '#ff0000']);
    });

    it("lets a point's own fill win over the series", async () => {
      const c = await chart(
        `<dc-scatter label="A" fill="#ff0000">
           <dc-point x="1" value="10" fill="#00ff00"></dc-point>
           <dc-point x="2" value="20"></dc-point>
         </dc-scatter>`
      );
      const fills = [...c.shadowRoot!.querySelectorAll('g.scatter-marker circle')]
        .map(e => e.getAttribute('fill'));
      expect(fills).toEqual(['#00ff00', '#ff0000']);
    });

    it('draws the shape named by the series', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20]], 'shape="square"'));
      expect(c.shadowRoot!.querySelectorAll('g.scatter-marker rect')).toHaveLength(2);
      expect(c.shadowRoot!.querySelectorAll('g.scatter-marker circle')).toHaveLength(0);
    });

    it('sizes markers from the series', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20]], 'size="9"'));
      const radii = [...c.shadowRoot!.querySelectorAll('g.scatter-marker circle')]
        .map(e => e.getAttribute('r'));
      expect(radii).toEqual(['9', '9']);
    });

    it('carries fill-opacity on the group, so every shape gets it', async () => {
      // On the group rather than the shape: a triangle is a <polygon> and a
      // plus is a <path>, and neither takes fill-opacity the same way.
      const c = await chart(series('A', [[1, 10], [2, 20]], 'fill-opacity="0.3" shape="triangle"'));
      const groups = [...c.shadowRoot!.querySelectorAll('g.scatter-marker')];
      expect(groups.map(g => g.getAttribute('opacity'))).toEqual(['0.3', '0.3']);
    });

    it('is fully opaque by default', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20]]));
      const g = c.shadowRoot!.querySelector('g.scatter-marker')!;
      expect(g.getAttribute('opacity')).toBe('1');
    });
  });

  describe('positions', () => {
    it('places a point at its fraction of the x domain', async () => {
      // Domain 0..100 from the axis, so 25 lands a quarter of the way across.
      const c = await chart(
        `<dc-axis position="bottom" min-value="0" max-value="100"></dc-axis>` +
          series('A', [[0, 10], [25, 10], [100, 10]])
      );
      const [left, quarter, right] = markers(c);
      const width = right.x - left.x;
      expect(quarter.x - left.x).toBeCloseTo(width * 0.25, 6);
    });

    it('places a point at its fraction of the value range', async () => {
      const c = await chart(
        `<dc-axis position="left" min-value="0" max-value="100"></dc-axis>` +
          series('A', [[1, 0], [2, 25], [3, 100]])
      );
      const [bottom, quarter, top] = markers(c);
      const height = bottom.y - top.y;
      expect(bottom.y - quarter.y).toBeCloseTo(height * 0.25, 6);
    });

    it('orders points left to right by x, not by document order', async () => {
      const c = await chart(series('A', [[30, 10], [10, 10], [20, 10]]));
      const [first, second, third] = markers(c);
      expect(second.x).toBeLessThan(third.x);
      expect(third.x).toBeLessThan(first.x);
    });

    it('spreads a single point rather than stacking it on one pixel', async () => {
      // A zero-width domain would divide by zero. The domain widens around it.
      const c = await chart(series('A', [[5, 10]]));
      const [only] = markers(c);
      expect(Number.isFinite(only.x)).toBe(true);
    });

    it('spreads points that share one x', async () => {
      const c = await chart(series('A', [[5, 10], [5, 20], [5, 30]]));
      const xs = markers(c).map(m => m.x);
      expect(xs.every(x => Number.isFinite(x))).toBe(true);
      expect(new Set(xs).size).toBe(1);
    });

    it('honours an axis min-value and max-value', async () => {
      const wide = await chart(
        `<dc-axis position="bottom" min-value="0" max-value="1000"></dc-axis>` +
          series('A', [[10, 10], [40, 10]])
      );
      const narrow = await chart(
        `<dc-axis position="bottom" min-value="0" max-value="100"></dc-axis>` +
          series('A', [[10, 10], [40, 10]])
      );
      const spread = (c: Chart) => {
        const m = markers(c);
        return m[1].x - m[0].x;
      };
      expect(spread(wide)).toBeLessThan(spread(narrow));
    });

    it('positions points across series on one shared domain', async () => {
      const c = await chart(series('A', [[0, 10]]) + series('B', [[100, 10]]));
      const [a, b] = markers(c);
      expect(b.x).toBeGreaterThan(a.x);
    });

    it('emits no NaN coordinates', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20], [3, 30]]));
      expect(c.shadowRoot!.innerHTML).not.toMatch(/NaN/);
    });
  });

  describe('the numeric x-axis', () => {
    it('draws numeric ticks instead of one label per element', async () => {
      const c = await chart(
        `<dc-axis position="bottom" min-value="0" max-value="40" value-format="number 0"></dc-axis>` +
          series('A', [[10, 10], [40, 20]])
      );
      expect(axisTexts(c)).toContain('20');
    });

    it('rounds the domain outward, so the extremes are not on the axis line', async () => {
      // Data 5..40 becomes 0..40: the leftmost marker would otherwise straddle
      // the value axis, and the tick under it would read "5" rather than "0".
      const c = await chart(series('A', [[5, 10], [40, 20]]));
      const [left] = markers(c);
      const padding = c['getChartPadding']();
      expect(left.x).toBeGreaterThan(padding.left);
      expect(c['getXRange']()).toEqual({ min: 0, max: 40 });
    });

    it('does not round past an axis min-value or max-value', async () => {
      const c = await chart(
        `<dc-axis position="bottom" min-value="3" max-value="37"></dc-axis>` +
          series('A', [[5, 10], [35, 20]])
      );
      expect(c['getXRange']()).toEqual({ min: 3, max: 37 });
    });

    it('applies range-padding to an automatic bound', async () => {
      const c = await chart(
        `<dc-axis position="bottom" range-padding="10%"></dc-axis>` +
          series('A', [[0, 10], [40, 20]])
      );
      expect(c['getXRange']()).toEqual({ min: -4, max: 44 });
    });

    it('stays a category axis when no point states an x', async () => {
      const c = await chart(
        `<dc-line label="L"><dc-point value="10" label="Jan"></dc-point><dc-point value="20" label="Feb"></dc-point></dc-line>`
      );
      expect(axisTexts(c)).toContain('Jan');
    });

    it('scales the value axis to include scatter values', async () => {
      // getMaxValue()/getMinValue() drive the range. A scatter missing from
      // them left the axis scaled to the bars alone, with every marker off the
      // top of the plot.
      const c = await chart(
        `<dc-bar value="10" label="A"></dc-bar>` + series('S', [[1, 500], [2, 600]])
      );
      const texts = axisTexts(c).map(t => parseFloat(t)).filter(n => Number.isFinite(n));
      expect(Math.max(...texts)).toBeGreaterThanOrEqual(600);
    });
  });

  describe('empty state', () => {
    it('is not empty when it holds only scatter points', async () => {
      // renderChart() returned early for a chart with no bars, lines, areas or
      // bubbles, so a scatter-only chart drew an empty <svg>.
      const c = await chart(series('A', [[1, 10], [2, 20]]));
      expect(markers(c).length).toBeGreaterThan(0);
      expect(c.shadowRoot!.innerHTML).not.toMatch(/skeleton/);
    });

    it('is empty when the only series is hidden', async () => {
      const c = await chart(series('A', [[1, 10]], 'hidden'));
      expect(markers(c)).toHaveLength(0);
    });
  });

  describe('legend', () => {
    it('lists one entry per series', async () => {
      const c = await chart(series('A', [[1, 10]]) + series('B', [[2, 20]]));
      expect(c['getLegendItems']().map((i: any) => i.label)).toEqual(['A', 'B']);
    });

    it('uses a circle swatch', async () => {
      const c = await chart(series('A', [[1, 10]]));
      expect(c['getLegendItems']()[0].shape).toBe('circle');
    });

    it('is dimensionless, so no aggregate value is invented', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20]]));
      expect(c['getLegendItems']()[0].dimensionless).toBe(true);
      expect(c['getLegendItems']()[0].value).toBeUndefined();
    });
  });

  describe('accessibility', () => {
    it('calls itself a scatter plot', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20]]));
      expect(c['getChartTypeName']()).toBe('scatter plot');
    });

    it('names both kinds in a combo chart', async () => {
      const c = await chart(`<dc-bar value="10" label="A"></dc-bar>` + series('S', [[1, 10]]));
      expect(c['getChartTypeName']()).toBe('bar and scatter chart');
    });

    it('summarises series count, point count and x span', async () => {
      const c = await chart(series('A', [[10, 1], [40, 2]]), { 'value-format': 'number 0' });
      expect(c['getDataSummary']()).toMatch(/1 scatter series with 2 points, x from 10 to 40/);
    });

    it('describes the correlation rather than naming points', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20], [3, 30], [4, 40]]));
      expect(c['getInsights']()).toMatch(/strong positive correlation/);
    });

    it('exposes one focusable per point', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20]]) + series('B', [[3, 30]]));
      expect(c['getFocusableElements']()).toHaveLength(3);
    });

    it('announces both coordinates', async () => {
      const c = await chart(series('A', [[10, 20]]), { 'value-format': 'number 0' });
      expect(c['getFocusableElements']()[0].label).toBe('A: x 10, y 20');
    });

    it('gives focus bounds that match the drawn marker', async () => {
      // Markers share one data-shape-index per series, so the bounds are
      // recomputed from the layout rather than looked up in the DOM. This
      // asserts the two agree.
      const c = await chart(series('A', [[1, 10], [2, 20]], 'size="6"'));
      const drawn = markers(c);
      const bounds = c['getShapeBounds'](1)!;
      expect(bounds.x + bounds.width / 2).toBeCloseTo(drawn[1].x, 6);
      expect(bounds.y + bounds.height / 2).toBeCloseTo(drawn[1].y, 6);
      expect(bounds.width).toBe(12);
    });

    it('offsets scatter focus past bars and line points', async () => {
      const c = await chart(
        `<dc-bar value="10" label="A"></dc-bar>` +
          `<dc-line label="L"><dc-point value="5" label="A"></dc-point></dc-line>` +
          series('S', [[1, 10]])
      );
      const focusables = c['getFocusableElements']();
      expect(focusables).toHaveLength(3);
      expect(focusables[2].label).toMatch(/^S: x/);
    });
  });

  describe('interaction', () => {
    it('emits dc-click from the authored point', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20]]));
      const seen: any[] = [];
      c.addEventListener('dc-click', (e: any) => seen.push(e.detail));

      const shape = c.shadowRoot!.querySelector('g.scatter-marker circle')!;
      shape.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(seen).toHaveLength(1);
      expect(seen[0].value).toBe(10);
      expect(seen[0].element?.tagName.toLowerCase()).toBe('dc-point');
    });

    it('leaves the percentages on other elements alone', async () => {
      // A scatter has no share of a whole, so it must not enter the percentage
      // denominator - which is exactly what getAllValues() feeds.
      const bars = `<dc-bar value="30" label="A"></dc-bar><dc-bar value="70" label="B"></dc-bar>`;
      const opts = { 'show-percent': 'true', 'show-value': 'false' };
      const alone = await chart(bars, opts);
      const withScatter = await chart(bars + series('S', [[1, 900], [2, 950]]), opts);
      const percents = (c: Chart) => axisTexts(c).filter(t => t.endsWith('%'));
      expect(percents(withScatter)).toEqual(percents(alone));
      expect(percents(alone).length).toBeGreaterThan(0);
    });

    it('reports no percent, because a scatter point has no share of a whole', async () => {
      const c = await chart(series('A', [[1, 10], [2, 20]]));
      const seen: any[] = [];
      c.addEventListener('dc-click', (e: any) => seen.push(e.detail));
      c.shadowRoot!.querySelector('g.scatter-marker circle')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(seen[0].percent).toBeNull();
    });

    it('shows both coordinates in an auto popup', async () => {
      const c = await chart(series('A', [[10, 20]], 'auto-popup'), { 'value-format': 'number 0' });
      c.shadowRoot!.querySelector('g.scatter-marker circle')!
        .dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await elementUpdated(c);
      const content = (c as any).popupContent as string;
      expect(content).toContain('x: 10');
      expect(content).toContain('y: 20');
    });

    it('wraps a point with an href in a link', async () => {
      const c = await chart(
        `<dc-scatter label="A"><dc-point x="1" value="10" href="/a"></dc-point></dc-scatter>`
      );
      const link = c.shadowRoot!.querySelector('a[href="/a"]');
      expect(link?.querySelector('g.scatter-marker')).toBeTruthy();
    });
  });

  describe('reactivity', () => {
    it('redraws when a point is added', async () => {
      const c = await chart(series('A', [[1, 10]]));
      const point = document.createElement('dc-point');
      point.setAttribute('x', '2');
      point.setAttribute('value', '20');
      c.querySelector('dc-scatter')!.appendChild(point);
      await elementUpdated(c);
      expect(markers(c)).toHaveLength(2);
    });

    it("redraws when a point's x changes", async () => {
      // A fixed domain, because an auto domain follows its own minimum: moving
      // the leftmost point leaves it leftmost, still against the axis.
      const c = await chart(
        `<dc-axis position="bottom" min-value="0" max-value="10"></dc-axis>` +
          series('A', [[1, 10], [9, 20]])
      );
      const before = markers(c)[0].x;
      c.querySelector('dc-point')!.setAttribute('x', '5');
      await elementUpdated(c);
      expect(markers(c)[0].x).not.toBeCloseTo(before, 3);
    });
  });
});
