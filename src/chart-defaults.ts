import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { showConditionConverter, type ShowCondition } from './converters.js';

/**
 * List of attribute names that can be configured via <dc-defaults>.
 * These are the attributes that make sense to set globally or per-container.
 */
export const DEFAULTABLE_ATTRIBUTES = [
  // Display options
  'animations',
  'palette',
  'high-contrast',

  // Value/label display
  'show-value',
  'show-label',
  'show-percent',
  'value-format',
  'percent-format',
  'label-position',
  'label-fill',

  // Styling
  'stroke',
  'stroke-width',

  // Behavior
  'auto-popup',
  'logging',
  'console-log',

  // Layout (less common as defaults, but supported)
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
] as const;

export type DefaultableAttribute = typeof DEFAULTABLE_ATTRIBUTES[number];

/**
 * Global configuration store for site-wide defaults.
 * Set via configure() and applies to all charts across all pages that import the library.
 */
const globalDefaults: Map<DefaultableAttribute, unknown> = new Map();

/**
 * Configuration options for site-wide defaults.
 * Use camelCase property names (e.g., `highContrast` not `high-contrast`).
 */
export interface ConfigureOptions {
  animations?: string | boolean;
  palette?: string;
  highContrast?: boolean;
  showValue?: boolean | { type: 'value' | 'percent'; threshold: number };
  showLabel?: boolean | { type: 'value' | 'percent'; threshold: number };
  showPercent?: boolean | { type: 'value' | 'percent'; threshold: number };
  valueFormat?: string;
  percentFormat?: string;
  labelPosition?: string;
  labelFill?: string;
  stroke?: string;
  strokeWidth?: number;
  autoPopup?: boolean;
  logging?: string;
  consoleLog?: string;
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
}

/**
 * Map from camelCase option names to kebab-case attribute names.
 */
const optionToAttribute: Record<keyof ConfigureOptions, DefaultableAttribute> = {
  animations: 'animations',
  palette: 'palette',
  highContrast: 'high-contrast',
  showValue: 'show-value',
  showLabel: 'show-label',
  showPercent: 'show-percent',
  valueFormat: 'value-format',
  percentFormat: 'percent-format',
  labelPosition: 'label-position',
  labelFill: 'label-fill',
  stroke: 'stroke',
  strokeWidth: 'stroke-width',
  autoPopup: 'auto-popup',
  logging: 'logging',
  consoleLog: 'console-log',
  padding: 'padding',
  paddingTop: 'padding-top',
  paddingRight: 'padding-right',
  paddingBottom: 'padding-bottom',
  paddingLeft: 'padding-left',
};

/**
 * Configure site-wide default values for all charts.
 *
 * Call this function from a shared JavaScript module that's loaded on every page
 * to establish consistent defaults across your entire site.
 *
 * Priority order (highest to lowest):
 * 1. Explicit attribute on the chart element
 * 2. Nearest `<dc-defaults>` ancestor (page/container scope)
 * 3. Global defaults set via `configure()` (site-wide)
 * 4. Library hardcoded defaults
 *
 * @example Site-wide configuration
 * ```javascript
 * // In your shared config.js file, loaded on every page:
 * import { configure } from 'declarative-charts';
 *
 * configure({
 *   animations: true,
 *   palette: 'viridis',
 *   valueFormat: 'compact 1',
 *   highContrast: false,
 * });
 * ```
 *
 * @example Reset to library defaults
 * ```javascript
 * import { configure } from 'declarative-charts';
 *
 * // Pass empty object or call with no arguments to clear all global defaults
 * configure({});
 * ```
 */
export function configure(options: ConfigureOptions = {}): void {
  // Clear existing global defaults
  globalDefaults.clear();

  // Set new defaults
  for (const [key, value] of Object.entries(options)) {
    const attrName = optionToAttribute[key as keyof ConfigureOptions];
    if (attrName && value !== undefined) {
      // Convert boolean animations to string
      if (key === 'animations' && typeof value === 'boolean') {
        globalDefaults.set(attrName, value ? 'true' : 'false');
      } else {
        globalDefaults.set(attrName, value);
      }
    }
  }
}

/**
 * Get the current global configuration.
 * Returns a copy of the global defaults map as a plain object.
 */
export function getConfiguration(): Partial<ConfigureOptions> {
  const result: Partial<ConfigureOptions> = {};
  const attrToOption = Object.fromEntries(
    Object.entries(optionToAttribute).map(([k, v]) => [v, k])
  ) as Record<DefaultableAttribute, keyof ConfigureOptions>;

  for (const [attr, value] of globalDefaults) {
    const optionKey = attrToOption[attr];
    if (optionKey) {
      (result as Record<string, unknown>)[optionKey] = value;
    }
  }
  return result;
}

