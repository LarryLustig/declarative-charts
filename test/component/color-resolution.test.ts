import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fixture } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-palette';
import '../../src/chart-fill';
import { Chart } from '../../src/chart';

/**
 * Characterization tests for the colour system in BaseChart.
 *
 * Written *before* extracting `ColorResolver` and deliberately asserting on
 * current behaviour rather than on what the behaviour ought to be. Their job is
 * to fail if the extraction changes anything, so they pin exact values - even
 * where a value looks arbitrary. If one of these ever needs updating, that is a
 * behaviour change and should be a deliberate decision, not a refactor's
 * side effect. See docs/review.md 5.1.
 */

/** Reach the protected colour API without widening it for real consumers. */
type ColorApi = {
  getPalette(): unknown;
  lookupPaletteColor(label?: string, value?: number): { fill?: string; stroke?: string };
  isHighContrastActive(): boolean;
  getHighContrastColors(count: number): string[];
  parseColor(color: string): [number, number, number] | null;
  getLuminance(color: string): number;
  getContrastingTextColor(bgColor: string): string;
  calculateLabelFill(
    explicitFill: string | undefined, isInsideShape: boolean,
    shapeFill: string, chartBackground?: string): string;
  generatePaletteColors(count: number, seed?: number): string[];
  resolveColors(count: number, options?: {
    elementColors?: string[]; paletteColors?: string[]; defaultColor?: string }): string[];
  getPaletteColors(count: number, colorType?: 'fill' | 'stroke'): string[] | undefined;
  resolveFillColorsWithPalette(
    elements: Array<{ fill?: string; label?: string; value?: number }>,
    defaultColor?: string): string[];
  resolveStrokeColorsWithPalette(
    elements: Array<{ stroke?: string; label?: string; value?: number }>,
    defaultColor?: string): string[];
  resolvePatternAttribute(
    patternAttr: string | undefined, elementStroke?: string,
    elementFill?: string, elementScale?: number): unknown;
  parseStroke(): { color?: string; width?: number };
  getEffectiveStroke(defaultColor?: string, defaultWidth?: number): { color: string; width: number };
};

const api = (chart: Chart) => chart as unknown as ColorApi;

const makeChart = (attrs: Record<string, string> = {}) =>
  fixture<Chart>('dc-chart', { width: '600', height: '400', ...attrs },
    '<dc-bar value="10" label="A"></dc-bar>');

describe('colour parsing and luminance', () => {
  it('parses hex, short hex and rgb', async () => {
    const c = api(await makeChart());
    expect(c.parseColor('#ff0000')).toEqual([255, 0, 0]);
    expect(c.parseColor('#f00')).toEqual([255, 0, 0]);
    expect(c.parseColor('rgb(18, 52, 86)')).toEqual([18, 52, 86]);
    expect(c.parseColor('#0a0b0c')).toEqual([10, 11, 12]);
  });

  it('returns null for values it cannot parse', async () => {
    const c = api(await makeChart());
    expect(c.parseColor('nonsense')).toBeNull();
    expect(c.parseColor('')).toBeNull();
  });

  it('computes luminance on the documented scale', async () => {
    const c = api(await makeChart());
    expect(c.getLuminance('#ffffff')).toBeCloseTo(1, 3);
    expect(c.getLuminance('#000000')).toBeCloseTo(0, 3);
    // Mid grey is well below 0.5 because luminance is gamma-corrected.
    expect(c.getLuminance('#808080')).toBeCloseTo(0.2159, 3);
    expect(c.getLuminance('#ff0000')).toBeCloseTo(0.2126, 3);
  });

  // Pinning the exact strings the library uses - a near-black '#333' and the
  // keyword 'white', not a hex pair. Characterization: recording what is, not
  // arguing for what ought to be.
  it('picks readable text for a background', async () => {
    const c = api(await makeChart());
    expect(c.getContrastingTextColor('#ffffff')).toBe('#333');
    expect(c.getContrastingTextColor('#000000')).toBe('white');
    expect(c.getContrastingTextColor('#ff0000')).toBe('white');
    expect(c.getContrastingTextColor('#ffff00')).toBe('#333');
  });
});

