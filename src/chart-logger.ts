import type { LogEntry, LogLevel } from './base-chart.js';
import type { ErrorDefinition } from './errors.js';
import { formatErrorMessage } from './errors.js';

/**
 * The slice of a chart that logging needs.
 *
 * Deliberately narrow. Note what routes *back* through the host rather than
 * being answered by the logger itself: `log()` and `getTitle()` are `protected`
 * members of `BaseChart` that subclasses (and test spies) override today, so the
 * logger must dispatch to them rather than call its own copies. That is the same
 * hazard that bit the `getLuminance` seam during the `ColorResolver` extraction.
 */
export interface ChartLoggerHost {
  /** Capture level - value of the `logging` attribute. */
  readonly logging: 'false' | 'error' | 'warning' | 'info' | 'true';
  /** Echo level - value of the `console-log` attribute. */
  readonly consoleLog: 'none' | 'error' | 'warning' | 'info';
  /** The element's tag name, used to name the chart in console output. */
  readonly tagName?: string;
  /** The element's `id`, preferred over the title when naming the chart. */
  readonly id?: string;
  /**
   * The chart's title text.
   *
   * Routed through the host because `BaseChart.getTitle()` is protected and
   * overridable - a subclass that supplies its own title must still name itself
   * correctly in the console.
   */
  getTitle(): string;
  /**
   * Record a message.
   *
   * Routed through the host for the same reason: `logError()` funnels into
   * `log()`, and `BaseChart.log()` is a protected extension point. Calling the
   * logger's own `log()` here would silently bypass every override.
   */
  log(level: LogLevel, path: string, message: string, value?: unknown, code?: string): void;
  /**
   * The policy hooks, dispatched through the host.
   *
   * These three read as redundant - the logger implements all of them - but the
   * round trip is the point, and it is the same shape `KeyboardNavHost` uses for
   * `focusElement` and friends. `BaseChart` had `shouldLog`,
   * `shouldEchoToConsole` and `getConsoleIdentifier` before the extraction, and
   * dispatching back through them keeps those the live path rather than leaving
   * three vestigial methods behind that no longer decide anything.
   *
   * `BaseChart`'s implementations forward straight back here, so the default
   * behaviour is unchanged; a different host can substitute its own policy.
   */
  shouldLog(level: LogLevel): boolean;
  shouldEchoToConsole(level: LogLevel): boolean;
  getConsoleIdentifier(): string;
}

/**
 * Diagnostics for a chart: what gets captured for `<dc-log-console>`, what gets
 * echoed to the browser console, and how both are filtered and formatted.
 *
 * Extracted from `BaseChart` as the third responsibility to move out, after
 * `ColorResolver` and `KeyboardNavController`. `BaseChart` holds it behind a
 * lazy `logger` getter and its existing members delegate, so every caller -
 * including `<dc-log-console>`, the other extracted controllers, and the many
 * `this.log()` sites across the chart types - keeps working unchanged.
 *
 * Two filters apply in order. `logging` decides what is *captured*; only what
 * survives that is offered to `consoleLog`, which decides what is *echoed*. So
 * `console-log` can narrow what `logging` captured but never widen it.
 */
export class ChartLogger {
  /**
   * Entries captured during the last render cycle.
   *
   * Public and replaced (not emptied) by {@link clearLog}, because
   * `getLogEntries()` hands this array out directly and callers such as
   * `<dc-log-console>` hold on to what they were given.
   */
  entries: LogEntry[] = [];

  /**
   * Whether a console group is currently open for this render cycle.
   * Used to group related log messages in the browser console.
   */
  private consoleGroupOpen = false;

  /**
   * Messages already echoed to the console by this chart.
   *
   * Scoped to the element's lifetime rather than to a render. One
   * misconfiguration is hit from several places - palette resolution runs for
   * fills and again for strokes - and charts commonly render more than once, so
   * a single typo produced a stream of identical warnings. Repeating an
   * identical message tells the developer nothing new; fixing the markup stops
   * it at the source.
   *
   * Every entry is still recorded for `<dc-log-console>`. Only the console echo
   * is deduplicated, because that is the part a developer reads.
   */
  private echoedMessages = new Set<string>();

  constructor(private readonly host: ChartLoggerHost) {}

  /**
   * Check if a log message at the given level should be captured.
   * @param level The level of the message to check
   * @returns true if the message should be logged
   */
  shouldLog(level: LogLevel): boolean {
    if (this.host.logging === 'false') return false;
    if (this.host.logging === 'true' || this.host.logging === 'info') return true;
    if (this.host.logging === 'warning') return level === 'warning' || level === 'error';
    if (this.host.logging === 'error') return level === 'error';
    return false;
  }

  /**
   * Check if a log message at the given level should be echoed to browser console.
   * @param level The level of the message to check
   * @returns true if the message should be echoed to console
   */
  shouldEchoToConsole(level: LogLevel): boolean {
    if (this.host.consoleLog === 'none') return false;
    if (this.host.consoleLog === 'info') return true;
    if (this.host.consoleLog === 'warning') return level === 'warning' || level === 'error';
    if (this.host.consoleLog === 'error') return level === 'error';
    return false;
  }

