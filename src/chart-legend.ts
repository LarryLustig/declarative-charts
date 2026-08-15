import { customElement, property } from 'lit/decorators.js';
import { LitElement, svg, SVGTemplateResult } from 'lit';
import { SVG_TEXT_STYLE_ATTRS, HTML_TO_SVG_WARNINGS, type TitleStyleWarning } from './chart-title.js';
import type { ChartTitle } from './chart-title.js';
import { ChartSwatch } from './chart-swatch.js';
import { resolveDasharray } from './chart-fill.js';
import { NumberFormatter } from './format.js';
import { ErrorCode } from './errors.js';
import type { ChartLegendItem } from './chart-legend-item.js';
import { showConditionConverter, evaluateShowCondition, type ShowCondition } from './converters.js';

/**
 * Shape types for legend indicators.
 * These map to the shapes supported by ChartSwatch.renderShape().
 */
export type LegendShape = 'square' | 'line' | 'circle';

/**
 * Base properties shared by all legend items.
 */
export interface BaseLegendItem {
  label: string;
  color: string;
  /** Shape for the legend indicator. Defaults to 'square'. */
  shape?: LegendShape;
  /**
   * Dash pattern for a `line` indicator, already resolved to an SVG value.
   *
   * Carried so a dashed series reads as dashed in the legend. `<dc-legend-item
   * stroke-dasharray>` used to be declared, documented, and read by nothing.
   */
  strokeDasharray?: string;
  /** Pattern type for a patterned fill, resolved by the chart into a `url(#id)`. */
  pattern?: string;
  /**
   * URL this entry links to, from `legend-href` on the element the entry
   * describes or `href` on a `<dc-legend-item>`.
   *
   * Never inherited from the element's own `href`. A chart whose bars link
   * somewhere did not ask for its legend to become clickable too, and a legend
   * that silently starts navigating is worse than one that never does.
   */
  href?: string;
  /** Link target, as on any other element that takes an `href`. */
  target?: string;
}

/**
 * Legend item with a quantitative value (bars, pie slices, funnel stages, bubbles).
 * Values can be displayed in the legend along with optional percentages.
 */
export interface ValuedLegendItem extends BaseLegendItem {
  value: number;
}

/**
 * Legend item without a quantitative value (lines, reference lines, annotations).
 * These items only show label and color indicator, no value or percentage.
 */
export interface DimensionlessLegendItem extends BaseLegendItem {
  dimensionless: true;
}

/**
 * Union type for all legend items.
 * Use ValuedLegendItem for items with quantitative values (bars, slices, etc.)
 * Use DimensionlessLegendItem for items without values (lines, annotations, etc.)
 */
export type LegendItem = ValuedLegendItem | DimensionlessLegendItem;

/**
 * Type guard to check if an item is dimensionless.
 */
export function isDimensionless(item: LegendItem): item is DimensionlessLegendItem {
  return 'dimensionless' in item && item.dimensionless === true;
}

/**
 * Patterns that indicate CSS units which don't work well in SVG viewBox coordinates.
 */
const CSS_UNIT_PATTERN = /^[\d.]+\s*(px|em|rem|pt|%)$/i;

export type LegendPosition =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'left'
  // | 'left-top'
  // | 'left-bottom'
  | 'right'
  // | 'right-top'
  // | 'right-bottom'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right';

/**
 * Legend element for charts
 *
 * This element doesn't render itself - instead it's detected by the parent
 * chart which uses its configuration to render a legend. The legend renders
 * as SVG text elements, so styling should use SVG presentation attributes.
 *
 * Style the legend text using SVG attributes (not CSS/HTML):
 * - Use `fill` for text color (not `color`)
 * - Use unitless `font-size` values in viewBox units (not `px`, `em`, `rem`)
 * - Use `font-family`, `font-weight`, `font-style` as normal
 *
 * @element dc-legend
 *
 * @attr {boolean} show-value - Whether to show values in legend (default: true)
 * @attr {boolean} show-percent - Whether to show percentages in legend (default: false)
 * @attr {boolean} show-label - Whether to show labels in legend (default: true)
 * @attr {string} columns - Number of columns: "auto" (default, calculates based on available space), integer for explicit tabular layout, or "*" for wrapped/inline layout
 * @attr {string} position - Position of the legend: "right" (default), "top", "top-left", "top-right", "left", "left-top", "left-bottom", "right-top", "right-bottom", "bottom", "bottom-left", "bottom-right"
 * @attr {string} max-width - Maximum width for the legend. Accepts px, rem, em, or % (percentage of chart width). If not specified, defaults to 80% for top/bottom positions, calculated content width for left/right with tabular columns, or 25% for left/right with columns="*"
 * @attr {string} fill - Text color for legend items (SVG attribute, e.g., "#333", "red")
 * @attr {number} font-size - Font size for legend items in viewBox units (e.g., "13", not "13px")
 * @attr {string} font-family - Font family for legend items
 * @attr {string} font-weight - Font weight for legend items
 *
 * @slot - Can contain a dc-title element to customize the legend title
 *
 * @example
 * <dc-chart width="600" height="400">
 *   <dc-title>Chart Title</dc-title>
 *   <dc-bar value="10" label="Jan"></dc-bar>
 *   <dc-legend></dc-legend>
 * </dc-chart>
 *
 * @example
 * <dc-chart width="600" height="400">
 *   <dc-title>Chart Title</dc-title>
 *   <dc-bar value="10" label="Jan"></dc-bar>
 *   <dc-legend show-value="false" show-percent="true">
 *     <dc-title>Categories</dc-title>
 *   </dc-legend>
 * </dc-chart>
 *
 * @example
 * <dc-chart width="600" height="400">
 *   <dc-title>Chart Title</dc-title>
 *   <dc-bar value="10" label="Jan"></dc-bar>
 *   <dc-legend position="bottom" columns="3" fill="#1a1a1a" font-size="14"></dc-legend>
 * </dc-chart>
 */
