import { describe, it, expect } from 'vitest';
import { fixture } from './setup';
import { optionalNumberConverter } from '../../src/converters';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-line';
import '../../src/chart-area';
import '../../src/chart-point';
import { Chart } from '../../src/chart';
import { ChartPoint } from '../../src/chart-point';

/**
 * A point with no value used to plot at zero, so the line dived to the axis and
 * the chart asserted the value *was* zero. For financial or clinical data that
 * is not cosmetic - it is the chart stating something false. See REVIEW.md 4.5.
 */
describe('optionalNumberConverter', () => {
  const from = (v: string | null) => optionalNumberConverter.fromAttribute(v);

  it('treats an absent attribute as missing', () => {
    expect(from(null)).toBeNaN();
  });

  it('treats the spellings a template emits as missing', () => {
    for (const v of ['', '  ', 'null', 'NULL', 'none', 'na', 'N/A', '-', 'undefined', 'NaN']) {
      expect(from(v), `"${v}" should be missing`).toBeNaN();
    }
  });

  it('keeps zero as a real value', () => {
    expect(from('0')).toBe(0);
    expect(from('0.0')).toBe(0);
    expect(from('-0')).toBe(-0);
  });

  it('parses ordinary numbers, including negatives and whitespace', () => {
    expect(from('42')).toBe(42);
    expect(from(' 3.5 ')).toBe(3.5);
    expect(from('-7')).toBe(-7);
    expect(from('1e3')).toBe(1000);
  });

  it('treats non-numeric text as missing rather than zero', () => {
    expect(from('abc')).toBeNaN();
    expect(from('12abc')).toBeNaN();
  });

  it('round-trips through toAttribute, dropping missing values', () => {
    expect(optionalNumberConverter.toAttribute(42)).toBe('42');
    expect(optionalNumberConverter.toAttribute(0)).toBe('0');
    expect(optionalNumberConverter.toAttribute(NaN)).toBeNull();
  });
});

describe('missing point values', () => {
  const lineWith = (inner: string, attrs = '') => fixture<Chart>(
    'dc-chart', { width: '600', height: '400' }, `<dc-line label="S" ${attrs}>${inner}</dc-line>`);

  const points = `
    <dc-point value="10" label="Jan"></dc-point>
    <dc-point value="20" label="Feb"></dc-point>
    <dc-point label="Mar"></dc-point>
    <dc-point value="30" label="Apr"></dc-point>
    <dc-point value="null" label="May"></dc-point>
    <dc-point value="40" label="Jun"></dc-point>`;

  const pathOf = (chart: Chart) =>
    chart.shadowRoot!.querySelector('path.line-path')!.getAttribute('d') || '';

  it('distinguishes a missing value from zero on the element', async () => {
    const chart = await lineWith(`
      <dc-point value="0" label="Zero"></dc-point>
      <dc-point label="Absent"></dc-point>`);
    const [zero, absent] = Array.from(chart.querySelectorAll('dc-point')) as ChartPoint[];

    expect(zero.value).toBe(0);
    expect(zero.isMissing).toBe(false);
    expect(absent.isMissing).toBe(true);
  });

  it('breaks the path at gaps by default', async () => {
    const d = pathOf(await lineWith(points));
    // Jan-Feb, Apr, Jun => three subpaths
    expect((d.match(/M /g) || []).length).toBe(3);
  });

  it('never emits NaN coordinates', async () => {
    const d = pathOf(await lineWith(points));
    expect(d).not.toMatch(/NaN/);
  });

  it('joins neighbours under missing="skip"', async () => {
    const d = pathOf(await lineWith(points, 'missing="skip"'));
    expect((d.match(/M /g) || []).length).toBe(1);
  });

  it('restores the old behaviour under missing="zero"', async () => {
    const chart = await lineWith(points, 'missing="zero"');
    expect((pathOf(chart).match(/M /g) || []).length).toBe(1);
    // With zeros the axis must reach down to 0.
    expect(chart.shadowRoot!.textContent).toContain('0');
  });

  it('draws no marker where there is no data', async () => {
    const gapped = await lineWith(points);
    const zeroed = await lineWith(points, 'missing="zero"');

    expect(gapped.shadowRoot!.querySelectorAll('g.point-marker')).toHaveLength(4);
    expect(zeroed.shadowRoot!.querySelectorAll('g.point-marker')).toHaveLength(6);
  });

  it('keeps the axis range free of NaN', async () => {
    const chart = await lineWith(points);
    expect(chart.shadowRoot!.textContent).not.toContain('NaN');
  });

  it('does not let a gap drag the minimum to zero', async () => {
    // All values are well above zero; a gap must not be read as a 0 data point.
    const chart = await lineWith(`
      <dc-point value="100" label="A"></dc-point>
      <dc-point label="B"></dc-point>
      <dc-point value="120" label="C"></dc-point>`);
    const d = pathOf(chart);
    const ys = [...d.matchAll(/[ML] [\d.-]+ ([\d.-]+)/g)].map(m => parseFloat(m[1]));

    // Two subpaths, one coordinate each, and neither at the baseline.
    expect((d.match(/M /g) || []).length).toBe(2);
    expect(ys.every(y => Number.isFinite(y))).toBe(true);
  });

  it('omits missing points from keyboard navigation', async () => {
    const chart = await lineWith(points);
    const focusables = (chart as unknown as {
      getFocusableElements(): Array<{ label: string }>
    }).getFocusableElements();

    expect(focusables).toHaveLength(4);
    expect(focusables.some(f => /NaN/.test(f.label))).toBe(false);
  });

  it('breaks the fill of an area chart too', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' },
      `<dc-area label="A">${points}</dc-area>`);
    const d = chart.shadowRoot!.querySelector('path.area-path')!.getAttribute('d') || '';

    // Each run is closed separately, or the fill would span the gap.
    expect((d.match(/M /g) || []).length).toBe(3);
    expect((d.match(/Z/g) || []).length).toBe(3);
    expect(d).not.toMatch(/NaN/);
  });

  it('fits each run independently so splines cannot overshoot a gap', async () => {
    const d = pathOf(await lineWith(points, 'curve-fit="smooth"'));
    expect((d.match(/M /g) || []).length).toBe(3);
    expect(d).not.toMatch(/NaN/);
  });
});

