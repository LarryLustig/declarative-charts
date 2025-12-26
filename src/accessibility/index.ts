/**
 * Accessibility module for declarative charts.
 *
 * Provides auto-insights generation for screen reader descriptions.
 */

export {
  // Utility functions
  average,
  standardDeviation,
  findPeaks,
  findValleys,

  // Chart-specific analysis
  analyzeLineTrend,
  analyzeLines,
  analyzeBars,
  analyzePie,
  analyzeFunnel,
  analyzeBubbles,

  // Types
  type LinePoint,
  type LineData,
  type BarData,
  type SliceData,
  type StageData,
  type BubbleData
} from './insights.js';
