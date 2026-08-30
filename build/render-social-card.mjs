/**
 * Render the social preview card — the thumbnail every shared link shows.
 *
 * Three consumers, all needing a raster image:
 *   - `og:image` on the landing page  → Reddit, Slack, Discord, Bluesky, LinkedIn
 *   - `twitter:card`                  → X
 *   - GitHub Settings → Social preview (manual upload) → the repo link itself
 *
 * PNG, not SVG: most link crawlers will not rasterise SVG for `og:image`.
 * That is why this cannot reuse `render-readme-images.mjs`'s export path —
 * that one serialises the chart through `prepareSvgForExport()`, which is the
 * right thing for a README image and the wrong format here. So this composes an
 * HTML card and screenshots it instead.
 *
 * What it keeps from that script is the discipline that matters: `MARKUP` below
 * is the single source for **both** panels. The code on the left is that string
 * syntax-highlighted; the chart on the right is that string rendered by the
 * library. They cannot drift apart, because there is only one of them.
 *
 * Rendered on Windows, like the visual baselines — the font stack is pinned to
 * what `examples.css` uses so the card matches the gallery.
 *
 * Run: npm run build:card   (needs `npm run build` first)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = path.join(ROOT, 'dist', 'declarative-charts.standalone.js');
const OUT = path.join(ROOT, 'docs', 'img');

/**
 * The card's whole argument in six lines: markup on the left, the chart it
 * produced on the right. Kept identical to the README's opening example so the
 * card, the README image and the landing hero are recognisably one thing.
 *
 * Line length is the binding constraint on type size — the longest line here
 * sets the code font size, so resist adding a fourth bar.
 *
 * No `palette` attribute on purpose: the colours below are what the library
 * gives you with no styling at all, which is the more honest advertisement and
 * one less line of markup to read.
 */
const MARKUP = `<dc-chart width="420" height="360" value-format="number 0">
  <dc-title>Revenue by Region</dc-title>
  <dc-bar value="4200" label="North"></dc-bar>
  <dc-bar value="3800" label="South"></dc-bar>
  <dc-bar value="5100" label="East"></dc-bar>
</dc-chart>`;

/** The two sizes the three consumers want. OG wants 1200×630; GitHub wants 1280×640. */
export const CARDS = [
  { name: 'social-card.png', width: 1200, height: 630 },
  { name: 'social-card-github.png', width: 1280, height: 640 },
];

/**
 * Syntax-highlight the markup. Deliberately tiny — it only ever sees the string
 * above, so it does not need to be a real HTML tokeniser, and a dependency for
 * six lines of colour would be a poor trade.
 */
function highlight(src) {
  const escaped = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /(&lt;\/?)([a-zA-Z][\w-]*)|([a-zA-Z][\w-]*)(=)("[^"]*")|(\/?&gt;)/g,
    (match, open, tagName, attr, eq, value, close) => {
      if (open) return `<span class="p">${open}</span><span class="t">${tagName}</span>`;
      if (attr) return `<span class="a">${attr}</span><span class="p">${eq}</span><span class="v">${value}</span>`;
      if (close) return `<span class="p">${close}</span>`;
      return match;
    }
  );
}

function cardHtml() {
  return `<!doctype html>
<meta charset="utf-8">
<style>
  /* Pinned rather than inherited: a bare Chromium page defaults to serif, which
     would be correct behaviour and the wrong picture. Matches examples.css. */
  :root {
    --ink:      #14161a;
    --ink-soft: #565b63;
    --rule:     #e2e2dd;
    --surface:  #ffffff;
    --page:     #f6f6f3;
    --tag:      #1d4ed8;
    --attr:     #7c3aed;
    --val:      #0f766e;
    --punct:    #a3a3a0;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 44px 50px 34px;
    background: var(--page);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: var(--ink);
    /* A hairline frame reads as a deliberate card rather than a screenshot
       of a page that happens to be cropped at 1200px. */
    border-bottom: 6px solid var(--tag);
  }

  header { display: flex; align-items: baseline; gap: 15px; margin-bottom: 24px; }
  .wordmark { font-size: 31px; font-weight: 700; letter-spacing: -0.02em; }
  .tagline  { font-size: 19px; color: var(--ink-soft); letter-spacing: -0.01em; }

  main { flex: 1; display: flex; align-items: center; gap: 22px; min-height: 0; }

  pre {
    flex: 1;
    margin: 0;
    padding: 26px 28px;
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: 12px;
    font-family: Consolas, 'Cascadia Mono', ui-monospace, monospace;
    font-size: 18px;
    line-height: 1.66;
    tab-size: 2;
  }
  .t { color: var(--tag);   font-weight: 600; }
  .a { color: var(--attr); }
  .v { color: var(--val); }
  .p { color: var(--punct); }

  /* The causal claim, made visible: this markup *produces* that chart. At a
     Reddit thumbnail nothing else on the card survives, but the arrow does. */
  .arrow { font-size: 28px; color: var(--punct); flex: none; align-self: center; }

  /* No border or background here: the chart draws its own rounded surface,
     and wrapping it in a second one reads as a box inside a box. */
  .chart { flex: none; align-self: center; }

  footer {
    margin-top: 22px;
    font-size: 16px;
    color: var(--ink-soft);
    display: flex;
    gap: 12px;
  }
  footer b { color: var(--ink); font-weight: 600; }
  .sep { color: var(--punct); }
</style>
<body>
  <header>
    <span class="wordmark">declarative-charts</span>
    <span class="tagline">Charts written as HTML, one element per datapoint.</span>
  </header>

  <main>
    <pre><code>${highlight(MARKUP)}</code></pre>
    <span class="arrow">&rarr;</span>
    <div class="chart">${MARKUP}</div>
  </main>

  <footer>
    <span><b>No build step.</b></span><span class="sep">&middot;</span>
    <span>Renders from your template loop</span><span class="sep">&middot;</span>
    <span>Bar, line, area, pie, funnel, radar &amp; more</span><span class="sep">&middot;</span>
    <span>MIT</span>
  </footer>
</body>`;
}

export async function renderCards() {
  if (!fs.existsSync(BUNDLE)) {
    throw new Error(`render-social-card: ${path.relative(ROOT, BUNDLE)} not found — run \`npm run build\` first.`);
  }

  const browser = await chromium.launch();
  const results = [];

  try {
    for (const { name, width, height } of CARDS) {
      // deviceScaleFactor 2 so the card stays crisp on retina; both consumers
      // downscale, neither upscales.
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
      await page.setContent(cardHtml());
      await page.addScriptTag({ path: BUNDLE, type: 'module' });

      // Wait for the chart to have actually drawn, not for a fixed delay.
      await page.waitForFunction(() => {
        const c = document.querySelector('dc-chart');
        return !!c?.shadowRoot?.querySelector('svg')?.querySelector('rect');
      }, { timeout: 15000 });

      // Same guard the README images carry: a card showing "NaN" would be
      // published to every social platform at once and cached there.
      const svg = await page.evaluate(
        () => document.querySelector('dc-chart').shadowRoot.querySelector('svg').outerHTML
      );
      if (/NaN|undefined/.test(svg)) {
        throw new Error(`render-social-card: ${name} contains NaN or undefined — refusing to write.`);
      }

      results.push({ name, buffer: await page.screenshot({ type: 'png' }) });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const { name, buffer } of await renderCards()) {
    fs.writeFileSync(path.join(OUT, name), buffer);
    console.log(`render-social-card: docs/img/${name} (${(buffer.length / 1024).toFixed(0)} kB)`);
  }
}