describe('label fill selection', () => {
  it('honours an explicit fill', async () => {
    const c = api(await makeChart());
    expect(c.calculateLabelFill('#123456', true, '#000000')).toBe('#123456');
  });

  it('treats "auto" as no explicit fill', async () => {
    const c = api(await makeChart());
    expect(c.calculateLabelFill('auto', true, '#000000')).toBe('white');
  });

  it('contrasts against the shape when inside it', async () => {
    const c = api(await makeChart());
    expect(c.calculateLabelFill(undefined, true, '#000000')).toBe('white');
    expect(c.calculateLabelFill(undefined, true, '#ffffff')).toBe('#333');
  });

  it('contrasts against the chart background when outside the shape', async () => {
    const c = api(await makeChart());
    expect(c.calculateLabelFill(undefined, false, '#000000', '#ffffff')).toBe('#333');
    expect(c.calculateLabelFill(undefined, false, '#ffffff', '#000000')).toBe('white');
  });
});

describe('generated palette colours', () => {
  it('is deterministic across calls', async () => {
    const c = api(await makeChart());
    expect(c.generatePaletteColors(5)).toEqual(c.generatePaletteColors(5));
  });

  it('is deterministic across separate charts', async () => {
    const a = api(await makeChart());
    const b = api(await makeChart());
    expect(a.generatePaletteColors(4)).toEqual(b.generatePaletteColors(4));
  });

  it('produces the requested count of distinct colours', async () => {
    const c = api(await makeChart());
    const colors = c.generatePaletteColors(6);
    expect(colors).toHaveLength(6);
    expect(new Set(colors).size).toBe(6);
    colors.forEach(col => expect(col).toMatch(/^(#[0-9a-f]{6}|hsl\(|rgb\()/i));
  });

  it('honours the seed', async () => {
    const c = api(await makeChart());
    expect(c.generatePaletteColors(3, 0.5)).not.toEqual(c.generatePaletteColors(3, 0.1));
    expect(c.generatePaletteColors(3, 0.5)).toEqual(c.generatePaletteColors(3, 0.5));
  });

  it('returns nothing for a count of zero', async () => {
    const c = api(await makeChart());
    expect(c.generatePaletteColors(0)).toEqual([]);
  });
});

describe('colour resolution priority', () => {
  it('prefers element colours over everything else', async () => {
    const c = api(await makeChart());
    const result = c.resolveColors(3, {
      elementColors: ['#111111', '', '#333333'],
      paletteColors: ['#aaaaaa', '#bbbbbb', '#cccccc'],
      defaultColor: '#999999'
    });
    expect(result[0]).toBe('#111111');
    expect(result[2]).toBe('#333333');
    // The gap falls through to the palette, not the default.
    expect(result[1]).toBe('#bbbbbb');
  });

  it('falls back to palette, then default', async () => {
    const c = api(await makeChart());
    expect(c.resolveColors(2, { paletteColors: ['#aaaaaa', '#bbbbbb'] }))
      .toEqual(['#aaaaaa', '#bbbbbb']);
    expect(c.resolveColors(2, { defaultColor: '#999999' }))
      .toEqual(['#999999', '#999999']);
  });

  it('returns an empty list for a count of zero', async () => {
    const c = api(await makeChart());
    expect(c.resolveColors(0)).toEqual([]);
  });
});

describe('built-in palettes', () => {
  it('resolves a named palette in order', async () => {
    const c = api(await makeChart({ palette: 'category10' }));
    const colors = c.getPaletteColors(3);
    expect(colors).toHaveLength(3);
    expect(colors![0]).toMatch(/^#/);
    // Stable across calls - charts must not shuffle between renders.
    expect(c.getPaletteColors(3)).toEqual(colors);
  });

  it('returns undefined with no palette set', async () => {
    const c = api(await makeChart());
    expect(c.getPaletteColors(3)).toBeUndefined();
  });

  it('cycles a sequential palette to the requested count', async () => {
    const c = api(await makeChart({ palette: 'blues' }));
    expect(c.getPaletteColors(7)).toHaveLength(7);
  });

  // Note: unknown names fall through to undefined rather than warning. Recorded
  // because the extraction must not change it.
  it('returns undefined for an unrecognised palette name', async () => {
    const c = api(await makeChart({ palette: 'not-a-real-palette' }));
    expect(c.getPaletteColors(3)).toBeUndefined();
  });

  it('extends a categorical palette past its length', async () => {
    const c = api(await makeChart({ palette: 'category10' }));
    expect(c.getPaletteColors(12)).toHaveLength(12);
  });

  it('distinguishes fill from stroke requests', async () => {
    const c = api(await makeChart({ palette: 'category10' }));
    expect(c.getPaletteColors(3, 'fill')).toHaveLength(3);
    expect(c.getPaletteColors(3, 'stroke')).toHaveLength(3);
  });
});

describe('user-defined palettes', () => {
  let palette: HTMLElement;

  beforeEach(() => {
    palette = document.createElement('dc-palette');
    palette.id = 'status';
    palette.innerHTML = `
      <dc-fill label="Critical" fill="#fee2e2" stroke="#dc2626"></dc-fill>
      <dc-fill label="Warning" fill="#fef3c7" stroke="#f59e0b"></dc-fill>
      <dc-fill label="OK" fill="#10b981"></dc-fill>`;
    document.body.appendChild(palette);
  });

  afterEach(() => palette.remove());

  it('matches fills by label', async () => {
    const c = api(await makeChart({ palette: 'status' }));
    const colors = c.resolveFillColorsWithPalette([
      { label: 'Warning' }, { label: 'Critical' }, { label: 'OK' }
    ]);
    expect(colors).toEqual(['#fef3c7', '#fee2e2', '#10b981']);
  });

  it('matches strokes by label', async () => {
    const c = api(await makeChart({ palette: 'status' }));
    const colors = c.resolveStrokeColorsWithPalette([
      { label: 'Critical' }, { label: 'Warning' }
    ]);
    expect(colors).toEqual(['#dc2626', '#f59e0b']);
  });

  it('lets an element fill beat a palette match', async () => {
    const c = api(await makeChart({ palette: 'status' }));
    const colors = c.resolveFillColorsWithPalette([
      { label: 'Critical', fill: '#000000' }, { label: 'Warning' }
    ]);
    expect(colors[0]).toBe('#000000');
    expect(colors[1]).toBe('#fef3c7');
  });

  it('falls back to positional colours for unmatched labels', async () => {
    const c = api(await makeChart({ palette: 'status' }));
    const colors = c.resolveFillColorsWithPalette([
      { label: 'Nothing matches this' }, { label: 'OK' }
    ]);
    expect(colors[1]).toBe('#10b981');
    expect(colors[0]).toBeTruthy();
    expect(colors[0]).not.toBe('#10b981');
  });

  it('looks a colour up directly', async () => {
    const c = api(await makeChart({ palette: 'status' }));
    expect(c.lookupPaletteColor('Critical')).toMatchObject({ fill: '#fee2e2', stroke: '#dc2626' });
    expect(c.lookupPaletteColor('Absent')).toEqual({});
  });

  it('returns no palette when the id matches nothing', async () => {
    const c = api(await makeChart({ palette: 'does-not-exist' }));
    expect(c.getPalette()).toBeNull();
  });

  it('handles an empty element list', async () => {
    const c = api(await makeChart({ palette: 'status' }));
    expect(c.resolveFillColorsWithPalette([])).toEqual([]);
    expect(c.resolveStrokeColorsWithPalette([])).toEqual([]);
  });
});

describe('high contrast', () => {
  it('is off unless requested', async () => {
    const c = api(await makeChart());
    expect(c.isHighContrastActive()).toBe(false);
  });

  it('activates on the attribute', async () => {
    const c = api(await makeChart({ 'high-contrast': '' }));
    expect(c.isHighContrastActive()).toBe(true);
  });

  it('supplies distinct high-contrast colours', async () => {
    const c = api(await makeChart({ 'high-contrast': '' }));
    const colors = c.getHighContrastColors(4);
    expect(colors).toHaveLength(4);
    expect(new Set(colors).size).toBe(4);
  });
});

describe('stroke resolution', () => {
  it('parses the stroke shorthand in either order', async () => {
    expect(api(await makeChart({ stroke: '2 #333333' })).parseStroke())
      .toMatchObject({ color: '#333333', width: 2 });
    expect(api(await makeChart({ stroke: '#333333 2' })).parseStroke())
      .toMatchObject({ color: '#333333', width: 2 });
  });

  it('lets an explicit stroke-width beat the shorthand', async () => {
    const c = api(await makeChart({ stroke: '2 #333333', 'stroke-width': '5' }));
    expect(c.getEffectiveStroke().width).toBe(5);
    expect(c.getEffectiveStroke().color).toBe('#333333');
  });

  it('falls back to the supplied defaults', async () => {
    const c = api(await makeChart());
    expect(c.getEffectiveStroke('#e0e0e0', 1)).toEqual({ color: '#e0e0e0', width: 1 });
  });
});

describe('pattern resolution', () => {
  it('resolves a built-in pattern name', async () => {
    const c = api(await makeChart());
    expect(c.resolvePatternAttribute('diagonal-lines')).not.toBeNull();
  });

  it('returns null when no pattern is requested', async () => {
    const c = api(await makeChart());
    expect(c.resolvePatternAttribute(undefined)).toBeNull();
    expect(c.resolvePatternAttribute('')).toBeNull();
  });

  it('returns null for an unknown pattern', async () => {
    const c = api(await makeChart());
    expect(c.resolvePatternAttribute('not-a-pattern')).toBeNull();
  });
});

/**
 * End-to-end: the colours that actually reach the DOM. If the extraction breaks
 * the wiring rather than the arithmetic, the unit-level assertions above could
 * all still pass - these would not.
 */
describe('rendered output', () => {
  const fills = (chart: Chart) =>
    Array.from(chart.shadowRoot!.querySelectorAll('rect[part="bar"]'))
      .map(r => r.getAttribute('fill'));

  it('applies a built-in palette to bars', async () => {
    const chart = await fixture<Chart>('dc-chart',
      { width: '600', height: '400', palette: 'category10' }, `
      <dc-bar value="10" label="A"></dc-bar>
      <dc-bar value="20" label="B"></dc-bar>
      <dc-bar value="30" label="C"></dc-bar>`);
    const applied = fills(chart);

    expect(applied).toHaveLength(3);
    expect(new Set(applied).size).toBe(3);
    applied.forEach(f => expect(f).toMatch(/^#|^url\(|^rgb/));
  });

  it('lets a per-bar fill win', async () => {
    const chart = await fixture<Chart>('dc-chart',
      { width: '600', height: '400', palette: 'category10' }, `
      <dc-bar value="10" label="A" fill="#abcdef"></dc-bar>
      <dc-bar value="20" label="B"></dc-bar>`);
    expect(fills(chart)[0]).toBe('#abcdef');
  });

  it('is stable across re-renders', async () => {
    const chart = await fixture<Chart>('dc-chart',
      { width: '600', height: '400', palette: 'viridis' }, `
      <dc-bar value="10" label="A"></dc-bar>
      <dc-bar value="20" label="B"></dc-bar>`);
    const before = fills(chart);

    chart.requestUpdate();
    await chart.updateComplete;

    expect(fills(chart)).toEqual(before);
  });

  it('gives auto-generated colours when no palette is set', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"></dc-bar>
      <dc-bar value="20" label="B"></dc-bar>`);
    const applied = fills(chart);

    expect(applied).toHaveLength(2);
    applied.forEach(f => expect(f).toBeTruthy());
  });
});
