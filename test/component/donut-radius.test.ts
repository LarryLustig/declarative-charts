import { describe, it, expect } from 'vitest';
import { fixture } from './setup';
import '../../src/pie-chart';
import '../../src/chart-pie-slice';
import { PieChart } from '../../src/pie-chart';

/**
 * Regression tests for `inner-radius` on `<dc-pie-chart>`.
 *
 * The library's own `examples/animations.html` shipped
 * `<dc-pie-chart inner-radius="50%">`, which rendered a chart whose every
 * coordinate was NaN — `M 250 44 A 144.25 … L NaN NaN A NaN NaN 0 0 0 NaN NaN Z`.
 *
 * Two defects met to produce it. `Number("50%")` is NaN, and the validation
 * guarding this attribute tested `< 0` and `>= 100` — both of which are *false*
 * for NaN, so an unparseable value passed every check in silence. `DC103` exists
 * precisely for a bad radius and never fired.
 *
 * The negative branch was separately dishonest: it logged "Using 0 (solid pie)"
 * while `innerRadiusPixels` had already been computed from the negative value
 * and was never corrected, so the promised fallback did not happen.
 */

const slices = `
  <dc-pie-slice value="40" label="Development"></dc-pie-slice>
  <dc-pie-slice value="25" label="Marketing"></dc-pie-slice>
  <dc-pie-slice value="20" label="Support"></dc-pie-slice>`;

const chartWith = (attrs: Record<string, string>) =>
  fixture<PieChart>('dc-pie-chart', { width: '500', height: '350', ...attrs }, slices);

const markup = (chart: PieChart) => chart.shadowRoot!.innerHTML;
const logs = (chart: PieChart) => JSON.stringify((chart as unknown as { logEntries: unknown }).logEntries);

describe('inner-radius accepts both spellings', () => {
  it('renders a donut from a bare number', async () => {
    const chart = await chartWith({ 'inner-radius': '50' });
    expect(chart.innerRadius).toBe(50);
    expect(markup(chart)).not.toMatch(/NaN/);
  });

  // The spelling that shipped broken.
  it('renders a donut from a percentage', async () => {
    const chart = await chartWith({ 'inner-radius': '50%' });
    expect(chart.innerRadius).toBe(50);
    expect(markup(chart)).not.toMatch(/NaN/);
  });

  it('produces identical geometry for "50" and "50%"', async () => {
    const bare = await chartWith({ 'inner-radius': '50' });
    const pct = await chartWith({ 'inner-radius': '50%' });
    const paths = (c: PieChart) =>
      Array.from(c.shadowRoot!.querySelectorAll('path[data-shape-index]')).map(p =>
        p.getAttribute('d')
      );
    expect(paths(pct)).toEqual(paths(bare));
  });

  it('tolerates whitespace around the percent sign', async () => {
    const chart = await chartWith({ 'inner-radius': ' 50 % ' });
    expect(chart.innerRadius).toBe(50);
    expect(markup(chart)).not.toMatch(/NaN/);
  });
});

describe('an unusable inner-radius is diagnosed, not rendered', () => {
  it('never emits NaN geometry, whatever it is given', async () => {
    for (const value of ['abc', '50%%', 'half', '', '-20', 'NaN', '1e', '%']) {
      const chart = await chartWith({ 'inner-radius': value });
      expect(markup(chart), `inner-radius="${value}"`).not.toMatch(/NaN/);
    }
  });

  it('raises DC103 for an unparseable value', async () => {
    const chart = await chartWith({ 'inner-radius': 'abc' });
    expect(logs(chart)).toContain('DC103');
  });

  it('falls back to a solid pie, as the message promises', async () => {
    const broken = await chartWith({ 'inner-radius': 'abc' });
    const solid = await chartWith({});
    const paths = (c: PieChart) =>
      Array.from(c.shadowRoot!.querySelectorAll('path[data-shape-index]')).map(p =>
        p.getAttribute('d')
      );
    expect(paths(broken)).toEqual(paths(solid));
  });

  // This is what the negative branch already claimed to do and did not.
  it('actually uses 0 for a negative radius, not the negative value', async () => {
    const negative = await chartWith({ 'inner-radius': '-20' });
    const solid = await chartWith({});
    const paths = (c: PieChart) =>
      Array.from(c.shadowRoot!.querySelectorAll('path[data-shape-index]')).map(p =>
        p.getAttribute('d')
      );
    expect(paths(negative)).toEqual(paths(solid));
    expect(logs(negative)).toContain('DC103');
  });

  it('still warns about a radius at or beyond 100', async () => {
    const chart = await chartWith({ 'inner-radius': '100' });
    expect(logs(chart)).toContain('DC103');
  });

  it('leaves a valid radius alone', async () => {
    const chart = await chartWith({ 'inner-radius': '60' });
    expect(logs(chart)).not.toContain('DC103');
  });
});
