import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUILTIN_PALETTES } from '../../src/builtin-palettes';

/**
 * Keeps the documented palette names honest.
 *
 * The documented list had drifted badly: CLAUDE.md and API.md both named 18
 * palettes that do not exist (`blue`, `plasma`, `turbo`, `tableau10`, `set1`, …)
 * while omitting 13 that do. Nothing caught it because an unrecognised name
 * resolves to `undefined` and falls back to generated colours - a typo shows up
 * as "the colours look wrong", never as an error.
 *
 * Only API.md is checked now. CLAUDE.md carried a second copy of the list and
 * this test existed to stop that copy lying; the copy is gone, which is the
 * better fix. A test asserting that prose matches code is a sign the fact was
 * in the wrong place.
 */

const root = resolve(__dirname, '../..');
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');

const actual = new Set(Object.keys(BUILTIN_PALETTES));

describe('documented palette names match the implementation', () => {
  it('the registry itself is the shape the docs assume', () => {
    expect(actual.size).toBe(20);
    const types = Object.values(BUILTIN_PALETTES).map(p => p.type);
    expect(types.filter(t => t === 'categorical')).toHaveLength(8);
    expect(types.filter(t => t === 'sequential')).toHaveLength(9);
    expect(types.filter(t => t === 'diverging')).toHaveLength(3);
  });

  it('API.md names exactly the palettes that exist', () => {
    const md = read('API.md');
    const block = md.match(/\*\*Built-in palettes:\*\*([\s\S]*?)See \[Palettes and Pattern Fills\]/);
    expect(block, 'API.md built-in palette section not found').not.toBeNull();

    // Only the leading cell of each table row is a palette name.
    const documented = new Set(
      [...block![1].matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map(m => m[1]));

    const invented = [...documented].filter(n => !actual.has(n));
    const missing = [...actual].filter(n => !documented.has(n));

    expect(invented, `API.md names palettes that do not exist: ${invented.join(', ')}`).toEqual([]);
    expect(missing, `API.md omits real palettes: ${missing.join(', ')}`).toEqual([]);
  });

  it('every documented name actually resolves', async () => {
    // A name can be spelled right in the docs and still be unreachable if the
    // registry key and the lookup disagree.
    const { getBuiltinPalette } = await import('../../src/builtin-palettes');
    for (const name of actual) {
      expect(getBuiltinPalette(name), `${name} does not resolve`).toBeDefined();
    }
  });
});
