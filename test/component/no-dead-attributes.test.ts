import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fixture } from './setup';
import '../../src/index';

/**
 * Every declared attribute must change something.
 *
 * Six attributes have now been found declared, documented, and wired to
 * nothing: `fill-colors`, `stroke-colors`, `stroke-color`, `fill-color`,
 * `bar-color`, and `pattern`/`stroke-dasharray` on `<dc-legend-item>`. Each
 * parsed fine, appeared in API.md, and did precisely nothing — the worst
 * failure mode for a declarative API, because the markup looks right.
 *
 * `api-docs.test.ts` catches an attribute that is undocumented, or documented
 * but undeclared. It cannot catch one that exists on both sides and is simply
 * never read. This can: it renders a chart twice, with and without the
 * attribute, and fails if the output is byte-identical.
 *
 * The attribute list comes from the source, so a new `@property` is covered the
 * moment it is added — either it changes the rendering, or it needs a line in
 * `NO_VISUAL_EFFECT` saying why not.
 */

const root = resolve(__dirname, '../..');
const norm = (t: string) => t.split('\r\n').join('\n');
const camelToKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Attributes each source file declares, keyed by the element it registers. */
function declaredByFile(): Map<string, { tag: string | null; attrs: string[] }> {
  const out = new Map<string, { tag: string | null; attrs: string[] }>();
  for (const f of readdirSync(resolve(root, 'src')).filter(n => n.endsWith('.ts'))) {
    const text = norm(readFileSync(resolve(root, 'src', f), 'utf8'));
    const attrs = new Set<string>();
    for (const m of text.matchAll(
      /@property\(\s*(\{[^}]*\})?\s*\)\s*(?:override\s+)?([A-Za-z_$][\w$]*)/g
    )) {
      const opts = m[1] ?? '';
      if (/attribute\s*:\s*false/.test(opts)) continue;
      const explicit = opts.match(/attribute\s*:\s*'([^']+)'/);
      attrs.add(explicit ? explicit[1] : camelToKebab(m[2]));
    }
    if (attrs.size === 0) continue;
    out.set(f, { tag: text.match(/@customElement\('([^']+)'\)/)?.[1] ?? null, attrs: [...attrs] });
  }
  return out;
}

/**
 * Where to test the attributes each file declares.
 *
 * The abstract bases are exercised through one representative concrete element
 * rather than all of them — `base-chart.ts`'s attributes behave the same on any
 * chart, and testing them four times would only slow the suite down.
 */
const HOST_FOR_FILE: Record<string, string> = {
  'base-chart.ts': 'dc-chart',
  'base-chart-element.ts': 'dc-bar',
  'base-filled-shape.ts': 'dc-bar'
};

const BARS = '<dc-bar value="30" label="Alpha"></dc-bar><dc-bar value="70" label="Beta"></dc-bar>';
const POINTS = '<dc-point value="30" label="A"></dc-point><dc-point value="70" label="B"></dc-point>';

const MANY_POINTS =
  '<dc-point value="30" label="a"></dc-point><dc-point value="70" label="b"></dc-point>' +
  '<dc-point value="20" label="c"></dc-point><dc-point value="60" label="d"></dc-point>';

const LINE_CHART = (a: string) =>
  `<dc-chart ${a} width="600" height="400"><dc-line label="L">${MANY_POINTS}</dc-line></dc-chart>`;

const BUBBLE_CHART = (a: string) =>
  `<dc-chart ${a} width="600" height="400">
     <dc-bubble value="30" size-value="10" label="A"></dc-bubble>
     <dc-bubble value="70" size-value="900" label="B"></dc-bubble>
   </dc-chart>`;

const PATTERNED_BAR = (a: string) =>
  `<dc-chart width="600" height="400"><dc-bar ${a} pattern="dots" value="30" label="Alpha"></dc-bar>${BARS}</dc-chart>`;

const MANY_BARS = Array.from({ length: 12 }, (_, i) =>
  `<dc-bar value="${10 + i * 5}" label="Category ${i}"></dc-bar>`).join('');

const MANY_BAR_AXIS = (a: string) =>
  `<dc-chart width="600" height="400"><dc-axis position="bottom" ${a}></dc-axis>${MANY_BARS}</dc-chart>`;

const TIME_AXIS = (a: string) =>
  `<dc-chart width="600" height="400">
     <dc-axis position="bottom" type="time" ${a}></dc-axis>
     <dc-line label="L">
       <dc-point value="10" label="2024-01-15"></dc-point>
       <dc-point value="20" label="2024-02-15"></dc-point>
       <dc-point value="30" label="2024-03-15"></dc-point>
     </dc-line>
   </dc-chart>`;

/**
 * Two fills whose palette order is the reverse of the bars', so a match and the
 * positional fallback give different colours. The attribute under test goes on
 * the first fill.
 */
const MATCHED_PALETTE = (a: string, base: string) =>
  `<dc-palette id="mp">
     <dc-fill ${a} ${base} fill="#0000ff"></dc-fill>
     <dc-fill label="Alpha" fill="#ff0000"></dc-fill>
   </dc-palette>
   <dc-chart width="600" height="400" palette="mp">${BARS}</dc-chart>`;

/** A <dc-fill> inside a palette the chart uses. */
const PALETTE_FILL = (a: string, base: string) =>
  `<dc-palette id="pf"><dc-fill ${a} ${base} fill="#f00"></dc-fill></dc-palette>
   <dc-chart width="600" height="400" palette="pf">${BARS}</dc-chart>`;


