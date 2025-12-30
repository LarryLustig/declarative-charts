import { customElement, property } from 'lit/decorators.js';
import { svg, SVGTemplateResult } from 'lit';
import { BaseChart, type ShowCondition, type FocusableElement } from './base-chart.js';
import type { LegendItem } from './chart-legend.js';
import type { ChartStage, StageShape } from './chart-stage.js';
import type { ChartPopup } from './chart-popup.js';
import { analyzeFunnel, type StageData as InsightStageData } from './accessibility/index.js';

/**
 * Zero value display styles
 */
export type ZeroStyle = 'ghost' | 'hidden' | 'dot' | 'normal';

/**
 * Connector types for stage connections
 */
export type ConnectorType = 'line' | 'arrow' | 'none';

/**
 * Parsed connector configuration
 */
interface ConnectorConfig {
  type: ConnectorType;
  color: string;
  width: number;
  arrowSize: number;
}

/**
 * Stage chart component that renders stages as shapes with area proportional to value
 *
 * @element dc-stage-chart
 *
 * @attr {number} width - Width of the chart in pixels (default: 600)
 * @attr {number} height - Height of the chart in pixels (default: 400)
 * @attr {string} orientation - "vertical" (default) or "horizontal"
 * @attr {StageShape} shape - Default shape: "rectangle", "square", "oval", "circle"
 * @attr {string} corner-radius - Corner radius for rectangles (e.g., "8px", "10%")
 * @attr {number} aspect-ratio - Width:height ratio for rectangles/ovals (default: 2)
 * @attr {string} stage-size - Size mode: omit for equal, "value", "log-value", or fixed like "100px"
 * @attr {string} stage-min-size - Minimum stage dimension (e.g., "30px")
 * @attr {string} stage-max-size - Maximum stage dimension (e.g., "200px")
 * @attr {string} gap - Space between stages (e.g., "20px", "5%", "0")
 * @attr {string} connector - Connector style: "line", "arrow", "none", or compound like "arrow 2 #333"
 * @attr {ZeroStyle} zero-style - How to render value=0: "ghost", "hidden", "dot", "normal"
 * @attr {string} palette - Palette for stage colors
 * @attr {string} stroke - Shorthand for stroke color and width
 * @attr {string} stroke-color - Stroke color for stage borders (default: #e0e0e0)
 * @attr {number} stroke-width - Stroke width for stage borders (default: 1)
 *
 * @slot - Child elements: dc-title, dc-stage, dc-legend, dc-palette
 *
 * @example
 * <dc-stage-chart width="400" height="500" stage-size="value">
 *   <dc-title>Project Pipeline</dc-title>
 *   <dc-stage value="50" label="Backlog"></dc-stage>
 *   <dc-stage value="120" label="In Progress"></dc-stage>
 *   <dc-stage value="80" label="Review"></dc-stage>
 *   <dc-stage value="200" label="Done"></dc-stage>
 * </dc-stage-chart>
 *
 * @example
 * <dc-stage-chart orientation="horizontal" connector="arrow 2 #666">
 *   <dc-stage value="100" label="Q1"></dc-stage>
 *   <dc-stage value="150" label="Q2"></dc-stage>
 *   <dc-stage value="130" label="Q3"></dc-stage>
 * </dc-stage-chart>
 */
@customElement('dc-stage-chart')
export class StageChart extends BaseChart {
  @property({ type: String })
  orientation: 'vertical' | 'horizontal' = 'vertical';

  @property({ type: String })
  shape: StageShape = 'rectangle';

  @property({ type: String, attribute: 'corner-radius' })
  cornerRadius = '0';

  @property({ type: Number, attribute: 'aspect-ratio' })
  aspectRatio = 2;

  @property({ type: String, attribute: 'stage-size' })
  stageSize?: string;

  @property({ type: String, attribute: 'stage-min-size' })
  stageMinSize?: string;

  @property({ type: String, attribute: 'stage-max-size' })
  stageMaxSize?: string;

  @property({ type: String })
  gap = '20px';

  @property({ type: String })
  connector = 'line';

  @property({ type: String, attribute: 'zero-style' })
  zeroStyle: ZeroStyle = 'ghost';

  private clickedStageIndex = -1;

  /**
   * Cached layout computed during render.
   * Event handlers use this cached data rather than re-reading from DOM.
   * Cache is refreshed on each render cycle.
   */
  private cachedLayout: ReturnType<StageChart['calculateStageLayout']> = null;

