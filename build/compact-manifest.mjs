/**
 * Strip the pretty-printing from the custom elements manifest.
 *
 * `custom-elements.json` is what editors read to autocomplete `<dc-bar value="…">`,
 * so it earns its place in the package. What it does not need is indentation:
 * the analyzer writes it pretty-printed, and 41% of the file is whitespace no
 * machine reads.
 *
 *   as the analyzer writes it   2,015 kB
 *   after this pass             1,193 kB
 *
 * Nothing is dropped — same JSON, same keys, same descriptions. The remaining
 * bulk is genuine: 44% of it is description text harvested from this project's
 * JSDoc, which is the manifest doing its job.
 *
 * The file is generated on every build and is **gitignored**, so a one-line JSON
 * blob costs nothing in diff quality. Were it committed, this pass would be the
 * wrong trade.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(ROOT, 'custom-elements.json');

const kb = n => `${(n / 1024).toFixed(0)} kB`;

if (!fs.existsSync(TARGET)) {
  console.error('compact-manifest: custom-elements.json not found — run `cem analyze` first.');
  process.exit(1);
}

const before = fs.readFileSync(TARGET, 'utf8');
const manifest = JSON.parse(before);

// An empty manifest means the analyzer matched nothing, which would ship a
// package whose editor support silently does nothing.
if (!Array.isArray(manifest.modules) || manifest.modules.length === 0) {
  console.error('compact-manifest: manifest has no modules — refusing to write.');
  process.exit(1);
}

const after = JSON.stringify(manifest);
fs.writeFileSync(TARGET, after);

console.log(
  `compact-manifest: ${kb(before.length)} → ${kb(after.length)} ` +
  `(${Math.round((1 - after.length / before.length) * 100)}% smaller, ${manifest.modules.length} modules)`
);
