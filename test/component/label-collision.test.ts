import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';

/**
 * Tests for `label-collision` and `label-rotate`.
 *
 * These are the two halves of the same problem — this library positions by
 * data, so labels collide — solved at two levels. Value labels all pass through
 * one place and get clamped-then-hidden there. Category labels are on the axis,
 * where the existing remedies hide labels to make room and a tilt keeps them.
 *
 * The tilt tests lean on the *interval*, not on the transform: whether a tilt
 * is applied is a one-line assertion, but whether it earned its keep is whether
 * labels that were being skipped now appear.
 */

const SIZE = { width: '600', height: '400' };

const chart = (inner: string, attrs: Record<string, string> = {}) =>
  fixture<Chart>('dc-chart', { ...SIZE, ...attrs }, inner);

/** Two lines whose values are close enough that the labels land on each other. */
const CLOSE_LINES =
  '<dc-line label="Plan"><dc-point value="100" label="Jan"></dc-point>' +
  '<dc-point value="150" label="Feb"></dc-point></dc-line>' +
  '<dc-line label="Actual"><dc-point value="101" label="Jan"></dc-point>' +
  '<dc-point value="149" label="Feb"></dc-point></dc-line>';

const LONG_LABELS = [
  'North East Region', 'South West Region', 'Central Midlands', 'Outer Hebrides',
  'Greater Manchester', 'West Yorkshire', 'East Anglia', 'Cornwall and Devon'
];

const longBars = LONG_LABELS.map((l, i) => `<dc-bar value="${20 + i * 9}" label="${l}"></dc-bar>`).join('');

const texts = (c: Chart) =>
  [...c.shadowRoot!.querySelectorAll('text[part="label"]')].map(t => t.textContent!.trim());

const valueLabels = (c: Chart) => texts(c).filter(t => /^[\d.,]+$/.test(t));
const categoryLabels = (c: Chart) => texts(c).filter(t => LONG_LABELS.includes(t));

const labelEl = (c: Chart, text: string) =>
  [...c.shadowRoot!.querySelectorAll('text[part="label"]')]
    .find(t => t.textContent!.trim() === text);

describe('label-collision', () => {
  describe('hiding', () => {
    it('drops a value label that would land on another', async () => {
      const c = await chart(CLOSE_LINES);
      expect(valueLabels(c)).toContain('100.00');
      expect(valueLabels(c)).not.toContain('101.00');
    });

    it('is the default', async () => {
      const dflt = await chart(CLOSE_LINES);
      const explicit = await chart(CLOSE_LINES, { 'label-collision': 'hide' });
      expect(valueLabels(dflt)).toEqual(valueLabels(explicit));
    });

    it('keeps the first in document order', async () => {
      // Predictable beats clever: reorder the markup and you can see why the
      // outcome changed.
      const c = await chart(CLOSE_LINES);
      expect(valueLabels(c)).toContain('100.00');

      const swapped = await chart(
        CLOSE_LINES.replace(/Plan/, 'X').replace(/Actual/, 'Plan').replace(/X/, 'Actual')
      );
      expect(valueLabels(swapped)).toContain('100.00');
    });

    it('leaves labels that do not collide alone', async () => {
      const c = await chart(
        '<dc-bar value="30" label="A"></dc-bar><dc-bar value="70" label="B"></dc-bar>'
      );
      expect(valueLabels(c)).toEqual(['30.00', '70.00']);
    });
  });

  describe('show', () => {
    it('draws every label, overlap and all', async () => {
      const c = await chart(CLOSE_LINES, { 'label-collision': 'show' });
      expect(valueLabels(c)).toContain('100.00');
      expect(valueLabels(c)).toContain('101.00');
    });

    it('leaves overhanging labels where the geometry puts them', async () => {
      const shown = await chart(CLOSE_LINES, { 'label-collision': 'show' });
      const hidden = await chart(CLOSE_LINES, { 'label-collision': 'clamp' });
      const x = (c: Chart) => +labelEl(c, '100.00')!.getAttribute('x')!;
      expect(x(shown)).toBeLessThan(x(hidden));
    });
  });

  describe('clamp', () => {
    it('keeps every label', async () => {
      const c = await chart(CLOSE_LINES, { 'label-collision': 'clamp' });
      expect(valueLabels(c)).toContain('100.00');
      expect(valueLabels(c)).toContain('101.00');
    });

    it('still moves an overhanging label inside the plot', async () => {
      const c = await chart(CLOSE_LINES, { 'label-collision': 'clamp' });
      const padding = c['getChartPadding']();
      // The first point sits on the left edge, so its centred label used to
      // hang over the axis gutter and land on the tick labels there.
      expect(+labelEl(c, '100.00')!.getAttribute('x')!).toBeGreaterThan(padding.left);
    });
  });

  describe('clamping under the default', () => {
    it('brings the first point\'s label inside the plot', async () => {
      const c = await chart(CLOSE_LINES);
      const padding = c['getChartPadding']();
      expect(+labelEl(c, '100.00')!.getAttribute('x')!).toBeGreaterThanOrEqual(padding.left);
    });

    it("brings the last point's label inside the plot", async () => {
      const c = await chart(CLOSE_LINES);
      const padding = c['getChartPadding']();
      expect(+labelEl(c, '150.00')!.getAttribute('x')!).toBeLessThanOrEqual(600 - padding.right);
    });

    it('does not move a label that already fits', async () => {
      const bars = '<dc-bar value="30" label="A"></dc-bar><dc-bar value="70" label="B"></dc-bar>';
      const hide = await chart(bars);
      const show = await chart(bars, { 'label-collision': 'show' });
      expect(labelEl(hide, '30.00')!.getAttribute('x')).toBe(labelEl(show, '30.00')!.getAttribute('x'));
    });
  });

  describe('reactivity', () => {
    it('re-resolves when the mode changes', async () => {
      const c = await chart(CLOSE_LINES);
      expect(valueLabels(c)).not.toContain('101.00');
      c.setAttribute('label-collision', 'show');
      await elementUpdated(c);
      expect(valueLabels(c)).toContain('101.00');
    });
  });
});

