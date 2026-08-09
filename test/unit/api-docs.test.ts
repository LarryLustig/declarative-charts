import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { SVG_TEXT_STYLE_ATTRS } from '../../src/chart-title';

/**
 * Keeps `API.md` honest about which attributes exist.
 *
 * For an HTML-first library the reference *is* the product: an attribute that is
 * documented but unimplemented silently does nothing, and one that is
 * implemented but undocumented may as well not exist. Both had happened, in
 * volume — a single audit found `<dc-axis>` documenting 4 of its 13 attributes
 * (`min-value`, `tick-interval` and the whole time-axis group were invisible),
 * `<dc-grid>` absent entirely, `<dc-legend columns>` documenting the wrong
 * default, `<dc-fill max-value>` documented as exclusive when the code is
 * inclusive, and `stroke-color` documented on two elements that never had it.
 *
 * Four attributes were documented in JSDoc `@attr` tags with no property behind
 * them at all: `fill-colors`, `stroke-colors`, `stroke-color`, `fill-color`.
 * That is the worst of the failure modes, because `slice-color` had been
 * *deprecated in favour of* `fill-colors` — a real feature discouraged in favour
 * of one that was never written.
 *
 * This is the same guard as `palette-docs.test.ts`, for the same reason: a
 * declarative API fails silently, so only a test can notice.
 */

const root = resolve(__dirname, '../..');
const norm = (t: string) => t.split('\r\n').join('\n');
const camelToKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const sourceFiles = readdirSync(resolve(root, 'src'))
  .filter(f => f.endsWith('.ts'))
  .map(f => ({ file: f, text: norm(readFileSync(resolve(root, 'src', f), 'utf8')) }));

/** Attribute names declared by `@property` in one source file. */
function declaredAttrs(src: string): Set<string> {
  const attrs = new Set<string>();
  for (const m of src.matchAll(
    /@property\(\s*(\{[^}]*\})?\s*\)\s*(?:override\s+)?([A-Za-z_$][\w$]*)/g
  )) {
    const opts = m[1] ?? '';
    if (/attribute\s*:\s*false/.test(opts)) continue;
    const explicit = opts.match(/attribute\s*:\s*'([^']+)'/);
    attrs.add(explicit ? explicit[1] : camelToKebab(m[2]));
  }
  return attrs;
}

/** tag -> source file, for every registered custom element. */
const tagFile = new Map<string, string>();
/** className -> { parent, attrs, file } so inherited attributes can be walked. */
const classes = new Map<string, { parent: string; attrs: Set<string>; file: string }>();
/** Every attribute declared anywhere in src/. */
const allDeclared = new Set<string>();

for (const { file, text } of sourceFiles) {
  const own = declaredAttrs(text);
  own.forEach(a => allDeclared.add(a));
  for (const cm of text.matchAll(/export (?:abstract )?class (\w+) extends (\w+)/g)) {
    classes.set(cm[1], { parent: cm[2], attrs: own, file });
  }
  const tag = text.match(/@customElement\('([^']+)'\)/);
  if (tag) tagFile.set(tag[1], file);
}

/** Own attributes plus everything inherited up the class chain. */
function attrsFor(tag: string): Set<string> {
  const all = new Set<string>();
  let entry = [...classes.values()].find(c => c.file === tagFile.get(tag));
  for (let i = 0; entry && i < 8; i++) {
    entry.attrs.forEach(a => all.add(a));
    entry = classes.get(entry.parent);
  }
  return all;
}

const api = norm(readFileSync(resolve(root, 'API.md'), 'utf8'));

/**
 * Attributes API.md documents per element.
 *
 * Note the `(?![\s\S])` terminator rather than `$`: under the `m` flag `$`
 * matches every line ending, which silently truncates each section to its
 * heading and makes the whole check pass vacuously.
 */
const documented = new Map<string, Set<string>>();

/** Attribute names in a block, as `- \`x\`` bullets or as `| \`x\` |` table rows. */
const namesIn = (block: string) =>
  [
    ...[...block.matchAll(/^-\s+`([a-z-]+)`/gm)].map(m => m[1]),
    ...[...block.matchAll(/^\|\s*`([a-z-]+)`\s*\|/gm)].map(m => m[1])
  ];

