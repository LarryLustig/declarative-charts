import { describe, it, expect } from 'vitest';
import { fixture } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-legend';
import '../../src/chart-legend-item';
import { Chart } from '../../src/chart';
import { ChartLegend } from '../../src/chart-legend';
import { ChartLegendItem } from '../../src/chart-legend-item';

/**
 * Characterization tests for `<dc-legend-item>`.
 *
 * The element shipped with **0% coverage** over 131 lines, exported from
 * `index.ts` and documented in API.md. These pin what it actually does, so the
 * gaps below are visible rather than assumed.
 *
 * Written before any fix, per the project's tests-before-change discipline.
 */

const item = (attrs: Record<string, string>) =>
  fixture<ChartLegendItem>('dc-legend-item', attrs);

const legendWith = (inner: string, attrs: Record<string, string> = {}) =>
  fixture<ChartLegend>('dc-legend', attrs, inner);

describe('getEffectiveShape', () => {
  it('uses an explicit shape when given', async () => {
    expect((await item({ shape: 'circle', fill: '#f00' })).getEffectiveShape()).toBe('circle');
  });

  it('defaults a fill-only item to a square', async () => {
    expect((await item({ fill: '#f00' })).getEffectiveShape()).toBe('square');
  });

  // A stroke with no fill describes a line, so the swatch should be one.
  it('defaults a stroke-only item to a line', async () => {
    expect((await item({ stroke: '#00f' })).getEffectiveShape()).toBe('line');
  });

  it('defaults an item with both fill and stroke to a square', async () => {
    expect((await item({ fill: '#f00', stroke: '#00f' })).getEffectiveShape()).toBe('square');
  });

  it('defaults a bare item to a square', async () => {
    expect((await item({})).getEffectiveShape()).toBe('square');
  });

  it('lets an explicit shape override the stroke-only default', async () => {
    expect((await item({ stroke: '#00f', shape: 'square' })).getEffectiveShape()).toBe('square');
  });
});

describe('getEffectiveColor', () => {
  it('prefers fill', async () => {
    expect((await item({ fill: '#f00', stroke: '#00f' })).getEffectiveColor()).toBe('#f00');
  });

  it('falls back to stroke', async () => {
    expect((await item({ stroke: '#00f' })).getEffectiveColor()).toBe('#00f');
  });

  it('falls back to grey when neither is set', async () => {
    expect((await item({})).getEffectiveColor()).toBe('#666');
  });
});

describe('the element itself renders nothing', () => {
  it('is a data container, not a visual element', async () => {
    const el = await item({ label: 'A', fill: '#f00' });
    expect(el.shadowRoot?.querySelector('svg')).toBeFalsy();
  });
});

describe('a legend built from custom items', () => {
  it('returns null when there are none, so auto-generated items win', async () => {
    const legend = await legendWith('');
    expect(legend.getCustomItems()).toBeNull();
  });

  it('builds one item per element, in document order', async () => {
    const legend = await legendWith(`
      <dc-legend-item label="Above" fill="#4CAF50"></dc-legend-item>
      <dc-legend-item label="Near" fill="#FF9800"></dc-legend-item>
      <dc-legend-item label="Below" fill="#F44336"></dc-legend-item>`);
    expect(legend.getCustomItems()?.map(i => i.label)).toEqual(['Above', 'Near', 'Below']);
    expect(legend.getCustomItems()?.map(i => i.color)).toEqual(['#4CAF50', '#FF9800', '#F44336']);
  });

  it('marks an item with a value as valued, and one without as dimensionless', async () => {
    const legend = await legendWith(`
      <dc-legend-item label="Counted" fill="#f00" value="177"></dc-legend-item>
      <dc-legend-item label="Uncounted" fill="#0f0"></dc-legend-item>`);
    const [valued, plain] = legend.getCustomItems()!;
    expect((valued as { value: number }).value).toBe(177);
    expect((plain as { dimensionless?: boolean }).dimensionless).toBe(true);
  });

  it('treats value="0" as a value, not as absent', async () => {
    const legend = await legendWith('<dc-legend-item label="Zero" value="0"></dc-legend-item>');
    const [only] = legend.getCustomItems()!;
    expect((only as { value?: number }).value).toBe(0);
    expect((only as { dimensionless?: boolean }).dimensionless).toBeUndefined();
  });

  it('skips hidden items', async () => {
    const legend = await legendWith(`
      <dc-legend-item label="Shown" fill="#f00"></dc-legend-item>
      <dc-legend-item label="Hidden" fill="#0f0" hidden></dc-legend-item>`);
    expect(legend.getCustomItems()?.map(i => i.label)).toEqual(['Shown']);
  });

  it('carries the resolved shape through', async () => {
    const legend = await legendWith(`
      <dc-legend-item label="Line" stroke="#00f"></dc-legend-item>
      <dc-legend-item label="Box" fill="#f00"></dc-legend-item>
      <dc-legend-item label="Dot" fill="#0f0" shape="circle"></dc-legend-item>`);
    expect(legend.getCustomItems()?.map(i => i.shape)).toEqual(['line', 'square', 'circle']);
  });

  it('renders the custom labels into the legend SVG', async () => {
    const legend = await legendWith(`
      <dc-legend-item label="Above Target" fill="#4CAF50"></dc-legend-item>
      <dc-legend-item label="Below Target" fill="#F44336"></dc-legend-item>`);
    const svg = JSON.stringify(legend.generateSvg([], 600).svg);
    expect(svg).toContain('Above Target');
    expect(svg).toContain('Below Target');
  });
});

