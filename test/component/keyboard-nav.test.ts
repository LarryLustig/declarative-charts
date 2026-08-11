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
 * Characterization tests for keyboard navigation in BaseChart.
 *
 * Written *before* extracting KeyboardNavController, pinning current behaviour
 * rather than intended behaviour. Their job is to fail if the extraction changes
 * anything. Where a behaviour looks odd it is still recorded as-is - changing it
 * would be a decision, not a refactor's side effect. See docs/review.md 5.1.
 */

type NavApi = {
  focusedIndex: number;
  keyboardActive: boolean;
  getFocusableElements(): Array<{ index: number; label: string; hasAction: boolean; href?: string }>;
  handleChartKeyDown(e: KeyboardEvent): void;
  handleChartFocus(): void;
  handleChartBlur(e: FocusEvent): void;
  focusElement(index: number): void;
  focusNextElement(): void;
  focusPreviousElement(): void;
  activateCurrentElement(): void;
  getShapeTabIndex(index: number): number;
  isShapeFocused(index: number): boolean;
  getShapeAriaLabel(index: number): string;
};

const nav = (chart: Chart | PieChart) => chart as unknown as NavApi;

const key = (k: string, init: Partial<KeyboardEventInit> = {}) =>
  new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });

const barChart = (extra = '') => fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
  <dc-bar value="10" label="A"></dc-bar>
  <dc-bar value="20" label="B"></dc-bar>
  <dc-bar value="30" label="C"></dc-bar>${extra}`);

describe('focusable elements', () => {
  it('exposes one entry per data element', async () => {
    const c = nav(await barChart());
    const items = c.getFocusableElements();
    expect(items).toHaveLength(3);
    expect(items.map(i => i.index)).toEqual([0, 1, 2]);
  });

  it('labels each entry with its value', async () => {
    const c = nav(await barChart());
    expect(c.getFocusableElements()[0].label).toContain('A');
    expect(c.getFocusableElements()[0].label).toContain('10');
  });

  it('marks elements with an action', async () => {
    const c = nav(await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A" href="https://example.com"></dc-bar>
      <dc-bar value="20" label="B"></dc-bar>`));
    const items = c.getFocusableElements();
    expect(items[0].hasAction).toBe(true);
    expect(items[1].hasAction).toBe(false);
  });
});

describe('initial state', () => {
  it('starts with nothing focused and navigation inactive', async () => {
    const c = nav(await barChart());
    expect(c.focusedIndex).toBe(-1);
    expect(c.keyboardActive).toBe(false);
  });

  it('reports no shape as focused', async () => {
    const c = nav(await barChart());
    expect(c.isShapeFocused(0)).toBe(false);
  });
});

describe('arrow key navigation', () => {
  it('moves forward from nothing focused to the first element', async () => {
    const c = nav(await barChart());
    c.handleChartKeyDown(key('ArrowRight'));
    expect(c.focusedIndex).toBe(0);
  });

  it('advances and wraps at the end', async () => {
    const c = nav(await barChart());
    c.handleChartKeyDown(key('ArrowRight'));
    c.handleChartKeyDown(key('ArrowRight'));
    c.handleChartKeyDown(key('ArrowRight'));
    expect(c.focusedIndex).toBe(2);

    c.handleChartKeyDown(key('ArrowRight'));
    expect(c.focusedIndex).toBe(0);
  });

  it('goes backwards and wraps at the start', async () => {
    const c = nav(await barChart());
    c.focusElement(0);
    c.handleChartKeyDown(key('ArrowLeft'));
    expect(c.focusedIndex).toBe(2);
  });

  it('treats Down/Up the same as Right/Left', async () => {
    const c = nav(await barChart());
    c.handleChartKeyDown(key('ArrowDown'));
    expect(c.focusedIndex).toBe(0);
    c.handleChartKeyDown(key('ArrowDown'));
    expect(c.focusedIndex).toBe(1);
    c.handleChartKeyDown(key('ArrowUp'));
    expect(c.focusedIndex).toBe(0);
  });

  it('jumps to first and last with Home and End', async () => {
    const c = nav(await barChart());
    c.handleChartKeyDown(key('End'));
    expect(c.focusedIndex).toBe(2);
    c.handleChartKeyDown(key('Home'));
    expect(c.focusedIndex).toBe(0);
  });

  it('prevents default on keys it handles', async () => {
    const c = nav(await barChart());
    const e = key('ArrowRight');
    c.handleChartKeyDown(e);
    expect(e.defaultPrevented).toBe(true);
  });

  it('ignores keys it does not handle', async () => {
    const c = nav(await barChart());
    const e = key('a');
    c.handleChartKeyDown(e);
    expect(e.defaultPrevented).toBe(false);
    expect(c.focusedIndex).toBe(-1);
  });

  it('clears focus on Escape', async () => {
    const c = nav(await barChart());
    c.focusElement(1);
    c.handleChartKeyDown(key('Escape'));
    expect(c.focusedIndex).toBe(-1);
  });
});