/**
 * Elements whose attributes are documented in a dedicated prose section rather
 * than inline under their `### <tag>` heading, which cross-references it.
 * Listing the section here is what lets the check stay strict for everything
 * else instead of being loosened globally.
 */
const PROSE_SECTIONS: Record<string, RegExp> = {
  'dc-defaults': /^### Supported Attributes\n([\s\S]*?)(?=^### |^## )/m
};

for (const sec of api.matchAll(/^### `<([a-z-]+)>`([\s\S]*?)(?=^### |^## |(?![\s\S]))/gm)) {
  const names = namesIn(sec[2]);
  const prose = PROSE_SECTIONS[sec[1]];
  if (prose) {
    const block = api.match(prose);
    if (block) names.push(...namesIn(block[1]));
  }
  documented.set(sec[1], new Set(names));
}

/**
 * Names that appear as `- \`x\`` bullets without being attributes: global HTML
 * attributes, and enumerated *values* documented as lists.
 */
const NOT_ATTRIBUTES = new Set([
  'id', 'class', 'style', 'title', 'slot', 'part',
  'hover', 'click',                                   // <dc-popup trigger> values
  'solid', 'dashed', 'dotted', 'dash-dot', 'long-dash' // stroke-dasharray values
]);

/**
 * Text elements are styled with SVG presentation attributes, which are read off
 * the element via `SVG_TEXT_STYLE_ATTRS` rather than declared as `@property`.
 * Sourced from the implementation so the two cannot drift.
 */
const SVG_STYLE_ATTRS = SVG_TEXT_STYLE_ATTRS as Set<string>;

describe('API.md matches the implemented attributes', () => {
  it('parses both sides, so the check cannot pass vacuously', () => {
    expect(tagFile.size).toBeGreaterThanOrEqual(26);
    expect(documented.size).toBeGreaterThanOrEqual(26);
    // A real, known attribute must be visible on both sides.
    expect(attrsFor('dc-axis').has('min-value')).toBe(true);
    expect(documented.get('dc-axis')?.has('min-value')).toBe(true);
  });

  it('every custom element has a Components section', () => {
    const missing = [...tagFile.keys()].filter(t => !documented.has(t));
    expect(missing, `elements with no "### \`<tag>\`" section: ${missing.join(', ')}`).toEqual([]);
  });

  it('documents no attribute that is not implemented', () => {
    const bogus: string[] = [];
    for (const [tag, docs] of documented) {
      const real = attrsFor(tag);
      for (const attr of docs) {
        if (!real.has(attr) && !NOT_ATTRIBUTES.has(attr) && !SVG_STYLE_ATTRS.has(attr)) {
          bogus.push(`<${tag}> ${attr}`);
        }
      }
    }
    expect(bogus, `documented but not implemented: ${bogus.join(', ')}`).toEqual([]);
  });

  it('documents every attribute an element declares', () => {
    const undocumented: string[] = [];
    for (const [tag, file] of tagFile) {
      const docs = documented.get(tag);
      if (!docs) continue;
      const own = declaredAttrs(sourceFiles.find(s => s.file === file)!.text);
      for (const attr of own) {
        if (!docs.has(attr)) undocumented.push(`<${tag}> ${attr}`);
      }
    }
    expect(
      undocumented,
      `implemented but not documented: ${undocumented.join(', ')}`
    ).toEqual([]);
  });

  /**
   * A JSDoc `@attr` with no property behind it is how `fill-colors` came to be
   * the recommended replacement for a working attribute while never existing.
   * Text styling attributes are exempt: `font-family` and friends are read from
   * the element via `SVG_TEXT_STYLE_ATTRS` rather than declared as properties.
   */
  it('claims no @attr in JSDoc that has no property behind it', () => {
    const phantom: string[] = [];
    for (const { file, text } of sourceFiles) {
      for (const m of text.matchAll(/^\s*\*\s*@attr\s*(?:\{[^}]*\})?\s*([a-z][a-z0-9-]*)/gm)) {
        const attr = m[1];
        if (allDeclared.has(attr) || SVG_STYLE_ATTRS.has(attr) || NOT_ATTRIBUTES.has(attr)) continue;
        phantom.push(`${file}: @attr ${attr}`);
      }
    }
    expect(phantom, `@attr with no @property: ${phantom.join(', ')}`).toEqual([]);
  });
});
