import { describe, it, expect, vi, afterEach } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import { Chart } from '../../src/chart';

/**
 * Diagnostics used to default to silent: `logging="false"` and
 * `console-log="none"`. The whole DC### system therefore produced no output
 * unless a developer already suspected a problem and knew to opt in.
 *
 * That made misconfiguration invisible. A typo in `palette` fell back to
 * generated colours and looked merely "a bit off"; the documented palette list
 * drifted to name 18 palettes that did not exist, and the shipped examples
 * referenced them, because nothing could tell anyone. See REVIEW.md 6.3.
 */
describe('diagnostics are visible by default', () => {
  const warnings = (chart: Chart) =>
    (chart as unknown as { logEntries: Array<{ level: string; code?: string; message: string }> })
      .logEntries.filter(e => e.level === 'warning' || e.level === 'error');

  const chartWith = (attrs: Record<string, string>) =>
    fixture<Chart>('dc-chart', { width: '600', height: '400', ...attrs },
      '<dc-bar value="10" label="A"></dc-bar><dc-bar value="20" label="B"></dc-bar>');

  afterEach(() => vi.restoreAllMocks());

  it('defaults to capturing warnings', async () => {
    const chart = await chartWith({});
    expect(chart.logging).toBe('warning');
  });

  it('defaults to echoing warnings to the console', async () => {
    const chart = await chartWith({});
    expect(chart.consoleLog).toBe('warning');
  });

  it('raises DC201 for an unknown palette name', async () => {
    const chart = await chartWith({ palette: 'tableau10' });
    const codes = warnings(chart).map(w => w.code);
    expect(codes).toContain('DC201');
  });

  it('names the offending palette in the message', async () => {
    const chart = await chartWith({ palette: 'tableau10' });
    const dc201 = warnings(chart).find(w => w.code === 'DC201');
    expect(dc201!.message).toContain('tableau10');
  });

  it('stays quiet for a correct palette', async () => {
    const chart = await chartWith({ palette: 'category10' });
    expect(warnings(chart)).toHaveLength(0);
  });

  it('stays quiet for an ordinary chart', async () => {
    const chart = await chartWith({});
    expect(warnings(chart)).toHaveLength(0);
  });

  it('reaches console.warn, not just the internal log', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await chartWith({ palette: 'tableau10' });

    const said = warn.mock.calls.flat().join(' ');
    expect(said).toContain('DC201');
  });

  it('echoes an identical message only once, however many renders', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const chart = await chartWith({ palette: 'tableau10' });

    chart.requestUpdate();
    await elementUpdated(chart);
    chart.requestUpdate();
    await elementUpdated(chart);

    const dc201Calls = warn.mock.calls
      .filter(args => args.join(' ').includes('DC201'));
    expect(dc201Calls).toHaveLength(1);
  });

  it('can be silenced with console-log="none"', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const chart = await chartWith({ palette: 'tableau10', 'console-log': 'none' });

    expect(warn.mock.calls.flat().join(' ')).not.toContain('DC201');
    // Still captured for <dc-log-console>, just not echoed.
    expect(warnings(chart).map(w => w.code)).toContain('DC201');
  });

  it('can be switched off entirely with logging="false"', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const chart = await chartWith({ palette: 'tableau10', logging: 'false' });

    expect(warn.mock.calls.flat().join(' ')).not.toContain('DC201');
    expect(warnings(chart)).toHaveLength(0);
  });

  it('keeps verbose derivation logging off at the default level', async () => {
    const chart = await chartWith({});
    const all = (chart as unknown as { logEntries: Array<{ level: string }> }).logEntries;
    // Only warnings and errors are captured by default; info would be thousands
    // of entries per render.
    expect(all.every(e => e.level !== 'info')).toBe(true);
  });

  it('never lets a diagnostic break a render', async () => {
    // The console label is cosmetic. An instance without a tagName or DOM
    // methods must still render rather than throwing from the logging path.
    const chart = await chartWith({ palette: 'tableau10' });
    expect(chart.shadowRoot!.querySelectorAll('rect[part="bar"]').length).toBeGreaterThan(0);
  });
});