describe('label-rotate', () => {
  const rotated = (deg: string) =>
    chart(`<dc-axis position="bottom" label-rotate="${deg}"></dc-axis>${longBars}`);

  describe('what it draws', () => {
    it('tilts the category labels', async () => {
      const c = await rotated('45');
      const el = labelEl(c, 'North East Region')!;
      expect(el.getAttribute('transform')).toMatch(/^rotate\(-45 /);
    });

    it('leaves them upright at zero', async () => {
      const c = await rotated('0');
      expect(labelEl(c, 'North East Region')!.getAttribute('transform')).toBeNull();
    });

    it('anchors a positive tilt at the end, so it hangs back from its tick', async () => {
      const c = await rotated('45');
      expect(labelEl(c, 'North East Region')!.getAttribute('text-anchor')).toBe('end');
    });

    it('anchors a negative tilt at the start', async () => {
      const c = await rotated('-45');
      const el = labelEl(c, 'North East Region')!;
      expect(el.getAttribute('text-anchor')).toBe('start');
      expect(el.getAttribute('transform')).toMatch(/^rotate\(45 /);
    });

    it('rotates about the tick point, not the origin', async () => {
      const c = await rotated('45');
      const el = labelEl(c, 'North East Region')!;
      const [, cx, cy] = el.getAttribute('transform')!.match(/rotate\(-45 ([\d.]+) ([\d.]+)\)/)!;
      expect(+cx).toBeCloseTo(+el.getAttribute('x')!, 6);
      expect(+cy).toBeCloseTo(+el.getAttribute('y')!, 6);
    });

    it('clamps past vertical rather than drawing upside-down text', async () => {
      const c = await rotated('160');
      expect(labelEl(c, 'North East Region')!.getAttribute('transform')).toMatch(/^rotate\(-90 /);
    });

    it('ignores a value it cannot parse', async () => {
      const c = await rotated('sideways');
      expect(labelEl(c, 'North East Region')!.getAttribute('transform')).toBeNull();
    });
  });

  describe('what it is for', () => {
    it('shows labels the automatic interval was skipping', async () => {
      const upright = await chart(`<dc-axis position="bottom"></dc-axis>${longBars}`);
      const tilted = await rotated('45');
      expect(categoryLabels(upright).length).toBeLessThan(LONG_LABELS.length);
      expect(categoryLabels(tilted)).toHaveLength(LONG_LABELS.length);
    });

    it('reserves depth below the axis for the tilted text', async () => {
      const upright = await chart(`<dc-axis position="bottom"></dc-axis>${longBars}`);
      const tilted = await rotated('45');
      expect(tilted['getChartPadding']().bottom)
        .toBeGreaterThan(upright['getChartPadding']().bottom);
    });

    it('reserves more depth the steeper the tilt', async () => {
      const shallow = await rotated('30');
      const steep = await rotated('75');
      expect(steep['getChartPadding']().bottom)
        .toBeGreaterThan(shallow['getChartPadding']().bottom);
    });

    it('reserves sideways room so the first label is not clipped', async () => {
      // A tilted label trails away from its tick, and the one at the end of the
      // axis hangs past the edge: "North East Region" came out as "rth East
      // Region" before this. The gutter has to be at least as wide as the first
      // label's horizontal reach.
      const first = 'An Extremely Long Category Name Indeed';
      const c = await chart(
        `<dc-axis position="bottom" label-rotate="45"></dc-axis>` +
          `<dc-bar value="30" label="${first}"></dc-bar>` +
          `<dc-bar value="70" label="Short"></dc-bar>`
      );
      const reach = c['measureText'](first, c['fontSize'](12)) * Math.cos(Math.PI / 4);
      expect(reach).toBeGreaterThan(0);
      expect(c['getChartPadding']().left).toBeGreaterThanOrEqual(reach);
    });

    it('reserves the sideways room on the right for a negative tilt', async () => {
      const c = await rotated('-45');
      expect(c['getChartPadding']().right).toBeGreaterThan(0);
    });
  });

  describe('scope', () => {
    it('leaves group labels upright', async () => {
      // A second tier under the category labels; tilting both makes a thicket.
      const c = await chart(
        `<dc-axis position="bottom" label-rotate="45"></dc-axis>` +
          `<dc-bar-group label="Region A"><dc-bar value="30" label="Q1"></dc-bar>` +
          `<dc-bar value="50" label="Q2"></dc-bar></dc-bar-group>`
      );
      expect(labelEl(c, 'Region A')!.getAttribute('transform')).toBeNull();
    });

    it('drops group labels below the tilted tier', async () => {
      const upright = await chart(
        `<dc-bar-group label="Region A"><dc-bar value="30" label="Q1"></dc-bar></dc-bar-group>`
      );
      const tilted = await chart(
        `<dc-axis position="bottom" label-rotate="60"></dc-axis>` +
          `<dc-bar-group label="Region A"><dc-bar value="30" label="Q1"></dc-bar></dc-bar-group>`
      );
      expect(+labelEl(tilted, 'Region A')!.getAttribute('y')!)
        .toBeGreaterThan(+labelEl(upright, 'Region A')!.getAttribute('y')!);
    });

    it('does nothing on the value axis', async () => {
      const c = await chart(`<dc-axis position="left" label-rotate="45"></dc-axis>${longBars}`);
      expect(labelEl(c, 'North East Region')!.getAttribute('transform')).toBeNull();
    });

    it('does nothing on a horizontal chart', async () => {
      // position="left" *is* the category axis on a horizontal chart, so this
      // is the case the scope guard exists for - a bottom axis there would be
      // declined for being the value axis, and prove nothing.
      //
      // Declined rather than honoured because the left gutter has a different
      // label-emission path and its own padding maths: a tilt would apply and
      // the room reserved for it would not.
      const c = await chart(
        `<dc-axis position="left" label-rotate="45"></dc-axis>${longBars}`,
        { orientation: 'horizontal' }
      );
      const plain = await chart(
        `<dc-axis position="left"></dc-axis>${longBars}`,
        { orientation: 'horizontal' }
      );

      expect(labelEl(c, 'North East Region')!.getAttribute('transform')).toBeNull();
      // And it must not half-apply. The tilt feeds the automatic interval as
      // well as the transform, so declining one without the other stops labels
      // being skipped and then crams them in upright.
      expect(categoryLabels(c)).toHaveLength(categoryLabels(plain).length);
      expect(categoryLabels(plain).length).toBeLessThan(LONG_LABELS.length);
    });

    it('tilts a line chart\'s category labels too', async () => {
      const c = await chart(
        `<dc-axis position="bottom" label-rotate="45"></dc-axis>` +
          `<dc-line label="L"><dc-point value="10" label="North East Region"></dc-point>` +
          `<dc-point value="20" label="South West Region"></dc-point></dc-line>`
      );
      expect(labelEl(c, 'North East Region')!.getAttribute('transform')).toMatch(/^rotate\(-45 /);
    });
  });

  describe('reactivity', () => {
    it('redraws when the angle changes', async () => {
      const c = await rotated('45');
      c.querySelector('dc-axis')!.setAttribute('label-rotate', '70');
      await elementUpdated(c);
      expect(labelEl(c, 'North East Region')!.getAttribute('transform')).toMatch(/^rotate\(-70 /);
    });
  });
});
