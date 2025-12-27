import { describe, it, expect } from 'vitest';
import {
  PATTERN_TYPES,
  PATTERN_DEFINITIONS,
  HIGH_CONTRAST_PATTERN_SEQUENCE,
  HIGH_CONTRAST_COLORS,
  isPatternType,
  generatePatternId,
  getHighContrastColors,
  getHighContrastPattern,
  type PatternType,
} from '../../src/patterns';

// ============================================================================
// Constants
// ============================================================================

describe('PATTERN_TYPES', () => {
  it('contains exactly 8 pattern types', () => {
    expect(PATTERN_TYPES).toHaveLength(8);
  });

  it('contains all expected pattern types', () => {
    const expected = [
      'diagonal-lines',
      'diagonal-lines-reverse',
      'dots',
      'crosshatch',
      'horizontal-lines',
      'vertical-lines',
      'grid',
      'checkerboard',
    ];
    expect(PATTERN_TYPES).toEqual(expected);
  });

  it('contains only unique values', () => {
    const uniqueTypes = new Set(PATTERN_TYPES);
    expect(uniqueTypes.size).toBe(PATTERN_TYPES.length);
  });
});

describe('HIGH_CONTRAST_COLORS', () => {
  it('contains exactly 8 colors', () => {
    expect(HIGH_CONTRAST_COLORS).toHaveLength(8);
  });

  it('contains only valid hex color strings', () => {
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
    HIGH_CONTRAST_COLORS.forEach(color => {
      expect(color).toMatch(hexColorRegex);
    });
  });

  it('contains only unique colors', () => {
    const uniqueColors = new Set(HIGH_CONTRAST_COLORS);
    expect(uniqueColors.size).toBe(HIGH_CONTRAST_COLORS.length);
  });
});

describe('HIGH_CONTRAST_PATTERN_SEQUENCE', () => {
  it('contains exactly 8 patterns', () => {
    expect(HIGH_CONTRAST_PATTERN_SEQUENCE).toHaveLength(8);
  });

  it('contains only valid pattern types', () => {
    HIGH_CONTRAST_PATTERN_SEQUENCE.forEach(pattern => {
      expect(PATTERN_TYPES).toContain(pattern);
    });
  });

  it('contains only unique patterns', () => {
    const uniquePatterns = new Set(HIGH_CONTRAST_PATTERN_SEQUENCE);
    expect(uniquePatterns.size).toBe(HIGH_CONTRAST_PATTERN_SEQUENCE.length);
  });

  it('starts with diagonal-lines (most distinctive)', () => {
    expect(HIGH_CONTRAST_PATTERN_SEQUENCE[0]).toBe('diagonal-lines');
  });
});

// ============================================================================
// Type Guard
// ============================================================================

describe('isPatternType', () => {
  it('returns true for valid pattern types', () => {
    PATTERN_TYPES.forEach(type => {
      expect(isPatternType(type)).toBe(true);
    });
  });

  it('returns false for invalid strings', () => {
    expect(isPatternType('invalid')).toBe(false);
    expect(isPatternType('stripes')).toBe(false);
    expect(isPatternType('polka-dots')).toBe(false);
    expect(isPatternType('')).toBe(false);
  });

  it('returns false for similar but incorrect names', () => {
    expect(isPatternType('diagonal')).toBe(false);
    expect(isPatternType('diagonallines')).toBe(false);
    expect(isPatternType('diagonal_lines')).toBe(false);
    expect(isPatternType('DIAGONAL-LINES')).toBe(false);
  });

  it('returns false for non-string-like values coerced to string', () => {
    expect(isPatternType('null')).toBe(false);
    expect(isPatternType('undefined')).toBe(false);
    expect(isPatternType('123')).toBe(false);
  });
});

// ============================================================================
// ID Generation
// ============================================================================

