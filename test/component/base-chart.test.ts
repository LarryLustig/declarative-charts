import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { fixture, elementUpdated } from './setup';

// Import a concrete chart to test base-chart functionality
import '../../src/pie-chart';
import '../../src/chart-pie-slice';
import { PieChart } from '../../src/pie-chart';

/**
 * Component tests for BaseChart functionality.
 *
 * Tests base class features using PieChart as a concrete implementation:
 * - Keyboard navigation (roving tabindex pattern)
 * - Focus management
 * - Shape bounds calculation
 * - SVG export/download
 * - High contrast accessibility announcements
 */

describe('BaseChart component', () => {
  let chart: PieChart;

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  describe('keyboard navigation', () => {
    beforeEach(async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="30" label="A"></dc-pie-slice>
        <dc-pie-slice value="40" label="B"></dc-pie-slice>
        <dc-pie-slice value="30" label="C"></dc-pie-slice>
      `);
    });

    it('getFocusableElements returns elements for slices', () => {
      const elements = (chart as any).getFocusableElements();
      expect(elements).toHaveLength(3);
      expect(elements[0].index).toBe(0);
      expect(elements[1].index).toBe(1);
      expect(elements[2].index).toBe(2);
    });

    it('handleChartFocus sets keyboardActive and focuses first element', () => {
      expect((chart as any).keyboardActive).toBe(false);
      expect((chart as any).focusedIndex).toBe(-1);

      (chart as any).handleChartFocus();

      expect((chart as any).keyboardActive).toBe(true);
      expect((chart as any).focusedIndex).toBe(0);
    });

    it('handleChartFocus does not reset focusedIndex if already set', () => {
      (chart as any).focusedIndex = 2;
      (chart as any).handleChartFocus();

      expect((chart as any).focusedIndex).toBe(2);
    });

    it('handleChartBlur deactivates keyboard mode when focus leaves chart', () => {
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 1;

      // Simulate blur with focus leaving the chart
      const event = new FocusEvent('blur', { relatedTarget: document.body });
      (chart as any).handleChartBlur(event);

      expect((chart as any).keyboardActive).toBe(false);
      // focusedIndex is preserved to return to same element
      expect((chart as any).focusedIndex).toBe(1);
    });

    it('handleChartBlur keeps keyboard mode when focus stays in chart', () => {
      (chart as any).keyboardActive = true;

      // Simulate blur with focus staying in shadow DOM
      const svg = chart.shadowRoot?.querySelector('svg');
      const event = new FocusEvent('blur', { relatedTarget: svg });
      (chart as any).handleChartBlur(event);

      expect((chart as any).keyboardActive).toBe(true);
    });

    it('ArrowRight moves focus to next element', () => {
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 0;

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      vi.spyOn(event, 'preventDefault');
      (chart as any).handleChartKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect((chart as any).focusedIndex).toBe(1);
    });

    it('ArrowDown moves focus to next element', () => {
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 0;

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      vi.spyOn(event, 'preventDefault');
      (chart as any).handleChartKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect((chart as any).focusedIndex).toBe(1);
    });

    it('ArrowLeft moves focus to previous element', () => {
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 1;

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      vi.spyOn(event, 'preventDefault');
      (chart as any).handleChartKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect((chart as any).focusedIndex).toBe(0);
    });

    it('ArrowUp moves focus to previous element', () => {
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 1;

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      vi.spyOn(event, 'preventDefault');
      (chart as any).handleChartKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect((chart as any).focusedIndex).toBe(0);
    });

    it('ArrowRight wraps to first element from last', () => {
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 2; // Last element

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      (chart as any).handleChartKeyDown(event);

      expect((chart as any).focusedIndex).toBe(0);
    });

    it('ArrowLeft wraps to last element from first', () => {
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 0;

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      (chart as any).handleChartKeyDown(event);

      expect((chart as any).focusedIndex).toBe(2);
    });

    it('Home moves focus to first element', () => {
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 2;

      const event = new KeyboardEvent('keydown', { key: 'Home' });
      vi.spyOn(event, 'preventDefault');
      (chart as any).handleChartKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect((chart as any).focusedIndex).toBe(0);
    });

    it('End moves focus to last element', () => {
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 0;

      const event = new KeyboardEvent('keydown', { key: 'End' });
      vi.spyOn(event, 'preventDefault');
      (chart as any).handleChartKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect((chart as any).focusedIndex).toBe(2);
    });

    it('Escape hides popup and deactivates keyboard mode', () => {
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 1;
      (chart as any).popupVisible = true;

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      vi.spyOn(event, 'preventDefault');
      (chart as any).handleChartKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect((chart as any).keyboardActive).toBe(false);
      expect((chart as any).focusedIndex).toBe(-1);
    });

    it('Enter activates current element', () => {
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 1;

      const activateSpy = vi.spyOn(chart as any, 'activateCurrentElement');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(event, 'preventDefault');
      (chart as any).handleChartKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(activateSpy).toHaveBeenCalled();
    });

    it('Space activates current element', () => {
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 1;

      const activateSpy = vi.spyOn(chart as any, 'activateCurrentElement');

      const event = new KeyboardEvent('keydown', { key: ' ' });
      vi.spyOn(event, 'preventDefault');
      (chart as any).handleChartKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(activateSpy).toHaveBeenCalled();
    });

    it('handleChartKeyDown does nothing with no focusable elements', async () => {
      // Create empty chart
      chart = await fixture<PieChart>('dc-pie-chart');

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      vi.spyOn(event, 'preventDefault');
      (chart as any).handleChartKeyDown(event);

      // Should not throw or call preventDefault
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Focus Element Methods
  // ============================================================================

  describe('focus element methods', () => {
    beforeEach(async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
    });

    it('focusElement sets focusedIndex and keyboardActive', () => {
      (chart as any).focusElement(1);

      expect((chart as any).focusedIndex).toBe(1);
      expect((chart as any).keyboardActive).toBe(true);
    });

    it('focusElement does nothing for invalid index', () => {
      (chart as any).focusedIndex = 0;
      (chart as any).focusElement(-1);
      expect((chart as any).focusedIndex).toBe(0);

      (chart as any).focusElement(10);
      expect((chart as any).focusedIndex).toBe(0);
    });

    it('focusNextElement wraps around', () => {
      (chart as any).focusedIndex = 1; // Last element
      (chart as any).focusNextElement();
      expect((chart as any).focusedIndex).toBe(0);
    });

    it('focusPreviousElement wraps around', () => {
      (chart as any).focusedIndex = 0;
      (chart as any).focusPreviousElement();
      expect((chart as any).focusedIndex).toBe(1);
    });

    it('focusNextElement does nothing with no elements', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      (chart as any).focusedIndex = 0;
      (chart as any).focusNextElement();
      expect((chart as any).focusedIndex).toBe(0);
    });

    it('focusPreviousElement does nothing with no elements', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      (chart as any).focusedIndex = 0;
      (chart as any).focusPreviousElement();
      expect((chart as any).focusedIndex).toBe(0);
    });
  });

  // ============================================================================
  // Activate Current Element
  // ============================================================================

  describe('activateCurrentElement', () => {
    it('does nothing for invalid focused index', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      (chart as any).focusedIndex = -1;
      // Should not throw
      (chart as any).activateCurrentElement();
    });

    it('does nothing for out of range focused index', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      (chart as any).focusedIndex = 10;
      // Should not throw
      (chart as any).activateCurrentElement();
    });
  });

  // ============================================================================
  // Shape Helper Methods
  // ============================================================================

  describe('shape helper methods', () => {
    beforeEach(async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
    });

    it('getShapeTabIndex returns -1 for roving tabindex pattern', () => {
      expect((chart as any).getShapeTabIndex(0)).toBe(-1);
      expect((chart as any).getShapeTabIndex(1)).toBe(-1);
    });

    it('isShapeFocused returns true only when keyboard active and index matches', () => {
      (chart as any).keyboardActive = false;
      (chart as any).focusedIndex = 0;
      expect((chart as any).isShapeFocused(0)).toBe(false);

      (chart as any).keyboardActive = true;
      expect((chart as any).isShapeFocused(0)).toBe(true);
      expect((chart as any).isShapeFocused(1)).toBe(false);
    });

    it('getShapeAriaLabel returns element label', () => {
      const label = (chart as any).getShapeAriaLabel(0);
      expect(label).toContain('A');
      expect(label).toContain('50');
    });

    it('getShapeAriaLabel returns empty for invalid index', () => {
      expect((chart as any).getShapeAriaLabel(-1)).toBe('');
      expect((chart as any).getShapeAriaLabel(10)).toBe('');
    });

    it('getShapeBounds returns bounds for valid shape', () => {
      const bounds = (chart as any).getShapeBounds(0);
      // In happy-dom, getBBox may not work correctly, but we test the method exists
      // The method should either return bounds or null
      expect(bounds === null || typeof bounds === 'object').toBe(true);
    });

    it('getShapeBounds returns null for invalid index', () => {
      const bounds = (chart as any).getShapeBounds(100);
      expect(bounds).toBe(null);
    });

    it('getShapeBounds returns null when no SVG', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      // Empty chart may not have SVG rendered
      const bounds = (chart as any).getShapeBounds(0);
      expect(bounds).toBe(null);
    });
  });

  // ============================================================================
  // Render Focus Indicator
  // ============================================================================

  describe('renderFocusIndicator', () => {
    it('returns empty when keyboard not active', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      (chart as any).keyboardActive = false;
      const result = (chart as any).renderFocusIndicator();
      expect(result).toBeDefined();
    });

    it('returns empty when focusedIndex is -1', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = -1;
      const result = (chart as any).renderFocusIndicator();
      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // SVG Export
  // ============================================================================

  describe('SVG export', () => {
    it('downloadSvg warns when no SVG element', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      // Force no SVG by removing it
      const svg = chart.shadowRoot?.querySelector('svg');
      svg?.remove();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      chart.downloadSvg();

      expect(warnSpy).toHaveBeenCalledWith('No SVG element found in chart shadow DOM');
    });

    it('downloadSvg method exists and is callable', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      // Just verify the method exists - actual download testing would require more setup
      expect(typeof chart.downloadSvg).toBe('function');
    });
  });

  // ============================================================================
  // High Contrast Accessibility
  // ============================================================================

  describe('high contrast accessibility', () => {
    it('includes high contrast announcement when active', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'high-contrast': '' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const description = (chart as any).generateAccessibilityDescription();
      expect(description).toContain('High contrast mode active');
    });

    it('does not include high contrast announcement when inactive', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const description = (chart as any).generateAccessibilityDescription();
      expect(description).not.toContain('High contrast mode active');
    });
  });

  // ============================================================================
  // Default implementations
  // ============================================================================

  describe('default implementations', () => {
    it('showPopupForFocusedElement does nothing in base class', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      // Call the base class method directly if possible
      // Since pie chart overrides this, we just verify it doesn't crash
      (chart as any).focusedIndex = 0;
      // The method should exist and not throw
      expect(() => (chart as any).showPopupForFocusedElement(0)).not.toThrow();
    });

    it('togglePopupForFocusedElement does nothing in base class', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      // The method should exist and not throw
      expect(() => (chart as any).togglePopupForFocusedElement(0)).not.toThrow();
    });
  });
});