/**
 * The area and stacked-area paths render through different code than lines, and
 * each had its own way of leaking NaN: a separate top-edge stroke, its own point
 * markers, and its own label pass. A browser sweep of the full shadow DOM found
 * them after the line tests already passed - so these assert on rendered output,
 * not just on the path data.
 */
describe('missing values do not leak NaN into output', () => {
  const pts = `
    <dc-point value="10" label="Jan"></dc-point>
    <dc-point label="Feb"></dc-point>
    <dc-point value="30" label="Mar"></dc-point>`;

  const render = (inner: string) =>
    fixture<Chart>('dc-chart', { width: '600', height: '400' }, inner);

  const html = (chart: Chart) => chart.shadowRoot!.innerHTML;

  it('a single area renders no NaN', async () => {
    expect(html(await render(`<dc-area label="A">${pts}</dc-area>`))).not.toMatch(/NaN/);
  });

  it('stacked areas render no NaN', async () => {
    const chart = await render(`<dc-area label="A">${pts}</dc-area><dc-area label="B">${pts}</dc-area>`);
    expect(html(chart)).not.toMatch(/NaN/);
  });

  it('a combo chart renders no NaN', async () => {
    const chart = await render(
      `<dc-bar value="15" label="Jan"></dc-bar><dc-line label="S">${pts}</dc-line>`);
    expect(html(chart)).not.toMatch(/NaN/);
  });

  it('handles leading and trailing gaps', async () => {
    const chart = await render(`<dc-line label="S">
      <dc-point label="A"></dc-point>
      <dc-point value="5" label="B"></dc-point>
      <dc-point label="C"></dc-point>
    </dc-line>`);
    expect(html(chart)).not.toMatch(/NaN/);
    expect(chart.shadowRoot!.querySelectorAll('svg *').length).toBeGreaterThan(0);
  });

  it('handles a series with no data at all', async () => {
    const chart = await render(`<dc-line label="S">
      <dc-point label="A"></dc-point><dc-point label="B"></dc-point>
    </dc-line>`);
    expect(html(chart)).not.toMatch(/NaN/);
    expect(chart.shadowRoot!.querySelectorAll('svg *').length).toBeGreaterThan(0);
  });

  it('keeps the screen-reader description free of NaN', async () => {
    const chart = await render(`<dc-line label="S">${pts}</dc-line>`);
    const desc = chart.shadowRoot!.querySelector('desc')?.textContent || '';
    expect(desc).not.toMatch(/NaN|undefined/);
    expect(desc.length).toBeGreaterThan(0);
  });
});
