/**
 * Integration test setup for happy-dom environment.
 *
 * Integration tests verify complete chart rendering scenarios and dynamic updates.
 * They test the full component lifecycle including:
 * - Initial rendering with complex data
 * - Dynamic updates (adding/removing elements, changing values)
 * - htmx-style partial DOM updates
 * - Multi-chart interactions
 *
 * Re-exports utilities from component setup since integration tests
 * also need DOM access.
 */

// Re-export component test utilities
export { fixture, elementUpdated } from '../component/setup';

// Import setup side effects (mocks, cleanup)
import '../component/setup';

import { vi } from 'vitest';

/**
 * Helper to simulate htmx-style innerHTML replacement.
 * This is how htmx typically updates content - replacing innerHTML of a container.
 */
export function simulateHtmxSwap(container: HTMLElement, newHtml: string): void {
  container.innerHTML = newHtml;
}

/**
 * Helper to wait for multiple Lit elements to complete update cycles.
 */
export async function allElementsUpdated(
  elements: Array<{ updateComplete: Promise<boolean> }>
): Promise<void> {
  await Promise.all(elements.map((el) => el.updateComplete));
}

/**
 * Helper to wait for a short delay (useful for animation frames or batched updates).
 */
export async function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Helper to wait for custom elements to be defined and ready.
 */
export async function waitForDefinition(tagName: string): Promise<void> {
  await customElements.whenDefined(tagName);
}

/**
 * Helper to create a chart with complex nested structure for integration testing.
 */
export async function createComplexChart(
  chartHtml: string
): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = chartHtml;
  document.body.appendChild(container);

  // Wait for all chart elements to update
  const charts = container.querySelectorAll(
    'dc-chart, dc-pie-chart, dc-funnel-chart'
  );
  for (const chart of charts) {
    if ('updateComplete' in chart) {
      await (chart as unknown as { updateComplete: Promise<boolean> })
        .updateComplete;
    }
  }

  return container;
}

/**
 * Helper to query shadow DOM across nested elements.
 */
export function queryShadow(
  element: Element,
  selector: string
): Element | null {
  if (element.shadowRoot) {
    return element.shadowRoot.querySelector(selector);
  }
  return null;
}

/**
 * Helper to query all matching elements in shadow DOM.
 */
export function queryShadowAll(
  element: Element,
  selector: string
): NodeListOf<Element> {
  if (element.shadowRoot) {
    return element.shadowRoot.querySelectorAll(selector);
  }
  return document.querySelectorAll('__nonexistent__'); // Empty NodeList
}