const LINE_LEGEND_ITEM = (a: string) =>
  `<dc-chart width="600" height="400">
     <dc-legend><dc-legend-item ${a} label="Item" shape="line" stroke="#0f0"></dc-legend-item></dc-legend>
     ${BARS}
   </dc-chart>`;

const CHEVRON_FUNNEL = (a: string) =>
  `<dc-funnel-chart ${a} width="600" height="400" chevron="25">
     <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
     <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
   </dc-funnel-chart>`;

const ZERO_STAGE = (a: string) =>
  `<dc-stage-chart ${a} width="600" height="500" stage-size="value">
     <dc-stage value="100" label="A"></dc-stage><dc-stage value="0" label="Empty"></dc-stage>
   </dc-stage-chart>`;

/**
 * How to render each element with extra attributes applied to the thing under
 * test. Every context switches on whatever makes the attribute observable —
 * `show-value`, for instance, is the only way a `value-format` can show up.
 */
/**
 * A radar chart with three axes and one series. `extraAxis` replaces the first
 * declared axis so an attribute under test can be applied to it.
 */
const RADAR = (firstAxis: string, chartAttrs = '') =>
  `<dc-radar-chart width="500" height="500" max-value="100" ${chartAttrs}>
     ${firstAxis}
     <dc-radar-axis label="Power"></dc-radar-axis>
     <dc-radar-axis label="Range"></dc-radar-axis>
     <dc-radar-series label="A">
       <dc-point value="80" label="Speed"></dc-point>
       <dc-point value="60" label="Power"></dc-point>
       <dc-point value="90" label="Range"></dc-point>
     </dc-radar-series>
   </dc-radar-chart>`;

