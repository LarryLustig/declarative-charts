import { describe, it, expect, afterEach } from 'vitest';
import { fixture } from './setup';
import '../../src/index';
import { RadarChart } from '../../src/radar-chart';

/**
 * Tests for `<dc-radar-chart>`.
 *
 * This chart exists to prove a structural seam, so the tests lean on the thing
 * that makes it structural: it has a **domain**. `<dc-pie-chart>` is already
 * polar — angle and radius — but it normalises to a total, so there is nothing
 * to tick and nothing to label. A radar has a real radial scale, and a
 * different one per axis if you want it.
 *
 * Geometry is asserted numerically rather than by screenshot: with the chart
 * square and the first axis pointing straight up, a value at fraction f of its
 * domain sits exactly f of the radius along its spoke, and that is checkable.
 */

const SQUARE = { width: '500', height: '500' };

const chart = (attrs: Record<string, string>, inner: string) =>
  fixture<RadarChart>('dc-radar-chart', { ...SQUARE, ...attrs }, inner);

const AXES = ['Speed', 'Power', 'Range', 'Comfort']
  .map(l => `<dc-radar-axis label="${l}"></dc-radar-axis>`)
  .join('');

const series = (label: string, values: Record<string, number | null>, attrs = '') =>
  `<dc-radar-series label="${label}" ${attrs}>` +
  Object.entries(values)
    .map(([k, v]) => `<dc-point ${v === null ? '' : `value="${v}"`} label="${k}"></dc-point>`)
    .join('') +
  '</dc-radar-series>';

/** Vertices of the first drawn polygon, as {x, y} pairs. */
const vertices = (c: RadarChart) => {
  const d = c.shadowRoot!.querySelector('path.radar-shape')?.getAttribute('d') ?? '';
  return [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => ({
    x: parseFloat(m[1]),
    y: parseFloat(m[2])
  }));
};

const centre = (c: RadarChart) => {
  const spoke = c.shadowRoot!.querySelector('line[part="axis-line"]');
  return { x: parseFloat(spoke?.getAttribute('x1') ?? '0'), y: parseFloat(spoke?.getAttribute('y1') ?? '0') };
};