  /**
   * Get a human-readable identifier for this chart for console output.
   * Priority: id attribute > title text > tag name only
   * @returns Identifier string like "dc-chart#my-id" or "dc-chart \"Sales\""
   */
  getConsoleIdentifier(): string {
    // This label is cosmetic, so it must never be the reason a render fails.
    // An instance constructed directly rather than upgraded from markup has no
    // tagName and no DOM methods; with console echo now on by default, throwing
    // here would take the whole render with it.
    try {
      const tagName = this.host.tagName?.toLowerCase() ?? 'chart';
      if (this.host.id) {
        return `${tagName}#${this.host.id}`;
      }
      const title = this.host.getTitle();
      if (title) {
        // Truncate long titles for console readability
        const truncatedTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
        return `${tagName} "${truncatedTitle}"`;
      }
      return tagName;
    } catch {
      return 'chart';
    }
  }

  /**
   * Start a console group for this render cycle if not already open.
   * Groups all log messages together under a collapsible header.
   */
  private startConsoleGroup(): void {
    if (!this.consoleGroupOpen && this.host.consoleLog !== 'none') {
      const identifier = this.host.getConsoleIdentifier();
      console.groupCollapsed(`${identifier} render`);
      this.consoleGroupOpen = true;
    }
  }

  /**
   * End the console group for this render cycle if open.
   */
  private endConsoleGroup(): void {
    if (this.consoleGroupOpen) {
      console.groupEnd();
      this.consoleGroupOpen = false;
    }
  }

  /**
   * Echo a log message to the browser console with appropriate formatting.
   * Messages are grouped by render cycle under a collapsible header.
   * @param level The log level
   * @param path The path identifier
   * @param message The log message
   * @param value Optional value
   * @param code Optional error code (e.g., "DC001")
   */
  private echoToConsole(level: LogLevel, path: string, message: string, value?: unknown, code?: string): void {
    // Start a group for this render cycle if not already open
    this.startConsoleGroup();

    // Format: "[DC001] path: message" or "path: message" if no code
    const prefix = code ? `[${code}] ` : '';
    const fullMessage = `${prefix}${path}: ${message}`;

    const consoleFn = level === 'error' ? console.error
                    : level === 'warning' ? console.warn
                    : console.log;

    if (value !== undefined) {
      consoleFn(fullMessage, value);
    } else {
      consoleFn(fullMessage);
    }
  }

  /**
   * Log a message during chart rendering.
   * Messages are captured in entries and can be retrieved via getLogEntries().
   * Only logs if the logging attribute is set to an appropriate level.
   * Optionally echoes to browser console based on console-log attribute.
   *
   * @param level Severity level: 'info', 'warning', or 'error'
   * @param path Dotted path identifying what was calculated (e.g., "padding.left", "slices[0].angle")
   * @param message Human-readable description of the calculation or issue
   * @param value Optional computed value
   * @param code Optional error code (e.g., "DC001")
   */
  log(level: LogLevel, path: string, message: string, value?: unknown, code?: string): void {
    if (this.host.shouldLog(level)) {
      this.entries.push({ level, path, message, value, code });

      // Also echo to browser console if configured
      if (this.host.shouldEchoToConsole(level)) {
        // Deliberately excludes `value`: a message whose value changes is echoed
        // once, with the first value. Changing that is a behaviour decision, not
        // a refactor detail - test/component/logging.test.ts pins it.
        const key = `${level}|${code ?? ''}|${path}|${message}`;
        if (!this.echoedMessages.has(key)) {
          this.echoedMessages.add(key);
          this.echoToConsole(level, path, message, value, code);
        }
      }
    }
  }

  /**
   * Log a structured error/warning using an ErrorDefinition.
   * This is the preferred method for logging warnings and errors as it ensures
   * consistent error codes and message formatting.
   *
   * Dispatches through `host.log()` rather than `this.log()` so that a subclass
   * overriding `BaseChart.log()` still sees structured errors.
   *
   * @param error The error definition from ErrorCode registry
   * @param values Placeholder values to substitute in the message template
   * @param value Optional computed value to include in the log
   */
  logError(
    error: ErrorDefinition,
    values: Record<string, string | number | undefined> = {},
    value?: unknown
  ): void {
    const message = formatErrorMessage(error.message, values);
    this.host.log(error.level, error.path, message, value, error.code);
  }

  /**
   * Get all log entries from the last render cycle.
   *
   * Returns the live array rather than a copy - `<dc-log-console>` spreads it
   * precisely because of that, and the behaviour is pinned by test.
   *
   * @returns Array of log entries in the order they were captured
   */
  getLogEntries(): LogEntry[] {
    return this.entries;
  }

  /**
   * Clear all log entries. Called automatically at the start of each render.
   * Also closes any open console group from the previous render cycle.
   *
   * The console group from the *previous* render is closed here rather than at
   * the end of the render that opened it, so an idle chart leaves one group
   * open. Characterized as-is.
   */
  clearLog(): void {
    // Close any open console group from previous render
    this.endConsoleGroup();
    this.entries = [];
  }
}
