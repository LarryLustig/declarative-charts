import { describe, it, expect, afterEach } from 'vitest';
import { fixture } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';

/**
 * Tests for `<dc-axis type="time">`.
 *
 * The feature was documented in API.md, demonstrated in `examples/`, and had a
 * passing visual baseline — of output that ignored it entirely. Every piece
 * existed (`parseTimeScale`, `getTimeX`, `renderTimeAxisLabels` in
 * `axis-chart.ts`, and the parsers in `date-utils.ts`) and **nothing called
 * them**, so `type="time"` rendered the raw label strings spaced evenly by
 * index. Found by the dead-attribute sweep.
 *
 * The distinction that matters throughout: on a time axis a point sits where
 * its *date* falls, not where its turn comes. Three samples a week apart and
 * then a two-month gap must not be drawn evenly spaced.
 */

const chartWith = (axis: string, points: string) =>
  fixture<Chart>('dc-chart', { width: '600', height: '400' },
    `<dc-axis position="bottom" ${axis}></dc-axis><dc-line label="Series">${points}</dc-line>`);

/** Rendered x coordinates of the line's vertices, in order. */
const pointXs = (chart: Chart): number[] => {
  const d = chart.shadowRoot!.querySelector('path.line-path')?.getAttribute('d') ?? '';
  return [...d.matchAll(/[ML] ?([\d.]+)/g)].map(m => Math.round(parseFloat(m[1])));
};

/**
 * Axis labels along the *category* axis.
 *
 * `part="axis-label"` covers the value axis too, so the numeric ticks are
 * filtered out by position: the category axis sits below the plot.
 */
const axisLabels = (chart: Chart): string[] => {
  const all = Array.from(
    chart.shadowRoot!.querySelectorAll<SVGTextElement>('text[part="axis-label"]')
  ).map(t => ({ y: parseFloat(t.getAttribute('y') ?? '0'), text: t.textContent?.trim() ?? '' }));
  if (all.length === 0) return [];

  // The value axis uses the same part name, and its lowest ticks sit close to
  // the bottom of the plot. The category labels are the row *below* the axis
  // line, so they all share the single largest y.
  const bottom = Math.max(...all.map(l => l.y));
  return all.filter(l => l.y === bottom).map(l => l.text);
};

/** Jan 1, Jan 8, then a long gap to Mar 1. */
const UNEVEN = `
  <dc-point value="10" label="2024-01-01"></dc-point>
  <dc-point value="20" label="2024-01-08"></dc-point>
  <dc-point value="30" label="2024-03-01"></dc-point>`;

const gaps = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i]);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('positioning by date', () => {
  it('spaces points by the time between them', async () => {
    const xs = pointXs(await chartWith('type="time"', UNEVEN));
    expect(xs).toHaveLength(3);

    // Jan 1 -> Jan 8 is a week; Jan 8 -> Mar 1 is over seven. The second gap
    // must be far wider, which is the whole point of a time axis.
    const [first, second] = gaps(xs);
    expect(second).toBeGreaterThan(first * 5);
  });

  it('spaces them evenly without type="time"', async () => {
    const [first, second] = gaps(pointXs(await chartWith('', UNEVEN)));
    expect(first).toBeCloseTo(second, 0);
  });

  it('puts the first and last points at the ends of the plot', async () => {
    const xs = pointXs(await chartWith('type="time"', UNEVEN));
    const plain = pointXs(await chartWith('', UNEVEN));
    expect(xs[0]).toBeCloseTo(plain[0], 0);
    expect(xs[xs.length - 1]).toBeCloseTo(plain[plain.length - 1], 0);
  });

  it('keeps points in chronological order even when the markup is not', async () => {
    const xs = pointXs(await chartWith('type="time"', `
      <dc-point value="30" label="2024-03-01"></dc-point>
      <dc-point value="10" label="2024-01-01"></dc-point>`));
    // Drawn in document order, so the March point is emitted first - but it
    // must still sit to the right of January.
    expect(xs[0]).toBeGreaterThan(xs[1]);
  });
});

