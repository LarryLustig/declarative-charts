import { describe, it, expect } from 'vitest';
import { fixture } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';
import { escapeSvgAttribute } from '../../src/patterns';

/**
 * Pattern definitions are the one place this library builds SVG as a **string**
 * and hands it to lit's `unsafeSVG`, which parses markup by design — a
 * `<pattern>` cannot be expressed as a lit template at that point. Every value
 * interpolated into that string is therefore a script-injection vector unless
 * it is escaped.
 *
 * It was not, and this was live:
 *
 *     pattern-stroke='red"/><image href="x" onerror="…"/><line stroke="'
 *
 * Both `<animate onbegin>` and `<image onerror>` executed in Chromium. It
 * matters for this library in particular because the whole premise is that
 * markup is generated from server data — a colour taken from a database row was
 * enough.
 *
 * These tests assert on the *parsed DOM*, not on the string, because the string
 * containing `&lt;script&gt;` proves nothing about what the parser then does
 * with it.
 */

const chart = (inner: string) =>
  fixture<Chart>('dc-chart', { width: '400', height: '300' }, inner);

const defs = (c: Chart) => c.shadowRoot!.querySelector('defs')!;
const tagsInDefs = (c: Chart) =>
  [...defs(c).querySelectorAll('*')].map(e => e.tagName.toLowerCase());

const BREAKOUT = (payload: string) => `red"/>${payload}<line stroke="`;

describe('escapeSvgAttribute', () => {
  it('neutralises the characters that end an attribute or open a tag', () => {
    expect(escapeSvgAttribute(`a"b<c>d&e'f`)).toBe('a&quot;b&lt;c&gt;d&amp;e&#39;f');
  });

  it('escapes the ampersand first, so entities are not double-decoded', () => {
    expect(escapeSvgAttribute('&lt;')).toBe('&amp;lt;');
  });

  it('leaves a colour untouched', () => {
    for (const colour of ['#fee', 'rgb(220, 38, 38)', 'currentColor', 'hsl(10, 50%, 50%)', 'url(#x)']) {
      expect(escapeSvgAttribute(colour)).toBe(colour);
    }
  });

  it('handles a non-string without throwing', () => {
    expect(escapeSvgAttribute(undefined as unknown as string)).toBe('undefined');
  });
});

describe('pattern attributes cannot inject markup', () => {
  it('does not create a script element from pattern-stroke', async () => {
    const c = await chart(
      `<dc-bar value="30" label="A" pattern="diagonal-lines"
               pattern-stroke='${BREAKOUT('<script>window.__x=1</script>')}'></dc-bar>`
    );
    expect(defs(c).querySelectorAll('script')).toHaveLength(0);
  });

  it('does not create an event-handler element from pattern-stroke', async () => {
    // The realistic payload: <script> inserted via innerHTML does not run, but
    // <animate onbegin> and <image onerror> do, and both fired before the fix.
    const c = await chart(
      `<dc-bar value="30" label="A" pattern="diagonal-lines"
               pattern-stroke='${BREAKOUT('<animate onbegin="window.__x=1"/>')}'></dc-bar>`
    );
    expect(tagsInDefs(c)).not.toContain('animate');
  });

  it('does not create an element from pattern-fill', async () => {
    const c = await chart(
      `<dc-bar value="30" label="A" pattern="dots"
               pattern-fill='${BREAKOUT('<image href="y" onerror="window.__x=1"/>')}'></dc-bar>`
    );
    expect(tagsInDefs(c)).not.toContain('image');
  });

  it('leaves the pattern itself well formed', async () => {
    // Escaping must not corrupt the surrounding markup: the pattern still has
    // to exist and still has to paint, or the fix trades a hole for a blank
    // chart.
    const c = await chart(
      `<dc-bar value="30" label="A" pattern="diagonal-lines"
               pattern-stroke='${BREAKOUT('<script>x</script>')}'></dc-bar>`
    );
    expect(defs(c).querySelectorAll('pattern')).toHaveLength(1);
    expect(c.shadowRoot!.querySelector('rect[data-shape-index]')!.getAttribute('fill'))
      .toMatch(/^url\(#/);
  });

  it('emits no element beyond the pattern geometry itself', async () => {
    const c = await chart(
      `<dc-bar value="30" label="A" pattern="diagonal-lines"
               pattern-stroke='${BREAKOUT('<image href="y"/><animate/>')}'></dc-bar>`
    );
    expect(tagsInDefs(c)).toEqual(['pattern', 'rect', 'line']);
  });
});

describe('legitimate pattern values still work', () => {
  it('passes a colour through unchanged', async () => {
    const c = await chart(
      `<dc-bar value="30" label="A" pattern="diagonal-lines"
               pattern-stroke="rgb(220, 38, 38)" pattern-fill="#fee"></dc-bar>`
    );
    const line = defs(c).querySelector('line')!;
    const rect = defs(c).querySelector('rect')!;
    expect(line.getAttribute('stroke')).toBe('rgb(220, 38, 38)');
    expect(rect.getAttribute('fill')).toBe('#fee');
  });

  it('passes a keyword through unchanged', async () => {
    const c = await chart(
      `<dc-bar value="30" label="A" pattern="crosshatch" pattern-stroke="currentColor"></dc-bar>`
    );
    expect(defs(c).querySelector('line')!.getAttribute('stroke')).toBe('currentColor');
  });

  it('still paints every built-in pattern', async () => {
    const patterns = ['diagonal-lines', 'horizontal-lines', 'vertical-lines', 'dots',
                      'crosshatch', 'grid', 'checkerboard'];
    const c = await chart(
      patterns.map((p, i) => `<dc-bar value="${10 + i}" label="${p}" pattern="${p}"></dc-bar>`).join('')
    );
    expect(defs(c).querySelectorAll('pattern')).toHaveLength(patterns.length);
  });
});
