import { describe, it, expect, beforeEach } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/stage-chart';
import '../../src/chart-stage';
import '../../src/chart-fill';
import type { StageChart } from '../../src/stage-chart';

/**
 * Component tests for StageChart zero-* attributes.
 *
 * Tests the zero-value handling features:
 * - zero-hidden: hides zero-value stages
 * - zero-value: controls sizing of zero-value stages
 * - zero-shape: overrides shape for zero-value stages
 * - zero-fill: references a dc-fill element for styling
 * - zero: compound shorthand
 */

// Helper to query shadow DOM
function queryShadow(element: Element, selector: string): Element | null {
  return element.shadowRoot?.querySelector(selector) ?? null;
}

function queryShadowAll(element: Element, selector: string): NodeListOf<Element> {
  return element.shadowRoot?.querySelectorAll(selector) ?? ([] as unknown as NodeListOf<Element>);
}

// ============================================================================
// zero-hidden attribute
// ============================================================================

describe('StageChart zero-hidden', () => {
  it('hides zero-value stages when zero-hidden is set', async () => {
    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      { 'zero-hidden': '' },
      `
        <dc-stage value="100" label="Active"></dc-stage>
        <dc-stage value="0" label="Empty"></dc-stage>
        <dc-stage value="50" label="Partial"></dc-stage>
      `
    );

    // Should only render 2 shapes (not 3)
    const shapes = queryShadowAll(chart, 'rect, circle, ellipse');
    expect(shapes.length).toBe(2);
  });

  it('shows all stages when zero-hidden is not set', async () => {
    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      {},
      `
        <dc-stage value="100" label="Active"></dc-stage>
        <dc-stage value="0" label="Empty"></dc-stage>
        <dc-stage value="50" label="Partial"></dc-stage>
      `
    );

    // Should render all 3 shapes
    const shapes = queryShadowAll(chart, 'rect, circle, ellipse');
    expect(shapes.length).toBe(3);
  });
});

// ============================================================================
// zero-value attribute
// ============================================================================

describe('StageChart zero-value', () => {
  it('accepts numeric zero-value', async () => {
    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      { 'stage-size': 'value', 'zero-value': '50' },
      `
        <dc-stage value="100" label="Active"></dc-stage>
        <dc-stage value="0" label="Empty"></dc-stage>
      `
    );

    expect(chart.zeroValue).toBe('50');
    // Both stages should be rendered
    const shapes = queryShadowAll(chart, 'rect, circle, ellipse');
    expect(shapes.length).toBe(2);
  });

  it('accepts "auto" zero-value', async () => {
    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      { 'stage-size': 'value', 'zero-value': 'auto' },
      `
        <dc-stage value="100" label="Active"></dc-stage>
        <dc-stage value="0" label="Empty"></dc-stage>
        <dc-stage value="50" label="Partial"></dc-stage>
      `
    );

    expect(chart.zeroValue).toBe('auto');
    // All stages should be rendered
    const shapes = queryShadowAll(chart, 'rect, circle, ellipse');
    expect(shapes.length).toBe(3);
  });
});

// ============================================================================
// zero-shape attribute
// ============================================================================

