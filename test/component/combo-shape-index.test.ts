import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';

/**
 * Characterization of how `<dc-chart>` addresses its own shapes, written
 * BEFORE changing the mechanism.
 *
 * `data-shape-index` is a per-type counter - bars restart at 0, lines restart
 * at 0, and so on - but two consumers read it as if it were a chart-wide unique
 * id:
 *
 * - `applyPassthroughAttributes()` runs five times, once per type, each
 *   iterating its own array from 0 and doing
 *   `svg.querySelector('[data-shape-index="' + i + '"]')` - the first match in
 *   document order, whatever type it belongs to.
 * - `getFocusableElements()` assigns ONE running index across bars, line
 *   points, bubbles and scatter points, which `getShapeBounds()` then resolves
 *   against those per-type stamps.
 *
 * Both are fixed. Every shape now carries `data-shape-kind` beside its index,
 * so each type is addressed inside its own namespace, and `locateFocus()`
 * translates a focus index into (kind, offset) - generalising the compensation
 * `locateScatterFocus()` already made for scatter alone.
 *
 * Assertions still marked CORRECT are the ones that were already right before
 * the fix; they are regression cover and must not move. The rest were written
 * against the defects and inverted in the commit that fixed them, so the change
 * is visible in the diff rather than asserted from memory.
 *
 * Verified against 0f710e7 in a worktree: every one of these predates the
 * current session.
 */
const COMBO =
  '<dc-bar value="30" label="BarA" data-b="1"></dc-bar>' +
  '<dc-line label="LineL" data-l="1">' +
  '<dc-point value="10" label="P1"></dc-point><dc-point value="20" label="P2"></dc-point></dc-line>' +
  '<dc-area label="AreaR" data-a="1">' +
  '<dc-point value="5" label="Q1"></dc-point><dc-point value="15" label="Q2"></dc-point></dc-area>' +
  '<dc-bubble value="40" size-value="100" label="BubX" data-u="1"></dc-bubble>' +
  '<dc-scatter label="ScatS" data-s="1"><dc-point x="1" value="12"></dc-point></dc-scatter>';