const CONTEXT: Record<string, (attrs: string) => string> = {
  'dc-chart': a => `<dc-chart ${a} width="600" height="400" show-value>${BARS}</dc-chart>`,
  'dc-bar': a =>
    `<dc-chart width="600" height="400" show-value><dc-bar ${a} value="30" label="Alpha"></dc-bar><dc-bar value="70" label="Beta"></dc-bar></dc-chart>`,
  'dc-bar-group': a =>
    `<dc-chart width="600" height="400"><dc-bar-group ${a} label="G">${BARS}</dc-bar-group></dc-chart>`,
  'dc-bar-segment': a =>
    `<dc-chart width="600" height="400" show-value><dc-bar label="Alpha"><dc-bar-segment ${a} value="30" label="S1"></dc-bar-segment><dc-bar-segment value="20" label="S2"></dc-bar-segment></dc-bar></dc-chart>`,
  'dc-line': a =>
    `<dc-chart width="600" height="400" show-value><dc-line ${a} label="L">${POINTS}</dc-line></dc-chart>`,
  'dc-area': a =>
    `<dc-chart width="600" height="400" show-value><dc-area ${a} label="A">${POINTS}</dc-area></dc-chart>`,
  'dc-point': a =>
    `<dc-chart width="600" height="400" show-value><dc-line label="L"><dc-point ${a} value="30" label="A"></dc-point><dc-point value="70" label="B"></dc-point></dc-line></dc-chart>`,
  // A band and a line together, so band-only and line-only attributes are both
  // reachable, and a second reference so a colour has something to differ from.
  'dc-reference': a =>
    `<dc-chart width="600" height="400"><dc-reference ${a} value="50" min="20" max="80" label="T"></dc-reference><dc-reference value="90" label="U"></dc-reference>${BARS}</dc-chart>`,
  'dc-scatter': a =>
    `<dc-chart width="600" height="400"><dc-scatter ${a} label="S"><dc-point x="10" value="30"></dc-point><dc-point x="40" value="70"></dc-point></dc-scatter><dc-scatter label="T"><dc-point x="20" value="50"></dc-point></dc-scatter></dc-chart>`,
  'dc-bubble': a =>
    `<dc-chart width="600" height="400" show-value><dc-bubble ${a} value="30" size-value="100" label="A"></dc-bubble><dc-bubble value="70" size-value="200" label="B"></dc-bubble></dc-chart>`,
  'dc-axis': a =>
    `<dc-chart width="600" height="400"><dc-axis ${a} position="left"></dc-axis>${BARS}</dc-chart>`,
  'dc-grid': a =>
    `<dc-chart width="600" height="400"><dc-axis position="left"><dc-grid ${a}></dc-grid></dc-axis>${BARS}</dc-chart>`,
  'dc-legend': a =>
    `<dc-chart width="600" height="400"><dc-legend ${a}></dc-legend>${BARS}</dc-chart>`,
  'dc-legend-item': a =>
    `<dc-chart width="600" height="400"><dc-legend><dc-legend-item ${a} label="Item" fill="#f00"></dc-legend-item></dc-legend>${BARS}</dc-chart>`,
  'dc-title': a =>
    `<dc-chart width="600" height="400"><dc-title ${a}>Heading</dc-title>${BARS}</dc-chart>`,
  'dc-empty': a => `<dc-chart width="600" height="400"><dc-empty ${a}>Nothing</dc-empty></dc-chart>`,
  'dc-popup': a =>
    `<dc-chart width="600" height="400"><dc-bar value="30" label="Alpha"><dc-popup ${a}>Hi</dc-popup></dc-bar></dc-chart>`,
  'dc-palette': a =>
    `<dc-palette ${a} id="p"><dc-fill fill="#f00"></dc-fill><dc-fill fill="#0f0"></dc-fill></dc-palette><dc-chart width="600" height="400" palette="p">${BARS}</dc-chart>`,
  'dc-fill': a =>
    `<dc-palette id="p"><dc-fill ${a} fill="#f00"></dc-fill></dc-palette><dc-chart width="600" height="400" palette="p">${BARS}</dc-chart>`,
  'dc-pie-chart': a =>
    `<dc-pie-chart ${a} width="600" height="400"><dc-pie-slice value="30" label="A"></dc-pie-slice><dc-pie-slice value="70" label="B"></dc-pie-slice></dc-pie-chart>`,
  'dc-pie-slice': a =>
    `<dc-pie-chart width="600" height="400"><dc-pie-slice ${a} value="30" label="A"></dc-pie-slice><dc-pie-slice value="70" label="B"></dc-pie-slice></dc-pie-chart>`,
  'dc-funnel-chart': a =>
    `<dc-funnel-chart ${a} width="600" height="400"><dc-funnel-stage value="100" label="A"></dc-funnel-stage><dc-funnel-stage value="50" label="B"></dc-funnel-stage></dc-funnel-chart>`,
  'dc-funnel-stage': a =>
    `<dc-funnel-chart width="600" height="400"><dc-funnel-stage ${a} value="100" label="A"></dc-funnel-stage><dc-funnel-stage value="50" label="B"></dc-funnel-stage></dc-funnel-chart>`,
  'dc-stage-chart': a =>
    `<dc-stage-chart ${a} width="600" height="500"><dc-stage value="100" label="A"></dc-stage><dc-stage value="50" label="B"></dc-stage></dc-stage-chart>`,
  'dc-stage': a =>
    `<dc-stage-chart width="600" height="500"><dc-stage ${a} value="100" label="A"></dc-stage><dc-stage value="50" label="B"></dc-stage></dc-stage-chart>`,
  'dc-radar-chart': a =>
    `<dc-radar-chart ${a} width="500" height="500" max-value="100">
       <dc-radar-axis label="Speed"></dc-radar-axis>
       <dc-radar-axis label="Power"></dc-radar-axis>
       <dc-radar-axis label="Range"></dc-radar-axis>
       <dc-radar-series label="A">
         <dc-point value="80" label="Speed"></dc-point>
         <dc-point value="60" label="Power"></dc-point>
         <dc-point value="90" label="Range"></dc-point>
       </dc-radar-series>
     </dc-radar-chart>`,
  'dc-radar-axis': a => RADAR(`<dc-radar-axis ${a} label="Speed"></dc-radar-axis>`),
  'dc-radar-series': a =>
    `<dc-radar-chart width="500" height="500" max-value="100">
       <dc-radar-axis label="Speed"></dc-radar-axis>
       <dc-radar-axis label="Power"></dc-radar-axis>
       <dc-radar-axis label="Range"></dc-radar-axis>
       <dc-radar-series ${a} label="A">
         <dc-point value="80" label="Speed"></dc-point>
         <dc-point value="60" label="Power"></dc-point>
         <dc-point value="90" label="Range"></dc-point>
       </dc-radar-series>
     </dc-radar-chart>`,
  // A default only shows when the chart does not state the same thing itself,
  // so this chart deliberately sets nothing beyond its size.
  'dc-defaults': a =>
    `<dc-defaults ${a}></dc-defaults>
     <dc-chart width="600" height="400">${BARS}</dc-chart>`,
  'dc-swatch': a =>
    `<dc-palette id="sw">
       <dc-fill label="Alpha" min-value="0" max-value="40" fill="#f00"></dc-fill>
       <dc-fill label="Beta" min-value="41" max-value="99" fill="#00f"></dc-fill>
     </dc-palette>
     <dc-swatch ${a} palette="sw" label="Alpha" value="10"></dc-swatch>`
};

/**
 * A value for each attribute that should visibly change the chart.
 * Chosen per attribute rather than guessed from the type, so a rejected value
 * cannot masquerade as a dead attribute.
 */
