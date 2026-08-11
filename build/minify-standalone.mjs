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
 * **Both no-bundler artifacts are touched; the bundler one is not.**
 *
 * `declarative-charts.js` is deliberately left alone. It is the bundler-facing
 * build, and stripping its `@__PURE__` annotations would cost consumers more in
 * dead code than the whitespace saves.
 *
 * The UMD is included because `vite.config.standalone.ts` now sets
 * `minify: false` — Vite 8 began minifying ES library output itself and stripped
 * Lit's licence headers doing it, so its pass is off and this is the only one
 * left. Minifying the UMD is a plain transform with no `format` given, so
 * esbuild rewrites the contents and leaves the wrapper's shape alone.
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

const kb = n => `${(n / 1024).toFixed(1)} kB`;

/** `format` is only given for the ESM build; the UMD keeps its own wrapper. */
const TARGETS = [
  { file: 'declarative-charts.standalone.js', format: 'esm' },
  { file: 'declarative-charts.umd.cjs', format: undefined }
];

for (const { file, format } of TARGETS) {
  await minify(path.join(ROOT, 'dist', file), file, format);
}

async function minify(target, label, format) {
if (!fs.existsSync(target)) {
  console.error(`minify-standalone: dist/${label} not found — run the Vite builds first.`);
  process.exit(1);
}

const before = fs.readFileSync(target, 'utf8');
const licencesBefore = (before.match(/@license/g) ?? []).length;

const { code } = await transform(before, {
  minify: true,
  ...(format ? { format } : {}),
  legalComments: 'inline'
});

const licencesAfter = (code.match(/@license/g) ?? []).length;

// Absolute, not relative. This compared before against after and passed
// vacuously when the vite 8 upgrade arrived having already stripped all ten:
// nothing was "dropped" between 0 and 0. A guard whose input can be broken
// before it runs has to assert the property it wants, not the delta.
if (licencesAfter === 0) {
  console.error(
    `minify-standalone: no @license comment survived in ${label}. Lit is inlined ` +
    'here and its BSD-3-Clause headers must ship with it.'
  );
  process.exit(1);
}
if (licencesAfter < licencesBefore) {
  console.error(
    `minify-standalone: ${licencesBefore - licencesAfter} @license comment(s) were dropped ` +
    `from ${label}. Lit is inlined here and its headers must ship with it.`
  );
  process.exit(1);
}

// A truncated or mangled bundle registers nothing and fails silently in the
// browser, which is the failure mode this whole artifact exists to avoid.
if (!code.includes('customElements.define') && !/customElements\.\w*define/.test(code)) {
  console.error(`minify-standalone: no customElements.define survived in ${label} — refusing to write.`);
  process.exit(1);
}

fs.writeFileSync(target, code);

console.log(
  `minify-standalone: ${label} ${kb(before.length)} → ${kb(code.length)} ` +
  `(${Math.round((1 - code.length / before.length) * 100)}% smaller, ${licencesAfter} licence headers kept)`
);
}
