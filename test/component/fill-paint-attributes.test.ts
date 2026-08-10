import { describe, it, expect, afterEach } from 'vitest';
import { fixture } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';

/**
 * `<dc-fill>`'s SVG paint attributes must reach the shape they style.
 *
 * Nine of them — `fill-opacity`, `fill-rule`, `stroke-width`, `stroke-opacity`,
 * `stroke-dasharray`, `stroke-dashoffset`, `stroke-linecap`, `stroke-linejoin`
 * and `stroke-miterlimit` — were declared on the element, documented in API.md,
 * and read by nothing. A `<dc-fill stroke-width="4">` in a palette parsed,
 * matched an element, and changed no pixel.
 *
 * `no-dead-attributes.test.ts` guards that they change *something*. These pin
 * that they change the *right* thing: the value that lands on the shape, which
 * elements they apply to, and who wins when two sources disagree.
 */

const PAINT = [
  ['fill-opacity', '0.25', '0.25'],
  ['fill-rule', 'evenodd', 'evenodd'],
  ['stroke-width', '4', '4'],
  ['stroke-opacity', '0.3', '0.3'],
  ['stroke-dasharray', 'dashed', '5 5'],
  ['stroke-dashoffset', '4', '4'],
  ['stroke-linecap', 'square', 'square'],
  ['stroke-linejoin', 'bevel', 'bevel'],
  ['stroke-miterlimit', '2', '2']
] as const;

const withPalette = (fillAttrs: string, inner: string, tag = 'dc-chart', chartAttrs = '') =>
  fixture<HTMLElement>('div', {}, `
    <dc-palette id="pp"><dc-fill label="Alpha" fill="#f00" ${fillAttrs}></dc-fill></dc-palette>
    <${tag} width="600" height="450" palette="pp" ${chartAttrs}>${inner}</${tag}>`);

const shapeOf = async (wrapper: HTMLElement, tag: string, selector: string) => {
  const chart = wrapper.querySelector(tag) as HTMLElement & { updateComplete: Promise<boolean> };
  for (let i = 0; i < 10; i++) if (await chart.updateComplete) break;
  return chart.shadowRoot!.querySelector(selector);
};

const BARS = '<dc-bar value="30" label="Alpha"></dc-bar><dc-bar value="70" label="Beta"></dc-bar>';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('a matched <dc-fill> paints the shape', () => {
  it.each(PAINT)('applies %s="%s" as "%s"', async (attr, given, expected) => {
    const w = await withPalette(`${attr}="${given}"`, BARS);
    const rect = await shapeOf(w, 'dc-chart', 'rect[data-shape-index="0"]');
    expect(rect?.getAttribute(attr)).toBe(expected);
  });

  it('leaves unmatched elements alone', async () => {
    const w = await withPalette('stroke-width="4"', BARS);
    const beta = await shapeOf(w, 'dc-chart', 'rect[data-shape-index="1"]');
    expect(beta?.getAttribute('stroke-width')).not.toBe('4');
  });

  it('sets nothing when the fill sets nothing', async () => {
    const w = await withPalette('', BARS);
    const rect = await shapeOf(w, 'dc-chart', 'rect[data-shape-index="0"]');
    for (const [attr] of PAINT) {
      // stroke-width is written by the renderer itself; the rest must be absent.
      if (attr === 'stroke-width') continue;
      expect(rect?.getAttribute(attr), attr).toBeNull();
    }
  });

  // An element that states its own fill has said how it wants to look.
  it('does not paint an element that sets its own fill', async () => {
    const w = await withPalette('stroke-width="4"',
      '<dc-bar value="30" label="Alpha" fill="#00ff00"></dc-bar>');
    const rect = await shapeOf(w, 'dc-chart', 'rect[data-shape-index="0"]');
    expect(rect?.getAttribute('stroke-width')).not.toBe('4');
  });

  // Each iteration clears the document first: every palette here uses id="pp",
  // and a leftover one from the previous loop keeps winning the lookup.
  it.each([['dotted', '1 3'], ['long-dash', '10 5'], ['dash-dot', '5 3 1 3']])(
    'resolves the named dash pattern %s, like <dc-grid> does',
    async (name, expected) => {
      document.body.innerHTML = '';
      const w = await withPalette(`stroke-dasharray="${name}"`, BARS);
      const rect = await shapeOf(w, 'dc-chart', 'rect[data-shape-index="0"]');
      expect(rect?.getAttribute('stroke-dasharray')).toBe(expected);
    }
  );

  it('passes a raw dash list through untouched', async () => {
    const w = await withPalette('stroke-dasharray="7 2 1 2"', BARS);
    const rect = await shapeOf(w, 'dc-chart', 'rect[data-shape-index="0"]');
    expect(rect?.getAttribute('stroke-dasharray')).toBe('7 2 1 2');
  });

  /**
   * An author's own passthrough attribute is more specific than a palette
   * entry, so it wins. Both are stamped in the same post-render pass.
   */
  it('yields to an attribute written on the element itself', async () => {
    const w = await withPalette('stroke-width="4"',
      '<dc-bar value="30" label="Alpha" stroke-width="11"></dc-bar>');
    const rect = await shapeOf(w, 'dc-chart', 'rect[data-shape-index="0"]');
    expect(rect?.getAttribute('stroke-width')).toBe('11');
  });
});

