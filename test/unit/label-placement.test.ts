import { describe, it, expect } from 'vitest';
import {
  labelRect,
  placeLabels,
  type LabelCandidate,
  type LabelRect
} from '../../src/chart-utils';

const PLOT: LabelRect = { left: 0, right: 100, top: 0, bottom: 100 };

const label = (over: Partial<LabelCandidate> = {}): LabelCandidate => ({
  x: 50,
  y: 50,
  width: 20,
  fontSize: 10,
  anchor: 'middle',
  ...over
});

describe('labelRect', () => {
  it('centres a middle-anchored label on x', () => {
    expect(labelRect(label({ x: 50, width: 20 }))).toMatchObject({ left: 40, right: 60 });
  });

  it('starts a start-anchored label at x', () => {
    expect(labelRect(label({ x: 50, width: 20, anchor: 'start' }))).toMatchObject({
      left: 50,
      right: 70
    });
  });

  it('ends an end-anchored label at x', () => {
    expect(labelRect(label({ x: 50, width: 20, anchor: 'end' }))).toMatchObject({
      left: 30,
      right: 50
    });
  });

  it('treats an unknown anchor as middle, the SVG default', () => {
    expect(labelRect(label({ anchor: 'nonsense' }))).toEqual(labelRect(label()));
  });

  it('puts most of the height above the baseline', () => {
    const r = labelRect(label({ y: 50, fontSize: 10 }));
    expect(r.top).toBe(42);
    expect(r.bottom).toBe(52);
  });

  it('scales the height with the font size', () => {
    const small = labelRect(label({ fontSize: 10 }));
    const large = labelRect(label({ fontSize: 20 }));
    expect(large.bottom - large.top).toBeCloseTo(2 * (small.bottom - small.top), 10);
  });
});

