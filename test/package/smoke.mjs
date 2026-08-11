/**
 * Package smoke test — validates the published artifacts, not the source.
 *
 * Two defects motivated this, both invisible to every other test in the repo
 * because they only appear once a real bundler consumes the built package:
 *
 *   1. `"sideEffects": false` let bundlers delete `import 'declarative-charts'`
 *      wholesale. Defining custom elements IS the side effect, so the documented
 *      install path registered nothing and rendered a blank page, with no error.
 *
 *   2. Lit was inlined into the bundler-facing build *and* declared a runtime
 *      dependency, so any consumer already using Lit got two copies of
 *      ReactiveElement in one page.
 *
 * Run after `npm run build`:  npm run test:package
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = path.join(ROOT, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

let failures = 0;
const pass = msg => console.log(`  ok    ${msg}`);
const fail = (msg, detail) => {
  failures++;
  console.error(`  FAIL  ${msg}`);
  if (detail) console.error(`        ${detail}`);
};
const check = (cond, msg, detail) => (cond ? pass(msg) : fail(msg, detail));

const read = f => fs.readFileSync(path.join(DIST, f), 'utf8');
const kb = f => Math.round(fs.statSync(path.join(DIST, f)).size / 1024);

// A bare specifier survives only if the module was left external.
const importsLit = src => /(?:from|import)\s*["']lit(?:\/[^"']*)?["']/.test(src);
const requiresLit = src => /require\(\s*["']lit(?:\/[^"']*)?["']\s*\)/.test(src);
// Rollup renames on inlining, so match the class declaration rather than the word.
const inlinesLit = src => /class\s+\w*ReactiveElement\b/.test(src) || /reactiveElementVersions/.test(src);

console.log('\nPackage smoke test\n');

// ---------------------------------------------------------------- artifacts
console.log('artifacts');
const required = [
  'declarative-charts.js',
  'declarative-charts.standalone.js',
  'declarative-charts.umd.cjs',
  'index.d.ts',
];
for (const f of required) {
  check(fs.existsSync(path.join(DIST, f)), `${f} exists`, 'run `npm run build` first');
}
if (failures) {
  console.error('\nBuild output missing — aborting.\n');
  process.exit(1);
}

// ------------------------------------------------------------ manifest wiring
console.log('\nmanifest');
check(
  Array.isArray(pkg.sideEffects) && pkg.sideEffects.length > 0,
  'sideEffects is a list, not `false`',
  `got ${JSON.stringify(pkg.sideEffects)} — bundlers will drop the element registrations`
);
check(!pkg.dependencies?.lit, 'lit is not a runtime dependency');
check(!!pkg.peerDependencies?.lit, 'lit is a peer dependency');
check(!!pkg.devDependencies?.lit, 'lit is a dev dependency (needed to build and test)');
check(
  pkg.unpkg?.includes('standalone') && pkg.jsdelivr?.includes('standalone'),
  'CDN fields point at the self-contained build',
  'a `<script type="module">` cannot resolve a bare `import "lit"` specifier'
);
check(!/YOUR_USERNAME|your\.email@example\.com|Your Name/.test(JSON.stringify(pkg)),
  'no placeholder metadata');

// The LICENSE shipped for a long time reading "Copyright (c) 2024 Larry Ruane"
// — a real person, and not this project's author. A placeholder check cannot
// catch that, because a plausible name looks like real metadata. Tie the two
// together instead: whoever package.json says wrote this must be who the
// licence grant comes from.
{
  const licence = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8');
  const holder = licence.match(/Copyright \(c\) \d{4}(?:\s*[-–]\s*\d{4})? (.+)/)?.[1]?.trim();
  const author = (pkg.author ?? '').replace(/\s*<.*/, '').trim();

  check(Boolean(holder), 'LICENSE states a copyright holder');
  check(
    holder === author,
    'LICENSE copyright holder matches package.json author',
    `LICENSE says "${holder}", package.json says "${author}"`
  );
}

// An HTML-first library lives or dies by editor autocomplete on its tags.
const manifestPath = path.join(ROOT, 'custom-elements.json');
check(pkg.customElements === 'custom-elements.json',
  'package.json points at the custom-elements manifest');
check(fs.existsSync(manifestPath), 'custom-elements.json exists', 'run `npm run analyze`');
if (fs.existsSync(manifestPath)) {
  const manifestSrc = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestSrc);

  // The analyzer pretty-prints, and 41% of the file was indentation no machine
  // reads: 2,015 kB against 1,193 kB compacted. build/compact-manifest.mjs
  // strips it, which is only the right trade because the file is gitignored —
  // a committed one-line 1.2 MB blob would poison every future diff.
  const manifestLines = manifestSrc.split('\n').length;
  check(
    manifestLines <= 2,
    'custom-elements.json is compacted',
    `${manifestLines} lines — is build/compact-manifest.mjs still in the analyze script?`
  );
  const tags = (manifest.modules || [])
    .flatMap(m => m.declarations || [])
    .filter(d => d.tagName)
    .map(d => d.tagName);
  check(tags.length >= 25,
    `manifest documents every element (${tags.length} found)`,
    'an element is missing from the manifest');
  check(tags.includes('dc-chart') && tags.includes('dc-pie-chart'),
    'manifest includes the chart elements');
}

// --------------------------------------------------------------- lit handling
console.log('\nlit externalization');
const esm = read('declarative-charts.js');
const standalone = read('declarative-charts.standalone.js');
const umd = read('declarative-charts.umd.cjs');

