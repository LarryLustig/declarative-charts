import { describe, it, expect, beforeEach } from 'vitest';
import { BaseShape } from '../../src/base-shape';

/**
 * Tests for BaseShape abstract class.
 *
 * Since BaseShape is abstract, we create a minimal concrete implementation
 * for testing purposes.
 */

// Minimal concrete implementation for testing
class TestShape extends BaseShape {
  static readonly KNOWN_ATTRS = new Set(['value', 'custom-attr']);
}

// ============================================================================
// BASE_KNOWN_ATTRS constant
// ============================================================================

describe('BaseShape.BASE_KNOWN_ATTRS', () => {
  it('is a Set', () => {
    expect(BaseShape.BASE_KNOWN_ATTRS).toBeInstanceOf(Set);
  });

  it('contains expected base attributes', () => {
    const expected = [
      'label',
      'color',
      'fill',
      'stroke',
      'stroke-width',
      'href',
      'target',
      'auto-popup',
      'pattern',
      'pattern-stroke',
      'pattern-fill',
      'pattern-scale',
      'value-format',
    ];
    expected.forEach(attr => {
      expect(BaseShape.BASE_KNOWN_ATTRS.has(attr)).toBe(true);
    });
  });

  it('contains deprecated color attribute', () => {
    expect(BaseShape.BASE_KNOWN_ATTRS.has('color')).toBe(true);
  });

  it('contains all pattern-related attributes', () => {
    expect(BaseShape.BASE_KNOWN_ATTRS.has('pattern')).toBe(true);
    expect(BaseShape.BASE_KNOWN_ATTRS.has('pattern-stroke')).toBe(true);
    expect(BaseShape.BASE_KNOWN_ATTRS.has('pattern-fill')).toBe(true);
    expect(BaseShape.BASE_KNOWN_ATTRS.has('pattern-scale')).toBe(true);
  });
});

// ============================================================================
// Property defaults
// ============================================================================

describe('BaseShape properties', () => {
  let shape: TestShape;

  beforeEach(() => {
    shape = new TestShape();
  });

  describe('default values', () => {
    it('autoPopup defaults to undefined', () => {
      expect(shape.autoPopup).toBeUndefined();
    });

    it('pattern defaults to undefined', () => {
      expect(shape.pattern).toBeUndefined();
    });

    it('patternStroke defaults to undefined', () => {
      expect(shape.patternStroke).toBeUndefined();
    });

    it('patternFill defaults to undefined', () => {
      expect(shape.patternFill).toBeUndefined();
    });

    it('patternScale defaults to undefined', () => {
      expect(shape.patternScale).toBeUndefined();
    });

    it('valueFormat defaults to undefined', () => {
      expect(shape.valueFormat).toBeUndefined();
    });
  });

  describe('property assignment', () => {
    it('can set autoPopup to true', () => {
      shape.autoPopup = true;
      expect(shape.autoPopup).toBe(true);
    });

    it('can set autoPopup to false', () => {
      shape.autoPopup = false;
      expect(shape.autoPopup).toBe(false);
    });

    it('can set pattern to pattern type', () => {
      shape.pattern = 'diagonal-lines';
      expect(shape.pattern).toBe('diagonal-lines');
    });

    it('can set pattern to ID reference', () => {
      shape.pattern = 'my-custom-pattern';
      expect(shape.pattern).toBe('my-custom-pattern');
    });

    it('can set patternStroke', () => {
      shape.patternStroke = '#dc2626';
      expect(shape.patternStroke).toBe('#dc2626');
    });

    it('can set patternFill', () => {
      shape.patternFill = '#fee2e2';
      expect(shape.patternFill).toBe('#fee2e2');
    });

    it('can set patternScale', () => {
      shape.patternScale = 2;
      expect(shape.patternScale).toBe(2);
    });

    it('can set valueFormat', () => {
      shape.valueFormat = 'currency USD';
      expect(shape.valueFormat).toBe('currency USD');
    });
  });
});

// ============================================================================
// getPassthroughAttributes
// ============================================================================

