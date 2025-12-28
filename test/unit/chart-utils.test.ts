import { describe, it, expect } from 'vitest';
import {
  niceNumber,
  calculateNiceTicks,
  calculateTicksByInterval,
  calculateTicks,
  calculateLabelLines,
  calculateLabelInterval,
  calculatePopupPosition,
  showPopupAtBounds,
  type ShapeBounds,
  type ClientRect
} from '../../src/chart-utils';

/**
 * Unit tests for chart utility functions.
 * These are pure functions with no DOM dependencies.
 */

// ============================================================================
// Nice Number and Tick Calculations
// ============================================================================

describe('niceNumber', () => {
  it('returns 0 for 0', () => {
    expect(niceNumber(0)).toBe(0);
    expect(niceNumber(0, true)).toBe(0);
  });

  describe('ceiling mode (round=false)', () => {
    it('ceilings to 1 for values <= 1', () => {
      expect(niceNumber(0.5)).toBe(0.5);  // 0.5 * 10^0 = 0.5
      expect(niceNumber(0.8)).toBe(1);    // ceil(0.8) -> 1
      expect(niceNumber(1)).toBe(1);
    });

    it('ceilings to 2 for values <= 2', () => {
      expect(niceNumber(1.5)).toBe(2);
      expect(niceNumber(2)).toBe(2);
    });

    it('ceilings to 5 for values <= 5', () => {
      expect(niceNumber(3)).toBe(5);
      expect(niceNumber(4)).toBe(5);
      expect(niceNumber(5)).toBe(5);
    });

    it('ceilings to 10 for values <= 10', () => {
      expect(niceNumber(6)).toBe(10);
      expect(niceNumber(8)).toBe(10);
      expect(niceNumber(10)).toBe(10);
    });

    it('scales correctly for larger values', () => {
      expect(niceNumber(15)).toBe(20);    // 1.5 -> 2, *10 = 20
      expect(niceNumber(45)).toBe(50);    // 4.5 -> 5, *10 = 50
      expect(niceNumber(80)).toBe(100);   // 8 -> 10, *10 = 100
      expect(niceNumber(350)).toBe(500);  // 3.5 -> 5, *100 = 500
    });

    it('handles fractional values', () => {
      expect(niceNumber(0.015)).toBe(0.02);  // 1.5 -> 2, *0.01 = 0.02
      expect(niceNumber(0.0045)).toBe(0.005);  // 4.5 -> 5, *0.001 = 0.005
    });
  });

  describe('rounding mode (round=true)', () => {
    it('rounds to 1 for values < 1.5', () => {
      expect(niceNumber(1, true)).toBe(1);
      expect(niceNumber(1.4, true)).toBe(1);
    });

    it('rounds to 2 for values >= 1.5 and < 3', () => {
      expect(niceNumber(1.5, true)).toBe(2);
      expect(niceNumber(2.9, true)).toBe(2);
    });

    it('rounds to 5 for values >= 3 and < 7', () => {
      expect(niceNumber(3, true)).toBe(5);
      expect(niceNumber(6.9, true)).toBe(5);
    });

    it('rounds to 10 for values >= 7', () => {
      expect(niceNumber(7, true)).toBe(10);
      expect(niceNumber(9, true)).toBe(10);
    });

    it('scales correctly for larger values', () => {
      expect(niceNumber(18, true)).toBe(20);   // 1.8 -> 2, *10 = 20
      expect(niceNumber(35, true)).toBe(50);   // 3.5 -> 5, *10 = 50
      expect(niceNumber(75, true)).toBe(100);  // 7.5 -> 10, *10 = 100
    });
  });
});

