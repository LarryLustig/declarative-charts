import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';

/**
 * `<dc-stage-chart>` ran three index bases over the same stages.
 *
 * `getStages()` returns the non-`[hidden]` stages. The layout keeps a
 * zero-valued stage in place under `zero-hidden` and marks it, and the renderer
 * stamps `data-shape-index` from that *unfiltered* array while skipping the
 * draw. But `getLegendItems()` indexed `resolvedFills` - built over the
 * unfiltered array - with a *post-filter* index, and `getFocusableElements()`
 * assigned post-filter indices that `getShapeBounds()` then resolved against
 * the pre-filter DOM stamp.
 *
 * The fixture matters: the zero stage must be in the MIDDLE. With it last, all
 * three bases coincide and every assertion here passes against the unfixed
 * code - which is exactly the trap the first proposed test fell into.
 */
describe('stage chart index bases', () => {
  const chart = (attrs: Record<string, string> = {}) =>
    fixture<Element>('dc-stage-chart',
      { width: '600', height: '500', 'zero-hidden': '', 'console-log': 'none', ...attrs },
      '<dc-legend></dc-legend>' +
      '<dc-stage value="100" label="Started" fill="#ff0000"></dc-stage>' +
      '<dc-stage value="0" label="Blocked" fill="#00ff00"></dc-stage>' +
      '<dc-stage value="75" label="Completed" fill="#0000ff"></dc-stage>');

  const swatches = (c: Element) =>
    [...c.shadowRoot!.querySelectorAll('[part="legend-swatch"]')]
      .map(g => g.firstElementChild?.getAttribute('fill'));
  const legendLabels = (c: Element) =>
    [...c.shadowRoot!.querySelectorAll('[part="legend-label"]')]
      .map(t => t.textContent?.trim());

  it('drops the hidden zero stage from the legend', async () => {
    const c = await chart();
    await elementUpdated(c as never);
    expect(legendLabels(c)).toEqual(['Started', 'Completed']);
  });

  /**
   * The headline defect. "Completed" was painted #00ff00 - the colour of
   * "Blocked", the stage that is not drawn - because the fill array is built
   * over the unfiltered stages and read with a filtered index.
   */
  it('paints each legend entry the colour of the stage it names', async () => {
    const c = await chart();
    await elementUpdated(c as never);
    expect(swatches(c)).toEqual(['#ff0000', '#0000ff']);
  });

  /**
   * The same disagreement, seen from the keyboard. Focus position 1 is the
   * second *visible* stage - "Completed" - but the popup read `getStages()[1]`,
   * which is "Blocked", the stage that is not drawn. So arrowing to a stage
   * announced one label and popped up another's content.
   *
   * Asserted on the popup rather than on `data-shape-index`, because the fix
   * translates between the two bases rather than renumbering the DOM: the mouse
   * handlers index `cachedLayout.stages`, so the stamps must keep counting over
   * every stage.
   */
  it('pops up the stage the keyboard actually landed on', async () => {
    const c = await chart({ 'auto-popup': '' });
    await elementUpdated(c as never);
    const api = c as unknown as { focusElement: (i: number) => void; popupContent: string };

    api.focusElement(1);
    await elementUpdated(c as never);
    expect(api.popupContent).toContain('Completed');
    expect(api.popupContent, 'popped the hidden stage instead').not.toContain('Blocked');
  });

  it('still pops up the first stage correctly', async () => {
    const c = await chart({ 'auto-popup': '' });
    await elementUpdated(c as never);
    const api = c as unknown as { focusElement: (i: number) => void; popupContent: string };

    api.focusElement(0);
    await elementUpdated(c as never);
    expect(api.popupContent).toContain('Started');
  });

  it('keeps the focusable count on the visible stages', async () => {
    const c = await chart();
    await elementUpdated(c as never);
    const focusCount = (c as unknown as { getFocusableElements: () => unknown[] })
      .getFocusableElements().length;
    expect(focusCount).toBe(2);
  });

  /**
   * Control: with the zero stage LAST, the three bases coincide and nothing is
   * wrong even before the fix. Keeps the fixture above honest - if this ever
   * starts failing, the fix broke the ordinary case.
   */
  it('is unaffected when the hidden stage is last', async () => {
    const c = await fixture<Element>('dc-stage-chart',
      { width: '600', height: '500', 'zero-hidden': '', 'console-log': 'none' },
      '<dc-legend></dc-legend>' +
      '<dc-stage value="100" label="Started" fill="#ff0000"></dc-stage>' +
      '<dc-stage value="75" label="Completed" fill="#0000ff"></dc-stage>' +
      '<dc-stage value="0" label="Blocked" fill="#00ff00"></dc-stage>');
    await elementUpdated(c as never);
    expect(legendLabels(c)).toEqual(['Started', 'Completed']);
    expect(swatches(c)).toEqual(['#ff0000', '#0000ff']);
  });

  it('leaves a chart with no zero stage alone', async () => {
    const c = await fixture<Element>('dc-stage-chart',
      { width: '600', height: '500', 'console-log': 'none' },
      '<dc-legend></dc-legend>' +
      '<dc-stage value="100" label="Started" fill="#ff0000"></dc-stage>' +
      '<dc-stage value="75" label="Completed" fill="#0000ff"></dc-stage>');
    await elementUpdated(c as never);
    expect(swatches(c)).toEqual(['#ff0000', '#0000ff']);
  });
});
