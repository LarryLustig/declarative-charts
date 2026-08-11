import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error - plain .mjs with no types, deliberately shared with the build script
import { IMAGES, renderImages } from '../../build/render-readme-images.mjs';

/**
 * The README shows two rendered charts. They are committed files, so they can
 * go stale the moment rendering changes — the same failure mode as the coverage
 * table that used to live in CLAUDE.md and understated every file by 4–12×.
 *
 * This re-renders them and compares. It imports the generator rather than
 * reimplementing it, so there is one definition of what those images are.
 *
 * **Local only**, alongside the screenshot tests, for the same reason: text
 * positions come from `measureText`, which is font-dependent, so the serialised
 * SVG differs between platforms. It runs in `prepublishOnly`, which is the
 * moment it matters — a release must not ship a README showing a chart the
 * library no longer draws.
 *
 * If this fails after a deliberate rendering change: `npm run build:images`.
 */

// This suite runs as ESM, where __dirname does not exist.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const imgPath = (name: string) => resolve(ROOT, 'docs', 'img', name);

test.describe('README images', () => {
  test('are committed', () => {
    for (const { name } of IMAGES) {
      expect(existsSync(imgPath(name)), `docs/img/${name} missing — run \`npm run build:images\``).toBe(true);
    }
  });

  test('still match what the library renders', async () => {
    const rendered = await renderImages();

    for (const { name, svg } of rendered) {
      const committed = readFileSync(imgPath(name), 'utf8');
      expect(
        svg,
        `docs/img/${name} is stale — rendering changed since it was generated. ` +
          `Run \`npm run build:images\` and check the result looks right.`
      ).toBe(committed);
    }
  });

  test('are self-contained, since GitHub serves them through an image proxy', () => {
    for (const { name } of IMAGES) {
      const svg = readFileSync(imgPath(name), 'utf8');

      // An <img>-loaded SVG gets no external CSS, no script, and no network.
      expect(svg, `${name} has no font-family, so it will render in the viewer's default serif`)
        .toMatch(/font-family=/);
      expect(svg, `${name} references something external`).not.toMatch(/<image[^>]+href="http/);
      expect(svg, `${name} contains a script element`).not.toMatch(/<script/);
      expect(svg, `${name} still carries lit binding comments`).not.toMatch(/<!--\?lit/);
      expect(svg, `${name} contains NaN`).not.toMatch(/NaN/);
    }
  });

  test('are referenced by the README at a URL the site actually serves', () => {
    const readme = readFileSync(resolve(ROOT, 'README.md'), 'utf8');

    for (const { name } of IMAGES) {
      // Absolute, because relative paths do not resolve on npmjs.com.
      expect(readme, `README does not show docs/img/${name}`)
        .toContain(`https://larrylustig.github.io/declarative-charts/img/${name}`);
    }

    // The site build copies docs/img -> site/img. If that step is removed the
    // README's images 404 everywhere at once, and nothing else would notice.
    const siteConfig = readFileSync(resolve(ROOT, 'vite.config.site.ts'), 'utf8');
    expect(siteConfig, 'the site build no longer copies docs/img into site/img')
      .toMatch(/'docs',\s*'img'/);
  });
});
