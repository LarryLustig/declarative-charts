import type { FocusableElement } from './base-chart.js';

/**
 * The slice of a chart that keyboard navigation needs.
 *
 * Deliberately narrow. Note what is *not* here: rendering the focus indicator,
 * computing shape bounds, and enumerating focusable elements stay on the chart,
 * because they are subclass extension points that every chart type overrides.
 * The controller owns the interaction logic; the chart owns what a chart knows.
 */
export interface KeyboardNavHost {
  readonly shadowRoot: ShadowRoot | null;
  /** The navigable data elements, in order. Overridden per chart type. */
  getFocusableElements(): FocusableElement[];
  showPopupForFocusedElement(index: number): void;
  togglePopupForFocusedElement(index: number): void;
  hidePopup(): void;
  /**
   * The navigation actions, routed back through the chart.
   *
   * Before this class existed these were all virtual calls on the chart, so a
   * subclass could override any of them - to hand navigation to a router, or to
   * change what Enter does. Dispatching through the host preserves that; the
   * implementations still live here.
   */
  navigateToHref(href: string): void;
  focusElement(index: number): void;
  focusNextElement(): void;
  focusPreviousElement(): void;
  activateCurrentElement(): void;
  /** Ask the chart to re-render after focus state changes. */
  requestUpdate(): void;
}

/**
 * Roving-tabindex keyboard navigation for a chart.
 *
 * The chart itself is the single tab stop; arrow keys move a focus cursor
 * between data elements without putting each one in the tab order. This class
 * owns that cursor and the key handling.
 *
 * Extracted from `BaseChart` as the second responsibility to move out, after
 * `ColorResolver`. `BaseChart` holds it as a field and delegates, and still
 * exposes `focusedIndex` and `keyboardActive` as protected getters because all
 * four chart types read them when drawing their focus indicator.
 */
export class KeyboardNavController {
  /**
   * Index of the currently focused element, or -1 for none.
   *
   * Deliberately survives blur, so returning to the chart resumes where the user
   * left off rather than jumping back to the first element.
   */
  focusedIndex = -1;

  /** Whether the chart currently has keyboard focus. */
  keyboardActive = false;

  constructor(private readonly host: KeyboardNavHost) {}

  /**
   * Handle keyboard events on the chart SVG.
   * Implements roving tabindex navigation pattern.
   */
  handleChartKeyDown(e: KeyboardEvent): void {
    const focusable = this.host.getFocusableElements();
    if (focusable.length === 0) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        this.host.focusNextElement();
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        this.host.focusPreviousElement();
        break;

      case 'Home':
        e.preventDefault();
        this.host.focusElement(0);
        break;

      case 'End':
        e.preventDefault();
        this.host.focusElement(focusable.length - 1);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        this.host.activateCurrentElement();
        break;

      case 'Escape':
        e.preventDefault();
        this.host.hidePopup();
        // Return focus to the chart container
        this.focusedIndex = -1;
        this.keyboardActive = false;
      this.host.requestUpdate();
        this.host.requestUpdate();
        const svg = this.host.shadowRoot?.querySelector('svg');
        svg?.blur();
        break;
    }
  }

  /**
   * Handle focus entering the chart SVG.
   */
  handleChartFocus(): void {
    this.keyboardActive = true;
    this.host.requestUpdate();
    const focusable = this.host.getFocusableElements();
    // If no element is focused yet, focus the first one
    if (this.focusedIndex === -1 && focusable.length > 0) {
      this.focusedIndex = 0;
      this.host.requestUpdate();
    }
  }

  /**
   * Handle focus leaving the chart SVG.
   */
  handleChartBlur(e: FocusEvent): void {
    // Only deactivate if focus is leaving the chart entirely
    const relatedTarget = e.relatedTarget as Element | null;
    if (!relatedTarget || !this.host.shadowRoot?.contains(relatedTarget)) {
      this.keyboardActive = false;
      this.host.requestUpdate();
      // Keep focusedIndex so we return to the same element
    }
  }

  /**
   * Focus a specific element by index.
   */
  focusElement(index: number): void {
    const focusable = this.host.getFocusableElements();
    if (index < 0 || index >= focusable.length) return;

    this.focusedIndex = index;
    this.keyboardActive = true;
    this.host.requestUpdate();

    // Find the SVG element and focus it (the visual indicator shows on the shape)
    const svg = this.host.shadowRoot?.querySelector('svg');
    if (svg && document.activeElement !== svg) {
      svg.focus();
    }

    // Show popup for the focused element if it has a hover popup
    const element = focusable[index];
    if (element.popupTrigger === 'hover') {
      this.host.showPopupForFocusedElement(index);
    }
  }

  /**
   * Focus the next element in the list.
   */
  focusNextElement(): void {
    const focusable = this.host.getFocusableElements();
    if (focusable.length === 0) return;

    const nextIndex = this.focusedIndex < focusable.length - 1
      ? this.focusedIndex + 1
      : 0; // Wrap to beginning

    this.host.focusElement(nextIndex);
  }

  /**
   * Focus the previous element in the list.
   */
  focusPreviousElement(): void {
    const focusable = this.host.getFocusableElements();
    if (focusable.length === 0) return;

    const prevIndex = this.focusedIndex > 0
      ? this.focusedIndex - 1
      : focusable.length - 1; // Wrap to end

    this.host.focusElement(prevIndex);
  }

  /**
   * Activate the currently focused element.
   * - If it has an href, navigate to it
   * - If it has a click popup, toggle the popup
   */
  activateCurrentElement(): void {
    const focusable = this.host.getFocusableElements();
    if (this.focusedIndex < 0 || this.focusedIndex >= focusable.length) return;

    const element = focusable[this.focusedIndex];

    // If it has an href, navigate to it
    if (element.href) {
      this.host.navigateToHref(element.href);
      return;
    }

    // If it has a click popup, toggle it
    if (element.popupTrigger === 'click') {
      this.host.togglePopupForFocusedElement(this.focusedIndex);
    }
  }

  /**
   * Navigate to the specified URL.
   * Extracted for testability - can be mocked in tests.
   */
  navigateToHref(href: string): void {
    window.location.href = href;
  }
}