/** A legend item with its display strings resolved for this render. */
type PreparedLegendItem = LegendItem & {
  /** The label to draw, or null if this item's show-label condition excludes it. */
  displayLabel: string | null;
  /** The value/percent text to draw, or null if neither is shown. */
  displayValue: string | null;
  resolvedShape: LegendShape;
};

@customElement('dc-legend')
export class ChartLegend extends LitElement {
  /**
   * Whether to show values in the legend.
   *
   * Uses the same converter as every other `show-*` in the library, so a
   * threshold such as `show-value="10%"` means here what it means elsewhere.
   * This element used to declare its own boolean converter, under which
   * `show-value="10%"` silently evaluated to `true` - one attribute name with
   * two meanings depending on which element it was written on.
   */
  @property({ attribute: 'show-value', converter: showConditionConverter })
  showValue: ShowCondition = true;

  @property({ attribute: 'show-percent', converter: showConditionConverter })
  showPercent: ShowCondition = false;

  @property({ attribute: 'show-label', converter: showConditionConverter })
  showLabel: ShowCondition = true;

  /**
   * Supplied by the chart so a custom legend item's `pattern` can be resolved.
   *
   * Patterns live in the chart's `<defs>` and are registered during fill
   * resolution, which never sees `<dc-legend-item>` elements - so the chart
   * registers them here instead, and hands back the `url(#id)` to paint with.
   * Returns null when the pattern name is not recognised.
   */
  resolvePattern?: (type: string, fill: string, index: number) => string | null;

  @property({ type: String })
  columns: string = 'auto';

  @property({ type: String })
  position: LegendPosition = 'right';

  @property({ attribute: 'max-width', type: String })
  maxWidth: string | undefined = undefined;

  /**
   * Format for values displayed in the legend.
   * If not specified, inherits from parent chart's valueFormat.
   * Uses the same format syntax as chart's value-format attribute.
   *
   * @example
   * <dc-legend value-format="currency USD"></dc-legend>
   * <dc-legend value-format="compact 1"></dc-legend>
   */
  @property({ type: String, attribute: 'value-format' })
  valueFormat?: string;

  /**
   * Format for percentages displayed in the legend.
   * If not specified, inherits from parent chart's percentFormat.
   * Uses the same format syntax as chart's percent-format attribute.
   *
   * @example
   * <dc-legend percent-format="percent 0"></dc-legend>
   */
  @property({ type: String, attribute: 'percent-format' })
  percentFormat?: string;

  /**
   * Get the title element info including text, position, and SVG styles
   * @returns Object with text, position, and svgStyles, or null if no title
   */
  getTitleInfo(): { text: string; position: string; svgStyles: Record<string, string> } | null {
    const titleElement = this.querySelector('dc-title') as ChartTitle | null;
    if (!titleElement) return null;

    const text = titleElement.textContent?.trim();
    if (!text) return null;

    // Get position attribute, default to 'top' (centered above items)
    const position = titleElement.getAttribute('position') || 'top';

    // Get SVG style attributes from the title element
    const svgStyles = titleElement.getSvgStyleAttributes ? titleElement.getSvgStyleAttributes() : {};

    return { text, position, svgStyles };
  }

  /**
   * Get custom legend items defined as child `<dc-legend-item>` elements.
   * When custom items are present, they completely replace auto-generated legend items.
   *
   * @returns Array of LegendItems if custom items are defined, null otherwise
   *
   * @example
   * ```html
   * <dc-legend>
   *   <dc-legend-item fill="#4CAF50" label="Above Target"></dc-legend-item>
   *   <dc-legend-item fill="#FF9800" label="Near Target"></dc-legend-item>
   * </dc-legend>
   * ```
   */
  getCustomItems(): LegendItem[] | null {
    const itemElements = Array.from(this.querySelectorAll('dc-legend-item'))
      .filter(el => !el.hasAttribute('hidden')) as ChartLegendItem[];

    if (itemElements.length === 0) return null;

    const usable = itemElements.filter(item => item.label); // Skip items without labels

    // Returning an empty array here would be worse than returning null: the
    // caller does `customItems ?? items`, so `[]` counts as "custom items were
    // supplied" and silently discards the auto-generated ones. A single typo -
    // `lable="Revenue"` - emptied the whole legend with nothing logged.
    if (usable.length === 0) {
      console.warn(
        `[${ErrorCode.PARSE_ERROR.code}] legend.customItems: ` +
        `${itemElements.length} <dc-legend-item> element(s) have no label and were ignored; ` +
        `falling back to the chart's own legend items.`
      );
      return null;
    }

    return usable
      .map(item => {
        const color = item.getEffectiveColor();
        const shape = item.getEffectiveShape();
        const strokeDasharray = resolveDasharray(item.strokeDasharray);
        const pattern = item.pattern;
        const href = item.href || undefined;
        const target = item.target || undefined;

        // If value is provided, return ValuedLegendItem; otherwise DimensionlessLegendItem
        if (item.value !== undefined) {
          return {
            label: item.label || '',
            color,
            shape,
            strokeDasharray,
            pattern,
            href,
            target,
            value: item.value,
          } as ValuedLegendItem;
        } else {
          return {
            label: item.label || '',
            color,
            shape,
            strokeDasharray,
            pattern,
            href,
            target,
            dimensionless: true,
          } as DimensionlessLegendItem;
        }
      });
  }

