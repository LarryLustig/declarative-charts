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
const STARTS_EMPTY = new Set([
  'loaded-content.html',
  'htmx-integration.html',
  // Its whole subject is what a chart shows when it has nothing to show.
  'empty-loading.html',
  // Renders on demand: a ten-thousand-bar chart is not something to do on load.
  'large-datasets.html'
]);

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
          document.querySelectorAll('dc-chart, dc-pie-chart, dc-funnel-chart, dc-stage-chart, dc-radar-chart')
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
          document.querySelectorAll('dc-chart, dc-pie-chart, dc-funnel-chart, dc-stage-chart, dc-radar-chart')
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

  /**
   * The transparent-marker recipe documented in API.md under "Marker shapes"
   * and demonstrated on `linecharts.html`.
   *
   * `shape="none"` removes the hit target along with the marker, so the
   * documented way to keep per-point popups without a visible marker is a
   * circle with a transparent fill. That rests on an SVG detail worth guarding:
   * the default `pointer-events: visiblePainted` counts painted area only, so
   * `fill="none"` - which looks identical on screen - lets the hover fall
   * through to the line and silently yields the line's popup instead of the
   * point's.
   *
   * Only a real browser can check it. happy-dom does no hit-testing, and
   * dispatching the event directly on the element is exactly the step that
   * would pass whether or not the browser would ever deliver it there.
   */
  test('an invisible marker keeps its own popup, and fill=none would not', async ({ page }) => {
    await page.goto('/examples/linecharts.html', { waitUntil: 'networkidle' });

    // The page must teach the spelling that works. The hover checks below set
    // the fill themselves, so without this they would pass against a demo that
    // had drifted to the broken one.
    const authored = await page.evaluate(() =>
      [...document.querySelectorAll('#invisible-markers dc-point')]
        .map(p => p.getAttribute('fill')));
    expect(new Set(authored), 'the demo should author fill="transparent"')
      .toEqual(new Set(['transparent']));

    /** Hover the middle marker of the demo chart and return the popup text. */
    const popupAfterHover = async (fill: string) => {
      await page.evaluate((f: string) => {
        const chart = document.querySelector('#invisible-markers')!;
        chart.querySelectorAll('dc-point').forEach(p => p.setAttribute('fill', f));
      }, fill);
      // The chart re-renders from its own MutationObserver; wait for that
      // rather than a fixed sleep.
      await page.waitForFunction(() => {
        const c = document.querySelector('#invisible-markers') as HTMLElement & { updateComplete?: Promise<boolean> };
        return !!c.shadowRoot?.querySelector('g.point-marker > *');
      });

      // The demo sits far down the page, so its markers are below the viewport
      // and a mouse move to their document coordinates would land nowhere.
      await page.locator('#invisible-markers').scrollIntoViewIfNeeded();

      const at = await page.evaluate(() => {
        const c = document.querySelector('#invisible-markers') as HTMLElement;
        const marks = c.shadowRoot!.querySelectorAll('g.point-marker > *');
        // Not the first: the first point sits on the value axis, whose line
        // covers its centre and would make this measure the wrong thing.
        const r = marks[4].getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });

      await page.mouse.move(5, 5);
      await page.mouse.move(at.x, at.y);
      await page.waitForFunction(() => {
        const c = document.querySelector('#invisible-markers') as HTMLElement;
        return !!c.shadowRoot!.querySelector('.popup.visible');
      });
      return page.evaluate(() => {
        const c = document.querySelector('#invisible-markers') as HTMLElement;
        return (c.shadowRoot!.querySelector('.popup.visible')!.textContent ?? '')
          .replace(/\s+/g, ' ').trim();
      });
    };

    const transparent = await popupAfterHover('transparent');
    expect(transparent, 'a transparent marker did not surface its own point').toContain('May');

    const none = await popupAfterHover('none');
    expect(none, 'fill="none" became hit-testable, so the warning in API.md is stale')
      .not.toContain('May');
    expect(none, 'expected the line popup to take over').toContain('Revenue');
  });

  /**
   * The no-JavaScript fallback documented in API.md ("When JavaScript Does Not
   * Run") and demonstrated on `empty-loading.html`.
   *
   * This is the only thing in the repo that exercises the library with
   * scripting off, and it needs a real browser twice over: happy-dom evaluates
   * `:defined` as false even for a registered element, so the component tests
   * cannot check the hiding rule, and nothing else can check that the table is
   * what a reader gets when the module never runs.
   *
   * Both halves matter. A fallback that stays visible is a table printed under
   * every chart; a fallback that hides without JavaScript is worse than none,
   * because the page then shows nothing at all and looks intentional.
   */
  test('the no-JavaScript fallback hides on upgrade and survives without it', async ({
    page,
    browser
  }) => {
    await page.goto('/examples/empty-loading.html', { waitUntil: 'networkidle' });

    const upgraded = await page.evaluate(() => {
      const table = document.querySelector('dc-chart table.dc-fallback') as HTMLElement | null;
      // The chart that owns the fallback, not the first on the page - the
      // demos above it are deliberately empty.
      const chart = table?.closest('dc-chart') as HTMLElement | null;
      return {
        present: !!table,
        display: table ? getComputedStyle(table).display : null,
        stillReadable: (table?.textContent ?? '').includes('95'),
        chartDrew: !!chart?.shadowRoot?.querySelector('[data-shape-index]')
      };
    });

    expect(upgraded.present, 'the fallback table is no longer on the page').toBe(true);
    expect(upgraded.stillReadable, 'the fallback lost its data').toBe(true);
    expect(upgraded.display, 'the fallback is painting under the chart').toBe('none');
    expect(upgraded.chartDrew, 'the chart drew nothing beside its fallback').toBe(true);

    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const bare = await context.newPage();
      await bare.goto('/examples/empty-loading.html', { waitUntil: 'domcontentloaded' });
      const table = bare.locator('dc-chart table.dc-fallback');
      await expect(table, 'nothing is shown when the module never runs').toBeVisible();
      const text = (await table.innerText()).replace(/\s+/g, ' ').trim();
      expect(text).toContain('Q1 95');
      expect(text).toContain('Q4 105');
    } finally {
      await context.close();
    }
  });
});
