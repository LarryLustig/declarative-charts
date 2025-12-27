import { describe, it, expect, beforeEach } from 'vitest';
import {
  ChartTitle,
  SVG_TEXT_STYLE_ATTRS,
  HTML_TO_SVG_WARNINGS,
  type TitlePosition,
  type TitleStyleWarning,
} from '../../src/chart-title';

/**
 * Tests for ChartTitle element and related constants.
 *
 * Focuses on:
 * - SVG_TEXT_STYLE_ATTRS constant
 * - HTML_TO_SVG_WARNINGS constant
 * - TitlePosition type values
 * - TitleStyleWarning interface
 * - ChartTitle property defaults
 * - getSvgStyleAttributes method
 * - getStyleWarnings method
 * - getFontSize method
 */

// ============================================================================
// SVG_TEXT_STYLE_ATTRS constant
// ============================================================================

describe('SVG_TEXT_STYLE_ATTRS', () => {
  it('is a Set', () => {
    expect(SVG_TEXT_STYLE_ATTRS).toBeInstanceOf(Set);
  });

  it('contains expected SVG text attributes', () => {
    const expected = [
      'fill',
      'font-family',
      'font-size',
      'font-style',
      'font-weight',
      'text-decoration',
      'letter-spacing',
      'word-spacing',
      'opacity',
    ];
    expected.forEach(attr => {
      expect(SVG_TEXT_STYLE_ATTRS.has(attr)).toBe(true);
    });
  });

  it('does not contain HTML/CSS attributes', () => {
    const htmlAttrs = ['color', 'background', 'margin', 'padding', 'class', 'style'];
    htmlAttrs.forEach(attr => {
      expect(SVG_TEXT_STYLE_ATTRS.has(attr)).toBe(false);
    });
  });

  it('does not contain structural attributes', () => {
    const structuralAttrs = ['position', 'id', 'x', 'y', 'transform'];
    structuralAttrs.forEach(attr => {
      expect(SVG_TEXT_STYLE_ATTRS.has(attr)).toBe(false);
    });
  });
});

// ============================================================================
// HTML_TO_SVG_WARNINGS constant
// ============================================================================

describe('HTML_TO_SVG_WARNINGS', () => {
  it('is an object', () => {
    expect(typeof HTML_TO_SVG_WARNINGS).toBe('object');
  });

  it('has warning for color attribute', () => {
    expect(HTML_TO_SVG_WARNINGS['color']).toBeDefined();
    expect(HTML_TO_SVG_WARNINGS['color'].svgAttr).toBe('fill');
    expect(HTML_TO_SVG_WARNINGS['color'].message).toContain('fill');
  });

  it('each warning has svgAttr and message', () => {
    Object.entries(HTML_TO_SVG_WARNINGS).forEach(([key, value]) => {
      expect(value.svgAttr).toBeDefined();
      expect(typeof value.svgAttr).toBe('string');
      expect(value.message).toBeDefined();
      expect(typeof value.message).toBe('string');
    });
  });
});

// ============================================================================
// TitlePosition type
// ============================================================================

describe('TitlePosition type', () => {
  it('accepts all valid position values', () => {
    const positions: TitlePosition[] = [
      'top',
      'top-left',
      'top-right',
      'left',
      'right',
      'bottom',
      'bottom-left',
      'bottom-right',
    ];
    expect(positions).toHaveLength(8);
  });
});

// ============================================================================
// TitleStyleWarning interface
// ============================================================================

describe('TitleStyleWarning interface', () => {
  it('can represent a warning object', () => {
    const warning: TitleStyleWarning = {
      attribute: 'color',
      value: 'red',
      message: 'Use fill instead of color',
    };
    expect(warning.attribute).toBe('color');
    expect(warning.value).toBe('red');
    expect(warning.message).toContain('fill');
  });
});

// ============================================================================
// ChartTitle static constants
// ============================================================================

describe('ChartTitle static constants', () => {
  it('DEFAULT_FONT_SIZE is defined', () => {
    expect(ChartTitle.DEFAULT_FONT_SIZE).toBeDefined();
  });

  it('DEFAULT_FONT_SIZE is a reasonable size', () => {
    expect(ChartTitle.DEFAULT_FONT_SIZE).toBeGreaterThan(10);
    expect(ChartTitle.DEFAULT_FONT_SIZE).toBeLessThan(50);
  });
});

