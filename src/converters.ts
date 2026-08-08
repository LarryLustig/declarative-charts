/**
 * Lit property converters for common attribute types.
 *
 * Imports only `errors.ts`, which is a leaf module. The rest of the chart
 * modules are deliberately not imported, to avoid the circular dependencies
 * this file was written to sidestep.
 */

import { ErrorCode } from './errors.js';

/**
 * ShowCondition type - can be true, false, or a threshold condition.
 */
export type ShowCondition =
  | boolean
  | { type: 'percent'; threshold: number }
  | { type: 'value'; threshold: number };

/**
 * Spellings of "no" that a human would expect to turn a `show-*` attribute off.
 *
 * `show-value` looks like an HTML boolean attribute, where presence means true
 * whatever the value - but it is not one: it already treats `"false"` as false,
 * and it accepts thresholds. It is an *enumerated* attribute, and HTML's rule
 * for those is that an unrecognised value falls back to a default rather than
 * being read as presence.
 *
 * Which matters, because it used to return `true` for anything it did not
 * recognise. `show-value="off"`, `"no"` and `"none"` all turned labels **on** -
 * the exact opposite of what the markup says, with nothing logged.
 */
const FALSY_SPELLINGS = ['false', 'off', 'no', 'none', 'hidden'];

/** Spellings of "yes". `""` (bare attribute) is handled separately. */
const TRUTHY_SPELLINGS = ['true', 'on', 'yes', 'show'];

/**
 * Converter for show-value, show-label, show-percent attributes.
 * Supports:
 * - absent, "false", "off", "no", "none", "hidden" → false
 * - "" (present without value), "true", "on", "yes", "show" → true
 * - "5%" → { type: 'percent', threshold: 5 }
 * - "100" or "100px" (number without %) → { type: 'value', threshold: 100 }
 *
 * Anything else warns with DC104 and returns false, rather than guessing.
 */
export const showConditionConverter = {
  fromAttribute: (value: string | null): ShowCondition => {
    if (value === null) return false;

    // Attribute values are compared case-insensitively and whitespace-tolerantly,
    // matching how HTML treats enumerated attributes.
    const normalized = value.trim();
    const lower = normalized.toLowerCase();
    if (FALSY_SPELLINGS.includes(lower)) return false;
    if (normalized === '' || TRUTHY_SPELLINGS.includes(lower)) return true;

    // Check for percentage threshold
    if (normalized.endsWith('%')) {
      const threshold = parseFloat(normalized);
      if (!isNaN(threshold)) {
        return { type: 'percent', threshold };
      }
    }

    // Check for value threshold (number, optionally with px)
    const numValue = parseFloat(normalized.replace('px', ''));
    if (!isNaN(numValue)) {
      return { type: 'value', threshold: numValue };
    }

    // Unrecognised. Say so rather than picking a meaning: a value this
    // converter cannot read is a typo, and guessing "true" is how
    // show-value="off" came to mean show.
    console.warn(
      `[${ErrorCode.PARSE_ERROR.code}] ${ErrorCode.PARSE_ERROR.path}: ` +
      `Could not parse show condition "${value}", defaulting to false. ` +
      `Use true/false, a percentage such as "10%", or a value such as "100".`
    );
    return false;
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
 * Converter for numeric attributes where "no value" is meaningful and must stay
 * distinguishable from zero.
 *
 * A template rendering a month with no data emits `<dc-point label="Mar">` or
 * `value="null"`. Treated as 0 the chart would dive to the axis and claim the
 * value *was* zero, which for anything financial or clinical is not a cosmetic
 * bug - it is the chart stating something false. NaN carries "absent" through
 * the layout, where callers test it explicitly.
 *
 * Accepts the spellings a server template is likely to produce: an absent
 * attribute, an empty string, `null`, `none`, `na`, `n/a`, or `-`.
 */
export const optionalNumberConverter = {
  fromAttribute: (value: string | null): number => {
    if (value === null) return NaN;
    const normalized = value.trim().toLowerCase();
    if (normalized === '' || ['null', 'none', 'na', 'n/a', '-', 'undefined', 'nan'].includes(normalized)) {
      return NaN;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  },
  toAttribute: (value: number): string | null =>
    Number.isFinite(value) ? String(value) : null
};

/**
 * Converter for boolean attributes.
 * Handles standard HTML boolean attribute behavior.
 */
export const booleanConverter = {
  fromAttribute: (value: string | null): boolean => {
    if (value === null) return false;
    return value.trim().toLowerCase() !== 'false';
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
    if (value.trim().toLowerCase() === 'false') return false;
    return true;
  },
  toAttribute: (value: boolean | undefined): string | null => {
    if (value === undefined) return null;
    return value ? '' : 'false';
  }
};

/**
 * Evaluate a ShowCondition against a value and its share of the total.
 *
 * Pure, and here rather than on `BaseChart`, because `<dc-legend>` needs it
 * too and is not a chart. The legend used to coerce every condition to a
 * boolean, so `show-value="10%"` on a legend silently meant "always".
 *
 * @param condition The show condition (boolean or threshold)
 * @param value The numeric value of the element
 * @param percent The percentage of the element (0-100)
 */
export function evaluateShowCondition(
  condition: ShowCondition,
  value: number,
  percent: number
): boolean {
  if (typeof condition === 'boolean') return condition;
  if (condition.type === 'percent') return percent >= condition.threshold;
  return value >= condition.threshold;
}
