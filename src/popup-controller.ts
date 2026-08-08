import { calculatePopupPosition, type ShapeBounds } from './chart-utils.js';

/**
 * The slice of a chart that the popup needs.
 *
 * Deliberately narrow. Note what is *not* here: `showPopupForFocusedElement()`
 * and `togglePopupForFocusedElement()` stay on the chart, because every chart
 * type overrides them to build its own popup content. The controller owns the
 * box - what it says, where it sits, whether it is showing - and the chart owns
 * what a chart knows.
 */
export interface PopupHost {
  readonly shadowRoot: ShadowRoot | null;
  /** viewBox width, for converting shape bounds to rendered pixels. */
  readonly width: number;
  /** viewBox height, for converting shape bounds to rendered pixels. */
  readonly height: number;
  /** The host element's own rect; popup coordinates are relative to it. */
  getBoundingClientRect(): DOMRect;
  /**
   * Showing the popup, routed back through the chart.
   *
   * Before this class existed, `showPopupAtBounds` reached `showPopup` as a
   * virtual call, so a subclass - or a test spy - could override it and still be
   * called. Dispatching through the host preserves that seam; the implementation
   * still lives here. Do not "simplify" this to `this.showPopup(...)`.
   */
  showPopup(content: string, x: number, y: number): void;
  /** Ask the chart to re-render after popup state changes. */
  requestUpdate(): void;
}

/** Horizontal nudge so the box sits beside the cursor rather than under it. */
const CURSOR_OFFSET_X = 15;

/** Vertical nudge so the box sits slightly above the cursor. */
const CURSOR_OFFSET_Y = -10;

/**
 * The hover/click popup a chart shows over its data.
 *
 * Owns the four pieces of popup state and the two coordinate systems that feed
 * it: viewport coordinates from a mouse event, and viewBox coordinates from a
 * shape's bounds.
 *
 * Extracted from `BaseChart` as the third responsibility to move out, after
 * `ColorResolver` and `KeyboardNavController`. `BaseChart` holds it behind a
 * lazy getter and delegates, and still exposes `popupContent`, `popupX`,
 * `popupY` and `popupVisible` as protected accessors because `render()` reads
 * all four and the chart subclasses read `popupVisible`.
 *
 * ## Reactivity
 *
 * These four were `@state()` fields, so Lit re-rendered on every assignment.
 * As plain fields they do not, which is why each setter below calls
 * `host.requestUpdate()`. Anything that mutates popup state must go through a
 * setter or call `requestUpdate()` itself - a direct write to `_content` and
 * friends silently stops the popup updating on screen, and nothing in
 * TypeScript will say so.
 *
 * The setters only request an update when the value actually changes, matching
 * what `@state()` did via its default `hasChanged`.
 */
export class PopupController {
  private _content = '';
  private _x = 0;
  private _y = 0;
  private _visible = false;

  constructor(private readonly host: PopupHost) {}

  /** HTML shown inside the popup. Bound with `.innerHTML`, so markup is parsed. */
  get content(): string {
    return this._content;
  }

  set content(value: string) {
    if (this._content === value) return;
    this._content = value;
    this.host.requestUpdate();
  }

  /** Popup left edge, in pixels relative to the host element. */
  get x(): number {
    return this._x;
  }

  set x(value: number) {
    if (this._x === value) return;
    this._x = value;
    this.host.requestUpdate();
  }

  /** Popup top edge, in pixels relative to the host element. */
  get y(): number {
    return this._y;
  }

  set y(value: number) {
    if (this._y === value) return;
    this._y = value;
    this.host.requestUpdate();
  }

  /**
   * Whether the popup is showing.
   *
   * Visibility is a class on a div that is always in the shadow tree, not the
   * presence of the div, so the CSS opacity transition has something to fade.
   */
  get visible(): boolean {
    return this._visible;
  }

  set visible(value: boolean) {
    if (this._visible === value) return;
    this._visible = value;
    this.host.requestUpdate();
  }

  /**
   * Show the popup near a point given in viewport coordinates.
   *
   * The point is converted to host-relative coordinates and nudged so the box
   * sits to the right of and slightly above the cursor. No clamping: a popup
   * near the top-left edge can end up at negative coordinates.
   *
   * @param content Popup content HTML string
   * @param x Viewport x (e.g. a MouseEvent's clientX)
   * @param y Viewport y (e.g. a MouseEvent's clientY)
   */
  showPopup(content: string, x: number, y: number): void {
    this.content = content;
    // Position popup offset from cursor (relative to host element)
    const rect = this.host.getBoundingClientRect();
    this.x = x - rect.left + CURSOR_OFFSET_X;
    this.y = y - rect.top + CURSOR_OFFSET_Y;
    this.visible = true;
  }

  /**
   * Hide the popup.
   *
   * Only the visible flag flips. The content and coordinates deliberately
   * survive, so the opacity transition has something to fade out.
   */
  hidePopup(): void {
    this.visible = false;
  }

  /**
   * Show popup at the center-top of a shape's bounds.
   * Uses the pure calculatePopupPosition() utility for coordinate conversion.
   *
   * The shape's height is not used - the popup anchors to its top edge.
   *
   * @param content Popup content HTML string
   * @param bounds Shape bounds in viewBox coordinates
   * @returns true if popup was shown, false if SVG element not found
   */
  showPopupAtBounds(content: string, bounds: ShapeBounds): boolean {
    const svgEl = this.host.shadowRoot?.querySelector('svg');
    if (!svgEl) return false;

    const chartRect = this.host.getBoundingClientRect();
    const svgRect = svgEl.getBoundingClientRect();

    const pos = calculatePopupPosition(
      bounds,
      chartRect,
      svgRect,
      this.host.width,
      this.host.height
    );

    // Through the host, not `this.showPopup` - see PopupHost.showPopup.
    this.host.showPopup(content, pos.x, pos.y);
    return true;
  }
}