// ============================================================================
// ChartTitle properties
// ============================================================================

describe('ChartTitle properties', () => {
  let title: ChartTitle;

  beforeEach(() => {
    title = new ChartTitle();
  });

  describe('default values', () => {
    it('position defaults to "top"', () => {
      expect(title.position).toBe('top');
    });
  });

  describe('property assignment', () => {
    it('can set position to all valid values', () => {
      const positions: TitlePosition[] = [
        'top', 'top-left', 'top-right',
        'left', 'right',
        'bottom', 'bottom-left', 'bottom-right',
      ];
      positions.forEach(pos => {
        title.position = pos;
        expect(title.position).toBe(pos);
      });
    });
  });
});

// ============================================================================
// getSvgStyleAttributes
// ============================================================================

describe('getSvgStyleAttributes', () => {
  let title: ChartTitle;

  beforeEach(() => {
    title = new ChartTitle();
  });

  it('returns empty object when no SVG attributes set', () => {
    const attrs = title.getSvgStyleAttributes();
    expect(attrs).toEqual({});
  });

  it('returns fill attribute', () => {
    title.setAttribute('fill', '#1a1a1a');
    const attrs = title.getSvgStyleAttributes();
    expect(attrs['fill']).toBe('#1a1a1a');
  });

  it('returns font-size attribute', () => {
    title.setAttribute('font-size', '24');
    const attrs = title.getSvgStyleAttributes();
    expect(attrs['font-size']).toBe('24');
  });

  it('returns font-family attribute', () => {
    title.setAttribute('font-family', 'Georgia, serif');
    const attrs = title.getSvgStyleAttributes();
    expect(attrs['font-family']).toBe('Georgia, serif');
  });

  it('returns font-weight attribute', () => {
    title.setAttribute('font-weight', 'bold');
    const attrs = title.getSvgStyleAttributes();
    expect(attrs['font-weight']).toBe('bold');
  });

  it('returns font-style attribute', () => {
    title.setAttribute('font-style', 'italic');
    const attrs = title.getSvgStyleAttributes();
    expect(attrs['font-style']).toBe('italic');
  });

  it('returns text-decoration attribute', () => {
    title.setAttribute('text-decoration', 'underline');
    const attrs = title.getSvgStyleAttributes();
    expect(attrs['text-decoration']).toBe('underline');
  });

  it('returns letter-spacing attribute', () => {
    title.setAttribute('letter-spacing', '2');
    const attrs = title.getSvgStyleAttributes();
    expect(attrs['letter-spacing']).toBe('2');
  });

  it('returns word-spacing attribute', () => {
    title.setAttribute('word-spacing', '4');
    const attrs = title.getSvgStyleAttributes();
    expect(attrs['word-spacing']).toBe('4');
  });

  it('returns opacity attribute', () => {
    title.setAttribute('opacity', '0.8');
    const attrs = title.getSvgStyleAttributes();
    expect(attrs['opacity']).toBe('0.8');
  });

  it('returns multiple SVG attributes', () => {
    title.setAttribute('fill', '#333');
    title.setAttribute('font-size', '20');
    title.setAttribute('font-weight', 'bold');
    const attrs = title.getSvgStyleAttributes();
    expect(attrs).toEqual({
      'fill': '#333',
      'font-size': '20',
      'font-weight': 'bold',
    });
  });

  it('ignores non-SVG attributes', () => {
    title.setAttribute('fill', '#333');
    title.setAttribute('position', 'top-left'); // Not an SVG style attr
    title.setAttribute('id', 'my-title'); // Not an SVG style attr
    const attrs = title.getSvgStyleAttributes();
    expect(attrs).toEqual({ 'fill': '#333' });
  });

  it('ignores HTML-style attributes', () => {
    title.setAttribute('fill', '#333');
    title.setAttribute('color', 'red'); // HTML, not SVG
    const attrs = title.getSvgStyleAttributes();
    expect(attrs).toEqual({ 'fill': '#333' });
  });
});

