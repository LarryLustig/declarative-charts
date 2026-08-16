import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';

/**
 * Every chart has a `generate*PopupContent()` builder, and every mouse-enter
 * handler uses it. Every `showPopupForFocusedElement()` hand-rolled the string
 * inline instead - interpolating the raw value with no `formatValue`, no
 * per-element `value-format` and no locale, and hand-rolling the percent as
 * `.toFixed(1)` rather than through `formatPercent`.
 *
 * So the same element showed `Value: $50.00` on hover and `Value: 50` on
 * keyboard focus. A keyboard user got a different, unformatted chart.
 *
 * The contract these tests encode is parity, not a literal string: whatever the
 * builder emits, both entry points must emit. That is deliberately
 * direction-agnostic, because routing through the builder moves text both ways
 * - it drops the "Percent: " and "Conversion: " prefixes the inline copies
 * invented, and adds the percent line the inline copies for points and bubbles
 * omitted.
 *
 * That `chart.ts` already routed *scatter* through its shared builder while
 * bars, points and bubbles a few lines later did not is what marks this as
 * bypass rather than intent.
 */
describe('keyboard popups match hover popups', () => {
  /** Content after hovering shape `index`, then after focusing it. */
  const bothPaths = async (chart: Element, index: number) => {
    const c = chart as unknown as {
      popupContent: string;
      focusElement: (i: number) => void;
      hidePopup?: () => void;
    };
    const shape = chart.shadowRoot!.querySelector(`[data-shape-index="${index}"]`);
    expect(shape, `no shape stamped with data-shape-index="${index}"`).not.toBeNull();
    shape!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await elementUpdated(chart as never);
    const hover = c.popupContent;

    c.focusElement(index);
    await elementUpdated(chart as never);
    const keyboard = c.popupContent;

    return { hover, keyboard };
  };

  it('pie: the slice value keeps its value-format', async () => {
    const c = await fixture<Element>('dc-pie-chart',
      { width: '500', height: '400', 'auto-popup': '', 'value-format': 'currency USD', 'console-log': 'none' },
      '<dc-pie-slice value="50" label="A"></dc-pie-slice>' +
      '<dc-pie-slice value="150" label="B"></dc-pie-slice>');
    await elementUpdated(c as never);
    const { hover, keyboard } = await bothPaths(c, 0);
    expect(hover, 'premise: the hover path formats').toContain('$50.00');
    expect(keyboard).toBe(hover);
  });

  it('funnel: the stage value keeps its value-format', async () => {
    const c = await fixture<Element>('dc-funnel-chart',
      { width: '500', height: '400', 'auto-popup': '', 'value-format': 'currency USD', 'console-log': 'none' },
      '<dc-funnel-stage value="100" label="A"></dc-funnel-stage>' +
      '<dc-funnel-stage value="50" label="B"></dc-funnel-stage>');
    await elementUpdated(c as never);
    const { hover, keyboard } = await bothPaths(c, 0);
    expect(hover, 'premise: the hover path formats').toContain('$100.00');
    expect(keyboard).toBe(hover);
  });

  it('stage: the stage value keeps its value-format', async () => {
    const c = await fixture<Element>('dc-stage-chart',
      { width: '500', height: '400', 'auto-popup': '', 'value-format': 'currency USD', 'console-log': 'none' },
      '<dc-stage value="100" label="A"></dc-stage>' +
      '<dc-stage value="50" label="B"></dc-stage>');
    await elementUpdated(c as never);
    const { hover, keyboard } = await bothPaths(c, 0);
    expect(hover, 'premise: the hover path formats').toContain('$100.00');
    expect(keyboard).toBe(hover);
  });

  it('bar: the bar value keeps its value-format', async () => {
    const c = await fixture<Element>('dc-chart',
      { width: '500', height: '400', 'auto-popup': '', 'value-format': 'currency USD', 'console-log': 'none' },
      '<dc-bar value="30" label="A"></dc-bar><dc-bar value="70" label="B"></dc-bar>');
    await elementUpdated(c as never);
    const { hover, keyboard } = await bothPaths(c, 0);
    expect(hover, 'premise: the hover path formats').toContain('$30.00');
    expect(keyboard).toBe(hover);
  });

  /**
   * Locale is the half `value-format` alone does not prove: the inline copies
   * interpolated a JS number, so they were locale-blind even with no format set.
   */
  it('carries the locale, not just the format', async () => {
    const c = await fixture<Element>('dc-pie-chart',
      { width: '500', height: '400', 'auto-popup': '', 'value-format': 'number 2',
        locale: 'de-DE', 'console-log': 'none' },
      '<dc-pie-slice value="1234.5" label="A"></dc-pie-slice>' +
      '<dc-pie-slice value="1000" label="B"></dc-pie-slice>');
    await elementUpdated(c as never);
    const { hover, keyboard } = await bothPaths(c, 0);
    expect(hover, 'premise: de-DE uses a comma decimal separator').toContain('1.234,50');
    expect(keyboard).toBe(hover);
  });

  /**
   * A per-element override, which the inline copies could not see at all -
   * they never consulted the element's own `value-format`.
   */
  it('honours a per-element value-format', async () => {
    const c = await fixture<Element>('dc-pie-chart',
      { width: '500', height: '400', 'auto-popup': '', 'console-log': 'none' },
      '<dc-pie-slice value="1234" label="A" value-format="compact 1"></dc-pie-slice>' +
      '<dc-pie-slice value="1000" label="B"></dc-pie-slice>');
    await elementUpdated(c as never);
    const { hover, keyboard } = await bothPaths(c, 0);
    expect(hover, 'premise: compact formatting on the slice').toContain('1.2K');
    expect(keyboard).toBe(hover);
  });
});