  /**
   * Get all stage elements from the DOM
   */
  private getStages(): Array<{
    value: number;
    label: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    shape?: StageShape;
    cornerRadius?: string;
    showValue: ShowCondition;
    showLabel: ShowCondition;
    showPercent: ShowCondition;
    popup?: { content: string; trigger: string };
    autoPopup?: boolean;
    passthroughAttrs?: Record<string, string>;
    pattern?: string;
    patternStroke?: string;
    patternFill?: string;
    patternScale?: number;
    valueFormat?: string;
  }> {
    const stageElements = Array.from(
      this.querySelectorAll('dc-stage')
    ) as ChartStage[];

    const knownAttrs = new Set(['value', 'show-value', 'show-label', 'show-percent', 'shape', 'corner-radius']);

    return stageElements.map(stage => {
      const passthroughAttrs = stage.getPassthroughAttributes(knownAttrs);
      const popupEl = stage.querySelector('dc-popup') as ChartPopup | null;

      const showValue = stage.hasAttribute('show-value') ? stage.showValue! : this.showValue;
      const showLabel = stage.hasAttribute('show-label') ? stage.showLabel! : this.showLabel;
      const showPercent = stage.hasAttribute('show-percent') ? stage.showPercent! : this.showPercent;

      const effectiveFill = stage.getEffectiveFill();

      return {
        value: stage.value,
        label: stage.label,
        fill: effectiveFill || undefined,
        stroke: stage.stroke || undefined,
        strokeWidth: stage.strokeWidth,
        shape: stage.shape,
        cornerRadius: stage.cornerRadius,
        showValue,
        showLabel,
        showPercent,
        popup: popupEl
          ? { content: popupEl.content, trigger: popupEl.trigger }
          : undefined,
        autoPopup: stage.autoPopup,
        passthroughAttrs: Object.keys(passthroughAttrs).length > 0 ? passthroughAttrs : undefined,
        pattern: stage.pattern as string | undefined,
        patternStroke: stage.patternStroke,
        patternFill: stage.patternFill,
        patternScale: stage.patternScale,
        valueFormat: stage.valueFormat
      };
    });
  }