// ============================================================================
// getStyleWarnings
// ============================================================================

describe('getStyleWarnings', () => {
  let title: ChartTitle;

  beforeEach(() => {
    title = new ChartTitle();
  });

  it('returns empty array when no problematic attributes', () => {
    title.setAttribute('fill', '#333');
    title.setAttribute('font-size', '24');
    const warnings = title.getStyleWarnings();
    expect(warnings).toEqual([]);
  });

  it('warns about color attribute (should be fill)', () => {
    title.setAttribute('color', 'blue');
    const warnings = title.getStyleWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0].attribute).toBe('color');
    expect(warnings[0].value).toBe('blue');
    expect(warnings[0].message).toContain('dc-title');
    expect(warnings[0].message).toContain('fill');
  });

  it('warns about font-size with px unit', () => {
    title.setAttribute('font-size', '24px');
    const warnings = title.getStyleWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0].attribute).toBe('font-size');
    expect(warnings[0].value).toBe('24px');
    expect(warnings[0].message).toContain('unitless');
  });

  it('warns about font-size with em unit', () => {
    title.setAttribute('font-size', '1.5em');
    const warnings = title.getStyleWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0].attribute).toBe('font-size');
  });

  it('warns about font-size with rem unit', () => {
    title.setAttribute('font-size', '1.25rem');
    const warnings = title.getStyleWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0].attribute).toBe('font-size');
  });

  it('warns about font-size with pt unit', () => {
    title.setAttribute('font-size', '18pt');
    const warnings = title.getStyleWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0].attribute).toBe('font-size');
  });

  it('warns about font-size with percent', () => {
    title.setAttribute('font-size', '120%');
    const warnings = title.getStyleWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0].attribute).toBe('font-size');
  });

  it('does not warn about unitless font-size', () => {
    title.setAttribute('font-size', '24');
    const warnings = title.getStyleWarnings();
    expect(warnings).toEqual([]);
  });

  it('does not warn about decimal font-size', () => {
    title.setAttribute('font-size', '18.5');
    const warnings = title.getStyleWarnings();
    expect(warnings).toEqual([]);
  });

  it('returns multiple warnings for multiple issues', () => {
    title.setAttribute('color', 'red');
    title.setAttribute('font-size', '24px');
    const warnings = title.getStyleWarnings();
    expect(warnings.length).toBe(2);
    expect(warnings.map(w => w.attribute)).toContain('color');
    expect(warnings.map(w => w.attribute)).toContain('font-size');
  });

  it('warning message suggests correct usage', () => {
    title.setAttribute('font-size', '24px');
    const warnings = title.getStyleWarnings();
    expect(warnings[0].message).toContain('24'); // Suggests the number without unit
  });
});

// ============================================================================
// getFontSize
// ============================================================================

describe('getFontSize', () => {
  let title: ChartTitle;

  beforeEach(() => {
    title = new ChartTitle();
  });

  it('returns default when no font-size set', () => {
    expect(title.getFontSize()).toBe(ChartTitle.DEFAULT_FONT_SIZE);
  });

  it('returns parsed font-size when set', () => {
    title.setAttribute('font-size', '24');
    expect(title.getFontSize()).toBe(24);
  });

  it('parses decimal font-size', () => {
    title.setAttribute('font-size', '18.5');
    expect(title.getFontSize()).toBe(18.5);
  });

  it('returns default for invalid font-size', () => {
    title.setAttribute('font-size', 'invalid');
    expect(title.getFontSize()).toBe(ChartTitle.DEFAULT_FONT_SIZE);
  });

  it('returns default for empty font-size', () => {
    title.setAttribute('font-size', '');
    expect(title.getFontSize()).toBe(ChartTitle.DEFAULT_FONT_SIZE);
  });

  it('parses font-size with CSS unit (extracts number)', () => {
    // parseFloat extracts the leading number
    title.setAttribute('font-size', '24px');
    expect(title.getFontSize()).toBe(24);
  });
});

// ============================================================================
// NOTE: The following methods require DOM environment for testing:
// - text getter (uses textContent)
// - measureText() (uses document.createElement)
// - getDimensions() (uses measureText)
// - generateSvg() (uses multiple DOM methods)
// ============================================================================
