# Declarative Chart Library

[![CI](https://github.com/LarryLustig/declarative-charts/actions/workflows/ci.yml/badge.svg)](https://github.com/LarryLustig/declarative-charts/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Charts your server can render. No JSON endpoint, no build step, no chart code.**

Most chart libraries want your data as JavaScript. You add an API endpoint,
serialise your rows to JSON, ship a config object to the browser, and the shape
of your chart ends up in a different language from the rest of your page.

This one takes HTML:

```html
<dc-chart width="600" height="400">
  <dc-title>Revenue by Region</dc-title>
  <dc-bar value="4200" label="North"></dc-bar>
  <dc-bar value="3800" label="South"></dc-bar>
  <dc-bar value="5100" label="East"></dc-bar>
</dc-chart>
```

Which means your existing template loop already knows how to write it:

```html
<!-- Django -->
<dc-chart width="600" height="400">
  <dc-title>Revenue by Region</dc-title>
  {% for region in regions %}
    <dc-bar value="{{ region.revenue }}" label="{{ region.name }}"></dc-bar>
  {% endfor %}
</dc-chart>
```

```erb
<%# Rails %>
<dc-chart width="600" height="400">
  <dc-title>Revenue by Region</dc-title>
  <% @regions.each do |region| %>
    <dc-bar value="<%= region.revenue %>" label="<%= region.name %>"></dc-bar>
  <% end %>
</dc-chart>
```

No endpoint to build, no serialisation to keep in step with your models, and the
chart is in your page's source where you can read it.

### It updates the way the rest of your page does

Charts watch their own children, so anything that changes the markup redraws the
chart — including an htmx swap. There is no `requestUpdate()` to remember and no
JavaScript to write:

```html
<div hx-get="/reports/q3" hx-trigger="click" hx-target="#sales">
  Load Q3
</div>

<dc-chart id="sales" width="600" height="400">
  <!-- htmx replaces these <dc-bar> elements; the chart redraws itself -->
</dc-chart>
```

Every element also takes `hx-*` and other unknown attributes and passes them
through to the SVG shape, so a bar can be a drop target or trigger a request.

## Where this sits

The useful distinction between charting libraries is not "web component or JS
library" — that is cosmetic. It is **where the data lives**, and on that axis
there are only two designs.

**Data as a payload.** One element, or one call, per *chart*:

```html
<google-chart data='[["Month","Days"],["Jan",31],["Feb",28]]'></google-chart>
```
```js
new Chart(ctx, { data: { labels: [...], datasets: [...] } });
```

Different clothes, same design. The data is an opaque blob you must serialise
first, and the HTML is a mounting point. You cannot address one datapoint from
markup, attach a handler to a single bar, or let a template emit a row without
JSON-encoding it. Chart.js, ECharts, ApexCharts, Highcharts, Recharts,
Vega-Lite and the web-component wrappers all work this way.

**Data as markup.** One element per *datapoint*:

```html
<td style="--size: 0.4"><span class="data">$40K</span></td>   <!-- Charts.css -->
<dc-bar value="40000" label="Jan"></dc-bar>                    <!-- this library -->
```

That category has essentially two members. [Charts.css](https://chartscss.org)
proved there is demand for it — 6.5k stars — and stopped where real charting
begins, because a stylesheet cannot measure text, compute a nice axis range, lay
out a legend, fit labels, or handle interaction. Its markup also asks you to
pre-normalise: `--size` is a ratio from 0 to 1, so the real number never appears
in the document except as display text.

**This library is the data-as-markup approach with a rendering engine behind
it** — axes, scales, legends, text fitting, interaction, accessibility — and
`value="40000"` is the actual number, un-normalised, so your template does not
need to know the series maximum before it can emit a row.

### What this is not

**It is not "charts without JavaScript". It is charts without _writing_
JavaScript.**

Charts.css genuinely renders with JavaScript disabled. This library does not —
it needs Lit and it renders SVG at runtime, the same as everything else that
draws pixels. The claim is about the *authoring* model: your template emits
markup, and there is no serialisation step and no data-binding layer.

**It does not depend on htmx.** htmx works well with it, and the README shows
that above, but the mechanism is general: any attribute the library does not
recognise is copied onto the generated SVG shape. That serves `hx-*` equally
well as `data-*`, Alpine's `x-on:`, Livewire's `wire:`, Stimulus's
`data-action`, or nothing at all.

### Where it fits, and where it does not

The sweet spot is **small-to-medium categorical data emitted by a server
template** — a few dozen bars, a handful of series. One element per datapoint
has real costs at scale: DOM weight, verbosity, and markup that gets unwieldy
past a few hundred points. Rendering scales close to linearly — 1,000 bars take
about 620 ms from markup to painted pixels and 180 ms to re-render, measured
with `npm run bench` — so the ceiling is practical rather than architectural. But
if you have a 5,000-point time series, a canvas-based library is the better tool
and this is the wrong one.

A fuller version of this analysis, with the competitive matrix and its caveats,
is in [docs/review.md](docs/review.md).

## Features

- **Declarative Syntax** - Define charts with nested HTML elements
- **Multiple Chart Types** - Bar, Line, Area, Bubble, Pie, Funnel, and Stage charts
- **Rich Styling** - Colors, gradients, patterns, and high contrast mode
- **Number Formatting** - Currency, compact (1.2M), percentages, locale-aware
- **Fully Accessible** - ARIA labels, keyboard navigation, screen reader support
- **Interactive** - Popups, clickable elements, dynamic updates
- **Events** - `dc-click`, `dc-mouseenter`, `dc-mouseleave`, `dc-render` with typed detail
- **Lightweight** - Built on Lit (~5KB overhead)
- **TypeScript** - Full type definitions included
- **Framework-agnostic** - Works with React, Vue, Angular, or plain HTML

## Quick Start

### Installation

**Via npm:**

```bash
npm install declarative-charts lit
```

```javascript
import 'declarative-charts';
```

Lit is a peer dependency, so you install it alongside. This keeps a single copy of
Lit in your app if you already use it — bundling our own would give you two.
The CDN builds below need no such thing; they are fully self-contained.

**Via CDN:**

```html
<script type="module" src="https://unpkg.com/declarative-charts"></script>
```

Or with jsdelivr:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/declarative-charts"></script>
```

**Local development:**

```bash
git clone https://github.com/LarryLustig/declarative-charts.git
cd declarative-charts
npm install
npm run dev
```

Open your browser to `http://localhost:5173`

### Bar Chart

```html
<dc-chart width="600" height="400">
  <dc-title>Monthly Sales</dc-title>
  <dc-bar value="10" fill="red" label="Jan"></dc-bar>
  <dc-bar value="25" fill="blue" label="Feb"></dc-bar>
  <dc-bar value="15" fill="green" label="Mar"></dc-bar>
</dc-chart>
```

### Line Chart

```html
<dc-chart width="600" height="400">
  <dc-title>Temperature Trends</dc-title>
  <dc-line stroke="#9C27B0" label="City A">
    <dc-point value="15" label="Mon"></dc-point>
    <dc-point value="18" label="Tue"></dc-point>
    <dc-point value="22" label="Wed"></dc-point>
  </dc-line>
</dc-chart>
```

### Area Chart

```html
<dc-chart width="600" height="400">
  <dc-title>Traffic by Source</dc-title>
  <dc-area fill="#2196F3" label="Direct">
    <dc-point value="30" label="Mon"></dc-point>
    <dc-point value="45" label="Tue"></dc-point>
    <dc-point value="38" label="Wed"></dc-point>
  </dc-area>
  <dc-area fill="#4CAF50" label="Referral">
    <dc-point value="20" label="Mon"></dc-point>
    <dc-point value="25" label="Tue"></dc-point>
    <dc-point value="32" label="Wed"></dc-point>
  </dc-area>
</dc-chart>
```

Areas stack by default; add `overlapping` to the chart to draw them on top of one another.

### Pie Chart

```html
<dc-pie-chart width="600" height="400">
  <dc-title>Market Share</dc-title>
  <dc-pie-slice value="45" label="Product A"></dc-pie-slice>
  <dc-pie-slice value="30" label="Product B"></dc-pie-slice>
  <dc-pie-slice value="25" label="Product C"></dc-pie-slice>
</dc-pie-chart>
```

### Funnel Chart

```html
<dc-funnel-chart width="600" height="400">
  <dc-title>Conversion Funnel</dc-title>
  <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
  <dc-funnel-stage value="500" label="Leads"></dc-funnel-stage>
  <dc-funnel-stage value="100" label="Customers"></dc-funnel-stage>
</dc-funnel-chart>
```

### Stage Chart

```html
<dc-stage-chart width="400" height="500" stage-size="value">
  <dc-title>Pipeline</dc-title>
  <dc-stage value="100" label="Leads"></dc-stage>
  <dc-stage value="60" label="Qualified"></dc-stage>
  <dc-stage value="20" label="Won"></dc-stage>
</dc-stage-chart>
```

Like a funnel, a stage chart shows a flow — but it draws each step as a shape whose *area* is
proportional to its value, rather than as a chevron band.

### Bubble Chart

```html
<dc-chart width="600" height="400">
  <dc-title>Quarterly Performance</dc-title>
  <dc-bubble label="Q1" value="30" size-value="100"></dc-bubble>
  <dc-bubble label="Q2" value="45" size-value="200"></dc-bubble>
  <dc-bubble label="Q3" value="60" size-value="300"></dc-bubble>
</dc-chart>
```

## Browser Compatibility

| Browser | Supported Versions |
|---------|-------------------|
| Chrome | 90+ |
| Firefox | 90+ |
| Safari | 14+ |
| Edge | 90+ |

Requires native support for Web Components (Custom Elements, Shadow DOM) and ES2020. No polyfills needed for modern browsers.

## Bundle Size

Three artifacts, because three kinds of consumer need different things. You
download exactly one.

| Artifact | Lit | Raw | Gzipped | For |
|---|---|---|---|---|
| `declarative-charts.standalone.js` | inlined | 291 KB | **75 KB** | CDN and vendored `<script type="module">` |
| `declarative-charts.umd.cjs` | inlined | 295 KB | **75 KB** | plain `<script src>` and `require()` |
| `declarative-charts.js` | external | 456 KB | 108 KB | bundlers — yours will minify it |

Lit accounts for about 6 KB gzipped of the self-contained builds; the library
itself is ~69 KB gzipped. The bundler-facing build is larger because it keeps
`/* @__PURE__ */` annotations and formatting for your bundler to tree-shake
against and minify — it is not what a browser downloads.

Figures from `npm run build`, which prints them on every build.

## Performance Guidelines

- **Large datasets**: For very large datasets, consider aggregating data before rendering.
- **Dynamic updates**: Just change the markup. Charts watch their own children with a `MutationObserver`, so adding, removing, hiding or re-attributing an element re-renders automatically — `requestUpdate()` is not needed, and htmx-style `innerHTML` swaps work as-is.
- **Hidden elements**: Use the `hidden` attribute on data elements to temporarily hide them without removing from DOM.
- **Popups**: Use `auto-popup` for automatic tooltips instead of manually managing popup state.
- **SVG rendering**: Charts render to SVG, which scales cleanly but can slow down with thousands of elements.

## Documentation

- **[Live example gallery](https://larrylustig.github.io/declarative-charts/)** - 37 pages, every feature, with the markup beside each chart
- **[API Reference](API.md)** - Complete attribute and element documentation
- **[Changelog](CHANGELOG.md)** - Version history
- **[Roadmap](ROADMAP.md)** - Planned features and explicitly declined ones
- **[Security policy](SECURITY.md)** - Threat model and private reporting

The gallery is built from `examples/` on every push to `main`. To run it
locally, `npm run dev` and open `localhost:5173`.

### Key Examples

| Feature | Example |
|---------|---------|
| Bar charts | [barcharts.html](examples/barcharts.html) |
| Line charts | [linecharts.html](examples/linecharts.html) |
| Pie charts | [piecharts.html](examples/piecharts.html) |
| Funnel charts | [funnelcharts.html](examples/funnelcharts.html) |
| Colors & gradients | [colors.html](examples/colors.html) |
| Patterns & palettes | [palettes.html](examples/palettes.html), [patterns.html](examples/patterns.html) |
| Number formatting | [formatting.html](examples/formatting.html) |
| Legends & titles | [legends.html](examples/legends.html), [titles.html](examples/titles.html) |
| Axes configuration | [axes.html](examples/axes.html) |
| Popups & interactivity | [popups.html](examples/popups.html), [interactive.html](examples/interactive.html) |
| Accessibility | [accessibility.html](examples/accessibility.html) |
| htmx integration | [htmx-integration.html](examples/htmx-integration.html) |

## Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm test         # Run tests
```

### Project Structure

```
src/
├── chart.ts            # Bar/Line/Bubble chart component
├── pie-chart.ts        # Pie chart component
├── funnel-chart.ts     # Funnel chart component
├── chart-*.ts          # Data elements (bar, line, point, etc.)
└── index.ts            # Main export

examples/               # Example HTML files
```

## License

MIT - See [LICENSE](LICENSE) for details.