  /**
   * Get SVG presentation attributes to pass through to the rendered legend text elements.
   * Only returns attributes that are valid SVG text styling attributes.
   * @returns Object with attribute names and values
   */
  getSvgStyleAttributes(): Record<string, string> {
    const svgAttrs: Record<string, string> = {};

    for (const attr of Array.from(this.attributes)) {
      if (SVG_TEXT_STYLE_ATTRS.has(attr.name)) {
        svgAttrs[attr.name] = attr.value;
      }
    }

    return svgAttrs;
  }

  /**
   * Check for common mistakes in attribute usage and return warnings.
   * Detects HTML/CSS attributes that should be SVG attributes, and CSS units
   * that don't work well in SVG viewBox coordinates.
   * @returns Array of warnings (empty if no issues detected)
   */
  getStyleWarnings(): TitleStyleWarning[] {
    const warnings: TitleStyleWarning[] = [];

    for (const attr of Array.from(this.attributes)) {
      // Check for HTML attributes that should be SVG attributes
      const htmlWarning = HTML_TO_SVG_WARNINGS[attr.name];
      if (htmlWarning) {
        warnings.push({
          attribute: attr.name,
          value: attr.value,
          message: `<dc-legend>: ${htmlWarning.message}. Found ${attr.name}="${attr.value}"`,
        });
      }

      // Check for CSS units in attributes that should be unitless
      if (attr.name === 'font-size' && CSS_UNIT_PATTERN.test(attr.value)) {
        warnings.push({
          attribute: attr.name,
          value: attr.value,
          message: `<dc-legend>: font-size should be unitless (viewBox units), not CSS units. Found font-size="${attr.value}". Use font-size="${parseFloat(attr.value)}" instead.`,
        });
      }
    }

    return warnings;
  }

  // ============================================================================
  // SVG Generation
  // ============================================================================

  /** Default font size for legend items */
  static readonly DEFAULT_FONT_SIZE = 13;

  /** Default font size for legend title */
  static readonly DEFAULT_TITLE_FONT_SIZE = 14;

  /** Layout constants for tabular legend */
  static readonly TABULAR = {
    itemHeight: 25,
    colorBoxWidth: 18,
    colorBoxGap: 7,
    labelValueGap: 10,
    itemPadding: 5,
    fontSize: 13,
    columnGap: 15,
    padding: 10, // padding inside background box
  };

  /**
   * viewBox units per CSS pixel, set by the parent chart before measuring or
   * drawing. 1 normally; under `text-scaling="fixed"` the chart supplies the
   * factor that keeps legend text a constant size on screen.
   */
  fontScale = 1;

  /** Layout constants for wrapped legend */
  static readonly WRAPPED = {
    lineHeight: 20,
    colorBoxWidth: 12,
    colorBoxGap: 4,
    itemGap: 12,
    fontSize: 12,
    padding: 10,
  };

