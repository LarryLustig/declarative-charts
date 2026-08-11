import { describe, it, expect } from 'vitest';
import { fixture } from './setup';
import '../../src/index';
import { escapeHtml, popupHtml } from '../../src/chart-utils';

/**
 * Auto-popup content is bound with `.innerHTML`, and the library builds it from
 * element attributes. Those went in raw:
 *
 *     <dc-bar label='<img src=x onerror="…">' auto-popup>
 *
 * fired on hover, in Chromium. `label` is the single attribute most likely to
 * carry a value from a database — a product name, a region, a customer — which
 * is precisely the situation this library's premise creates, since the whole
 * point is that a server template writes the markup.
 *
 * `<dc-popup>` content is a different thing and is deliberately left as HTML:
 * an author writing `<strong>` in their own markup means it.
 *
 * These walk **every chart type**, because the generators are per-chart and
 * missing one would be silent.
 */

const PAYLOAD = '<img src=x onerror="window.__xss=1">';

/** Hover the first data shape and return whatever the popup was given. */
async function popupAfterHover(tag: string, inner: string, shapeSelector: string) {
  const chart = await fixture<any>(tag, { width: '400', height: '300', 'auto-popup': '' }, inner);
  for (let i = 0; i < 10; i++) if (await chart.updateComplete) break;

  const shape = chart.shadowRoot!.querySelector(shapeSelector);
  expect(shape, `no shape matched ${shapeSelector} on <${tag}>`).toBeTruthy();
  shape!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

  return chart.popupContent as string;
}

describe('escapeHtml', () => {
  it('neutralises every character that can change parsing', () => {
    expect(escapeHtml(`a"b<c>d&e'f`)).toBe('a&quot;b&lt;c&gt;d&amp;e&#39;f');
  });

  it('escapes the ampersand first', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('leaves ordinary text alone', () => {
    expect(escapeHtml('Q1 2026 — North')).toBe('Q1 2026 — North');
  });

  it('stringifies non-strings', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
  });
});

describe('popupHtml', () => {
  it('keeps the literal markup and escapes the values', () => {
    expect(popupHtml`<strong>${'<b>x</b>'}</strong>`).toBe('<strong>&lt;b&gt;x&lt;/b&gt;</strong>');
  });

  it('escapes every interpolation, not just the first', () => {
    expect(popupHtml`${'<a>'}|${'<b>'}|${'<c>'}`).toBe('&lt;a&gt;|&lt;b&gt;|&lt;c&gt;');
  });

  it('handles a template with no interpolations', () => {
    expect(popupHtml`plain`).toBe('plain');
  });

  it('concatenates safely, which is how the generators compose', () => {
    const joined = popupHtml`<strong>${'<x>'}</strong>` + popupHtml`<br>${'<y>'}`;
    expect(joined).toBe('<strong>&lt;x&gt;</strong><br>&lt;y&gt;');
  });
});

describe('a label cannot inject into an auto popup', () => {
  const cases: Array<[string, string, string, string]> = [
    ['dc-chart bar', 'dc-chart',
      `<dc-bar value="30" label='${PAYLOAD}'></dc-bar><dc-bar value="70" label="B"></dc-bar>`,
      'rect[data-shape-index]'],
    ['dc-chart bubble', 'dc-chart',
      `<dc-bubble value="30" size-value="10" label='${PAYLOAD}'></dc-bubble><dc-bubble value="70" size-value="20" label="B"></dc-bubble>`,
      'circle.bubble-shape'],
    ['dc-pie-chart', 'dc-pie-chart',
      `<dc-pie-slice value="60" label='${PAYLOAD}'></dc-pie-slice><dc-pie-slice value="40" label="Y"></dc-pie-slice>`,
      'path[data-shape-index]'],
    ['dc-funnel-chart', 'dc-funnel-chart',
      `<dc-funnel-stage value="100" label='${PAYLOAD}'></dc-funnel-stage><dc-funnel-stage value="50" label="B"></dc-funnel-stage>`,
      '[data-shape-index]'],
    ['dc-stage-chart', 'dc-stage-chart',
      `<dc-stage value="100" label='${PAYLOAD}'></dc-stage><dc-stage value="50" label="B"></dc-stage>`,
      '[data-shape-index]'],
  ];

  for (const [name, tag, inner, selector] of cases) {
    it(`${name}: the payload is escaped`, async () => {
      const content = await popupAfterHover(tag, inner, selector);
      expect(content, 'popup produced no content — the test proves nothing').toBeTruthy();
      expect(content).not.toContain('<img');
      expect(content).toContain('&lt;img');
    });

    it(`${name}: nothing executable survives a parse`, async () => {
      // The string check above is necessary but not sufficient: what matters is
      // what a parser makes of it, so parse it exactly as the popup does.
      const content = await popupAfterHover(tag, inner, selector);
      const host = document.createElement('div');
      host.innerHTML = content;
      expect(host.querySelectorAll('img')).toHaveLength(0);
      expect(host.textContent).toContain('<img');
    });
  }
});

describe('what escaping must not break', () => {
  it('keeps the popup structure the library writes', async () => {
    const content = await popupAfterHover(
      'dc-chart',
      '<dc-bar value="30" label="Alpha"></dc-bar><dc-bar value="70" label="Beta"></dc-bar>',
      'rect[data-shape-index]'
    );
    expect(content).toContain('<strong>Alpha</strong>');
    expect(content).toContain('<br>');
  });

  it('leaves <dc-popup> author markup alone', async () => {
    // The author wrote this in their own template. It is meant to be HTML, and
    // escaping it would turn every documented popup into visible tag soup.
    const chart = await fixture<any>('dc-chart', { width: '400', height: '300' },
      `<dc-bar value="30" label="A"><dc-popup><strong>Bold</strong> and <em>italic</em></dc-popup></dc-bar>`);
    for (let i = 0; i < 10; i++) if (await chart.updateComplete) break;

    chart.shadowRoot!.querySelector('rect[data-shape-index]')!
      .dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(chart.popupContent).toContain('<strong>Bold</strong>');
    expect(chart.popupContent).toContain('<em>italic</em>');
  });
});
