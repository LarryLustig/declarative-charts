import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-title';
import { Chart } from '../../src/chart';
import type { LogEntry, LogLevel } from '../../src/base-chart';
import { ErrorCode } from '../../src/errors';

/**
 * Characterization tests for the logging system in BaseChart.
 *
 * Written *before* extracting ChartLogger, so they pin what the code currently
 * does rather than what it arguably ought to do. Where a behaviour looks odd it
 * is still recorded as-is - changing it would be a decision for a human, not a
 * side effect of a refactor. Oddities are called out in comments.
 *
 * Two hazards from the earlier ColorResolver / KeyboardNavController
 * extractions are deliberately covered here:
 *
 *   (a) moving a method out of a class severs every override of it. `log()`,
 *       `clearLog()` and `getTitle()` are all protected members that the
 *       logging code calls virtually today. See the "virtual dispatch" block.
 *
 *   (b) `logging` and `consoleLog` are reactive properties; changing them must
 *       still re-render. See the "reactivity" block.
 */

// ---------------------------------------------------------------------------
// Access helpers
// ---------------------------------------------------------------------------

type LogApi = {
  logEntries: LogEntry[];
  logging: string;
  consoleLog: string;
  log(level: LogLevel, path: string, message: string, value?: unknown, code?: string): void;
  logError(
    error: { code: string; level: LogLevel; path: string; message: string },
    values?: Record<string, string | number | undefined>,
    value?: unknown
  ): void;
  clearLog(): void;
  getLogEntries(): LogEntry[];
  shouldLog(level: LogLevel): boolean;
  shouldEchoToConsole(level: LogLevel): boolean;
  getConsoleIdentifier(): string;
  getTitle(): string;
};

const api = (chart: Chart) => chart as unknown as LogApi;

const chartWith = (attrs: Record<string, string> = {}, inner?: string) =>
  fixture<Chart>(
    'dc-chart',
    { width: '600', height: '400', ...attrs },
    inner ?? '<dc-bar value="10" label="A"></dc-bar><dc-bar value="20" label="B"></dc-bar>'
  );

/** A palette name that exists neither in the DOM nor among the built-ins. */
const BAD_PALETTE = 'no-such-palette-xyz';

const said = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.map(args => args.map(a => String(a)).join(' '));

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let logSpy: ReturnType<typeof vi.spyOn>;
let groupSpy: ReturnType<typeof vi.spyOn>;
let groupEndSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
  groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