describe('combo chart shape addressing (characterization)', () => {
  const combo = () =>
    fixture<Chart>('dc-chart',
      { width: '700', height: '450', 'auto-popup': '', 'console-log': 'none' }, COMBO);

  /** Tag names carrying a given passthrough attribute. */
  const carriers = (c: Element, attr: string) =>
    [...c.shadowRoot!.querySelectorAll(`[${attr}]`)].map(e => e.tagName.toLowerCase());

  describe('passthrough attributes', () => {
    /**
     * Every type's passthrough used to land on the bar: all five calls asked
     * for `[data-shape-index="0"]` and the bar's `<rect>` is first in document
     * order, so each overwrote the last. Now each is addressed within its own
     * `data-shape-kind` namespace and reaches its own mark.
     */
    it('a line-s passthrough lands on the line', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(carriers(c, 'data-l')).toEqual(['path']);
    });

    it('an area-s passthrough lands on the area', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(carriers(c, 'data-a')).toEqual(['path']);
    });

    it('a bubble-s passthrough lands on the bubble', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(carriers(c, 'data-u')).toEqual(['circle']);
    });

    it('a scatter-s passthrough lands on the scatter marker', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(carriers(c, 'data-s')).toEqual(['g']);
    });

    it('CORRECT: the bar-s own passthrough lands on the bar', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(carriers(c, 'data-b')).toEqual(['rect']);
    });

    /**
     * CORRECT, and the reason this survived: a chart of one type has no
     * competing stamps, so every single-type chart is fine.
     */
    it('CORRECT: a line-only chart puts its passthrough on the line', async () => {
      const c = await fixture<Chart>('dc-chart', { width: '600', height: '400', 'console-log': 'none' },
        '<dc-line label="L" data-l="1"><dc-point value="10"></dc-point>' +
        '<dc-point value="20"></dc-point></dc-line>');
      await elementUpdated(c);
      expect(carriers(c, 'data-l')).toEqual(['path']);
    });
  });

  describe('keyboard focus resolution', () => {
    const bounds = (c: Chart, i: number) =>
      (c as unknown as { getShapeBounds(i: number): unknown }).getShapeBounds(i);
    const focusables = (c: Chart) =>
      (c as unknown as { getFocusableElements(): Array<{ label: string }> }).getFocusableElements();

    it('CORRECT: focus order is bars, then line points, then bubbles, then scatter', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(focusables(c).map(f => f.label.split(':')[0]))
        .toEqual(['BarA', 'LineL, P1', 'LineL, P2', 'BubX', 'ScatS']);
    });

    it('CORRECT: the first bar resolves to a shape', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(bounds(c, 0)).not.toBeNull();
    });

    /**
     * Focus indices 1-3 are line points and the bubble. Against per-type stamps
     * `[data-shape-index="1"]` and up simply did not exist, so no focus ring
     * could be placed and the previous popup stayed on screen while the screen
     * reader announced the new element. `locateFocus()` now translates the
     * running focus index into (kind, offset) before the lookup.
     *
     * Line markers also carried no stamp at all, so this needed one added -
     * numbered across every line and skipping gaps, to match the focus order.
     */
    it('line points resolve to a shape', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(bounds(c, 1)).not.toBeNull();
      expect(bounds(c, 2)).not.toBeNull();
    });

    it('the bubble resolves to a shape', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(bounds(c, 3)).not.toBeNull();
    });

    /**
     * CORRECT, by an existing special case: `getShapeBounds()` checks
     * `locateScatterFocus()` before touching the DOM, precisely because
     * scatter markers share a per-series stamp. That compensation is evidence
     * the collision was already known at one site.
     */
    it('CORRECT: scatter resolves, via its own special case', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(bounds(c, 4)).not.toBeNull();
    });

    it('CORRECT: a bars-only chart resolves every focus index', async () => {
      const c = await fixture<Chart>('dc-chart', { width: '600', height: '400', 'console-log': 'none' },
        '<dc-bar value="30" label="A"></dc-bar><dc-bar value="70" label="B"></dc-bar>');
      await elementUpdated(c);
      expect(bounds(c, 0)).not.toBeNull();
      expect(bounds(c, 1)).not.toBeNull();
    });
  });

  /**
   * `paint` carries the SVG attributes a matched `<dc-fill>` contributes.
   * `LineData` declared the field and `getLines()` never populated it, so a
   * palette entry's `stroke-dasharray` reached bars, areas, bubbles, scatter,
   * slices, stages and radar series - every type except lines. Optional field,
   * silent spread of `undefined`, nothing logged.
   *
   * It stayed unfixed longer than the one-line change suggests: routing paint
   * through the old shared index would have applied a line's palette attributes
   * to a bar in any combo chart. It is only safe now that each type is
   * addressed within its own namespace.
   */
  describe('palette paint reaches every element type', () => {
    const PALETTE =
      '<dc-palette id="p">' +
      '<dc-fill label="LineL" fill="#123456" stroke-dasharray="dashed"></dc-fill>' +
      '</dc-palette>';

    it('reaches a line, and lands on the line rather than the bar', async () => {
      const c = await fixture<Chart>('dc-chart',
        { width: '600', height: '400', palette: 'p', 'console-log': 'none' },
        PALETTE +
        '<dc-bar value="30" label="BarA"></dc-bar>' +
        '<dc-line label="LineL"><dc-point value="10"></dc-point>' +
        '<dc-point value="20"></dc-point></dc-line>');
      await elementUpdated(c);
      const line = c.shadowRoot!.querySelector('path.line-path');
      expect(line?.getAttribute('stroke-dasharray'), 'the line did not inherit palette paint')
        .toBe('5 5');
      expect(
        c.shadowRoot!.querySelector('rect[data-shape-kind="bar"]')?.getAttribute('stroke-dasharray'),
        'the bar picked up the line-s palette paint'
      ).toBeFalsy();
    });
  });

  /**
   * CORRECT throughout. The mouse path binds handlers directly to the element
   * it draws, so it never consults `data-shape-index` and is not affected. This
   * is the regression cover for the fix: whatever changes about addressing,
   * these must not move.
   *
   * Each hover clears the popup first - a stale popup from the previous case
   * reads exactly like a correct one, which cost me two wrong readings while
   * investigating.
   */
  describe('mouse popups are addressed by binding, not by index', () => {
    const hover = async (c: Chart, selector: string) => {
      const api = c as unknown as { popupContent: string; popupVisible: boolean };
      api.popupContent = '';
      api.popupVisible = false;
      await elementUpdated(c);
      const el = c.shadowRoot!.querySelector(selector);
      expect(el, `no element for ${selector}`).not.toBeNull();
      el!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await elementUpdated(c);
      return api.popupContent;
    };

    it('CORRECT: the bar pops up its own content', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(await hover(c, 'rect[data-shape-index]')).toContain('BarA');
    });

    it('CORRECT: the line pops up its own content', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(await hover(c, 'path.line-path')).toContain('LineL');
    });

    it('CORRECT: the bubble pops up its own content', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(await hover(c, 'circle.bubble-shape')).toContain('BubX');
    });

    it('CORRECT: the scatter marker pops up its own content', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(await hover(c, 'g.scatter-marker circle')).toContain('ScatS');
    });

    /**
     * CORRECT, and easily mistaken for a defect: `<dc-area>` binds no
     * mouseenter handler at all - there is no `handleAreaMouseEnter` in the
     * source - so an area path is silent by design, not by breakage.
     */
    it('CORRECT: an area path has no hover popup, by design', async () => {
      const c = await combo();
      await elementUpdated(c);
      expect(await hover(c, 'path.area-path')).toBe('');
    });
  });
});