describe('generatePatternId', () => {
  it('generates ID with all components', () => {
    const id = generatePatternId('chart-1', 'diagonal-lines', 0);
    expect(id).toBe('chart-1-diagonal-lines-0');
  });

  it('handles different chart IDs', () => {
    expect(generatePatternId('dc-chart-42', 'dots', 3)).toBe('dc-chart-42-dots-3');
    expect(generatePatternId('my-chart', 'grid', 10)).toBe('my-chart-grid-10');
  });

  it('handles all pattern types', () => {
    PATTERN_TYPES.forEach((type, index) => {
      const id = generatePatternId('test', type, index);
      expect(id).toBe(`test-${type}-${index}`);
    });
  });

  it('handles large index values', () => {
    const id = generatePatternId('chart', 'dots', 999);
    expect(id).toBe('chart-dots-999');
  });

  it('handles zero index', () => {
    const id = generatePatternId('chart', 'crosshatch', 0);
    expect(id).toBe('chart-crosshatch-0');
  });
});

// ============================================================================
// High Contrast Colors
// ============================================================================

describe('getHighContrastColors', () => {
  it('returns empty array for count 0', () => {
    expect(getHighContrastColors(0)).toEqual([]);
  });

  it('returns correct number of colors', () => {
    expect(getHighContrastColors(1)).toHaveLength(1);
    expect(getHighContrastColors(5)).toHaveLength(5);
    expect(getHighContrastColors(8)).toHaveLength(8);
  });

  it('returns first N colors for count <= 8', () => {
    const colors = getHighContrastColors(3);
    expect(colors[0]).toBe(HIGH_CONTRAST_COLORS[0]);
    expect(colors[1]).toBe(HIGH_CONTRAST_COLORS[1]);
    expect(colors[2]).toBe(HIGH_CONTRAST_COLORS[2]);
  });

  it('cycles colors when count > 8', () => {
    const colors = getHighContrastColors(10);
    expect(colors).toHaveLength(10);
    // First 8 should match
    for (let i = 0; i < 8; i++) {
      expect(colors[i]).toBe(HIGH_CONTRAST_COLORS[i]);
    }
    // Next should cycle
    expect(colors[8]).toBe(HIGH_CONTRAST_COLORS[0]);
    expect(colors[9]).toBe(HIGH_CONTRAST_COLORS[1]);
  });

  it('handles large counts with proper cycling', () => {
    const colors = getHighContrastColors(20);
    expect(colors).toHaveLength(20);
    // Verify cycling pattern
    colors.forEach((color, i) => {
      expect(color).toBe(HIGH_CONTRAST_COLORS[i % 8]);
    });
  });
});

// ============================================================================
// High Contrast Patterns
// ============================================================================

describe('getHighContrastPattern', () => {
  it('returns first pattern for index 0', () => {
    expect(getHighContrastPattern(0)).toBe(HIGH_CONTRAST_PATTERN_SEQUENCE[0]);
  });

  it('returns correct pattern for indices 0-7', () => {
    for (let i = 0; i < 8; i++) {
      expect(getHighContrastPattern(i)).toBe(HIGH_CONTRAST_PATTERN_SEQUENCE[i]);
    }
  });

  it('cycles patterns for index >= 8', () => {
    expect(getHighContrastPattern(8)).toBe(HIGH_CONTRAST_PATTERN_SEQUENCE[0]);
    expect(getHighContrastPattern(9)).toBe(HIGH_CONTRAST_PATTERN_SEQUENCE[1]);
    expect(getHighContrastPattern(15)).toBe(HIGH_CONTRAST_PATTERN_SEQUENCE[7]);
    expect(getHighContrastPattern(16)).toBe(HIGH_CONTRAST_PATTERN_SEQUENCE[0]);
  });

  it('returns valid pattern type for any index', () => {
    for (let i = 0; i < 100; i++) {
      const pattern = getHighContrastPattern(i);
      expect(isPatternType(pattern)).toBe(true);
    }
  });
});

// ============================================================================
// Pattern Definitions (SVG Generators)
// ============================================================================