/**
 * Get a global default value by attribute name.
 * Used internally by charts when resolving defaults.
 */
export function getGlobalDefault(attributeName: DefaultableAttribute): unknown {
  return globalDefaults.get(attributeName);
}

/**
 * Configuration element that sets default attribute values for descendant charts.
 *
 * Place a `<dc-defaults>` element in your HTML to configure defaults:
 * - In `<head>` or start of `<body>` for page-wide defaults
 * - Inside a container for scoped defaults
 *
 * Charts resolve defaults by walking up the DOM tree to find the nearest
 * `<dc-defaults>` ancestor. If none is found, a document-level `<dc-defaults>`
 * (outside any chart container) is used as a fallback.
 *
 * @example Page-wide defaults
 * ```html
 * <dc-defaults animations palette="viridis" value-format="compact 1"></dc-defaults>
 *
 * <dc-chart>...</dc-chart>  <!-- Uses animations, viridis palette -->
 * <dc-pie-chart>...</dc-pie-chart>  <!-- Also uses those defaults -->
 * ```
 *
 * @example Scoped defaults
 * ```html
 * <dc-defaults animations palette="category10"></dc-defaults>
 *
 * <div class="dashboard">
 *   <dc-defaults high-contrast animations="false"></dc-defaults>
 *   <dc-chart>...</dc-chart>  <!-- high-contrast, no animations -->
 * </div>
 *
 * <dc-chart>...</dc-chart>  <!-- animations, category10 palette -->
 * ```
 *
 * @example Override at chart level
 * ```html
 * <dc-defaults palette="viridis"></dc-defaults>
 *
 * <dc-chart palette="category10">...</dc-chart>  <!-- Uses category10, not viridis -->
 * ```
 */
@customElement('dc-defaults')
export class ChartDefaults extends LitElement {

  // ============================================================================
  // Display Options
  // ============================================================================

  /**
   * Default animation setting for charts.
   * - `animations` or `animations="true"` - Enable with default 300ms duration
   * - `animations="500ms"` or `animations="0.5s"` - Enable with custom duration
   * - `animations="false"` - Explicitly disable animations
   */
  @property({ type: String })
  animations?: string;

  /**
   * Default palette for charts.
   * Can be a built-in palette name or ID of a custom `<dc-palette>` element.
   */
  @property({ type: String })
  palette?: string;

  /**
   * Enable high contrast mode by default.
   */
  @property({ type: Boolean, attribute: 'high-contrast' })
  highContrast?: boolean;

  // ============================================================================
  // Value/Label Display
  // ============================================================================

  /**
   * Default setting for showing numeric values on chart elements.
   */
  @property({ attribute: 'show-value', converter: showConditionConverter })
  showValue?: ShowCondition;

  /**
   * Default setting for showing labels on chart elements.
   */
  @property({ attribute: 'show-label', converter: showConditionConverter })
  showLabel?: ShowCondition;

  /**
   * Default setting for showing percentage values on chart elements.
   */
  @property({ attribute: 'show-percent', converter: showConditionConverter })
  showPercent?: ShowCondition;

  /**
   * Default number format for values.
   */
  @property({ type: String, attribute: 'value-format' })
  valueFormat?: string;

  /**
   * Default number format for percentages.
   */
  @property({ type: String, attribute: 'percent-format' })
  percentFormat?: string;

  /**
   * Default label position for chart elements.
   */
  @property({ type: String, attribute: 'label-position' })
  labelPosition?: string;

  /**
   * Default label fill color.
   */
  @property({ type: String, attribute: 'label-fill' })
  labelFill?: string;

  // ============================================================================
  // Styling
  // ============================================================================

  /**
   * Default stroke color.
   */
  @property({ type: String })
  stroke?: string;

  /**
   * Default stroke width.
   */
  @property({ type: Number, attribute: 'stroke-width' })
  strokeWidth?: number;

  // ============================================================================
  // Behavior
  // ============================================================================

  /**
   * Enable auto-popup on hover by default.
   */
  @property({ type: Boolean, attribute: 'auto-popup' })
  autoPopup?: boolean;

  /**
   * Default logging level.
   */
  @property({ type: String })
  logging?: string;

  /**
   * Default console log level.
   */
  @property({ type: String, attribute: 'console-log' })
  consoleLog?: string;

  // ============================================================================
  // Layout
  // ============================================================================

  /**
   * Default padding (CSS shorthand syntax).
   */
  @property({ type: String })
  padding?: string;

  /**
   * Default top padding.
   */
  @property({ type: String, attribute: 'padding-top' })
  paddingTop?: string;

  /**
   * Default right padding.
   */
  @property({ type: String, attribute: 'padding-right' })
  paddingRight?: string;

  /**
   * Default bottom padding.
   */
  @property({ type: String, attribute: 'padding-bottom' })
  paddingBottom?: string;

