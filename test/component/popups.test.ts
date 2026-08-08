import { describe, it, expect, vi, afterEach } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-popup';
import '../../src/pie-chart';
import '../../src/chart-pie-slice';
import { Chart } from '../../src/chart';
import { PieChart } from '../../src/pie-chart';

/**
 * Characterization tests for the popup system in BaseChart.
 *
 * Written *before* extracting PopupController, pinning current behaviour rather
 * than intended behaviour. Their job is to fail if the extraction changes
 * anything. Where a behaviour looks odd it is still recorded as-is - changing it
 * would be a decision, not a refactor's side effect.
 *
 * Two hazards from the earlier ColorResolver / KeyboardNavController
 * extractions are targeted deliberately:
 *
 *  (a) moving a method out of a class severs every override of it. The
 *      `showPopupAtBounds -> showPopup` seam and the
 *      `showPopupForFocusedElement` / `togglePopupForFocusedElement` subclass
 *      hooks are covered below.
 *  (b) popupContent/X/Y/Visible are `@state()`, so Lit re-renders on every
 *      assignment. As plain controller fields they would need an explicit
 *      requestUpdate(). The "rendering" and "reactivity" blocks fail if that is
 *      missed on any path.
 */

type PopupApi = {
  popupContent: string;
  popupX: number;
  popupY: number;
  popupVisible: boolean;
  showPopup(content: string, x: number, y: number): void;
  hidePopup(): void;
  showPopupAtBounds(content: string, bounds: { x: number; y: number; width: number; height: number }): boolean;
  showPopupForFocusedElement(index: number): void;
  togglePopupForFocusedElement(index: number): void;
  focusElement(index: number): void;
  handleChartKeyDown(e: KeyboardEvent): void;
};

const pop = (chart: Chart | PieChart) => chart as unknown as PopupApi;

const popupDiv = (chart: HTMLElement) =>
  chart.shadowRoot!.querySelector('.popup') as HTMLDivElement;

const barChart = (extra = '', attrs: Record<string, string> = {}) =>
  fixture<Chart>('dc-chart', { width: '600', height: '400', ...attrs }, `
    <dc-bar value="10" label="A"></dc-bar>
    <dc-bar value="20" label="B"></dc-bar>
    <dc-bar value="30" label="C"></dc-bar>${extra}`);

/**
 * happy-dom returns all-zero rects from getBoundingClientRect(), so every
 * coordinate the popup computes would collapse to the offsets. Stubbing both
 * rects is what makes the arithmetic observable at all.
 */
function stubRects(
  chart: HTMLElement,
  chartRect = { left: 100, top: 50, width: 600, height: 400 },
  svgRect = { left: 100, top: 50, width: 300, height: 200 }
) {
  chart.getBoundingClientRect = () => chartRect as DOMRect;
  const svg = chart.shadowRoot!.querySelector('svg')!;
  svg.getBoundingClientRect = () => svgRect as DOMRect;
}

/**
 * BaseChart.prototype, found by name so the test does not encode the depth of
 * the chain. The name is matched loosely because the decorator transform emits
 * the class as `_BaseChart`, not `BaseChart`.
 */
function baseChartPrototype(chart: object): Record<string, unknown> {
  let proto = Object.getPrototypeOf(chart);
  while (proto && !/^_?BaseChart$/.test(proto.constructor?.name ?? '')) {
    proto = Object.getPrototypeOf(proto);
  }
  if (!proto) throw new Error('BaseChart.prototype not found on the prototype chain');
  return proto;
}

const key = (k: string) =>
  new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });

afterEach(() => vi.restoreAllMocks());