describe('focus and blur', () => {
  it('activates navigation on focus', async () => {
    const c = nav(await barChart());
    c.handleChartFocus();
    expect(c.keyboardActive).toBe(true);
  });

  // Blur deliberately *keeps* focusedIndex so returning to the chart resumes
  // where you left off. Only keyboardActive is cleared.
  it('deactivates on blur but remembers where focus was', async () => {
    const c = nav(await barChart());
    c.handleChartFocus();
    c.focusElement(1);
    c.handleChartBlur(new FocusEvent('blur'));
    expect(c.keyboardActive).toBe(false);
    expect(c.focusedIndex).toBe(1);
  });
});

describe('focusElement bounds', () => {
  it('sets the index within range', async () => {
    const c = nav(await barChart());
    c.focusElement(2);
    expect(c.focusedIndex).toBe(2);
  });

  it('ignores an out-of-range index', async () => {
    const c = nav(await barChart());
    c.focusElement(1);
    c.focusElement(99);
    expect(c.focusedIndex).toBe(1);
    c.focusElement(-5);
    expect(c.focusedIndex).toBe(1);
  });

  it('marks the focused shape and no other', async () => {
    const c = nav(await barChart());
    c.handleChartFocus();
    c.focusElement(1);
    expect(c.isShapeFocused(1)).toBe(true);
    expect(c.isShapeFocused(0)).toBe(false);
  });
});

describe('roving tabindex', () => {
  // The roving happens at the chart level: the <svg> is the single tab stop and
  // shapes are never in the tab order, focused programmatically instead.
  it('keeps every shape out of the tab order', async () => {
    const c = nav(await barChart());
    c.focusElement(1);
    expect(c.getShapeTabIndex(1)).toBe(-1);
    expect(c.getShapeTabIndex(0)).toBe(-1);
    expect(c.getShapeTabIndex(2)).toBe(-1);
  });

  it('exposes an aria label per shape', async () => {
    const c = nav(await barChart());
    expect(c.getShapeAriaLabel(0)).toContain('A');
  });
});

