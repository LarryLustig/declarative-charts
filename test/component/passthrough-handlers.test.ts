import { describe, it, expect } from 'vitest';
import { fixture } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';
import { isEventHandlerAttribute } from '../../src/chart-utils';

/**
 * Passthrough copies any attribute the library does not recognise onto the
 * generated SVG shape. That is the whole mechanism behind `hx-*`, `data-*`,
 * Alpine and Stimulus, and it must keep working.
 *
 * Inline `on*` handlers are the exception. They need none of that mechanism —
 * the library emits `dc-click`, `dc-mouseenter` and `dc-mouseleave` — so
 * blocking them costs a consumer nothing they cannot get another way, and it
 * closes the case where attribute *names*, rather than values, come from data.
 *
 * Dropped loudly: `DC115`. A handler that quietly stops firing is precisely the
 * failure this library's diagnostics exist to prevent.
 */

const chart = (inner: string) =>
  fixture<Chart>('dc-chart', { width: '400', height: '300' }, inner);

const bar = (c: Chart) => c.shadowRoot!.querySelector('rect[data-shape-index="0"]')!;

describe('isEventHandlerAttribute', () => {
  const rect = () => document.createElementNS('http://www.w3.org/2000/svg', 'rect');

  it('matches inline handlers', () => {
    for (const n of ['onclick', 'onerror', 'onmouseover', 'onwheel', 'ONCLICK', 'onLoad']) {
      expect(isEventHandlerAttribute(n, rect()), n).toBe(true);
    }
  });

  it('does not match the integrations passthrough exists for', () => {
    for (const n of ['hx-get', 'hx-on:click', 'x-on:click', '@click', 'data-action',
                     'wire:click', 'data-onclick']) {
      expect(isEventHandlerAttribute(n, rect()), n).toBe(false);
    }
  });

  it('does not match a word that merely begins with "on"', () => {
    // The first attempt was /^on./ and it caught `only`.
    for (const n of ['only', 'once', 'on']) {
      expect(isEventHandlerAttribute(n, rect()), n).toBe(false);
    }
  });

  it('does not match ordinary IDL properties that are not handlers', () => {
    for (const n of ['id', 'className', 'style']) {
      expect(isEventHandlerAttribute(n, rect()), n).toBe(false);
    }
  });

  it('asks the platform, so it tracks whatever this engine implements', () => {
    // An attribute the engine does not know is one it would not fire either,
    // so letting it through costs nothing.
    const el = rect();
    expect(isEventHandlerAttribute('onmadeupevent', el)).toBe(false);
    (el as any).onmadeupevent = null;
    expect(isEventHandlerAttribute('onmadeupevent', el)).toBe(true);
  });
});

describe('passthrough still does its job', () => {
  it('copies hx-* onto the shape', async () => {
    const c = await chart('<dc-bar value="30" label="A" hx-get="/q3" hx-target="#out"></dc-bar>');
    expect(bar(c).getAttribute('hx-get')).toBe('/q3');
    expect(bar(c).getAttribute('hx-target')).toBe('#out');
  });

  it('copies data-* onto the shape', async () => {
    const c = await chart('<dc-bar value="30" label="A" data-region="north"></dc-bar>');
    expect(bar(c).getAttribute('data-region')).toBe('north');
  });

  it('copies prefixed handler bindings, which are not inline handlers', async () => {
    const c = await chart(
      '<dc-bar value="30" label="A" hx-on:click="doThing()" data-action="click->x#y"></dc-bar>'
    );
    expect(bar(c).getAttribute('hx-on:click')).toBe('doThing()');
    expect(bar(c).getAttribute('data-action')).toBe('click->x#y');
  });
});

describe('inline handlers are not copied', () => {
  it('drops onclick', async () => {
    const c = await chart('<dc-bar value="30" label="A" onclick="window.__x=1"></dc-bar>');
    expect(bar(c).hasAttribute('onclick')).toBe(false);
  });

  it('drops onerror and onmouseover too', async () => {
    const c = await chart(
      '<dc-bar value="30" label="A" onerror="a()" onmouseover="b()"></dc-bar>'
    );
    expect(bar(c).hasAttribute('onerror')).toBe(false);
    expect(bar(c).hasAttribute('onmouseover')).toBe(false);
  });

  it('is case-insensitive', async () => {
    const c = await chart('<dc-bar value="30" label="A" OnClick="window.__x=1"></dc-bar>');
    // HTML lowercases attribute names, but the check does not rely on that.
    expect(bar(c).hasAttribute('onclick')).toBe(false);
  });

  it('keeps the other attributes on the same element', async () => {
    // Blocking one attribute must not drop its neighbours.
    const c = await chart(
      '<dc-bar value="30" label="A" onclick="x()" hx-get="/q3" data-k="v"></dc-bar>'
    );
    expect(bar(c).hasAttribute('onclick')).toBe(false);
    expect(bar(c).getAttribute('hx-get')).toBe('/q3');
    expect(bar(c).getAttribute('data-k')).toBe('v');
  });

  it('reports DC115 rather than dropping it silently', async () => {
    const c = await chart('<dc-bar value="30" label="A" onclick="x()"></dc-bar>');
    const entry = c.getLogEntries().find(e => e.path === 'passthrough.eventHandler');
    expect(entry?.message).toContain('onclick');
    expect(entry?.message).toContain('dc-click');
  });

  it('says nothing when there is nothing to block', async () => {
    const c = await chart('<dc-bar value="30" label="A" hx-get="/q3"></dc-bar>');
    expect(c.getLogEntries().filter(e => e.path === 'passthrough.eventHandler')).toHaveLength(0);
  });

  it('blocks on every element type that passes attributes through', async () => {
    const c = await chart(
      '<dc-bar value="30" label="A" onclick="x()"></dc-bar>' +
      '<dc-bar value="70" label="B" onclick="y()"></dc-bar>'
    );
    const shapes = [...c.shadowRoot!.querySelectorAll('rect[data-shape-index]')];
    expect(shapes.every(s => !s.hasAttribute('onclick'))).toBe(true);
  });
});