describe('calculateNiceTicks', () => {
  it('returns single value for equal min/max', () => {
    expect(calculateNiceTicks(5, 5)).toEqual([5]);
  });

  it('returns single value for reversed range', () => {
    expect(calculateNiceTicks(10, 5)).toEqual([10]);
  });

  it('generates ticks with nice intervals', () => {
    const ticks = calculateNiceTicks(0, 100, 5);
    expect(ticks).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('respects target count approximately', () => {
    const ticks = calculateNiceTicks(0, 100, 4);
    // Should generate roughly 4-5 ticks with nice intervals
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.length).toBeLessThanOrEqual(6);
  });

  it('handles ranges not starting at zero', () => {
    const ticks = calculateNiceTicks(50, 150, 5);
    expect(ticks[0]).toBeGreaterThanOrEqual(50);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(150);
    ticks.forEach(t => {
      expect(t).toBeGreaterThanOrEqual(50);
      expect(t).toBeLessThanOrEqual(150);
    });
  });

  it('handles negative ranges', () => {
    const ticks = calculateNiceTicks(-100, -20, 4);
    expect(ticks[0]).toBeGreaterThanOrEqual(-100);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(-20);
  });

  it('handles mixed positive/negative ranges', () => {
    const ticks = calculateNiceTicks(-50, 50, 5);
    expect(ticks[0]).toBeGreaterThanOrEqual(-50);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(50);
    // Should include zero or values around it
    expect(ticks.some(t => t === 0 || Math.abs(t) < 20)).toBe(true);
  });

  it('handles small ranges', () => {
    const ticks = calculateNiceTicks(0, 1, 5);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]).toBeGreaterThanOrEqual(0);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(1);
  });

  it('handles target count of 1', () => {
    const ticks = calculateNiceTicks(0, 100, 1);
    expect(ticks.length).toBeGreaterThan(0);
  });
});

