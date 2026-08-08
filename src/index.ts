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
 *
 * ---
 *
 * WHAT BELONGS IN THIS FILE
 *
 * This is the package's public API, and everything named here is a promise the
 * project has to keep. The audience writes HTML, so the surface is deliberately
 * small: the elements, the few JavaScript entry points a page might legitimately
 * call, and the types needed to work with them.
 *
 * Internal machinery stays out even though it is exported from its own module -
 * axis tick maths, date parsing, animation primitives, insight analysis, pattern
 * registration, converters, and the controllers `BaseChart` delegates to. Those
 * modules keep their own exports so they remain unit-testable; they are simply
 * not part of what the package promises. Adding one here commits the project to
 * its shape, so add deliberately.
 */

// ---------------------------------------------------------------------------
// Chart elements
// ---------------------------------------------------------------------------

export { Chart } from './chart.js';
export { FunnelChart } from './funnel-chart.js';
export { PieChart } from './pie-chart.js';
export { StageChart } from './stage-chart.js';
export type { ConnectorType } from './stage-chart.js';

// ---------------------------------------------------------------------------
// Data elements
// ---------------------------------------------------------------------------

export { ChartBar } from './chart-bar.js';
export { ChartBarGroup } from './chart-bar-group.js';
export { ChartBarSegment } from './chart-bar-segment.js';
export { ChartBubble } from './chart-bubble.js';
export { ChartLine } from './chart-line.js';
export type { CurveFit } from './chart-line.js';
export { ChartArea } from './chart-area.js';
export { ChartPoint } from './chart-point.js';
export { ChartFunnelStage } from './chart-funnel-stage.js';
export { ChartStage } from './chart-stage.js';
export type { StageShape } from './chart-stage.js';
export { ChartPieSlice } from './chart-pie-slice.js';

// ---------------------------------------------------------------------------
// Chrome and configuration elements
// ---------------------------------------------------------------------------

// Side-effect imports ensure these elements register even when a consumer never
// names the class - they are usually only ever written as markup.
import './chart-fill.js';
import './chart-legend-item.js';
import './chart-defaults.js';

export { ChartAxis } from './chart-axis.js';
export type { AxisPosition, AxisName, AxisPositionOrName, AxisType } from './chart-axis.js';
export { ChartGrid } from './chart-grid.js';
export type { GridConfig, GridLineStyle } from './chart-grid.js';
export { ChartTitle } from './chart-title.js';
export { ChartLegend } from './chart-legend.js';
export { ChartLegendItem } from './chart-legend-item.js';
export { ChartEmpty } from './chart-empty.js';
export { ChartPopup } from './chart-popup.js';
export { ChartPalette } from './chart-palette.js';
export type { PaletteColorResult } from './chart-palette.js';
export { ChartFill } from './chart-fill.js';
export { ChartSwatch, STANDARD_SHAPES } from './chart-swatch.js';
export type { StandardShape } from './chart-swatch.js';
export { LogConsole } from './log-console.js';

// ---------------------------------------------------------------------------
// Base classes, for extending the library with a new chart type
// ---------------------------------------------------------------------------

export { BaseChart } from './base-chart.js';
export { AxisChart } from './axis-chart.js';
export { BaseChartElement } from './base-chart-element.js';
export { BaseFilledShape, BaseShape } from './base-filled-shape.js';
export type { AxisConfig, TickConfig, TimeScale } from './axis-chart.js';

// ---------------------------------------------------------------------------
// Types for working with charts from JavaScript
// ---------------------------------------------------------------------------

export type {
  ShowCondition,
  LogEntry,
  LogLevel,
  ChartInteractionDetail,
  ChartRenderDetail
} from './base-chart.js';

// ---------------------------------------------------------------------------
// Site-wide configuration
// ---------------------------------------------------------------------------

export { ChartDefaults, configure, getConfiguration } from './chart-defaults.js';
export type { DefaultableAttribute, ConfigureOptions } from './chart-defaults.js';

// ---------------------------------------------------------------------------
// Diagnostics, for anyone reading the log a chart produces
// ---------------------------------------------------------------------------

export { ErrorCode, formatErrorMessage, getErrorByCode } from './errors.js';
export type { ErrorDefinition, ErrorCodeKey, ErrorLevel } from './errors.js';

// ---------------------------------------------------------------------------
// Number formatting, so surrounding text can match a chart's labels
// ---------------------------------------------------------------------------

export { NumberFormatter, formatNumber } from './format.js';
export type { FormatPreset, FormatType, ParsedFormat, FormatterConfig } from './format.js';

// ---------------------------------------------------------------------------
// Built-in palettes, for building a palette picker or validating a name
// ---------------------------------------------------------------------------

export {
  BUILTIN_PALETTES,
  getBuiltinPalette,
  isBuiltinPalette,
  getBuiltinPaletteNames,
  getBuiltinPalettesByType
} from './builtin-palettes.js';
export type {
  BuiltinPalette,
  CategoricalPalette,
  SequentialPalette,
  DivergingPalette
} from './builtin-palettes.js';
