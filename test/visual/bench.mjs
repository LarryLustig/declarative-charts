/**
 * Render-performance harness for decl-charts.
 *
 * Measures how render cost scales with datapoint count, and checks for layout
 * degeneracies (e.g. bar width crossing zero) that produce a chart which draws
 * nothing while reporting no error.
 *
 * Usage:
 *   npm run dev                     # in another terminal (harness needs the dev server)
 *   npm run bench                   # scaling curve for bar + line
 *   npm run bench -- --type=bar     # one chart type only
 *   npm run bench -- --sizes=50,100,250
 *   npm run bench -- --probe        # bar-width degeneracy probe only
 *   npm run bench -- --url=http://localhost:4173/...   # e.g. against a preview build
 *
 * Notes:
 *   - A fresh browser context is used per size. Sharing one page lets a slow run
 *     bleed into the next measurement.
 *   - Absolute numbers from the dev server are pessimistic (unminified, per-module
 *     transforms). Run against `npm run preview` for production-representative figures.
 *     Scaling *shape* is not build-dependent.
 */
import { chromium } from '@playwright/test';

const arg = (name, fallback) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};
const has = name => process.argv.includes(`--${name}`);

const URL = arg('url', 'http://localhost:5173/test/visual/fixtures/bench.html');
const SIZES = arg('sizes', '50,100,250,500,1000').split(',').map(Number);
const TYPES = arg('type', 'bar,line').split(',');
const TIMEOUT = Number(arg('timeout', 90_000));

async function freshPage() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => console.error('  PAGE ERROR:', e.message));
  try {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => window.benchReady === true, null, { timeout: 60_000 });
    await page.waitForFunction(() => customElements.get('dc-chart') !== undefined, null, { timeout: 60_000 });
  } catch (e) {
    await browser.close();
    throw new Error(`could not load ${URL} — is the dev server running? (${e.message})`);
  }
  return { browser, page };
}

const withTimeout = (p, ms) => Promise.race([
  p, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms)),
]);

async function scalingCurve() {
  const cols = ['type', 'n', 'shadowSvgEls', 'parseMs', 'updateMs', 'paintMs', 'totalMs', 'rerenderMs', 'hoverMs'];
  for (const type of TYPES) {
    console.log(`\n=== ${type.toUpperCase()} ===`);
    console.log(cols.join('\t'));
    let prev = null;
    for (const n of SIZES) {
      const { browser, page } = await freshPage();
      try {
        const r = await withTimeout(page.evaluate(([t, k]) => window.runBench(t, k), [type, n]), TIMEOUT);
        const growth = prev ? ` (${(r.totalMs / prev.totalMs).toFixed(1)}x for ${(n / prev.n).toFixed(1)}x data)` : '';
        console.log(cols.map(c => r[c]).join('\t') + growth);
        prev = r;
      } catch (e) {
        console.log(`${type}\t${n}\t-- ${e.message} --`);
        await browser.close();
        break;
      }
      await browser.close();
    }
  }
}

/**
 * Bar width shrinks as bar count rises. Past a threshold it goes negative, the SVG
 * parser discards every rect, and the chart renders nothing with no warning.
 * This asserts that never happens.
 */
async function barWidthProbe() {
  console.log('\n=== BAR WIDTH DEGENERACY PROBE (900-unit chart) ===');
  const { browser, page } = await freshPage();
  const res = await page.evaluate(async () => {
    const out = [];
    const host = document.getElementById('host');
    for (const n of [10, 25, 50, 70, 80, 85, 100, 150, 200]) {
      host.innerHTML = '';
      const c = document.createElement('dc-chart');
      c.setAttribute('width', '900');
      c.setAttribute('height', '400');
      c.setAttribute('show-value', 'false');
      c.innerHTML = Array.from({ length: n },
        (_, i) => `<dc-bar value="${50 + (i % 7) * 5}" label="P${i}"></dc-bar>`).join('');
      host.appendChild(c);
      await c.updateComplete;
      const rects = [...c.shadowRoot.querySelectorAll('rect[data-shape-index]')];
      const widths = rects.map(r => parseFloat(r.getAttribute('width')));
      out.push({
        n,
        attrWidth: +widths[0].toFixed(3),
        negative: widths.filter(w => w < 0).length,
        painted: rects.filter(r => r.getBoundingClientRect().width > 0).length,
      });
    }
    return out;
  });
  await browser.close();

  console.log('n\tattrWidth\tnegative\tpainted');
  let failed = 0;
  for (const r of res) {
    const bad = r.negative > 0 || r.painted < r.n;
    if (bad) failed++;
    console.log(`${r.n}\t${r.attrWidth}\t${r.negative}\t${r.painted}${bad ? '\t<-- FAIL' : ''}`);
  }
  if (failed) {
    console.error(`\n${failed} size(s) produced bars that do not render. See REVIEW.md §3.5.`);
    process.exitCode = 1;
  }
}

if (has('probe')) {
  await barWidthProbe();
} else {
  await scalingCurve();
  await barWidthProbe();
}
