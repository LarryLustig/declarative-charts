import { describe, it, expect } from 'vitest';
import { fixture } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import { Chart } from '../../src/chart';

/**
 * `text-scaling` controls whether font sizes are viewBox units (scaling with the
 * chart) or CSS pixels (constant on screen). See REVIEW.md 4.1.
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
