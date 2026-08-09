import { describe, it, expect } from 'vitest';
import { fixture } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-line';
import '../../src/chart-point';
import { Chart } from '../../src/chart';

/**
 * Regression tests for the chart-level default colours.
 *
 * `bar-color` was silently dead. `chart.ts` built its element list with a
 * `defaultColor` *field* on each element, but `resolveFillsWithPatterns` takes
 * the default as its **second argument** — the field was read by nothing. The
 * parameter type does not declare it, and TypeScript's excess-property check
 * does not apply to a variable (only to an object literal passed directly), so
 * the compiler never objected and every bar chart auto-generated its colours
 * whatever `bar-color` said.
 *
 * That is very likely why an earlier review recorded `bar-color` as a
 * deprecation: it was undocumented *and* it did nothing.
 *
 * The fix is guarded on the attribute being present, not on the property being
 * truthy — `barColor` defaults to `#4CAF50`, so passing it unconditionally
 * would turn every default bar chart into one flat green.
 */

const barsWith = (attrs: Record<string, string>) =>
  fixture<Chart>('dc-chart', { width: '400', height: '300', ...attrs }, `
    <dc-bar value="10" label="A"></dc-bar>
    <dc-bar value="15" label="B"></dc-bar>
    <dc-bar value="20" label="C"></dc-bar>`);

const fills = (chart: Chart) =>
  Array.from(chart.shadowRoot!.querySelectorAll('rect[data-shape-index]')).map(r =>
    r.getAttribute('fill')
  );

describe('bar-color', () => {
  it('colours every bar when set', async () => {
    const chart = await barsWith({ 'bar-color': '#7c3aed' });
    expect(fills(chart)).toEqual(['#7c3aed', '#7c3aed', '#7c3aed']);
  });

  // The behaviour the guard protects: omitting bar-color must still give
  // distinct colours, not the property's truthy default.
  it('auto-generates distinct colours when omitted', async () => {
    const colours = fills(await barsWith({}));
    expect(new Set(colours).size).toBe(3);
    expect(colours).not.toContain('#4CAF50');
  });

  it('yields to an element fill', async () => {
    const chart = await fixture<Chart>('dc-chart',
      { width: '400', height: '300', 'bar-color': '#7c3aed' }, `
      <dc-bar value="10" label="A"></dc-bar>
      <dc-bar value="15" label="B" fill="#ff0000"></dc-bar>`);
    expect(fills(chart)).toEqual(['#7c3aed', '#ff0000']);
  });

  it('yields to a palette', async () => {
    const chart = await barsWith({ 'bar-color': '#7c3aed', palette: 'category10' });
    expect(fills(chart)).not.toEqual(['#7c3aed', '#7c3aed', '#7c3aed']);
  });
});

describe('line-color', () => {
  const linesWith = (attrs: Record<string, string>) =>
    fixture<Chart>('dc-chart', { width: '400', height: '300', ...attrs }, `
      <dc-line label="A"><dc-point value="10" label="a"></dc-point><dc-point value="20" label="b"></dc-point></dc-line>
      <dc-line label="B"><dc-point value="15" label="a"></dc-point><dc-point value="25" label="b"></dc-point></dc-line>`);

  const strokes = (chart: Chart) =>
    Array.from(chart.shadowRoot!.querySelectorAll('path[data-shape-index]')).map(p =>
      p.getAttribute('stroke')
    );

  it('strokes every line when set', async () => {
    expect(strokes(await linesWith({ 'line-color': '#ea580c' }))).toEqual(['#ea580c', '#ea580c']);
  });

  // Deliberately pinned as-is: unlike bars, lines *do* share one default
  // colour. Documented rather than changed, because changing it is a design
  // decision and not this fix.
  it('shares one default colour when omitted', async () => {
    const s = strokes(await linesWith({}));
    expect(new Set(s).size).toBe(1);
  });

  it('yields to an element stroke', async () => {
    const chart = await fixture<Chart>('dc-chart',
      { width: '400', height: '300', 'line-color': '#ea580c' }, `
      <dc-line label="A"><dc-point value="10" label="a"></dc-point><dc-point value="20" label="b"></dc-point></dc-line>
      <dc-line label="B" stroke="#00ff00"><dc-point value="15" label="a"></dc-point><dc-point value="25" label="b"></dc-point></dc-line>`);
    expect(strokes(chart)).toEqual(['#ea580c', '#00ff00']);
  });
});
