import { describe, it, expect } from 'vitest';
import { fixture } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-bar-group';
import { Chart } from '../../src/chart';

/**
 * Bar width shrinks as bar count rises, because each unit carries a fixed gutter.
 * Before the fix, past ~84 bars on a 900-unit chart the computed width crossed zero;
 * a negative `width` is invalid SVG, so the browser discarded every <rect> and the
 * chart rendered nothing at all, with no warning. See REVIEW.md §3.5.
 */
describe('bar layout: width never degenerates', () => {
  const barsMarkup = (n: number) =>
    Array.from({ length: n }, (_, i) => `<dc-bar value="${50 + (i % 7) * 5}" label="P${i}"></dc-bar>`).join('');

  const widthsFor = async (n: number, attrs: Record<string, string> = {}) => {
    const chart = await fixture<Chart>(
      'dc-chart',
      { width: '900', height: '400', 'show-value': 'false', ...attrs },
      barsMarkup(n)
    );
    const rects = Array.from(
      chart.shadowRoot!.querySelectorAll('rect[data-shape-index]')
    ) as SVGRectElement[];
    return rects.map(r => parseFloat(r.getAttribute('width') || 'NaN'));
  };

  // 85 is the first count that produced a negative width on a 900-unit chart.
  for (const n of [10, 50, 80, 85, 100, 200]) {
    it(`renders ${n} bars with positive, finite widths`, async () => {
      const widths = await widthsFor(n);

      expect(widths).toHaveLength(n);
      expect(widths.every(w => Number.isFinite(w))).toBe(true);
      expect(Math.min(...widths)).toBeGreaterThan(0);
    });
  }

  it('holds for horizontal orientation too', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      { width: '900', height: '400', 'show-value': 'false', orientation: 'horizontal' },
      barsMarkup(150)
    );
    const heights = Array.from(chart.shadowRoot!.querySelectorAll('rect[data-shape-index]'))
      .map(r => parseFloat(r.getAttribute('height') || 'NaN'));

    expect(heights).toHaveLength(150);
    expect(heights.every(h => Number.isFinite(h))).toBe(true);
    expect(Math.min(...heights)).toBeGreaterThan(0);
  });

  it('compresses gutters rather than shrinking bars to nothing', async () => {
    const roomy = await widthsFor(20);
    const crowded = await widthsFor(200);

    // Bars still get narrower as count rises...
    expect(Math.min(...crowded)).toBeLessThan(Math.min(...roomy));
    // ...but never collapse: the gutter budget absorbs the pressure first.
    expect(Math.min(...crowded)).toBeGreaterThanOrEqual(1);
  });

  it('keeps total laid-out width within the chart', async () => {
    const widths = await widthsFor(200);
    const total = widths.reduce((a, b) => a + b, 0);

    // 200 bars at the 1-unit floor is 200 units — must still fit a 900-unit chart.
    expect(total).toBeLessThanOrEqual(900);
  });
});

/**
 * Bars and their category labels used to be positioned by four separate copies
 * of the same traversal, and the copies had drifted: the label ones never gained
 * the branch that honours an explicit per-bar `width`. A group of bars with
 * differing widths therefore drew its labels from the group average - measured
 * at 15 units of drift, every label off its bar. Group labels were positioned by
 * two further copies that ignored gutters entirely.
 *
 * All six now derive from `computeBarLayout()`, so this class of bug is
 * impossible rather than merely fixed. See REVIEW.md 3.2.
 */
