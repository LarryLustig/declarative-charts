/**
 * Component test setup for happy-dom environment.
 *
 * Provides mocks for browser APIs not available in happy-dom:
 * - Canvas 2D context (for text measurement)
 * - requestAnimationFrame
 */

import { beforeAll, afterEach, vi } from 'vitest';

// Mock canvas context for text measurement
// Returns approximate width based on character count and font size
class MockCanvasContext {
  font: string = '12px sans-serif';

  measureText(text: string): { width: number } {
    // Extract font size from font string (e.g., "12px sans-serif" -> 12)
    const fontSizeMatch = this.font.match(/(\d+(?:\.\d+)?)/);
    const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[1]) : 12;

    // Approximate width: average character width is ~0.6 of font size
    // This is a rough approximation for proportional fonts
    const avgCharWidth = fontSize * 0.6;
    return { width: text.length * avgCharWidth };
  }

  // Stub other methods that might be called
  fillText(): void {}
  strokeText(): void {}
  fillRect(): void {}
  clearRect(): void {}
  getImageData(): ImageData {
    return new ImageData(1, 1);
  }
  putImageData(): void {}
  save(): void {}
  restore(): void {}
  scale(): void {}
  rotate(): void {}
  translate(): void {}
  transform(): void {}
  setTransform(): void {}
  resetTransform(): void {}
  createLinearGradient(): CanvasGradient {
    return {
      addColorStop: () => {},
    } as unknown as CanvasGradient;
  }
  createRadialGradient(): CanvasGradient {
    return {
      addColorStop: () => {},
    } as unknown as CanvasGradient;
  }
  createPattern(): CanvasPattern | null {
    return null;
  }
  beginPath(): void {}
  closePath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  arc(): void {}
  arcTo(): void {}
  bezierCurveTo(): void {}
  quadraticCurveTo(): void {}
  rect(): void {}
  fill(): void {}
  stroke(): void {}
  clip(): void {}
  isPointInPath(): boolean {
    return false;
  }
  isPointInStroke(): boolean {
    return false;
  }
  drawImage(): void {}
  createImageData(): ImageData {
    return new ImageData(1, 1);
  }
}

// Mock HTMLCanvasElement.getContext
beforeAll(() => {
  // Mock canvas getContext
  HTMLCanvasElement.prototype.getContext = function (
    contextId: string
  ): RenderingContext | null {
    if (contextId === '2d') {
      return new MockCanvasContext() as unknown as CanvasRenderingContext2D;
    }
    return null;
  } as typeof HTMLCanvasElement.prototype.getContext;

  // Mock requestAnimationFrame if not available
  if (typeof globalThis.requestAnimationFrame === 'undefined') {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      return setTimeout(() => callback(Date.now()), 16) as unknown as number;
    };
  }

  if (typeof globalThis.cancelAnimationFrame === 'undefined') {
    globalThis.cancelAnimationFrame = (handle: number): void => {
      clearTimeout(handle);
    };
  }

  // Mock the Web Animations API.
  //
  // happy-dom does not implement Element.prototype.animate. Without this, entry
  // animations throw asynchronously inside firstUpdated - uncaught exceptions that
  // fail the run (and block `prepublishOnly`) even when every assertion passes.
  // Stubbing it also means tests exercise the real animated code path rather than
  // the no-op fallback in `supportsWebAnimations()`.
  if (typeof Element.prototype.animate !== 'function') {
    Element.prototype.animate = function (
      this: Element,
      _keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      _options?: number | KeyframeAnimationOptions
    ): Animation {
      const animation = {
        onfinish: null as ((this: Animation, ev: AnimationPlaybackEvent) => unknown) | null,
        oncancel: null as ((this: Animation, ev: AnimationPlaybackEvent) => unknown) | null,
        playState: 'finished' as AnimationPlayState,
        currentTime: 0,
        startTime: 0,
        playbackRate: 1,
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        play() {},
        pause() {},
        reverse() {},
        finish() {},
        cancel() {},
        updatePlaybackRate() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => true,
      };

      // Fire onfinish on a later tick so cleanup handlers (which strip
      // data-animated and reset dash styles) still run, as they would in a browser.
      setTimeout(() => {
        animation.onfinish?.call(
          animation as unknown as Animation,
          undefined as unknown as AnimationPlaybackEvent
        );
      }, 0);

      return animation as unknown as Animation;
    };
  }
});

// Clean up after each test
afterEach(() => {
  // Remove any elements added to body
  document.body.innerHTML = '';

  // Clear all mocks
  vi.clearAllMocks();
});

/**
 * Helper to wait for Lit element to complete update cycle.
 */
export async function elementUpdated(element: { updateComplete: Promise<boolean> }): Promise<void> {
  await element.updateComplete;

  // Charts re-render in response to child mutations, and MutationObserver
  // delivers those records after the current microtask checkpoint - later than
  // `updateComplete` resolves. Yield to a macrotask so the observer has run,
  // then settle whatever update it scheduled. `updateComplete` resolves false
  // when a further update was requested while updating, so loop until stable.
  for (let i = 0; i < 5; i++) {
    await new Promise(resolve => setTimeout(resolve, 0));
    if (await element.updateComplete) break;
  }
}

/**
 * Helper to create and mount a custom element for testing.
 */
export async function fixture<T extends HTMLElement>(
  tagName: string,
  attributes: Record<string, string> = {},
  innerHTML: string = ''
): Promise<T> {
  const element = document.createElement(tagName) as T;

  // Set attributes
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }

  // Set inner HTML
  if (innerHTML) {
    element.innerHTML = innerHTML;
  }

  // Append to body
  document.body.appendChild(element);

  // Wait for update if it's a Lit element
  if ('updateComplete' in element) {
    await (element as unknown as { updateComplete: Promise<boolean> }).updateComplete;
  }

  return element;
}
