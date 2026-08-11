/**
 * Render the charts shown in README.md, as standalone SVG.
 *
 * A chart library whose README shows markup but never the output asks the
 * reader to take the picture on faith, and the picture is the product. GitHub
 * strips inline `<svg>` from Markdown, so the only way to show one is an
 * `<img>` pointing at a committed file.
 *
 * These go through the library's **own** export path — `prepareSvgForExport()`,
 * the same call `downloadSvg()` makes — rather than a parallel serializer. If
 * that path breaks, these images break with it, which is the correct coupling:
 * `downloadSvg()` is a documented feature and this exercises it on every build.
 *
 * The markup below is copied from README.md deliberately, so a reader sees the
 * example and its output agree. `test/visual/readme-images.spec.ts` re-renders
 * and compares, so they cannot drift apart silently.
 *
 * Run: npm run build:images   (needs `npm run build` first)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = path.join(ROOT, 'dist', 'declarative-charts.standalone.js');
const OUT = path.join(ROOT, 'docs', 'img');

/**
 * Each entry is one README image. `markup` should match the snippet the README
 * shows beside it — that correspondence is the whole point.
 */
export const IMAGES = [
  {
    name: 'bar.svg',
    // The opening example in README.md, verbatim.
    markup: `
      <dc-chart width="600" height="400">
        <dc-title>Revenue by Region</dc-title>
        <dc-bar value="4200" label="North"></dc-bar>
        <dc-bar value="3800" label="South"></dc-bar>
        <dc-bar value="5100" label="East"></dc-bar>
      </dc-chart>`
  },
  {
    name: 'scatter.svg',
    // Chosen to show what a bar chart cannot: a value-against-value plot, a
    // threshold annotation, and a legend.
    markup: `
      <dc-chart width="600" height="400" value-format="number 0">
        <dc-title>Dose Response</dc-title>
        <dc-axis position="bottom" value-format="number 0"><dc-title>Dose (mg)</dc-title></dc-axis>
        <dc-axis position="left" value-format="number 0"><dc-title>Response</dc-title></dc-axis>
        <dc-reference min="40" max="60" fill="#16a34a" label="Target range"></dc-reference>
        <dc-scatter label="Control" fill="#2563eb">
          <dc-point x="5" value="12"></dc-point>
          <dc-point x="12" value="19"></dc-point>
          <dc-point x="18" value="31"></dc-point>
          <dc-point x="26" value="28"></dc-point>
          <dc-point x="34" value="46"></dc-point>
          <dc-point x="41" value="52"></dc-point>
        </dc-scatter>
        <dc-scatter label="Treated" fill="#dc2626" shape="triangle" size="5">
          <dc-point x="6" value="28"></dc-point>
          <dc-point x="15" value="37"></dc-point>
          <dc-point x="23" value="49"></dc-point>
          <dc-point x="31" value="55"></dc-point>
          <dc-point x="39" value="66"></dc-point>
        </dc-scatter>
        <dc-legend position="bottom"></dc-legend>
      </dc-chart>`
  }
];

/**
 * Serialize one chart to a standalone SVG string, in a real browser.
 *
 * Shadow-DOM styles do not survive a bare `serializeToString`, which is exactly
 * what `prepareSvgForExport()` exists to fix — so the export runs through it.
 */
export async function renderImages(bundlePath = BUNDLE) {
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`render-readme-images: ${path.relative(ROOT, bundlePath)} not found — run \`npm run build\` first.`);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];

  try {
    for (const { name, markup } of IMAGES) {
      // The font matters. `prepareSvgForExport()` inlines
      // `getComputedStyle(host).fontFamily`, so a bare page bakes Chromium's
      // default serif into the file — which is correct behaviour and the wrong
      // picture. This is the stack examples.css uses, so the README images
      // match the gallery.
      await page.setContent(
        `<!doctype html><meta charset="utf-8">` +
        `<body style="margin:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">` +
        `${markup}</body>`
      );
      await page.addScriptTag({ path: bundlePath, type: 'module' });

      // The chart renders from its children, so wait for it to have drawn
      // rather than for a fixed delay.
      await page.waitForFunction(() => {
        const c = document.querySelector('dc-chart');
        return !!c?.shadowRoot?.querySelector('svg')?.querySelector('rect, circle, path');
      }, { timeout: 15000 });

      const svg = await page.evaluate(() => {
        const chart = document.querySelector('dc-chart');
        const live = chart.shadowRoot.querySelector('svg');
        const clone = live.cloneNode(true);
        // The library's own export preparation — inlines what a standalone
        // file cannot inherit from the shadow root.
        chart.prepareSvgForExport(clone);
        return '<?xml version="1.0" encoding="UTF-8"?>\n' +
          new XMLSerializer().serializeToString(clone);
      });

      if (/NaN|undefined/.test(svg)) {
        throw new Error(`render-readme-images: ${name} contains NaN or undefined — refusing to write.`);
      }
      results.push({ name, svg });
    }
  } finally {
    await browser.close();
  }

  return results;
}

// Only write when run directly; the freshness test imports renderImages().
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const { name, svg } of await renderImages()) {
    fs.writeFileSync(path.join(OUT, name), svg);
    console.log(`render-readme-images: docs/img/${name} (${(svg.length / 1024).toFixed(1)} kB)`);
  }
}