describe('calculateTicksByInterval', () => {
  it('returns single value for zero interval', () => {
    expect(calculateTicksByInterval(0, 100, 0)).toEqual([0]);
  });

  it('returns single value for negative interval', () => {
    expect(calculateTicksByInterval(0, 100, -10)).toEqual([0]);
  });

  it('returns single value for reversed range', () => {
    expect(calculateTicksByInterval(100, 0, 10)).toEqual([100]);
  });

  it('generates ticks at exact intervals', () => {
    const ticks = calculateTicksByInterval(0, 100, 25);
    expect(ticks).toEqual([0, 25, 50, 75, 100]);
  });

  it('handles non-zero start', () => {
    const ticks = calculateTicksByInterval(10, 50, 10);
    expect(ticks).toEqual([10, 20, 30, 40, 50]);
  });

  it('aligns to interval multiples', () => {
    const ticks = calculateTicksByInterval(5, 45, 10);
    // Should start at 10 (first multiple of 10 >= 5)
    expect(ticks).toEqual([10, 20, 30, 40]);
  });

  it('handles fractional intervals', () => {
    const ticks = calculateTicksByInterval(0, 1, 0.25);
    expect(ticks).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('handles negative ranges', () => {
    const ticks = calculateTicksByInterval(-100, -20, 20);
    expect(ticks).toEqual([-100, -80, -60, -40, -20]);
  });

  it('handles mixed ranges', () => {
    const ticks = calculateTicksByInterval(-20, 20, 10);
    expect(ticks).toEqual([-20, -10, 0, 10, 20]);
  });
});

describe('calculateTicks', () => {
  it('uses explicit values when provided', () => {
    const ticks = calculateTicks(0, 100, { values: [0, 25, 50, 100] });
    expect(ticks).toEqual([0, 25, 50, 100]);
  });

  it('filters explicit values to range', () => {
    const ticks = calculateTicks(10, 90, { values: [0, 25, 50, 75, 100] });
    expect(ticks).toEqual([25, 50, 75]);
  });

  it('sorts explicit values', () => {
    const ticks = calculateTicks(0, 100, { values: [75, 25, 100, 0, 50] });
    expect(ticks).toEqual([0, 25, 50, 75, 100]);
  });

  it('uses interval when provided (priority 2)', () => {
    const ticks = calculateTicks(0, 100, { interval: 25, count: 3 });
    expect(ticks).toEqual([0, 25, 50, 75, 100]);
  });

  it('uses count when no interval or values (priority 3)', () => {
    const ticks = calculateTicks(0, 100, { count: 5 });
    expect(ticks.length).toBeGreaterThanOrEqual(4);
    expect(ticks.length).toBeLessThanOrEqual(7);
  });

  it('uses default count of 5 when no config', () => {
    const ticks = calculateTicks(0, 100);
    expect(ticks.length).toBeGreaterThanOrEqual(4);
    expect(ticks.length).toBeLessThanOrEqual(7);
  });

  it('handles empty values array gracefully', () => {
    const ticks = calculateTicks(0, 100, { values: [] });
    // Should fall through to count-based calculation
    expect(ticks.length).toBeGreaterThan(0);
  });

  it('ignores zero or negative interval', () => {
    const ticksZero = calculateTicks(0, 100, { interval: 0 });
    const ticksNeg = calculateTicks(0, 100, { interval: -10 });
    // Should fall through to count-based calculation
    expect(ticksZero.length).toBeGreaterThan(0);
    expect(ticksNeg.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Label Layout Calculations
// ============================================================================

describe('calculateLabelLines', () => {
  it('returns 1 for empty labels', () => {
    expect(calculateLabelLines(0, 50, 500)).toBe(1);
  });

  it('returns 1 when labels fit in single line', () => {
    // 5 labels, 50px each, 500px total = 100px per label space
    expect(calculateLabelLines(5, 50, 500)).toBe(1);
  });

  it('returns 2 when labels need two lines', () => {
    // 10 labels, 100px each, 500px total = 50px per label space
    // 100 / 50 = 2 lines needed
    expect(calculateLabelLines(10, 100, 500)).toBe(2);
  });

  it('returns 3 when labels need three lines', () => {
    // 10 labels, 150px each, 500px total = 50px per label space
    // 150 / 50 = 3 lines needed
    expect(calculateLabelLines(10, 150, 500)).toBe(3);
  });

  it('caps at 4 lines by default', () => {
    // Very wide labels that would need more than 4 lines
    expect(calculateLabelLines(10, 500, 500)).toBe(4);
  });

  it('respects custom maxLines parameter', () => {
    // Would need 5 lines but capped at 2
    expect(calculateLabelLines(10, 250, 500, 2)).toBe(2);
  });

  it('handles wide labels correctly', () => {
    // 4 labels, 200px each, 400px total = 100px per label
    // 200 / 100 = 2 lines needed
    expect(calculateLabelLines(4, 200, 400)).toBe(2);
  });

  it('handles single label', () => {
    expect(calculateLabelLines(1, 100, 500)).toBe(1);
  });

  it('handles very narrow chart', () => {
    // Labels won't fit, should max out
    expect(calculateLabelLines(5, 100, 100)).toBe(4);
  });
});

describe('calculateLabelInterval', () => {
  it('returns 1 for empty labels', () => {
    expect(calculateLabelInterval(0, 50, 500)).toBe(1);
  });

  it('returns 1 when labels fit without interval', () => {
    // 5 labels, 30px each + 8px gap = 38px needed, 100px available
    expect(calculateLabelInterval(5, 30, 500)).toBe(1);
  });

  it('returns 2 when every other label should show', () => {
    // 10 labels, 80px each + 8px gap = 88px, but only 50px available per label
    // 88 / 50 = ~1.76, ceil to 2
    expect(calculateLabelInterval(10, 80, 500)).toBe(2);
  });

  it('returns higher interval for crowded labels', () => {
    // 20 labels, 100px each + 8px gap = 108px, only 25px available
    // 108 / 25 = 4.32, ceil to 5
    expect(calculateLabelInterval(20, 100, 500)).toBe(5);
  });

  it('respects custom minGap parameter', () => {
    // 5 labels, 50px each, 500px total = 100px per label
    // With 20px gap: 70 / 100 = 0.7, ceil to 1
    expect(calculateLabelInterval(5, 50, 500, 20)).toBe(1);
    // With 100px gap: 150 / 100 = 1.5, ceil to 2
    expect(calculateLabelInterval(5, 50, 500, 100)).toBe(2);
  });

  it('handles single label', () => {
    expect(calculateLabelInterval(1, 100, 500)).toBe(1);
  });

  it('handles very wide labels', () => {
    // Labels wider than available space
    expect(calculateLabelInterval(10, 200, 200)).toBeGreaterThan(1);
  });
});

describe('calculatePopupPosition', () => {
  const bounds: ShapeBounds = {
    x: 100,
    y: 50,
    width: 40,
    height: 60
  };

  const chartRect: ClientRect = {
    left: 200,
    top: 100,
    width: 600,
    height: 400
  };

  const svgRect: ClientRect = {
    left: 200,
    top: 100,
    width: 600,
    height: 400
  };

  it('calculates position at center-top of bounds', () => {
    const pos = calculatePopupPosition(bounds, chartRect, svgRect, 600, 400);

    // x = chartRect.left + (bounds.x + bounds.width/2) * scaleX
    // x = 200 + (100 + 20) * 1 = 320
    expect(pos.x).toBe(320);

    // y = chartRect.top + bounds.y * scaleY
    // y = 100 + 50 * 1 = 150
    expect(pos.y).toBe(150);
  });

  it('applies scale correctly when SVG is scaled', () => {
    const scaledSvgRect: ClientRect = {
      left: 200,
      top: 100,
      width: 300, // Half size
      height: 200
    };

    const pos = calculatePopupPosition(bounds, chartRect, scaledSvgRect, 600, 400);

    // scaleX = 300/600 = 0.5, scaleY = 200/400 = 0.5
    // x = 200 + (100 + 20) * 0.5 = 260
    expect(pos.x).toBe(260);

    // y = 100 + 50 * 0.5 = 125
    expect(pos.y).toBe(125);
  });

  it('handles bounds at origin', () => {
    const originBounds: ShapeBounds = { x: 0, y: 0, width: 50, height: 50 };
    const pos = calculatePopupPosition(originBounds, chartRect, svgRect, 600, 400);

    expect(pos.x).toBe(225); // 200 + 25 * 1
    expect(pos.y).toBe(100); // 100 + 0 * 1
  });

  it('handles large viewBox with small actual size', () => {
    const smallSvgRect: ClientRect = { left: 100, top: 50, width: 150, height: 100 };
    const smallChartRect: ClientRect = { left: 100, top: 50, width: 150, height: 100 };

    const pos = calculatePopupPosition(bounds, smallChartRect, smallSvgRect, 600, 400);

    // scaleX = 150/600 = 0.25, scaleY = 100/400 = 0.25
    // x = 100 + (100 + 20) * 0.25 = 130
    expect(pos.x).toBe(130);
    // y = 50 + 50 * 0.25 = 62.5
    expect(pos.y).toBe(62.5);
  });
});

describe('showPopupAtBounds', () => {
  it('returns false when content is null', () => {
    const result = showPopupAtBounds(
      null,
      { x: 0, y: 0, width: 10, height: 10 },
      () => ({ left: 0, top: 0, width: 100, height: 100 }),
      () => ({ left: 0, top: 0, width: 100, height: 100 }),
      { width: 100, height: 100 },
      () => {}
    );
    expect(result).toBe(false);
  });

  it('returns false when content is undefined', () => {
    const result = showPopupAtBounds(
      undefined,
      { x: 0, y: 0, width: 10, height: 10 },
      () => ({ left: 0, top: 0, width: 100, height: 100 }),
      () => ({ left: 0, top: 0, width: 100, height: 100 }),
      { width: 100, height: 100 },
      () => {}
    );
    expect(result).toBe(false);
  });

  it('returns false when bounds is null', () => {
    const result = showPopupAtBounds(
      'Test content',
      null,
      () => ({ left: 0, top: 0, width: 100, height: 100 }),
      () => ({ left: 0, top: 0, width: 100, height: 100 }),
      { width: 100, height: 100 },
      () => {}
    );
    expect(result).toBe(false);
  });

  it('returns false when getSvgRect returns null', () => {
    const result = showPopupAtBounds(
      'Test content',
      { x: 0, y: 0, width: 10, height: 10 },
      () => ({ left: 0, top: 0, width: 100, height: 100 }),
      () => null,
      { width: 100, height: 100 },
      () => {}
    );
    expect(result).toBe(false);
  });

  it('calls showPopup with correct coordinates and returns true', () => {
    let capturedContent = '';
    let capturedX = 0;
    let capturedY = 0;

    const result = showPopupAtBounds(
      'Test popup content',
      { x: 100, y: 50, width: 40, height: 60 },
      () => ({ left: 200, top: 100, width: 600, height: 400 }),
      () => ({ left: 200, top: 100, width: 600, height: 400 }),
      { width: 600, height: 400 },
      (content, x, y) => {
        capturedContent = content;
        capturedX = x;
        capturedY = y;
      }
    );

    expect(result).toBe(true);
    expect(capturedContent).toBe('Test popup content');
    expect(capturedX).toBe(320); // 200 + (100 + 20) * 1
    expect(capturedY).toBe(150); // 100 + 50 * 1
  });

  it('handles scaled SVG correctly', () => {
    let capturedX = 0;
    let capturedY = 0;

    showPopupAtBounds(
      'Scaled content',
      { x: 200, y: 100, width: 50, height: 50 },
      () => ({ left: 0, top: 0, width: 300, height: 200 }),
      () => ({ left: 0, top: 0, width: 300, height: 200 }),
      { width: 600, height: 400 }, // viewBox is 2x actual size
      (_content, x, y) => {
        capturedX = x;
        capturedY = y;
      }
    );

    // scaleX = 300/600 = 0.5, scaleY = 200/400 = 0.5
    // x = 0 + (200 + 25) * 0.5 = 112.5
    expect(capturedX).toBe(112.5);
    // y = 0 + 100 * 0.5 = 50
    expect(capturedY).toBe(50);
  });
});