const VALUE: Record<string, string> = {
  // geometry and layout
  width: '450', height: '250', padding: '70', 'padding-top': '80', 'padding-right': '80',
  'padding-bottom': '80', 'padding-left': '80', orientation: 'horizontal', fit: 'fill',
  'text-scaling': 'fixed', gutter: '30', 'bar-width': '25', 'aspect-ratio': '3', gap: '40',
  'corner-radius': '12', shape: 'circle', x: '25', min: '15', max: '85',
  'label-collision': 'show', 'label-rotate': '45', 'point-shape': 'square', 'curve-fit': 'smooth',
  'inner-radius': '55', 'max-bubble-radius': '55', 'min-bubble-radius': '20',
  'size-value': '400', 'stage-size': 'value', 'stage-min-size': '60', 'stage-max-size': '70',
  'stage-height': 'value', 'stage-min-height': '60', 'stage-max-height': '120',
  chevron: '25', 'funnel-factor': '40', 'flat-top': '', 'flat-bottom': '',
  rings: '3', 'grid-shape': 'circle', 'start-angle': '30', 'counter-clockwise': '',
  overlapping: '', connector: 'arrow', size: '40', index: '1',

  // colour and fill
  fill: '#123456', stroke: '#654321', 'stroke-width': '4', 'fill-opacity': '0.25',
  'stroke-opacity': '0.3', 'fill-rule': 'evenodd', 'stroke-dasharray': 'dashed',
  'stroke-dashoffset': '4', 'stroke-linecap': 'square', 'stroke-linejoin': 'bevel',
  'stroke-miterlimit': '2', palette: 'category10', 'bar-color': '#7c3aed',
  'line-color': '#ea580c', 'slice-color': '#0d9488', 'high-contrast': '',
  pattern: 'crosshatch', 'pattern-fill': '#abcdef', 'pattern-stroke': '#fedcba',
  'pattern-scale': '3', 'label-fill': '#ff00ff',

  // legend links
  'legend-href': '/report', 'legend-target': '_blank',

  // labels, values and text
  label: 'Renamed', value: '55', 'show-value': 'false', 'show-label': 'false',
  'show-percent': 'true', 'value-format': 'currency USD', 'percent-format': 'percent 3',
  locale: 'de-DE', 'label-position': 'inside-top', 'label-offset-x': '15',
  'label-offset-y': '15', 'label-offset-r': '15', 'font-size': '30', position: 'bottom',
  columns: '2', 'max-width': '110', missing: 'zero',

  // axis
  type: 'value', 'min-value': '-50', 'max-value': '500', 'range-padding': '25%',
  'tick-count': '9', 'tick-interval': '17', 'tick-values': '0, 33, 66',
  'label-interval': '2', 'label-lines': '2', 'date-format': 'timestamp',
  'date-label-format': 'MMM d',

  // state and behaviour
  hidden: '', loading: '', animations: '500ms', 'auto-popup': '', href: 'https://example.com',
  target: '_blank', trigger: 'click', 'aria-label': 'Custom label',
  'aria-description': 'Custom description', 'aria-insights': 'false',
  zero: 'auto circle', 'zero-value': '40', 'zero-shape': 'circle', 'zero-hidden': '',
  'zero-fill': 'nonexistent-id', chart: 'dc-chart',

  // diagnostics
  logging: 'info', 'console-log': 'none'
};

/**
 * Attributes that genuinely change nothing in the rendered SVG, with the reason.
 * Anything not listed here has to earn its place by changing the output.
 */
/**
 * Contexts for attributes the element's general context cannot exercise.
 *
 * A `<dc-swatch>` resolves its colour by label, then by value range, then by
 * index. The general context supplies a label *and* a value, so changing the
 * label alone still resolves through the value, and the index never gets a
 * look-in. Each needs the higher-priority routes removed.
 */
const SCATTER_POINT = (a: string) =>
  `<dc-chart width="600" height="400"><dc-scatter label="S"><dc-point ${a} value="30"></dc-point><dc-point x="40" value="70"></dc-point></dc-scatter></dc-chart>`;

const COLLIDING_LABELS = (a: string) =>
  `<dc-chart ${a} width="600" height="400"><dc-line label="A"><dc-point value="100" label="Jan"></dc-point><dc-point value="150" label="Feb"></dc-point></dc-line><dc-line label="B"><dc-point value="101" label="Jan"></dc-point><dc-point value="149" label="Feb"></dc-point></dc-line></dc-chart>`;