describe('initial popup state', () => {
  it('starts hidden with empty content at the origin', async () => {
    const c = pop(await barChart());
    expect(c.popupContent).toBe('');
    expect(c.popupX).toBe(0);
    expect(c.popupY).toBe(0);
    expect(c.popupVisible).toBe(false);
  });

  // The div is always in the shadow tree; visibility is a class, not presence.
  // A refactor that renders it conditionally would break ::part styling and the
  // opacity transition.
  it('always renders the popup div, unvisible', async () => {
    const chart = await barChart();
    const div = popupDiv(chart);
    expect(div).not.toBeNull();
    expect(div.classList.contains('visible')).toBe(false);
    expect(div.innerHTML).toBe('');
  });

  it('exposes the popup div as ::part(popup)', async () => {
    const chart = await barChart();
    expect(popupDiv(chart).getAttribute('part')).toBe('popup');
  });

  it('positions the hidden popup at 0,0', async () => {
    const chart = await barChart();
    expect(popupDiv(chart).getAttribute('style')).toContain('left: 0px');
    expect(popupDiv(chart).getAttribute('style')).toContain('top: 0px');
  });

  it('renders a popup div even on an empty chart', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, '');
    expect(popupDiv(chart)).not.toBeNull();
    expect(popupDiv(chart).classList.contains('visible')).toBe(false);
  });

  // The popup div lives outside the <svg>, so the loading skeleton and the
  // empty-state message - which replace the plot entirely - do not remove it.
  it('renders a popup div while loading', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400', loading: '' }, `
      <dc-bar value="10" label="A"></dc-bar>`);
    expect(popupDiv(chart)).not.toBeNull();
  });

  it('still shows a popup on a chart with no data', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, '');
    pop(chart).showPopup('Orphan', 10, 10);
    await elementUpdated(chart);
    expect(popupDiv(chart).classList.contains('visible')).toBe(true);
  });
});

describe('showPopup', () => {
  it('stores the content and marks the popup visible', async () => {
    const c = pop(await barChart());
    c.showPopup('Hello', 200, 120);
    expect(c.popupContent).toBe('Hello');
    expect(c.popupVisible).toBe(true);
  });

  // The coordinates are viewport coordinates converted to host-relative ones,
  // then nudged so the box sits to the right of and slightly above the cursor.
  it('offsets the point by +15 x and -10 y, relative to the host rect', async () => {
    const chart = await barChart();
    stubRects(chart);
    pop(chart).showPopup('Hello', 200, 120);
    expect(pop(chart).popupX).toBe(200 - 100 + 15);
    expect(pop(chart).popupY).toBe(120 - 50 - 10);
  });

  // happy-dom's zero rect means the offsets are the whole answer here, which is
  // worth pinning because it is what every un-stubbed test in this file sees.
  it('uses a zero host rect when layout is unavailable', async () => {
    const c = pop(await barChart());
    c.showPopup('Hello', 0, 0);
    expect(c.popupX).toBe(15);
    expect(c.popupY).toBe(-10);
  });

  it('allows negative coordinates rather than clamping them', async () => {
    const chart = await barChart();
    stubRects(chart);
    pop(chart).showPopup('Hello', 0, 0);
    expect(pop(chart).popupX).toBe(-85);
    expect(pop(chart).popupY).toBe(-60);
  });

  it('replaces the content of an already visible popup', async () => {
    const c = pop(await barChart());
    c.showPopup('First', 10, 10);
    c.showPopup('Second', 20, 20);
    expect(c.popupContent).toBe('Second');
    expect(c.popupVisible).toBe(true);
  });

  // No guard against empty content: the popup still becomes "visible", it is
  // simply an empty box. Recorded as-is.
  it('shows an empty popup for empty content', async () => {
    const c = pop(await barChart());
    c.showPopup('', 10, 10);
    expect(c.popupVisible).toBe(true);
    expect(c.popupContent).toBe('');
  });
});

describe('hidePopup', () => {
  it('clears visibility', async () => {
    const c = pop(await barChart());
    c.showPopup('Hello', 10, 10);
    c.hidePopup();
    expect(c.popupVisible).toBe(false);
  });

  // Deliberately *not* cleared: only the visible flag flips, so the content and
  // position survive a hide. The CSS opacity transition needs the content to
  // stay put while it fades out.
  // hidePopup used to flip the visible flag only, leaving the last popup's
  // markup mounted between hovers - reachable via ::part(popup) and still
  // announced by assistive technology. It now clears the content. Coordinates
  // are left alone: they are harmless and are overwritten on the next show.
  it('clears the content but keeps the coordinates', async () => {
    const chart = await barChart();
    stubRects(chart);
    const c = pop(chart);
    c.showPopup('Hello', 200, 120);
    c.hidePopup();
    expect(c.popupContent).toBe('');
    expect(c.popupX).toBe(115);
    expect(c.popupY).toBe(60);
  });

  it('is a no-op when already hidden', async () => {
    const c = pop(await barChart());
    c.hidePopup();
    c.hidePopup();
    expect(c.popupVisible).toBe(false);
    expect(c.popupContent).toBe('');
  });
});

describe('rendering', () => {
  it('adds the visible class after showPopup', async () => {
    const chart = await barChart();
    pop(chart).showPopup('Hello', 10, 10);
    await elementUpdated(chart);
    expect(popupDiv(chart).classList.contains('visible')).toBe(true);
  });

  it('writes the coordinates into the inline style', async () => {
    const chart = await barChart();
    stubRects(chart);
    pop(chart).showPopup('Hello', 200, 120);
    await elementUpdated(chart);
    const style = popupDiv(chart).getAttribute('style')!;
    expect(style).toContain('left: 115px');
    expect(style).toContain('top: 60px');
  });

  // Content is bound with `.innerHTML`, so markup is parsed rather than escaped.
  it('parses popup content as HTML', async () => {
    const chart = await barChart();
    pop(chart).showPopup('<strong>Bold</strong> text', 10, 10);
    await elementUpdated(chart);
    expect(popupDiv(chart).querySelector('strong')).not.toBeNull();
    expect(popupDiv(chart).textContent).toContain('Bold');
  });

  it('removes the visible class after hidePopup', async () => {
    const chart = await barChart();
    pop(chart).showPopup('Hello', 10, 10);
    await elementUpdated(chart);
    pop(chart).hidePopup();
    await elementUpdated(chart);
    expect(popupDiv(chart).classList.contains('visible')).toBe(false);
  });

  // Consequence of hidePopup keeping the content: the markup stays in the DOM
  // while hidden.
  it('removes the content from the DOM once hidden', async () => {
    const chart = await barChart();
    pop(chart).showPopup('Still here', 10, 10);
    await elementUpdated(chart);
    expect(popupDiv(chart).textContent).toContain('Still here');

    pop(chart).hidePopup();
    await elementUpdated(chart);

    // The container stays mounted for the CSS fade; only its content goes.
    expect(popupDiv(chart)).not.toBeNull();
    expect(popupDiv(chart).textContent).not.toContain('Still here');
  });

  it('re-stamps part="popup" after a re-render', async () => {
    const chart = await barChart();
    pop(chart).showPopup('Hello', 10, 10);
    await elementUpdated(chart);
    expect(popupDiv(chart).getAttribute('part')).toBe('popup');
  });
});

describe('reactivity', () => {
  // These four are @state() fields today. Assigning them must schedule a render
  // on its own - existing tests and chart subclasses set popupVisible directly.
  // If the extraction moves them onto a controller without a requestUpdate() on
  // the write path, every one of these fails.
  it('re-renders when popupVisible is assigned directly', async () => {
    const chart = await barChart();
    pop(chart).popupVisible = true;
    await elementUpdated(chart);
    expect(popupDiv(chart).classList.contains('visible')).toBe(true);
  });

  it('re-renders when popupContent is assigned directly', async () => {
    const chart = await barChart();
    pop(chart).popupContent = 'Direct';
    await elementUpdated(chart);
    expect(popupDiv(chart).textContent).toContain('Direct');
  });

  it('re-renders when popupX and popupY are assigned directly', async () => {
    const chart = await barChart();
    pop(chart).popupX = 42;
    pop(chart).popupY = 7;
    await elementUpdated(chart);
    const style = popupDiv(chart).getAttribute('style')!;
    expect(style).toContain('left: 42px');
    expect(style).toContain('top: 7px');
  });

  it('re-renders on the hide path as well as the show path', async () => {
    const chart = await barChart();
    pop(chart).showPopup('Hello', 10, 10);
    await elementUpdated(chart);
    expect(popupDiv(chart).classList.contains('visible')).toBe(true);

    pop(chart).hidePopup();
    await elementUpdated(chart);
    expect(popupDiv(chart).classList.contains('visible')).toBe(false);
  });

  // `@state()` with useDefineForClassFields:false installs a get/set pair on
  // BaseChart.prototype, and the setter is what schedules the render. Moving the
  // fields onto a controller must leave equivalent accessors behind: plain data
  // properties here would mean assignment no longer re-renders.
  it.each(['popupContent', 'popupX', 'popupY', 'popupVisible'])(
    'exposes %s as a get/set accessor on BaseChart.prototype',
    async (name) => {
      const base = baseChartPrototype(await barChart());
      const descriptor = Object.getOwnPropertyDescriptor(base, name);
      expect(descriptor).toBeDefined();
      expect(typeof descriptor!.get).toBe('function');
      expect(typeof descriptor!.set).toBe('function');
    }
  );

  it('reads back the assigned values', async () => {
    const chart = await barChart();
    pop(chart).popupContent = 'x';
    pop(chart).popupX = 1;
    pop(chart).popupY = 2;
    pop(chart).popupVisible = true;
    expect(pop(chart).popupContent).toBe('x');
    expect(pop(chart).popupX).toBe(1);
    expect(pop(chart).popupY).toBe(2);
    expect(pop(chart).popupVisible).toBe(true);
  });
});

describe('showPopupAtBounds', () => {
  it('returns true and shows the popup', async () => {
    const chart = await barChart();
    stubRects(chart);
    const shown = pop(chart).showPopupAtBounds('Detail', { x: 40, y: 20, width: 100, height: 60 });
    expect(shown).toBe(true);
    expect(pop(chart).popupVisible).toBe(true);
    expect(pop(chart).popupContent).toBe('Detail');
  });

  // Position is the shape's top-centre in viewBox units, scaled by the ratio of
  // the rendered SVG to the viewBox, then passed through showPopup's offsets.
  //   scaleX = 300/600 = 0.5, scaleY = 200/400 = 0.5
  //   viewport x = 100 + (40 + 100/2) * 0.5 = 145 -> popupX = 145 - 100 + 15 = 60
  //   viewport y = 50  + 20 * 0.5          = 60  -> popupY = 60  - 50  - 10 = 0
  it('converts viewBox bounds to host-relative coordinates', async () => {
    const chart = await barChart();
    stubRects(chart);
    pop(chart).showPopupAtBounds('Detail', { x: 40, y: 20, width: 100, height: 60 });
    expect(pop(chart).popupX).toBe(60);
    expect(pop(chart).popupY).toBe(0);
  });

  it('anchors to the horizontal centre of the shape', async () => {
    const chart = await barChart();
    stubRects(chart);
    pop(chart).showPopupAtBounds('Detail', { x: 0, y: 0, width: 200, height: 10 });
    // centre = 100 viewBox units -> 50 rendered px
    expect(pop(chart).popupX).toBe(100 - 100 + 50 + 15);
  });

  // The shape's height is not used at all - the popup sits at the top edge.
  it('ignores the shape height', async () => {
    const chart = await barChart();
    stubRects(chart);
    pop(chart).showPopupAtBounds('Detail', { x: 40, y: 20, width: 100, height: 60 });
    const tall = pop(chart).popupY;
    pop(chart).showPopupAtBounds('Detail', { x: 40, y: 20, width: 100, height: 999 });
    expect(pop(chart).popupY).toBe(tall);
  });

  it('returns false and shows nothing when there is no svg', async () => {
    const chart = await barChart();
    chart.shadowRoot!.querySelector('svg')!.remove();
    const shown = pop(chart).showPopupAtBounds('Detail', { x: 1, y: 2, width: 3, height: 4 });
    expect(shown).toBe(false);
    expect(pop(chart).popupVisible).toBe(false);
    expect(pop(chart).popupContent).toBe('');
  });

  // HAZARD (a): showPopupAtBounds must keep calling the *chart's* showPopup, so
  // a subclass or a spy that overrides it still wins. A controller calling its
  // own private copy would silently bypass this and the test would fail.
  it('routes through the chart\'s showPopup', async () => {
    const chart = await barChart();
    stubRects(chart);
    const spy = vi.spyOn(pop(chart), 'showPopup');
    pop(chart).showPopupAtBounds('Detail', { x: 40, y: 20, width: 100, height: 60 });
    expect(spy).toHaveBeenCalledWith('Detail', 145, 60);
  });

  it('returns false before the chart has rendered its shadow root', async () => {
    const chart = document.createElement('dc-chart') as Chart;
    const shown = pop(chart).showPopupAtBounds('Detail', { x: 1, y: 2, width: 3, height: 4 });
    expect(shown).toBe(false);
    expect(pop(chart).popupVisible).toBe(false);
  });

  // Note the asymmetry with the standalone showPopupAtBounds() helper in
  // chart-utils.ts, which bails out on empty content. BaseChart's method has no
  // such guard: it reports success and shows an empty box.
  // Used to return true and show an empty box, while the standalone
  // showPopupAtBounds() in chart-utils.ts - same job, exported from index.ts -
  // bailed. The two now agree.
  it('declines empty content instead of showing an empty box', async () => {
    const chart = await barChart();
    stubRects(chart);
    expect(pop(chart).showPopupAtBounds('', { x: 0, y: 0, width: 10, height: 10 })).toBe(false);
    expect(pop(chart).popupVisible).toBe(false);
  });

  it('collapses to the offsets when the svg has no measured size', async () => {
    const chart = await barChart();
    // No rect stubs: happy-dom reports zero width/height, so both scales are 0.
    const shown = pop(chart).showPopupAtBounds('Detail', { x: 40, y: 20, width: 100, height: 60 });
    expect(shown).toBe(true);
    expect(pop(chart).popupX).toBe(15);
    expect(pop(chart).popupY).toBe(-10);
  });
});

describe('subclass extension points', () => {
  // showPopupForFocusedElement / togglePopupForFocusedElement are overridden by
  // all four chart types and must stay on BaseChart. BaseChart's own bodies are
  // deliberately empty no-ops.
  it('has a no-op default on BaseChart that touches nothing', async () => {
    const chart = await barChart();
    const base = baseChartPrototype(chart);
    (base.showPopupForFocusedElement as (i: number) => void).call(chart, 0);
    (base.togglePopupForFocusedElement as (i: number) => void).call(chart, 0);
    expect(pop(chart).popupVisible).toBe(false);
    expect(pop(chart).popupContent).toBe('');
  });

  // Both hooks must remain declared on BaseChart itself - moving them onto a
  // controller would leave the subclass overrides overriding nothing.
  it('declares both hooks as own members of BaseChart', async () => {
    const base = baseChartPrototype(await barChart());
    expect(Object.getOwnPropertyNames(base)).toContain('showPopupForFocusedElement');
    expect(Object.getOwnPropertyNames(base)).toContain('togglePopupForFocusedElement');
  });

  it('is overridden by dc-chart', async () => {
    const chart = await barChart();
    const base = baseChartPrototype(chart);
    expect(Object.getOwnPropertyNames(Chart.prototype)).toContain('showPopupForFocusedElement');
    expect((Chart.prototype as unknown as PopupApi).showPopupForFocusedElement)
      .not.toBe(base.showPopupForFocusedElement);
  });

  // HAZARD (a): keyboard focus of a hover-popup element must reach the
  // *subclass's* showPopupForFocusedElement, not a base or controller copy.
  it('is reached from keyboard focus for a hover popup', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"><dc-popup trigger="hover">Detail A</dc-popup></dc-bar>
      <dc-bar value="20" label="B"><dc-popup trigger="hover">Detail B</dc-popup></dc-bar>`);
    const spy = vi.spyOn(pop(chart), 'showPopupForFocusedElement');
    pop(chart).focusElement(1);
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('toggles off when the popup is already visible', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"><dc-popup trigger="click">Detail A</dc-popup></dc-bar>`);
    pop(chart).showPopup('Detail A', 10, 10);
    pop(chart).togglePopupForFocusedElement(0);
    expect(pop(chart).popupVisible).toBe(false);
  });

  it('toggles on by delegating to showPopupForFocusedElement', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"><dc-popup trigger="click">Detail A</dc-popup></dc-bar>`);
    const spy = vi.spyOn(pop(chart), 'showPopupForFocusedElement').mockImplementation(() => {});
    pop(chart).togglePopupForFocusedElement(0);
    expect(spy).toHaveBeenCalledWith(0);
  });

  it('works the same on a pie chart', async () => {
    const chart = await fixture<PieChart>('dc-pie-chart', { width: '600', height: '400' }, `
      <dc-pie-slice value="30" label="A"><dc-popup trigger="hover">Slice A</dc-popup></dc-pie-slice>
      <dc-pie-slice value="70" label="B"></dc-pie-slice>`);
    const spy = vi.spyOn(pop(chart), 'showPopupForFocusedElement');
    pop(chart).focusElement(0);
    expect(spy).toHaveBeenCalledWith(0);
  });
});

