import { customElement, property, state } from 'lit/decorators.js';
import { LitElement, html, css } from 'lit';
import type { BaseChart, LogEntry } from './base-chart.js';

/**
 * Log console component for displaying chart log entries
 *
 * This component connects to one or more charts via a CSS selector and displays
 * their log entries in a tabular format. When multiple charts match the selector,
 * a tab bar is shown to select which chart's logs to display.
 *
 * @element dc-log-console
 *
 * @attr {string} chart - CSS selector identifying the chart(s) to monitor (required)
 *
 * @example
 * <dc-bar-chart id="my-chart" logging="info" width="500" height="300">
 *   <dc-bar value="30" label="A"></dc-bar>
 *   <dc-bar value="45" label="B"></dc-bar>
 * </dc-bar-chart>
 *
 * <dc-log-console chart="#my-chart"></dc-log-console>
 *
 * @example
 * <!-- Monitor multiple charts -->
 * <dc-log-console chart="dc-bar-chart, dc-pie-chart"></dc-log-console>
 */
@customElement('dc-log-console')
export class LogConsole extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #fafafa;
      margin: 10px 0;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f0f0f0;
      border-bottom: 1px solid #ccc;
      border-radius: 4px 4px 0 0;
    }

    .title {
      font-weight: 600;
      color: #333;
    }

    .entry-count {
      font-size: 12px;
      color: #666;
    }

    .tabs {
      display: flex;
      gap: 2px;
      padding: 8px 12px 0;
      background: #f0f0f0;
      border-bottom: 1px solid #ccc;
    }

    .tab {
      padding: 6px 12px;
      background: #e0e0e0;
      border: 1px solid #ccc;
      border-bottom: none;
      border-radius: 4px 4px 0 0;
      cursor: pointer;
      font-size: 12px;
      color: #555;
      transition: background 0.15s;
    }

    .tab:hover {
      background: #d5d5d5;
    }

    .tab.active {
      background: #fafafa;
      color: #333;
      font-weight: 500;
      margin-bottom: -1px;
      border-bottom: 1px solid #fafafa;
    }

    .log-table {
      width: 100%;
      border-collapse: collapse;
    }

    .log-table th {
      text-align: left;
      padding: 8px 12px;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      color: #666;
    }

    .log-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }

    .log-table tr:last-child td {
      border-bottom: none;
    }

    .log-table tr:hover {
      background: #f8f8f8;
    }

    .level {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      display: inline-block;
      min-width: 48px;
      text-align: center;
    }

    .level-info {
      background: #e3f2fd;
      color: #1565c0;
    }

    .level-warning {
      background: #fff3e0;
      color: #ef6c00;
    }

    .level-error {
      background: #ffebee;
      color: #c62828;
    }

    .path {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 12px;
      color: #0066cc;
    }

    .message {
      color: #333;
    }

    .value {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 12px;
      color: #666;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty-message {
      padding: 20px;
      text-align: center;
      color: #888;
      font-style: italic;
    }

    .no-charts {
      padding: 20px;
      text-align: center;
      color: #c62828;
    }

    .refresh-btn {
      padding: 4px 8px;
      font-size: 12px;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 3px;
      cursor: pointer;
      margin-left: 8px;
    }

    .refresh-btn:hover {
      background: #f5f5f5;
    }
  `;

  /**
   * CSS selector identifying the chart(s) to monitor
   */
  @property({ type: String })
  chart = '';

  /**
   * Currently selected chart index (when multiple charts match)
   */
  @state()
  private selectedChartIndex = 0;

  /**
   * Cached list of matched charts
   */
  @state()
  private matchedCharts: BaseChart[] = [];

  /**
   * Current log entries for the selected chart
   */
  @state()
  private logEntries: LogEntry[] = [];

  private observer: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    // Delay initial query to ensure charts are registered
    requestAnimationFrame(() => {
      this.findCharts();
      this.setupObserver();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
  }

  /**
   * Find all charts matching the selector
   */
  private findCharts(): void {
    if (!this.chart) {
      this.matchedCharts = [];
      this.logEntries = [];
      return;
    }

    try {
      const elements = document.querySelectorAll(this.chart);
      // Filter to only include elements that are BaseChart instances
      this.matchedCharts = Array.from(elements).filter(
        (el): el is BaseChart => 'getLogEntries' in el && typeof (el as BaseChart).getLogEntries === 'function'
      );

      // Reset selection if out of bounds
      if (this.selectedChartIndex >= this.matchedCharts.length) {
        this.selectedChartIndex = 0;
      }

      this.refreshLogs();
    } catch {
      // Invalid selector
      this.matchedCharts = [];
      this.logEntries = [];
    }
  }

  /**
   * Set up mutation observer to detect chart changes
   */
  private setupObserver(): void {
    // Observe the document for attribute changes on matched charts
    this.observer = new MutationObserver(() => {
      // Debounce rapid changes
      requestAnimationFrame(() => this.refreshLogs());
    });

    // Observe each matched chart for attribute changes
    this.matchedCharts.forEach(chart => {
      this.observer?.observe(chart, {
        attributes: true,
        childList: true,
        subtree: true
      });
    });

    // Also observe document for new charts being added
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Refresh log entries from the selected chart
   */
  private refreshLogs(): void {
    const selectedChart = this.matchedCharts[this.selectedChartIndex];
    if (selectedChart) {
      this.logEntries = [...selectedChart.getLogEntries()];
    } else {
      this.logEntries = [];
    }
    this.requestUpdate();
  }

  /**
   * Handle tab selection
   */
  private selectChart(index: number): void {
    this.selectedChartIndex = index;
    this.refreshLogs();
  }

  /**
   * Get a display name for a chart
   */
  private getChartDisplayName(chart: BaseChart, index: number): string {
    // Try to get an id
    if (chart.id) {
      return `#${chart.id}`;
    }
    // Use tag name and index
    const tagName = chart.tagName.toLowerCase();
    return `${tagName} [${index + 1}]`;
  }

  /**
   * Format a value for display
   */
  private formatValue(value: unknown): string {
    if (value === undefined) return '';
    if (value === null) return 'null';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    }
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[object]';
      }
    }
    return String(value);
  }

  protected override render() {
    if (!this.chart) {
      return html`
        <div class="no-charts">
          No chart selector specified. Add a <code>chart</code> attribute with a CSS selector.
        </div>
      `;
    }

    if (this.matchedCharts.length === 0) {
      return html`
        <div class="no-charts">
          No charts found matching selector: <code>${this.chart}</code>
          <br><br>
          <small>Make sure the chart has <code>logging="info"</code> or <code>logging="true"</code> to capture logs.</small>
        </div>
      `;
    }

    const showTabs = this.matchedCharts.length > 1;
    const selectedChart = this.matchedCharts[this.selectedChartIndex];

    return html`
      ${showTabs ? html`
        <div class="tabs">
          ${this.matchedCharts.map((chart, index) => html`
            <button
              class="tab ${index === this.selectedChartIndex ? 'active' : ''}"
              @click="${() => this.selectChart(index)}"
            >
              ${this.getChartDisplayName(chart, index)}
            </button>
          `)}
        </div>
      ` : ''}

      <div class="header">
        <span class="title">
          Log Console
          ${!showTabs && selectedChart ? html` - ${this.getChartDisplayName(selectedChart, 0)}` : ''}
        </span>
        <span>
          <span class="entry-count">${this.logEntries.length} entries</span>
          <button class="refresh-btn" @click="${() => this.refreshLogs()}">Refresh</button>
        </span>
      </div>

      ${this.logEntries.length === 0 ? html`
        <div class="empty-message">
          No log entries. Make sure the chart has <code>logging="info"</code> enabled.
        </div>
      ` : html`
        <table class="log-table">
          <thead>
            <tr>
              <th style="width: 70px;">Level</th>
              <th style="width: 180px;">Path</th>
              <th>Message</th>
              <th style="width: 150px;">Value</th>
            </tr>
          </thead>
          <tbody>
            ${this.logEntries.map(entry => html`
              <tr>
                <td>
                  <span class="level level-${entry.level}">${entry.level}</span>
                </td>
                <td class="path">${entry.path}</td>
                <td class="message">${entry.message}</td>
                <td class="value" title="${this.formatValue(entry.value)}">
                  ${this.formatValue(entry.value)}
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-log-console': LogConsole;
  }
}
