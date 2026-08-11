import { describe, it, expect } from 'vitest';
import { fixture } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import { Chart } from '../../src/chart';

/**
 * `text-scaling` controls whether font sizes are viewBox units (scaling with the
 * chart) or CSS pixels (constant on screen). See docs/review.md 4.1.
 *
 * happy-dom has no layout, so the rendered width is never measured and
 * `fontScale` stays 1 here. These assertions therefore cover the contract and
 * the degradation path; the actual scaling behaviour is measured in a real
 * browser, where a 300px-wide chart and a 1200px-wide one produce identical
 * on-screen text under `fixed`.
 */
describe('text-scaling', () => {
  const chartWith = (attrs: Record<string, string>) =>
    fixture<Chart>('dc-chart', { width: '600', height: '400', ...attrs }, `
      <dc-bar value="10" label="A"></dc-bar>
      <dc-bar value="30" label="B"></dc-bar>
    `);

  const fontSizes = (chart: Chart) =>
    Array.from(chart.shadowRoot!.querySelectorAll('[font-size]'))
      .map(el => parseFloat(el.getAttribute('font-size') || '0'))
      .filter(n => n > 0);

  it('defaults to proportional', async () => {
    const chart = await chartWith({});
    expect(chart.textScaling).toBe('proportional');
  });

  it('reads the attribute', async () => {
    const chart = await chartWith({ 'text-scaling': 'fixed' });
    expect(chart.textScaling).toBe('fixed');
  });

  it('emits usable font sizes in both modes', async () => {
    const proportional = fontSizes(await chartWith({}));
    const fixed = fontSizes(await chartWith({ 'text-scaling': 'fixed' }));

    expect(proportional.length).toBeGreaterThan(0);
    expect(fixed.length).toBe(proportional.length);
    // Every emitted size must be a positive finite number - a NaN or 0 here
    // would silently make text invisible.
    expect(fixed.every(n => Number.isFinite(n) && n > 0)).toBe(true);
  });

  it('falls back to unscaled text when the rendered size is unknown', async () => {
    // No layout engine, so nothing is ever measured. The chart must still draw
    // readable text rather than multiplying by 0 or NaN.
    const chart = await chartWith({ 'text-scaling': 'fixed' });
    const sizes = fontSizes(chart);

    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThan(0);
  });

  it('leaves output identical to the default when unscaled', async () => {
    // With fontScale pinned at 1, `fixed` must be byte-identical to
    // `proportional` - proving the helper is a pure pass-through at scale 1.
    const a = fontSizes(await chartWith({}));
    const b = fontSizes(await chartWith({ 'text-scaling': 'fixed' }));
    expect(b).toEqual(a);
  });

  it('survives an unrecognised value without breaking rendering', async () => {
    const chart = await chartWith({ 'text-scaling': 'nonsense' });
    const sizes = fontSizes(chart);

    expect(sizes.length).toBeGreaterThan(0);
    expect(sizes.every(n => Number.isFinite(n) && n > 0)).toBe(true);
  });
});

/**
 * `fit` controls whether the chart keeps its authored proportions or adopts the
 * container's shape. See docs/review.md 4.1(b).
 *
 * happy-dom has no layout and no ResizeObserver, so nothing is ever measured and
 * `fill` cannot reshape anything here. These cover the contract and, importantly,
 * that a chart still renders when the mode can do nothing. Real reshaping is
 * measured in Chromium: an 800x200 tile yields viewBox "0 0 600 150" with equal
 * x/y scale, i.e. filled and undistorted.
 */
describe('fit', () => {
  const chartWith = (attrs: Record<string, string>) =>
    fixture<Chart>('dc-chart', { width: '600', height: '400', ...attrs }, `
      <dc-bar value="10" label="A"></dc-bar>
      <dc-bar value="30" label="B"></dc-bar>
    `);

  it('defaults to aspect', async () => {
    expect((await chartWith({})).fit).toBe('aspect');
  });

  it('reads the attribute', async () => {
    expect((await chartWith({ fit: 'fill' })).fit).toBe('fill');
  });

  it('keeps the authored viewBox when nothing can be measured', async () => {
    const chart = await chartWith({ fit: 'fill' });
    const svg = chart.shadowRoot!.querySelector('svg')!;

    // No layout to fill, so the chart must keep its own proportions rather than
    // collapsing to a zero-height viewBox.
    expect(svg.getAttribute('viewBox')).toBe('0 0 600 400');
  });

  it('still renders its data in fill mode', async () => {
    const chart = await chartWith({ fit: 'fill' });
    expect(chart.shadowRoot!.querySelectorAll('rect[data-shape-index]')).toHaveLength(2);
  });

  it('leaves height untouched unless fill actually applies', async () => {
    const chart = await chartWith({ fit: 'fill' });
    expect(chart.height).toBe(400);
  });
});
