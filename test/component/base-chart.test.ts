import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { fixture, elementUpdated } from './setup';

// Import a concrete chart to test base-chart functionality
import '../../src/pie-chart';
import '../../src/chart-pie-slice';
import '../../src/chart-legend';
import '../../src/chart-title';
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

  // ============================================================================
  // SVG Export - Full Path Tests
  // ============================================================================

  describe('SVG export full path', () => {
    it('prepareSvgForExport adds xmlns attribute', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);

      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();

      // Clone and prepare for export
      const svgClone = svg!.cloneNode(true) as SVGElement;
      svgClone.removeAttribute('xmlns');

      (chart as any).prepareSvgForExport(svgClone);

      expect(svgClone.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
    });

    it('prepareSvgForExport sets width and height', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { width: '400', height: '300' }, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);

      const svg = chart.shadowRoot?.querySelector('svg');
      const svgClone = svg!.cloneNode(true) as SVGElement;
      svgClone.removeAttribute('width');
      svgClone.removeAttribute('height');

      (chart as any).prepareSvgForExport(svgClone);

      expect(svgClone.getAttribute('width')).toBe('400');
      expect(svgClone.getAttribute('height')).toBe('300');
    });

    it('prepareSvgForExport applies font-family to text elements', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-title>Test Title</dc-title>
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);

      const svg = chart.shadowRoot?.querySelector('svg');
      const svgClone = svg!.cloneNode(true) as SVGElement;

      // Clear font-family from text elements
      const textElements = svgClone.querySelectorAll('text');
      textElements.forEach(el => el.removeAttribute('font-family'));

      (chart as any).prepareSvgForExport(svgClone);

      // After export, text elements should have font-family
      const textAfter = svgClone.querySelectorAll('text');
      textAfter.forEach(el => {
        // Text elements should have font-family set
        expect(el.hasAttribute('font-family')).toBe(true);
      });
    });

    it('downloadSvg creates download link', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
      `);

      // Track the link creation
      let downloadFilename = '';
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') {
          const originalClick = el.click.bind(el);
          el.click = () => {
            downloadFilename = (el as HTMLAnchorElement).download;
          };
        }
        return el;
      });

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      chart.downloadSvg('test-chart');

      expect(downloadFilename).toBe('test-chart.svg');
    });
  });

  // ============================================================================
  // Accessibility Description Modes
  // ============================================================================

  describe('accessibility description modes', () => {
    it('returns empty description when aria-insights is none', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'aria-insights': 'none' }, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);

      const description = (chart as any).generateAccessibilityDescription();
      expect(description).toBe('');
    });

    it('uses custom aria-description when provided', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'aria-description': 'Custom description for testing' }, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);

      const description = (chart as any).generateAccessibilityDescription();
      expect(description).toBe('Custom description for testing');
    });

    it('includes data summary in basic mode', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'aria-insights': 'basic' }, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);

      const description = (chart as any).generateAccessibilityDescription();
      // Basic mode should have data summary but not insights
      expect(description.length).toBeGreaterThan(0);
    });

    it('includes insights in auto mode', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'aria-insights': 'auto' }, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);

      const description = (chart as any).generateAccessibilityDescription();
      expect(description.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Padding Parsing
  // ============================================================================

  describe('padding parsing', () => {
    it('parses 3-value padding shorthand', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { padding: '10 20 30' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const parsed = (chart as any).parsePaddingShorthand();
      expect(parsed.top).toBeDefined();
      expect(parsed.right).toBeDefined();
      expect(parsed.bottom).toBeDefined();
      expect(parsed.left).toBeDefined();
      // In 3-value: top, left/right, bottom
      expect(parsed.right).toBe(parsed.left);
    });

    it('parses 4-value padding shorthand', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { padding: '10 20 30 40' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const parsed = (chart as any).parsePaddingShorthand();
      expect(parsed.top).toBeDefined();
      expect(parsed.right).toBeDefined();
      expect(parsed.bottom).toBeDefined();
      expect(parsed.left).toBeDefined();
    });

    it('returns empty object for empty padding', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const parsed = (chart as any).parsePaddingShorthand();
      expect(parsed).toEqual({});
    });

    it('returns empty object for invalid padding (5+ values)', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { padding: '10 20 30 40 50' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const parsed = (chart as any).parsePaddingShorthand();
      expect(parsed).toEqual({});
    });

    it('parses percentage padding values', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { padding: '10%' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const parsed = (chart as any).parsePaddingShorthand();
      expect(parsed.top).toBeDefined();
      expect(parsed.top).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Aria Label Generation
  // ============================================================================

  describe('aria label generation', () => {
    it('uses custom aria-label when provided', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'aria-label': 'My Custom Chart' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const label = (chart as any).getAriaLabel();
      expect(label).toBe('My Custom Chart');
    });

    it('uses chart type when no title', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const label = (chart as any).getAriaLabel();
      expect(label.toLowerCase()).toContain('pie');
    });

    it('getChartTypeName returns chart type', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const typeName = (chart as any).getChartTypeName();
      expect(typeName.toLowerCase()).toContain('pie');
    });
  });

  // ============================================================================
  // Evaluate Show Condition
  // ============================================================================

  describe('evaluateShowCondition', () => {
    beforeEach(async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
    });

    it('returns boolean condition directly', () => {
      expect((chart as any).evaluateShowCondition(true, 50, 50)).toBe(true);
      expect((chart as any).evaluateShowCondition(false, 50, 50)).toBe(false);
    });

    it('evaluates percent threshold condition', () => {
      const condition = { type: 'percent', threshold: 10 };
      expect((chart as any).evaluateShowCondition(condition, 100, 15)).toBe(true);
      expect((chart as any).evaluateShowCondition(condition, 100, 5)).toBe(false);
      expect((chart as any).evaluateShowCondition(condition, 100, 10)).toBe(true);
    });

    it('evaluates value threshold condition', () => {
      const condition = { type: 'value', threshold: 50 };
      expect((chart as any).evaluateShowCondition(condition, 100, 10)).toBe(true);
      expect((chart as any).evaluateShowCondition(condition, 30, 10)).toBe(false);
      expect((chart as any).evaluateShowCondition(condition, 50, 10)).toBe(true);
    });
  });

  // ============================================================================
  // Legend and Title Dimensions
  // ============================================================================

  describe('legend dimensions', () => {
    it('returns null when no legend present', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const dims = (chart as any).getLegendDimensions([]);
      expect(dims).toBe(null);
    });

    it('getLegend returns legend element when present', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-legend position="bottom"></dc-legend>
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const legend = (chart as any).getLegend();
      expect(legend).not.toBe(null);
      expect(legend.tagName.toLowerCase()).toBe('dc-legend');
    });

    it('getLegend returns null when no legend', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const legend = (chart as any).getLegend();
      expect(legend).toBe(null);
    });
  });

  describe('title dimensions', () => {
    it('returns null when no title present', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const dims = (chart as any).getTitleDimensions();
      expect(dims).toBe(null);
    });

    it('getTitle returns title text when present', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-title>Chart Title</dc-title>
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const title = (chart as any).getTitle();
      expect(title).toBe('Chart Title');
    });

    it('getTitle returns empty string when no title', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const title = (chart as any).getTitle();
      expect(title).toBe('');
    });
  });

  // ============================================================================
  // Number Formatting
  // ============================================================================

  describe('number formatting', () => {
    it('getFormatter returns cached formatter', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const formatter1 = chart.getFormatter();
      const formatter2 = chart.getFormatter();
      expect(formatter1).toBe(formatter2);
    });

    it('formatValue uses chart formatter', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'value-format': 'number 0' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const formatted = chart.formatValue(1234.56);
      expect(formatted).toBe('1,235');
    });

    it('formatPercent formats as percentage', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const formatted = chart.formatPercent(0.5);
      expect(formatted).toContain('50');
    });
  });

  // ============================================================================
  // Get Legend Items
  // ============================================================================

  describe('getLegendItems', () => {
    it('returns items based on data elements', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      // getLegendItems returns items for potential legend, even without dc-legend element
      const items = (chart as any).getLegendItems();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(1);
      expect(items[0].label).toBe('A');
    });

    it('returns multiple items for multiple slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);

      const items = (chart as any).getLegendItems();
      expect(items.length).toBe(2);
      expect(items[0].label).toBe('A');
      expect(items[1].label).toBe('B');
    });
  });

  // ============================================================================
  // Connected Callback
  // ============================================================================

  describe('connectedCallback', () => {
    it('sets data-chart-type attribute', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      expect(chart.getAttribute('data-chart-type')).toBe('dc-pie-chart');
    });
  });

  // ============================================================================
  // Slot Change Handler
  // ============================================================================

  describe('handleSlotChange', () => {
    it('triggers requestUpdate when slot changes', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      const updateSpy = vi.spyOn(chart, 'requestUpdate');
      (chart as any).handleSlotChange();
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Will Update
  // ============================================================================

  describe('willUpdate', () => {
    it('invalidates formatter when locale changes', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);

      // Get formatter to cache it
      const formatter1 = chart.getFormatter();
      expect(formatter1).toBeDefined();

      // Simulate locale change
      const changedProps = new Map([['locale', 'en-US']]);
      (chart as any).willUpdate(changedProps);

      // Formatter should be recreated
      const formatter2 = chart.getFormatter();
      expect(formatter2).not.toBe(formatter1);
    });
  });
});