describe('keyboard interaction', () => {
  it('hides the popup on Escape', async () => {
    const chart = await barChart();
    pop(chart).showPopup('Hello', 10, 10);
    pop(chart).handleChartKeyDown(key('Escape'));
    expect(pop(chart).popupVisible).toBe(false);
  });

  it('re-renders the hidden popup after Escape', async () => {
    const chart = await barChart();
    pop(chart).showPopup('Hello', 10, 10);
    await elementUpdated(chart);
    pop(chart).handleChartKeyDown(key('Escape'));
    await elementUpdated(chart);
    expect(popupDiv(chart).classList.contains('visible')).toBe(false);
  });

  it('leaves the popup alone for unrelated keys', async () => {
    const chart = await barChart();
    pop(chart).showPopup('Hello', 10, 10);
    pop(chart).handleChartKeyDown(key('a'));
    expect(pop(chart).popupVisible).toBe(true);
  });
});

describe('mouse interaction', () => {
  const hover = (el: Element, x = 200, y = 120) =>
    el.dispatchEvent(new MouseEvent('mouseenter', { clientX: x, clientY: y, bubbles: false }));

  it('shows an auto popup on hovering a bar', async () => {
    const chart = await barChart('', { 'auto-popup': '' });
    const bar = chart.shadowRoot!.querySelector('rect[data-shape-index="0"]')!;
    hover(bar);
    expect(pop(chart).popupVisible).toBe(true);
    expect(pop(chart).popupContent).toContain('A');
  });

  it('shows a custom popup on hovering a bar', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"><dc-popup trigger="hover">Custom A</dc-popup></dc-bar>`);
    const bar = chart.shadowRoot!.querySelector('rect[data-shape-index="0"]')!;
    hover(bar);
    expect(pop(chart).popupContent).toBe('Custom A');
  });

  it('hides the popup on mouseleave', async () => {
    const chart = await barChart('', { 'auto-popup': '' });
    const bar = chart.shadowRoot!.querySelector('rect[data-shape-index="0"]')!;
    hover(bar);
    bar.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    expect(pop(chart).popupVisible).toBe(false);
  });

  it('does not show a popup for a bar with neither auto nor custom popup', async () => {
    const chart = await barChart();
    const bar = chart.shadowRoot!.querySelector('rect[data-shape-index="0"]')!;
    hover(bar);
    expect(pop(chart).popupVisible).toBe(false);
  });

  it('positions the popup from the cursor, not the shape', async () => {
    const chart = await barChart('', { 'auto-popup': '' });
    stubRects(chart);
    const bar = chart.shadowRoot!.querySelector('rect[data-shape-index="0"]')!;
    hover(bar, 300, 200);
    expect(pop(chart).popupX).toBe(300 - 100 + 15);
    expect(pop(chart).popupY).toBe(200 - 50 - 10);
  });

  it('shows the popup in the rendered DOM after a hover', async () => {
    const chart = await barChart('', { 'auto-popup': '' });
    const bar = chart.shadowRoot!.querySelector('rect[data-shape-index="0"]')!;
    hover(bar);
    await elementUpdated(chart);
    expect(popupDiv(chart).classList.contains('visible')).toBe(true);
    expect(popupDiv(chart).textContent).toContain('A');
  });

  it('replaces the content when moving between bars', async () => {
    const chart = await barChart('', { 'auto-popup': '' });
    hover(chart.shadowRoot!.querySelector('rect[data-shape-index="0"]')!);
    const first = pop(chart).popupContent;
    hover(chart.shadowRoot!.querySelector('rect[data-shape-index="1"]')!);
    expect(pop(chart).popupContent).not.toBe(first);
    expect(pop(chart).popupContent).toContain('B');
  });
});