/** Distance of a vertex from the centre, as a fraction of the outer radius. */
const fractionOf = (c: RadarChart, v: { x: number; y: number }) => {
  const o = centre(c);
  const spoke = c.shadowRoot!.querySelector('line[part="axis-line"]')!;
  const outer = {
    x: parseFloat(spoke.getAttribute('x2') ?? '0'),
    y: parseFloat(spoke.getAttribute('y2') ?? '0')
  };
  const radius = Math.hypot(outer.x - o.x, outer.y - o.y);
  return Math.hypot(v.x - o.x, v.y - o.y) / radius;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('structure', () => {
  it('draws a ring per level, a spoke per axis and a polygon per series', async () => {
    const c = await chart({ 'max-value': '100', rings: '4' },
      AXES + series('A', { Speed: 80, Power: 60, Range: 90, Comfort: 40 }));
    const sr = c.shadowRoot!;
    expect(sr.querySelectorAll('polygon[part="grid-line"]')).toHaveLength(4);
    expect(sr.querySelectorAll('line[part="axis-line"]')).toHaveLength(4);
    expect(sr.querySelectorAll('path.radar-shape')).toHaveLength(1);
    expect(sr.querySelectorAll('circle[part="radar-point"]')).toHaveLength(4);
  });

  it('labels every axis', async () => {
    const c = await chart({ 'max-value': '100' },
      AXES + series('A', { Speed: 80, Power: 60, Range: 90, Comfort: 40 }));
    const labels = Array.from(c.shadowRoot!.querySelectorAll('text[part="axis-label"]'))
      .map(t => t.textContent?.trim());
    expect(labels).toEqual(['Speed', 'Power', 'Range', 'Comfort']);
  });

  it('emits no NaN geometry in any configuration', async () => {
    for (const attrs of [{}, { rings: '1' }, { 'grid-shape': 'circle' },
                         { 'start-angle': '30' }, { 'counter-clockwise': '' },
                         { 'max-value': '0' }, { 'min-value': '50', 'max-value': '50' }]) {
      const c = await chart(attrs, AXES + series('A', { Speed: 80, Power: 60, Range: 90, Comfort: 40 }));
      expect(c.shadowRoot!.innerHTML, JSON.stringify(attrs)).not.toMatch(/NaN/);
    }
  });
});

describe('the radial domain', () => {
  it('places a value at its fraction of the radius', async () => {
    const c = await chart({ 'max-value': '100' },
      AXES + series('A', { Speed: 80, Power: 60, Range: 90, Comfort: 40 }));
    const [speed, power, range, comfort] = vertices(c);

    expect(fractionOf(c, speed)).toBeCloseTo(0.8, 2);
    expect(fractionOf(c, power)).toBeCloseTo(0.6, 2);
    expect(fractionOf(c, range)).toBeCloseTo(0.9, 2);
    expect(fractionOf(c, comfort)).toBeCloseTo(0.4, 2);
  });

  it('puts the first axis straight up and goes clockwise', async () => {
    const c = await chart({ 'max-value': '100' },
      AXES + series('A', { Speed: 100, Power: 100, Range: 100, Comfort: 100 }));
    const o = centre(c);
    const [up, right, down, left] = vertices(c);

    expect(up.y).toBeLessThan(o.y);
    expect(up.x).toBeCloseTo(o.x, 0);
    expect(right.x).toBeGreaterThan(o.x);
    expect(down.y).toBeGreaterThan(o.y);
    expect(left.x).toBeLessThan(o.x);
  });

  it('reverses direction when asked', async () => {
    const c = await chart({ 'max-value': '100', 'counter-clockwise': '' },
      AXES + series('A', { Speed: 100, Power: 100, Range: 100, Comfort: 100 }));
    const o = centre(c);
    // The second axis should now be to the left, not the right.
    expect(vertices(c)[1].x).toBeLessThan(o.x);
  });

  it('honours start-angle', async () => {
    const c = await chart({ 'max-value': '100', 'start-angle': '0' },
      AXES + series('A', { Speed: 100, Power: 100, Range: 100, Comfort: 100 }));
    const o = centre(c);
    // 0 degrees points right, so the first axis is no longer at the top.
    expect(vertices(c)[0].x).toBeGreaterThan(o.x);
    expect(vertices(c)[0].y).toBeCloseTo(o.y, 0);
  });

  /**
   * The attribute that makes a radar honest. Two axes with different units are
   * only comparable if each has its own domain; sharing one would draw 420 hp
   * as though it dwarfed 80 km/h.
   */
  it('gives each axis its own domain when asked', async () => {
    const c = await chart({ 'max-value': '100' }, `
      <dc-radar-axis label="Speed"></dc-radar-axis>
      <dc-radar-axis label="Power" max-value="500"></dc-radar-axis>
      <dc-radar-axis label="Range"></dc-radar-axis>
      ${series('A', { Speed: 80, Power: 400, Range: 50 })}`);
    const [speed, power] = vertices(c);

    expect(fractionOf(c, speed)).toBeCloseTo(0.8, 2);
    // 400 of 500, not 400 of 100 clamped to the rim.
    expect(fractionOf(c, power)).toBeCloseTo(0.8, 2);
  });

  it('infers a domain from the data when none is given', async () => {
    const c = await chart({}, AXES + series('A', { Speed: 80, Power: 60, Range: 90, Comfort: 40 }));
    // The largest value should reach or nearly reach the rim, and nothing
    // should overflow it.
    const fractions = vertices(c).map(v => fractionOf(c, v));
    expect(Math.max(...fractions)).toBeGreaterThan(0.5);
    expect(Math.max(...fractions)).toBeLessThanOrEqual(1.001);
  });

  it('clamps a value beyond the domain to the rim rather than overflowing', async () => {
    const c = await chart({ 'max-value': '100' },
      AXES + series('A', { Speed: 250, Power: 60, Range: 90, Comfort: 40 }));
    expect(fractionOf(c, vertices(c)[0])).toBeCloseTo(1, 2);
  });

  it('respects a non-zero minimum', async () => {
    const c = await chart({ 'min-value': '50', 'max-value': '100' },
      AXES + series('A', { Speed: 75, Power: 50, Range: 100, Comfort: 50 }));
    const [speed, power, range] = vertices(c);
    expect(fractionOf(c, speed)).toBeCloseTo(0.5, 2);
    expect(fractionOf(c, power)).toBeCloseTo(0, 2);
    expect(fractionOf(c, range)).toBeCloseTo(1, 2);
  });
});

describe('axes', () => {
  it('infers axes from point labels when none are declared', async () => {
    const c = await chart({ 'max-value': '100' }, series('A', { Speed: 80, Power: 60, Range: 90 }));
    const labels = Array.from(c.shadowRoot!.querySelectorAll('text[part="axis-label"]'))
      .map(t => t.textContent?.trim());
    expect(labels).toEqual(['Speed', 'Power', 'Range']);
  });

  it('uses the declared order, not the order the points appear in', async () => {
    const c = await chart({ 'max-value': '100' }, `
      <dc-radar-axis label="Range"></dc-radar-axis>
      <dc-radar-axis label="Speed"></dc-radar-axis>
      <dc-radar-series label="A">
        <dc-point value="80" label="Speed"></dc-point>
        <dc-point value="20" label="Range"></dc-point>
      </dc-radar-series>`);
    const labels = Array.from(c.shadowRoot!.querySelectorAll('text[part="axis-label"]'))
      .map(t => t.textContent?.trim());
    expect(labels).toEqual(['Range', 'Speed']);
    // Points bind by label, so Range's 20 is the first vertex.
    expect(fractionOf(c, vertices(c)[0])).toBeCloseTo(0.2, 2);
  });

  it('skips a hidden axis', async () => {
    const c = await chart({ 'max-value': '100' }, `
      <dc-radar-axis label="Speed"></dc-radar-axis>
      <dc-radar-axis label="Power" hidden></dc-radar-axis>
      <dc-radar-axis label="Range"></dc-radar-axis>
      ${series('A', { Speed: 80, Power: 60, Range: 90 })}`);
    expect(c.shadowRoot!.querySelectorAll('line[part="axis-line"]')).toHaveLength(2);
  });
});

describe('missing values', () => {
  const withMissing = (policy: string) =>
    chart({ 'max-value': '100' },
      AXES + series('A', { Speed: 80, Power: 60, Range: null, Comfort: 40 }, `missing="${policy}"`));

  it('breaks the polygon at a gap by default', async () => {
    const c = await withMissing('gap');
    const paths = Array.from(c.shadowRoot!.querySelectorAll('path.radar-shape'))
      .map(p => p.getAttribute('d') ?? '');
    // An open run, not a closed shape.
    expect(paths.every(d => !d.includes('Z'))).toBe(true);
    expect(c.shadowRoot!.querySelectorAll('circle[part="radar-point"]')).toHaveLength(3);
  });

  it('joins the neighbours with skip', async () => {
    const c = await withMissing('skip');
    const d = c.shadowRoot!.querySelector('path.radar-shape')?.getAttribute('d') ?? '';
    expect(d).toContain('Z');
    expect(vertices(c)).toHaveLength(3);
  });

  /**
   * `zero` pulls the vertex to the centre, which distorts the silhouette — the
   * whole message of a radar. It lies more loudly here than on a line chart,
   * which is why it is not the default.
   */
  it('pulls the vertex to the centre with zero', async () => {
    const c = await withMissing('zero');
    const missingVertex = vertices(c)[2];
    expect(fractionOf(c, missingVertex)).toBeCloseTo(0, 2);
  });
});

describe('diagnostics', () => {
  const logs = (c: RadarChart) =>
    JSON.stringify((c as unknown as { logEntries: unknown }).logEntries);

  it('warns when a point names an axis that does not exist', async () => {
    const c = await chart({ 'max-value': '100' }, `
      <dc-radar-axis label="Speed"></dc-radar-axis>
      <dc-radar-axis label="Power"></dc-radar-axis>
      <dc-radar-axis label="Range"></dc-radar-axis>
      <dc-radar-series label="A">
        <dc-point value="80" label="Speed"></dc-point>
        <dc-point value="60" label="Nonexistent"></dc-point>
      </dc-radar-series>`);
    expect(logs(c)).toContain('DC111');
    expect(logs(c)).toContain('Nonexistent');
  });

  it('warns about fewer than three axes', async () => {
    const c = await chart({ 'max-value': '100' }, `
      <dc-radar-axis label="Speed"></dc-radar-axis>
      <dc-radar-axis label="Power"></dc-radar-axis>
      ${series('A', { Speed: 80, Power: 60 })}`);
    expect(logs(c)).toContain('DC112');
  });

  it('says nothing for a well-formed chart', async () => {
    const c = await chart({ 'max-value': '100' },
      AXES + series('A', { Speed: 80, Power: 60, Range: 90, Comfort: 40 }));
    expect(logs(c)).not.toContain('DC111');
    expect(logs(c)).not.toContain('DC112');
  });

  it('shows the empty-state placeholder with no series', async () => {
    const c = await chart({}, AXES);
    expect(c.shadowRoot!.textContent).toContain('No data');
    expect(logs(c)).toContain('DC001');
  });
});

describe('multiple series', () => {
  const two = () =>
    chart({ 'max-value': '100' }, AXES +
      series('Model A', { Speed: 80, Power: 60, Range: 90, Comfort: 40 }) +
      series('Model B', { Speed: 50, Power: 90, Range: 40, Comfort: 80 }));

  it('draws one polygon each', async () => {
    expect((await two()).shadowRoot!.querySelectorAll('path.radar-shape')).toHaveLength(2);
  });

  /**
   * Translucency is a default rather than an option here: two opaque polygons
   * hide each other, and comparison is the only reason to draw a second one.
   */
  it('fills them translucently so both stay readable', async () => {
    const opacities = Array.from((await two()).shadowRoot!.querySelectorAll('path.radar-shape'))
      .map(p => parseFloat(p.getAttribute('fill-opacity') ?? '1'));
    expect(opacities.every(o => o > 0 && o < 0.6)).toBe(true);
  });

  it('gives them different colours from the palette', async () => {
    const strokes = Array.from((await two()).shadowRoot!.querySelectorAll('path.radar-shape'))
      .map(p => p.getAttribute('stroke'));
    expect(new Set(strokes).size).toBe(2);
  });

  it('builds a legend item per series', async () => {
    const items = ((await two()) as unknown as { getLegendItems(): Array<{ label: string }> })
      .getLegendItems();
    expect(items.map(i => i.label)).toEqual(['Model A', 'Model B']);
  });

  it('makes each series focusable, announcing its values', async () => {
    const focusable = ((await two()) as unknown as {
      getFocusableElements(): Array<{ label: string }>;
    }).getFocusableElements();
    expect(focusable).toHaveLength(2);
    expect(focusable[0].label).toContain('Model A');
    expect(focusable[0].label).toContain('Speed');
  });
});

describe('reused elements behave as they do elsewhere', () => {
  it('takes ring styling from <dc-grid>', async () => {
    const c = await chart({ 'max-value': '100' }, `
      <dc-grid stroke="#ff0000" stroke-dasharray="dashed"></dc-grid>
      ${AXES}${series('A', { Speed: 80, Power: 60, Range: 90, Comfort: 40 })}`);
    const ring = c.shadowRoot!.querySelector('polygon[part="grid-line"]');
    expect(ring?.getAttribute('stroke')).toBe('#ff0000');
    expect(ring?.getAttribute('stroke-dasharray')).toBe('5 5');
  });

  it('hides the rings for <dc-grid hidden>', async () => {
    const c = await chart({ 'max-value': '100' }, `
      <dc-grid hidden></dc-grid>
      ${AXES}${series('A', { Speed: 80, Power: 60, Range: 90, Comfort: 40 })}`);
    expect(c.shadowRoot!.querySelectorAll('polygon[part="grid-line"]')).toHaveLength(0);
  });

  it('draws circular rings when asked', async () => {
    const c = await chart({ 'max-value': '100', 'grid-shape': 'circle' },
      AXES + series('A', { Speed: 80, Power: 60, Range: 90, Comfort: 40 }));
    expect(c.shadowRoot!.querySelectorAll('circle[part="grid-line"]')).toHaveLength(5);
    expect(c.shadowRoot!.querySelectorAll('polygon[part="grid-line"]')).toHaveLength(0);
  });

  it('renders a <dc-title>', async () => {
    const c = await chart({ 'max-value': '100' },
      `<dc-title>Model Comparison</dc-title>${AXES}${series('A', { Speed: 80, Power: 60, Range: 90 })}`);
    expect(c.shadowRoot!.textContent).toContain('Model Comparison');
  });
});