describe('logging defaults', () => {
  it('captures at "warning" by default', async () => {
    const chart = await chartWith();
    expect(chart.logging).toBe('warning');
  });

  it('echoes at "warning" by default', async () => {
    const chart = await chartWith();
    expect(chart.consoleLog).toBe('warning');
  });

  it('does not reflect logging back to an attribute when set as a property', async () => {
    const chart = await chartWith();
    chart.logging = 'info';
    await elementUpdated(chart);
    expect(chart.getAttribute('logging')).toBeNull();
  });

  it('does not reflect console-log back to an attribute when set as a property', async () => {
    const chart = await chartWith();
    chart.consoleLog = 'none';
    await elementUpdated(chart);
    expect(chart.getAttribute('console-log')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// shouldLog - capture level filtering
// ---------------------------------------------------------------------------

describe('shouldLog level filtering', () => {
  const table: Array<[string, Record<LogLevel, boolean>]> = [
    ['false', { error: false, warning: false, info: false }],
    ['error', { error: true, warning: false, info: false }],
    ['warning', { error: true, warning: true, info: false }],
    ['info', { error: true, warning: true, info: true }],
    ['true', { error: true, warning: true, info: true }],
  ];

  for (const [setting, expected] of table) {
    it(`logging="${setting}" captures error=${expected.error} warning=${expected.warning} info=${expected.info}`, async () => {
      const chart = await chartWith({ logging: setting });
      const a = api(chart);
      expect(a.shouldLog('error')).toBe(expected.error);
      expect(a.shouldLog('warning')).toBe(expected.warning);
      expect(a.shouldLog('info')).toBe(expected.info);
    });
  }

  // A typo used to switch diagnostics off silently - the same failure mode that
  // hid the palette bug for months. It now warns (DC109) and falls back to the
  // default level. Fixed deliberately.
  it('falls back to the default for an unrecognised logging value', async () => {
    const chart = await chartWith({ logging: 'verbose' });
    const a = api(chart);
    expect(a.shouldLog('error')).toBe(true);
    expect(a.shouldLog('warning')).toBe(true);
    expect(a.shouldLog('info')).toBe(false);
  });

  it('warns once about an unrecognised logging value', async () => {
    warnSpy.mockClear();
    const chart = await chartWith({ logging: 'verbose' });
    const a = api(chart);
    a.shouldLog('warning');
    a.shouldLog('warning');
    a.shouldLog('error');

    const dc109 = warnSpy.mock.calls.filter(c => c.join(' ').includes('DC109'));
    expect(dc109).toHaveLength(1);
    expect(dc109[0].join(' ')).toContain('verbose');
  });

  it('drops filtered messages entirely rather than recording them', async () => {
    const chart = await chartWith();
    const a = api(chart);
    const before = a.getLogEntries().length;
    a.log('info', 'test.path', 'an info message');
    expect(a.getLogEntries()).toHaveLength(before);
  });

  it('keeps info entries out of the default capture during a real render', async () => {
    const chart = await chartWith();
    expect(api(chart).getLogEntries().every(e => e.level !== 'info')).toBe(true);
  });

  it('captures info entries during a real render at logging="info"', async () => {
    const chart = await chartWith({ logging: 'info' });
    expect(api(chart).getLogEntries().some(e => e.level === 'info')).toBe(true);
  });

  // The same matrix again, this time through the public behaviour rather than
  // the private predicate, so it stays pinned even if shouldLog() disappears.
  for (const [setting, expected] of table) {
    it(`logging="${setting}" records ${JSON.stringify(expected)} via log()`, async () => {
      const chart = await chartWith({ logging: setting });
      const a = api(chart);
      a.clearLog();
      a.log('error', 'm.error', 'e');
      a.log('warning', 'm.warning', 'w');
      a.log('info', 'm.info', 'i');
      const paths = a.getLogEntries().map(e => e.path);
      expect(paths.includes('m.error')).toBe(expected.error);
      expect(paths.includes('m.warning')).toBe(expected.warning);
      expect(paths.includes('m.info')).toBe(expected.info);
    });
  }
});

// ---------------------------------------------------------------------------
// shouldEchoToConsole - echo level filtering
// ---------------------------------------------------------------------------

describe('shouldEchoToConsole level filtering', () => {
  const table: Array<[string, Record<LogLevel, boolean>]> = [
    ['none', { error: false, warning: false, info: false }],
    ['error', { error: true, warning: false, info: false }],
    ['warning', { error: true, warning: true, info: false }],
    ['info', { error: true, warning: true, info: true }],
  ];

  for (const [setting, expected] of table) {
    it(`console-log="${setting}" echoes error=${expected.error} warning=${expected.warning} info=${expected.info}`, async () => {
      const chart = await chartWith({ 'console-log': setting });
      const a = api(chart);
      expect(a.shouldEchoToConsole('error')).toBe(expected.error);
      expect(a.shouldEchoToConsole('warning')).toBe(expected.warning);
      expect(a.shouldEchoToConsole('info')).toBe(expected.info);
    });
  }

  // The same matrix through observable console output. `logging="info"` so the
  // capture filter never gets in the way of the echo filter.
  for (const [setting, expected] of table) {
    it(`console-log="${setting}" reaches the console for ${JSON.stringify(expected)}`, async () => {
      const chart = await chartWith({ logging: 'info', 'console-log': setting });
      errorSpy.mockClear();
      warnSpy.mockClear();
      logSpy.mockClear();
      const a = api(chart);
      a.log('error', 'n.error', 'e');
      a.log('warning', 'n.warning', 'w');
      a.log('info', 'n.info', 'i');
      expect(said(errorSpy).some(s => s.includes('n.error'))).toBe(expected.error);
      expect(said(warnSpy).some(s => s.includes('n.warning'))).toBe(expected.warning);
      expect(said(logSpy).some(s => s.includes('n.info'))).toBe(expected.info);
    });
  }

  it('falls back to the default for an unrecognised console-log value', async () => {
    const chart = await chartWith({ 'console-log': 'all' });
    expect(api(chart).shouldEchoToConsole('error')).toBe(true);
    expect(api(chart).shouldEchoToConsole('info')).toBe(false);
  });

  it('applies the capture filter first, so console-log can only narrow it', async () => {
    // logging="warning" never captures info, so console-log="info" cannot
    // surface it - the echo check is inside the capture check.
    const chart = await chartWith({ logging: 'warning', 'console-log': 'info' });
    logSpy.mockClear();
    api(chart).log('info', 'test.narrow', 'should not appear');
    expect(said(logSpy).join(' ')).not.toContain('test.narrow');
  });

  it('echoes nothing at all when logging is off, whatever console-log says', async () => {
    const chart = await chartWith({ logging: 'false', 'console-log': 'info' });
    warnSpy.mockClear();
    api(chart).log('error', 'test.off', 'should not appear');
    api(chart).log('warning', 'test.off', 'should not appear');
    expect(said(errorSpy).join(' ')).not.toContain('test.off');
    expect(said(warnSpy).join(' ')).not.toContain('test.off');
  });

  it('records but does not echo when console-log="none"', async () => {
    const chart = await chartWith({ 'console-log': 'none' });
    const a = api(chart);
    a.log('warning', 'test.silent', 'recorded only');
    expect(a.getLogEntries().some(e => e.path === 'test.silent')).toBe(true);
    expect(said(warnSpy).join(' ')).not.toContain('test.silent');
  });
});

// ---------------------------------------------------------------------------
// Console echo formatting
// ---------------------------------------------------------------------------

describe('console echo formatting', () => {
  it('formats a coded message as "[CODE] path: message"', async () => {
    const chart = await chartWith();
    warnSpy.mockClear();
    api(chart).log('warning', 'a.b', 'something happened', undefined, 'DC999');
    expect(warnSpy).toHaveBeenCalledWith('[DC999] a.b: something happened');
  });

  it('omits the bracketed prefix when there is no code', async () => {
    const chart = await chartWith();
    warnSpy.mockClear();
    api(chart).log('warning', 'a.c', 'no code here');
    expect(warnSpy).toHaveBeenCalledWith('a.c: no code here');
  });

  it('passes the value as a second console argument when present', async () => {
    const chart = await chartWith();
    warnSpy.mockClear();
    api(chart).log('warning', 'a.d', 'with value', { n: 1 });
    expect(warnSpy).toHaveBeenCalledWith('a.d: with value', { n: 1 });
  });

  it('treats 0 and null as present values, not as absent', async () => {
    const chart = await chartWith();
    warnSpy.mockClear();
    api(chart).log('warning', 'a.zero', 'zero', 0);
    api(chart).log('warning', 'a.null', 'null', null);
    expect(warnSpy).toHaveBeenCalledWith('a.zero: zero', 0);
    expect(warnSpy).toHaveBeenCalledWith('a.null: null', null);
  });

  it('routes errors to console.error', async () => {
    const chart = await chartWith();
    errorSpy.mockClear();
    api(chart).log('error', 'a.e', 'an error');
    expect(errorSpy).toHaveBeenCalledWith('a.e: an error');
  });

  it('routes warnings to console.warn', async () => {
    const chart = await chartWith();
    warnSpy.mockClear();
    api(chart).log('warning', 'a.w', 'a warning');
    expect(warnSpy).toHaveBeenCalledWith('a.w: a warning');
  });

  it('routes info to console.log', async () => {
    const chart = await chartWith({ logging: 'info', 'console-log': 'info' });
    logSpy.mockClear();
    api(chart).log('info', 'a.i', 'some info');
    expect(logSpy).toHaveBeenCalledWith('a.i: some info');
  });
});

// ---------------------------------------------------------------------------
// Console grouping
// ---------------------------------------------------------------------------

describe('console grouping', () => {
  it('opens a collapsed group on the first echo', async () => {
    const chart = await chartWith();
    groupSpy.mockClear();
    api(chart).log('warning', 'g.a', 'first');
    expect(groupSpy).toHaveBeenCalledTimes(1);
    expect(String(groupSpy.mock.calls[0][0])).toContain('render');
  });

  it('opens the group only once for several echoes in the same cycle', async () => {
    const chart = await chartWith();
    groupSpy.mockClear();
    api(chart).log('warning', 'g.b', 'one');
    api(chart).log('warning', 'g.c', 'two');
    api(chart).log('warning', 'g.d', 'three');
    expect(groupSpy).toHaveBeenCalledTimes(1);
  });

  it('closes the group at the start of the NEXT render, not the end of this one', async () => {
    // Characterization: the group is left open until clearLog() runs again, so
    // in a browser an idle chart keeps one open group.
    const chart = await chartWith();
    api(chart).log('warning', 'g.e', 'open me');
    groupEndSpy.mockClear();
    expect(groupEndSpy).not.toHaveBeenCalled();

    chart.requestUpdate();
    await elementUpdated(chart);
    expect(groupEndSpy).toHaveBeenCalled();
  });

  it('does not close a group that was never opened', async () => {
    const chart = await chartWith();
    groupEndSpy.mockClear();
    chart.requestUpdate();
    await elementUpdated(chart);
    expect(groupEndSpy).not.toHaveBeenCalled();
  });

  it('opens no group when console-log="none"', async () => {
    const chart = await chartWith({ 'console-log': 'none' });
    groupSpy.mockClear();
    api(chart).log('warning', 'g.f', 'silent');
    expect(groupSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getConsoleIdentifier
// ---------------------------------------------------------------------------

describe('console identifier', () => {
  it('prefers the id attribute', async () => {
    const chart = await chartWith({ id: 'my-chart' });
    expect(api(chart).getConsoleIdentifier()).toBe('dc-chart#my-chart');
  });

  it('falls back to the title in quotes', async () => {
    const chart = await chartWith({}, '<dc-title>Sales</dc-title><dc-bar value="10" label="A"></dc-bar>');
    expect(api(chart).getConsoleIdentifier()).toBe('dc-chart "Sales"');
  });

  it('prefers the id even when a title is present', async () => {
    const chart = await chartWith(
      { id: 'ided' },
      '<dc-title>Sales</dc-title><dc-bar value="10" label="A"></dc-bar>'
    );
    expect(api(chart).getConsoleIdentifier()).toBe('dc-chart#ided');
  });

  it('falls back to the tag name alone', async () => {
    const chart = await chartWith();
    expect(api(chart).getConsoleIdentifier()).toBe('dc-chart');
  });

  it('keeps a 30-character title intact', async () => {
    const chart = await chartWith();
    const title = 'x'.repeat(30);
    api(chart).getTitle = () => title;
    expect(api(chart).getConsoleIdentifier()).toBe(`dc-chart "${title}"`);
  });

  it('truncates a 31-character title to 27 characters plus an ellipsis', async () => {
    const chart = await chartWith();
    api(chart).getTitle = () => 'y'.repeat(31);
    expect(api(chart).getConsoleIdentifier()).toBe(`dc-chart "${'y'.repeat(27)}..."`);
  });

  it('never throws, even with no tagName and no DOM methods', async () => {
    // The label is cosmetic and must not be the reason a render fails; the
    // try/catch exists for instances that were constructed rather than upgraded.
    const borrowed = (Chart.prototype as unknown as LogApi).getConsoleIdentifier;
    expect(borrowed.call({} as unknown as LogApi)).toBe('chart');
  });
});

// ---------------------------------------------------------------------------
// Deduplication of console echo
// ---------------------------------------------------------------------------

describe('console echo deduplication', () => {
  it('echoes an identical message once, however many times it is logged', async () => {
    const chart = await chartWith();
    warnSpy.mockClear();
    api(chart).log('warning', 'd.a', 'same message');
    api(chart).log('warning', 'd.a', 'same message');
    api(chart).log('warning', 'd.a', 'same message');
    expect(said(warnSpy).filter(s => s.includes('d.a'))).toHaveLength(1);
  });

  it('still records every duplicate for <dc-log-console>', async () => {
    const chart = await chartWith();
    const a = api(chart);
    a.log('warning', 'd.b', 'same message');
    a.log('warning', 'd.b', 'same message');
    expect(a.getLogEntries().filter(e => e.path === 'd.b')).toHaveLength(2);
  });

  it('deduplicates across render cycles, not just within one', async () => {
    const chart = await chartWith({ palette: BAD_PALETTE });
    chart.requestUpdate();
    await elementUpdated(chart);
    chart.requestUpdate();
    await elementUpdated(chart);
    expect(said(warnSpy).filter(s => s.includes('DC201'))).toHaveLength(1);
  });

  it('deduplicates per element, so a second chart still warns', async () => {
    await chartWith({ palette: BAD_PALETTE });
    await chartWith({ palette: BAD_PALETTE });
    expect(said(warnSpy).filter(s => s.includes('DC201'))).toHaveLength(2);
  });

  it('treats a different level as a different message', async () => {
    const chart = await chartWith();
    warnSpy.mockClear();
    errorSpy.mockClear();
    api(chart).log('warning', 'd.c', 'text');
    api(chart).log('error', 'd.c', 'text');
    expect(said(warnSpy).filter(s => s.includes('d.c'))).toHaveLength(1);
    expect(said(errorSpy).filter(s => s.includes('d.c'))).toHaveLength(1);
  });

  it('treats a different code as a different message', async () => {
    const chart = await chartWith();
    warnSpy.mockClear();
    api(chart).log('warning', 'd.d', 'text', undefined, 'DC901');
    api(chart).log('warning', 'd.d', 'text', undefined, 'DC902');
    expect(said(warnSpy).filter(s => s.includes('d.d'))).toHaveLength(2);
  });

  it('ignores the value when deduplicating, so a changed value is swallowed', async () => {
    // Characterization, and arguably wrong: only level|code|path|message form
    // the key, so a warning whose *value* changes is echoed once with the first
    // value and never updated.
    const chart = await chartWith();
    warnSpy.mockClear();
    api(chart).log('warning', 'd.e', 'value changed', 1);
    api(chart).log('warning', 'd.e', 'value changed', 2);
    const calls = warnSpy.mock.calls.filter(c => String(c[0]).includes('d.e'));
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe(1);
  });

  it('survives clearLog - the dedup set is scoped to the element, not the render', async () => {
    const chart = await chartWith();
    warnSpy.mockClear();
    api(chart).log('warning', 'd.f', 'persistent');
    api(chart).clearLog();
    api(chart).log('warning', 'd.f', 'persistent');
    expect(said(warnSpy).filter(s => s.includes('d.f'))).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Log entry shape and lifecycle
// ---------------------------------------------------------------------------

describe('log entries', () => {
  it('records level, path, message, value and code', async () => {
    const chart = await chartWith();
    api(chart).log('warning', 'e.a', 'msg', 42, 'DC777');
    const entry = api(chart).getLogEntries().find(e => e.path === 'e.a')!;
    expect(entry).toEqual({
      level: 'warning',
      path: 'e.a',
      message: 'msg',
      value: 42,
      code: 'DC777',
    });
  });

  it('always carries value and code keys, even when undefined', async () => {
    const chart = await chartWith();
    api(chart).log('warning', 'e.b', 'msg');
    const entry = api(chart).getLogEntries().find(e => e.path === 'e.b')!;
    expect(Object.keys(entry).sort()).toEqual(['code', 'level', 'message', 'path', 'value']);
    expect(entry.value).toBeUndefined();
    expect(entry.code).toBeUndefined();
  });

  it('preserves insertion order', async () => {
    const chart = await chartWith();
    const a = api(chart);
    a.clearLog();
    a.log('warning', 'e.1', 'one');
    a.log('error', 'e.2', 'two');
    a.log('warning', 'e.3', 'three');
    expect(a.getLogEntries().map(e => e.path)).toEqual(['e.1', 'e.2', 'e.3']);
  });

  it('exposes getLogEntries() publicly for <dc-log-console>', async () => {
    const chart = await chartWith();
    expect(typeof chart.getLogEntries).toBe('function');
    expect(Array.isArray(chart.getLogEntries())).toBe(true);
  });

  it('satisfies the exact duck-type check <dc-log-console> uses to find charts', async () => {
    // src/log-console.ts filters with:
    //   'getLogEntries' in el && typeof el.getLogEntries === 'function'
    // so the method must stay reachable by that name on the instance.
    const chart = await chartWith();
    expect('getLogEntries' in chart).toBe(true);
    expect(typeof (chart as unknown as { getLogEntries: unknown }).getLogEntries).toBe('function');
  });

  it('hands <dc-log-console> the same entries the chart holds', async () => {
    const chart = await chartWith({ palette: BAD_PALETTE });
    // What refreshLogs() does: a spread copy of the chart's entries.
    const copied = [...chart.getLogEntries()];
    expect(copied.map(e => e.code)).toContain('DC201');
    expect(copied).toEqual(api(chart).logEntries);
  });

  // Used to hand out the live array, so a caller could mutate the chart's own
  // log - <dc-log-console> spreads the result precisely because of that. Now a
  // copy, which makes the defensive spread unnecessary rather than customary.
  it('returns a copy, so a caller cannot mutate the chart log', async () => {
    const chart = await chartWith();
    const entries = chart.getLogEntries();
    api(chart).log('warning', 'e.live', 'appended');
    expect(entries.some(e => e.path === 'e.live')).toBe(false);

    entries.push({ level: 'error', path: 'e.injected', message: 'x' } as never);
    expect(chart.getLogEntries().some(e => e.path === 'e.injected')).toBe(false);
  });

  it('clears entries at the start of each render', async () => {
    const chart = await chartWith();
    api(chart).log('warning', 'e.stale', 'from before');
    chart.requestUpdate();
    await elementUpdated(chart);
    expect(api(chart).getLogEntries().some(e => e.path === 'e.stale')).toBe(false);
  });

  it('leaves an already-returned snapshot alone when cleared', async () => {
    const chart = await chartWith();
    api(chart).log('warning', 'e.detach', 'x');
    const snapshot = chart.getLogEntries();
    expect(snapshot.some(e => e.path === 'e.detach')).toBe(true);

    api(chart).clearLog();

    // The caller's snapshot still reads as it did; the chart's log is empty.
    expect(snapshot.some(e => e.path === 'e.detach')).toBe(true);
    expect(chart.getLogEntries()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// logError
// ---------------------------------------------------------------------------

describe('logError', () => {
  it('substitutes placeholders from the values object', async () => {
    const chart = await chartWith();
    api(chart).logError(ErrorCode.PALETTE_NOT_FOUND, { id: 'oops' });
    const entry = api(chart).getLogEntries().find(e => e.code === 'DC201')!;
    expect(entry.message).toBe('Palette "oops" not found (no DOM element or built-in with that name)');
  });

  it('takes level, path and code from the error definition', async () => {
    const chart = await chartWith();
    api(chart).logError(ErrorCode.DATA_EMPTY, { chartType: 'Chart', expectedElements: 'bars' });
    const entry = api(chart).getLogEntries().find(e => e.code === 'DC001')!;
    expect(entry.level).toBe('warning');
    expect(entry.path).toBe('data.empty');
  });

  it('repeats a placeholder that appears twice in the template', async () => {
    const chart = await chartWith();
    api(chart).logError(ErrorCode.DATA_EMPTY, { chartType: 'Chart', expectedElements: 'dc-bar' });
    const entry = api(chart).getLogEntries().find(e => e.code === 'DC001')!;
    expect(entry.message).toBe('Chart has no dc-bar. Add dc-bar to display data.');
  });

  it('leaves an unsupplied placeholder in the message verbatim', async () => {
    const chart = await chartWith();
    api(chart).logError(ErrorCode.DATA_EMPTY, { chartType: 'Chart' });
    const entry = api(chart).getLogEntries().find(e => e.code === 'DC001')!;
    expect(entry.message).toContain('{expectedElements}');
  });

  it('defaults the values object so it can be called with the code alone', async () => {
    const chart = await chartWith();
    api(chart).logError(ErrorCode.SVG_NOT_FOUND);
    const entry = api(chart).getLogEntries().find(e => e.code === 'DC204')!;
    expect(entry.message).toBe('No SVG element found in chart shadow DOM');
  });

  it('passes the optional value through to the entry and the console', async () => {
    const chart = await chartWith();
    warnSpy.mockClear();
    api(chart).logError(ErrorCode.DATA_ZERO_BARS, { count: 2, labels: 'A, B' }, ['A', 'B']);
    const entry = api(chart).getLogEntries().find(e => e.code === 'DC005')!;
    expect(entry.value).toEqual(['A', 'B']);
    expect(warnSpy).toHaveBeenCalledWith('[DC005] bars.zeroValue: 2 bar(s) have value 0 and will not be visible: A, B', ['A', 'B']);
  });

  it('is suppressed by logging="false" like any other message', async () => {
    const chart = await chartWith({ logging: 'false' });
    api(chart).logError(ErrorCode.PALETTE_NOT_FOUND, { id: 'oops' });
    expect(api(chart).getLogEntries()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Reactivity - hazard (b)
// ---------------------------------------------------------------------------

describe('reactivity of logging properties', () => {
  it('re-renders and starts capturing info when logging is raised', async () => {
    const chart = await chartWith();
    expect(api(chart).getLogEntries().some(e => e.level === 'info')).toBe(false);

    chart.logging = 'info';
    await elementUpdated(chart);

    // Would fail if `logging` stopped being a reactive property: no re-render
    // would happen and the log would still hold the old warning-level capture.
    expect(api(chart).getLogEntries().some(e => e.level === 'info')).toBe(true);
  });

  it('re-renders and stops capturing when logging is switched off', async () => {
    const chart = await chartWith({ logging: 'info' });
    expect(api(chart).getLogEntries().length).toBeGreaterThan(0);

    chart.logging = 'false';
    await elementUpdated(chart);

    expect(api(chart).getLogEntries()).toHaveLength(0);
  });

  it('reacts to the logging attribute being set after construction', async () => {
    const chart = await chartWith();
    chart.setAttribute('logging', 'info');
    await elementUpdated(chart);
    expect(chart.logging).toBe('info');
    expect(api(chart).getLogEntries().some(e => e.level === 'info')).toBe(true);
  });

  it('reacts to the console-log attribute being set after construction', async () => {
    const chart = await chartWith();
    chart.setAttribute('console-log', 'none');
    await elementUpdated(chart);
    expect(chart.consoleLog).toBe('none');

    groupSpy.mockClear();
    api(chart).log('warning', 'r.a', 'quiet now');
    expect(groupSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Virtual dispatch - hazard (a)
// ---------------------------------------------------------------------------

/**
 * A subclass that overrides the protected logging seams. Every one of these
 * overrides works today because the calls are virtual on the chart. If any of
 * them moves onto a controller that calls its own copy, the override is
 * silently bypassed and the matching test below fails.
 */
class LogSpyChart extends Chart {
  logCalls: Array<{ level: LogLevel; path: string; message: string; value?: unknown; code?: string }> = [];
  clearLogCalls = 0;
  titleCalls = 0;

  override log(level: LogLevel, path: string, message: string, value?: unknown, code?: string): void {
    (this.logCalls ??= []).push({ level, path, message, value, code });
    super.log(level, path, message, value, code);
  }

  override clearLog(): void {
    this.clearLogCalls = (this.clearLogCalls ?? 0) + 1;
    super.clearLog();
  }

  override getTitle(): string {
    this.titleCalls = (this.titleCalls ?? 0) + 1;
    return 'Overridden Title';
  }
}
customElements.define('dc-chart-log-spy', LogSpyChart);

const spyChart = (attrs: Record<string, string> = {}) =>
  fixture<LogSpyChart>(
    'dc-chart-log-spy',
    { width: '600', height: '400', ...attrs },
    '<dc-bar value="10" label="A"></dc-bar><dc-bar value="20" label="B"></dc-bar>'
  );

describe('virtual dispatch through the chart', () => {
  it('routes logError() through an overridden log()', async () => {
    const chart = await spyChart();
    chart.logCalls.length = 0;
    (chart as unknown as LogApi).logError(ErrorCode.PALETTE_NOT_FOUND, { id: 'zzz' });
    expect(chart.logCalls.map(c => c.code)).toContain('DC201');
  });

  it('routes ColorResolver warnings through an overridden log()', async () => {
    // ColorResolver already receives log/logError on its host adapter. If the
    // logger extraction rewires that adapter to the controller directly, this
    // subclass hook disappears.
    const chart = await spyChart({ palette: BAD_PALETTE });
    expect(chart.logCalls.map(c => c.code)).toContain('DC201');
  });

  it('calls clearLog() once per render', async () => {
    const chart = await spyChart();
    const before = chart.clearLogCalls;
    expect(before).toBeGreaterThan(0);

    chart.requestUpdate();
    await elementUpdated(chart);
    expect(chart.clearLogCalls).toBe(before + 1);
  });

  it('uses an overridden getTitle() for the console identifier', async () => {
    const chart = await spyChart();
    expect((chart as unknown as LogApi).getConsoleIdentifier()).toBe('dc-chart-log-spy "Overridden Title"');
  });

  it('names the chart by its own tag name in the console group', async () => {
    const chart = await spyChart();
    groupSpy.mockClear();
    (chart as unknown as LogApi).log('warning', 'v.a', 'grouped');
    expect(String(groupSpy.mock.calls[0][0])).toBe('dc-chart-log-spy "Overridden Title" render');
  });
});

// ---------------------------------------------------------------------------
// Interaction with render output
// ---------------------------------------------------------------------------

describe('logging does not change what is drawn', () => {
  const barGeometry = (chart: Chart) =>
    Array.from(chart.shadowRoot!.querySelectorAll('rect[part="bar"]')).map(
      r => `${r.getAttribute('x')}|${r.getAttribute('y')}|${r.getAttribute('width')}|${r.getAttribute('height')}`
    );

  it('draws the same bars at every logging level', async () => {
    const off = await chartWith({ logging: 'false' });
    const on = await chartWith({ logging: 'info', 'console-log': 'none' });
    expect(barGeometry(off).length).toBeGreaterThan(0);
    expect(barGeometry(on)).toEqual(barGeometry(off));
  });

  it('still renders when the chart is misconfigured and warning', async () => {
    const chart = await chartWith({ palette: BAD_PALETTE });
    expect(chart.shadowRoot!.querySelectorAll('rect[part="bar"]').length).toBeGreaterThan(0);
    expect(api(chart).getLogEntries().some(e => e.code === 'DC201')).toBe(true);
  });

  it('emits no log entries into the SVG output itself', async () => {
    const chart = await chartWith({ logging: 'info' });
    expect(chart.shadowRoot!.innerHTML).not.toContain('colors.mode');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('accepts an empty path and message', async () => {
    const chart = await chartWith();
    warnSpy.mockClear();
    api(chart).log('warning', '', '');
    expect(api(chart).getLogEntries().some(e => e.path === '' && e.message === '')).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(': ');
  });

  // This test previously pinned a regression: introducing the empty-state
  // placeholder made BaseChart.render() skip renderChart() entirely, which is
  // where DC001/DC002 lived, so both codes became unreachable and an empty chart
  // logged nothing. The diagnostics now come from the empty-state path itself,
  // via getEmptyStateDiagnostic(). Updated deliberately - this is a behaviour
  // change, not a refactor artefact.
  it('reports DC001 for a chart with no data elements', async () => {
    const empty = await chartWith({}, '');
    const codes = api(empty).getLogEntries().map(e => e.code);
    expect(codes).toContain('DC001');
  });

  it('reports DC002 when every data element is hidden', async () => {
    const allHidden = await chartWith({}, '<dc-bar value="10" label="A" hidden></dc-bar>');
    const entry = api(allHidden).getLogEntries().find(e => e.code === 'DC002');
    expect(entry).toBeDefined();
    // The message should name what is hidden, not just that something is.
    expect(entry!.message).toContain('dc-bar');
  });

  it('names the elements the author probably meant to add', async () => {
    const empty = await chartWith({}, '');
    const dc001 = api(empty).getLogEntries().find(e => e.code === 'DC001');
    expect(dc001!.message).toContain('dc-bar');
  });

  it('keeps logging after the element is disconnected', async () => {
    const chart = await chartWith();
    chart.remove();
    api(chart).log('warning', 'x.disconnected', 'still recorded');
    expect(api(chart).getLogEntries().some(e => e.path === 'x.disconnected')).toBe(true);
  });

  it('does not deduplicate the recorded entries when the same warning arises twice in one render', async () => {
    // Palette resolution runs once for fills and again for strokes, which is
    // why the console echo is deduplicated but the entries are not.
    const chart = await chartWith();
    const a = api(chart);
    a.clearLog();
    a.logError(ErrorCode.PALETTE_NOT_FOUND, { id: 'dup' });
    a.logError(ErrorCode.PALETTE_NOT_FOUND, { id: 'dup' });
    expect(a.getLogEntries().filter(e => e.code === 'DC201')).toHaveLength(2);
  });
});
