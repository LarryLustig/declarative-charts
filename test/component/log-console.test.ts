import { describe, it, expect, afterEach } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/log-console';
import { Chart } from '../../src/chart';
import { LogConsole } from '../../src/log-console';

/**
 * Characterization tests for `<dc-log-console>`.
 *
 * 422 lines at **0% coverage**, exported from `index.ts` and documented in
 * API.md. It is also the element a developer reaches for precisely when
 * something is already wrong, which is the worst place for untested code.
 *
 * Its `connectedCallback` defers the initial chart lookup behind a
 * `requestAnimationFrame`, so every test here has to let a frame pass before
 * asserting - a bare `await updateComplete` sees the pre-lookup state.
 */

/** Let the deferred connectedCallback work run. */
const afterFrame = async (el: HTMLElement) => {
  await new Promise(r => requestAnimationFrame(() => r(null)));
  await new Promise(r => setTimeout(r, 0));
  await elementUpdated(el);
};

const text = (el: LogConsole) => el.shadowRoot?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('when it has nothing to show', () => {
  it('asks for a selector when given none', async () => {
    const el = await fixture<LogConsole>('dc-log-console');
    await afterFrame(el);
    expect(text(el)).toContain('No chart selector specified');
  });

  it('reports a selector that matches nothing', async () => {
    const el = await fixture<LogConsole>('dc-log-console', { chart: '#not-here' });
    await afterFrame(el);
    expect(text(el)).toContain('No charts found matching selector');
    expect(text(el)).toContain('#not-here');
  });

  // An invalid selector throws inside querySelectorAll; the element catches it
  // rather than taking the page down with it.
  it('survives a selector that is not valid CSS', async () => {
    const el = await fixture<LogConsole>('dc-log-console', { chart: '###' });
    await afterFrame(el);
    expect(text(el)).toContain('No charts found');
  });

  it('ignores matched elements that are not charts', async () => {
    document.body.innerHTML = '<div class="target"></div>';
    const el = await fixture<LogConsole>('dc-log-console', { chart: '.target' });
    await afterFrame(el);
    expect(text(el)).toContain('No charts found');
  });
});

describe('monitoring one chart', () => {
  const withChart = async (chartAttrs: Record<string, string> = {}) => {
    const chart = await fixture<Chart>('dc-chart',
      { id: 'demo', width: '400', height: '300', logging: 'info', ...chartAttrs },
      '<dc-bar value="10" label="A"></dc-bar><dc-bar value="20" label="B"></dc-bar>');
    const el = await fixture<LogConsole>('dc-log-console', { chart: '#demo' });
    await afterFrame(el);
    return { chart, el };
  };

  it('names the chart it is watching', async () => {
    const { el } = await withChart();
    expect(text(el)).toContain('Log Console');
    expect(text(el)).toContain('#demo');
  });

  it('shows no tabs for a single chart', async () => {
    const { el } = await withChart();
    expect(el.shadowRoot?.querySelectorAll('.tab')).toHaveLength(0);
  });

  it('reports the entry count', async () => {
    const { el } = await withChart();
    expect(text(el)).toMatch(/\d+ entries/);
  });

  it('lists the captured entries in a table', async () => {
    const { el } = await withChart();
    const rows = el.shadowRoot?.querySelectorAll('.log-table tbody tr') ?? [];
    expect(rows.length).toBeGreaterThan(0);
  });

  // A chart with logging off captures nothing, so the console has nothing to
  // list - and says why rather than showing an empty table.
  it('explains an empty log rather than showing a bare table', async () => {
    const { el } = await withChart({ logging: 'false' });
    expect(text(el)).toContain('No log entries');
    expect(el.shadowRoot?.querySelector('.log-table')).toBeFalsy();
  });
});

describe('monitoring several charts', () => {
  const withTwo = async () => {
    await fixture<Chart>('dc-chart',
      { id: 'first', width: '400', height: '300', logging: 'info' },
      '<dc-bar value="10" label="A"></dc-bar>');
    await fixture<Chart>('dc-chart',
      { class: 'watched', width: '400', height: '300', logging: 'info' },
      '<dc-bar value="20" label="B"></dc-bar>');
    const el = await fixture<LogConsole>('dc-log-console', { chart: 'dc-chart' });
    await afterFrame(el);
    return el;
  };

  it('shows a tab per chart', async () => {
    const el = await withTwo();
    expect(el.shadowRoot?.querySelectorAll('.tab')).toHaveLength(2);
  });

  it('marks exactly one tab active', async () => {
    const el = await withTwo();
    expect(el.shadowRoot?.querySelectorAll('.tab.active')).toHaveLength(1);
  });

  it('labels a chart by id when it has one, and by tag and position otherwise', async () => {
    const el = await withTwo();
    const labels = Array.from(el.shadowRoot?.querySelectorAll('.tab') ?? [])
      .map(t => t.textContent?.trim());
    expect(labels[0]).toBe('#first');
    expect(labels[1]).toBe('dc-chart [2]');
  });

  it('switches the active tab when another is clicked', async () => {
    const el = await withTwo();
    const tabs = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.tab');
    tabs[1].click();
    await elementUpdated(el);
    const active = el.shadowRoot!.querySelectorAll('.tab.active');
    expect(active).toHaveLength(1);
    expect(active[0].textContent?.trim()).toBe('dc-chart [2]');
  });
});

