import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Structural consistency across the example pages.
 *
 * These are the things a reader notices when they are wrong and nobody notices
 * when they drift: a page that loads the library from somewhere else, one that
 * is unreachable from the nav, a callout styled three different ways.
 *
 * What an audit found before this existed:
 *
 * - Four pages loaded `../dist/declarative-charts.standalone.js`, which is
 *   gitignored and never committed, so they were blank on a fresh clone.
 * - `animations.html` used an absolute `/src/index.ts`, which breaks whenever
 *   the site is not served from the domain root.
 * - `defaults.html` was in no nav menu — reachable only by typing the URL.
 * - `.note` was declared byte-for-byte in three page-local `<style>` blocks,
 *   and buttons were styled on one page only, so the same control looked
 *   different depending on where you met it.
 */

const root = resolve(__dirname, '../..');
const dir = resolve(root, 'examples');
const norm = (t: string) => t.split('\r\n').join('\n');

/** Not pages: HTML fragments fetched by another page. */
const FRAGMENTS = new Set(['loaded-content.html']);

const all = readdirSync(dir).filter(f => f.endsWith('.html'));
const pages = all
  .filter(f => !FRAGMENTS.has(f))
  .map(f => ({ file: f, text: norm(readFileSync(resolve(dir, f), 'utf8')) }));

const js = norm(readFileSync(resolve(dir, 'examples.js'), 'utf8'));
const css = norm(readFileSync(resolve(dir, 'examples.css'), 'utf8'));

/** Every page failing `predicate`, for a message that names them all at once. */
const failing = (predicate: (p: { file: string; text: string }) => boolean) =>
  pages.filter(predicate).map(p => p.file);

describe('example pages share one shape', () => {
  it('found pages to check', () => {
    expect(pages.length).toBeGreaterThan(25);
  });

  it.each([
    ['<!DOCTYPE html>', (t: string) => /^<!DOCTYPE html>/i.test(t.trim())],
    ['lang="en"', (t: string) => t.includes('<html lang="en">')],
    ['a charset', (t: string) => t.includes('<meta charset="UTF-8">')],
    ['a viewport', (t: string) => t.includes('<meta name="viewport"')],
    ['examples.css', (t: string) => t.includes('<link rel="stylesheet" href="examples.css">')],
    ['an <h1>', (t: string) => /<h1>[^<]+<\/h1>/.test(t)],
    ['a <nav></nav> placeholder', (t: string) => t.includes('<nav></nav>')],
    ['examples.js', (t: string) => t.includes('<script src="examples.js"></script>')]
  ])('every page has %s', (_what, has) => {
    expect(failing(p => !has(p.text))).toEqual([]);
  });

  it('every page titles itself the same way', () => {
    const wrong = pages
      .filter(p => !/<title>.+ - Declarative Chart Library<\/title>/.test(p.text))
      .map(p => p.file);
    expect(wrong).toEqual([]);
  });

  /**
   * `dist/` is gitignored, so a page that loads the built bundle shows nothing
   * on a fresh clone and stale behaviour whenever the build is old.
   */
  it('every page loads the library from source, by a relative path', () => {
    const wrong = pages
      .filter(p => !p.text.includes('<script type="module" src="../src/index.ts"></script>'))
      .map(p => p.file);
    expect(wrong, 'pages not loading ../src/index.ts').toEqual([]);

    const usingDist = pages.filter(p => p.text.includes('/dist/')).map(p => p.file);
    expect(usingDist, 'pages loading the gitignored dist/ build').toEqual([]);
  });

  it('loads the library before examples.js on every page', () => {
    const wrong = failing(
      p => p.text.indexOf('type="module"') > p.text.indexOf('src="examples.js"')
    );
    expect(wrong).toEqual([]);
  });
});

describe('navigation', () => {
  const hrefs = new Set([...js.matchAll(/href:\s*'([^']+)'/g)].map(m => m[1]));

  it('reaches every page', () => {
    const orphans = pages.filter(p => !hrefs.has(p.file)).map(p => p.file);
    expect(orphans, 'pages in no nav menu').toEqual([]);
  });

  it('points at nothing that does not exist', () => {
    const dangling = [...hrefs].filter(h => h !== 'index.html' && !all.includes(h));
    expect(dangling, 'nav entries with no page').toEqual([]);
  });
});

describe('styling is shared, not copied', () => {
  /** Selectors declared in page-local <style> blocks, and where. */
  const inlineSelectors = new Map<string, string[]>();
  for (const { file, text } of pages) {
    for (const block of text.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
      for (const rule of block[1].matchAll(/(^|\})\s*([^{}@]+)\{/g)) {
        const sel = rule[2].trim().replace(/\s+/g, ' ');
        if (!sel || sel.startsWith('/*')) continue;
        inlineSelectors.set(sel, [...(inlineSelectors.get(sel) ?? []), file]);
      }
    }
  }

  it('declares no selector inline on more than one page', () => {
    const duplicated = [...inlineSelectors]
      .filter(([, files]) => files.length > 1)
      .map(([sel, files]) => `${sel} (${files.join(', ')})`);
    expect(duplicated, 'move these into examples.css').toEqual([]);
  });

  it('keeps the shared components in examples.css', () => {
    for (const sel of ['.note', 'button', '.example-table', '.grid', '.example']) {
      expect(css, `${sel} should live in examples.css`).toContain(sel);
    }
  });
});
