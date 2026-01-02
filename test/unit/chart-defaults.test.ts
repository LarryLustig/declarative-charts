import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ChartDefaults,
  DEFAULTABLE_ATTRIBUTES,
  configure,
  getConfiguration,
  getGlobalDefault,
  type DefaultableAttribute
} from '../../src/chart-defaults';

/**
 * Tests for ChartDefaults configuration element.
 *
 * Note: The findDefaultsElement, getDefault, and resolveDefault functions
 * require DOM environment for testing since they use querySelector and
 * parentElement traversal. These are tested in component tests.
 *
 * This file tests:
 * - Property defaults and assignment
 * - DEFAULTABLE_ATTRIBUTES constant
 * - getDefault() method on the element
 * - hasDefault() method on the element
 */

// ============================================================================
// Property defaults
// ============================================================================

describe('ChartDefaults properties', () => {
  let defaults: ChartDefaults;

  beforeEach(() => {
    defaults = new ChartDefaults();
  });

  describe('default values', () => {
    it('all properties start as undefined', () => {
      expect(defaults.animations).toBeUndefined();
      expect(defaults.palette).toBeUndefined();
      expect(defaults.highContrast).toBeUndefined();
      expect(defaults.showValue).toBeUndefined();
      expect(defaults.showLabel).toBeUndefined();
      expect(defaults.showPercent).toBeUndefined();
      expect(defaults.valueFormat).toBeUndefined();
      expect(defaults.percentFormat).toBeUndefined();
      expect(defaults.labelPosition).toBeUndefined();
      expect(defaults.labelFill).toBeUndefined();
      expect(defaults.stroke).toBeUndefined();
      expect(defaults.strokeWidth).toBeUndefined();
      expect(defaults.autoPopup).toBeUndefined();
      expect(defaults.logging).toBeUndefined();
      expect(defaults.consoleLog).toBeUndefined();
      expect(defaults.padding).toBeUndefined();
      expect(defaults.paddingTop).toBeUndefined();
      expect(defaults.paddingRight).toBeUndefined();
      expect(defaults.paddingBottom).toBeUndefined();
      expect(defaults.paddingLeft).toBeUndefined();
    });
  });

  describe('property assignment', () => {
    it('can set animations', () => {
      defaults.animations = 'true';
      expect(defaults.animations).toBe('true');

      defaults.animations = '500ms';
      expect(defaults.animations).toBe('500ms');
    });

    it('can set palette', () => {
      defaults.palette = 'viridis';
      expect(defaults.palette).toBe('viridis');
    });

    it('can set highContrast', () => {
      defaults.highContrast = true;
      expect(defaults.highContrast).toBe(true);
    });

    it('can set showValue with boolean', () => {
      defaults.showValue = true;
      expect(defaults.showValue).toBe(true);

      defaults.showValue = false;
      expect(defaults.showValue).toBe(false);
    });

    it('can set showValue with threshold', () => {
      defaults.showValue = { type: 'percent', threshold: 5 };
      expect(defaults.showValue).toEqual({ type: 'percent', threshold: 5 });

      defaults.showValue = { type: 'value', threshold: 100 };
      expect(defaults.showValue).toEqual({ type: 'value', threshold: 100 });
    });

    it('can set valueFormat', () => {
      defaults.valueFormat = 'compact 1';
      expect(defaults.valueFormat).toBe('compact 1');
    });

    it('can set padding properties', () => {
      defaults.padding = '60';
      expect(defaults.padding).toBe('60');

      defaults.paddingTop = '10%';
      expect(defaults.paddingTop).toBe('10%');
    });

    it('can set stroke properties', () => {
      defaults.stroke = '#333';
      expect(defaults.stroke).toBe('#333');

      defaults.strokeWidth = 2;
      expect(defaults.strokeWidth).toBe(2);
    });
  });
});

// ============================================================================
// DEFAULTABLE_ATTRIBUTES constant
// ============================================================================