const CONTEXT_FOR_ELEMENT: Record<string, (attrs: string) => string> = {
  // Short labels on a bars-only chart never collide, so nothing distinguishes
  // 'show' from the default 'hide'.
  'dc-chart:label-collision': a => COLLIDING_LABELS(a),
  // The default <dc-axis> context is position="left" - the *value* axis on a
  // vertical chart, where a category-label tilt correctly does nothing.
  'dc-axis:label-rotate': a =>
    `<dc-chart width="600" height="400"><dc-axis ${a} position="bottom"></dc-axis>${BARS}</dc-chart>`,

  // --- legend-href draws nothing without a legend to draw it in -------------
  // The default contexts have no <dc-legend>, so the entry these attributes
  // link has nowhere to appear. Each of these is that element's usual context
  // with a legend added.
  'dc-bar:legend-href': a =>
    `<dc-chart width="600" height="400"><dc-legend></dc-legend><dc-bar ${a} value="30" label="Alpha"></dc-bar><dc-bar value="70" label="Beta"></dc-bar></dc-chart>`,
  'dc-bar-segment:legend-href': a =>
    `<dc-chart width="600" height="400"><dc-legend></dc-legend><dc-bar label="Alpha"><dc-bar-segment ${a} value="30" label="S1"></dc-bar-segment><dc-bar-segment value="20" label="S2"></dc-bar-segment></dc-bar></dc-chart>`,
  'dc-line:legend-href': a =>
    `<dc-chart width="600" height="400"><dc-legend></dc-legend><dc-line ${a} label="L">${POINTS}</dc-line></dc-chart>`,
  'dc-area:legend-href': a =>
    `<dc-chart width="600" height="400"><dc-legend></dc-legend><dc-area ${a} label="A">${POINTS}</dc-area></dc-chart>`,
  'dc-bubble:legend-href': a =>
    `<dc-chart width="600" height="400"><dc-legend></dc-legend><dc-bubble ${a} value="30" size-value="100" label="A"></dc-bubble></dc-chart>`,
  'dc-scatter:legend-href': a =>
    `<dc-chart width="600" height="400"><dc-legend></dc-legend><dc-scatter ${a} label="S"><dc-point x="10" value="30"></dc-point><dc-point x="40" value="70"></dc-point></dc-scatter></dc-chart>`,
  'dc-pie-slice:legend-href': a =>
    `<dc-pie-chart width="600" height="400"><dc-legend></dc-legend><dc-pie-slice ${a} value="30" label="A"></dc-pie-slice><dc-pie-slice value="70" label="B"></dc-pie-slice></dc-pie-chart>`,
  'dc-funnel-stage:legend-href': a =>
    `<dc-funnel-chart width="600" height="400"><dc-legend></dc-legend><dc-funnel-stage ${a} value="100" label="A"></dc-funnel-stage><dc-funnel-stage value="50" label="B"></dc-funnel-stage></dc-funnel-chart>`,
  'dc-stage:legend-href': a =>
    `<dc-stage-chart width="600" height="500"><dc-legend></dc-legend><dc-stage ${a} value="100" label="A"></dc-stage><dc-stage value="50" label="B"></dc-stage></dc-stage-chart>`,
  'dc-radar-series:legend-href': a =>
    `<dc-radar-chart width="500" height="500" max-value="100">
       <dc-legend></dc-legend>
       <dc-radar-axis label="Speed"></dc-radar-axis>
       <dc-radar-axis label="Power"></dc-radar-axis>
       <dc-radar-axis label="Range"></dc-radar-axis>
       <dc-radar-series ${a} label="A">
         <dc-point value="80" label="Speed"></dc-point>
         <dc-point value="60" label="Power"></dc-point>
         <dc-point value="90" label="Range"></dc-point>
       </dc-radar-series>
     </dc-radar-chart>`,

  // --- <dc-point> attributes only a scatter reads ---------------------------
  'dc-point:x': a => SCATTER_POINT(a),

  // --- <dc-chart> attributes a bars-only chart cannot show ------------------
  'dc-chart:line-color': a => LINE_CHART(a),
  'dc-chart:point-shape': a => LINE_CHART(a),
  'dc-chart:curve-fit': a => LINE_CHART(a),
  'dc-chart:max-bubble-radius': a => BUBBLE_CHART(a),
  'dc-chart:min-bubble-radius': a => BUBBLE_CHART(a),
  'dc-chart:overlapping': a =>
    `<dc-chart ${a} width="600" height="400">
       <dc-area label="A"><dc-point value="30" label="x"></dc-point><dc-point value="50" label="y"></dc-point></dc-area>
       <dc-area label="B"><dc-point value="20" label="x"></dc-point><dc-point value="40" label="y"></dc-point></dc-area>
     </dc-chart>`,
  'dc-chart:percent-format': a =>
    `<dc-chart ${a} width="600" height="400" show-percent>${BARS}</dc-chart>`,

  // --- patterns need a pattern to modify ------------------------------------
  'dc-bar:pattern-stroke': a => PATTERNED_BAR(a),
  'dc-bar:pattern-fill': a => PATTERNED_BAR(a),
  'dc-bar:pattern-scale': a => PATTERNED_BAR(a),

  // --- curves need enough points to bend ------------------------------------
  'dc-line:curve-fit': a =>
    `<dc-chart width="600" height="400"><dc-line ${a} label="L">${MANY_POINTS}</dc-line></dc-chart>`,
  'dc-area:curve-fit': a =>
    `<dc-chart width="600" height="400"><dc-area ${a} label="A">${MANY_POINTS}</dc-area></dc-chart>`,

  // --- axis configuration only shows on the axis it configures --------------
  // Position moves the axis *title*; without one, a lone <dc-axis> just
  // reconfigures an axis the chart was already drawing in the same place.
  'dc-axis:position': a =>
    `<dc-chart width="600" height="400">
       <dc-axis ${a}><dc-title>Axis title</dc-title></dc-axis>${BARS}
     </dc-chart>`,
  'dc-axis:type': a =>
    `<dc-chart width="600" height="400">
       <dc-axis position="bottom" ${a}></dc-axis>
       <dc-line label="L">
         <dc-point value="10" label="2024-01-01"></dc-point>
         <dc-point value="20" label="2024-01-08"></dc-point>
         <dc-point value="30" label="2024-03-01"></dc-point>
       </dc-line>
     </dc-chart>`,
  'dc-axis:label-interval': a => MANY_BAR_AXIS(a),
  'dc-axis:label-lines': a => MANY_BAR_AXIS(a),
  'dc-axis:date-format': a => TIME_AXIS(a),
  'dc-axis:date-label-format': a => TIME_AXIS(a),

  // --- a <dc-fill> in a palette only supplies what the chart asks it for ----
  // Matching routes need the *positional* fallback to differ from the match,
  // or a failed match lands on the same colour and looks like no change. These
  // palettes are deliberately ordered against the bars.
  'dc-fill:label': a => MATCHED_PALETTE(a, 'label="Beta"'),
  'dc-fill:value': a => MATCHED_PALETTE(a, 'value="70"'),
  'dc-fill:min-value': a => MATCHED_PALETTE(a, 'min-value="60" max-value="100"'),
  'dc-fill:max-value': a => MATCHED_PALETTE(a, 'min-value="60" max-value="100"'),
  // The pattern routes need a label match first, since that is what carries a
  // pattern out of a palette.
  'dc-fill:pattern': a => PALETTE_FILL(a, 'label="Alpha"'),
  'dc-fill:pattern-scale': a => PALETTE_FILL(a, 'label="Alpha" pattern="dots"'),
  'dc-fill:stroke': a => PALETTE_FILL(a, 'label="Alpha" pattern="dots"'),
  'dc-fill:stroke-width': a => PALETTE_FILL(a, 'label="Alpha"'),
  'dc-fill:stroke-opacity': a => PALETTE_FILL(a, 'label="Alpha"'),
  'dc-fill:stroke-dasharray': a => PALETTE_FILL(a, 'label="Alpha"'),
  'dc-fill:stroke-dashoffset': a => PALETTE_FILL(a, 'label="Alpha"'),
  'dc-fill:stroke-linecap': a => PALETTE_FILL(a, 'label="Alpha"'),
  'dc-fill:stroke-linejoin': a => PALETTE_FILL(a, 'label="Alpha"'),
  'dc-fill:stroke-miterlimit': a => PALETTE_FILL(a, 'label="Alpha"'),
  'dc-fill:fill-opacity': a => PALETTE_FILL(a, 'label="Alpha"'),
  'dc-fill:fill-rule': a => PALETTE_FILL(a, 'label="Alpha"'),

  // --- a legend item's stroke and dash only apply to a line swatch ----------
  'dc-legend-item:stroke': a => LINE_LEGEND_ITEM(a),
  'dc-legend-item:stroke-dasharray': a => LINE_LEGEND_ITEM(a),

  // --- the legend needs values and long labels to show these ----------------
  'dc-legend:percent-format': a =>
    `<dc-chart width="600" height="400" show-percent><dc-legend ${a} show-percent></dc-legend>${BARS}</dc-chart>`,
  // max-width caps the wrapped layout; the tabular one sizes to its columns.
  'dc-legend:max-width': a =>
    `<dc-chart width="600" height="400"><dc-legend ${a} columns="*"></dc-legend>
       <dc-bar value="30" label="An Extremely Long Series Name For Wrapping"></dc-bar>
       <dc-bar value="70" label="Another Very Long Series Name Indeed Here"></dc-bar>
     </dc-chart>`,

  // --- funnel: flat edges only exist when there is a chevron to flatten -----
  'dc-funnel-chart:flat-top': a => CHEVRON_FUNNEL(a),
  'dc-funnel-chart:flat-bottom': a => CHEVRON_FUNNEL(a),
  'dc-funnel-chart:stage-min-height': a =>
    `<dc-funnel-chart ${a} width="600" height="400" stage-height="value">
       <dc-funnel-stage value="1000" label="A"></dc-funnel-stage>
       <dc-funnel-stage value="1" label="B"></dc-funnel-stage>
     </dc-funnel-chart>`,

  // --- stage: min size needs a stage small enough to floor, zero-* a zero ---
  'dc-stage-chart:stage-min-size': a =>
    `<dc-stage-chart ${a} width="600" height="500" stage-size="value">
       <dc-stage value="1000" label="A"></dc-stage><dc-stage value="1" label="B"></dc-stage>
     </dc-stage-chart>`,
  'dc-stage-chart:zero': a => ZERO_STAGE(a),
  'dc-stage-chart:zero-value': a => ZERO_STAGE(a),
  'dc-stage-chart:zero-shape': a => ZERO_STAGE(a),
  'dc-stage-chart:zero-hidden': a => ZERO_STAGE(a),

  // --- a palette's high-contrast set is only consulted in high contrast -----
  // The documented form is a <dc-palette high-contrast> *child* of the chart,
  // overriding the generated high-contrast colours.
  'dc-palette:high-contrast': a =>
    `<dc-chart width="600" height="400" high-contrast>
       <dc-palette ${a}><dc-fill fill="#123456"></dc-fill><dc-fill fill="#654321"></dc-fill></dc-palette>
       ${BARS}
     </dc-chart>`,

  // `missing` needs an axis with no value for it to decide anything about.
  'dc-radar-series:missing': a =>
    `<dc-radar-chart width="500" height="500" max-value="100">
       <dc-radar-axis label="Speed"></dc-radar-axis>
       <dc-radar-axis label="Power"></dc-radar-axis>
       <dc-radar-axis label="Range"></dc-radar-axis>
       <dc-radar-series ${a} label="A">
         <dc-point value="80" label="Speed"></dc-point>
         <dc-point value="60" label="Power"></dc-point>
         <dc-point label="Range"></dc-point>
       </dc-radar-series>
     </dc-radar-chart>`,
  // A percent format needs percentages on screen to format.
  'dc-defaults:percent-format': a =>
    `<dc-defaults ${a} show-percent></dc-defaults>
     <dc-chart width="600" height="400">${BARS}</dc-chart>`,
  'dc-radar-axis:min-value': a => RADAR(`<dc-radar-axis ${a} label="Speed"></dc-radar-axis>`),
  'dc-radar-axis:max-value': a => RADAR(`<dc-radar-axis ${a} label="Speed"></dc-radar-axis>`),
  'dc-radar-axis:value-format': a =>
    RADAR(`<dc-radar-axis ${a} label="Speed"></dc-radar-axis>`, 'show-value'),
  'dc-radar-axis:hidden': a => RADAR(`<dc-radar-axis ${a} label="Speed"></dc-radar-axis>`),
  'dc-radar-axis:label': a => RADAR(`<dc-radar-axis ${a} label="Speed"></dc-radar-axis>`),

  'dc-swatch:label': a =>
    `<dc-palette id="swl">
       <dc-fill label="Alpha" fill="#f00"></dc-fill>
       <dc-fill label="Renamed" fill="#00f"></dc-fill>
     </dc-palette>
     <dc-swatch ${a} palette="swl" label="Alpha"></dc-swatch>`,
  // `index` selects from a *built-in* palette only, as API.md says - a custom
  // <dc-palette> resolves by label or value range and never consults it.
  'dc-swatch:index': a => `<dc-swatch ${a} palette="category10" index="0"></dc-swatch>`
};

