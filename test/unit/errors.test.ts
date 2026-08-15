import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  formatErrorMessage,
  getErrorByCode,
  createErrorLog,
  type ErrorDefinition,
  type ErrorCodeKey
} from '../../src/errors';

describe('Error Code Registry', () => {
  describe('ErrorCode structure', () => {
    it('all error codes have required fields', () => {
      for (const key in ErrorCode) {
        const error = ErrorCode[key as ErrorCodeKey];
        expect(error.code, `${key} should have code`).toBeDefined();
        expect(error.level, `${key} should have level`).toBeDefined();
        expect(error.path, `${key} should have path`).toBeDefined();
        expect(error.message, `${key} should have message`).toBeDefined();
      }
    });

    it('all error codes follow DC### format', () => {
      const codePattern = /^DC\d{3}$/;
      for (const key in ErrorCode) {
        const error = ErrorCode[key as ErrorCodeKey];
        expect(error.code, `${key} code should match DC### format`).toMatch(codePattern);
      }
    });

    it('all error codes have valid log levels', () => {
      const validLevels = ['error', 'warning', 'info'];
      for (const key in ErrorCode) {
        const error = ErrorCode[key as ErrorCodeKey];
        expect(validLevels, `${key} should have valid level`).toContain(error.level);
      }
    });

    it('all error codes have non-empty paths', () => {
      for (const key in ErrorCode) {
        const error = ErrorCode[key as ErrorCodeKey];
        expect(error.path.length, `${key} should have non-empty path`).toBeGreaterThan(0);
      }
    });

    it('all error codes have non-empty messages', () => {
      for (const key in ErrorCode) {
        const error = ErrorCode[key as ErrorCodeKey];
        expect(error.message.length, `${key} should have non-empty message`).toBeGreaterThan(0);
      }
    });
  });

  describe('Error code uniqueness', () => {
    it('no duplicate error codes', () => {
      const codes = new Set<string>();
      for (const key in ErrorCode) {
        const error = ErrorCode[key as ErrorCodeKey];
        expect(codes.has(error.code), `Duplicate code: ${error.code}`).toBe(false);
        codes.add(error.code);
      }
    });

    it('no duplicate paths', () => {
      const paths = new Set<string>();
      for (const key in ErrorCode) {
        const error = ErrorCode[key as ErrorCodeKey];
        expect(paths.has(error.path), `Duplicate path: ${error.path}`).toBe(false);
        paths.add(error.path);
      }
    });
  });

  describe('Error code categories', () => {
    it('DC001-DC099 are data errors', () => {
      const dataErrors = [
        ErrorCode.DATA_EMPTY,
        ErrorCode.DATA_ALL_HIDDEN,
        ErrorCode.DATA_ZERO_TOTAL,
        ErrorCode.DATA_INVALID_VALUES,
        ErrorCode.DATA_ZERO_BARS,
        ErrorCode.DATA_NEGATIVE_VALUES
      ];
      for (const error of dataErrors) {
        const num = parseInt(error.code.slice(2), 10);
        expect(num, `${error.code} should be in range 1-99`).toBeGreaterThanOrEqual(1);
        expect(num, `${error.code} should be in range 1-99`).toBeLessThanOrEqual(99);
      }
    });

    it('DC100-DC199 are configuration errors', () => {
      const configErrors = [
        ErrorCode.LINE_NO_POINTS,
        ErrorCode.AREA_NO_POINTS,
        ErrorCode.DONUT_INVALID_RADIUS,
        ErrorCode.PARSE_ERROR,
        ErrorCode.FORMAT_INVALID,
        ErrorCode.TIME_AXIS_FEW_DATES
      ];
      for (const error of configErrors) {
        const num = parseInt(error.code.slice(2), 10);
        expect(num, `${error.code} should be in range 100-199`).toBeGreaterThanOrEqual(100);
        expect(num, `${error.code} should be in range 100-199`).toBeLessThanOrEqual(199);
      }
    });

    it('DC200-DC299 are reference errors', () => {
      const refErrors = [
        ErrorCode.PALETTE_NOT_FOUND,
        ErrorCode.PATTERN_NOT_FOUND,
        ErrorCode.ZERO_FILL_NOT_FOUND,
        ErrorCode.SVG_NOT_FOUND
      ];
      for (const error of refErrors) {
        const num = parseInt(error.code.slice(2), 10);
        expect(num, `${error.code} should be in range 200-299`).toBeGreaterThanOrEqual(200);
        expect(num, `${error.code} should be in range 200-299`).toBeLessThanOrEqual(299);
      }
    });

    it('DC300-DC399 are style warnings', () => {
      const styleWarnings = [
        ErrorCode.TITLE_STYLE_WARNING,
        ErrorCode.LEGEND_STYLE_WARNING,
        ErrorCode.AXIS_STYLE_WARNING
      ];
      for (const error of styleWarnings) {
        const num = parseInt(error.code.slice(2), 10);
        expect(num, `${error.code} should be in range 300-399`).toBeGreaterThanOrEqual(300);
        expect(num, `${error.code} should be in range 300-399`).toBeLessThanOrEqual(399);
      }
    });

    it('DC400-DC499 are informational warnings', () => {
      const infoWarnings = [
        ErrorCode.COLORS_UNIFORM
      ];
      for (const error of infoWarnings) {
        const num = parseInt(error.code.slice(2), 10);
        expect(num, `${error.code} should be in range 400-499`).toBeGreaterThanOrEqual(400);
        expect(num, `${error.code} should be in range 400-499`).toBeLessThanOrEqual(499);
      }
    });
  });

  describe('Specific error codes', () => {
    it('DATA_EMPTY has correct properties', () => {
      expect(ErrorCode.DATA_EMPTY.code).toBe('DC001');
      expect(ErrorCode.DATA_EMPTY.level).toBe('warning');
      expect(ErrorCode.DATA_EMPTY.path).toBe('data.empty');
      expect(ErrorCode.DATA_EMPTY.message).toContain('{chartType}');
      expect(ErrorCode.DATA_EMPTY.message).toContain('{expectedElements}');
    });

    it('DATA_ALL_HIDDEN has correct properties', () => {
      expect(ErrorCode.DATA_ALL_HIDDEN.code).toBe('DC002');
      expect(ErrorCode.DATA_ALL_HIDDEN.level).toBe('warning');
      expect(ErrorCode.DATA_ALL_HIDDEN.path).toBe('data.allHidden');
    });

    it('PALETTE_NOT_FOUND has correct properties', () => {
      expect(ErrorCode.PALETTE_NOT_FOUND.code).toBe('DC201');
      expect(ErrorCode.PALETTE_NOT_FOUND.level).toBe('warning');
      expect(ErrorCode.PALETTE_NOT_FOUND.path).toBe('colors.palette');
      expect(ErrorCode.PALETTE_NOT_FOUND.message).toContain('{id}');
    });

    it('SVG_NOT_FOUND has correct properties', () => {
      expect(ErrorCode.SVG_NOT_FOUND.code).toBe('DC204');
      expect(ErrorCode.SVG_NOT_FOUND.level).toBe('warning');
      expect(ErrorCode.SVG_NOT_FOUND.path).toBe('render.svgNotFound');
    });
  });
});