describe('getPassthroughAttributes', () => {
  let shape: TestShape;

  beforeEach(() => {
    shape = new TestShape();
  });

  it('returns empty object when no attributes set', () => {
    const attrs = shape.getPassthroughAttributes(new Set());
    expect(attrs).toEqual({});
  });

  it('filters out BASE_KNOWN_ATTRS', () => {
    shape.setAttribute('fill', '#ff0000');
    shape.setAttribute('stroke', '#000000');
    shape.setAttribute('label', 'Test');
    shape.setAttribute('data-custom', 'value');

    const attrs = shape.getPassthroughAttributes(new Set());
    expect(attrs['fill']).toBeUndefined();
    expect(attrs['stroke']).toBeUndefined();
    expect(attrs['label']).toBeUndefined();
    expect(attrs['data-custom']).toBe('value');
  });

  it('filters out provided knownAttrs', () => {
    shape.setAttribute('value', '100');
    shape.setAttribute('custom-attr', 'custom');
    shape.setAttribute('data-htmx', 'true');

    const attrs = shape.getPassthroughAttributes(TestShape.KNOWN_ATTRS);
    expect(attrs['value']).toBeUndefined();
    expect(attrs['custom-attr']).toBeUndefined();
    expect(attrs['data-htmx']).toBe('true');
  });

  it('passes through data-* attributes', () => {
    shape.setAttribute('data-id', '123');
    shape.setAttribute('data-category', 'sales');
    shape.setAttribute('data-hx-get', '/api/data');

    const attrs = shape.getPassthroughAttributes(new Set());
    expect(attrs['data-id']).toBe('123');
    expect(attrs['data-category']).toBe('sales');
    expect(attrs['data-hx-get']).toBe('/api/data');
  });

  it('passes through aria-* attributes', () => {
    shape.setAttribute('aria-label', 'Chart bar');
    shape.setAttribute('aria-describedby', 'desc-1');

    const attrs = shape.getPassthroughAttributes(new Set());
    expect(attrs['aria-label']).toBe('Chart bar');
    expect(attrs['aria-describedby']).toBe('desc-1');
  });

  it('passes through role attribute', () => {
    shape.setAttribute('role', 'img');

    const attrs = shape.getPassthroughAttributes(new Set());
    expect(attrs['role']).toBe('img');
  });

  it('passes through event handlers (htmx support)', () => {
    shape.setAttribute('hx-get', '/api/data');
    shape.setAttribute('hx-trigger', 'click');
    shape.setAttribute('hx-target', '#result');

    const attrs = shape.getPassthroughAttributes(new Set());
    expect(attrs['hx-get']).toBe('/api/data');
    expect(attrs['hx-trigger']).toBe('click');
    expect(attrs['hx-target']).toBe('#result');
  });

  it('merges BASE_KNOWN_ATTRS with provided knownAttrs', () => {
    shape.setAttribute('fill', '#ff0000'); // BASE_KNOWN_ATTRS
    shape.setAttribute('value', '100'); // TestShape.KNOWN_ATTRS
    shape.setAttribute('unknown', 'pass'); // Neither

    const attrs = shape.getPassthroughAttributes(TestShape.KNOWN_ATTRS);
    expect(attrs['fill']).toBeUndefined();
    expect(attrs['value']).toBeUndefined();
    expect(attrs['unknown']).toBe('pass');
  });
});

// ============================================================================
// Pattern-related attributes
// ============================================================================

describe('Pattern attributes', () => {
  let shape: TestShape;

  beforeEach(() => {
    shape = new TestShape();
  });

  it('can configure a complete pattern', () => {
    shape.pattern = 'crosshatch';
    shape.patternStroke = '#dc2626';
    shape.patternFill = '#fee2e2';
    shape.patternScale = 1.5;

    expect(shape.pattern).toBe('crosshatch');
    expect(shape.patternStroke).toBe('#dc2626');
    expect(shape.patternFill).toBe('#fee2e2');
    expect(shape.patternScale).toBe(1.5);
  });

  it('pattern attributes are independent', () => {
    shape.pattern = 'dots';
    // Other pattern attrs remain undefined
    expect(shape.patternStroke).toBeUndefined();
    expect(shape.patternFill).toBeUndefined();
    expect(shape.patternScale).toBeUndefined();
  });
});
