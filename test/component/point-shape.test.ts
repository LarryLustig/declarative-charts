import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/chart';
import '../../src/chart-line';
import '../../src/chart-scatter';
import '../../src/chart-point';
import { Chart } from '../../src/chart';

/**
 * A consumer reported that `<dc-point shape="none">` was not accepted. It was
 * worse than that: unrecognised values fell through to the glyph branch and
 * were drawn as text, so the chart painted the word "none" at every point.
 *
 * There was no other way to suppress a marker either - line markers are drawn
 * unconditionally at a hardcoded radius, and `<dc-point>` has no `size`. The
 * only thing that worked was `shape=""`, which drew an empty <text> node per
 * point and was never documented.
 */
describe('point shape', () => {
  const lineWith = (attr: string, extra = '') =>
    fixture<Chart>('dc-chart', { width: '400', height: '300', 'console-log': 'none', ...JSON.parse(extra || '{}') },
      `<dc-line label="L"><dc-point value="10" ${attr}></dc-point>` +
      `<dc-point value="20" ${attr}></dc-point></dc-line>`);

  const markers = (c: Chart) => c.shadowRoot!.querySelectorAll('g.point-marker *').length;
  const glyphs = (c: Chart) =>
    [...c.shadowRoot!.querySelectorAll('g.point-marker text')].map(t => t.textContent?.trim());
  const codes = (c: Chart) =>
    (c as unknown as { logEntries: Array<{ level: string; code?: string }> })
      .logEntries.filter(e => e.level === 'warning' || e.level === 'error').map(e => e.code);

  describe('none', () => {
    it('draws no marker', async () => {
      const chart = await lineWith('shape="none"');
      await elementUpdated(chart);
      expect(markers(chart)).toBe(0);
    });

    it('still draws the line', async () => {
      const chart = await lineWith('shape="none"');
      await elementUpdated(chart);
      expect(chart.shadowRoot!.querySelectorAll('path.line-path')).toHaveLength(1);
    });

    it('is not a mistake, so it does not warn', async () => {
      const chart = await lineWith('shape="none"');
      await elementUpdated(chart);
      expect(codes(chart)).toEqual([]);
    });

    it('is matched case-insensitively, like the other names', async () => {
      const chart = await lineWith('shape="NONE"');
      await elementUpdated(chart);
      expect(markers(chart)).toBe(0);
      expect(codes(chart)).toEqual([]);
    });

    /**
     * Labels do not come from the shape renderer, so suppressing the marker
     * must not suppress them - a marker-less line with values printed along it
     * is a large part of why anyone asks for this.
     */
    it('keeps the value labels', async () => {
      const chart = await fixture<Chart>('dc-chart',
        { width: '400', height: '300', 'console-log': 'none' },
        '<dc-line label="L" show-value><dc-point value="10" shape="none"></dc-point>' +
        '<dc-point value="20" shape="none"></dc-point></dc-line>');
      await elementUpdated(chart);
      const texts = [...chart.shadowRoot!.querySelectorAll('text')].map(t => t.textContent?.trim());
      expect(texts).toContain('10.00');
      expect(texts).toContain('20.00');
    });

    it('applies from point-shape on the line', async () => {
      const chart = await fixture<Chart>('dc-chart',
        { width: '400', height: '300', 'console-log': 'none' },
        '<dc-line label="L" point-shape="none"><dc-point value="10"></dc-point>' +
        '<dc-point value="20"></dc-point></dc-line>');
      await elementUpdated(chart);
      expect(markers(chart)).toBe(0);
    });

    it('applies from point-shape on the chart', async () => {
      const chart = await fixture<Chart>('dc-chart',
        { width: '400', height: '300', 'point-shape': 'none', 'console-log': 'none' },
        '<dc-line label="L"><dc-point value="10"></dc-point>' +
        '<dc-point value="20"></dc-point></dc-line>');
      await elementUpdated(chart);
      expect(markers(chart)).toBe(0);
    });

    it('applies to a scatter series, which shares the vocabulary', async () => {
      const chart = await fixture<Chart>('dc-chart',
        { width: '400', height: '300', 'console-log': 'none' },
        '<dc-scatter label="S" shape="none"><dc-point x="1" value="10"></dc-point>' +
        '<dc-point x="2" value="20"></dc-point></dc-scatter>');
      await elementUpdated(chart);
      expect(markers(chart)).toBe(0);
    });

    /** The undocumented workaround people used before `none` existed. */
    it('is what an empty shape now means, instead of an empty text node', async () => {
      const chart = await lineWith('shape=""');
      await elementUpdated(chart);
      expect(markers(chart)).toBe(0);
      expect(codes(chart)).toEqual([]);
    });
  });

  describe('glyphs still pass through', () => {
    it('draws a single symbol as text', async () => {
      const chart = await lineWith('shape="★"');
      await elementUpdated(chart);
      expect(glyphs(chart)).toEqual(['★', '★']);
      expect(codes(chart)).toEqual([]);
    });

    it('draws a multi-code-point emoji as text', async () => {
      const chart = await lineWith('shape="❤️"');
      await elementUpdated(chart);
      expect(glyphs(chart)).toEqual(['❤️', '❤️']);
      expect(codes(chart)).toEqual([]);
    });
  });

  describe('an unrecognised name', () => {
    it('draws nothing rather than the word', async () => {
      const chart = await lineWith('shape="sqaure"');
      await elementUpdated(chart);
      expect(markers(chart)).toBe(0);
      expect(glyphs(chart)).toEqual([]);
    });

    it('reports DC117', async () => {
      const chart = await lineWith('shape="sqaure"');
      await elementUpdated(chart);
      expect(codes(chart)).toContain('DC117');
    });

    it('names the offending value, so the typo is findable', async () => {
      const chart = await lineWith('shape="sqaure"');
      await elementUpdated(chart);
      const entry = (chart as unknown as { logEntries: Array<{ code?: string; message: string }> })
        .logEntries.find(e => e.code === 'DC117');
      expect(entry!.message).toContain('sqaure');
    });

    /**
     * One mistake, not one per datapoint. The logger deduplicates its console
     * echo but not the entries `<dc-log-console>` lists, so the dedup has to
     * happen at the call site.
     */
    it('warns once per render, not once per point', async () => {
      const points = Array.from({ length: 50 },
        () => '<dc-point value="10" shape="blob"></dc-point>').join('');
      const chart = await fixture<Chart>('dc-chart',
        { width: '400', height: '300', 'console-log': 'none' },
        `<dc-line label="L">${points}</dc-line>`);
      await elementUpdated(chart);
      expect(codes(chart).filter(c => c === 'DC117')).toHaveLength(1);
    });
  });

  describe('the named shapes still draw', () => {
    for (const [name, tag] of [
      ['circle', 'circle'], ['square', 'rect'], ['triangle', 'polygon'],
      ['diamond', 'polygon'], ['star', 'polygon'], ['cross', 'path'], ['plus', 'path']
    ]) {
      it(`${name} renders a <${tag}>`, async () => {
        const chart = await lineWith(`shape="${name}"`);
        await elementUpdated(chart);
        expect(chart.shadowRoot!.querySelectorAll(`g.point-marker ${tag}`)).toHaveLength(2);
        expect(codes(chart)).toEqual([]);
      });
    }
  });
});
