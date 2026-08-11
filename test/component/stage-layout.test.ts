import { describe, it, expect } from 'vitest';
import { fixture } from './setup';
import '../../src/stage-chart';
import '../../src/chart-stage';
import { StageChart } from '../../src/stage-chart';

/**
 * Characterization tests for stage-chart geometry.
 *
 * Written before extracting the layout, and on the worst-covered file in the
 * repo (70% statements / 61% branch): `calculateStageLayout()` is 352 lines that
 * interleave data extraction, colour resolution, zero handling and geometry, and
 * almost none of it was exercised. See docs/review.md 5.3.
 *
 * These pin the geometry as observable output - the position and size of every
 * rendered shape - rather than the internals, so the extraction is free to move
 * code around as long as charts still draw identically.
 */

type Shape = { x: number; y: number; w: number; h: number };

const chartWith = (attrs: Record<string, string>, inner: string) =>
  fixture<StageChart>('dc-stage-chart', { width: '600', height: '400', ...attrs }, inner);

/** Bounding box of each rendered stage, whatever element it was drawn as. */
function shapes(chart: StageChart): Shape[] {
  const nodes = Array.from(chart.shadowRoot!.querySelectorAll('[data-shape-index]'));
  return nodes.map(n => {
    const num = (a: string) => parseFloat(n.getAttribute(a) || '0');
    const tag = n.tagName.toLowerCase();
    if (tag === 'rect') {
      return { x: num('x'), y: num('y'), w: num('width'), h: num('height') };
    }
    if (tag === 'ellipse' || tag === 'circle') {
      const rx = tag === 'circle' ? num('r') : num('rx');
      const ry = tag === 'circle' ? num('r') : num('ry');
      return { x: num('cx') - rx, y: num('cy') - ry, w: rx * 2, h: ry * 2 };
    }
    // Non-rect shapes (ellipse, polygon, path) expose their extent differently;
    // derive a box from the path data so every shape type is comparable.
    const d = n.getAttribute('d') || n.getAttribute('points') || '';
    const nums = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(m => parseFloat(m[0]));
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    if (!xs.length || !ys.length) return { x: 0, y: 0, w: 0, h: 0 };
    return {
      x: Math.min(...xs), y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys)
    };
  });
}

const threeStages = `
  <dc-stage value="100" label="Leads"></dc-stage>
  <dc-stage value="60" label="Qualified"></dc-stage>
  <dc-stage value="20" label="Won"></dc-stage>`;

describe('stage geometry: vertical (default)', () => {
  it('renders one shape per stage', async () => {
    expect(shapes(await chartWith({}, threeStages))).toHaveLength(3);
  });

  it('stacks stages down the chart in document order', async () => {
    const s = shapes(await chartWith({}, threeStages));
    expect(s[0].y).toBeLessThan(s[1].y);
    expect(s[1].y).toBeLessThan(s[2].y);
  });

  it('leaves a gap between consecutive stages', async () => {
    const s = shapes(await chartWith({}, threeStages));
    const gap1 = s[1].y - (s[0].y + s[0].h);
    const gap2 = s[2].y - (s[1].y + s[1].h);
    expect(gap1).toBeGreaterThan(0);
    expect(gap1).toBeCloseTo(gap2, 1);
  });

  it('honours an explicit gap', async () => {
    const tight = shapes(await chartWith({ gap: '2' }, threeStages));
    const loose = shapes(await chartWith({ gap: '40' }, threeStages));
    const gapOf = (s: Shape[]) => s[1].y - (s[0].y + s[0].h);
    expect(gapOf(loose)).toBeGreaterThan(gapOf(tight));
  });

  it('keeps every stage inside the chart', async () => {
    const s = shapes(await chartWith({}, threeStages));
    for (const sh of s) {
      expect(sh.x).toBeGreaterThanOrEqual(0);
      expect(sh.y).toBeGreaterThanOrEqual(0);
      expect(sh.x + sh.w).toBeLessThanOrEqual(600 + 0.5);
      expect(sh.y + sh.h).toBeLessThanOrEqual(400 + 0.5);
    }
  });

  it('gives every stage a positive size', async () => {
    for (const sh of shapes(await chartWith({}, threeStages))) {
      expect(sh.w).toBeGreaterThan(0);
      expect(sh.h).toBeGreaterThan(0);
    }
  });
});

describe('stage geometry: horizontal', () => {
  it('lays stages across the chart in document order', async () => {
    const s = shapes(await chartWith({ orientation: 'horizontal' }, threeStages));
    expect(s).toHaveLength(3);
    expect(s[0].x).toBeLessThan(s[1].x);
    expect(s[1].x).toBeLessThan(s[2].x);
  });

  it('leaves a gap along the flow axis', async () => {
    const s = shapes(await chartWith({ orientation: 'horizontal' }, threeStages));
    expect(s[1].x - (s[0].x + s[0].w)).toBeGreaterThan(0);
  });

  it('stays inside the chart', async () => {
    for (const sh of shapes(await chartWith({ orientation: 'horizontal' }, threeStages))) {
      expect(sh.x + sh.w).toBeLessThanOrEqual(600 + 0.5);
      expect(sh.y + sh.h).toBeLessThanOrEqual(400 + 0.5);
    }
  });
});

