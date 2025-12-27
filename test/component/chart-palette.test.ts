import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fixture, elementUpdated } from './setup';

// Import components to register custom elements
import '../../src/chart-palette';
import '../../src/chart-fill';
import { ChartPalette } from '../../src/chart-palette';
import { ChartFill } from '../../src/chart-fill';

/**
 * Component tests for ChartPalette.
 *
 * Tests DOM-dependent methods that require querySelector:
 * - getFills() - queries child dc-fill elements
 * - lookup() - finds matching fill by label/value
 * - hasFills() - checks for child fills
 * - getFillColors() - extracts fill colors for auto-assignment
 */

describe('ChartPalette component', () => {
  let palette: ChartPalette;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ============================================================================
  // Basic element creation
  // ============================================================================

  describe('element creation', () => {
    it('creates dc-palette element', async () => {
      palette = await fixture<ChartPalette>('dc-palette');
      expect(palette).toBeInstanceOf(ChartPalette);
      expect(palette.tagName.toLowerCase()).toBe('dc-palette');
    });

    it('creates dc-fill child elements', async () => {
      palette = await fixture<ChartPalette>(
        'dc-palette',
        {},
        '<dc-fill fill="#ff0000"></dc-fill>'
      );
      const fill = palette.querySelector('dc-fill');
      expect(fill).toBeInstanceOf(ChartFill);
    });
  });

  // ============================================================================
  // getFills()
  // ============================================================================

  describe('getFills', () => {
    it('returns empty array when no child fills', async () => {
      palette = await fixture<ChartPalette>('dc-palette');
      const fills = palette.getFills();
      expect(fills).toEqual([]);
    });

    it('returns array of ChartFill elements', async () => {
      palette = await fixture<ChartPalette>(
        'dc-palette',
        {},
        `
        <dc-fill fill="#ff0000" label="Red"></dc-fill>
        <dc-fill fill="#00ff00" label="Green"></dc-fill>
        <dc-fill fill="#0000ff" label="Blue"></dc-fill>
        `
      );
      const fills = palette.getFills();
      expect(fills).toHaveLength(3);
      expect(fills[0]).toBeInstanceOf(ChartFill);
      expect(fills[0].fill).toBe('#ff0000');
      expect(fills[1].fill).toBe('#00ff00');
      expect(fills[2].fill).toBe('#0000ff');
    });

    it('preserves order of fills', async () => {
      palette = await fixture<ChartPalette>(
        'dc-palette',
        {},
        `
        <dc-fill fill="#first" label="First"></dc-fill>
        <dc-fill fill="#second" label="Second"></dc-fill>
        <dc-fill fill="#third" label="Third"></dc-fill>
        `
      );
      const fills = palette.getFills();
      expect(fills.map(f => f.getAttribute('label'))).toEqual(['First', 'Second', 'Third']);
    });
  });

  // ============================================================================
  // hasFills()
  // ============================================================================

  describe('hasFills', () => {
    it('returns false when no child fills', async () => {
      palette = await fixture<ChartPalette>('dc-palette');
      expect(palette.hasFills()).toBe(false);
    });

    it('returns true when has child fills', async () => {
      palette = await fixture<ChartPalette>(
        'dc-palette',
        {},
        '<dc-fill fill="#ff0000"></dc-fill>'
      );
      expect(palette.hasFills()).toBe(true);
    });

    it('returns true for multiple fills', async () => {
      palette = await fixture<ChartPalette>(
        'dc-palette',
        {},
        `
        <dc-fill fill="#ff0000"></dc-fill>
        <dc-fill fill="#00ff00"></dc-fill>
        `
      );
      expect(palette.hasFills()).toBe(true);
    });
  });

  // ============================================================================
  // getFillColors()
  // ============================================================================

  describe('getFillColors', () => {
    it('returns empty array when no fills', async () => {
      palette = await fixture<ChartPalette>('dc-palette');
      const colors = palette.getFillColors();
      expect(colors).toEqual([]);
    });

    it('returns fill colors from child elements', async () => {
      palette = await fixture<ChartPalette>(
        'dc-palette',
        {},
        `
        <dc-fill fill="#ff0000"></dc-fill>
        <dc-fill fill="#00ff00"></dc-fill>
        <dc-fill fill="#0000ff"></dc-fill>
        `
      );
      const colors = palette.getFillColors();
      expect(colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
    });

    it('filters out undefined fills', async () => {
      palette = await fixture<ChartPalette>(
        'dc-palette',
        {},
        `
        <dc-fill fill="#ff0000"></dc-fill>
        <dc-fill></dc-fill>
        <dc-fill fill="#0000ff"></dc-fill>
        `
      );
      const colors = palette.getFillColors();
      expect(colors).toEqual(['#ff0000', '#0000ff']);
    });
  });

  // ============================================================================
  // lookup() - label matching
  // ============================================================================

  describe('lookup by label', () => {
    beforeEach(async () => {
      palette = await fixture<ChartPalette>(
        'dc-palette',
        {},
        `
        <dc-fill label="Revenue" fill="#2563eb" stroke="#1d4ed8"></dc-fill>
        <dc-fill label="Expenses" fill="#dc2626" stroke="#b91c1c"></dc-fill>
        <dc-fill label="Profit" fill="#16a34a" stroke="#15803d"></dc-fill>
        `
      );
    });

    it('returns matching fill by exact label', () => {
      const result = palette.lookup('Revenue');
      expect(result.fill).toBe('#2563eb');
      expect(result.stroke).toBe('#1d4ed8');
    });

    it('returns matching fill for different labels', () => {
      expect(palette.lookup('Expenses').fill).toBe('#dc2626');
      expect(palette.lookup('Profit').fill).toBe('#16a34a');
    });

    it('returns empty object for non-matching label', () => {
      const result = palette.lookup('Unknown');
      expect(result).toEqual({});
    });

    it('is case-sensitive', () => {
      const result = palette.lookup('revenue');
      expect(result).toEqual({});
    });
  });

  // ============================================================================
  // lookup() - value matching
  // ============================================================================

  describe('lookup by value', () => {
    beforeEach(async () => {
      palette = await fixture<ChartPalette>(
        'dc-palette',
        {},
        `
        <dc-fill max-value="50" fill="#22c55e"></dc-fill>
        <dc-fill min-value="50" max-value="100" fill="#eab308"></dc-fill>
        <dc-fill min-value="100" fill="#ef4444"></dc-fill>
        `
      );
    });

    it('matches value in range 0-50', () => {
      const result = palette.lookup(undefined, 25);
      expect(result.fill).toBe('#22c55e');
    });

    it('matches value in range 50-100', () => {
      const result = palette.lookup(undefined, 75);
      expect(result.fill).toBe('#eab308');
    });

    it('matches value 100+', () => {
      const result = palette.lookup(undefined, 150);
      expect(result.fill).toBe('#ef4444');
    });

    it('matches exact boundary value (50)', () => {
      // 50 matches both ranges - first match wins (0-50 range)
      const result = palette.lookup(undefined, 50);
      expect(result.fill).toBe('#22c55e');
    });
  });

  // ============================================================================
  // lookup() - combined label and value
  // ============================================================================

  describe('lookup with label and value', () => {
    beforeEach(async () => {
      palette = await fixture<ChartPalette>(
        'dc-palette',
        {},
        `
        <dc-fill label="Sales" max-value="100" fill="#low"></dc-fill>
        <dc-fill label="Sales" min-value="100" fill="#high"></dc-fill>
        <dc-fill label="Marketing" fill="#marketing"></dc-fill>
        `
      );
    });

    it('matches value before label (value takes priority)', () => {
      // lookup checks value matches first, then label matches
      // So 50 matches the first fill's max-value="100"
      expect(palette.lookup('Sales', 50).fill).toBe('#low');
      expect(palette.lookup('Sales', 150).fill).toBe('#high');
    });

    it('matches label when no value provided', () => {
      // Without a value, falls back to label matching
      // But lookup returns first label match, which is 'Sales' -> #low
      const result = palette.lookup('Marketing');
      expect(result.fill).toBe('#marketing');
    });
  });

  // ============================================================================
  // lookup() - pattern fills
  // ============================================================================

  describe('lookup with patterns', () => {
    it('returns pattern info for patterned fills', async () => {
      palette = await fixture<ChartPalette>(
        'dc-palette',
        {},
        `
        <dc-fill
          label="Critical"
          fill="#fee2e2"
          stroke="#dc2626"
          pattern="crosshatch"
          scale="1.5"
        ></dc-fill>
        `
      );

      const result = palette.lookup('Critical');
      expect(result.fill).toBe('#fee2e2');
      expect(result.stroke).toBe('#dc2626');
      expect(result.pattern).toBeDefined();
      expect(result.pattern?.type).toBe('crosshatch');
      expect(result.pattern?.stroke).toBe('#dc2626');
      expect(result.pattern?.fill).toBe('#fee2e2');
      expect(result.pattern?.scale).toBe(1.5);
    });

    it('returns pattern without optional properties', async () => {
      palette = await fixture<ChartPalette>(
        'dc-palette',
        {},
        `<dc-fill label="Simple" pattern="dots" stroke="#000"></dc-fill>`
      );

      const result = palette.lookup('Simple');
      expect(result.pattern?.type).toBe('dots');
      expect(result.pattern?.stroke).toBe('#000');
      expect(result.pattern?.fill).toBeUndefined();
      expect(result.pattern?.scale).toBeUndefined();
    });
  });

  // ============================================================================
  // highContrast attribute
  // ============================================================================

  describe('highContrast attribute', () => {
    it('defaults to false', async () => {
      palette = await fixture<ChartPalette>('dc-palette');
      expect(palette.highContrast).toBe(false);
    });

    it('can be set via attribute', async () => {
      palette = await fixture<ChartPalette>('dc-palette', { 'high-contrast': '' });
      expect(palette.highContrast).toBe(true);
    });

    it('can be set via property', async () => {
      palette = await fixture<ChartPalette>('dc-palette');
      palette.highContrast = true;
      expect(palette.highContrast).toBe(true);
    });
  });
});