  /**
   * Default left padding.
   */
  @property({ type: String, attribute: 'padding-left' })
  paddingLeft?: string;

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Get the value of a default attribute.
   * Returns undefined if the attribute is not set on this element.
   */
  getDefault(attributeName: DefaultableAttribute): unknown {
    // Map attribute names to property names
    const propertyMap: Record<string, keyof ChartDefaults> = {
      'animations': 'animations',
      'palette': 'palette',
      'high-contrast': 'highContrast',
      'show-value': 'showValue',
      'show-label': 'showLabel',
      'show-percent': 'showPercent',
      'value-format': 'valueFormat',
      'percent-format': 'percentFormat',
      'label-position': 'labelPosition',
      'label-fill': 'labelFill',
      'stroke': 'stroke',
      'stroke-width': 'strokeWidth',
      'auto-popup': 'autoPopup',
      'logging': 'logging',
      'console-log': 'consoleLog',
      'padding': 'padding',
      'padding-top': 'paddingTop',
      'padding-right': 'paddingRight',
      'padding-bottom': 'paddingBottom',
      'padding-left': 'paddingLeft',
    };

    const propName = propertyMap[attributeName];
    if (propName) {
      return this[propName];
    }
    return undefined;
  }

  /**
   * Check if a default attribute has been explicitly set.
   */
  hasDefault(attributeName: DefaultableAttribute): boolean {
    return this.hasAttribute(attributeName);
  }

  // No shadow DOM - this is a configuration element, not a visual one
  protected createRenderRoot() {
    return this;
  }

  // Render nothing - this is a data element
  protected render() {
    return html``;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find the nearest <dc-defaults> element for a given chart element.
 *
 * Resolution order:
 * 1. Check previous siblings at each level (nearest sibling wins)
 * 2. Walk up the DOM tree and repeat
 * 3. Fall back to document-level <dc-defaults> (first one found in document)
 * 4. Return null if no defaults element exists
 */
export function findDefaultsElement(element: Element): ChartDefaults | null {
  // Start at the element and walk up the DOM tree
  let current: Element | null = element;

  while (current) {
    // Check previous siblings at this level (nearest dc-defaults wins)
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName.toLowerCase() === 'dc-defaults') {
        return sibling as ChartDefaults;
      }
      sibling = sibling.previousElementSibling;
    }

    // Move up to parent
    current = current.parentElement;

    // Check if parent itself is a dc-defaults (edge case)
    if (current?.tagName.toLowerCase() === 'dc-defaults') {
      return current as ChartDefaults;
    }
  }

  // Fall back to document-level dc-defaults (first one in document)
  const docDefaults = document.querySelector('dc-defaults');
  if (docDefaults && docDefaults !== element) {
    return docDefaults as ChartDefaults;
  }

  return null;
}

/**
 * Get the default value for an attribute, considering the defaults hierarchy.
 *
 * Resolution order:
 * 1. Nearest `<dc-defaults>` element (page/container scope)
 * 2. Global defaults set via `configure()` (site-wide)
 *
 * @param element - The chart element requesting the default
 * @param attributeName - The attribute name to look up
 * @returns The default value, or undefined if not set
 */
export function getDefault(
  element: Element,
  attributeName: DefaultableAttribute
): unknown {
  // Check for a dc-defaults element first
  const defaults = findDefaultsElement(element);
  if (defaults && defaults.hasDefault(attributeName)) {
    return defaults.getDefault(attributeName);
  }

  // Fall back to global configuration
  const globalValue = getGlobalDefault(attributeName);
  if (globalValue !== undefined) {
    return globalValue;
  }

  return undefined;
}

/**
 * Get the effective value for an attribute, considering:
 * 1. The element's own attribute (highest priority)
 * 2. The nearest <dc-defaults> ancestor (page/container scope)
 * 3. Global defaults set via `configure()` (site-wide)
 * 4. The provided hardcoded default (lowest priority)
 *
 * @param element - The chart element
 * @param attributeName - The attribute name
 * @param elementValue - The element's own value (may be undefined if not set)
 * @param hardcodedDefault - The library's hardcoded default value
 * @returns The effective value to use
 */
export function resolveDefault<T>(
  element: Element,
  attributeName: DefaultableAttribute,
  elementValue: T | undefined,
  hardcodedDefault: T
): T {
  // If element has the attribute explicitly set, use that
  if (element.hasAttribute(attributeName)) {
    return elementValue as T;
  }

  // Check for a defaults element
  const defaultValue = getDefault(element, attributeName);
  if (defaultValue !== undefined) {
    return defaultValue as T;
  }

  // Fall back to hardcoded default
  return hardcodedDefault;
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-defaults': ChartDefaults;
  }
}