describe('value-proportional sizing', () => {
  it('sizes stages by value when asked', async () => {
    const s = shapes(await chartWith({ 'stage-size': 'value' }, threeStages));
    // 100 > 60 > 20, so the shapes should shrink in the same order.
    expect(s[0].h).toBeGreaterThan(s[2].h);
  });

  // Stage charts size by AREA, so a min-size of 30 yields a rendered dimension
  // of about 30/sqrt(2). Asserted as "bigger than without the minimum" rather
  // than as an absolute, because the area relationship is the actual contract.
  it('respects a minimum size so a small value stays visible', async () => {
    const inner = `
      <dc-stage value="1000" label="Huge"></dc-stage>
      <dc-stage value="1" label="Tiny"></dc-stage>`;
    const without = shapes(await chartWith({ 'stage-size': 'value' }, inner));
    const withMin = shapes(await chartWith({ 'stage-size': 'value', 'stage-min-size': '30' }, inner));
    expect(withMin[1].h).toBeGreaterThan(without[1].h);
    expect(withMin[1].h).toBeGreaterThan(0);
  });

  it('gives equal stages equal size', async () => {
    const s = shapes(await chartWith({ 'stage-size': 'value' }, `
      <dc-stage value="50" label="A"></dc-stage>
      <dc-stage value="50" label="B"></dc-stage>`));
    expect(s[0].h).toBeCloseTo(s[1].h, 1);
  });
});

describe('shapes', () => {
  for (const shape of ['rectangle', 'square', 'oval', 'circle'] as const) {
    it(`renders and positions ${shape} stages`, async () => {
      const s = shapes(await chartWith({ shape }, threeStages));
      expect(s).toHaveLength(3);
      expect(s.every(x => x.w > 0 && x.h > 0)).toBe(true);
      expect(s[0].y).toBeLessThan(s[2].y);
    });
  }

  it('lets a stage override the chart shape', async () => {
    const chart = await chartWith({ shape: 'rectangle' }, `
      <dc-stage value="100" label="A"></dc-stage>
      <dc-stage value="60" label="B" shape="oval"></dc-stage>`);
    expect(shapes(chart)).toHaveLength(2);
  });

  // An unrecognised shape name used to produce NaN geometry throughout - no
  // fallback, no warning, just an unrenderable chart.
  it('falls back to a usable shape for an unrecognised name', async () => {
    const chart = await chartWith({ shape: 'chevron' }, threeStages);
    expect(chart.shadowRoot!.innerHTML).not.toMatch(/NaN/);
    const s = shapes(chart);
    expect(s).toHaveLength(3);
    expect(s.every(x => x.w > 0 && x.h > 0)).toBe(true);
  });
});

describe('edge cases', () => {
  it('handles a single stage', async () => {
    const s = shapes(await chartWith({}, '<dc-stage value="100" label="Only"></dc-stage>'));
    expect(s).toHaveLength(1);
    expect(s[0].h).toBeGreaterThan(0);
  });

  it('handles many stages without collapsing any', async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      `<dc-stage value="${100 - i * 5}" label="S${i}"></dc-stage>`).join('');
    const s = shapes(await chartWith({}, many));
    expect(s).toHaveLength(12);
    expect(Math.min(...s.map(x => x.h))).toBeGreaterThan(0);
  });

  it('handles zero values', async () => {
    const s = shapes(await chartWith({ 'stage-size': 'value' }, `
      <dc-stage value="100" label="A"></dc-stage>
      <dc-stage value="0" label="Zero"></dc-stage>
      <dc-stage value="50" label="C"></dc-stage>`));
    expect(s).toHaveLength(3);
    expect(s.every(x => Number.isFinite(x.x) && Number.isFinite(x.y))).toBe(true);
  });

  // Every other data element honours `hidden`; <dc-stage> did not.
  it('skips hidden stages', async () => {
    const s = shapes(await chartWith({}, `
      <dc-stage value="100" label="A"></dc-stage>
      <dc-stage value="60" label="B" hidden></dc-stage>
      <dc-stage value="20" label="C"></dc-stage>`));
    expect(s).toHaveLength(2);
  });

  it('emits no NaN geometry in any configuration', async () => {
    for (const attrs of [{}, { orientation: 'horizontal' }, { 'stage-size': 'value' },
                         { shape: 'circle' }, { shape: 'nonsense' }, { gap: '0' }]) {
      const chart = await chartWith(attrs, threeStages);
      expect(chart.shadowRoot!.innerHTML, JSON.stringify(attrs)).not.toMatch(/NaN/);
    }
  });
});

describe('layout is deterministic', () => {
  it('produces identical geometry across renders', async () => {
    const chart = await chartWith({}, threeStages);
    const before = shapes(chart);
    chart.requestUpdate();
    await chart.updateComplete;
    expect(shapes(chart)).toEqual(before);
  });

  it('produces identical geometry for two identical charts', async () => {
    const a = await chartWith({ 'stage-size': 'value' }, threeStages);
    const b = await chartWith({ 'stage-size': 'value' }, threeStages);
    expect(shapes(a)).toEqual(shapes(b));
  });

  it('reflows when the chart is resized', async () => {
    const small = shapes(await chartWith({ height: '300' }, threeStages));
    const large = shapes(await chartWith({ height: '600' }, threeStages));
    expect(large[2].y).toBeGreaterThan(small[2].y);
  });
});