describe('formatErrorMessage', () => {
  it('replaces single placeholder', () => {
    const result = formatErrorMessage('{count} items found', { count: 5 });
    expect(result).toBe('5 items found');
  });

  it('replaces multiple placeholders', () => {
    const result = formatErrorMessage('{name} has {count} items', { name: 'Test', count: 10 });
    expect(result).toBe('Test has 10 items');
  });

  it('replaces same placeholder multiple times', () => {
    const result = formatErrorMessage('{x} + {x} = {y}', { x: 2, y: 4 });
    expect(result).toBe('2 + 2 = 4');
  });

  it('leaves unmatched placeholders unchanged', () => {
    const result = formatErrorMessage('{name} is {status}', { name: 'Test' });
    expect(result).toBe('Test is {status}');
  });

  it('handles undefined values by leaving placeholder', () => {
    const result = formatErrorMessage('{name} is {status}', { name: 'Test', status: undefined });
    expect(result).toBe('Test is {status}');
  });

  it('converts numbers to strings', () => {
    const result = formatErrorMessage('Value: {value}', { value: 42 });
    expect(result).toBe('Value: 42');
  });

  it('handles zero value', () => {
    const result = formatErrorMessage('Count: {count}', { count: 0 });
    expect(result).toBe('Count: 0');
  });

  it('handles empty string value', () => {
    const result = formatErrorMessage('Name: {name}', { name: '' });
    expect(result).toBe('Name: ');
  });

  it('handles no placeholders', () => {
    const result = formatErrorMessage('No placeholders here', {});
    expect(result).toBe('No placeholders here');
  });

  it('handles empty values object', () => {
    const result = formatErrorMessage('{missing} placeholder', {});
    expect(result).toBe('{missing} placeholder');
  });

  it('handles special characters in values', () => {
    const result = formatErrorMessage('Path: {path}', { path: 'foo/bar.ts' });
    expect(result).toBe('Path: foo/bar.ts');
  });

  it('works with actual error code messages', () => {
    const result = formatErrorMessage(ErrorCode.DATA_EMPTY.message, {
      chartType: 'Pie chart',
      expectedElements: 'dc-pie-slice children'
    });
    expect(result).toBe('Pie chart has no dc-pie-slice children. Add dc-pie-slice children to display data.');
  });

  it('works with DATA_INVALID_VALUES message', () => {
    const result = formatErrorMessage(ErrorCode.DATA_INVALID_VALUES.message, {
      count: 3,
      elementType: 'slice',
      labels: 'A, B, C',
      chartType: 'Pie chart'
    });
    expect(result).toBe('3 slice(s) have zero or negative values and will not be visible: A, B, C. Pie charts require positive values.');
  });

  it('works with LINE_NO_POINTS message', () => {
    const result = formatErrorMessage(ErrorCode.LINE_NO_POINTS.message, {
      label: 'Revenue'
    });
    expect(result).toBe("Line 'Revenue' has no dc-point children and will not be visible.");
  });
});