const VALUE_FOR_ELEMENT: Record<string, string> = {
  // 'dashed' is the <dc-reference> default, so it would restate rather than change.
  'dc-reference:stroke-dasharray': 'dotted',
  // 'circle' is the <dc-scatter> default, so it would restate rather than change.
  'dc-scatter:shape': 'square',
  // 0.25 is the <dc-radar-series> default, so it would restate rather than change.
  'dc-radar-series:fill-opacity': '0.7',
  // The generic 500 still spans the matched bar, so the match - and therefore
  // the rendering - is unchanged. 65 drops the 70-value bar out of the range.
  'dc-fill:max-value': '65',
  // Restating a default changes nothing; each of these flips one.
  'dc-chart:show-label': 'false',
  'dc-bar:show-label': 'false',
  'dc-bar-segment:show-label': 'false',
  'dc-pie-chart:show-value': 'true',
  // Radar hides values by default, as pie does, so 'false' restates it.
  'dc-radar-chart:show-value': 'true',
  'dc-pie-chart:show-percent': 'false',
  'dc-pie-slice:show-value': 'true',
  'dc-legend:show-value': 'false',
  // 'bottom' is the default, so it restates rather than changes. 'top' moves
  // the axis title, which is what makes the change observable at all.
  'dc-axis:position': 'top',
  // The auto-detected format for this span is already "MMM d", so asking for
  // it again changes nothing. yyyy-MM never coincides with the auto choice.
  'dc-axis:date-label-format': 'yyyy-MM',
  'dc-axis:type': 'time',
  'dc-legend-item:stroke': '#ff00ff',

  // 'circle' is already the swatch default, so it would change nothing.
  'dc-swatch:shape': 'square',
  // 'circle' is already the point default.
  'dc-point:shape': 'square',
  // StageShape has no 'square' default, but 'circle' differs from 'rectangle'.
  'dc-stage:shape': 'circle',
  'dc-stage-chart:shape': 'circle'
};