describe('lifecycle', () => {
  it('accepts showPopup before the chart has ever rendered', async () => {
    const chart = document.createElement('dc-chart') as Chart;
    chart.setAttribute('width', '600');
    chart.setAttribute('height', '400');
    chart.innerHTML = '<dc-bar value="10" label="A"></dc-bar>';
    pop(chart).showPopup('Early', 10, 10);
    expect(pop(chart).popupVisible).toBe(true);

    document.body.appendChild(chart);
    await elementUpdated(chart);
    expect(popupDiv(chart).classList.contains('visible')).toBe(true);
    expect(popupDiv(chart).textContent).toContain('Early');
  });

  it('keeps the popup visible across an unrelated re-render', async () => {
    const chart = await barChart();
    pop(chart).showPopup('Sticky', 10, 10);
    await elementUpdated(chart);

    chart.width = 800;
    await elementUpdated(chart);

    expect(pop(chart).popupVisible).toBe(true);
    expect(popupDiv(chart).classList.contains('visible')).toBe(true);
    expect(popupDiv(chart).textContent).toContain('Sticky');
  });

  it('keeps the popup visible when a data element is added', async () => {
    const chart = await barChart();
    pop(chart).showPopup('Sticky', 10, 10);
    await elementUpdated(chart);

    const bar = document.createElement('dc-bar');
    bar.setAttribute('value', '40');
    bar.setAttribute('label', 'D');
    chart.appendChild(bar);
    chart.requestUpdate();
    await elementUpdated(chart);

    expect(popupDiv(chart).classList.contains('visible')).toBe(true);
  });

  it('does not round fractional coordinates', async () => {
    const chart = await barChart();
    pop(chart).showPopup('Hello', 10.5, 20.25);
    expect(pop(chart).popupX).toBe(25.5);
    expect(pop(chart).popupY).toBe(10.25);
  });

  it('leaves keyboard focus state untouched when hiding', async () => {
    const chart = await barChart();
    const nav = chart as unknown as { focusedIndex: number };
    pop(chart).focusElement(2);
    pop(chart).showPopup('Hello', 10, 10);
    pop(chart).hidePopup();
    expect(nav.focusedIndex).toBe(2);
  });
});