describe('activation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('follows an href on Enter', async () => {
    const c = nav(await fixture<Chart>('dc-chart', { width: '600', height: '400' },
      '<dc-bar value="10" label="A" href="https://example.com/a"></dc-bar>'));
    const go = vi.spyOn(c as unknown as { navigateToHref(h: string): void }, 'navigateToHref')
      .mockImplementation(() => {});

    c.focusElement(0);
    c.handleChartKeyDown(key('Enter'));

    expect(go).toHaveBeenCalledWith('https://example.com/a');
  });

  it('treats Space like Enter', async () => {
    const c = nav(await fixture<Chart>('dc-chart', { width: '600', height: '400' },
      '<dc-bar value="10" label="A" href="https://example.com/a"></dc-bar>'));
    const go = vi.spyOn(c as unknown as { navigateToHref(h: string): void }, 'navigateToHref')
      .mockImplementation(() => {});

    c.focusElement(0);
    c.handleChartKeyDown(key(' '));

    expect(go).toHaveBeenCalled();
  });

  // Only a click-triggered popup responds to activation; a hover popup or a
  // plain element does nothing.
  it('toggles a click-triggered popup', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"><dc-popup trigger="click">Detail</dc-popup></dc-bar>
      <dc-bar value="20" label="B"><dc-popup trigger="click">Detail</dc-popup></dc-bar>`);
    const c = nav(chart);
    const toggle = vi.spyOn(
      chart as unknown as { togglePopupForFocusedElement(i: number): void },
      'togglePopupForFocusedElement').mockImplementation(() => {});

    c.focusElement(1);
    c.handleChartKeyDown(key('Enter'));

    expect(toggle).toHaveBeenCalledWith(1);
  });

  it('does nothing for an element with no action', async () => {
    const chart = await barChart();
    const c = nav(chart);
    const toggle = vi.spyOn(
      chart as unknown as { togglePopupForFocusedElement(i: number): void },
      'togglePopupForFocusedElement').mockImplementation(() => {});

    c.focusElement(1);
    c.handleChartKeyDown(key('Enter'));

    expect(toggle).not.toHaveBeenCalled();
  });

  it('does nothing when no element is focused', async () => {
    const chart = await barChart();
    const c = nav(chart);
    const toggle = vi.spyOn(
      chart as unknown as { togglePopupForFocusedElement(i: number): void },
      'togglePopupForFocusedElement').mockImplementation(() => {});

    c.handleChartKeyDown(key('Enter'));

    expect(toggle).not.toHaveBeenCalled();
  });
});

describe('rendering integration', () => {
  it('makes the chart focusable when it has data', async () => {
    const chart = await barChart();
    expect(chart.shadowRoot!.querySelector('svg')!.getAttribute('tabindex')).toBe('0');
  });

  it('draws a focus indicator only while navigating', async () => {
    const chart = await barChart();
    expect(chart.shadowRoot!.querySelector('.focus-indicator')).toBeNull();

    nav(chart).handleChartFocus();
    nav(chart).focusElement(0);
    await elementUpdated(chart);

    expect(chart.shadowRoot!.querySelector('.focus-indicator')).not.toBeNull();
  });

  it('removes the indicator on blur', async () => {
    const chart = await barChart();
    nav(chart).handleChartFocus();
    nav(chart).focusElement(0);
    await elementUpdated(chart);
    expect(chart.shadowRoot!.querySelector('.focus-indicator')).not.toBeNull();

    nav(chart).handleChartBlur(new FocusEvent('blur'));
    await elementUpdated(chart);

    expect(chart.shadowRoot!.querySelector('.focus-indicator')).toBeNull();
  });

  // Position cannot be asserted here: getShapeBounds uses getBBox(), which
  // happy-dom returns as zeros. What matters for the refactor is that changing
  // the index still drives a re-render at all - the indicator's placement is
  // checked in a real browser instead.
  it('re-renders when the focused index changes', async () => {
    const chart = await barChart();
    const c = nav(chart);
    c.handleChartFocus();
    c.focusElement(0);
    await elementUpdated(chart);
    expect(chart.shadowRoot!.querySelector('.focus-indicator')).not.toBeNull();

    c.focusElement(2);
    await elementUpdated(chart);

    expect(c.focusedIndex).toBe(2);
    expect(chart.shadowRoot!.querySelector('.focus-indicator')).not.toBeNull();
  });

  it('works the same for non-axis charts', async () => {
    const chart = await fixture<PieChart>('dc-pie-chart', { width: '600', height: '400' }, `
      <dc-pie-slice value="30" label="A"></dc-pie-slice>
      <dc-pie-slice value="70" label="B"></dc-pie-slice>`);
    const c = nav(chart);

    expect(c.getFocusableElements()).toHaveLength(2);
    c.handleChartKeyDown(key('ArrowRight'));
    expect(c.focusedIndex).toBe(0);
  });

  it('does nothing on an empty chart', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, '');
    const c = nav(chart);

    expect(c.getFocusableElements()).toHaveLength(0);
    c.handleChartKeyDown(key('ArrowRight'));
    expect(c.focusedIndex).toBe(-1);
  });
});