describe('every chart type honours it', () => {
  it.each([
    ['dc-chart', 'rect[data-shape-index]', '<dc-bar value="30" label="Alpha"></dc-bar>'],
    ['dc-pie-chart', 'path[data-shape-index]', '<dc-pie-slice value="30" label="Alpha"></dc-pie-slice>'],
    ['dc-funnel-chart', 'polygon[data-shape-index]', '<dc-funnel-stage value="30" label="Alpha"></dc-funnel-stage>'],
    ['dc-stage-chart', '[data-shape-index]', '<dc-stage value="30" label="Alpha"></dc-stage>']
  ])('%s applies all nine', async (tag, selector, inner) => {
    const attrs = PAINT.map(([a, given]) => `${a}="${given}"`).join(' ');
    const w = await withPalette(attrs, inner, tag);
    const shape = await shapeOf(w, tag, selector);
    for (const [attr, , expected] of PAINT) {
      expect(shape?.getAttribute(attr), `${tag} ${attr}`).toBe(expected);
    }
  });
});

describe('per-element show-label', () => {
  const labels = async (inner: string, chartAttrs = '') => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400', ...Object.fromEntries(
      chartAttrs ? [chartAttrs.split('=').map(x => x.replace(/"/g, ''))] : []
    ) }, inner);
    return Array.from(chart.shadowRoot!.querySelectorAll('text'))
      .map(t => t.textContent?.trim() ?? '')
      .filter(t => /Alpha|Beta/.test(t));
  };

  it('shows both labels by default', async () => {
    expect(await labels(BARS)).toEqual(['Alpha', 'Beta']);
  });

  // <dc-bar show-label> was declared on BaseFilledShape and read by nothing.
  it('hides one bar\'s label without touching the other', async () => {
    const out = await labels(
      '<dc-bar value="30" label="Alpha" show-label="false"></dc-bar>' +
      '<dc-bar value="70" label="Beta"></dc-bar>');
    expect(out).toEqual(['Beta']);
  });

  it('accepts a percentage threshold, like the other show-* attributes', async () => {
    const out = await labels(
      '<dc-bar value="30" label="Alpha" show-label="50%"></dc-bar>' +
      '<dc-bar value="70" label="Beta" show-label="50%"></dc-bar>');
    expect(out).toEqual(['Beta']);
  });

  it('accepts a value threshold', async () => {
    const out = await labels(
      '<dc-bar value="30" label="Alpha" show-label="50"></dc-bar>' +
      '<dc-bar value="70" label="Beta" show-label="50"></dc-bar>');
    expect(out).toEqual(['Beta']);
  });

  it('is switched off for the whole chart by show-label="false"', async () => {
    expect(await labels(BARS, 'show-label="false"')).toEqual([]);
  });
});