describe('formatValue', () => {
  const format = (v: unknown) =>
    (LogConsole.prototype as unknown as { formatValue(v: unknown): string }).formatValue(v);

  it.each([
    [undefined, ''],
    [null, 'null'],
    [42, '42'],
    [-7, '-7'],
    [0, '0'],
    ['already a string', 'already a string'],
    [true, 'true']
  ])('formats %o as %o', (input, expected) => {
    expect(format(input)).toBe(expected);
  });

  it('rounds a fractional number to two places', () => {
    expect(format(3.14159)).toBe('3.14');
    expect(format(0.5)).toBe('0.50');
  });

  it('serialises an object', () => {
    expect(format({ width: 10, height: 20 })).toBe('{"width":10,"height":20}');
  });

  it('does not throw on a circular object', () => {
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;
    expect(format(circular)).toBe('[object]');
  });
});

describe('observer lifecycle', () => {
  /**
   * `connectedCallback` defers its work behind a `requestAnimationFrame`. If
   * the element was removed before that frame ran, `disconnectedCallback` had
   * already been and gone - so the observer created afterwards watched
   * `document.body` with `subtree: true` for the lifetime of the page, firing
   * on every mutation anywhere to refresh a console no longer in the document.
   *
   * htmx swaps remove elements exactly this way, and this library advertises
   * htmx compatibility.
   */
  const spyOnObservers = () => {
    const created: object[] = [];
    const disconnected: object[] = [];
    const Real = globalThis.MutationObserver;
    class Spy extends Real {
      constructor(cb: MutationCallback) {
        super(cb);
        created.push(this);
      }
      override disconnect() {
        disconnected.push(this);
        super.disconnect();
      }
    }
    globalThis.MutationObserver = Spy as unknown as typeof MutationObserver;
    return {
      created,
      disconnected,
      restore: () => { globalThis.MutationObserver = Real; },
      leaked: () => created.filter(o => !disconnected.includes(o)).length
    };
  };

  it('creates no observer when removed before its first frame', async () => {
    const spy = spyOnObservers();
    try {
      const el = document.createElement('dc-log-console');
      el.setAttribute('chart', 'dc-chart');
      document.body.appendChild(el);
      el.remove();
      await new Promise(r => requestAnimationFrame(() => r(null)));
      await new Promise(r => setTimeout(r, 0));
      expect(spy.leaked(), 'observers left watching the document').toBe(0);
    } finally {
      spy.restore();
    }
  });

  it('disconnects its observer when removed after setup', async () => {
    const spy = spyOnObservers();
    try {
      const el = document.createElement('dc-log-console');
      el.setAttribute('chart', 'dc-chart');
      document.body.appendChild(el);
      await new Promise(r => requestAnimationFrame(() => r(null)));
      await new Promise(r => setTimeout(r, 0));
      el.remove();
      await new Promise(r => setTimeout(r, 0));
      expect(spy.leaked(), 'observers left watching the document').toBe(0);
    } finally {
      spy.restore();
    }
  });

  it('does not accumulate observers when moved in the DOM', async () => {
    const spy = spyOnObservers();
    try {
      const a = document.createElement('div');
      const b = document.createElement('div');
      document.body.append(a, b);
      const el = document.createElement('dc-log-console');
      el.setAttribute('chart', 'dc-chart');

      a.appendChild(el);
      await new Promise(r => requestAnimationFrame(() => r(null)));
      b.appendChild(el);   // move: disconnect then connect again
      await new Promise(r => requestAnimationFrame(() => r(null)));
      await new Promise(r => setTimeout(r, 0));

      expect(spy.leaked(), 'observers left watching the document').toBeLessThanOrEqual(1);
      el.remove();
      await new Promise(r => setTimeout(r, 0));
      expect(spy.leaked(), 'observers left after removal').toBe(0);
    } finally {
      spy.restore();
    }
  });
});

describe('the Web Animations API in this test environment', () => {
  /**
   * REVIEW.md §7 attributed `animation.ts`'s low coverage to happy-dom lacking
   * `Element.prototype.animate`, and recommended stubbing it. That is no longer
   * true of the component environment - the current happy-dom provides it - so
   * the remaining gap there is ordinary missing coverage, not an artifact.
   *
   * Asserted rather than assumed, because the recommendation would otherwise be
   * carried forward on a premise nobody rechecked.
   */
  it('provides element.animate, so animations are exercisable here', () => {
    expect(typeof document.createElement('div').animate).toBe('function');
    expect(
      typeof document.createElementNS('http://www.w3.org/2000/svg', 'rect').animate
    ).toBe('function');
  });
});
