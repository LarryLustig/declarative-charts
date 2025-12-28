import { describe, it, expect } from 'vitest';
import {
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
