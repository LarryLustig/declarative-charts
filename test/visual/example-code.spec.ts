import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Checks that every `<pre><code>` block in `examples/` matches the chart
 * rendered beside it.
 *
 * This is the worst drift an example page can carry, because it is invisible:
 * the picture is right, the markup under it is wrong, and the reader who copies
 * it gets something else. An audit found 43 such cells — 20 in
 * `label-positioning.html` alone, where every snippet omitted the `palette` and
 * the `<dc-title>` the chart actually had, so copying any of them produced
 * different colours and no title.
 *
 * A snippet may still abbreviate, as long as it says so: an ellipsis, or a
 * comment such as `<!-- same bars -->`. Twenty-four bars do not need spelling
 * out. Abbreviating *silently* is what this rejects.
 */

const EXAMPLES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../examples');
const pages = readdirSync(EXAMPLES_DIR).filter(f => f.endsWith('.html'));

test.describe('example code blocks', () => {
  test('match the chart rendered beside them', async ({ page }) => {
    test.setTimeout(120_000);

    const problems: string[] = [];
    let compared = 0;

    for (const file of pages) {
      await page.goto(`/examples/${file}`, { waitUntil: 'networkidle' });

      const found = await page.evaluate(() => {
        const CHART_TAGS = ['DC-CHART', 'DC-PIE-CHART', 'DC-FUNNEL-CHART', 'DC-STAGE-CHART'];

        /**
         * Attributes that are page housekeeping or written back by Lit, not
         * part of the lesson. `animations` is declared `reflect: true`, so a
         * value inherited from `<dc-defaults>` appears in the DOM although it
         * was never in the authored markup.
         */
        const IGNORE = new Set([
          'class', 'style', 'data-chart-type', 'console-log', 'tabindex',
          'role', 'aria-label', 'aria-description', 'aria-roledescription',
          'animations'
        ]);

        const out: { checked: number; noCode: string[]; drift: { heading: string; why: string }[] } =
          { checked: 0, noCode: [], drift: [] };

        for (const cell of document.querySelectorAll('.grid > div')) {
          const liveCharts = [...cell.children].filter(c => CHART_TAGS.includes(c.tagName));
          if (!liveCharts.length) continue;   // prose cell, or a swatch cell

          const heading = cell.querySelector('h3')?.textContent?.trim() ?? '(no h3)';
          const code = cell.querySelector('pre code');
          if (!code) { out.noCode.push(heading); continue; }

          const text = code.textContent ?? '';
          const comments = text.split('<!--').slice(1).join(' ').toLowerCase();
          const elided =
            text.includes('...') ||
            ['same', 'more', 'etc', 'as above'].some(w => comments.includes(w));

          const doc = new DOMParser().parseFromString(text, 'text/html');
          const docCharts = [...doc.body.children].filter(c => CHART_TAGS.includes(c.tagName));
          if (!docCharts.length) continue;    // snippet shows a fragment, not a whole chart

          out.checked++;
          const live = liveCharts[0];
          const documented = docCharts[0];

          if (live.tagName !== documented.tagName) {
            out.drift.push({
              heading,
              why: `shows <${documented.tagName.toLowerCase()}>, renders <${live.tagName.toLowerCase()}>`
            });
            continue;
          }

          const attrsOf = (el: Element) =>
            Object.fromEntries(
              [...el.attributes].filter(a => !IGNORE.has(a.name)).map(a => [a.name, a.value])
            );

          const liveAttrs = attrsOf(live);
          const docAttrs = attrsOf(documented);
          const diffs: string[] = [];

          for (const k of new Set([...Object.keys(liveAttrs), ...Object.keys(docAttrs)])) {
            // An `id` the snippet omits is page plumbing for a JS demo, not
            // part of the lesson. An `id` it shows *differently* still counts,
            // because pages like logging.html reference it from the markup.
            if (k === 'id' && docAttrs[k] === undefined) continue;
            if (liveAttrs[k] !== docAttrs[k]) {
              diffs.push(`${k}: shows "${docAttrs[k] ?? '(absent)'}", renders "${liveAttrs[k] ?? '(absent)'}"`);
            }
          }

          const countKids = (el: Element) => {
            const m: Record<string, number> = {};
            for (const k of el.querySelectorAll('*')) {
              if (!k.tagName.startsWith('DC-')) continue;
              const t = k.tagName.toLowerCase();
              m[t] = (m[t] ?? 0) + 1;
            }
            return m;
          };
          const lk = countKids(live);
          const dk = countKids(documented);
          for (const k of new Set([...Object.keys(lk), ...Object.keys(dk)])) {
            if ((lk[k] ?? 0) !== (dk[k] ?? 0)) {
              diffs.push(`${k}: shows ${dk[k] ?? 0}, renders ${lk[k] ?? 0}`);
            }
          }

          if (diffs.length && !elided) out.drift.push({ heading, why: diffs.join('; ') });
        }
        return out;
      });

      compared += found.checked;
      found.noCode.forEach(h => problems.push(`${file}  "${h}"  chart shown with no code block`));
      found.drift.forEach(d => problems.push(`${file}  "${d.heading}"  ${d.why}`));
    }

    // Guard against the check silently doing nothing.
    expect(compared, 'no code blocks were compared').toBeGreaterThan(200);
    expect(problems, `example code blocks out of step:\n${problems.join('\n')}`).toEqual([]);
  });
});
