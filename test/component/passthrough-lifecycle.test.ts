import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';

/**
 * `applyPassthroughAttributes()` only ever *set* attributes. Lit reuses its
 * DOM nodes positionally, so when the data behind a position changes the node
 * keeps whatever the previous occupant put on it.
 *
 * That makes a filter UI leak: hide the first bar and the second one inherits
 * its `hx-get`, pointing a live request at the wrong record. Nothing warns,
 * and the chart looks right.
 */
describe('passthrough attributes follow the data', () => {
  const attrOf = (c: Chart, i: number, name: string) =>
    c.shadowRoot!
      .querySelector(`rect[data-shape-kind="bar"][data-shape-index="${i}"]`)
      ?.getAttribute(name) ?? null;

  const twoBars = (first: string, second = '') =>
    fixture<Chart>('dc-chart', { width: '600', height: '400', 'console-log': 'none' },
      `<dc-bar value="30" label="A" ${first}></dc-bar>` +
      `<dc-bar value="70" label="B" ${second}></dc-bar>`);

  it('applies them in the first place', async () => {
    const c = await twoBars('data-x="alpha"');
    await elementUpdated(c);
    expect(attrOf(c, 0, 'data-x')).toBe('alpha');
  });

  /**
   * The reported shape. Bar B slides into position 0 and, without removal,
   * carries bar A's attribute.
   */
  it('does not leave a hidden element-s attributes on its replacement', async () => {
    const c = await twoBars('data-x="alpha"');
    await elementUpdated(c);
    c.querySelector('dc-bar')!.setAttribute('hidden', '');
    await elementUpdated(c);
    expect(attrOf(c, 0, 'data-x'), 'bar B inherited bar A-s attribute').toBeNull();
  });

  it('removes an attribute the author takes off the element', async () => {
    const c = await twoBars('data-x="alpha"');
    await elementUpdated(c);
    c.querySelector('dc-bar')!.removeAttribute('data-x');
    await elementUpdated(c);
    expect(attrOf(c, 0, 'data-x')).toBeNull();
  });

  it('updates a value the author changes', async () => {
    const c = await twoBars('data-x="alpha"');
    await elementUpdated(c);
    c.querySelector('dc-bar')!.setAttribute('data-x', 'beta');
    await elementUpdated(c);
    expect(attrOf(c, 0, 'data-x')).toBe('beta');
  });

  it('leaves the other element-s own attributes alone', async () => {
    const c = await twoBars('data-x="alpha"', 'data-y="beta"');
    await elementUpdated(c);
    expect(attrOf(c, 0, 'data-x')).toBe('alpha');
    expect(attrOf(c, 1, 'data-y')).toBe('beta');
  });

  /**
   * Removal must not reach attributes the library itself draws with - it only
   * owns what it previously stamped.
   */
  it('does not strip the chart-s own attributes', async () => {
    const c = await twoBars('data-x="alpha"');
    await elementUpdated(c);
    c.querySelector('dc-bar')!.removeAttribute('data-x');
    await elementUpdated(c);
    expect(attrOf(c, 0, 'data-shape-kind')).toBe('bar');
    expect(attrOf(c, 0, 'fill')).toBeTruthy();
  });
});
