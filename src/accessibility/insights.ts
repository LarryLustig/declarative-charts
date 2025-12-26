/**
 * Auto-insights generation for accessibility descriptions.
 *
 * These functions analyze chart data to generate meaningful descriptions
 * that go beyond raw statistics. Particularly valuable for dynamically-generated
 * charts where authors don't have context to provide custom descriptions.
 */

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate the average of an array of numbers.
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate the standard deviation of an array of numbers.
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = average(values);
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(average(squaredDiffs));
}

/**
 * Find local peaks (local maxima) in a series of values.
 * A peak is a value greater than both its neighbors.
 */
export function findPeaks(values: number[], labels: string[]): string[] {
  const peaks: string[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
      peaks.push(labels[i]);
    }
  }
  // Also check if first or last is the global maximum
  if (values.length >= 2) {
    const maxIndex = values.indexOf(Math.max(...values));
    if (maxIndex === 0 || maxIndex === values.length - 1) {
      if (!peaks.includes(labels[maxIndex])) {
        peaks.push(labels[maxIndex]);
      }
    }
  }
  return peaks;
}

/**
 * Find local valleys (local minima) in a series of values.
 * A valley is a value less than both its neighbors.
 */
export function findValleys(values: number[], labels: string[]): string[] {
  const valleys: string[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] < values[i - 1] && values[i] < values[i + 1]) {
      valleys.push(labels[i]);
    }
  }
  return valleys;
}

// ============================================================================
// Line Chart Analysis
// ============================================================================

export interface LinePoint {
  value: number;
  label: string;
}

export interface LineData {
  label: string;
  points: LinePoint[];
}

/**
 * Analyze the trend of a single line's data points.
 * Returns a human-readable description of the trend.
 */
export function analyzeLineTrend(points: LinePoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `single point at ${points[0].value}`;

  const values = points.map(p => p.value);
  const labels = points.map(p => p.label);

  const first = values[0];
  const last = values[values.length - 1];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = average(values);

  // Calculate percent change from first to last
  const change = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;

  // Calculate volatility (coefficient of variation)
  const volatility = avg !== 0 ? standardDeviation(values) / Math.abs(avg) : 0;

  // Determine trend direction
  let trend = '';
  if (Math.abs(change) < 5) {
    trend = 'relatively flat';
  } else if (change > 20) {
    trend = 'strong upward trend';
  } else if (change > 0) {
    trend = 'gradual upward trend';
  } else if (change < -20) {
    trend = 'strong downward trend';
  } else {
    trend = 'gradual downward trend';
  }

  // Add volatility qualifier if significant
  if (volatility > 0.3) {
    trend = `volatile with ${trend}`;
  }

  // Find peak and valley labels
  const maxIndex = values.indexOf(max);
  const minIndex = values.indexOf(min);

  // Build description
  const parts: string[] = [trend];

  // Only mention peak/valley if they're not at the endpoints (more interesting)
  if (maxIndex > 0 && maxIndex < values.length - 1) {
    parts.push(`peaked at ${labels[maxIndex]}`);
  } else if (max !== min) {
    parts.push(`highest at ${labels[maxIndex]} (${max})`);
  }

  if (minIndex > 0 && minIndex < values.length - 1 && minIndex !== maxIndex) {
    parts.push(`lowest at ${labels[minIndex]}`);
  }

  return parts.join(', ');
}

/**
 * Analyze multiple lines and generate a combined description.
 */
export function analyzeLines(lines: LineData[]): string {
  if (lines.length === 0) return '';

  if (lines.length === 1) {
    const line = lines[0];
    const trend = analyzeLineTrend(line.points);
    return line.label ? `${line.label}: ${trend}` : trend;
  }

  // Multiple lines - describe each briefly
  const descriptions = lines.map(line => {
    const values = line.points.map(p => p.value);
    const first = values[0];
    const last = values[values.length - 1];
    const change = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;

    let direction = '';
    if (Math.abs(change) < 5) direction = 'flat';
    else if (change > 0) direction = 'up';
    else direction = 'down';

    return `${line.label} (${direction})`;
  });

  return descriptions.join(', ');
}

// ============================================================================
// Bar Chart Analysis
// ============================================================================

export interface BarData {
  label: string;
  value: number;
}

/**
 * Analyze bar chart data and generate a description.
 * Optionally compares against a reference/target value.
 */
