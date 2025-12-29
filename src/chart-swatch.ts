import { LitElement, html, css, svg, SVGTemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ChartPalette } from './chart-palette.js';
import { getBuiltinPalette, generatePaletteColors } from './builtin-palettes.js';

/**
 * Standard shape names supported by dc-swatch.
 * These match the shapes used in line chart points for consistency.
 */
export const STANDARD_SHAPES = ['circle', 'square', 'rect', 'line', 'triangle', 'diamond', 'star', 'cross', 'plus'] as const;
export type StandardShape = typeof STANDARD_SHAPES[number];

/**
 * Swatch element for displaying a color from a palette outside of charts.
 *
 * Use this element to display colored shapes that match your chart data,
 * allowing you to visually associate prose, tables, or other content with
 * chart elements.
 *
 * The swatch looks up its color from a referenced palette using label and/or
 * value matching, just like chart elements do.
 *
 * @element dc-swatch
 *
 * @attr {string} palette - ID of the palette to use for color lookup (required)
 * @attr {string} label - Label to match in the palette
 * @attr {number} value - Value to match in the palette
 * @attr {string} shape - Shape to render: "circle" (default), "square", "rect", "line",
 *                        "triangle", "diamond", "star", "cross", "plus", or any unicode character
 * @attr {string} fill - Override fill color (bypasses palette lookup)
 * @attr {string} stroke - Override stroke color (bypasses palette lookup)
 * @attr {number} size - Size of the swatch in pixels (default: 16)
 *
 * @example
 * <!-- Simple label-based swatch -->
 * <p>
 *   <dc-swatch palette="brand-colors" label="Revenue"></dc-swatch>
 *   Revenue increased 15% this quarter.
 * </p>
 *
 * @example
 * <!-- Different shapes -->
 * <dc-swatch palette="p" label="Sales" shape="square"></dc-swatch>
 * <dc-swatch palette="p" label="Returns" shape="triangle"></dc-swatch>
 * <dc-swatch palette="p" label="Profit" shape="line"></dc-swatch>
 *
 * @example
 * <!-- Unicode/emoji shapes -->
 * <dc-swatch palette="p" label="Warning" shape="⚠"></dc-swatch>
 * <dc-swatch palette="p" label="Success" shape="✓"></dc-swatch>
 * <dc-swatch palette="p" label="Star" shape="★"></dc-swatch>
 *
 * @example
 * <!-- Value-based lookup (for threshold-based palettes) -->
 * <dc-swatch palette="performance" value="25"></dc-swatch> Low
 * <dc-swatch palette="performance" value="65"></dc-swatch> Medium
 * <dc-swatch palette="performance" value="90"></dc-swatch> High
 */
@customElement('dc-swatch')
export class ChartSwatch extends LitElement {
  /**
   * ID of the palette to use for color lookup.
   */
  @property({ type: String })
  palette?: string;

  /**
   * Label to match in the palette.
   */
  @property({ type: String })
  label?: string;

  /**
   * Value to match in the palette.
   */
  @property({ type: Number })
  value?: number;

  /**
   * Index in the palette (0-based). Used with built-in palettes.
   */
  @property({ type: Number })
  index?: number;

  /**
   * Shape to render. Can be a standard shape name or a unicode character.
   * Standard shapes: circle, square, rect, line, triangle, diamond, star, cross, plus
   */
  @property({ type: String })
  shape: string = 'circle';

  /**
   * Override fill color (bypasses palette lookup).
   */
  @property({ type: String })
  fill?: string;

  /**
   * Override stroke color (bypasses palette lookup).
   */
  @property({ type: String })
  stroke?: string;

  /**
   * Size of the swatch in pixels.
   */
  @property({ type: Number })
  size: number = 16;

  static styles = css`
    :host {
      display: inline-block;
      vertical-align: middle;
      line-height: 1;
    }

    svg {
      display: block;
    }

    .unicode-shape {
      display: inline-block;
      text-align: center;
      line-height: 1;
    }
  `;