  /**
   * Generate default gradient colors
   */
  private generateDefaultColors(count: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      const hue = (i / count) * 360;
      colors.push(`hsl(${hue}, 65%, 55%)`);
    }
    return colors;
  }

  /**
   * Parse a size value to pixels
   */
  private parseSizeValue(value: string, referenceSize: number): number {
    const trimmed = value.trim();

    if (trimmed.endsWith('%')) {
      const percent = parseFloat(trimmed);
      return isNaN(percent) ? 0 : (percent / 100) * referenceSize;
    }

    if (trimmed.endsWith('rem')) {
      const rem = parseFloat(trimmed);
      return isNaN(rem) ? 0 : rem * 16;
    }

    const numeric = parseFloat(trimmed);
    return isNaN(numeric) ? 0 : numeric;
  }

  /**
   * Parse the gap value to pixels
   */
  private parseGap(referenceSize: number): number {
    return this.parseSizeValue(this.gap, referenceSize);
  }

  /**
   * Parse corner radius value
   */
  private parseCornerRadius(radiusStr: string, shapeWidth: number): number {
    if (!radiusStr || radiusStr === '0') return 0;
    return this.parseSizeValue(radiusStr, shapeWidth);
  }

  /**
   * Parse the connector attribute to extract type, color, width, and arrow size
   */
  private parseConnector(): ConnectorConfig {
    const defaults: ConnectorConfig = {
      type: 'line',
      color: '#999',
      width: 2,
      arrowSize: 8
    };

    if (!this.connector) return defaults;

    const parts = this.connector.trim().split(/\s+/);
    if (parts.length === 0) return defaults;

    const config = { ...defaults };

    for (const part of parts) {
      if (part === 'none' || part === 'line' || part === 'arrow') {
        config.type = part as ConnectorType;
      } else if (part.startsWith('#') || part.startsWith('rgb') || part.startsWith('hsl') || /^[a-z]+$/i.test(part)) {
        // Color value
        config.color = part;
      } else if (part.endsWith('px')) {
        // Could be width or arrow size - larger values are likely arrow size
        const value = parseFloat(part);
        if (!isNaN(value)) {
          if (value > 5) {
            config.arrowSize = value;
          } else {
            config.width = value;
          }
        }
      } else {
        const value = parseFloat(part);
        if (!isNaN(value)) {
          config.width = value;
        }
      }
    }

    return config;
  }

  /**
   * Calculate sizes for each stage based on the stage-size mode
   * @param stages Array of stage data
   * @param maxCrossDimension Maximum dimension perpendicular to flow (width for vertical, height for horizontal)
   * @param availableFlowSpace Available space in flow direction (height for vertical, width for horizontal)
   * @param gapSize Gap between stages
   * @param stageShapes Array of shape types for each stage (needed to calculate flow dimension from size)
   */
  private calculateStageSizes(
    stages: Array<{ value: number }>,
    maxCrossDimension: number,
    availableFlowSpace: number,
    gapSize: number,
    stageShapes: StageShape[]
  ): number[] {
    let mode = '';
    let minFromAttr: number | undefined;
    let maxFromAttr: number | undefined;

    if (this.stageSize) {
      const parts = this.stageSize.trim().split(/\s+/);
      mode = parts[0].toLowerCase();

      if (parts.length >= 2) {
        minFromAttr = parseFloat(parts[1]);
      }
      if (parts.length >= 3) {
        maxFromAttr = parseFloat(parts[2]);
      }
    }

    const minSize = minFromAttr ?? (this.stageMinSize ? parseFloat(this.stageMinSize) : undefined);
    const maxSize = maxFromAttr ?? (this.stageMaxSize ? parseFloat(this.stageMaxSize) : undefined);

    // Calculate space available for shapes (subtract gaps)
    const totalGapSpace = Math.max(0, stages.length - 1) * gapSize;
    const spaceForShapes = availableFlowSpace - totalGapSpace;

    const isVertical = this.orientation === 'vertical';

    let sizes: number[];

    if (!mode) {
      // Default: equal sizes - distribute space evenly
      // For vertical: each shape gets equal height allocation
      // Size is the "primary" dimension used for area calculation
      const flowPerStage = spaceForShapes / stages.length;
      // Convert flow dimension to size based on aspect ratio
      sizes = stageShapes.map(shape => {
        if (shape === 'square' || shape === 'circle') {
          return Math.min(flowPerStage, maxCrossDimension);
        } else {
          // For rectangle/oval, flow dimension is height (vertical) or width (horizontal)
          // size * sqrt(aspectRatio) = width, size / sqrt(aspectRatio) = height
          if (isVertical) {
            // flowPerStage is the height allocation
            // height = size / sqrt(aspectRatio), so size = height * sqrt(aspectRatio)
            const size = flowPerStage * Math.sqrt(this.aspectRatio);
            // But width must not exceed maxCrossDimension
            const width = size * Math.sqrt(this.aspectRatio);
            if (width > maxCrossDimension) {
              return maxCrossDimension / Math.sqrt(this.aspectRatio);
            }
            return size;
          } else {
            // flowPerStage is the width allocation
            // width = size * sqrt(aspectRatio), so size = width / sqrt(aspectRatio)
            const size = flowPerStage / Math.sqrt(this.aspectRatio);
            // But height must not exceed maxCrossDimension
            const height = size / Math.sqrt(this.aspectRatio);
            if (height > maxCrossDimension) {
              return maxCrossDimension * Math.sqrt(this.aspectRatio);
            }
            return size;
          }
        }
      });
    } else if (mode === 'value' || mode === 'log-value') {
      // Proportional sizing - calculate relative weights first
      let weights: number[];
      if (mode === 'value') {
        const totalValue = stages.reduce((sum, stage) => sum + stage.value, 0);
        if (totalValue === 0) {
          weights = stages.map(() => 1 / stages.length);
        } else {
          weights = stages.map(stage => stage.value / totalValue);
        }
      } else {
        // log-value
        const logValues = stages.map(stage => Math.log10(stage.value + 1));
        const totalLog = logValues.reduce((sum, logVal) => sum + logVal, 0);
        if (totalLog === 0) {
          weights = stages.map(() => 1 / stages.length);
        } else {
          weights = logValues.map(logVal => logVal / totalLog);
        }
      }

      // Now allocate flow space proportionally and convert to sizes
      sizes = weights.map((weight, i) => {
        const shape = stageShapes[i];
        const flowAllocation = spaceForShapes * weight;

        if (shape === 'square' || shape === 'circle') {
          return Math.min(flowAllocation, maxCrossDimension);
        } else {
          if (isVertical) {
            // flowAllocation is height, convert to size
            const size = flowAllocation * Math.sqrt(this.aspectRatio);
            const width = size * Math.sqrt(this.aspectRatio);
            if (width > maxCrossDimension) {
              return maxCrossDimension / Math.sqrt(this.aspectRatio);
            }
            return size;
          } else {
            // flowAllocation is width, convert to size
            const size = flowAllocation / Math.sqrt(this.aspectRatio);
            const height = size / Math.sqrt(this.aspectRatio);
            if (height > maxCrossDimension) {
              return maxCrossDimension * Math.sqrt(this.aspectRatio);
            }
            return size;
          }
        }
      });
    } else {
      // Fixed size value
      const numericValue = parseFloat(mode);
      if (!isNaN(numericValue)) {
        sizes = stages.map(() => numericValue);
      } else {
        // Fallback to equal distribution
        const flowPerStage = spaceForShapes / stages.length;
        sizes = stages.map(() => Math.min(flowPerStage, maxCrossDimension));
      }
    }

    // Apply min/max constraints and cap at maxCrossDimension
    sizes = sizes.map(s => {
      let constrained = Math.min(s, maxCrossDimension);
      if (minSize !== undefined && !isNaN(minSize) && constrained < minSize) {
        constrained = minSize;
      }
      if (maxSize !== undefined && !isNaN(maxSize) && constrained > maxSize) {
        constrained = maxSize;
      }
      return Math.max(constrained, 10); // Minimum 10px to ensure visibility
    });

    this.log('info', 'stageSizes.mode', `Size calculation mode: ${mode || 'equal'}`, mode || 'equal');
    this.log('info', 'stageSizes.availableFlow', `Available flow space`, availableFlowSpace);
    this.log('info', 'stageSizes.spaceForShapes', `Space for shapes (minus gaps)`, spaceForShapes);
    this.log('info', 'stageSizes.calculated', `Calculated sizes`, sizes);

    return sizes;
  }

  /**
   * Calculate layout for all stages
   */
  private calculateStageLayout(): {
    stages: Array<{
      index: number;
      label: string;
      value: number;
      x: number;
      y: number;
      width: number;
      height: number;
      shape: StageShape;
      cornerRadius: number;
      fillColor: string;
      originalColor: string;
      strokeColor: string;
      strokeWidth: number;
      showValue: ShowCondition;
      showLabel: ShowCondition;
      showPercent: ShowCondition;
      popup?: { content: string; trigger: string };
      autoPopup?: boolean;
      passthroughAttrs?: Record<string, string>;
      valueFormat?: string;
      isZero: boolean;
      isHidden: boolean;
    }>;
    connectorConfig: ConnectorConfig;
    padding: { top: number; right: number; bottom: number; left: number };
    chartWidth: number;
    chartHeight: number;
    total: number;
    orientation: 'vertical' | 'horizontal';
  } | null {
    const stagesData = this.getStages();
    if (stagesData.length === 0) {
      this.log('warning', 'data.empty', 'Stage chart has no dc-stage children - nothing to render');
      return null;
    }

    const padding = this.getChartPadding();
    const chartWidth = this.width - padding.left - padding.right;
    const chartHeight = this.height - padding.top - padding.bottom;

    const total = stagesData.reduce((sum, stage) => sum + stage.value, 0);
    const connectorConfig = this.parseConnector();
    const isVertical = this.orientation === 'vertical';

    // Calculate gap
    const gapSize = this.parseGap(isVertical ? chartHeight : chartWidth);

    // Get shape types for each stage
    const stageShapes = stagesData.map(s => s.shape || this.shape);

    // Calculate sizes with proper space constraints
    const maxCrossDimension = isVertical ? chartWidth : chartHeight;
    const availableFlowSpace = isVertical ? chartHeight : chartWidth;
    const stageSizes = this.calculateStageSizes(
      stagesData,
      maxCrossDimension,
      availableFlowSpace,
      gapSize,
      stageShapes
    );

    // Determine colors using palette system
    let baseColors: string[];
    const paletteColors = this.getPaletteColors(stagesData.length, 'fill');
    baseColors = paletteColors || this.generateDefaultColors(stagesData.length);

    // Clear used patterns before resolving fills
    this.clearUsedPatterns();

    // Prepare elements for pattern-aware fill resolution
    const elementsForResolution = stagesData.map((s, i) => ({
      fill: s.fill,
      label: s.label,
      value: s.value,
      pattern: s.pattern,
      patternStroke: s.patternStroke,
      patternFill: s.patternFill,
      patternScale: s.patternScale,
      defaultColor: baseColors[i]
    }));

    const resolvedFills = this.resolveFillsWithPatterns(elementsForResolution);
    const fillColors = resolvedFills.map(r => r.fill);
    const originalColors = resolvedFills.map(r => r.originalFill);

    // Get effective stroke from shorthand or explicit attributes
    const effectiveStroke = this.getEffectiveStroke('#e0e0e0', 1);

    // Resolve stroke colors for each element
    const elementStrokes = stagesData.map(s => s.stroke);
    const strokeColors = this.resolveStrokeColors(stagesData.length, elementStrokes, undefined, effectiveStroke.color);
    const defaultStrokeWidth = effectiveStroke.width;

    // Calculate positions
    const visibleStages = stagesData.filter(s => !(s.value === 0 && this.zeroStyle === 'hidden'));
    const totalGaps = Math.max(0, visibleStages.length - 1) * gapSize;

    // Calculate total space needed for shapes
    let totalShapeSpace = 0;
    for (let i = 0; i < stagesData.length; i++) {
      if (stagesData[i].value === 0 && this.zeroStyle === 'hidden') continue;
      const size = stageSizes[i];
      const effectiveShape = stagesData[i].shape || this.shape;
      if (isVertical) {
        totalShapeSpace += this.getShapeHeight(size, effectiveShape);
      } else {
        totalShapeSpace += this.getShapeWidth(size, effectiveShape);
      }
    }

    // Calculate starting position to center everything
    const availableSpace = isVertical ? chartHeight : chartWidth;
    const totalRequired = totalShapeSpace + totalGaps;
    let currentPos = isVertical
      ? padding.top + Math.max(0, (availableSpace - totalRequired) / 2)
      : padding.left + Math.max(0, (availableSpace - totalRequired) / 2);

    const centerX = padding.left + chartWidth / 2;
    const centerY = padding.top + chartHeight / 2;

    const stages = stagesData.map((stage, index) => {
      const isZero = stage.value === 0;
      const isHidden = isZero && this.zeroStyle === 'hidden';
      const effectiveShape = stage.shape || this.shape;

      let size = stageSizes[index];

      // Handle zero value styling
      if (isZero) {
        if (this.zeroStyle === 'ghost' || this.zeroStyle === 'dot') {
          size = 30; // Fixed size for ghost/dot
        }
      }

      const shapeWidth = this.getShapeWidth(size, effectiveShape);
      const shapeHeight = this.getShapeHeight(size, effectiveShape);

      // Calculate position
      let x: number, y: number;
      if (isVertical) {
        x = centerX - shapeWidth / 2;
        y = currentPos;
        if (!isHidden) {
          currentPos += shapeHeight + gapSize;
        }
      } else {
        x = currentPos;
        y = centerY - shapeHeight / 2;
        if (!isHidden) {
          currentPos += shapeWidth + gapSize;
        }
      }

      const cornerRadiusStr = stage.cornerRadius || this.cornerRadius;
      const cornerRadius = this.parseCornerRadius(cornerRadiusStr, shapeWidth);

      return {
        index,
        label: stage.label,
        value: stage.value,
        x,
        y,
        width: shapeWidth,
        height: shapeHeight,
        shape: isZero && this.zeroStyle === 'dot' ? 'circle' as StageShape : effectiveShape,
        cornerRadius,
        fillColor: fillColors[index],
        originalColor: originalColors[index],
        strokeColor: strokeColors[index],
        strokeWidth: stage.strokeWidth ?? defaultStrokeWidth,
        showValue: stage.showValue,
        showLabel: stage.showLabel,
        showPercent: stage.showPercent,
        popup: stage.popup,
        autoPopup: stage.autoPopup,
        passthroughAttrs: stage.passthroughAttrs,
        valueFormat: stage.valueFormat,
        isZero,
        isHidden
      };
    });

    this.log('info', 'data.stageCount', `Number of stages`, stagesData.length);
    this.log('info', 'data.totalValue', `Sum of all stage values`, total);
    this.log('info', 'layout.orientation', `Chart orientation`, this.orientation);
    this.log('info', 'layout.gap', `Gap between stages`, gapSize);

    // High-value warnings for common issues
    // Check for zero or negative values
    const zeroStages = stagesData.filter(s => s.value === 0);
    const negativeStages = stagesData.filter(s => s.value < 0);
    if (negativeStages.length > 0) {
      this.log('warning', 'data.negativeValues', `${negativeStages.length} stage(s) have negative values which may not display correctly`, negativeStages.map(s => s.label));
    }
    if (zeroStages.length > 0 && this.zeroStyle === 'hidden') {
      this.log('info', 'data.zeroValues', `${zeroStages.length} stage(s) have value=0 and are hidden (zero-style="${this.zeroStyle}")`, zeroStages.map(s => s.label));
    } else if (zeroStages.length > 0) {
      this.log('info', 'data.zeroValues', `${zeroStages.length} stage(s) have value=0, displayed as ${this.zeroStyle}`, zeroStages.map(s => s.label));
    }

    // Check for uniform colors (potential config issue)
    const uniqueColors = new Set(fillColors);
    if (uniqueColors.size === 1 && stagesData.length > 1) {
      this.log('warning', 'colors.uniform', `All ${stagesData.length} stages have the same fill color - consider using a palette for visual distinction`, fillColors[0]);
    }

    return {
      stages,
      connectorConfig,
      padding,
      chartWidth,
      chartHeight,
      total,
      orientation: this.orientation
    };
  }

  /**
   * Get shape width based on size and shape type
   */
  private getShapeWidth(size: number, shape: StageShape): number {
    switch (shape) {
      case 'square':
      case 'circle':
        return size;
      case 'rectangle':
      case 'oval':
        return size * Math.sqrt(this.aspectRatio);
    }
  }

  /**
   * Get shape height based on size and shape type
   */
  private getShapeHeight(size: number, shape: StageShape): number {
    switch (shape) {
      case 'square':
      case 'circle':
        return size;
      case 'rectangle':
      case 'oval':
        return size / Math.sqrt(this.aspectRatio);
    }
  }

  /**
   * Calculate if label and value text can fit in a shape.
   * Returns which elements can be displayed and whether labels were suppressed.
   */
  private calculateTextFit(
    label: string,
    valueString: string | null,
    shapeWidth: number,
    shapeHeight: number,
    shouldShowLabel: boolean,
    shouldShowValue: boolean
  ): { canShowLabel: boolean; canShowValue: boolean; labelsSuppressed: boolean } {
    const labelFontSize = 14;
    const valueFontSize = 12;
    const padding = 8;
    const verticalGap = 4; // Gap between label and value

    const availableWidth = shapeWidth - padding * 2;
    const availableHeight = shapeHeight - padding * 2;

    let canShowLabel = shouldShowLabel;
    let canShowValue = shouldShowValue && !!valueString;

    // Check if label fits
    if (canShowLabel && label) {
      const labelWidth = this.measureText(label, labelFontSize);
      const labelHeight = labelFontSize * 1.2;

      if (labelWidth > availableWidth || labelHeight > availableHeight) {
        canShowLabel = false;
      }
    }

    // Check if value fits (considering label if both are shown)
    if (canShowValue && valueString) {
      const valueWidth = this.measureText(valueString, valueFontSize);
      const valueHeight = valueFontSize * 1.2;

      // Calculate total height needed
      let neededHeight = valueHeight;
      if (canShowLabel) {
        neededHeight = (labelFontSize * 1.2) + verticalGap + valueHeight;
      }

      if (valueWidth > availableWidth || neededHeight > availableHeight) {
        canShowValue = false;

        // If value doesn't fit with label, try without label
        if (canShowLabel && !canShowValue) {
          // Re-check value alone
          if (valueWidth <= availableWidth && valueHeight <= availableHeight) {
            // Value fits alone but not with label - suppress label, show value
            canShowLabel = false;
            canShowValue = true;
          }
        }
      }
    }

    // Track if any labels were suppressed (user wanted to show but we can't)
    const labelsSuppressed =
      (shouldShowLabel && !canShowLabel) ||
      (shouldShowValue && !!valueString && !canShowValue);

    return { canShowLabel, canShowValue, labelsSuppressed };
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    this.applyPassthroughAttributes(this.getStages());
  }

  protected renderChart(): SVGTemplateResult {
    const layout = this.calculateStageLayout();
    if (!layout) {
      this.cachedLayout = null;
      return svg``;
    }

    const { stages, connectorConfig, total, orientation } = layout;
    const isVertical = orientation === 'vertical';

    // Compute auto-fit popup for each stage and update the layout
    // This sets popup on stages where labels are suppressed due to size constraints
    for (const stage of stages) {
      if (stage.isHidden) continue;

      const percent = total > 0 ? (stage.value / total) * 100 : 0;
      const shouldShowValue = this.evaluateShowCondition(stage.showValue, stage.value, percent);
      const shouldShowLabel = this.evaluateShowCondition(stage.showLabel, stage.value, percent);
      const shouldShowPercent = this.evaluateShowCondition(stage.showPercent, stage.value, percent);
      const valueString = this.formatValueString(stage.value, percent, shouldShowValue, shouldShowPercent, stage.valueFormat);

      const textFit = this.calculateTextFit(
        stage.label,
        valueString,
        stage.width,
        stage.height,
        shouldShowLabel,
        shouldShowValue || shouldShowPercent
      );

      // If labels are suppressed and no explicit popup exists, add auto-fit popup
      if (textFit.labelsSuppressed && !stage.popup) {
        stage.popup = {
          content: this.generateStagePopupContent(stage, total, shouldShowValue, shouldShowPercent),
          trigger: 'hover'
        };

        // Log the auto-fit decision
        const suppressedItems: string[] = [];
        if (shouldShowLabel && !textFit.canShowLabel) {
          suppressedItems.push('label');
        }
        if ((shouldShowValue || shouldShowPercent) && valueString && !textFit.canShowValue) {
          suppressedItems.push('value');
        }
        this.log('info', `stages[${stage.index}].autoFit`,
          `Stage "${stage.label}" (${stage.width.toFixed(0)}×${stage.height.toFixed(0)}px): suppressed ${suppressedItems.join(' and ')}, auto-enabled popup`,
          { suppressed: suppressedItems, shapeSize: { width: stage.width, height: stage.height } }
        );
      }
    }

    // Cache the layout for use by event handlers
    this.cachedLayout = layout;

    // Filter visible stages for connector rendering
    const visibleStages = stages.filter(s => !s.isHidden);

    return svg`
      ${this.renderDefs()}

      <!-- Connectors -->
      ${connectorConfig.type !== 'none' && this.parseGap(isVertical ? layout.chartHeight : layout.chartWidth) > 0 ? svg`
        ${visibleStages.slice(0, -1).map((stage, i) => {
          const nextStage = visibleStages[i + 1];
          if (!nextStage) return '';

          let x1: number, y1: number, x2: number, y2: number;

          if (isVertical) {
            x1 = stage.x + stage.width / 2;
            y1 = stage.y + stage.height;
            x2 = nextStage.x + nextStage.width / 2;
            y2 = nextStage.y;
          } else {
            x1 = stage.x + stage.width;
            y1 = stage.y + stage.height / 2;
            x2 = nextStage.x;
            y2 = nextStage.y + nextStage.height / 2;
          }

          return svg`
            <line
              x1="${x1}" y1="${y1}"
              x2="${x2}" y2="${y2}"
              stroke="${connectorConfig.color}"
              stroke-width="${connectorConfig.width}"
            />
            ${connectorConfig.type === 'arrow' ? this.renderArrowHead(x2, y2, isVertical ? 'down' : 'right', connectorConfig) : ''}
          `;
        })}
      ` : ''}

      <!-- Stages -->
      ${stages.map((stage) => {
        if (stage.isHidden) return '';

        const textColor = this.getContrastingTextColor(stage.originalColor);
        const percent = total > 0 ? (stage.value / total) * 100 : 0;
        const shouldShowValue = this.evaluateShowCondition(stage.showValue, stage.value, percent);
        const shouldShowLabel = this.evaluateShowCondition(stage.showLabel, stage.value, percent);
        const shouldShowPercent = this.evaluateShowCondition(stage.showPercent, stage.value, percent);
        const valueString = this.formatValueString(stage.value, percent, shouldShowValue, shouldShowPercent, stage.valueFormat);

        // Check if text fits in shape - suppress labels that don't fit
        const textFit = this.calculateTextFit(
          stage.label,
          valueString,
          stage.width,
          stage.height,
          shouldShowLabel,
          shouldShowValue || shouldShowPercent
        );

        // popup is already set on stage (including auto-fit popups) during layout computation
        const hasPopup = !!(stage.popup || this.shouldShowAutoPopup(stage.autoPopup));

        // Ghost styling for zero values
        const isGhost = stage.isZero && this.zeroStyle === 'ghost';
        const fillColor = isGhost ? 'rgba(200, 200, 200, 0.2)' : stage.fillColor;
        const strokeColor = isGhost ? '#ccc' : stage.strokeColor;
        const strokeDasharray = isGhost ? '4 2' : undefined;
        const opacity = isGhost ? 0.6 : 1;

        const centerX = stage.x + stage.width / 2;
        const centerY = stage.y + stage.height / 2;

        return svg`
          <!-- Stage shape -->
          ${this.renderShape(
            stage.shape,
            stage.x,
            stage.y,
            stage.width,
            stage.height,
            stage.cornerRadius,
            fillColor,
            strokeColor,
            stage.strokeWidth,
            strokeDasharray,
            opacity,
            stage.index,
            hasPopup
          )}

          ${textFit.canShowLabel ? svg`
            <text
              x="${centerX}"
              y="${centerY - (textFit.canShowValue ? 8 : 0)}"
              text-anchor="middle"
              dominant-baseline="middle"
              font-size="14"
              font-weight="bold"
              fill="${textColor}"
              opacity="${opacity}"
              pointer-events="none"
            >
              ${stage.label}
            </text>
          ` : ''}

          ${textFit.canShowValue && valueString ? svg`
            <text
              x="${centerX}"
              y="${centerY + (textFit.canShowLabel ? 10 : 0)}"
              text-anchor="middle"
              dominant-baseline="middle"
              font-size="12"
              fill="${textColor}"
              opacity="${opacity}"
              pointer-events="none"
            >
              ${valueString}
            </text>
          ` : ''}
        `;
      })}

      <!-- Legend -->
      ${this.renderLegend(
        stages.filter(s => !s.isHidden).map((stage) => ({
          label: stage.label,
          color: stage.originalColor,
          value: stage.value
        }))
      )}

      ${this.renderFocusIndicator()}
    `;
  }

  /**
   * Render a shape based on type
   */
  private renderShape(
    shape: StageShape,
    x: number,
    y: number,
    width: number,
    height: number,
    cornerRadius: number,
    fill: string,
    stroke: string,
    strokeWidth: number,
    strokeDasharray: string | undefined,
    opacity: number,
    index: number,
    hasPopup: boolean
  ): SVGTemplateResult {
    const handlers = {
      mouseenter: (e: MouseEvent) => this.handleStageMouseEnter(e, index),
      mouseleave: () => this.handleStageMouseLeave(index),
      click: (e: MouseEvent) => this.handleStageClick(e, index)
    };

    switch (shape) {
      case 'rectangle':
      case 'square':
        return svg`
          <rect
            x="${x}"
            y="${y}"
            width="${width}"
            height="${height}"
            rx="${cornerRadius}"
            ry="${cornerRadius}"
            fill="${fill}"
            stroke="${stroke}"
            stroke-width="${strokeWidth}"
            stroke-dasharray="${strokeDasharray || ''}"
            opacity="${opacity}"
            style="cursor: ${hasPopup ? 'pointer' : 'default'}"
            data-shape-index="${index}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;
      case 'circle':
        const radius = Math.min(width, height) / 2;
        return svg`
          <circle
            cx="${x + width / 2}"
            cy="${y + height / 2}"
            r="${radius}"
            fill="${fill}"
            stroke="${stroke}"
            stroke-width="${strokeWidth}"
            stroke-dasharray="${strokeDasharray || ''}"
            opacity="${opacity}"
            style="cursor: ${hasPopup ? 'pointer' : 'default'}"
            data-shape-index="${index}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;
      case 'oval':
        return svg`
          <ellipse
            cx="${x + width / 2}"
            cy="${y + height / 2}"
            rx="${width / 2}"
            ry="${height / 2}"
            fill="${fill}"
            stroke="${stroke}"
            stroke-width="${strokeWidth}"
            stroke-dasharray="${strokeDasharray || ''}"
            opacity="${opacity}"
            style="cursor: ${hasPopup ? 'pointer' : 'default'}"
            data-shape-index="${index}"
            @mouseenter="${handlers.mouseenter}"
            @mouseleave="${handlers.mouseleave}"
            @click="${handlers.click}"
          />
        `;
    }
  }

  /**
   * Render an arrow head at the given position
   */
  private renderArrowHead(
    x: number,
    y: number,
    direction: 'down' | 'right',
    config: ConnectorConfig
  ): SVGTemplateResult {
    const size = config.arrowSize;
    let points: string;

    if (direction === 'down') {
      points = `${x},${y} ${x - size / 2},${y - size} ${x + size / 2},${y - size}`;
    } else {
      points = `${x},${y} ${x - size},${y - size / 2} ${x - size},${y + size / 2}`;
    }

    return svg`
      <polygon
        points="${points}"
        fill="${config.color}"
      />
    `;
  }

  /**
   * Determine if auto-popup should be shown for a shape.
   */
  private shouldShowAutoPopup(elementAutoPopup?: boolean): boolean {
    if (elementAutoPopup !== undefined) {
      return elementAutoPopup;
    }
    return this.autoPopup;
  }

  /**
   * Generate default popup content for a stage.
   * Respects chart-level show-value and show-percent settings.
   */
  private generateStagePopupContent(
    stage: { label: string; value: number; valueFormat?: string },
    totalValue: number,
    showValue: boolean = true,
    showPercent: boolean = true
  ): string {
    let content = `<strong>${stage.label}</strong>`;
    if (showValue) {
      const formattedValue = this.formatValue(stage.value, stage.valueFormat);
      content += `<br>Value: ${formattedValue}`;
    }
    if (showPercent) {
      const percentage = totalValue > 0 ? ((stage.value / totalValue) * 100).toFixed(1) : '0.0';
      content += `<br>${percentage}%`;
    }
    return content;
  }

  private handleStageMouseEnter(e: MouseEvent, index: number) {
    if (!this.cachedLayout) return;

    const stage = this.cachedLayout.stages[index];
    if (!stage) return;

    const total = this.cachedLayout.total;

    if (stage.popup?.trigger === 'hover') {
      this.showPopup(stage.popup.content, e.clientX, e.clientY);
    } else if (!stage.popup && this.shouldShowAutoPopup(stage.autoPopup)) {
      // Evaluate show conditions for popup content
      const percent = total > 0 ? (stage.value / total) * 100 : 0;
      const showValue = this.evaluateShowCondition(stage.showValue, stage.value, percent);
      const showPercent = this.evaluateShowCondition(stage.showPercent, stage.value, percent);
      const content = this.generateStagePopupContent(stage, total, showValue, showPercent);
      this.showPopup(content, e.clientX, e.clientY);
    }
  }

  private handleStageMouseLeave(index: number) {
    if (!this.cachedLayout) return;

    const stage = this.cachedLayout.stages[index];
    if (!stage) return;

    const isHoverPopup = stage.popup?.trigger === 'hover' ||
      (!stage.popup && this.shouldShowAutoPopup(stage.autoPopup));

    if (isHoverPopup && this.clickedStageIndex !== index) {
      this.hidePopup();
    }
  }

  private handleStageClick(e: MouseEvent, index: number) {
    if (!this.cachedLayout) return;

    const stage = this.cachedLayout.stages[index];
    if (!stage) return;

    if (stage.popup?.trigger === 'click') {
      if (this.clickedStageIndex === index) {
        this.hidePopup();
        this.clickedStageIndex = -1;
      } else {
        this.clickedStageIndex = index;
        this.showPopup(stage.popup.content, e.clientX, e.clientY);
      }
    } else {
      this.hidePopup();
      this.clickedStageIndex = -1;
    }
  }

  /**
   * Get legend items for dimension calculation.
   */
  protected override getLegendItems(): LegendItem[] {
    const stagesData = this.getStages();
    if (stagesData.length === 0) return [];

    let baseColors: string[];
    const paletteColors = this.getPaletteColors(stagesData.length, 'fill');
    baseColors = paletteColors || this.generateDefaultColors(stagesData.length);

    const elementsForResolution = stagesData.map((s, i) => ({
      fill: s.fill,
      label: s.label,
      value: s.value,
      pattern: s.pattern,
      patternStroke: s.patternStroke,
      patternFill: s.patternFill,
      patternScale: s.patternScale,
      defaultColor: baseColors[i]
    }));

    const resolvedFills = this.resolveFillsWithPatterns(elementsForResolution);

    return stagesData
      .filter(stage => !(stage.value === 0 && this.zeroStyle === 'hidden'))
      .map((stage, index) => ({
        label: stage.label,
        color: resolvedFills[index].originalFill,
        value: stage.value,
        shape: 'square' as const
      }));
  }

  // ============================================================================
  // Accessibility Methods
  // ============================================================================

  protected override getChartTypeName(): string {
    return 'stage chart';
  }

  protected override getDataSummary(): string {
    const stages = this.getStages();
    if (stages.length === 0) return '';

    const values = stages.map(s => s.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    return `${stages.length} stages, values range from ${min} to ${max}`;
  }

  protected override getInsights(): string {
    if (this.ariaInsights === 'none') return '';

    const stages = this.getStages();
    if (stages.length === 0) return '';

    const formatValue = (value: number) => this.formatValue(value);

    const insightStages: InsightStageData[] = stages.map(s => ({
      label: s.label,
      value: s.value
    }));

    return analyzeFunnel(insightStages, formatValue);
  }

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  protected override getFocusableElements(): FocusableElement[] {
    const stages = this.getStages();
    const total = stages.reduce((sum, s) => sum + s.value, 0);

    return stages
      .filter(stage => !(stage.value === 0 && this.zeroStyle === 'hidden'))
      .map((stage, index) => {
        const hasAction = !!(stage.popup || this.shouldShowAutoPopup(stage.autoPopup));
        const percentage = total > 0 ? (stage.value / total) * 100 : 0;
        return {
          index,
          label: `${stage.label}: ${stage.value} (${percentage.toFixed(1)}%)`,
          hasAction,
          popupTrigger: stage.popup?.trigger as 'hover' | 'click' | undefined ||
                        (this.shouldShowAutoPopup(stage.autoPopup) ? 'hover' : undefined)
        };
      });
  }

  protected override renderFocusIndicator(): SVGTemplateResult {
    if (!this.keyboardActive || this.focusedIndex < 0) {
      return svg``;
    }

    const bounds = this.getShapeBounds(this.focusedIndex);
    if (!bounds) return svg``;

    const padding = 3;
    return svg`
      <rect
        class="focus-indicator"
        x="${bounds.x - padding}"
        y="${bounds.y - padding}"
        width="${bounds.width + padding * 2}"
        height="${bounds.height + padding * 2}"
        fill="none"
        stroke="#005fcc"
        stroke-width="2"
        stroke-dasharray="4 2"
        pointer-events="none"
      />
    `;
  }

  protected override showPopupForFocusedElement(index: number): void {
    const stages = this.getStages();
    if (index < 0 || index >= stages.length) return;

    const stage = stages[index];
    const total = stages.reduce((sum, s) => sum + s.value, 0);
    let content: string | null = null;

    if (stage.popup) {
      content = stage.popup.content;
    } else if (this.shouldShowAutoPopup(stage.autoPopup)) {
      const percentage = total > 0 ? ((stage.value / total) * 100).toFixed(1) : '0';
      content = `<strong>${stage.label}</strong><br>Value: ${stage.value}<br>${percentage}%`;
    }

    if (content) {
      const bounds = this.getShapeBounds(index);
      if (bounds) {
        this.showPopupAtBounds(content, bounds);
      }
    }
  }

  protected override togglePopupForFocusedElement(index: number): void {
    if (this.popupVisible) {
      this.hidePopup();
    } else {
      this.showPopupForFocusedElement(index);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-stage-chart': StageChart;
  }
}