describe('placeLabels', () => {
  describe('mode: show', () => {
    it('leaves everything alone', () => {
      const labels = [label({ x: -100 }), label({ x: 50 }), label({ x: 50 })];
      expect(placeLabels(labels, PLOT, 'show')).toEqual([
        { dx: 0, visible: true },
        { dx: 0, visible: true },
        { dx: 0, visible: true }
      ]);
    });
  });

  describe('clamping', () => {
    it('shifts a label overhanging the left edge inward', () => {
      // x=0, width 20, middle-anchored: occupies -10..10, so it needs +10.
      const [p] = placeLabels([label({ x: 0 })], PLOT, 'clamp');
      expect(p.dx).toBe(10);
    });

    it('shifts a label overhanging the right edge inward', () => {
      const [p] = placeLabels([label({ x: 100 })], PLOT, 'clamp');
      expect(p.dx).toBe(-10);
    });

    it('brings the shifted label exactly to the edge, not past it', () => {
      const [p] = placeLabels([label({ x: 0 })], PLOT, 'clamp');
      const r = labelRect(label({ x: 0 }));
      expect(r.left + p.dx).toBe(PLOT.left);
    });

    it('leaves a label already inside alone', () => {
      expect(placeLabels([label({ x: 50 })], PLOT, 'clamp')[0].dx).toBe(0);
    });

    it('leaves a label exactly on the edge alone', () => {
      expect(placeLabels([label({ x: 10 })], PLOT, 'clamp')[0].dx).toBe(0);
    });

    it('gives up on a label wider than the plot', () => {
      // Shifting would only trade one overhang for another.
      expect(placeLabels([label({ x: 50, width: 500 })], PLOT, 'clamp')[0].dx).toBe(0);
    });

    it('never moves a label vertically', () => {
      // A sideways shift keeps the label on its datapoint's row; a vertical one
      // would not, so the placement interface has no dy at all.
      const [p] = placeLabels([label({ x: 0, y: -50 })], PLOT, 'clamp');
      expect(Object.keys(p).sort()).toEqual(['dx', 'visible']);
    });

    it('keeps everything visible', () => {
      const stacked = [label(), label(), label()];
      expect(placeLabels(stacked, PLOT, 'clamp').every(p => p.visible)).toBe(true);
    });
  });

  describe('hiding', () => {
    it('keeps a single label', () => {
      expect(placeLabels([label()], PLOT, 'hide')).toEqual([{ dx: 0, visible: true }]);
    });

    it('keeps labels that do not touch', () => {
      const labels = [label({ x: 10, width: 10 }), label({ x: 80, width: 10 })];
      expect(placeLabels(labels, PLOT, 'hide').map(p => p.visible)).toEqual([true, true]);
    });

    it('hides the second of two labels in the same place', () => {
      expect(placeLabels([label(), label()], PLOT, 'hide').map(p => p.visible)).toEqual([
        true,
        false
      ]);
    });

    it('keeps the first in document order, not the widest or the last', () => {
      const labels = [label({ width: 5 }), label({ width: 50 })];
      expect(placeLabels(labels, PLOT, 'hide').map(p => p.visible)).toEqual([true, false]);
    });

    it('compares against what was kept, not against everything', () => {
      // B is hidden by A, so C is judged against A alone - otherwise a dropped
      // label would go on blocking the space it is not occupying.
      const labels = [
        label({ x: 20, width: 10 }),
        label({ x: 22, width: 10 }),
        label({ x: 32, width: 10 })
      ];
      expect(placeLabels(labels, PLOT, 'hide').map(p => p.visible)).toEqual([true, false, true]);
    });

    it('ignores labels on a different row', () => {
      const labels = [label({ y: 20 }), label({ y: 60 })];
      expect(placeLabels(labels, PLOT, 'hide').map(p => p.visible)).toEqual([true, true]);
    });

    it('hides labels that overlap only vertically-adjacent rows', () => {
      const labels = [label({ y: 50 }), label({ y: 52 })];
      expect(placeLabels(labels, PLOT, 'hide').map(p => p.visible)).toEqual([true, false]);
    });

    it('honours the gap: labels that merely abut still collide', () => {
      const touching = [label({ x: 20, width: 10 }), label({ x: 30, width: 10 })];
      expect(placeLabels(touching, PLOT, 'hide', 2).map(p => p.visible)).toEqual([true, false]);
      expect(placeLabels(touching, PLOT, 'hide', 0).map(p => p.visible)).toEqual([true, true]);
    });

    it('tests the clamped position, not the original one', () => {
      // Far apart where they were asked to go - 30 units of clear space - but
      // both off the left edge, so both clamp to the same place. Comparing the
      // original positions would let both through, and they would then be drawn
      // on top of each other.
      const labels = [label({ x: -100 }), label({ x: -50 })];
      const original = labels.map(l => labelRect(l));
      expect(original[0].right).toBeLessThan(original[1].left - 2);

      expect(placeLabels(labels, PLOT, 'hide').map(p => p.visible)).toEqual([true, false]);
    });

    it('still reports the shift for a label it hides', () => {
      const labels = [label({ x: 0 }), label({ x: 0 })];
      expect(placeLabels(labels, PLOT, 'hide')[1]).toEqual({ dx: 10, visible: false });
    });
  });

  describe('degenerate input', () => {
    it('returns nothing for no labels', () => {
      expect(placeLabels([], PLOT, 'hide')).toEqual([]);
    });

    it('returns one placement per label', () => {
      const labels = [label(), label(), label(), label()];
      expect(placeLabels(labels, PLOT, 'hide')).toHaveLength(4);
    });

    it('handles a zero-width label', () => {
      const labels = [label({ width: 0 }), label({ width: 0 })];
      expect(placeLabels(labels, PLOT, 'hide').map(p => p.visible)).toEqual([true, false]);
    });

    it('defaults to hide', () => {
      expect(placeLabels([label(), label()], PLOT).map(p => p.visible)).toEqual([true, false]);
    });
  });
});