describe('click-triggered popups', () => {
  const clickChart = () => fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
    <dc-bar value="10" label="A"><dc-popup trigger="click">Click A</dc-popup></dc-bar>
    <dc-bar value="20" label="B"><dc-popup trigger="click">Click B</dc-popup></dc-bar>`);

  const click = (el: Element) =>
    el.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10, bubbles: true, cancelable: true }));

  it('shows on first click', async () => {
    const chart = await clickChart();
    click(chart.shadowRoot!.querySelector('rect[data-shape-index="0"]')!);
    expect(pop(chart).popupVisible).toBe(true);
    expect(pop(chart).popupContent).toBe('Click A');
  });

  it('hides on a second click of the same bar', async () => {
    const chart = await clickChart();
    const bar = chart.shadowRoot!.querySelector('rect[data-shape-index="0"]')!;
    click(bar);
    click(bar);
    expect(pop(chart).popupVisible).toBe(false);
  });

  it('does not open on hover', async () => {
    const chart = await clickChart();
    chart.shadowRoot!.querySelector('rect[data-shape-index="0"]')!
      .dispatchEvent(new MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    expect(pop(chart).popupVisible).toBe(false);
  });
});

describe('independence between charts', () => {
  it('keeps popup state per chart instance', async () => {
    const a = await barChart();
    const b = await barChart();
    pop(a).showPopup('Only A', 10, 10);
    expect(pop(a).popupVisible).toBe(true);
    expect(pop(b).popupVisible).toBe(false);
    expect(pop(b).popupContent).toBe('');
  });

  it('renders independently', async () => {
    const a = await barChart();
    const b = await barChart();
    pop(a).showPopup('Only A', 10, 10);
    await elementUpdated(a);
    await elementUpdated(b);
    expect(popupDiv(a).classList.contains('visible')).toBe(true);
    expect(popupDiv(b).classList.contains('visible')).toBe(false);
  });
});
