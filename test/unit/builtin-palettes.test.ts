import { describe, it, expect } from 'vitest';
import {
  BUILTIN_PALETTES,
  getBuiltinPalette,
  isBuiltinPalette,
  getBuiltinPaletteNames,
  getBuiltinPalettesByType,
  generatePaletteColors,
  getDefaultPaletteForChart,
  type CategoricalPalette,
  type SequentialPalette,
  type DivergingPalette
} from '../../src/builtin-palettes';

describe('builtin-palettes', () => {
  // ============================================================================
  // Registry Tests
  // ============================================================================

  describe('BUILTIN_PALETTES', () => {
    it('contains expected categorical palettes', () => {
      expect(BUILTIN_PALETTES['default']).toBeDefined();
      expect(BUILTIN_PALETTES['category10']).toBeDefined();
      expect(BUILTIN_PALETTES['pastel']).toBeDefined();
      expect(BUILTIN_PALETTES['vivid']).toBeDefined();
      expect(BUILTIN_PALETTES['colorblind-safe']).toBeDefined();
    });

    it('contains expected sequential palettes', () => {
      expect(BUILTIN_PALETTES['cool-to-warm']).toBeDefined();
      expect(BUILTIN_PALETTES['blues']).toBeDefined();
      expect(BUILTIN_PALETTES['greens']).toBeDefined();
      expect(BUILTIN_PALETTES['warm']).toBeDefined();
      expect(BUILTIN_PALETTES['viridis']).toBeDefined();
    });

    it('contains expected diverging palettes', () => {
      expect(BUILTIN_PALETTES['red-blue']).toBeDefined();
      expect(BUILTIN_PALETTES['purple-orange']).toBeDefined();
    });

    it('all palettes have required properties', () => {
      for (const [name, palette] of Object.entries(BUILTIN_PALETTES)) {
        expect(palette.type).toBeDefined();
        expect(palette.name).toBeDefined();
        expect(palette.description).toBeDefined();

        if (palette.type === 'categorical') {
          expect(palette.colors).toBeDefined();
          expect(palette.colors.length).toBeGreaterThan(0);
        } else if (palette.type === 'sequential') {
          expect(palette.start).toBeDefined();
          expect(palette.end).toBeDefined();
        } else if (palette.type === 'diverging') {
          expect(palette.start).toBeDefined();
          expect(palette.middle).toBeDefined();
          expect(palette.end).toBeDefined();
        }
      }
    });
  });

  // ============================================================================
  // Lookup Functions
  // ============================================================================

  describe('getBuiltinPalette', () => {
    it('returns palette for valid name', () => {
      const palette = getBuiltinPalette('category10');
      expect(palette).toBeDefined();
      expect(palette?.type).toBe('categorical');
    });

    it('returns undefined for invalid name', () => {
      const palette = getBuiltinPalette('nonexistent');
      expect(palette).toBeUndefined();
    });

    it('is case-insensitive', () => {
      expect(getBuiltinPalette('Category10')).toBeDefined();
      expect(getBuiltinPalette('CATEGORY10')).toBeDefined();
      expect(getBuiltinPalette('cool-to-warm')).toBeDefined();
      expect(getBuiltinPalette('Cool-To-Warm')).toBeDefined();
    });
  });

  describe('isBuiltinPalette', () => {
    it('returns true for valid names', () => {
      expect(isBuiltinPalette('default')).toBe(true);
      expect(isBuiltinPalette('category10')).toBe(true);
      expect(isBuiltinPalette('cool-to-warm')).toBe(true);
    });

    it('returns false for invalid names', () => {
      expect(isBuiltinPalette('nonexistent')).toBe(false);
      expect(isBuiltinPalette('')).toBe(false);
      expect(isBuiltinPalette('my-custom-palette')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(isBuiltinPalette('DEFAULT')).toBe(true);
      expect(isBuiltinPalette('Category10')).toBe(true);
    });
  });

  describe('getBuiltinPaletteNames', () => {
    it('returns array of palette names', () => {
      const names = getBuiltinPaletteNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
      expect(names).toContain('default');
      expect(names).toContain('category10');
      expect(names).toContain('cool-to-warm');
    });
  });

  describe('getBuiltinPalettesByType', () => {
    it('filters categorical palettes', () => {
      const palettes = getBuiltinPalettesByType('categorical');
      expect(palettes.length).toBeGreaterThan(0);
      palettes.forEach(([name, palette]) => {
        expect(palette.type).toBe('categorical');
      });
    });

    it('filters sequential palettes', () => {
      const palettes = getBuiltinPalettesByType('sequential');
      expect(palettes.length).toBeGreaterThan(0);
      palettes.forEach(([name, palette]) => {
        expect(palette.type).toBe('sequential');
      });
    });

    it('filters diverging palettes', () => {
      const palettes = getBuiltinPalettesByType('diverging');
      expect(palettes.length).toBeGreaterThan(0);
      palettes.forEach(([name, palette]) => {
        expect(palette.type).toBe('diverging');
      });
    });
  });

  // ============================================================================
  // Color Generation
  // ============================================================================

  describe('generatePaletteColors', () => {
    describe('categorical palettes', () => {
      const palette = BUILTIN_PALETTES['category10'] as CategoricalPalette;

      it('returns correct number of colors', () => {
        expect(generatePaletteColors(palette, 3)).toHaveLength(3);
        expect(generatePaletteColors(palette, 5)).toHaveLength(5);
        expect(generatePaletteColors(palette, 10)).toHaveLength(10);
      });

      it('returns colors in order', () => {
        const colors = generatePaletteColors(palette, 3);
        expect(colors[0]).toBe(palette.colors[0]);
        expect(colors[1]).toBe(palette.colors[1]);
        expect(colors[2]).toBe(palette.colors[2]);
      });

      it('cycles colors when count exceeds palette size', () => {
        const colors = generatePaletteColors(palette, 12);
        expect(colors[10]).toBe(palette.colors[0]); // Cycles back
        expect(colors[11]).toBe(palette.colors[1]);
      });

      it('handles count of 0', () => {
        expect(generatePaletteColors(palette, 0)).toEqual([]);
      });

      it('handles count of 1', () => {
        const colors = generatePaletteColors(palette, 1);
        expect(colors).toHaveLength(1);
        expect(colors[0]).toBe(palette.colors[0]);
      });
    });

    describe('sequential palettes', () => {
      const palette = BUILTIN_PALETTES['blues'] as SequentialPalette;

      it('returns correct number of colors', () => {
        expect(generatePaletteColors(palette, 3)).toHaveLength(3);
        expect(generatePaletteColors(palette, 5)).toHaveLength(5);
      });

      it('returns start color first and end color last', () => {
        const colors = generatePaletteColors(palette, 5);
        expect(colors[0]).toBe(palette.start);
        expect(colors[4]).toBe(palette.end);
      });

      it('interpolates middle colors', () => {
        const colors = generatePaletteColors(palette, 3);
        // Middle color should be different from start and end
        expect(colors[1]).not.toBe(palette.start);
        expect(colors[1]).not.toBe(palette.end);
      });

      it('handles count of 1 (returns start)', () => {
        const colors = generatePaletteColors(palette, 1);
        expect(colors).toEqual([palette.start]);
      });

      it('handles count of 2 (returns start and end)', () => {
        const colors = generatePaletteColors(palette, 2);
        expect(colors).toEqual([palette.start, palette.end]);
      });
    });

    describe('diverging palettes', () => {
      const palette = BUILTIN_PALETTES['red-blue'] as DivergingPalette;

      it('returns correct number of colors', () => {
        expect(generatePaletteColors(palette, 5)).toHaveLength(5);
        expect(generatePaletteColors(palette, 7)).toHaveLength(7);
      });

      it('includes start, middle, and end colors for count of 3', () => {
        const colors = generatePaletteColors(palette, 3);
        expect(colors[0]).toBe(palette.start);
        expect(colors[1]).toBe(palette.middle);
        expect(colors[2]).toBe(palette.end);
      });

      it('handles count of 1 (returns middle)', () => {
        const colors = generatePaletteColors(palette, 1);
        expect(colors).toEqual([palette.middle]);
      });

      it('handles count of 2 (returns start and end)', () => {
        const colors = generatePaletteColors(palette, 2);
        expect(colors).toEqual([palette.start, palette.end]);
      });
    });

    describe('color format', () => {
      it('returns valid hex colors', () => {
        const palette = BUILTIN_PALETTES['cool-to-warm'] as SequentialPalette;
        const colors = generatePaletteColors(palette, 5);

        colors.forEach(color => {
          expect(color).toMatch(/^#[0-9a-f]{6}$/i);
        });
      });
    });
  });

  // ============================================================================
  // Chart Type Defaults
  // ============================================================================

  describe('getDefaultPaletteForChart', () => {
    it('returns cool-to-warm for funnel charts', () => {
      expect(getDefaultPaletteForChart('dc-funnel-chart')).toBe('cool-to-warm');
    });

    it('returns default for pie charts', () => {
      expect(getDefaultPaletteForChart('dc-pie-chart')).toBe('default');
    });

    it('returns default for bar/line charts', () => {
      expect(getDefaultPaletteForChart('dc-chart')).toBe('default');
    });
  });

  // ============================================================================
  // Specific Palette Validations
  // ============================================================================

  describe('colorblind-safe palette', () => {
    it('has at least 8 colors', () => {
      const palette = BUILTIN_PALETTES['colorblind-safe'] as CategoricalPalette;
      expect(palette.colors.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('viridis palette', () => {
    it('is sequential type', () => {
      const palette = BUILTIN_PALETTES['viridis'];
      expect(palette.type).toBe('sequential');
    });
  });

  describe('cool-to-warm palette', () => {
    it('goes from blue to red', () => {
      const palette = BUILTIN_PALETTES['cool-to-warm'] as SequentialPalette;
      // Start should be bluish, end should be reddish
      expect(palette.start.toLowerCase()).toMatch(/#[0-9a-f]*[3-9a-f][0-9a-f]{4}/); // Has blue component
      expect(palette.end.toLowerCase()).toMatch(/#[a-f][0-9a-f]/); // Starts with high red
    });
  });
});
