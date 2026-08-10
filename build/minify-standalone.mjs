/**
 * Minify the no-bundler artifact, after Vite has built it.
 *
 * Vite leaves ES-format library output unminified apart from identifier
 * renaming: it preserves whitespace and comments so that `/* @__PURE__ *\/`
 * annotations survive for the consumer's bundler to tree-shake against. That is
 * the right call for `declarative-charts.js`, which always goes through a
 * bundler that will minify it — and the wrong one for the standalone build,
 * which a browser downloads verbatim from a CDN.
 *
 * The measured difference, with Lit inlined:
 *
 *   as Vite builds it   492 KB raw   118 KB gzipped
 *   after this pass     298 KB raw    77 KB gzipped
 *
 * Two thirds of what it removes is this project's own JSDoc — 88 KB of it —
 * plus about 106 KB of indentation.
 *
 * **Only the standalone is touched.**
 *
 * - `declarative-charts.js` is deliberately left alone. It is the bundler-facing
 *   build, and stripping its `@__PURE__` annotations would cost consumers more
 *   in dead code than the whitespace saves.
 * - `declarative-charts.umd.cjs` needs nothing. esbuild already minifies UMD
 *   output during the Vite build, and re-running a format-aware pass over a
 *   finished UMD wrapper risks breaking it for a 1% gain.
 *
 * `legalComments` is pinned to `inline` rather than left to esbuild's default,
 * because Lit is inlined into this file and its BSD-3-Clause headers must ship
 * with it. There are ten of them; a silent default change that dropped them
 * would be a licensing problem, not a size regression.
 */
import { transform } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(ROOT, 'dist', 'declarative-charts.standalone.js');

const kb = n => `${(n / 1024).toFixed(1)} kB`;

if (!fs.existsSync(TARGET)) {
  console.error(`minify-standalone: ${path.relative(ROOT, TARGET)} not found — run the Vite builds first.`);
  process.exit(1);
}

const before = fs.readFileSync(TARGET, 'utf8');
const licencesBefore = (before.match(/@license/g) ?? []).length;

const { code } = await transform(before, {
  minify: true,
  format: 'esm',
  legalComments: 'inline'
});

const licencesAfter = (code.match(/@license/g) ?? []).length;
if (licencesAfter < licencesBefore) {
  console.error(
    `minify-standalone: ${licencesBefore - licencesAfter} @license comment(s) were dropped. ` +
    `Lit is inlined here and its headers must ship with it.`
  );
  process.exit(1);
}

// A truncated or mangled bundle registers nothing and fails silently in the
// browser, which is the failure mode this whole artifact exists to avoid.
if (!code.includes('customElements.define') && !/customElements\.\w*define/.test(code)) {
  console.error('minify-standalone: no customElements.define survived — refusing to write.');
  process.exit(1);
}

fs.writeFileSync(TARGET, code);

console.log(
  `minify-standalone: ${kb(before.length)} → ${kb(code.length)} ` +
  `(${Math.round((1 - code.length / before.length) * 100)}% smaller, ${licencesAfter} licence headers kept)`
);
