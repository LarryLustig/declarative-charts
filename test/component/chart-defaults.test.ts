import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/chart-defaults';
import '../../src/chart';
import '../../src/chart-bar';
import { ChartDefaults, findDefaultsElement } from '../../src/chart-defaults';
import { Chart } from '../../src/chart';

/**
 * Component tests for ChartDefaults configuration element.
 *
 * Tests DOM-dependent functionality:
 * - hasDefault() with actual attributes
 * - findDefaultsElement() traversal
 * - Chart.applyDefaults() integration
 */

// ============================================================================
// hasDefault() method with DOM
// ============================================================================

describe('ChartDefaults.hasDefault() with DOM', () => {
  it('returns false for attribute not set', async () => {
    const defaults = await fixture<ChartDefaults>('dc-defaults');
    expect(defaults.hasDefault('animations')).toBe(false);
    expect(defaults.hasDefault('palette')).toBe(false);
  });

  it('returns true for attribute that is set', async () => {
    const defaults = await fixture<ChartDefaults>('dc-defaults', {
      animations: 'true',
      palette: 'viridis',
    });
    expect(defaults.hasDefault('animations')).toBe(true);
    expect(defaults.hasDefault('palette')).toBe(true);
    expect(defaults.hasDefault('high-contrast')).toBe(false);
  });

  it('returns true for boolean attribute present without value', async () => {
    const defaults = await fixture<ChartDefaults>('dc-defaults', {
      'high-contrast': '',
    });
    expect(defaults.hasDefault('high-contrast')).toBe(true);
  });
});

// ============================================================================
// findDefaultsElement() traversal
// ============================================================================

describe('findDefaultsElement()', () => {
  it('returns null when no dc-defaults exists', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      {},
      '<dc-bar value="10" label="A"></dc-bar>'
    );
    // Clear any defaults that might have been added
    document.querySelectorAll('dc-defaults').forEach((el) => el.remove());
    expect(findDefaultsElement(chart)).toBe(null);
  });

  it('finds sibling dc-defaults element', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <dc-defaults palette="viridis"></dc-defaults>
      <dc-chart>
        <dc-bar value="10" label="A"></dc-bar>
      </dc-chart>
    `;
    document.body.appendChild(container);

    const chart = container.querySelector('dc-chart')!;
    const defaults = findDefaultsElement(chart);

    expect(defaults).not.toBe(null);
    expect(defaults?.palette).toBe('viridis');
  });

  it('finds ancestor dc-defaults element', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <dc-defaults animations="500ms"></dc-defaults>
      <div class="nested">
        <div class="deeply-nested">
          <dc-chart>
            <dc-bar value="10" label="A"></dc-bar>
          </dc-chart>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    const chart = container.querySelector('dc-chart')!;
    const defaults = findDefaultsElement(chart);

    expect(defaults).not.toBe(null);
    expect(defaults?.animations).toBe('500ms');
  });

  it('prefers nearer dc-defaults over farther ones', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <dc-defaults palette="outer-palette"></dc-defaults>
      <div class="section">
        <dc-defaults palette="inner-palette"></dc-defaults>
        <dc-chart>
          <dc-bar value="10" label="A"></dc-bar>
        </dc-chart>
      </div>
    `;
    document.body.appendChild(container);

    const chart = container.querySelector('dc-chart')!;
    const defaults = findDefaultsElement(chart);

    expect(defaults).not.toBe(null);
    expect(defaults?.palette).toBe('inner-palette');
  });

  it('finds document-level dc-defaults as fallback', async () => {
    // Add dc-defaults directly to body
    const defaults = document.createElement('dc-defaults');
    defaults.setAttribute('value-format', 'compact 1');
    document.body.appendChild(defaults);

    // Create chart in a different branch of the DOM
    const container = document.createElement('div');
    container.innerHTML = `
      <dc-chart>
        <dc-bar value="10" label="A"></dc-bar>
      </dc-chart>
    `;
    document.body.appendChild(container);

    const chart = container.querySelector('dc-chart')!;
    const foundDefaults = findDefaultsElement(chart);

    expect(foundDefaults).not.toBe(null);
    expect(foundDefaults?.valueFormat).toBe('compact 1');
  });
});