  /**
   * Measure text width using Canvas API.
   * @param text Text to measure
   * @param fontSize Font size in pixels
   * @param fontFamily Optional font family
   * @returns Width in pixels
   */
  private measureText(text: string, fontSize: number, fontFamily?: string): number {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Fallback estimation
      return text.length * fontSize * 0.6;
    }
    ctx.font = `${fontSize}px ${fontFamily || 'sans-serif'}`;
    return ctx.measureText(text).width;
  }

  /**
   * Pre-compute display strings for each item based on show-label, show-value, show-percent.
   * Dimensionless items (lines, annotations) never show value or percent.
   */
  private prepareItems(
    items: LegendItem[],
    showLabel: ShowCondition,
    showValue: ShowCondition,
    showPercent: ShowCondition,
    formatter: NumberFormatter,
    valueFormat: string,
    percentFormat: string
  ): Array<PreparedLegendItem> {
    // Only sum valued items for percentage calculation
    const valuedItems = items.filter((item): item is ValuedLegendItem => !isDimensionless(item));
    const total = valuedItems.reduce((sum, item) => sum + item.value, 0);

    return items.map(item => {
      let displayValue: string | null = null;

      // Dimensionless items never show value or percent
      if (!isDimensionless(item)) {
        const percent = total > 0 ? (item.value / total) * 100 : 0;

        // Thresholds are per item, so this is evaluated inside the loop: with
        // show-value="10%", a 4% slice shows no value and a 40% one does.
        const wantValue = evaluateShowCondition(showValue, item.value, percent);
        const wantPercent = evaluateShowCondition(showPercent, item.value, percent);

        if (wantValue || wantPercent) {
          // Format value and percent using the formatter
          const formattedValue = formatter.format(item.value, valueFormat);
          const formattedPercent = formatter.format(percent / 100, percentFormat);

          if (wantValue && wantPercent) {
            displayValue = `${formattedValue} (${formattedPercent})`;
          } else if (wantValue) {
            displayValue = formattedValue;
          } else {
            displayValue = formattedPercent;
          }
        }
      }

      // The label is resolved per item for the same reason as the value, so
      // one attribute means one thing wherever it is written. A dimensionless
      // item has no value to compare, so a threshold cannot hide it.
      const labelPercent = isDimensionless(item) || total <= 0
        ? 100
        : (item.value / total) * 100;
      const labelValue = isDimensionless(item) ? Infinity : item.value;
      const displayLabel = evaluateShowCondition(showLabel, labelValue, labelPercent)
        ? (item.label || '')
        : null;

      // Resolve shape, defaulting to 'square'
      const resolvedShape: LegendShape = item.shape || 'square';

      // A patterned item paints with url(#id); the chart owns the <defs>.
      let color = item.color;
      if (item.pattern && this.resolvePattern) {
        const url = this.resolvePattern(item.pattern, item.color, items.indexOf(item));
        if (url) color = url;
      }

      return { ...item, color, displayLabel, displayValue, resolvedShape };
    });
  }

  /**
   * Calculate optimal number of columns for tabular layout based on available space.
   * @param items Items with display values
   * @param columnWidth Width of a single column
   * @param availableWidth Available width for the legend
   * @returns Optimal number of columns
   */
  private calculateAutoColumns(
    items: Array<{ label: string; displayValue: string | null }>,
    columnWidth: number,
    availableWidth: number
  ): number {
    const { columnGap } = ChartLegend.TABULAR;

    // Maximum columns that fit in available space
    const maxBySpace = Math.max(1, Math.floor((availableWidth + columnGap) / (columnWidth + columnGap)));

    // Maximum columns that make sense for the number of items
    const maxByItems = items.length;

    // Use the smaller of the two, but at least 1
    return Math.max(1, Math.min(maxBySpace, maxByItems));
  }

  /**
   * Get the dimensions of this legend element.
   * Returns the space the legend will occupy (width and height).
   *
   * @param items Array of legend items from the parent chart
   * @param chartWidth Chart width (for percentage-based max-width calculations)
   * @param chartShowValue Chart-level show-value setting
   * @param chartShowPercent Chart-level show-percent setting
   * @param chartValueFormat Chart-level value-format setting
   * @param chartPercentFormat Chart-level percent-format setting
   * @param chartLocale Chart-level locale setting
   * @returns Object with width and height in viewBox units
   */
  getDimensions(
    items: LegendItem[],
    chartWidth: number,
    chartShowValue: ShowCondition = true,
    chartShowPercent: ShowCondition = false,
    chartValueFormat: string = 'number',
    chartPercentFormat: string = 'percent 1',
    chartLocale?: string
  ): { width: number; height: number } {
    // Use custom items if defined, otherwise use auto-generated items
    const customItems = this.getCustomItems();
    const effectiveItems = customItems ?? items;

    if (!effectiveItems || effectiveItems.length === 0) {
      return { width: 0, height: 0 };
    }

    // Resolve show-* settings (legend attribute takes precedence over chart)
    const showLabel = this.hasAttribute('show-label') ? this.showLabel : true;
    const showValue = this.hasAttribute('show-value') ? this.showValue : chartShowValue;
    const showPercent = this.hasAttribute('show-percent') ? this.showPercent : chartShowPercent;

    // Resolve format settings (legend overrides chart)
    const valueFormat = this.valueFormat ?? chartValueFormat;
    const percentFormat = this.percentFormat ?? chartPercentFormat;

    // Create formatter with the chart's locale
    const formatter = new NumberFormatter({ locale: chartLocale });

    const itemsWithDisplay = this.prepareItems(
      effectiveItems, showLabel, showValue, showPercent,
      formatter, valueFormat, percentFormat
    );
    const titleInfo = this.getTitleInfo();

    const isHorizontalPosition = this.position.startsWith('top') || this.position.startsWith('bottom');

    // Calculate text widths
    const { fontSize: baseFontSize, colorBoxWidth, colorBoxGap, labelValueGap, itemPadding, columnGap, itemHeight, padding } = ChartLegend.TABULAR;
    const fontSize = baseFontSize * this.fontScale;
    const labelWidth = Math.max(
      ...itemsWithDisplay.map(item => this.measureText(item.displayLabel || '', fontSize))
    );
    const displayValueWidth = Math.max(
      ...itemsWithDisplay.map(item => this.measureText(item.displayValue || '', fontSize - 1))
    );
    const columnWidth = colorBoxWidth + colorBoxGap + labelWidth +
      (labelWidth > 0 && displayValueWidth > 0 ? labelValueGap : 0) +
      displayValueWidth + itemPadding;

    // Calculate title contributions
    const titleFontSize = ChartLegend.DEFAULT_TITLE_FONT_SIZE;
    const titleHeight = 25;

    let titleWidthContribution = 0;
    if (titleInfo && (titleInfo.position === 'left' || titleInfo.position === 'right')) {
      titleWidthContribution = titleFontSize + 10;
    }

    let titleHeightContribution = 0;
    if (titleInfo && (titleInfo.position === 'top' || titleInfo.position === 'bottom' ||
        titleInfo.position?.startsWith('top') || titleInfo.position?.startsWith('bottom'))) {
      titleHeightContribution = titleHeight;
    }

    let legendWidth: number;
    let legendHeight: number;

    if (this.columns === '*') {
      // Wrapped layout
      const { lineHeight, colorBoxWidth: wrappedColorBoxWidth, colorBoxGap: wrappedColorBoxGap,
              itemGap: wrappedItemGap, fontSize: baseWrappedFontSize, padding: wrappedPadding } = ChartLegend.WRAPPED;
      const wrappedFontSize = baseWrappedFontSize * this.fontScale;

      // Calculate maxWidth for wrapping
      let maxWidth: number;
      if (this.maxWidth) {
        maxWidth = this.parseCSSValue(this.maxWidth, chartWidth) ?? chartWidth * 0.8;
      } else if (isHorizontalPosition) {
        maxWidth = chartWidth * 0.8;
      } else {
        maxWidth = chartWidth * 0.25;
      }

      // Simulate wrapping to calculate height
      let currentX = 0;
      let currentY = 0;

      for (const item of itemsWithDisplay) {
        let text = '';
        if (item.displayLabel) text += item.displayLabel;
        if (item.displayValue) {
          text += item.displayLabel ? ` (${item.displayValue})` : item.displayValue;
        }

        const textWidth = this.measureText(text, wrappedFontSize);
        const itemWidth = wrappedColorBoxWidth + wrappedColorBoxGap + textWidth + wrappedItemGap;

        if (currentX + itemWidth > maxWidth && currentX > 0) {
          currentX = 0;
          currentY += lineHeight;
        }
        currentX += itemWidth;
      }

      legendWidth = maxWidth + titleWidthContribution + 2 * wrappedPadding;
      legendHeight = currentY + lineHeight + titleHeightContribution + 2 * wrappedPadding;
    } else {
      // Tabular layout
      let numColumns: number;
      if (this.columns === 'auto') {
        // For auto columns, estimate available width based on position
        const availableWidth = isHorizontalPosition ? chartWidth * 0.8 : chartWidth * 0.25;
        numColumns = this.calculateAutoColumns(itemsWithDisplay, columnWidth, availableWidth);
      } else {
        numColumns = Math.max(1, parseInt(this.columns, 10) || 1);
      }

      const contentWidth = numColumns * columnWidth + (numColumns - 1) * columnGap;
      const rowCount = Math.ceil(effectiveItems.length / numColumns);

      legendWidth = contentWidth + titleWidthContribution + 2 * padding;
      legendHeight = rowCount * itemHeight + titleHeightContribution + 2 * padding;
    }

    return { width: legendWidth, height: legendHeight };
  }

  /**
   * Parse a CSS value with optional unit, returning viewBox units.
   * Supports px, rem, em, and % (percentage of reference value).
   */
  private parseCSSValue(value: string, referenceValue: number): number | null {
    if (!value) return null;

    const trimmed = value.trim();

    // Percentage
    if (trimmed.endsWith('%')) {
      const percent = parseFloat(trimmed);
      if (!isNaN(percent)) {
        return (percent / 100) * referenceValue;
      }
      return null;
    }

    // px, rem, em - treat as direct viewBox units
    const numericMatch = trimmed.match(/^([\d.]+)\s*(px|rem|em)?$/i);
    if (numericMatch) {
      const num = parseFloat(numericMatch[1]);
      if (!isNaN(num)) {
        return num;
      }
    }

    return null;
  }

  /**
   * Generate SVG for this legend, rendered at origin (0,0).
   *
   * The legend is rendered with its top-left corner at (0,0).
   * The caller (BaseChart) is responsible for positioning using
   * `<g transform="translate(x, y)">`.
   *
   * @param items Array of legend items from the parent chart
   * @param chartWidth Chart width (for percentage-based calculations)
   * @param chartShowValue Chart-level show-value setting
   * @param chartShowPercent Chart-level show-percent setting
   * @param chartValueFormat Chart-level value-format setting
   * @param chartPercentFormat Chart-level percent-format setting
   * @param chartLocale Chart-level locale setting
   * @returns Object with width, height, and SVG template
   */
  generateSvg(
    items: LegendItem[],
    chartWidth: number,
    chartShowValue: ShowCondition = true,
    chartShowPercent: ShowCondition = false,
    chartValueFormat: string = 'number',
    chartPercentFormat: string = 'percent 1',
    chartLocale?: string
  ): {
    width: number;
    height: number;
    svg: SVGTemplateResult;
  } {
    // Use custom items if defined, otherwise use auto-generated items
    const customItems = this.getCustomItems();
    const effectiveItems = customItems ?? items;

    if (!effectiveItems || effectiveItems.length === 0) {
      return { width: 0, height: 0, svg: svg`` };
    }

    // Resolve show-* settings
    const showLabel = this.hasAttribute('show-label') ? this.showLabel : true;
    const showValue = this.hasAttribute('show-value') ? this.showValue : chartShowValue;
    const showPercent = this.hasAttribute('show-percent') ? this.showPercent : chartShowPercent;

    // Resolve format settings (legend overrides chart)
    const valueFormat = this.valueFormat ?? chartValueFormat;
    const percentFormat = this.percentFormat ?? chartPercentFormat;

    // Create formatter with the chart's locale
    const formatter = new NumberFormatter({ locale: chartLocale });

    const itemsWithDisplay = this.prepareItems(
      effectiveItems, showLabel, showValue, showPercent,
      formatter, valueFormat, percentFormat
    );
    const titleInfo = this.getTitleInfo();
    const isHorizontalPosition = this.position.startsWith('top') || this.position.startsWith('bottom');

    if (this.columns === '*') {
      return this.generateWrappedSvg(itemsWithDisplay, chartWidth, titleInfo, isHorizontalPosition);
    } else {
      return this.generateTabularSvg(itemsWithDisplay, chartWidth, titleInfo, isHorizontalPosition);
    }
  }

  /**
   * Generate SVG for tabular (grid) layout at 0,0.
   */
  private generateTabularSvg(
    items: PreparedLegendItem[],
    chartWidth: number,
    titleInfo: { text: string; position: string; svgStyles: Record<string, string> } | null,
    isHorizontalPosition: boolean
  ): { width: number; height: number; svg: SVGTemplateResult } {
    const { itemHeight, colorBoxWidth, colorBoxGap, labelValueGap, itemPadding, fontSize: baseFontSize, columnGap, padding } = ChartLegend.TABULAR;
    const fontSize = baseFontSize * this.fontScale;
    const titleFontSize = ChartLegend.DEFAULT_TITLE_FONT_SIZE;
    const titleHeight = 25;

    // Calculate text widths
    const labelWidth = Math.max(
      ...items.map(item => this.measureText(item.displayLabel || '', fontSize))
    );
    const displayValueWidth = Math.max(
      ...items.map(item => this.measureText(item.displayValue || '', fontSize - 1))
    );
    const columnWidth = colorBoxWidth + colorBoxGap + labelWidth +
      (labelWidth > 0 && displayValueWidth > 0 ? labelValueGap : 0) +
      displayValueWidth + itemPadding;

    // Calculate number of columns
    let numColumns: number;
    if (this.columns === 'auto') {
      const availableWidth = isHorizontalPosition ? chartWidth * 0.8 : chartWidth * 0.25;
      numColumns = this.calculateAutoColumns(items, columnWidth, availableWidth);
    } else {
      numColumns = Math.max(1, parseInt(this.columns, 10) || 1);
    }

    const contentWidth = numColumns * columnWidth + (numColumns - 1) * columnGap;
    const rowCount = Math.ceil(items.length / numColumns);
    const contentHeight = rowCount * itemHeight;

    // Calculate title contributions
    const titlePosition = titleInfo?.position || 'top';
    const isTitleVertical = titlePosition === 'left' || titlePosition === 'right';
    const isTitleHorizontal = titlePosition === 'top' || titlePosition === 'bottom' ||
        titlePosition.startsWith('top') || titlePosition.startsWith('bottom');

    const titleWidthContribution = (titleInfo && isTitleVertical) ? titleFontSize + 10 : 0;
    const titleHeightContribution = (titleInfo && isTitleHorizontal) ? titleHeight : 0;

    // Calculate background dimensions
    const bgWidth = contentWidth + titleWidthContribution + 2 * padding;
    const bgHeight = contentHeight + titleHeightContribution + 2 * padding;

    // Calculate content start position (inside padding, accounting for title)
    let contentX = padding;
    let contentY = padding;

    if (titleInfo) {
      if (titlePosition === 'left') {
        contentX = padding + titleWidthContribution;
      }
      if (titlePosition === 'top' || titlePosition.startsWith('top')) {
        contentY = padding + titleHeight;
      }
    }

    // Render title
    const renderTitle = () => {
      if (!titleInfo) return svg``;

      let titleX: number;
      let titleY: number;
      let textAnchor = 'middle';
      let transform = '';

      switch (titlePosition) {
        case 'top':
          titleX = contentX + contentWidth / 2;
          titleY = padding + titleFontSize;
          break;
        case 'top-left':
          titleX = contentX;
          titleY = padding + titleFontSize;
          textAnchor = 'start';
          break;
        case 'top-right':
          titleX = contentX + contentWidth;
          titleY = padding + titleFontSize;
          textAnchor = 'end';
          break;
        case 'bottom':
          titleX = contentX + contentWidth / 2;
          titleY = bgHeight - padding + 5;
          break;
        case 'bottom-left':
          titleX = contentX;
          titleY = bgHeight - padding + 5;
          textAnchor = 'start';
          break;
        case 'bottom-right':
          titleX = contentX + contentWidth;
          titleY = bgHeight - padding + 5;
          textAnchor = 'end';
          break;
        case 'left': {
          // Rotated title on left side
          const centerY = contentY + contentHeight / 2;
          titleX = padding + titleFontSize / 2;
          titleY = centerY;
          textAnchor = 'middle';
          transform = `rotate(-90, ${titleX}, ${titleY})`;
          break;
        }
        case 'right': {
          // Rotated title on right side
          const centerY = contentY + contentHeight / 2;
          titleX = bgWidth - padding - titleFontSize / 2;
          titleY = centerY;
          textAnchor = 'middle';
          transform = `rotate(90, ${titleX}, ${titleY})`;
          break;
        }
        default:
          titleX = contentX + contentWidth / 2;
          titleY = padding + titleFontSize;
      }

      return svg`
        <text
          part="legend-title"
          x="${titleX}"
          y="${titleY}"
          text-anchor="${textAnchor}"
          font-size="${titleFontSize}"
          font-weight="bold"
          fill="${titleInfo.svgStyles['fill'] || '#333'}"
          transform="${transform}"
        >
          ${titleInfo.text}
        </text>
      `;
    };

    return {
      width: bgWidth,
      height: bgHeight,
      svg: svg`
        <!-- Legend background -->
        <rect
          part="legend-background"
          x="0"
          y="0"
          width="${bgWidth}"
          height="${bgHeight}"
          fill="white"
          stroke="#ddd"
          stroke-width="1"
          rx="4"
        />

        ${renderTitle()}

        <!-- Legend items -->
        ${items.map((item, index) => {
          const col = index % numColumns;
          const row = Math.floor(index / numColumns);
          const itemX = contentX + col * (columnWidth + columnGap);
          const itemY = contentY + row * itemHeight;
          const labelX = itemX + colorBoxWidth + colorBoxGap;
          const valueX = labelX + labelWidth + (labelWidth > 0 ? labelValueGap : 0);

          return ChartLegend.linked(item, svg`
            <!-- Shape indicator -->
            <g part="legend-swatch" transform="translate(${itemX}, ${itemY})">
              ${ChartSwatch.renderShape(item.resolvedShape, 18, item.color, 'white', item.strokeDasharray)}
            </g>

            ${item.displayLabel ? svg`
              <!-- Label -->
              <text
                part="legend-label"
                x="${labelX}"
                y="${itemY + 13}"
                font-size="${fontSize}"
                fill="#333"
              >
                ${item.displayLabel}
              </text>
            ` : ''}

            ${item.displayValue ? svg`
              <!-- Value/Percent -->
              <text
                part="legend-value"
                x="${valueX}"
                y="${itemY + 13}"
                font-size="${fontSize - 1}"
                fill="#666"
              >
                ${item.displayValue}
              </text>
            ` : ''}
          `);
        })}
      `
    };
  }

  /**
   * Generate SVG for wrapped (inline flow) layout at 0,0.
   */
  private generateWrappedSvg(
    items: PreparedLegendItem[],
    chartWidth: number,
    titleInfo: { text: string; position: string; svgStyles: Record<string, string> } | null,
    isHorizontalPosition: boolean
  ): { width: number; height: number; svg: SVGTemplateResult } {
    const { lineHeight, colorBoxWidth, colorBoxGap, itemGap, fontSize: baseFontSize, padding } = ChartLegend.WRAPPED;
    const fontSize = baseFontSize * this.fontScale;
    const titleFontSize = ChartLegend.DEFAULT_TITLE_FONT_SIZE;
    const titleHeight = 20;

    // Calculate maxWidth for wrapping
    let maxWidth: number;
    if (this.maxWidth) {
      maxWidth = this.parseCSSValue(this.maxWidth, chartWidth) ?? chartWidth * 0.8;
    } else if (isHorizontalPosition) {
      maxWidth = chartWidth * 0.8;
    } else {
      maxWidth = chartWidth * 0.25;
    }

    // Calculate title contributions
    const titlePosition = titleInfo?.position || 'top';
    const isTitleVertical = titlePosition === 'left' || titlePosition === 'right';
    const isTitleHorizontal = titlePosition === 'top' || titlePosition === 'bottom' ||
        titlePosition.startsWith('top') || titlePosition.startsWith('bottom');

    const titleWidthContribution = (titleInfo && isTitleVertical) ? titleFontSize + 10 : 0;
    const titleHeightContribution = (titleInfo && isTitleHorizontal) ? titleHeight : 0;

    // Calculate content start position
    let contentX = padding;
    let contentY = padding;
    let effectiveMaxWidth = maxWidth - 2 * padding;

    if (titleInfo) {
      if (titlePosition === 'left') {
        contentX = padding + titleWidthContribution;
        effectiveMaxWidth = maxWidth - titleWidthContribution - 2 * padding;
      } else if (titlePosition === 'right') {
        effectiveMaxWidth = maxWidth - titleWidthContribution - 2 * padding;
      }
      if (titlePosition === 'top' || titlePosition.startsWith('top')) {
        contentY = padding + titleHeight;
      }
    }

    // Build positioned items with wrapping
    let currentX = 0;
    let currentY = 0;

    const positionedItems = items.map(item => {
      let text = '';
      if (item.displayLabel) text += item.displayLabel;
      if (item.displayValue) {
        text += item.displayLabel ? ` (${item.displayValue})` : item.displayValue;
      }

      const textWidth = this.measureText(text, fontSize);
      const itemWidth = colorBoxWidth + colorBoxGap + textWidth + itemGap;

      // Check if we need to wrap
      if (currentX + itemWidth > effectiveMaxWidth && currentX > 0) {
        currentX = 0;
        currentY += lineHeight;
      }

      const itemX = currentX;
      const itemY = currentY;

      currentX += itemWidth;

      return { ...item, x: itemX, y: itemY, text };
    });

    // Calculate content height
    const contentHeight = currentY + lineHeight;

    // Calculate background dimensions
    const bgWidth = maxWidth + titleWidthContribution;
    const bgHeight = contentHeight + titleHeightContribution + 2 * padding;

    // Render title
    const renderTitle = () => {
      if (!titleInfo) return svg``;

      let titleX: number;
      let titleY: number;
      let textAnchor = 'middle';
      let transform = '';

      switch (titlePosition) {
        case 'top':
          titleX = bgWidth / 2;
          titleY = padding + titleFontSize;
          break;
        case 'top-left':
          titleX = padding;
          titleY = padding + titleFontSize;
          textAnchor = 'start';
          break;
        case 'top-right':
          titleX = bgWidth - padding;
          titleY = padding + titleFontSize;
          textAnchor = 'end';
          break;
        case 'bottom':
          titleX = bgWidth / 2;
          titleY = bgHeight - padding + 5;
          break;
        case 'bottom-left':
          titleX = padding;
          titleY = bgHeight - padding + 5;
          textAnchor = 'start';
          break;
        case 'bottom-right':
          titleX = bgWidth - padding;
          titleY = bgHeight - padding + 5;
          textAnchor = 'end';
          break;
        case 'left': {
          const centerY = contentY + contentHeight / 2;
          titleX = padding + titleFontSize / 2;
          titleY = centerY;
          textAnchor = 'middle';
          transform = `rotate(-90, ${titleX}, ${titleY})`;
          break;
        }
        case 'right': {
          const centerY = contentY + contentHeight / 2;
          titleX = bgWidth - padding - titleFontSize / 2;
          titleY = centerY;
          textAnchor = 'middle';
          transform = `rotate(90, ${titleX}, ${titleY})`;
          break;
        }
        default:
          titleX = bgWidth / 2;
          titleY = padding + titleFontSize;
      }

      return svg`
        <text
          x="${titleX}"
          y="${titleY}"
          text-anchor="${textAnchor}"
          font-size="${titleFontSize}"
          font-weight="bold"
          fill="${titleInfo.svgStyles['fill'] || '#333'}"
          transform="${transform}"
        >
          ${titleInfo.text}
        </text>
      `;
    };

    return {
      width: bgWidth,
      height: bgHeight,
      svg: svg`
        <!-- Legend background -->
        <rect
          x="0"
          y="0"
          width="${bgWidth}"
          height="${bgHeight}"
          fill="white"
          stroke="#ddd"
          stroke-width="1"
          rx="4"
        />

        ${renderTitle()}

        <!-- Wrapped legend items -->
        ${positionedItems.map(item => ChartLegend.linked(item, svg`
          <!-- Shape indicator -->
          <g part="legend-swatch" transform="translate(${contentX + item.x}, ${contentY + item.y})">
            ${ChartSwatch.renderShape(item.resolvedShape, 12, item.color, 'white', item.strokeDasharray)}
          </g>

          <!-- Item text -->
          <text
            part="legend-label"
            x="${contentX + item.x + colorBoxWidth + colorBoxGap}"
            y="${contentY + item.y + 10}"
            font-size="${fontSize}"
            fill="#333"
          >
            ${item.text}
          </text>
        `))}
      `
    };
  }

  /**
   * Wrap a rendered entry in an SVG link, when it has somewhere to go.
   *
   * A real `<a>` rather than a click handler, so the entry behaves like a link
   * in every way a reader expects: middle-click, open in a new tab, copy the
   * address, and reachable by keyboard without the chart having to reimplement
   * any of it.
   *
   * The whole entry is wrapped - swatch, label and value - because a link that
   * only covers the words is a smaller target than it looks.
   */
  private static linked(
    item: { href?: string; target?: string },
    content: SVGTemplateResult
  ): SVGTemplateResult {
    if (!item.href) return content;
    return svg`<a
      part="legend-link"
      href="${item.href}"
      target="${item.target || '_self'}"
      style="cursor: pointer"
    >${content}</a>`;
  }

  // Don't render anything - the parent chart will render the legend
  protected render() {
    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-legend': ChartLegend;
  }
}
