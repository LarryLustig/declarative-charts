/**
 * Built-in palette definitions for declarative charts.
 *
 * These palettes can be referenced by name using the `palette` attribute on charts:
 * ```html
 * <dc-chart palette="category10">
 * <dc-pie-chart palette="pastel">
 * <dc-funnel-chart palette="cool-to-warm">
 * ```
 *
 * Palette types:
 * - **Categorical**: Fixed list of distinct colors, cycles if more elements than colors
 * - **Sequential**: Two-color gradient, interpolated based on element count
 * - **Diverging**: Three-color gradient with a midpoint, for data with meaningful center
 *
 * @module builtin-palettes
 */

// ============================================================================
// Types
// ============================================================================

/**
 * A categorical palette with a fixed list of colors.
 * Colors are assigned in order and cycle if there are more elements than colors.
 */
export interface CategoricalPalette {
  type: 'categorical';
  /** Display name for documentation/tooling */
  name: string;
  /** Description of the palette's intended use */
  description: string;
  /** Array of color values (hex, rgb, hsl, or named colors) */
  colors: string[];
}

/**
 * A sequential palette that interpolates between two colors.
 * The number of generated colors matches the number of chart elements.
 */
export interface SequentialPalette {
  type: 'sequential';
  /** Display name for documentation/tooling */
  name: string;
  /** Description of the palette's intended use */
  description: string;
  /** Starting color of the gradient */
  start: string;
  /** Ending color of the gradient */
  end: string;
}

/**
 * A diverging palette that interpolates from start through middle to end.
 * Useful for data with a meaningful center point (e.g., positive/negative values).
 */
export interface DivergingPalette {
  type: 'diverging';
  /** Display name for documentation/tooling */
  name: string;
  /** Description of the palette's intended use */
  description: string;
  /** Starting color (e.g., negative extreme) */
  start: string;
  /** Middle color (e.g., zero or neutral) */
  middle: string;
  /** Ending color (e.g., positive extreme) */
  end: string;
}

export type BuiltinPalette = CategoricalPalette | SequentialPalette | DivergingPalette;

// ============================================================================
// Categorical Palettes
// ============================================================================

/**
 * Default categorical palette - balanced, professional colors.
 * Good general-purpose palette for most chart types.
 */
const DEFAULT: CategoricalPalette = {
  type: 'categorical',
  name: 'Default',
  description: 'Balanced, professional colors suitable for most charts',
  colors: [
    '#4e79a7',  // Steel blue
    '#f28e2c',  // Orange
    '#e15759',  // Red
    '#76b7b2',  // Teal
    '#59a14f',  // Green
    '#edc949',  // Yellow
    '#af7aa1',  // Purple
    '#ff9da7',  // Pink
    '#9c755f',  // Brown
    '#bab0ab',  // Gray
  ]
};

/**
 * D3 Category10 palette - classic categorical colors.
 * Widely recognized, good for up to 10 categories.
 */
const CATEGORY10: CategoricalPalette = {
  type: 'categorical',
  name: 'Category 10',
  description: 'Classic D3 categorical palette with 10 distinct colors',
  colors: [
    '#1f77b4',  // Blue
    '#ff7f0e',  // Orange
    '#2ca02c',  // Green
    '#d62728',  // Red
    '#9467bd',  // Purple
    '#8c564b',  // Brown
    '#e377c2',  // Pink
    '#7f7f7f',  // Gray
    '#bcbd22',  // Olive
    '#17becf',  // Cyan
  ]
};

/**
 * Pastel palette - softer, muted colors.
 * Good for less aggressive visualizations or backgrounds.
 */
const PASTEL: CategoricalPalette = {
  type: 'categorical',
  name: 'Pastel',
  description: 'Soft, muted colors for gentle visualizations',
  colors: [
    '#a1c9f4',  // Light blue
    '#ffb482',  // Light orange
    '#8de5a1',  // Light green
    '#ff9f9b',  // Light red
    '#d0bbff',  // Light purple
    '#debb9b',  // Light brown
    '#fab0e4',  // Light pink
    '#cfcfcf',  // Light gray
    '#fffea3',  // Light yellow
    '#b9f2f0',  // Light cyan
  ]
};

/**
 * Vivid palette - high saturation, bold colors.
 * Maximum visual impact, good for emphasis.
 */