export function analyzeBars(bars: BarData[], referenceValue?: number): string {
  if (bars.length === 0) return '';
  if (bars.length === 1) {
    return `single bar: ${bars[0].label} at ${bars[0].value}`;
  }

  const values = bars.map(b => b.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = average(values);

  const highest = bars.find(b => b.value === max)!;
  const lowest = bars.find(b => b.value === min)!;

  // Check if values are relatively consistent
  const spread = avg !== 0 ? (max - min) / Math.abs(avg) : 0;

  const parts: string[] = [];

  if (spread < 0.2) {
    parts.push(`values relatively consistent around ${Math.round(avg)}`);
  } else {
    parts.push(`${highest.label} highest at ${highest.value}`);
    if (lowest.label !== highest.label) {
      parts.push(`${lowest.label} lowest at ${lowest.value}`);
    }
  }

  // Compare against reference if provided
  if (referenceValue !== undefined) {
    const above = bars.filter(b => b.value >= referenceValue).map(b => b.label);
    const below = bars.filter(b => b.value < referenceValue).map(b => b.label);

    if (above.length === bars.length) {
      parts.push('all exceed target');
    } else if (below.length === bars.length) {
      parts.push('all below target');
    } else if (above.length > 0 && below.length > 0) {
      if (above.length <= 3) {
        parts.push(`target met in ${above.join(', ')}`);
      } else if (below.length <= 3) {
        parts.push(`target missed in ${below.join(', ')}`);
      } else {
        parts.push(`${above.length} of ${bars.length} met target`);
      }
    }
  }

  return parts.join('; ');
}

// ============================================================================
// Pie Chart Analysis
// ============================================================================

export interface SliceData {
  label: string;
  value: number;
}

/**
 * Analyze pie chart data and generate a description.
 */
export function analyzePie(slices: SliceData[]): string {
  if (slices.length === 0) return '';
  if (slices.length === 1) {
    return `single category: ${slices[0].label} (100%)`;
  }

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return 'no data';

  // Calculate percentages and sort by size
  const withPercent = slices
    .map(s => ({
      ...s,
      percent: (s.value / total) * 100
    }))
    .sort((a, b) => b.percent - a.percent);

  const dominant = withPercent[0];
  const smallest = withPercent[withPercent.length - 1];

  // Check if one slice dominates (>50%)
  if (dominant.percent > 50) {
    return `dominated by ${dominant.label} at ${Math.round(dominant.percent)}%`;
  }

  // Check if relatively evenly distributed
  const maxDiff = dominant.percent - smallest.percent;
  if (maxDiff < 15) {
    return `relatively evenly distributed across ${slices.length} categories`;
  }

  // Describe the range
  return `${dominant.label} leads at ${Math.round(dominant.percent)}%, ${smallest.label} smallest at ${Math.round(smallest.percent)}%`;
}

// ============================================================================
// Funnel Chart Analysis
// ============================================================================

export interface StageData {
  label: string;
  value: number;
}

/**
 * Analyze funnel chart data and generate a description.
 */
export function analyzeFunnel(stages: StageData[]): string {
  if (stages.length === 0) return '';
  if (stages.length === 1) {
    return `single stage: ${stages[0].label} with ${stages[0].value}`;
  }

  const first = stages[0].value;
  const last = stages[stages.length - 1].value;

  if (first === 0) return 'starts at zero';

  // Calculate overall conversion rate
  const overallConversion = (last / first) * 100;

  // Find biggest drop-off
  let biggestDrop = { from: '', to: '', retained: 100, dropPercent: 0 };
  for (let i = 1; i < stages.length; i++) {
    const prevValue = stages[i - 1].value;
    if (prevValue === 0) continue;

    const retained = (stages[i].value / prevValue) * 100;
    const dropPercent = 100 - retained;

    if (dropPercent > biggestDrop.dropPercent) {
      biggestDrop = {
        from: stages[i - 1].label,
        to: stages[i].label,
        retained,
        dropPercent
      };
    }
  }

  const parts: string[] = [];

  // Overall conversion
  parts.push(`${overallConversion.toFixed(1)}% overall conversion`);

  // Biggest drop-off (only mention if significant)
  if (biggestDrop.dropPercent > 20 && stages.length > 2) {
    parts.push(`biggest drop from ${biggestDrop.from} to ${biggestDrop.to} (${Math.round(biggestDrop.retained)}% retained)`);
  }

  return parts.join('; ');
}

// ============================================================================
// Bubble Chart Analysis
// ============================================================================

export interface BubbleData {
  label: string;
  value: number;
  sizeValue: number;
}

/**
 * Analyze bubble chart data and generate a description.
 */
export function analyzeBubbles(bubbles: BubbleData[]): string {
  if (bubbles.length === 0) return '';
  if (bubbles.length === 1) {
    return `single bubble: ${bubbles[0].label} at value ${bubbles[0].value}`;
  }

  // Find bubble with highest value
  const highestValue = bubbles.reduce((a, b) => a.value > b.value ? a : b);
  // Find bubble with largest size
  const largestSize = bubbles.reduce((a, b) => a.sizeValue > b.sizeValue ? a : b);

  const parts: string[] = [];

  parts.push(`${highestValue.label} has highest value (${highestValue.value})`);

  if (largestSize.label !== highestValue.label) {
    parts.push(`${largestSize.label} is largest by size`);
  }

  return parts.join('; ');
}