describe('getErrorByCode', () => {
  it('finds error by code string', () => {
    const error = getErrorByCode('DC001');
    expect(error).toBeDefined();
    expect(error?.code).toBe('DC001');
    expect(error?.path).toBe('data.empty');
  });

  it('returns undefined for non-existent code', () => {
    const error = getErrorByCode('DC999');
    expect(error).toBeUndefined();
  });

  it('returns undefined for invalid format', () => {
    const error = getErrorByCode('invalid');
    expect(error).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    const error = getErrorByCode('');
    expect(error).toBeUndefined();
  });

  it('finds all registered error codes', () => {
    const codes = ['DC001', 'DC002', 'DC003', 'DC004', 'DC005', 'DC006',
                   'DC101', 'DC102', 'DC103', 'DC104', 'DC105', 'DC106',
                   'DC201', 'DC202', 'DC203', 'DC204',
                   'DC301', 'DC302', 'DC303',
                   'DC401'];
    for (const code of codes) {
      const error = getErrorByCode(code);
      expect(error, `Should find ${code}`).toBeDefined();
      expect(error?.code).toBe(code);
    }
  });

  it('returns correct error definition structure', () => {
    const error = getErrorByCode('DC201');
    expect(error).toEqual({
      code: 'DC201',
      level: 'warning',
      path: 'colors.palette',
      message: 'Palette "{id}" not found (no DOM element or built-in with that name)'
    });
  });
});