describe('defects this element shipped with', () => {
  /**
   * `getCustomItems()` filtered out label-less items and returned the empty
   * array. The caller does `customItems ?? items`, and `[]` is not nullish - so
   * it counted as "custom items were supplied" and discarded the chart's own.
   * One typo (`lable="Revenue"`) blanked the legend, silently.
   */
  it('falls back to the chart items when no custom item is usable', async () => {
    const legend = await legendWith('<dc-legend-item fill="#f00"></dc-legend-item>');
    expect(legend.getCustomItems()).toBeNull();

    const auto = [{ label: 'FromChart', color: '#123456', value: 5 }];
    const svg = JSON.stringify(legend.generateSvg(auto as never, 600).svg);
    expect(svg).toContain('FromChart');
  });

  it('still uses the usable items when only some lack a label', async () => {
    const legend = await legendWith(`
      <dc-legend-item fill="#f00"></dc-legend-item>
      <dc-legend-item label="Named" fill="#0f0"></dc-legend-item>`);
    expect(legend.getCustomItems()?.map(i => i.label)).toEqual(['Named']);
  });

  /**
   * `stroke-dasharray` and `pattern` were declared on the element, documented
   * in API.md, and read by nothing - the same dead-attribute class as
   * `bar-color`. A dashed series has to read as dashed in the legend, or the
   * legend cannot tell two lines apart.
   */
  it('carries stroke-dasharray into the swatch', async () => {
    const legend = await legendWith(
      '<dc-legend-item label="Target" stroke="#00f" stroke-dasharray="dashed"></dc-legend-item>');
    expect(legend.getCustomItems()?.[0].strokeDasharray).toBe('5 5');
    expect(JSON.stringify(legend.generateSvg([], 600).svg)).toContain('5 5');
  });

  it('resolves the named dash patterns <dc-fill> uses', async () => {
    for (const [name, expected] of [['dashed', '5 5'], ['dotted', '1 3'], ['long-dash', '10 5']]) {
      const legend = await legendWith(
        `<dc-legend-item label="L" stroke="#00f" stroke-dasharray="${name}"></dc-legend-item>`);
      expect(legend.getCustomItems()?.[0].strokeDasharray, name).toBe(expected);
    }
  });

  it('leaves a solid line undashed', async () => {
    const legend = await legendWith('<dc-legend-item label="L" stroke="#00f"></dc-legend-item>');
    expect(legend.getCustomItems()?.[0].strokeDasharray).toBeUndefined();
  });
});

describe('a patterned legend item paints with a real pattern', () => {
  /**
   * Patterns live in the chart's `<defs>` and are registered during fill
   * resolution, which never sees `<dc-legend-item>` elements. Registering them
   * only while the legend renders was too late: `renderDefs()` runs earlier in
   * the template, so the legend painted `url(#id)` against a definition that
   * was never emitted - a reference to nothing, which draws nothing.
   */
  const patterned = () =>
    fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-legend>
        <dc-legend-item label="Risk" fill="#f00" pattern="crosshatch"></dc-legend-item>
      </dc-legend>
      <dc-bar value="10" label="A"></dc-bar>`);

  it('emits a <pattern> definition for every url(#...) it references', async () => {
    const html = (await patterned()).shadowRoot!.innerHTML;
    const refs = [...html.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]);
    const defs = [...html.matchAll(/<pattern[^>]*id="([^"]+)"/g)].map(m => m[1]);

    expect(refs.length).toBeGreaterThan(0);
    expect(refs.filter(r => !defs.includes(r)), 'references with no definition').toEqual([]);
  });

  it('warns rather than painting nothing when the pattern name is unknown', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-legend>
        <dc-legend-item label="Risk" fill="#f00" pattern="not-a-pattern"></dc-legend-item>
      </dc-legend>
      <dc-bar value="10" label="A"></dc-bar>`);
    const logged = JSON.stringify((chart as unknown as { logEntries: unknown }).logEntries);
    expect(logged).toContain('DC202');
  });
});