describe('PATTERN_DEFINITIONS', () => {
  it('has a generator for each pattern type', () => {
    PATTERN_TYPES.forEach(type => {
      expect(PATTERN_DEFINITIONS[type]).toBeDefined();
      expect(typeof PATTERN_DEFINITIONS[type]).toBe('function');
    });
  });

  describe.each(PATTERN_TYPES)('%s generator', (patternType) => {
    const generator = PATTERN_DEFINITIONS[patternType];
    const testId = 'test-pattern-id';
    const testStroke = '#000000';
    const testFill = '#ffffff';
    const testScale = 1;

    it('returns a string', () => {
      const result = generator(testId, testStroke, testFill, testScale);
      expect(typeof result).toBe('string');
    });

    it('includes the pattern ID', () => {
      const result = generator(testId, testStroke, testFill, testScale);
      expect(result).toContain(`id="${testId}"`);
    });

    it('includes pattern element with userSpaceOnUse', () => {
      const result = generator(testId, testStroke, testFill, testScale);
      expect(result).toContain('<pattern');
      expect(result).toContain('patternUnits="userSpaceOnUse"');
      expect(result).toContain('</pattern>');
    });

    it('includes width and height attributes', () => {
      const result = generator(testId, testStroke, testFill, testScale);
      expect(result).toMatch(/width="\d+"/);
      expect(result).toMatch(/height="\d+"/);
    });

    it('includes the fill color (background rect)', () => {
      const result = generator(testId, testStroke, testFill, testScale);
      expect(result).toContain(`fill="${testFill}"`);
    });

    it('includes the stroke color', () => {
      const result = generator(testId, testStroke, testFill, testScale);
      expect(result).toContain(testStroke);
    });

    it('scales pattern size correctly', () => {
      const scale1 = generator(testId, testStroke, testFill, 1);
      const scale2 = generator(testId, testStroke, testFill, 2);

      // Extract width from both
      const width1Match = scale1.match(/width="(\d+)"/);
      const width2Match = scale2.match(/width="(\d+)"/);

      expect(width1Match).not.toBeNull();
      expect(width2Match).not.toBeNull();

      const width1 = parseInt(width1Match![1], 10);
      const width2 = parseInt(width2Match![1], 10);

      expect(width2).toBe(width1 * 2);
    });
  });

  describe('specific pattern content', () => {
    it('diagonal-lines contains a line element', () => {
      const result = PATTERN_DEFINITIONS['diagonal-lines']('id', '#000', '#fff', 1);
      expect(result).toContain('<line');
    });

    it('dots contains a circle element', () => {
      const result = PATTERN_DEFINITIONS['dots']('id', '#000', '#fff', 1);
      expect(result).toContain('<circle');
    });

    it('crosshatch contains two line elements', () => {
      const result = PATTERN_DEFINITIONS['crosshatch']('id', '#000', '#fff', 1);
      const lineCount = (result.match(/<line/g) || []).length;
      expect(lineCount).toBe(2);
    });

    it('grid contains two line elements', () => {
      const result = PATTERN_DEFINITIONS['grid']('id', '#000', '#fff', 1);
      const lineCount = (result.match(/<line/g) || []).length;
      expect(lineCount).toBe(2);
    });

    it('checkerboard contains three rect elements', () => {
      const result = PATTERN_DEFINITIONS['checkerboard']('id', '#000', '#fff', 1);
      const rectCount = (result.match(/<rect/g) || []).length;
      expect(rectCount).toBe(3); // 1 background + 2 checker squares
    });

    it('horizontal-lines has horizontal line (y1 equals y2)', () => {
      const result = PATTERN_DEFINITIONS['horizontal-lines']('id', '#000', '#fff', 1);
      // Should have y1="4" y2="4" or similar (middle of 8px pattern)
      expect(result).toMatch(/y1="(\d+)" .* y2="\1"/);
    });

    it('vertical-lines has vertical line (x1 equals x2)', () => {
      const result = PATTERN_DEFINITIONS['vertical-lines']('id', '#000', '#fff', 1);
      // Should have x1="4" x2="4" or similar (middle of 8px pattern)
      expect(result).toMatch(/x1="(\d+)" .* x2="\1"/);
    });
  });
});