const valueFor = (tag: string, attr: string) =>
  VALUE_FOR_ELEMENT[`${tag}:${attr}`] ?? VALUE[attr];

const NO_VISUAL_EFFECT: Record<string, string> = {
  trigger: 'chooses hover vs click for a popup; nothing is drawn until the interaction happens',
  'text-scaling': 'needs a measured rendered width from ResizeObserver, which happy-dom does not deliver - covered by test/component/text-scaling.test.ts',
  fit: 'needs a container with a definite measured height - covered by the fit tests',

  logging: 'controls what is captured for <dc-log-console>, not what is drawn',
  'console-log': 'controls console echo only',
  target: 'passed to the <a> wrapper; only meaningful with href, which is tested',
  'legend-target': 'passed to the <a> around a legend entry; only meaningful with legend-href, which is tested',
  chart: 'selector for <dc-log-console>, which renders no chart of its own',
  'zero-fill': 'references a <dc-fill> by id; with no such element the chart is unchanged',
  hidden: 'tested directly in the element suites; on <dc-grid> it removes grid lines'
};

/**
 * Attributes confirmed *not* read by anything, verified in the source rather
 * than inferred from this test failing. Each is a bug with a note; removing a
 * line here is the last step of fixing one, and the suite says so if you fix
 * the code and forget.
 */
const KNOWN_DEAD: Record<string, string> = {
  // Empty. The time-axis attributes that were here are implemented; the ten
  // before them are too. A new entry means a new bug.
};

/**
 * Attributes this test does not yet exercise, because reaching them needs a
 * context that has not been written. Each *is* read by the source - checked -
 * so these are gaps in the test, not in the library. Shrink this list.
 */
const NEEDS_CONTEXT: Record<string, string> = {
  // Empty. Every attribute now has a context that reaches it.
};

const files = declaredByFile();

/** (tag, attribute) pairs to check, from the source. */
const CASES: Array<{ tag: string; attr: string; file: string }> = [];
/**
 * Elements this harness genuinely cannot render a chart from.
 * `<dc-log-console>` displays another chart's diagnostics and draws no chart of
 * its own; its single attribute is a selector, already in NO_VISUAL_EFFECT.
 */
const NOT_RENDERABLE = new Set(['dc-log-console']);

/** Elements with no context, which is a gap in this file rather than a design. */
const UNREACHABLE: string[] = [];
for (const [file, { tag, attrs }] of files) {
  const host = HOST_FOR_FILE[file] ?? tag;
  if (!host) continue;
  if (NOT_RENDERABLE.has(host)) continue;
  if (!CONTEXT[host]) {
    // Silently skipping here is how a whole new element escapes the guard: the
    // radar chart's three elements were invisible to it until this check
    // existed, because no context named them.
    UNREACHABLE.push(host);
    continue;
  }
  for (const attr of attrs) CASES.push({ tag: host, attr, file });
}