check(importsLit(esm) && !inlinesLit(esm),
  `bundler build imports lit rather than inlining it (${kb('declarative-charts.js')}kb)`,
  'inlining lit here gives consumers two ReactiveElement copies');
check(!importsLit(standalone) && inlinesLit(standalone),
  `standalone build is self-contained (${kb('declarative-charts.standalone.js')}kb)`,
  'a CDN consumer has no bundler to resolve bare specifiers');
check(!requiresLit(umd) && inlinesLit(umd),
  `umd build is self-contained (${kb('declarative-charts.umd.cjs')}kb)`);

// ------------------------------------------------ the real test: bundle it
console.log('\nbundled consumption');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-smoke-'));
try {
  // Resolve through node_modules so the bundler reads the package's own
  // package.json — importing dist/ by relative path would skip `sideEffects`
  // entirely and quietly make this test meaningless.
  const nm = path.join(tmp, 'node_modules');
  fs.mkdirSync(nm, { recursive: true });
  fs.symlinkSync(ROOT, path.join(nm, pkg.name), 'junction');

  const entry = path.join(tmp, 'entry.js');
  fs.writeFileSync(entry, `import '${pkg.name}';\n`);

  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'esm',
    treeShaking: true,
    platform: 'browser',
    logLevel: 'silent',
    absWorkingDir: tmp,
  });
  const out = result.outputFiles[0].text;

  check(out.length > 1000,
    'bare `import` produces a non-empty bundle',
    `got ${out.length} bytes — the package was tree-shaken away`);
  check(out.includes('customElements.define'),
    'element registrations survive tree shaking');

  const elements = ['dc-chart', 'dc-bar', 'dc-pie-chart', 'dc-fill', 'dc-legend-item', 'dc-defaults'];
  const missing = elements.filter(tag => !out.includes(`"${tag}"`) && !out.includes(`'${tag}'`));
  check(missing.length === 0,
    `all sampled elements registered (${elements.length} checked)`,
    missing.length ? `missing: ${missing.join(', ')} — side-effect-only imports were dropped` : '');

  // Named imports must not drag in a second copy of lit.
  const namedEntry = path.join(tmp, 'named.js');
  fs.writeFileSync(namedEntry, `import { Chart } from '${pkg.name}';\nconsole.log(Chart);\n`);
  const named = await build({
    entryPoints: [namedEntry],
    bundle: true, write: false, format: 'esm', treeShaking: true,
    platform: 'browser', logLevel: 'silent', absWorkingDir: tmp,
  });
  const namedOut = named.outputFiles[0].text;
  const litCopies = (namedOut.match(/reactiveElementVersions/g) || []).length;
  check(litCopies <= 1,
    'named import pulls in at most one copy of lit',
    `found ${litCopies} ReactiveElement registrations`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ------------------------------------------------------------- packed tarball
// ------------------------------------------------------------ CDN artifact
// Vite leaves ES-format library output unminified apart from identifier
// renaming, so that `@__PURE__` annotations survive for the consumer's bundler.
// Right for declarative-charts.js; wrong for the file a browser downloads
// whole, which was 492 kB / 118 kB gzipped against 298 kB / 77 kB minified.
// build/minify-standalone.mjs fixes that. These catch its removal, a Vite
// change that reinstates the old behaviour, or a build run without the step.
console.log('\nCDN artifact');
{
  const standalone = read('declarative-charts.standalone.js');

  // Line count is not the measure: the SVG template literals hold real newlines,
  // which are string data and survive minification. Both builds land near 1,700
  // lines. Density is what separates them — 35 bytes per line unminified
  // against 170 after.
  const density = standalone.length / standalone.split('\n').length;
  check(
    density > 100,
    'standalone is whitespace-minified',
    `${density.toFixed(0)} bytes per line — is build/minify-standalone.mjs still in the build script?`
  );

  // Every /** block that is not a licence, which the next check requires be kept.
  const jsdoc = (standalone.match(/\/\*\*[\s\S]*?\*\//g) ?? [])
    .filter(c => !c.includes('@license'));
  check(
    jsdoc.length === 0,
    'standalone carries no source JSDoc',
    `${jsdoc.length} block(s) survived; they were 88 kB of this file`
  );
  // Lit is inlined here, so its BSD-3-Clause headers must survive minification.
  check(
    /@license/.test(standalone),
    'standalone keeps its licence headers',
    'minification must run with legalComments preserved'
  );
  check(
    kb('declarative-charts.standalone.js') < 400,
    `standalone is ${kb('declarative-charts.standalone.js')} kB`
  );
}

console.log('\npublished contents');
try {
  const listing = JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8', shell: true })
  );
  const files = listing[0].files.map(f => f.path);
  for (const f of required) {
    check(files.some(p => p.endsWith(f)), `${f} is included in the tarball`);
  }
  check(!files.some(p => p.startsWith('src/')), 'source is not published');
  // Declaration maps point an editor at .ts source that is not in the tarball,
  // so they were 187 kB leading nowhere. tsconfig.build.json stops emitting them.
  check(
    !files.some(p => p.endsWith('.d.ts.map')),
    'no declaration maps in the tarball',
    files.filter(p => p.endsWith('.d.ts.map')).slice(0, 3).join(', ')
  );
} catch (e) {
  fail('npm pack --dry-run', e.message.split('\n')[0]);
}

console.log(
  failures === 0
    ? '\nAll package checks passed.\n'
    : `\n${failures} package check(s) failed.\n`
);
process.exit(failures === 0 ? 0 : 1);