const VIVID: CategoricalPalette = {
  type: 'categorical',
  name: 'Vivid',
  description: 'High saturation colors for maximum visual impact',
  colors: [
    '#0066ff',  // Vivid blue
    '#ff6600',  // Vivid orange
    '#00cc44',  // Vivid green
    '#ff0044',  // Vivid red
    '#9933ff',  // Vivid purple
    '#cc6600',  // Vivid brown
    '#ff0099',  // Vivid pink
    '#666666',  // Medium gray
    '#cccc00',  // Vivid yellow
    '#00cccc',  // Vivid cyan
  ]
};

/**
 * Earth tones palette - natural, organic colors.
 * Good for environmental or natural data.
 */
const EARTH: CategoricalPalette = {
  type: 'categorical',
  name: 'Earth',
  description: 'Natural, organic colors inspired by nature',
  colors: [
    '#8b4513',  // Saddle brown
    '#228b22',  // Forest green
    '#daa520',  // Goldenrod
    '#cd853f',  // Peru
    '#556b2f',  // Dark olive green
    '#d2691e',  // Chocolate
    '#6b8e23',  // Olive drab
    '#a0522d',  // Sienna
    '#2e8b57',  // Sea green
    '#b8860b',  // Dark goldenrod
  ]
};

/**
 * Ocean palette - blues and teals.
 * Good for water-related or calm visualizations.
 */
const OCEAN: CategoricalPalette = {
  type: 'categorical',
  name: 'Ocean',
  description: 'Blues and teals inspired by the sea',
  colors: [
    '#003f5c',  // Dark blue
    '#2f4b7c',  // Navy
    '#665191',  // Purple-blue
    '#006d77',  // Teal
    '#83c5be',  // Light teal
    '#468faf',  // Steel blue
    '#5fa8d3',  // Light steel blue
    '#62b6cb',  // Sky blue
    '#bee9e8',  // Pale cyan
    '#1d3557',  // Prussian blue
  ]
};

/**
 * Colorblind-safe palette - distinguishable for most color vision deficiencies.
 * Based on Wong (2011) and IBM Design palette recommendations.
 */
const COLORBLIND_SAFE: CategoricalPalette = {
  type: 'categorical',
  name: 'Colorblind Safe',
  description: 'Optimized for color vision deficiency accessibility',
  colors: [
    '#0077bb',  // Blue
    '#ee7733',  // Orange
    '#009988',  // Teal
    '#cc3311',  // Red
    '#33bbee',  // Cyan
    '#ee3377',  // Magenta
    '#bbbbbb',  // Gray
    '#000000',  // Black
  ]
};

/**
 * High contrast palette - maximum distinction between colors.
 * Good for accessibility and small elements.
 */
const HIGH_CONTRAST: CategoricalPalette = {
  type: 'categorical',
  name: 'High Contrast',
  description: 'Maximum visual distinction for accessibility',
  colors: [
    '#000000',  // Black
    '#0000ff',  // Blue
    '#ff0000',  // Red
    '#00aa00',  // Green
    '#ff00ff',  // Magenta
    '#00cccc',  // Cyan
    '#ff8800',  // Orange
    '#8800ff',  // Purple
  ]
};

// ============================================================================
// Sequential (Gradient) Palettes
// ============================================================================

/**
 * Cool to warm gradient - blue to red through green/yellow.
 * Classic "temperature" scale, good for funnels and progress.
 * This is the default for funnel charts.
 */
const COOL_TO_WARM: SequentialPalette = {
  type: 'sequential',
  name: 'Cool to Warm',
  description: 'Blue to red gradient, classic temperature scale',
  start: '#3b82f6',  // Blue
  end: '#ef4444',    // Red
};

/**
 * Blue gradient - light to dark blue.
 * Good for single-hue sequential data.
 */
const BLUES: SequentialPalette = {
  type: 'sequential',
  name: 'Blues',
  description: 'Light to dark blue gradient',
  start: '#dbeafe',  // Very light blue
  end: '#1e40af',    // Dark blue
};

/**
 * Greens gradient - light to dark green.
 * Good for growth, nature, or positive metrics.
 */
const GREENS: SequentialPalette = {
  type: 'sequential',
  name: 'Greens',
  description: 'Light to dark green gradient',
  start: '#dcfce7',  // Very light green
  end: '#166534',    // Dark green
};

/**
 * Reds gradient - light to dark red.
 * Good for intensity, heat, or urgency.
 */
const REDS: SequentialPalette = {
  type: 'sequential',
  name: 'Reds',
  description: 'Light to dark red gradient',
  start: '#fee2e2',  // Very light red
  end: '#991b1b',    // Dark red
};

/**
 * Purples gradient - light to dark purple.
 * Good for luxury, creativity, or unique data.
 */
