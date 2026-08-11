import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ANIMATION_OPTIONS,
  parseAnimateAttribute,
  supportsWebAnimations
} from '../../src/animation';

/**
 * Tests for the pure parts of `animation.ts`, which had no test file.
 *
 * `parseAnimateAttribute` is worth pinning on its own: it reads a user-facing
 * attribute, and every unparseable value falls through to the default duration
 * rather than to "off", so a typo animates rather than doing nothing visible.
 *
 * Note docs/review.md §7 attributed this file's low coverage to happy-dom lacking
 * the Web Animations API and recommended stubbing `Element.prototype.animate`.
 * That is only half true, and the halves matter: `test/unit/` runs in node with
 * no DOM at all, while `test/component/` runs in happy-dom, which *does* now
 * provide `animate` (asserted in `test/component/log-console.test.ts`). So the
 * stub is unnecessary, and the remaining gap is ordinary missing coverage of
 * the `animate*` functions rather than an artifact.
 */

describe('supportsWebAnimations', () => {
  /**
   * This file runs in the node environment, which has no DOM at all - so the
   * answer here is `false`, and the animators it guards degrade to no-ops
   * rather than throwing. `test/component/` runs in happy-dom, which *does*
   * provide `Element.prototype.animate`; the matching assertion lives there.
   */
  it('agrees with whether a DOM is present', () => {
    const hasDom = typeof Element !== 'undefined';
    expect(supportsWebAnimations()).toBe(
      hasDom && typeof Element.prototype.animate === 'function'
    );
  });

  it('is false without a DOM, so callers can skip safely', () => {
    expect(supportsWebAnimations()).toBe(false);
  });
});

describe('parseAnimateAttribute', () => {
  const DEFAULT = DEFAULT_ANIMATION_OPTIONS.duration;

  it('treats an absent attribute as off', () => {
    expect(parseAnimateAttribute(null)).toBeNull();
  });

  it('treats "false" as off', () => {
    expect(parseAnimateAttribute('false')).toBeNull();
  });

  it.each([
    ['', 'bare attribute'],
    ['true', 'explicit true']
  ])('uses the default duration for %o (%s)', value => {
    expect(parseAnimateAttribute(value)).toBe(DEFAULT);
  });

  it.each([
    ['500ms', 500],
    ['0.5s', 500],
    ['1s', 1000],
    ['1.5s', 1500],
    ['500', 500],
    ['0', 0],
    ['250.5', 250.5]
  ])('parses %o as %ims', (value, expected) => {
    expect(parseAnimateAttribute(value)).toBe(expected);
  });

  /**
   * Every unrecognised value lands on the default duration, so a typo animates
   * rather than disabling. That is the opposite of how `show-*` now behaves
   * (docs/review.md §6.2), but it is the safer direction here: the failure mode is a
   * chart that animates when you did not ask, not one that silently ignores a
   * setting you did ask for.
   */
  it.each(['nonsense', '500px', 'fast', '-100', '1e3'])(
    'falls back to the default duration for %o',
    value => {
      expect(parseAnimateAttribute(value)).toBe(DEFAULT);
    }
  );

  it('is case-sensitive about "false", matching the attribute contract', () => {
    // "FALSE" is not the documented spelling, so it takes the fallback rather
    // than disabling. Pinned because it is surprising, not because it is right.
    expect(parseAnimateAttribute('FALSE')).toBe(DEFAULT);
  });
});

describe('DEFAULT_ANIMATION_OPTIONS', () => {
  it('is the shape the parser and the animators both assume', () => {
    expect(DEFAULT_ANIMATION_OPTIONS.duration).toBeGreaterThan(0);
    expect(typeof DEFAULT_ANIMATION_OPTIONS.easing).toBe('string');
  });
});
