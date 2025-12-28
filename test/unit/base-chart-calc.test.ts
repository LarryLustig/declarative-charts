import { describe, it, expect } from 'vitest';
import { showConditionConverter, optionalBooleanConverter, booleanConverter } from '../../src/base-chart';

/**
 * Unit tests for BaseChart calculation utilities.
 *
 * Tests pure functions and converters that don't require DOM:
 * - showConditionConverter - converts show-* attribute values
 * - optionalBooleanConverter - converts optional boolean attributes
 * - booleanConverter - converts boolean attributes
 */

describe('showConditionConverter', () => {
  describe('fromAttribute', () => {
    it('returns false for null (absent attribute)', () => {
      expect(showConditionConverter.fromAttribute(null)).toBe(false);
    });

    it('returns false for "false" string', () => {
      expect(showConditionConverter.fromAttribute('false')).toBe(false);
    });

    it('returns true for empty string (present without value)', () => {
      expect(showConditionConverter.fromAttribute('')).toBe(true);
    });

    it('returns true for "true" string', () => {
      expect(showConditionConverter.fromAttribute('true')).toBe(true);
    });

    it('parses percentage threshold', () => {
      const result = showConditionConverter.fromAttribute('5%');
      expect(result).toEqual({ type: 'percent', threshold: 5 });
    });

    it('parses decimal percentage threshold', () => {
      const result = showConditionConverter.fromAttribute('2.5%');
      expect(result).toEqual({ type: 'percent', threshold: 2.5 });
    });

    it('parses value threshold (plain number)', () => {
      const result = showConditionConverter.fromAttribute('100');
      expect(result).toEqual({ type: 'value', threshold: 100 });
    });

    it('parses value threshold with decimal', () => {
      const result = showConditionConverter.fromAttribute('50.5');
      expect(result).toEqual({ type: 'value', threshold: 50.5 });
    });

    it('parses negative value threshold', () => {
      const result = showConditionConverter.fromAttribute('-10');
      expect(result).toEqual({ type: 'value', threshold: -10 });
    });

    it('returns true for invalid percentage', () => {
      // Invalid percentage like "abc%" defaults to true
      expect(showConditionConverter.fromAttribute('abc%')).toBe(true);
    });

    it('returns true for non-numeric string', () => {
      expect(showConditionConverter.fromAttribute('yes')).toBe(true);
    });
  });

  describe('toAttribute', () => {
    it('returns empty string for true', () => {
      expect(showConditionConverter.toAttribute(true)).toBe('');
    });

    it('returns null for false', () => {
      expect(showConditionConverter.toAttribute(false)).toBe(null);
    });

    it('returns percentage string for percent condition', () => {
      expect(showConditionConverter.toAttribute({ type: 'percent', threshold: 5 })).toBe('5%');
    });

    it('returns number string for value condition', () => {
      expect(showConditionConverter.toAttribute({ type: 'value', threshold: 100 })).toBe('100');
    });
  });
});

describe('optionalBooleanConverter', () => {
  describe('fromAttribute', () => {
    it('returns undefined for null (absent attribute)', () => {
      expect(optionalBooleanConverter.fromAttribute(null)).toBe(undefined);
    });

    it('returns false for "false" string', () => {
      expect(optionalBooleanConverter.fromAttribute('false')).toBe(false);
    });

    it('returns false for "FALSE" string (case insensitive)', () => {
      expect(optionalBooleanConverter.fromAttribute('FALSE')).toBe(false);
    });

    it('returns true for empty string', () => {
      expect(optionalBooleanConverter.fromAttribute('')).toBe(true);
    });

    it('returns true for "true" string', () => {
      expect(optionalBooleanConverter.fromAttribute('true')).toBe(true);
    });

    it('returns true for any other value', () => {
      expect(optionalBooleanConverter.fromAttribute('yes')).toBe(true);
      expect(optionalBooleanConverter.fromAttribute('1')).toBe(true);
    });
  });

  describe('toAttribute', () => {
    it('returns null for undefined', () => {
      expect(optionalBooleanConverter.toAttribute(undefined)).toBe(null);
    });

    it('returns empty string for true', () => {
      expect(optionalBooleanConverter.toAttribute(true)).toBe('');
    });

    it('returns "false" for false', () => {
      expect(optionalBooleanConverter.toAttribute(false)).toBe('false');
    });
  });
});

describe('booleanConverter (legacy)', () => {
  describe('fromAttribute', () => {
    it('returns false for null', () => {
      expect(booleanConverter.fromAttribute(null)).toBe(false);
    });

    it('returns false for "false" string', () => {
      expect(booleanConverter.fromAttribute('false')).toBe(false);
    });

    it('returns true for empty string', () => {
      expect(booleanConverter.fromAttribute('')).toBe(true);
    });

    it('returns true for any other value', () => {
      expect(booleanConverter.fromAttribute('true')).toBe(true);
      expect(booleanConverter.fromAttribute('anything')).toBe(true);
    });
  });

  describe('toAttribute', () => {
    it('returns empty string for true', () => {
      expect(booleanConverter.toAttribute(true)).toBe('');
    });

    it('returns null for false', () => {
      expect(booleanConverter.toAttribute(false)).toBe(null);
    });
  });
});