const PURPLES: SequentialPalette = {
  type: 'sequential',
  name: 'Purples',
  description: 'Light to dark purple gradient',
  start: '#f3e8ff',  // Very light purple
  end: '#6b21a8',    // Dark purple
};

/**
 * Warm gradient - yellow through orange to red.
 * Good for heat maps or intensity data.
 */
const WARM: SequentialPalette = {
  type: 'sequential',
  name: 'Warm',
  description: 'Yellow to red warm gradient',
  start: '#fef08a',  // Yellow
  end: '#dc2626',    // Red
};

/**
 * Cool gradient - cyan through blue.
 * Good for cold/calm data or technology themes.
 */
const COOL: SequentialPalette = {
  type: 'sequential',
  name: 'Cool',
  description: 'Cyan to blue cool gradient',
  start: '#a5f3fc',  // Light cyan
  end: '#1e3a8a',    // Dark blue
};

/**
 * Sunset gradient - warm oranges and pinks.
 * Aesthetically pleasing for marketing or creative uses.
 */
const SUNSET: SequentialPalette = {
  type: 'sequential',
  name: 'Sunset',
  description: 'Warm oranges and pinks like a sunset',
  start: '#fcd34d',  // Golden yellow
  end: '#be185d',    // Deep pink
};

/**
 * Viridis-inspired gradient - perceptually uniform, colorblind-friendly.
 * Good for scientific visualization.
 */
const VIRIDIS: SequentialPalette = {
  type: 'sequential',
  name: 'Viridis',
  description: 'Perceptually uniform, colorblind-friendly gradient',
  start: '#fde725',  // Yellow
  end: '#440154',    // Deep purple
};

// ============================================================================
// Diverging Palettes
// ============================================================================

/**
 * Red-White-Blue diverging palette.
 * Classic for positive/negative or political data.
 */
const RED_BLUE: DivergingPalette = {
  type: 'diverging',
  name: 'Red-Blue',
  description: 'Classic diverging palette for positive/negative values',
  start: '#dc2626',  // Red (negative)
  middle: '#f5f5f5', // Near white (neutral)
  end: '#2563eb',    // Blue (positive)
};

/**
 * Brown-White-Teal diverging palette.
 * Good for environmental/drought data.
 */
const BROWN_TEAL: DivergingPalette = {
  type: 'diverging',
  name: 'Brown-Teal',
  description: 'Diverging palette for environmental data',
  start: '#8b4513',  // Brown (dry)
  middle: '#f5f5f5', // Near white (neutral)
  end: '#0d9488',    // Teal (wet)
};

/**
 * Purple-White-Orange diverging palette.
 * Colorblind-friendly diverging option.
 */
const PURPLE_ORANGE: DivergingPalette = {
  type: 'diverging',
  name: 'Purple-Orange',
  description: 'Colorblind-friendly diverging palette',
  start: '#7c3aed',  // Purple
  middle: '#f5f5f5', // Near white (neutral)
  end: '#ea580c',    // Orange
};

// ============================================================================
// Registry
// ============================================================================

/**
 * All built-in palettes indexed by name.
 * Names are lowercase and hyphenated for consistency with HTML attributes.
 */
export const BUILTIN_PALETTES: Record<string, BuiltinPalette> = {
  // Categorical
  'default': DEFAULT,
  'category10': CATEGORY10,
  'pastel': PASTEL,
  'vivid': VIVID,
  'earth': EARTH,
  'ocean': OCEAN,
  'colorblind-safe': COLORBLIND_SAFE,
  'high-contrast': HIGH_CONTRAST,

  // Sequential (gradients)
  'cool-to-warm': COOL_TO_WARM,
  'blues': BLUES,
  'greens': GREENS,
  'reds': REDS,
  'purples': PURPLES,
  'warm': WARM,
  'cool': COOL,
  'sunset': SUNSET,
  'viridis': VIRIDIS,

  // Diverging
  'red-blue': RED_BLUE,
  'brown-teal': BROWN_TEAL,
  'purple-orange': PURPLE_ORANGE,
};

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Get a built-in palette by name.
 *
 * @param name Palette name (case-insensitive, hyphenated)
 * @returns The palette definition, or undefined if not found
 *
 * @example
 * const palette = getBuiltinPalette('category10');
 * if (palette?.type === 'categorical') {
 *   console.log(palette.colors);
 * }
 */
export function getBuiltinPalette(name: string): BuiltinPalette | undefined {
  return BUILTIN_PALETTES[name.toLowerCase()];
}