  /**
   * Wait for custom elements to be defined and upgraded, then re-render.
   * This handles the case where swatches render before palette elements are upgraded.
   */
  connectedCallback() {
    super.connectedCallback();

    // Wait for dc-palette and dc-fill to be defined
    Promise.all([
      customElements.whenDefined('dc-palette'),
      customElements.whenDefined('dc-fill')
    ]).then(() => {
      // Use requestAnimationFrame to ensure the DOM has fully upgraded
      // The element definitions are ready, but instances need time to upgrade
      requestAnimationFrame(() => {
        this.requestUpdate();
      });
    });
  }

  /**
   * Get the palette element referenced by the palette attribute.
   * Forces upgrade of the element if it hasn't been upgraded yet.
   */
  private getPalette(): ChartPalette | null {
    if (!this.palette) return null;
    const element = document.getElementById(this.palette);
    if (!element) return null;

    // Force upgrade of the palette element and its children
    // This ensures @property decorated properties are initialized from attributes
    customElements.upgrade(element);
    element.querySelectorAll('dc-fill').forEach(fill => {
      customElements.upgrade(fill);
    });

    return element as ChartPalette;
  }

  /**
   * Resolve the fill and stroke colors to use.
   * Priority: explicit attributes > DOM palette lookup > built-in palette > fallback
   */
  private resolveColors(): { fill: string; stroke: string } {
    // Explicit attributes take priority
    if (this.fill || this.stroke) {
      return {
        fill: this.fill || '#888',
        stroke: this.stroke || 'none'
      };
    }

    // Look up from DOM palette element
    const palette = this.getPalette();
    if (palette) {
      const result = palette.lookup(this.label, this.value);
      if (result.fill || result.stroke) {
        return {
          fill: result.fill || '#888',
          stroke: result.stroke || 'none'
        };
      }
    }

    // Look up from built-in palette
    if (this.palette) {
      const builtinPalette = getBuiltinPalette(this.palette);
      if (builtinPalette) {
        // Use index if provided, otherwise default to 0
        const idx = this.index ?? 0;
        // For categorical palettes, access colors directly with wrap-around
        if (builtinPalette.type === 'categorical') {
          const color = builtinPalette.colors[idx % builtinPalette.colors.length];
          return {
            fill: color,
            stroke: 'none'
          };
        }
        // For sequential/diverging, generate colors and pick the one at index
        // Generate enough colors to include the requested index
        const count = Math.max(idx + 1, 10);
        const colors = generatePaletteColors(builtinPalette, count);
        return {
          fill: colors[idx] || colors[0],
          stroke: 'none'
        };
      }
    }

    // Fallback
    return { fill: '#888', stroke: 'none' };
  }

  /**
   * Check if the shape is a standard shape name.
   */
  private isStandardShape(shape: string): shape is StandardShape {
    return STANDARD_SHAPES.includes(shape.toLowerCase() as StandardShape);
  }

  /**
   * Render an SVG shape (instance method that delegates to static).
   */
  private renderSvgShape(shape: string, fill: string, stroke: string): SVGTemplateResult {
    return ChartSwatch.renderShape(shape, this.size, fill, stroke);
  }

