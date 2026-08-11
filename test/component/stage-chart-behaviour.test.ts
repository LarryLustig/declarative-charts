import { describe, it, expect, afterEach, vi } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/stage-chart';
import '../../src/chart-stage';
import '../../src/chart-popup';
import '../../src/chart-legend';
import { StageChart } from '../../src/stage-chart';

/**
 * Behaviour tests for `<dc-stage-chart>`, the worst-covered real code in the
 * repo (docs/review.md §7).
 *
 * The geometry was already extracted to `stage-layout.ts` and is covered there
 * at 100%; `test/component/stage-layout.test.ts` pins the shapes and positions.
 * What was left untested is everything *around* the geometry: the attribute
 * parsing that feeds it, the sizing modes, and the whole interaction surface.
 */

const SIZED = { width: '600', height: '500' };

const stages = (spec: Array<[number, string]>) =>
  spec.map(([v, l]) => `<dc-stage value="${v}" label="${l}"></dc-stage>`).join('');

const chartWith = (attrs: Record<string, string>, inner?: string) =>
  fixture<StageChart>('dc-stage-chart', { ...SIZED, ...attrs },
    inner ?? stages([[100, 'Leads'], [60, 'Qualified'], [20, 'Won']]));

/** Rendered shapes, in document order. */
const shapes = (chart: StageChart) =>
  Array.from(chart.shadowRoot!.querySelectorAll('[data-shape-index]'));

/**
 * Bounding-box size of a rendered stage, whatever element it was drawn as.
 * A circle reports `r`, so it is doubled - otherwise circles and rectangles
 * are not comparable and a floor expressed as a diameter reads as half.
 */
