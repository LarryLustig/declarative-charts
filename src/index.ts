/**
 * Declarative Chart Library
 *
 * A Web Components-based chart library using Lit that allows
 * declarative chart creation with nested HTML elements.
 *
 * @example
 * import 'declarative-charts';
 *
 * <dc-chart width="600" height="400">
 *   <dc-title>Sales Data</dc-title>
 *   <dc-bar value="10" fill="red" label="Jan"></dc-bar>
 *   <dc-bar value="20" fill="blue" label="Feb"></dc-bar>
 * </dc-chart>
 */

// Export base classes and utilities
export { BaseChart, booleanConverter, showConditionConverter } from './base-chart.js';
export type { ShowCondition } from './base-chart.js';
export { AxisChart } from './axis-chart.js';
export type { AxisConfig } from './axis-chart.js';
export { BaseChartElement } from './base-chart-element.js';
export { ChartAxis } from './chart-axis.js';
export type { AxisPosition, AxisName, AxisPositionOrName } from './chart-axis.js';

// Export all chart components
export { Chart } from './chart.js';
export { FunnelChart } from './funnel-chart.js';
export { PieChart } from './pie-chart.js';

// Export child element components
export { ChartBar } from './chart-bar.js';
export { ChartBarGroup } from './chart-bar-group.js';
export { ChartBarSegment } from './chart-bar-segment.js';
export { ChartBubble } from './chart-bubble.js';
export { ChartLine } from './chart-line.js';
export type { CurveFit } from './chart-line.js';
export { ChartPoint } from './chart-point.js';
export { ChartPopup } from './chart-popup.js';
export { ChartFunnelStage } from './chart-funnel-stage.js';
export { ChartPieSlice } from './chart-pie-slice.js';
export { ChartLegend } from './chart-legend.js';
export { ChartTitle } from './chart-title.js';

// Export palette components
export { ChartPalette } from './chart-palette.js';
export type { PaletteColorResult } from './chart-palette.js';
export { ChartFill } from './chart-fill.js';
export { ChartSwatch, STANDARD_SHAPES } from './chart-swatch.js';
export type { StandardShape } from './chart-swatch.js';
export {
  PATTERN_DEFINITIONS,
  HIGH_CONTRAST_PATTERN_SEQUENCE,
  HIGH_CONTRAST_COLORS,
  isPatternType,
  generatePatternId,
  getHighContrastPattern
} from './patterns.js';
export type { PatternType, PatternConfig, ResolvedPattern, ResolvedFillAndPattern } from './patterns.js';

// Export logging/debugging components
export { LogConsole } from './log-console.js';

// Export log entry types from base-chart
export type { LogEntry, LogLevel } from './base-chart.js';

// Export accessibility utilities
export {
  // Analysis functions
  average,
  standardDeviation,
  findPeaks,
  findValleys,
  analyzeLineTrend,
  analyzeLines,
  analyzeBars,
  analyzePie,
  analyzeFunnel,
  analyzeBubbles
} from './accessibility/index.js';

// Export accessibility types
export type {
  LinePoint,
  LineData,
  BarData,
  SliceData,
  StageData,
  BubbleData
} from './accessibility/index.js';

// Export formatting utilities
export { NumberFormatter, formatNumber, parseFormat } from './format.js';
export type { FormatPreset, FormatType, ParsedFormat, FormatterConfig } from './format.js';