  /**
   * Static method to render an SVG shape.
   * Can be used by other components (like ChartLegend) without instantiating a swatch.
   *
   * @param shape Shape name: 'circle', 'square', 'rect', 'line', 'triangle', 'diamond', 'star', 'cross', 'plus'
   * @param size Size of the shape in viewBox units
   * @param fill Fill color
   * @param stroke Stroke color (default: 'none')
   * @returns SVG template for the shape, rendered at origin (0,0) within a size x size box
   */
  static renderShape(shape: string, size: number, fill: string, stroke: string = 'none'): SVGTemplateResult {
    const s = size;
    const half = s / 2;
    const strokeWidth = stroke !== 'none' ? 1 : 0;

    switch (shape.toLowerCase()) {
      case 'circle':
        return svg`
          <circle
            cx="${half}"
            cy="${half}"
            r="${half - strokeWidth}"
            fill="${fill}"
            stroke="${stroke}"
            stroke-width="${strokeWidth}"
          />
        `;

      case 'square':
      case 'rect':
        return svg`
          <rect
            x="${strokeWidth / 2}"
            y="${strokeWidth / 2}"
            width="${s - strokeWidth}"
            height="${s - strokeWidth}"
            fill="${fill}"
            stroke="${stroke}"
            stroke-width="${strokeWidth}"
          />
        `;

      case 'line':
        return svg`
          <line
            x1="0"
            y1="${half}"
            x2="${s}"
            y2="${half}"
            stroke="${fill}"
            stroke-width="3"
            stroke-linecap="round"
          />
        `;

      case 'triangle': {
        const h = s * 0.866; // height of equilateral triangle
        const yOffset = (s - h) / 2;
        return svg`
          <polygon
            points="${half},${yOffset} ${s - strokeWidth},${s - yOffset - strokeWidth} ${strokeWidth},${s - yOffset - strokeWidth}"
            fill="${fill}"
            stroke="${stroke}"
            stroke-width="${strokeWidth}"
          />
        `;
      }

      case 'diamond':
        return svg`
          <polygon
            points="${half},${strokeWidth} ${s - strokeWidth},${half} ${half},${s - strokeWidth} ${strokeWidth},${half}"
            fill="${fill}"
            stroke="${stroke}"
            stroke-width="${strokeWidth}"
          />
        `;

      case 'star': {
        const outerRadius = half - strokeWidth;
        const innerRadius = outerRadius * 0.4;
        const points = [];
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          points.push(`${half + radius * Math.cos(angle)},${half + radius * Math.sin(angle)}`);
        }
        return svg`
          <polygon
            points="${points.join(' ')}"
            fill="${fill}"
            stroke="${stroke}"
            stroke-width="${strokeWidth}"
          />
        `;
      }

      case 'cross': {
        const crossSize = half * 0.7;
        return svg`
          <path
            d="M ${half - crossSize},${half - crossSize} L ${half + crossSize},${half + crossSize} M ${half + crossSize},${half - crossSize} L ${half - crossSize},${half + crossSize}"
            stroke="${fill}"
            stroke-width="2"
            stroke-linecap="round"
            fill="none"
          />
        `;
      }

      case 'plus': {
        const plusSize = half * 0.7;
        return svg`
          <path
            d="M ${half},${half - plusSize} L ${half},${half + plusSize} M ${half - plusSize},${half} L ${half + plusSize},${half}"
            stroke="${fill}"
            stroke-width="2"
            stroke-linecap="round"
            fill="none"
          />
        `;
      }

      default:
        // Default to circle for unknown shapes
        return svg`
          <circle
            cx="${half}"
            cy="${half}"
            r="${half - strokeWidth}"
            fill="${fill}"
            stroke="${stroke}"
            stroke-width="${strokeWidth}"
          />
        `;
    }
  }

  render() {
    const { fill, stroke } = this.resolveColors();
    const s = this.size;

    // Check if this is a standard shape
    if (this.isStandardShape(this.shape)) {
      return html`
        <svg
          width="${s}"
          height="${s}"
          viewBox="0 0 ${s} ${s}"
          xmlns="http://www.w3.org/2000/svg"
        >
          ${this.renderSvgShape(this.shape, fill, stroke)}
        </svg>
      `;
    }

    // Unicode character/emoji
    // Note: CSS color only works for monochrome unicode symbols, not color emojis
    return html`
      <span
        class="unicode-shape"
        style="font-size: ${s}px; color: ${fill}; width: ${s}px; height: ${s}px;"
      >${this.shape}</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-swatch': ChartSwatch;
  }
}
