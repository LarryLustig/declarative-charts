/**
 * Lit property converters for common attribute types.
 *
 * This module is intentionally kept free of imports to avoid circular
 * dependencies with other chart modules.
 */

/**
 * ShowCondition type - can be true, false, or a threshold condition.
 */
export type ShowCondition =
  | boolean
  | { type: 'percent'; threshold: number }
  | { type: 'value'; threshold: number };

/**
 * Converter for show-value, show-label, show-percent attributes.
 * Supports:
 * - "false" or absent → false
 * - "true" or "" (present without value) → true
 * - "5%" → { type: 'percent', threshold: 5 }
 * - "100" or "100px" (number without %) → { type: 'value', threshold: 100 }
 */
export const showConditionConverter = {
  fromAttribute: (value: string | null): ShowCondition => {
    if (value === null) return false;
    if (value === 'false') return false;
    if (value === '' || value === 'true') return true;

    // Check for percentage threshold
    if (value.endsWith('%')) {
      const threshold = parseFloat(value);
      if (!isNaN(threshold)) {
        return { type: 'percent', threshold };
      }
    }

    // Check for value threshold (number, optionally with px)
    const numValue = parseFloat(value.replace('px', ''));
    if (!isNaN(numValue)) {
      return { type: 'value', threshold: numValue };
    }

    // Default to true for any other truthy string
    return true;
  },
  toAttribute: (value: ShowCondition): string | null => {
    if (value === false) return null;
    if (value === true) return '';
    if (typeof value === 'object') {
      if (value.type === 'percent') {
        return `${value.threshold}%`;
      }
      return String(value.threshold);
    }
    return null;
  }
};

/**
 * Converter for boolean attributes.
 * Handles standard HTML boolean attribute behavior.
 */
export const booleanConverter = {
  fromAttribute: (value: string | null): boolean => {
    if (value === null || value === 'false') return false;
    return true;
  },
  toAttribute: (value: boolean): string | null => {
    return value ? '' : null;
  }
};

/**
 * Converter for optional boolean attributes that distinguish
 * between unset (undefined), false, and true.
 *
 * - null/absent → undefined (use default)
 * - "false" → false (explicitly disabled)
 * - "" or "true" → true (explicitly enabled)
 */
export const optionalBooleanConverter = {
  fromAttribute: (value: string | null): boolean | undefined => {
    if (value === null) return undefined;
    if (value === 'false') return false;
    return true;
  },
  toAttribute: (value: boolean | undefined): string | null => {
    if (value === undefined) return null;
    return value ? '' : 'false';
  }
};