/**
 * Check if a name refers to a built-in palette.
 *
 * @param name Palette name to check
 * @returns true if the name is a built-in palette
 *
 * @example
 * if (isBuiltinPalette('category10')) {
 *   // Use built-in palette
 * } else {
 *   // Look up external palette by ID
 * }
 */
export function isBuiltinPalette(name: string): boolean {
  return name.toLowerCase() in BUILTIN_PALETTES;
}

/**
 * Get all available built-in palette names.
 *
 * @returns Array of palette names
 */
export function getBuiltinPaletteNames(): string[] {
  return Object.keys(BUILTIN_PALETTES);
}

/**
 * Get built-in palettes filtered by type.
 *
 * @param type The palette type to filter by
 * @returns Array of [name, palette] pairs
 *
 * @example
 * const gradients = getBuiltinPalettesByType('sequential');
 */
export function getBuiltinPalettesByType(
  type: 'categorical' | 'sequential' | 'diverging'
): Array<[string, BuiltinPalette]> {
  return Object.entries(BUILTIN_PALETTES).filter(
    ([, palette]) => palette.type === type
  );
}

// ============================================================================
// Color Generation Utilities
// ============================================================================

/**
 * Generate colors from a built-in palette for a specific count of elements.
 *
 * - Categorical: Returns colors in order, cycling if count > palette size
 * - Sequential: Interpolates between start and end colors
 * - Diverging: Interpolates through start, middle, and end colors
 *
 * @param palette The palette to generate colors from
 * @param count Number of colors needed
 * @returns Array of color strings
 *
 * @example
 * const palette = getBuiltinPalette('cool-to-warm');
 * const colors = generatePaletteColors(palette, 5);
 * // Returns 5 interpolated colors from blue to red
 */
export function generatePaletteColors(
  palette: BuiltinPalette,
  count: number
): string[] {
  if (count <= 0) return [];

  switch (palette.type) {
    case 'categorical':
      return generateCategoricalColors(palette.colors, count);

    case 'sequential':
      return interpolateColors(palette.start, palette.end, count);

    case 'diverging':
      return interpolateDivergingColors(
        palette.start,
        palette.middle,
        palette.end,
        count
      );
  }
}

/**
 * Generate categorical colors, cycling if needed.
 */
function generateCategoricalColors(colors: string[], count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
}

/**
 * Interpolate between two colors.
 */
function interpolateColors(
  startColor: string,
  endColor: string,
  count: number
): string[] {
  if (count === 1) return [startColor];
  if (count === 2) return [startColor, endColor];

  const start = parseHexColor(startColor);
  const end = parseHexColor(endColor);

  if (!start || !end) {
    // Fallback: return start color repeated
    return Array(count).fill(startColor);
  }

  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const r = Math.round(start.r + (end.r - start.r) * t);
    const g = Math.round(start.g + (end.g - start.g) * t);
    const b = Math.round(start.b + (end.b - start.b) * t);
    colors.push(rgbToHex(r, g, b));
  }

  return colors;
}

/**
 * Interpolate through three colors for diverging palettes.
 */
function interpolateDivergingColors(
  startColor: string,
  middleColor: string,
  endColor: string,
  count: number
): string[] {
  if (count === 1) return [middleColor];
  if (count === 2) return [startColor, endColor];
  if (count === 3) return [startColor, middleColor, endColor];

  const midIndex = Math.floor(count / 2);
  const firstHalf = interpolateColors(startColor, middleColor, midIndex + 1);
  const secondHalf = interpolateColors(middleColor, endColor, count - midIndex);

  // Remove duplicate middle color
  return [...firstHalf.slice(0, -1), ...secondHalf];
}

/**
 * Parse a hex color string to RGB components.
 */
function parseHexColor(color: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const hex = color.replace(/^#/, '');

  // Handle 3-character hex
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }

  // Handle 6-character hex
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }

  return null;
}

/**
 * Convert RGB components to hex color string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ============================================================================
// Default Palette for Chart Types
// ============================================================================

/**
 * Get the default palette name for a chart type.
 *
 * @param chartType The chart element type
 * @returns Default palette name for that chart type
 */
export function getDefaultPaletteForChart(
  chartType: 'dc-chart' | 'dc-pie-chart' | 'dc-funnel-chart'
): string {
  switch (chartType) {
    case 'dc-funnel-chart':
      return 'cool-to-warm';
    case 'dc-pie-chart':
      return 'default';
    case 'dc-chart':
    default:
      return 'default';
  }
}
