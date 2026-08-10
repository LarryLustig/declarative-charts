import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';

/**
 * Tests for `<dc-reference>` — target lines and threshold bands.
 *
 * The interesting assertions are about **layering and honesty**, not geometry:
 * a band is a region so it sits under the data, a line is a mark so it sits
 * over it; a band clamps to the plot edge because a range that runs off the top
 * really is partly on screen, while a line outside the range is dropped rather
 * than drawn somewhere it is not.
 *
 * The other half is range contribution. A target the axis crops off is worse
 * than no target — the chart looks complete and quietly omits the annotation —
 * so an automatic axis has to grow to reach it.
 */

const SIZE = { width: '600', height: '400' };

const chart = (inner: string, attrs: Record<string, string> = {}) =>
  fixture<Chart>('dc-chart', { ...SIZE, ...attrs }, inner);

const BARS = '<dc-bar value="95" label="Q1"></dc-bar><dc-bar value="70" label="Q2"></dc-bar>';

const bands = (c: Chart) => [...c.shadowRoot!.querySelectorAll('rect.reference-band')];
const lines = (c: Chart) => [...c.shadowRoot!.querySelectorAll('line.reference-line')];
const labels = (c: Chart) =>
  [...c.shadowRoot!.querySelectorAll('text.reference-label')].map(t => t.textContent!.trim());

const num = (el: Element | undefined, attr: string) => +(el?.getAttribute(attr) ?? NaN);

/** Where a value sits on a vertical chart's value axis, from the chart's own range. */
const yFor = (c: Chart, value: number) => {
  const padding = c['getChartPadding']();
  const range = c['getNiceRange'](c['getAxisConfig']('left'));
  const chartHeight = 400 - padding.top - padding.bottom;
  return 400 - padding.bottom - ((value - range.min) / (range.max - range.min)) * chartHeight;
};