// ============================================================================
// Chart.applyDefaults() integration
// ============================================================================

describe('Chart applies defaults from dc-defaults', () => {
  it('applies palette default to chart', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <dc-defaults palette="category10"></dc-defaults>
      <dc-chart>
        <dc-bar value="10" label="A"></dc-bar>
      </dc-chart>
    `;
    document.body.appendChild(container);

    const chart = container.querySelector('dc-chart') as Chart;
    await elementUpdated(chart);

    expect(chart.paletteId).toBe('category10');
  });

  it('applies animations default to chart', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <dc-defaults animations="500ms"></dc-defaults>
      <dc-chart>
        <dc-bar value="10" label="A"></dc-bar>
      </dc-chart>
    `;
    document.body.appendChild(container);

    const chart = container.querySelector('dc-chart') as Chart;
    await elementUpdated(chart);

    expect(chart.animations).toBe('500ms');
  });

  it('explicit chart attribute overrides dc-defaults', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <dc-defaults palette="viridis"></dc-defaults>
      <dc-chart palette="category10">
        <dc-bar value="10" label="A"></dc-bar>
      </dc-chart>
    `;
    document.body.appendChild(container);

    const chart = container.querySelector('dc-chart') as Chart;
    await elementUpdated(chart);

    // Chart's explicit attribute should win
    expect(chart.paletteId).toBe('category10');
  });

  it('applies multiple defaults', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <dc-defaults
        palette="viridis"
        animations="true"
        value-format="compact 1"
        show-percent
      ></dc-defaults>
      <dc-chart>
        <dc-bar value="10" label="A"></dc-bar>
      </dc-chart>
    `;
    document.body.appendChild(container);

    const chart = container.querySelector('dc-chart') as Chart;
    await elementUpdated(chart);

    expect(chart.paletteId).toBe('viridis');
    expect(chart.animations).toBe('true');
    expect(chart.valueFormat).toBe('compact 1');
    expect(chart.showPercent).toBe(true);
  });

  it('applies defaults to multiple charts', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <dc-defaults palette="category10" animations></dc-defaults>
      <dc-chart id="chart1">
        <dc-bar value="10" label="A"></dc-bar>
      </dc-chart>
      <dc-chart id="chart2">
        <dc-bar value="20" label="B"></dc-bar>
      </dc-chart>
    `;
    document.body.appendChild(container);

    const chart1 = container.querySelector('#chart1') as Chart;
    const chart2 = container.querySelector('#chart2') as Chart;
    await elementUpdated(chart1);
    await elementUpdated(chart2);

    expect(chart1.paletteId).toBe('category10');
    expect(chart1.animations).toBe('');
    expect(chart2.paletteId).toBe('category10');
    expect(chart2.animations).toBe('');
  });

  it('scoped defaults only affect charts in scope', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <dc-defaults palette="outer-palette"></dc-defaults>
      <dc-chart id="outer-chart">
        <dc-bar value="10" label="A"></dc-bar>
      </dc-chart>
      <div class="scoped">
        <dc-defaults palette="scoped-palette"></dc-defaults>
        <dc-chart id="scoped-chart">
          <dc-bar value="20" label="B"></dc-bar>
        </dc-chart>
      </div>
    `;
    document.body.appendChild(container);

    const outerChart = container.querySelector('#outer-chart') as Chart;
    const scopedChart = container.querySelector('#scoped-chart') as Chart;
    await elementUpdated(outerChart);
    await elementUpdated(scopedChart);

    expect(outerChart.paletteId).toBe('outer-palette');
    expect(scopedChart.paletteId).toBe('scoped-palette');
  });
});
