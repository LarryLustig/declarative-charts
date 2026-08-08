import type { StageShape } from './chart-stage.js';

/**
 * Pure geometry for stage charts.
 *
 * `calculateStageLayout()` was 352 lines that interleaved four different jobs:
 * reading the DOM, resolving colours and patterns, deciding what a zero value
 * means, and working out where shapes go. Only the last is geometry, and only
 * the last can be reasoned about without a browser - so it lives here, as
 * functions over numbers.
 *
 * Everything in this file is deliberately free of DOM, Lit and chart state. That
 * is what makes it testable directly, on what was the worst-covered file in the
 * project.
 */

/** The four shapes a stage can be drawn as. */
const KNOWN_SHAPES: readonly StageShape[] = ['rectangle', 'square', 'oval', 'circle'];

/**
 * Coerce a shape name to one the geometry understands.
 *
 * `StageShape` is a four-member union, so TypeScript treated switches over it as
 * exhaustive - but an HTML attribute is an arbitrary string at runtime.
 * `shape="chevron"` fell off the end of three default-less switches: two
 * returned `undefined` and turned every downstream coordinate into NaN, and the
 * third drew nothing at all. An unrenderable chart, with no error anywhere.
 *
 * @returns the shape to use, and whether the input had to be corrected
 */
export function resolveStageShape(shape: StageShape | string | undefined): {
  shape: StageShape;
  wasInvalid: boolean;
} {
  if (shape && (KNOWN_SHAPES as readonly string[]).includes(shape)) {
    return { shape: shape as StageShape, wasInvalid: false };
  }
  return { shape: 'rectangle', wasInvalid: true };
}

/**
 * Width of a stage shape.
 *
 * Stage charts size by **area**, so a "size" is the side of an equivalent
 * square. Rectangles and ovals spread that area across the aspect ratio, which
 * is why a min-size of 30 renders about 21 units tall rather than 30.
 */
export function stageShapeWidth(size: number, shape: StageShape, aspectRatio: number): number {
  const { shape: resolved } = resolveStageShape(shape);
  return resolved === 'square' || resolved === 'circle'
    ? size
    : size * Math.sqrt(aspectRatio);
}

/** Height of a stage shape. See {@link stageShapeWidth}. */
export function stageShapeHeight(size: number, shape: StageShape, aspectRatio: number): number {
  const { shape: resolved } = resolveStageShape(shape);
  return resolved === 'square' || resolved === 'circle'
    ? size
    : size / Math.sqrt(aspectRatio);
}

/** One stage's position and extent, in viewBox units. */
export interface StageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StageLayoutInput {
  /** Resolved size per stage, in the same order as the markup. */
  sizes: number[];
  /** Shape per stage; an unrecognised name is treated as a rectangle. */
  shapes: Array<StageShape | string | undefined>;
  /** Stages excluded from the flow - they take no space and advance nothing. */
  hidden: boolean[];
  orientation: 'vertical' | 'horizontal';
  /** Width-to-height ratio used to spread a size across a non-square shape. */
  aspectRatio: number;
  /** Space between consecutive visible stages. */
  gap: number;
  padding: { top: number; right: number; bottom: number; left: number };
  /** Plot area, excluding padding. */
  chartWidth: number;
  chartHeight: number;
}

/**
 * Place every stage along the flow axis, centred on the cross axis.
 *
 * The run is centred as a whole: the total of every visible shape plus the gaps
 * between them is measured first, then the block is offset so any leftover space
 * is split evenly. Hidden stages still receive a box - callers index by position
 * and the renderer skips them - but contribute no extent and do not advance the
 * cursor.
 */
export function computeStageLayout(input: StageLayoutInput): StageBox[] {
  const {
    sizes, shapes, hidden, orientation, aspectRatio, gap, padding, chartWidth, chartHeight
  } = input;

  const isVertical = orientation !== 'horizontal';
  const count = sizes.length;

  const widthOf = (i: number) => stageShapeWidth(sizes[i], shapes[i] as StageShape, aspectRatio);
  const heightOf = (i: number) => stageShapeHeight(sizes[i], shapes[i] as StageShape, aspectRatio);

  let visibleCount = 0;
  let totalShapeSpace = 0;
  for (let i = 0; i < count; i++) {
    if (hidden[i]) continue;
    visibleCount++;
    totalShapeSpace += isVertical ? heightOf(i) : widthOf(i);
  }

  const totalGaps = Math.max(0, visibleCount - 1) * gap;
  const availableSpace = isVertical ? chartHeight : chartWidth;
  const leadingEdge = isVertical ? padding.top : padding.left;

  // Never negative: an overfull chart starts at the edge and overflows rather
  // than starting outside it.
  let cursor = leadingEdge + Math.max(0, (availableSpace - totalShapeSpace - totalGaps) / 2);

  const centerX = padding.left + chartWidth / 2;
  const centerY = padding.top + chartHeight / 2;

  const boxes: StageBox[] = [];
  for (let i = 0; i < count; i++) {
    const width = widthOf(i);
    const height = heightOf(i);

    const box: StageBox = isVertical
      ? { x: centerX - width / 2, y: cursor, width, height }
      : { x: cursor, y: centerY - height / 2, width, height };
    boxes.push(box);

    if (!hidden[i]) {
      cursor += (isVertical ? height : width) + gap;
    }
  }

  return boxes;
}