describe('<dc-reference>', () => {
  describe('lines', () => {
    it('draws a line at the value', async () => {
      const c = await chart('<dc-reference value="100"></dc-reference>' + BARS);
      expect(lines(c)).toHaveLength(1);
      expect(num(lines(c)[0], 'y1')).toBeCloseTo(yFor(c, 100), 6);
    });

    it('spans the plot width', async () => {
      const c = await chart('<dc-reference value="100"></dc-reference>' + BARS);
      const padding = c['getChartPadding']();
      expect(num(lines(c)[0], 'x1')).toBeCloseTo(padding.left, 6);
      expect(num(lines(c)[0], 'x2')).toBeCloseTo(600 - padding.right, 6);
    });

    it('is level: both ends at the same height', async () => {
      const c = await chart('<dc-reference value="100"></dc-reference>' + BARS);
      expect(num(lines(c)[0], 'y1')).toBe(num(lines(c)[0], 'y2'));
    });

    it('draws one line per element', async () => {
      const c = await chart(
        '<dc-reference value="100"></dc-reference><dc-reference value="50"></dc-reference>' + BARS
      );
      expect(lines(c)).toHaveLength(2);
    });

    it('is dashed by default, so it does not read as data', async () => {
      const c = await chart('<dc-reference value="100"></dc-reference>' + BARS);
      expect(lines(c)[0].getAttribute('stroke-dasharray')).toBeTruthy();
    });

    it('accepts a named dash pattern', async () => {
      const c = await chart('<dc-reference value="100" stroke-dasharray="dotted"></dc-reference>' + BARS);
      const dotted = lines(c)[0].getAttribute('stroke-dasharray');
      const dashed = await chart('<dc-reference value="100"></dc-reference>' + BARS)
        .then(o => lines(o)[0].getAttribute('stroke-dasharray'));
      expect(dotted).toBeTruthy();
      expect(dotted).not.toBe(dashed);
    });

    it('accepts a raw dash list', async () => {
      const c = await chart('<dc-reference value="100" stroke-dasharray="7 2"></dc-reference>' + BARS);
      expect(lines(c)[0].getAttribute('stroke-dasharray')).toBe('7 2');
    });

    it('takes stroke and stroke-width', async () => {
      const c = await chart(
        '<dc-reference value="100" stroke="#0000ff" stroke-width="5"></dc-reference>' + BARS
      );
      expect(lines(c)[0].getAttribute('stroke')).toBe('#0000ff');
      expect(lines(c)[0].getAttribute('stroke-width')).toBe('5');
    });

    it('is omitted when hidden', async () => {
      const c = await chart('<dc-reference value="100" hidden></dc-reference>' + BARS);
      expect(lines(c)).toHaveLength(0);
    });
  });

  describe('bands', () => {
    it('draws a band between min and max', async () => {
      const c = await chart('<dc-reference min="80" max="120"></dc-reference>' + BARS);
      expect(bands(c)).toHaveLength(1);
      expect(num(bands(c)[0], 'y')).toBeCloseTo(yFor(c, 120), 6);
      expect(num(bands(c)[0], 'height')).toBeCloseTo(yFor(c, 80) - yFor(c, 120), 6);
    });

    it('spans the plot width', async () => {
      const c = await chart('<dc-reference min="80" max="120"></dc-reference>' + BARS);
      const padding = c['getChartPadding']();
      expect(num(bands(c)[0], 'x')).toBeCloseTo(padding.left, 6);
      expect(num(bands(c)[0], 'width')).toBeCloseTo(600 - padding.left - padding.right, 6);
    });

    it('runs to the top of the plot when only min is given', async () => {
      // "80 and above" is how a danger zone is usually stated, and it should not
      // need a max nobody has in mind.
      const c = await chart('<dc-reference min="80"></dc-reference>' + BARS);
      const padding = c['getChartPadding']();
      expect(num(bands(c)[0], 'y')).toBeCloseTo(padding.top, 6);
      expect(num(bands(c)[0], 'height')).toBeCloseTo(yFor(c, 80) - padding.top, 6);
    });

    it('runs to the bottom of the plot when only max is given', async () => {
      const c = await chart('<dc-reference max="40"></dc-reference>' + BARS);
      const padding = c['getChartPadding']();
      expect(num(bands(c)[0], 'y')).toBeCloseTo(yFor(c, 40), 6);
      expect(num(bands(c)[0], 'y') + num(bands(c)[0], 'height')).toBeCloseTo(400 - padding.bottom, 6);
    });

    it('normalises a band written the wrong way round', async () => {
      // A typo, not an instruction to draw nothing.
      const c = await chart('<dc-reference min="120" max="80"></dc-reference>' + BARS);
      const right = await chart('<dc-reference min="80" max="120"></dc-reference>' + BARS);
      expect(num(bands(c)[0], 'height')).toBeCloseTo(num(bands(right)[0], 'height'), 6);
    });

    it('clamps a band that runs past the axis, rather than dropping it', async () => {
      // Part of the region really is on screen, and showing that part is honest.
      const c = await chart(
        '<dc-axis position="left" min-value="0" max-value="100"></dc-axis>' +
          '<dc-reference min="90" max="9000"></dc-reference>' + BARS
      );
      const padding = c['getChartPadding']();
      expect(bands(c)).toHaveLength(1);
      expect(num(bands(c)[0], 'y')).toBeCloseTo(padding.top, 6);
    });

    it('clamps a band that starts below the axis', async () => {
      const c = await chart(
        '<dc-axis position="left" min-value="50" max-value="150"></dc-axis>' +
          '<dc-reference min="10" max="80"></dc-reference>' + BARS
      );
      const padding = c['getChartPadding']();
      expect(bands(c)).toHaveLength(1);
      expect(num(bands(c)[0], 'y') + num(bands(c)[0], 'height')).toBeCloseTo(400 - padding.bottom, 6);
    });

    it('draws nothing for a band entirely outside the axis', async () => {
      const c = await chart(
        '<dc-axis position="left" min-value="0" max-value="100"></dc-axis>' +
          '<dc-reference min="500" max="900"></dc-reference>' + BARS
      );
      expect(bands(c)).toHaveLength(0);
    });

    it('fills with its own colour', async () => {
      const c = await chart('<dc-reference min="80" max="120" fill="#16a34a"></dc-reference>' + BARS);
      expect(bands(c)[0].getAttribute('fill')).toBe('#16a34a');
    });

    it('falls back to the stroke colour, so one attribute usually does', async () => {
      const c = await chart('<dc-reference min="80" max="120" stroke="#7c3aed"></dc-reference>' + BARS);
      expect(bands(c)[0].getAttribute('fill')).toBe('#7c3aed');
    });

    it('takes fill-opacity', async () => {
      const c = await chart('<dc-reference min="80" max="120" fill-opacity="0.5"></dc-reference>' + BARS);
      expect(bands(c)[0].getAttribute('fill-opacity')).toBe('0.5');
    });

    it('is translucent by default, so the data underneath stays readable', async () => {
      const c = await chart('<dc-reference min="80" max="120"></dc-reference>' + BARS);
      expect(+bands(c)[0].getAttribute('fill-opacity')!).toBeLessThan(0.5);
    });
  });

  describe('a band and a line together', () => {
    it('draws both from one element', async () => {
      // "Acceptable range 80-120, target 100" is one statement, not two.
      const c = await chart('<dc-reference min="80" max="120" value="100"></dc-reference>' + BARS);
      expect(bands(c)).toHaveLength(1);
      expect(lines(c)).toHaveLength(1);
      expect(num(lines(c)[0], 'y1')).toBeCloseTo(yFor(c, 100), 6);
    });

    it('labels the line rather than the band edge when both are present', async () => {
      const c = await chart('<dc-reference min="80" max="120" value="100" label="T"></dc-reference>' + BARS);
      const label = c.shadowRoot!.querySelector('text.reference-label')!;
      expect(+label.getAttribute('y')!).toBeCloseTo(yFor(c, 100) - 4, 6);
    });
  });

  describe('layering', () => {
    it('draws bands beneath the data', async () => {
      const c = await chart('<dc-reference min="80" max="120"></dc-reference>' + BARS);
      const html = c.shadowRoot!.innerHTML;
      expect(html.indexOf('reference-band')).toBeLessThan(html.indexOf('data-shape-index'));
    });

    it('draws lines above the data', async () => {
      const c = await chart('<dc-reference value="100"></dc-reference>' + BARS);
      const html = c.shadowRoot!.innerHTML;
      expect(html.indexOf('reference-line')).toBeGreaterThan(html.indexOf('data-shape-index'));
    });
  });

  describe('labels', () => {
    it('draws the label text', async () => {
      const c = await chart('<dc-reference value="100" label="Target"></dc-reference>' + BARS);
      expect(labels(c)).toEqual(['Target']);
    });

    it('draws no label element when there is no label', async () => {
      const c = await chart('<dc-reference value="100"></dc-reference>' + BARS);
      expect(labels(c)).toHaveLength(0);
    });

    it('sits at the right-hand end by default', async () => {
      const c = await chart('<dc-reference value="100" label="Target"></dc-reference>' + BARS);
      const label = c.shadowRoot!.querySelector('text.reference-label')!;
      expect(label.getAttribute('text-anchor')).toBe('end');
      expect(+label.getAttribute('x')!).toBeGreaterThan(300);
    });

    it('moves to the left-hand end with label-position="start"', async () => {
      const c = await chart(
        '<dc-reference value="100" label="Target" label-position="start"></dc-reference>' + BARS
      );
      const label = c.shadowRoot!.querySelector('text.reference-label')!;
      expect(label.getAttribute('text-anchor')).toBe('start');
      expect(+label.getAttribute('x')!).toBeLessThan(300);
    });

    it('labels a band with no line at its upper edge', async () => {
      const c = await chart('<dc-reference min="80" max="120" label="Range"></dc-reference>' + BARS);
      const label = c.shadowRoot!.querySelector('text.reference-label')!;
      expect(+label.getAttribute('y')!).toBeCloseTo(yFor(c, 120) - 4, 6);
    });

    it('takes the line colour', async () => {
      const c = await chart('<dc-reference value="100" label="T" stroke="#0000ff"></dc-reference>' + BARS);
      expect(c.shadowRoot!.querySelector('text.reference-label')!.getAttribute('fill')).toBe('#0000ff');
    });

    it("takes a band's fill when there is no line to match", async () => {
      // Nothing is stroked on screen, so the stroke colour is a colour the
      // reader never sees - and by default that is red on a green band.
      const c = await chart(
        '<dc-reference min="80" max="120" fill="#16a34a" label="Range"></dc-reference>' + BARS
      );
      expect(c.shadowRoot!.querySelector('text.reference-label')!.getAttribute('fill')).toBe('#16a34a');
    });
  });

  describe('the axis range', () => {
    it('grows to reach a target above the data', async () => {
      // Otherwise the chart looks complete and quietly omits the annotation.
      const withRef = await chart('<dc-reference value="300"></dc-reference>' + BARS);
      const without = await chart(BARS);
      const max = (c: Chart) => c['getNiceRange'](c['getAxisConfig']('left')).max;
      expect(max(withRef)).toBeGreaterThanOrEqual(300);
      expect(max(without)).toBeLessThan(300);
    });

    it('grows to reach a band bound', async () => {
      const c = await chart('<dc-reference min="200" max="400"></dc-reference>' + BARS);
      expect(c['getNiceRange'](c['getAxisConfig']('left')).max).toBeGreaterThanOrEqual(400);
    });

    it('grows downward for a reference below the data', async () => {
      const c = await chart('<dc-reference value="-50"></dc-reference>' + BARS);
      expect(c['getNiceRange'](c['getAxisConfig']('left')).min).toBeLessThanOrEqual(-50);
    });

    it('leaves an explicitly bounded axis alone', async () => {
      const c = await chart(
        '<dc-axis position="left" min-value="0" max-value="100"></dc-axis>' +
          '<dc-reference value="900"></dc-reference>' + BARS
      );
      expect(c['getNiceRange'](c['getAxisConfig']('left')).max).toBe(100);
    });

    it('drops a line the axis cannot show, rather than drawing it at the edge', async () => {
      // Clamping a line would put it somewhere it is not, and the reader has no
      // way to tell. Clamping a band is fine; clamping a line is a lie.
      const c = await chart(
        '<dc-axis position="left" min-value="0" max-value="100"></dc-axis>' +
          '<dc-reference value="900" label="Far"></dc-reference>' + BARS
      );
      expect(lines(c)).toHaveLength(0);
      expect(labels(c)).toHaveLength(0);
    });

    it('reports the dropped line as DC114', async () => {
      const c = await chart(
        '<dc-axis position="left" min-value="0" max-value="100"></dc-axis>' +
          '<dc-reference value="900" label="Far"></dc-reference>' + BARS
      );
      const entry = c.getLogEntries().find(e => e.path === 'reference.outOfRange');
      expect(entry?.message).toContain('Far');
      expect(entry?.message).toContain('was not drawn');
    });
  });

  describe('horizontal charts', () => {
    it('draws the line vertically, along the value axis', async () => {
      const c = await chart('<dc-reference value="80"></dc-reference>' + BARS, {
        orientation: 'horizontal'
      });
      const line = lines(c)[0];
      expect(num(line, 'x1')).toBe(num(line, 'x2'));
      expect(num(line, 'y1')).not.toBe(num(line, 'y2'));
    });

    it('positions it along the value axis, not the category axis', async () => {
      const padding = (c: Chart) => c['getChartPadding']();
      const c = await chart(
        '<dc-axis position="bottom" min-value="0" max-value="100"></dc-axis>' +
          '<dc-reference value="50"></dc-reference>' + BARS,
        { orientation: 'horizontal' }
      );
      const p = padding(c);
      const chartWidth = 600 - p.left - p.right;
      expect(num(lines(c)[0], 'x1')).toBeCloseTo(p.left + chartWidth * 0.5, 6);
    });

    it('keeps a label near the right edge inside the plot', async () => {
      // A limit or an over-budget band sits exactly where a label drawn to the
      // right would run off the plot, so it flips to the other side.
      const c = await chart(
        '<dc-axis position="bottom" min-value="0" max-value="100"></dc-axis>' +
          '<dc-reference value="99" label="Over budget"></dc-reference>' + BARS,
        { orientation: 'horizontal' }
      );
      const label = c.shadowRoot!.querySelector('text.reference-label')!;
      const p = c['getChartPadding']();
      expect(label.getAttribute('text-anchor')).toBe('end');
      expect(+label.getAttribute('x')!).toBeLessThanOrEqual(600 - p.right);
    });

    it('leaves a label with room to the right alone', async () => {
      const c = await chart(
        '<dc-axis position="bottom" min-value="0" max-value="100"></dc-axis>' +
          '<dc-reference value="5" label="Floor"></dc-reference>' + BARS,
        { orientation: 'horizontal' }
      );
      expect(c.shadowRoot!.querySelector('text.reference-label')!.getAttribute('text-anchor'))
        .toBe('start');
    });

    it('draws the band as a vertical stripe', async () => {
      const c = await chart('<dc-reference min="80" max="120"></dc-reference>' + BARS, {
        orientation: 'horizontal'
      });
      const p = c['getChartPadding']();
      expect(num(bands(c)[0], 'height')).toBeCloseTo(400 - p.top - p.bottom, 6);
    });
  });

  describe('diagnostics', () => {
    it('reports a reference that sets nothing as DC113', async () => {
      const c = await chart('<dc-reference label="nothing"></dc-reference>' + BARS);
      const entry = c.getLogEntries().find(e => e.path === 'reference.empty');
      expect(entry?.message).toContain('drew nothing');
    });

    it('draws nothing for it', async () => {
      const c = await chart('<dc-reference label="nothing"></dc-reference>' + BARS);
      expect(lines(c)).toHaveLength(0);
      expect(bands(c)).toHaveLength(0);
    });

    it('stays quiet when every reference is usable', async () => {
      const c = await chart(
        '<dc-reference value="100"></dc-reference><dc-reference min="20"></dc-reference>' + BARS
      );
      expect(c.getLogEntries().filter(e => e.path.startsWith('reference.'))).toHaveLength(0);
    });
  });

  describe('what a reference is not', () => {
    it('is not focusable: an annotation is not a datapoint', async () => {
      const withRef = await chart('<dc-reference value="100"></dc-reference>' + BARS);
      const without = await chart(BARS);
      expect(withRef['getFocusableElements']()).toHaveLength(
        without['getFocusableElements']().length
      );
    });

    it('is not in the legend, because its label is already on the line', async () => {
      const c = await chart('<dc-reference value="100" label="Target"></dc-reference>' + BARS);
      expect(c['getLegendItems']().map((i: any) => i.label)).not.toContain('Target');
    });

    it('does not make an empty chart non-empty', async () => {
      // There is nothing for the annotation to be about.
      const c = await chart('<dc-reference value="100"></dc-reference>');
      expect(c['getDataElementCount']()).toBe(0);
    });

    it('does not enter the percentage denominator', async () => {
      const opts = { 'show-percent': 'true', 'show-value': 'false' };
      const alone = await chart(BARS, opts);
      const withRef = await chart('<dc-reference value="900"></dc-reference>' + BARS, opts);
      const percents = (c: Chart) =>
        [...c.shadowRoot!.querySelectorAll('text')]
          .map(t => t.textContent!.trim())
          .filter(t => t.endsWith('%'));
      expect(percents(withRef)).toEqual(percents(alone));
      expect(percents(alone).length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('feeds the target comparison in the description', async () => {
      const c = await chart('<dc-reference value="200" label="Target"></dc-reference>' + BARS);
      expect(c['getInsights']()).toContain('all below target');
    });

    it('reports bars above it as meeting the target', async () => {
      const c = await chart('<dc-reference value="10"></dc-reference>' + BARS);
      expect(c['getInsights']()).toContain('all exceed target');
    });

    it('says nothing about a target when there is no reference', async () => {
      const c = await chart(BARS);
      expect(c['getInsights']()).not.toContain('target');
    });

    it('uses the first line, and ignores a band-only reference', async () => {
      // A band has no single number to be above or below.
      const c = await chart(
        '<dc-reference min="0" max="500"></dc-reference>' +
          '<dc-reference value="10"></dc-reference>' + BARS
      );
      expect(c['getInsights']()).toContain('all exceed target');
    });
  });

  describe('reactivity', () => {
    it('redraws when the value changes', async () => {
      const c = await chart(
        '<dc-axis position="left" min-value="0" max-value="200"></dc-axis>' +
          '<dc-reference value="100"></dc-reference>' + BARS
      );
      const before = num(lines(c)[0], 'y1');
      c.querySelector('dc-reference')!.setAttribute('value', '150');
      await elementUpdated(c);
      expect(num(lines(c)[0], 'y1')).not.toBeCloseTo(before, 3);
    });

    it('redraws when a reference is added', async () => {
      const c = await chart(BARS);
      const ref = document.createElement('dc-reference');
      ref.setAttribute('value', '50');
      c.appendChild(ref);
      await elementUpdated(c);
      expect(lines(c)).toHaveLength(1);
    });

    it('redraws when a reference is hidden', async () => {
      const c = await chart('<dc-reference value="50"></dc-reference>' + BARS);
      c.querySelector('dc-reference')!.setAttribute('hidden', '');
      await elementUpdated(c);
      expect(lines(c)).toHaveLength(0);
    });
  });
});