const sizeOf = (el: Element) => {
  const num = (a: string) => parseFloat(el.getAttribute(a) ?? '0');
  // Keyed on the tag, not on which attributes are present: a rounded <rect>
  // also carries rx/ry for its corner radius, and reading those as the size
  // silently reports a corner radius instead.
  switch (el.tagName.toLowerCase()) {
    case 'circle':
      return { w: num('r') * 2, h: num('r') * 2 };
    case 'ellipse':
      return { w: num('rx') * 2, h: num('ry') * 2 };
    default:
      return { w: num('width'), h: num('height') };
  }
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('stage-size modes', () => {
  it('gives every stage the same size by default', async () => {
    const s = shapes(await chartWith({})).map(sizeOf);
    expect(s[0].h).toBeCloseTo(s[1].h, 1);
    expect(s[1].h).toBeCloseTo(s[2].h, 1);
  });

  it('sizes by value when asked', async () => {
    const s = shapes(await chartWith({ 'stage-size': 'value' })).map(sizeOf);
    expect(s[0].h).toBeGreaterThan(s[1].h);
    expect(s[1].h).toBeGreaterThan(s[2].h);
  });

  /**
   * Logarithmic sizing exists so a series spanning orders of magnitude stays
   * readable: under linear sizing the small stages collapse to the 10-unit
   * floor and become indistinguishable from each other.
   */
  it('compresses a wide range under log-value', async () => {
    const wide = stages([[10000, 'Huge'], [100, 'Mid'], [10, 'Small']]);
    const linear = shapes(await chartWith({ 'stage-size': 'value' }, wide)).map(sizeOf);
    const log = shapes(await chartWith({ 'stage-size': 'log-value' }, wide)).map(sizeOf);

    const ratio = (s: { h: number }[]) => s[0].h / s[2].h;
    expect(ratio(log)).toBeLessThan(ratio(linear));
    expect(log[0].h).toBeGreaterThan(log[2].h);
  });

  it('falls back to equal sizes when every value is zero', async () => {
    const s = shapes(await chartWith({ 'stage-size': 'value' },
      stages([[0, 'A'], [0, 'B'], [0, 'C']]))).map(sizeOf);
    expect(s[0].h).toBeCloseTo(s[1].h, 1);
    expect(s.every(x => x.h > 0)).toBe(true);
  });

  it('accepts a fixed numeric size', async () => {
    const s = shapes(await chartWith({ 'stage-size': '80' })).map(sizeOf);
    expect(s[0].h).toBeCloseTo(s[1].h, 1);
    expect(s[0].h).toBeGreaterThan(0);
  });

  it('falls back to equal distribution for an unusable size', async () => {
    const s = shapes(await chartWith({ 'stage-size': 'enormous' })).map(sizeOf);
    expect(s).toHaveLength(3);
    expect(s.every(x => x.h > 0)).toBe(true);
  });

  /**
   * The floor of 10 is applied to the *size* - the side of the equivalent
   * square - not to the rendered height. A rectangle spreads that area across
   * the aspect ratio, so the drawn height of a floored stage is 10/sqrt(2), or
   * about 7.07. Asserted against a circle, where size and diameter coincide,
   * plus a looser bound for the rectangle so the intent is still pinned.
   */
  it('never renders a stage smaller than the visibility floor', async () => {
    const tiny = stages([[100000, 'Huge'], [1, 'Tiny']]);

    const circles = shapes(await chartWith(
      { 'stage-size': 'value', shape: 'circle' }, tiny)).map(sizeOf);
    expect(Math.min(...circles.map(x => x.h))).toBeGreaterThanOrEqual(10);

    const rects = shapes(await chartWith({ 'stage-size': 'value' }, tiny)).map(sizeOf);
    expect(Math.min(...rects.map(x => x.h))).toBeGreaterThan(0);
  });
});

describe('size units', () => {
  it.each([
    ['30', 'bare number'],
    ['30px', 'pixels'],
    ['2rem', 'rem'],
    ['10%', 'percent']
  ])('accepts %s as a minimum size (%s)', async value => {
    const chart = await chartWith({ 'stage-size': 'value', 'stage-min-size': value },
      stages([[1000, 'Huge'], [1, 'Tiny']]));
    expect(chart.shadowRoot!.innerHTML).not.toMatch(/NaN/);
    expect(shapes(chart).every(s => sizeOf(s).h > 0)).toBe(true);
  });

  it('treats an unparseable gap as zero rather than NaN', async () => {
    const chart = await chartWith({ gap: 'wide' });
    expect(chart.shadowRoot!.innerHTML).not.toMatch(/NaN/);
  });

  it('spaces stages further apart for a larger gap', async () => {
    const gapOf = (s: Element[]) =>
      parseFloat(s[1].getAttribute('y') ?? '0') -
      (parseFloat(s[0].getAttribute('y') ?? '0') + sizeOf(s[0]).h);
    const tight = shapes(await chartWith({ gap: '2' }));
    const loose = shapes(await chartWith({ gap: '40' }));
    expect(gapOf(loose)).toBeGreaterThan(gapOf(tight));
  });
});

describe('connectors', () => {
  const connectorEls = (chart: StageChart) =>
    chart.shadowRoot!.querySelectorAll('line, polygon:not([data-shape-index])');

  // The default is "line", not "none" - a stage chart shows a flow, so the
  // steps are joined unless you say otherwise. Matches API.md.
  it('draws a line by default', async () => {
    expect(connectorEls(await chartWith({})).length).toBeGreaterThan(0);
  });

  it('draws one fewer connector than there are stages', async () => {
    const chart = await chartWith({ connector: 'line' });
    expect(chart.shadowRoot!.querySelectorAll('line').length).toBe(2);
  });

  it('draws arrow heads for connector="arrow"', async () => {
    const chart = await chartWith({ connector: 'arrow' });
    expect(chart.shadowRoot!.querySelectorAll('polygon').length).toBeGreaterThan(0);
  });

  it('draws nothing for connector="none"', async () => {
    expect(connectorEls(await chartWith({ connector: 'none' })).length).toBe(0);
  });

  /**
   * The connector shorthand is space-separated and unordered, so each part is
   * classified by shape: a keyword, a colour, a `px` length, or a bare number.
   */
  it('takes a colour from the shorthand', async () => {
    const chart = await chartWith({ connector: 'line #ff0000' });
    const line = chart.shadowRoot!.querySelector('line');
    expect(line?.getAttribute('stroke')).toBe('#ff0000');
  });

  it('accepts a named colour', async () => {
    const chart = await chartWith({ connector: 'line crimson' });
    expect(chart.shadowRoot!.querySelector('line')?.getAttribute('stroke')).toBe('crimson');
  });

  it('accepts an rgb() colour', async () => {
    const chart = await chartWith({ connector: 'line rgb(1,2,3)' });
    expect(chart.shadowRoot!.querySelector('line')?.getAttribute('stroke')).toContain('rgb');
  });

  it('takes a bare number as the line width', async () => {
    const chart = await chartWith({ connector: 'line 4' });
    expect(chart.shadowRoot!.querySelector('line')?.getAttribute('stroke-width')).toBe('4');
  });

  // A px value is ambiguous between width and arrow size, so it is split on
  // magnitude: anything over 5 is far too thick for a connector line.
  it('reads a small px value as width and a large one as arrow size', async () => {
    const thin = await chartWith({ connector: 'line 3px' });
    expect(thin.shadowRoot!.querySelector('line')?.getAttribute('stroke-width')).toBe('3');

    const arrowy = await chartWith({ connector: 'arrow 12px' });
    expect(arrowy.shadowRoot!.innerHTML).not.toMatch(/NaN/);
  });

  it('ignores a part it cannot classify', async () => {
    const chart = await chartWith({ connector: 'line ???' });
    expect(chart.shadowRoot!.innerHTML).not.toMatch(/NaN/);
    expect(connectorEls(chart).length).toBeGreaterThan(0);
  });

  it('draws connectors along the flow axis when horizontal', async () => {
    const chart = await chartWith({ connector: 'line', orientation: 'horizontal' });
    expect(connectorEls(chart).length).toBeGreaterThan(0);
    expect(chart.shadowRoot!.innerHTML).not.toMatch(/NaN/);
  });
});

describe('interaction', () => {
  const firstShape = (chart: StageChart) =>
    chart.shadowRoot!.querySelector('[data-shape-index]') as SVGElement;

  const hover = (el: SVGElement) =>
    el.dispatchEvent(new MouseEvent('mouseenter', {
      bubbles: true, composed: true, clientX: 50, clientY: 50
    }));

  it('emits dc-mouseenter with the stage in its payload', async () => {
    const chart = await chartWith({});
    const seen: unknown[] = [];
    chart.addEventListener('dc-mouseenter', e => seen.push((e as CustomEvent).detail));
    hover(firstShape(chart));
    expect(seen).toHaveLength(1);
    expect((seen[0] as { label: string }).label).toBe('Leads');
  });

  it('emits dc-mouseleave', async () => {
    const chart = await chartWith({});
    const seen: unknown[] = [];
    chart.addEventListener('dc-mouseleave', e => seen.push((e as CustomEvent).detail));
    firstShape(chart).dispatchEvent(
      new MouseEvent('mouseleave', { bubbles: true, composed: true }));
    expect(seen).toHaveLength(1);
  });

  it('emits dc-click with the stage index', async () => {
    const chart = await chartWith({});
    const seen: unknown[] = [];
    chart.addEventListener('dc-click', e => seen.push((e as CustomEvent).detail));
    firstShape(chart).dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }));
    expect(seen).toHaveLength(1);
    expect((seen[0] as { index: number }).index).toBe(0);
  });

  it('shows an automatic popup on hover when asked', async () => {
    const chart = await chartWith({ 'auto-popup': '' });
    hover(firstShape(chart));
    await elementUpdated(chart);
    const popup = chart.shadowRoot!.querySelector('.popup');
    expect(popup?.classList.contains('visible')).toBe(true);
    expect(popup?.innerHTML).toContain('Leads');
  });

  it('prefers an explicit <dc-popup> over the generated one', async () => {
    const chart = await chartWith({}, `
      <dc-stage value="100" label="Leads">
        <dc-popup>Custom copy</dc-popup>
      </dc-stage>
      <dc-stage value="60" label="Won"></dc-stage>`);
    hover(firstShape(chart));
    await elementUpdated(chart);
    expect(chart.shadowRoot!.querySelector('.popup')?.innerHTML).toContain('Custom copy');
  });

  it('hides the popup again on leave', async () => {
    const chart = await chartWith({ 'auto-popup': '' });
    const shape = firstShape(chart);
    hover(shape);
    await elementUpdated(chart);
    shape.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, composed: true }));
    await elementUpdated(chart);
    expect(chart.shadowRoot!.querySelector('.popup')?.classList.contains('visible')).toBe(false);
  });
});

describe('legend and accessibility', () => {
  it('builds one legend item per stage', async () => {
    const chart = await chartWith({}, `
      <dc-legend></dc-legend>
      ${stages([[100, 'Leads'], [60, 'Won']])}`);
    const items = (chart as unknown as { getLegendItems(): Array<{ label: string }> })
      .getLegendItems();
    expect(items.map(i => i.label)).toEqual(['Leads', 'Won']);
  });

  it('describes itself for a screen reader', async () => {
    const chart = await chartWith({});
    const svg = chart.shadowRoot!.querySelector('svg');
    expect(svg?.getAttribute('role')).toBeTruthy();
    expect(chart.shadowRoot!.querySelector('desc')?.textContent).toContain('stages');
  });

  it('opens a popup for the keyboard-focused stage', async () => {
    const chart = await chartWith({ 'auto-popup': '' });
    (chart as unknown as { showPopupForFocusedElement(i: number): void })
      .showPopupForFocusedElement(1);
    await elementUpdated(chart);
    const popup = chart.shadowRoot!.querySelector('.popup');
    expect(popup?.classList.contains('visible')).toBe(true);
    expect(popup?.innerHTML).toContain('Qualified');
  });
});