describe('DEFAULTABLE_ATTRIBUTES', () => {
  it('is a readonly array', () => {
    expect(Array.isArray(DEFAULTABLE_ATTRIBUTES)).toBe(true);
  });

  it('contains expected display options', () => {
    expect(DEFAULTABLE_ATTRIBUTES).toContain('animations');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('palette');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('high-contrast');
  });

  it('contains expected value/label display options', () => {
    expect(DEFAULTABLE_ATTRIBUTES).toContain('show-value');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('show-label');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('show-percent');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('value-format');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('percent-format');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('label-position');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('label-fill');
  });

  it('contains expected styling options', () => {
    expect(DEFAULTABLE_ATTRIBUTES).toContain('stroke');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('stroke-width');
  });

  it('contains expected behavior options', () => {
    expect(DEFAULTABLE_ATTRIBUTES).toContain('auto-popup');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('logging');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('console-log');
  });

  it('contains expected layout options', () => {
    expect(DEFAULTABLE_ATTRIBUTES).toContain('padding');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('padding-top');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('padding-right');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('padding-bottom');
    expect(DEFAULTABLE_ATTRIBUTES).toContain('padding-left');
  });

  it('has expected total count', () => {
    // This helps catch accidental additions/removals
    expect(DEFAULTABLE_ATTRIBUTES.length).toBe(20);
  });
});

// ============================================================================
// getDefault() method
// ============================================================================

describe('ChartDefaults.getDefault()', () => {
  let defaults: ChartDefaults;

  beforeEach(() => {
    defaults = new ChartDefaults();
  });

  it('returns undefined for unset properties', () => {
    expect(defaults.getDefault('animations')).toBeUndefined();
    expect(defaults.getDefault('palette')).toBeUndefined();
    expect(defaults.getDefault('high-contrast')).toBeUndefined();
  });

  it('returns value for set string property', () => {
    defaults.animations = '500ms';
    expect(defaults.getDefault('animations')).toBe('500ms');
  });

  it('returns value for set boolean property', () => {
    defaults.highContrast = true;
    expect(defaults.getDefault('high-contrast')).toBe(true);
  });

  it('returns value for set number property', () => {
    defaults.strokeWidth = 2;
    expect(defaults.getDefault('stroke-width')).toBe(2);
  });

  it('returns value for set ShowCondition property', () => {
    defaults.showValue = { type: 'percent', threshold: 5 };
    expect(defaults.getDefault('show-value')).toEqual({ type: 'percent', threshold: 5 });
  });

  it('maps all attribute names correctly', () => {
    // Test each attribute maps to the correct property
    defaults.palette = 'viridis';
    expect(defaults.getDefault('palette')).toBe('viridis');

    defaults.valueFormat = 'compact 1';
    expect(defaults.getDefault('value-format')).toBe('compact 1');

    defaults.percentFormat = 'percent 0';
    expect(defaults.getDefault('percent-format')).toBe('percent 0');

    defaults.labelPosition = 'outside';
    expect(defaults.getDefault('label-position')).toBe('outside');

    defaults.labelFill = '#333';
    expect(defaults.getDefault('label-fill')).toBe('#333');

    defaults.autoPopup = true;
    expect(defaults.getDefault('auto-popup')).toBe(true);

    defaults.logging = 'info';
    expect(defaults.getDefault('logging')).toBe('info');

    defaults.consoleLog = 'warning';
    expect(defaults.getDefault('console-log')).toBe('warning');

    defaults.padding = '60';
    expect(defaults.getDefault('padding')).toBe('60');

    defaults.paddingTop = '10%';
    expect(defaults.getDefault('padding-top')).toBe('10%');

    defaults.paddingRight = '80';
    expect(defaults.getDefault('padding-right')).toBe('80');

    defaults.paddingBottom = '40';
    expect(defaults.getDefault('padding-bottom')).toBe('40');

    defaults.paddingLeft = '70';
    expect(defaults.getDefault('padding-left')).toBe('70');
  });

  it('returns undefined for unknown attribute names', () => {
    // Cast to bypass TypeScript for testing runtime behavior
    expect(defaults.getDefault('unknown-attr' as DefaultableAttribute)).toBeUndefined();
  });
});

// ============================================================================
// hasDefault() method
// ============================================================================

describe('ChartDefaults.hasDefault()', () => {
  // Note: hasDefault() uses hasAttribute() which requires DOM
  // We can only test the method exists and basic behavior without DOM

  it('method exists', () => {
    const defaults = new ChartDefaults();
    expect(typeof defaults.hasDefault).toBe('function');
  });
});

// ============================================================================
// configure() - Global/Site-wide Configuration
// ============================================================================