/** Render markup and return the outermost chart's shadow HTML. */
async function renderShadow(html: string): Promise<string> {
  const wrapper = await fixture<HTMLElement>('div', {}, html);
  const chart = wrapper.querySelector(
    'dc-chart, dc-pie-chart, dc-funnel-chart, dc-stage-chart, dc-radar-chart, dc-swatch'
  ) as HTMLElement & { updateComplete?: Promise<boolean> };
  for (let i = 0; i < 10; i++) if (await chart.updateComplete) break;

  // <dc-swatch> defers its real render behind customElements.whenDefined() and
  // a requestAnimationFrame, so reading straight after updateComplete sees the
  // pre-resolution output - identical whatever attributes were set, which reads
  // as every swatch attribute being dead.
  await new Promise(r => requestAnimationFrame(() => r(null)));
  await new Promise(r => setTimeout(r, 0));
  for (let i = 0; i < 10; i++) if (await chart.updateComplete) break;

  const inner = chart.shadowRoot?.innerHTML ?? '';
  wrapper.remove();
  return normaliseInstanceIds(inner);
}

/**
 * Strip the per-instance counters from rendered output.
 *
 * Every chart gets a fresh instance id, which appears in `aria-describedby`
 * (`dc-desc-1`) and in generated pattern ids (`dc-chart-1-dots-0`). Two renders
 * of the *same* markup therefore differ, which made this whole check vacuous:
 * it reported every attribute as live because the ids always moved on.
 *
 * Caught only by mutation-testing it against a bug it was written to prevent -
 * `bar-color` was re-broken and the suite stayed green.
 */
function normaliseInstanceIds(html: string): string {
  return html
    .replace(/dc-desc-\d+/g, 'dc-desc-N')
    .replace(/dc-[a-z-]*chart-\d+-/g, 'dc-chart-N-')
    .replace(/lit\$\d+\$/g, 'lit$N$');
}

describe('no attribute is declared and then ignored', () => {
  it('can render every custom element', () => {
    expect(
      UNREACHABLE,
      `these elements have no entry in CONTEXT, so none of their attributes are ` +
        `checked: ${UNREACHABLE.join(', ')}`
    ).toEqual([]);
  });

  it('has a context and a value for every declared attribute', () => {
    const missingValue = [...new Set(CASES.map(c => c.attr))].filter(a => !(a in VALUE));
    expect(
      missingValue,
      `add a test value for these in VALUE, or they cannot be checked: ${missingValue.join(', ')}`
    ).toEqual([]);
    expect(CASES.length).toBeGreaterThan(80);
  });

  it('reports what it does not cover, rather than passing quietly', () => {
    const skipped = CASES.filter(
      c =>
        c.attr in NO_VISUAL_EFFECT ||
        `${c.tag}:${c.attr}` in KNOWN_DEAD ||
        `${c.tag}:${c.attr}` in NEEDS_CONTEXT
    );
    // Visible in the run output, so the exclusions cannot quietly grow.
    console.log(
      `no-dead-attributes: checking ${CASES.length - skipped.length} of ${CASES.length} pairs; ` +
        `${Object.keys(KNOWN_DEAD).length} known dead, ` +
        `${Object.keys(NEEDS_CONTEXT).length} awaiting a context, ` +
        `${Object.keys(NO_VISUAL_EFFECT).length} with no render-time effect`
    );
    expect(skipped.length).toBeLessThan(CASES.length / 3);
  });

  /**
   * A known-dead attribute that starts working is good news the list has to
   * hear about, or the list rots into folklore.
   */
  it.each(Object.keys(KNOWN_DEAD).map(k => ({ key: k })))(
    '$key is still dead (remove it from KNOWN_DEAD once fixed)',
    async ({ key }) => {
      const [tag, attr] = key.split(':');
      const build = CONTEXT_FOR_ELEMENT[key] ?? CONTEXT[tag];
      const before = await renderShadow(build(''));
      const after = await renderShadow(build(`${attr}="${valueFor(tag, attr)}"`));
      expect(
        after,
        `<${tag} ${attr}> now changes the rendering - delete its line from KNOWN_DEAD.`
      ).toBe(before);
    }
  );

  it.each(
    CASES.filter(
      c =>
        !(c.attr in NO_VISUAL_EFFECT) &&
        !(`${c.tag}:${c.attr}` in KNOWN_DEAD) &&
        !(`${c.tag}:${c.attr}` in NEEDS_CONTEXT)
    )
  )(
    '<$tag $attr> changes the rendering',
    async ({ tag, attr }) => {
      const build = CONTEXT_FOR_ELEMENT[`${tag}:${attr}`] ?? CONTEXT[tag];
      const before = await renderShadow(build(''));
      const after = await renderShadow(build(`${attr}="${valueFor(tag, attr)}"`));

      expect(
        after,
        `<${tag} ${attr}="${valueFor(tag, attr)}"> rendered byte-identically to <${tag}> without it. ` +
          `Either the attribute is not read, or it needs a line in NO_VISUAL_EFFECT.`
      ).not.toBe(before);
    }
  );
});