describe('StageChart zero-shape', () => {
  it('uses specified shape for zero-value stages', async () => {
    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      { 'stage-size': 'value', 'zero-value': '50', 'zero-shape': 'circle' },
      `
        <dc-stage value="100" label="Active"></dc-stage>
        <dc-stage value="0" label="Empty"></dc-stage>
      `
    );

    expect(chart.zeroShape).toBe('circle');
    // The zero-value stage should be a circle
    const circles = queryShadowAll(chart, 'circle');
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// zero-fill attribute
// ============================================================================

describe('StageChart zero-fill', () => {
  it('references dc-fill element by ID', async () => {
    // Create the dc-fill element first
    const fill = document.createElement('dc-fill');
    fill.id = 'test-zero-fill';
    fill.setAttribute('fill', 'rgba(200,200,200,0.5)');
    fill.setAttribute('stroke', '#999');
    document.body.appendChild(fill);

    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      { 'stage-size': 'value', 'zero-value': 'auto', 'zero-fill': 'test-zero-fill' },
      `
        <dc-stage value="100" label="Active"></dc-stage>
        <dc-stage value="0" label="Empty"></dc-stage>
      `
    );

    expect(chart.zeroFill).toBe('test-zero-fill');
    // Both stages should be rendered
    const shapes = queryShadowAll(chart, 'rect, circle, ellipse');
    expect(shapes.length).toBe(2);
  });
});

// ============================================================================
// zero compound shorthand
// ============================================================================

describe('StageChart zero shorthand', () => {
  it('parses "hidden" keyword', async () => {
    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      { zero: 'hidden' },
      `
        <dc-stage value="100" label="Active"></dc-stage>
        <dc-stage value="0" label="Empty"></dc-stage>
      `
    );

    expect(chart.zero).toBe('hidden');
    // Zero-value stage should be hidden
    const shapes = queryShadowAll(chart, 'rect, circle, ellipse');
    expect(shapes.length).toBe(1);
  });

  it('parses "auto" keyword', async () => {
    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      { 'stage-size': 'value', zero: 'auto' },
      `
        <dc-stage value="100" label="Active"></dc-stage>
        <dc-stage value="0" label="Empty"></dc-stage>
      `
    );

    expect(chart.zero).toBe('auto');
    // Both stages should be rendered
    const shapes = queryShadowAll(chart, 'rect, circle, ellipse');
    expect(shapes.length).toBe(2);
  });

  it('parses numeric value', async () => {
    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      { 'stage-size': 'value', zero: '75' },
      `
        <dc-stage value="100" label="Active"></dc-stage>
        <dc-stage value="0" label="Empty"></dc-stage>
      `
    );

    expect(chart.zero).toBe('75');
    // Both stages should be rendered
    const shapes = queryShadowAll(chart, 'rect, circle, ellipse');
    expect(shapes.length).toBe(2);
  });

  it('parses compound "auto circle"', async () => {
    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      { 'stage-size': 'value', zero: 'auto circle' },
      `
        <dc-stage value="100" label="Active"></dc-stage>
        <dc-stage value="0" label="Empty"></dc-stage>
      `
    );

    expect(chart.zero).toBe('auto circle');
    // Both stages should be rendered
    const shapes = queryShadowAll(chart, 'rect, circle, ellipse');
    expect(shapes.length).toBe(2);
    // The zero-value stage should be a circle
    const circles = queryShadowAll(chart, 'circle');
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });

  it('explicit zero-value takes precedence over shorthand', async () => {
    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      { 'stage-size': 'value', zero: 'auto', 'zero-value': '100' },
      `
        <dc-stage value="100" label="Active"></dc-stage>
        <dc-stage value="0" label="Empty"></dc-stage>
      `
    );

    // zero-value="100" should take precedence over zero="auto"
    expect(chart.zero).toBe('auto');
    expect(chart.zeroValue).toBe('100');
    // Both stages should be rendered
    const shapes = queryShadowAll(chart, 'rect, circle, ellipse');
    expect(shapes.length).toBe(2);
  });
});

// ============================================================================
// Property access
// ============================================================================

describe('StageChart zero-* properties', () => {
  it('has all zero-* properties accessible', async () => {
    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      {
        zero: 'auto circle',
        'zero-value': '100',
        'zero-fill': 'my-fill',
        'zero-shape': 'square',
        'zero-hidden': ''
      },
      `<dc-stage value="100" label="Test"></dc-stage>`
    );

    expect(chart.zero).toBe('auto circle');
    expect(chart.zeroValue).toBe('100');
    expect(chart.zeroFill).toBe('my-fill');
    expect(chart.zeroShape).toBe('square');
    expect(chart.zeroHidden).toBe(true);
  });

  it('zero-* properties default correctly', async () => {
    const chart = await fixture<StageChart>(
      'dc-stage-chart',
      {},
      `<dc-stage value="100" label="Test"></dc-stage>`
    );

    expect(chart.zero).toBeUndefined();
    expect(chart.zeroValue).toBeUndefined();
    expect(chart.zeroFill).toBeUndefined();
    expect(chart.zeroShape).toBeUndefined();
    expect(chart.zeroHidden).toBe(false);
  });
});