describe('configure()', () => {
  afterEach(() => {
    // Reset global configuration after each test
    configure({});
  });

  it('sets global defaults', () => {
    configure({
      palette: 'viridis',
      animations: true,
      valueFormat: 'compact 1',
    });

    expect(getGlobalDefault('palette')).toBe('viridis');
    expect(getGlobalDefault('animations')).toBe('true'); // Converted to string
    expect(getGlobalDefault('value-format')).toBe('compact 1');
  });

  it('converts boolean animations to string', () => {
    configure({ animations: true });
    expect(getGlobalDefault('animations')).toBe('true');

    configure({ animations: false });
    expect(getGlobalDefault('animations')).toBe('false');
  });

  it('accepts string animations directly', () => {
    configure({ animations: '500ms' });
    expect(getGlobalDefault('animations')).toBe('500ms');
  });

  it('clears previous configuration when called again', () => {
    configure({ palette: 'viridis', animations: true });
    expect(getGlobalDefault('palette')).toBe('viridis');
    expect(getGlobalDefault('animations')).toBe('true');

    configure({ palette: 'category10' });
    expect(getGlobalDefault('palette')).toBe('category10');
    expect(getGlobalDefault('animations')).toBeUndefined(); // Cleared
  });

  it('clears all configuration when called with empty object', () => {
    configure({ palette: 'viridis', animations: true });
    configure({});

    expect(getGlobalDefault('palette')).toBeUndefined();
    expect(getGlobalDefault('animations')).toBeUndefined();
  });

  it('sets all supported options', () => {
    configure({
      animations: '300ms',
      palette: 'category10',
      highContrast: true,
      showValue: true,
      showLabel: false,
      showPercent: { type: 'percent', threshold: 5 },
      valueFormat: 'currency USD',
      percentFormat: 'percent 0',
      labelPosition: 'outside',
      labelFill: '#333',
      stroke: '#000',
      strokeWidth: 2,
      autoPopup: true,
      logging: 'info',
      consoleLog: 'warning',
      padding: '60',
      paddingTop: '10',
      paddingRight: '20',
      paddingBottom: '30',
      paddingLeft: '40',
    });

    expect(getGlobalDefault('animations')).toBe('300ms');
    expect(getGlobalDefault('palette')).toBe('category10');
    expect(getGlobalDefault('high-contrast')).toBe(true);
    expect(getGlobalDefault('show-value')).toBe(true);
    expect(getGlobalDefault('show-label')).toBe(false);
    expect(getGlobalDefault('show-percent')).toEqual({ type: 'percent', threshold: 5 });
    expect(getGlobalDefault('value-format')).toBe('currency USD');
    expect(getGlobalDefault('percent-format')).toBe('percent 0');
    expect(getGlobalDefault('label-position')).toBe('outside');
    expect(getGlobalDefault('label-fill')).toBe('#333');
    expect(getGlobalDefault('stroke')).toBe('#000');
    expect(getGlobalDefault('stroke-width')).toBe(2);
    expect(getGlobalDefault('auto-popup')).toBe(true);
    expect(getGlobalDefault('logging')).toBe('info');
    expect(getGlobalDefault('console-log')).toBe('warning');
    expect(getGlobalDefault('padding')).toBe('60');
    expect(getGlobalDefault('padding-top')).toBe('10');
    expect(getGlobalDefault('padding-right')).toBe('20');
    expect(getGlobalDefault('padding-bottom')).toBe('30');
    expect(getGlobalDefault('padding-left')).toBe('40');
  });

  it('ignores undefined values', () => {
    configure({
      palette: 'viridis',
      animations: undefined,
    });

    expect(getGlobalDefault('palette')).toBe('viridis');
    expect(getGlobalDefault('animations')).toBeUndefined();
  });
});

// ============================================================================
// getConfiguration()
// ============================================================================

describe('getConfiguration()', () => {
  afterEach(() => {
    configure({});
  });

  it('returns empty object when no configuration set', () => {
    configure({});
    const config = getConfiguration();
    expect(Object.keys(config)).toHaveLength(0);
  });

  it('returns current configuration', () => {
    configure({
      palette: 'viridis',
      animations: '500ms',
      highContrast: true,
    });

    const config = getConfiguration();
    expect(config.palette).toBe('viridis');
    expect(config.animations).toBe('500ms');
    expect(config.highContrast).toBe(true);
  });

  it('returns a copy (modifying result does not affect configuration)', () => {
    configure({ palette: 'viridis' });
    const config = getConfiguration();
    (config as Record<string, unknown>).palette = 'modified';

    expect(getGlobalDefault('palette')).toBe('viridis');
  });
});

// ============================================================================
// NOTE: The following functions require DOM environment for testing:
// - findDefaultsElement(element) - uses parentElement, querySelector
// - getDefault(element, attributeName) - uses findDefaultsElement
// - resolveDefault(element, attributeName, elementValue, hardcodedDefault)
//
// These are tested in component tests with happy-dom.
// ============================================================================
