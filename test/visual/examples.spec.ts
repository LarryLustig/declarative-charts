import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Smoke test for every page in `examples/`.
 *
 * The example pages are the library's shop window and nothing else exercised
 * them, so they drifted: 128 uses of a removed `color` attribute, grids written
 * as `line-style` (an attribute that never existed, so every "dashed" grid
 * rendered solid), and — the one that matters — a donut written as
 * `inner-radius="50%"` that rendered `M 250 44 A 144.25 … L NaN NaN A NaN NaN`.
 * That last one was a genuine library bug: `Number("50%")` is NaN, and NaN is
 * false for both `< 0` and `>= 100`, so it slipped past the validation that
 * exists precisely to catch a bad radius.
 *
 * This asserts the things that are always true of a working page, and nothing
 * about layout — visual regressions are `charts.spec.ts`'s job.
 */

// This suite runs as ESM, where __dirname does not exist.
const EXAMPLES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../examples');
const pages = readdirSync(EXAMPLES_DIR).filter(f => f.endsWith('.html'));

/**
 * Pages whose charts are deliberately empty or deliberately misconfigured.
 * `logging.html` demonstrates the DC diagnostics, so its warnings are the
 * point; `loaded-content.html` starts with nothing and fetches on demand.
 */
const DEMONSTRATES_DIAGNOSTICS = new Set(['logging.html']);
const STARTS_EMPTY = new Set(['loaded-content.html', 'htmx-integration.html']);

test.describe('example pages', () => {
  test('render without NaN, page errors, or unexpected warnings', async ({ page }) => {
    // One test over all pages rather than 33: a single failure message listing
    // every broken page is more useful than 33 separate reports, and it keeps
    // the visual suite fast.
    test.setTimeout(120_000);

    const failures: string[] = [];

    for (const file of pages) {
      const problems: string[] = [];
      const consoleIssues: string[] = [];

      const onConsole = (m: { type: () => string; text: () => string }) => {
        if (m.type() !== 'warning' && m.type() !== 'error') return;
        const text = m.text();
        if (text.includes('Lit is in dev mode')) return;
        if (DEMONSTRATES_DIAGNOSTICS.has(file) && /\[DC\d+\]/.test(text)) return;
        consoleIssues.push(text);
      };
      const onPageError = (e: Error) => consoleIssues.push(`pageerror: ${e.message}`);

      page.on('console', onConsole);
      page.on('pageerror', onPageError);

      await page.goto(`/examples/${file}`, { waitUntil: 'networkidle' });

      // Settle on conditions, never on a sleep - see charts.spec.ts.
      await page.evaluate(async () => {
        const charts = Array.from(
          document.querySelectorAll('dc-chart, dc-pie-chart, dc-funnel-chart, dc-stage-chart')
        ) as Array<{ updateComplete?: Promise<boolean> }>;
        for (let i = 0; i < 20; i++) {
          const settled = await Promise.all(charts.map(c => c.updateComplete ?? true));
          if (settled.every(Boolean)) break;
        }
        await document.fonts.ready;
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      });

      const result = await page.evaluate(() => {
        const charts = Array.from(
          document.querySelectorAll('dc-chart, dc-pie-chart, dc-funnel-chart, dc-stage-chart')
        );
        return {
          total: charts.length,
          nan: charts
            .filter(c => (c.shadowRoot?.innerHTML ?? '').includes('NaN'))
            .map(c => c.tagName.toLowerCase() + (c.id ? `#${c.id}` : '')),
          empty: charts.filter(
            c => (c.shadowRoot?.querySelectorAll('[data-shape-index]').length ?? 0) === 0
          ).length
        };
      });

      page.off('console', onConsole);
      page.off('pageerror', onPageError);

      if (result.nan.length) problems.push(`NaN geometry in ${result.nan.join(', ')}`);
      if (result.empty && !STARTS_EMPTY.has(file)) {
        problems.push(`${result.empty}/${result.total} charts rendered no shapes`);
      }
      if (consoleIssues.length) {
        problems.push(`console: ${[...new Set(consoleIssues)].slice(0, 3).join(' | ')}`);
      }
      if (problems.length) failures.push(`${file}: ${problems.join('; ')}`);
    }

    expect(pages.length, 'no example pages were found to check').toBeGreaterThan(20);
    expect(failures, `broken example pages:\n${failures.join('\n')}`).toEqual([]);
  });
});