describe('bar and label positions come from one traversal', () => {
  const groupedWithDifferingWidths = `
    <dc-bar-group label="Q1">
      <dc-bar value="30" bar-width="20" label="A"></dc-bar>
      <dc-bar value="50" bar-width="80" label="B"></dc-bar>
    </dc-bar-group>
    <dc-bar-group label="Q2">
      <dc-bar value="40" bar-width="20" label="C"></dc-bar>
      <dc-bar value="60" bar-width="80" label="D"></dc-bar>
    </dc-bar-group>`;

  const chartOf = (markup: string, attrs: Record<string, string> = {}) =>
    fixture<Chart>('dc-chart',
      { width: '600', height: '400', 'show-value': 'false', ...attrs }, markup);

  /** Bar centres and category-label positions along the category axis. */
  const positions = (chart: Chart, vertical: boolean) => {
    const root = chart.shadowRoot!;
    const bars = Array.from(root.querySelectorAll('rect[part="bar"]'));
    const labels = Array.from(root.querySelectorAll('text[part="label"]'));
    return {
      barCentres: bars.map(b => vertical
        ? parseFloat(b.getAttribute('x')!) + parseFloat(b.getAttribute('width')!) / 2
        : parseFloat(b.getAttribute('y')!) + parseFloat(b.getAttribute('height')!) / 2),
      labelPositions: labels.map(l => vertical
        ? parseFloat(l.getAttribute('x')!)
        : parseFloat(l.getAttribute('y')!) - 4),
      barEdges: bars.map(b => vertical
        ? [parseFloat(b.getAttribute('x')!), parseFloat(b.getAttribute('x')!) + parseFloat(b.getAttribute('width')!)]
        : [parseFloat(b.getAttribute('y')!), parseFloat(b.getAttribute('y')!) + parseFloat(b.getAttribute('height')!)]),
    };
  };

  for (const [name, attrs, vertical] of [
    ['vertical', {}, true],
    ['horizontal', { orientation: 'horizontal' }, false],
  ] as const) {
    it(`aligns every category label with its bar (${name}, differing widths)`, async () => {
      const chart = await chartOf(groupedWithDifferingWidths, attrs);
      const { barCentres, labelPositions } = positions(chart, vertical);

      expect(barCentres).toHaveLength(4);
      barCentres.forEach((centre, i) => {
        expect(labelPositions[i]).toBeCloseTo(centre, 1);
      });
    });

    it(`centres each group label over its own group (${name})`, async () => {
      const chart = await chartOf(groupedWithDifferingWidths, attrs);
      const { barCentres, labelPositions, barEdges } = positions(chart, vertical);

      // Group labels follow the per-bar labels in document order.
      const groupLabels = labelPositions.slice(barCentres.length);
      expect(groupLabels).toHaveLength(2);

      for (let g = 0; g < 2; g++) {
        const first = barEdges[g * 2][0];
        const last = barEdges[g * 2 + 1][1];
        expect(groupLabels[g]).toBeCloseTo((first + last) / 2, 1);
      }
    });
  }

  it('still aligns plain bars with no explicit width', async () => {
    const chart = await chartOf(`
      <dc-bar value="30" label="A"></dc-bar>
      <dc-bar value="50" label="B"></dc-bar>
      <dc-bar value="20" label="C"></dc-bar>`);
    const { barCentres, labelPositions } = positions(chart, true);

    expect(barCentres).toHaveLength(3);
    barCentres.forEach((centre, i) => expect(labelPositions[i]).toBeCloseTo(centre, 1));
  });

  it('aligns when only some groups use explicit widths', async () => {
    const chart = await chartOf(`
      <dc-bar-group label="Q1">
        <dc-bar value="30" bar-width="20" label="A"></dc-bar>
        <dc-bar value="50" bar-width="80" label="B"></dc-bar>
      </dc-bar-group>
      <dc-bar-group label="Q2">
        <dc-bar value="40" label="C"></dc-bar>
        <dc-bar value="60" label="D"></dc-bar>
      </dc-bar-group>
      <dc-bar value="25" label="E"></dc-bar>`);
    const { barCentres, labelPositions } = positions(chart, true);

    expect(barCentres).toHaveLength(5);
    barCentres.forEach((centre, i) => expect(labelPositions[i]).toBeCloseTo(centre, 1));
  });
});

describe('bar-width (REVIEW.md 6.4)', () => {
  /** Widths of the rendered bars, in document order. */
  const widths = (chart: Chart): number[] =>
    Array.from(chart.shadowRoot!.querySelectorAll('rect[data-shape-index]'))
      .map(r => parseFloat(r.getAttribute('width') || '0'));

  it('sizes a single bar with bar-width', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="50" label="A" bar-width="80"></dc-bar>
      <dc-bar value="50" label="B"></dc-bar>
    `);
    expect(widths(chart)[0]).toBeCloseTo(80, 1);
  });

  // <dc-bar> used to spell this `width`, a homonym of <dc-chart width> and
  // inconsistent with <dc-bar-group bar-width>, which already used this name.
  //
  // The old name must stay *listed* as known even though it does nothing:
  // unrecognised attributes are passed through onto the SVG shape, so a
  // leftover width="80" would otherwise land on the <rect> and override the
  // computed geometry - failing silently and worse than being ignored.
  it('ignores the old width attribute instead of leaking it onto the rect', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="50" label="A" width="80"></dc-bar>
      <dc-bar value="50" label="B"></dc-bar>
    `);
    const [a, b] = widths(chart);
    expect(a).not.toBeCloseTo(80, 1);
    expect(a).toBeCloseTo(b, 1);
  });

  it('warns that width was renamed rather than ignoring it silently', async () => {
    const chart = await fixture<Chart>('dc-chart',
      { width: '600', height: '400', logging: 'warning' },
      '<dc-bar value="50" label="A" width="80"></dc-bar>');
    const logged = JSON.stringify((chart as any).logEntries ?? []);
    expect(logged).toContain('DC104');
    expect(logged).toContain('bar-width');
  });
});