describe('createErrorLog', () => {
  it('creates log entry with all fields', () => {
    const log = createErrorLog(ErrorCode.DATA_EMPTY, {
      chartType: 'Bar chart',
      expectedElements: 'dc-bar children'
    });
    expect(log.code).toBe('DC001');
    expect(log.level).toBe('warning');
    expect(log.path).toBe('data.empty');
    expect(log.message).toBe('Bar chart has no dc-bar children. Add dc-bar children to display data.');
  });

  it('creates log entry with default empty values', () => {
    const log = createErrorLog(ErrorCode.SVG_NOT_FOUND);
    expect(log.code).toBe('DC204');
    expect(log.level).toBe('warning');
    expect(log.path).toBe('render.svgNotFound');
    expect(log.message).toBe('No SVG element found in chart shadow DOM');
  });

  it('handles partial placeholder values', () => {
    const log = createErrorLog(ErrorCode.DATA_EMPTY, {
      chartType: 'Chart'
      // expectedElements missing
    });
    expect(log.message).toContain('Chart');
    expect(log.message).toContain('{expectedElements}');
  });

  it('preserves error level from definition', () => {
    const log = createErrorLog(ErrorCode.COLORS_UNIFORM, { count: 5, elementType: 'bar' });
    expect(log.level).toBe('warning');
  });

  it('works with numeric placeholders', () => {
    const log = createErrorLog(ErrorCode.DATA_ZERO_BARS, {
      count: 3,
      labels: 'A, B, C'
    });
    expect(log.message).toBe('3 bar(s) have value 0 and will not be visible: A, B, C');
  });

  it('creates valid log entry for each error code', () => {
    for (const key in ErrorCode) {
      const error = ErrorCode[key as ErrorCodeKey];
      const log = createErrorLog(error, {});
      expect(log.code).toBe(error.code);
      expect(log.level).toBe(error.level);
      expect(log.path).toBe(error.path);
      expect(typeof log.message).toBe('string');
    }
  });
});

describe('Error code count', () => {
  it('has expected number of error codes', () => {
    const count = Object.keys(ErrorCode).length;
    // 6 data + 17 config + 4 reference + 3 style + 1 info = 31
    // (DC111/DC112 arrived with the radar chart, DC113/DC114 with <dc-reference>,
    //  DC115 when inline event handlers stopped being passed through, DC116 when
    //  bars that do not fit the plot stopped being silent, DC117 when a
    //  misspelled shape stopped being drawn as text)
    expect(count).toBe(31);
  });

  it('data errors count', () => {
    const dataErrors = Object.values(ErrorCode).filter(e => {
      const num = parseInt(e.code.slice(2), 10);
      return num >= 1 && num <= 99;
    });
    expect(dataErrors.length).toBe(6);
  });

  it('configuration errors count', () => {
    const configErrors = Object.values(ErrorCode).filter(e => {
      const num = parseInt(e.code.slice(2), 10);
      return num >= 100 && num <= 199;
    });
    expect(configErrors.length).toBe(17);
  });

  it('reference errors count', () => {
    const refErrors = Object.values(ErrorCode).filter(e => {
      const num = parseInt(e.code.slice(2), 10);
      return num >= 200 && num <= 299;
    });
    expect(refErrors.length).toBe(4);
  });

  it('style warnings count', () => {
    const styleWarnings = Object.values(ErrorCode).filter(e => {
      const num = parseInt(e.code.slice(2), 10);
      return num >= 300 && num <= 399;
    });
    expect(styleWarnings.length).toBe(3);
  });

  it('informational warnings count', () => {
    const infoWarnings = Object.values(ErrorCode).filter(e => {
      const num = parseInt(e.code.slice(2), 10);
      return num >= 400 && num <= 499;
    });
    expect(infoWarnings.length).toBe(1);
  });
});