describe('tick labels', () => {
  it('labels its own tick dates rather than every datapoint', async () => {
    const chart = await chartWith('type="time" date-label-format="MMM d"', UNEVEN);
    const labels = axisLabels(chart);
    expect(labels.length).toBeGreaterThan(3);
    expect(labels, labels.join(' | ')).toSatisfy((ls: string[]) =>
      ls.every(l => /^[A-Z][a-z]{2} \d+$/.test(l)));
  });

  it('shows no raw ISO strings once the axis is a time axis', async () => {
    const chart = await chartWith('type="time" date-label-format="MMM d"', UNEVEN);
    const all = Array.from(chart.shadowRoot!.querySelectorAll('text'))
      .map(t => t.textContent ?? '')
      .join(' ');
    expect(all).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('picks a format itself when none is given', async () => {
    const labels = axisLabels(await chartWith('type="time"', UNEVEN));
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(l => l.length > 0)).toBe(true);
  });

  it('honours an explicit date-label-format', async () => {
    const labels = axisLabels(await chartWith('type="time" date-label-format="yyyy-MM"', UNEVEN));
    expect(labels.length).toBeGreaterThan(0);
    expect(labels, labels.join(' | ')).toSatisfy((ls: string[]) =>
      ls.every(l => /^\d{4}-\d{2}$/.test(l)));
  });
});

describe('date-format', () => {
  // 2024-01-01, 2024-01-08 and 2024-03-01 as Unix seconds.
  const TIMESTAMPS = `
    <dc-point value="10" label="1704067200"></dc-point>
    <dc-point value="20" label="1704672000"></dc-point>
    <dc-point value="30" label="1709251200"></dc-point>`;

  it('reads Unix seconds when told to', async () => {
    const xs = pointXs(await chartWith('type="time" date-format="timestamp"', TIMESTAMPS));
    const iso = pointXs(await chartWith('type="time"', UNEVEN));
    expect(xs).toEqual(iso);
  });

  it('treats the same digits as plain labels without it', async () => {
    const [first, second] = gaps(pointXs(await chartWith('type="time"', TIMESTAMPS)));
    // Unparseable as dates, so the axis falls back to even spacing.
    expect(first).toBeCloseTo(second, 0);
  });
});

describe('when it cannot be a time axis', () => {
  it('falls back to category labels when the labels are not dates', async () => {
    const chart = await chartWith('type="time"', `
      <dc-point value="10" label="not a date"></dc-point>
      <dc-point value="20" label="also not"></dc-point>`);
    const all = Array.from(chart.shadowRoot!.querySelectorAll('text'))
      .map(t => t.textContent?.trim() ?? '');
    expect(all).toContain('not a date');
  });

  it('logs DC106 when there are too few valid dates', async () => {
    const chart = await chartWith('type="time"',
      '<dc-point value="10" label="2024-01-01"></dc-point><dc-point value="20" label="nope"></dc-point>');
    const logged = JSON.stringify((chart as unknown as { logEntries: unknown }).logEntries);
    expect(logged).toContain('DC106');
  });

  /**
   * Bars occupy fixed slots along the category axis. Positioning the ticks by
   * date would put them where no bar is, so a time scale is declined and the
   * reason logged rather than drawing a chart whose labels do not line up.
   */
  it('declines to apply a time scale to a bar chart', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400', logging: 'info' }, `
      <dc-axis position="bottom" type="time"></dc-axis>
      <dc-bar value="10" label="2024-01-01"></dc-bar>
      <dc-bar value="20" label="2024-03-01"></dc-bar>`);
    const all = Array.from(chart.shadowRoot!.querySelectorAll('text'))
      .map(t => t.textContent?.trim() ?? '');
    expect(all).toContain('2024-01-01');
  });
});

describe('areas and bubbles', () => {
  it('positions area points by date', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-axis position="bottom" type="time"></dc-axis>
      <dc-area label="A">${UNEVEN}</dc-area>`);
    const d = chart.shadowRoot!.querySelector('path.area-path')?.getAttribute('d') ?? '';
    const xs = [...d.matchAll(/[ML] ?([\d.]+)/g)].map(m => Math.round(parseFloat(m[1])));
    expect(xs.length).toBeGreaterThanOrEqual(3);
    expect(new Set(gaps(xs.slice(0, 3))).size).toBeGreaterThan(1);
  });

  it('positions bubbles by date', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-axis position="bottom" type="time"></dc-axis>
      <dc-bubble value="10" size-value="5" label="2024-01-01"></dc-bubble>
      <dc-bubble value="20" size-value="8" label="2024-01-08"></dc-bubble>
      <dc-bubble value="30" size-value="9" label="2024-03-01"></dc-bubble>`);
    const xs = Array.from(chart.shadowRoot!.querySelectorAll('circle[data-shape-index]'))
      .map(c => Math.round(parseFloat(c.getAttribute('cx') ?? '0')));
    const [first, second] = gaps(xs);
    expect(second).toBeGreaterThan(first * 5);
  });
});

describe('multiple series', () => {
  it('places two series on the same time scale', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-axis position="bottom" type="time"></dc-axis>
      <dc-line label="A">
        <dc-point value="10" label="2024-01-01"></dc-point>
        <dc-point value="30" label="2024-03-01"></dc-point>
      </dc-line>
      <dc-line label="B">
        <dc-point value="15" label="2024-01-01"></dc-point>
        <dc-point value="25" label="2024-03-01"></dc-point>
      </dc-line>`);
    const paths = Array.from(chart.shadowRoot!.querySelectorAll('path.line-path'))
      .map(p => [...(p.getAttribute('d') ?? '').matchAll(/[ML] ?([\d.]+)/g)]
        .map(m => Math.round(parseFloat(m[1]))));
    expect(paths).toHaveLength(2);
    // The same dates must land on the same x in both series.
    expect(paths[0]).toEqual(paths[1]);
  });
});
