# Stage Chart API Proposal

A flow-style chart where each stage is rendered as a shape (rectangle, square, oval, circle) with area proportional to its value, connected by lines.

## Attribute Naming Conventions

Following existing patterns in the codebase:
- **Funnel chart**: Uses `segment-` prefix (`segment-height`, `segment-min-height`, `segment-max-height`)
- **Stage chart**: Uses `stage-` prefix for consistency (`stage-size`, `stage-min-size`, `stage-max-size`)
- **Compound syntax**: Follows `stroke` pattern where order-flexible values are space-separated (e.g., `"2 #333"` or `"#333 2"`)

---

## Element: `<dc-stage-chart>`

### Dimensions & Layout

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | number | 600 | Chart width in pixels |
| `height` | number | 400 | Chart height in pixels |
| `padding` | string | auto | CSS-style padding (e.g., "60", "10% 15%") |
| `orientation` | string | "vertical" | "vertical" (top→bottom) or "horizontal" (left→right) |

### Shape Configuration

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `shape` | string | "rectangle" | Default shape: "rectangle", "square", "oval", "circle" |
| `corner-radius` | string | "0" | Corner radius for rectangles (e.g., "8px", "10%", "0.5rem") |
| `aspect-ratio` | number | 2 | Width:height ratio for rectangles/ovals (ignored for square/circle) |

**Notes:**
- `shape` can be overridden per-stage using the `shape` attribute on `<dc-stage>`
- For `square` and `circle`, aspect-ratio is forced to 1
- `corner-radius` only applies to rectangle shapes

### Size Calculation

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `stage-size` | string | (equal) | Size mode with optional min/max (see syntax below) |
| `stage-min-size` | string | - | Minimum stage dimension (e.g., "30px") |
| `stage-max-size` | string | - | Maximum stage dimension (e.g., "200px") |

**`stage-size` syntax** (mirrors `segment-height` from funnel chart):
```
stage-size=""                    → Equal sizes (default)
stage-size="value"               → Area proportional to value
stage-size="log-value"           → Area proportional to log₁₀(value + 1)
stage-size="80px"                → Fixed size (width for rect, diameter for circle)
stage-size="value 30px"          → Proportional with minimum
stage-size="value 30px 200px"    → Proportional with min and max
```

### Spacing & Connectors

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `gap` | string | "20px" | Space between stages (e.g., "20px", "5%", "0") |
| `connector` | string | "line" | Connector style with optional color/width (see syntax below) |

**`connector` compound syntax:**
```
connector="none"                 → No connectors
connector="line"                 → Line with defaults (#999, 2px)
connector="arrow"                → Arrow with defaults
connector="line #666"            → Line with custom color
connector="arrow 3"              → Arrow with custom width
connector="line 2 #333"          → Line with width and color (order flexible)
connector="arrow #333 2 10px"    → Arrow with color, width, and arrow-size
```

**Connector defaults:**
- Color: `#999`
- Width: `2` (pixels)
- Arrow size: `8px` (when type is "arrow")

**Note:** When `gap="0"`, connectors are hidden regardless of `connector` setting.

### Colors & Styling

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `palette` | string | - | Palette ID or built-in name |
| `stroke` | string | - | Shorthand: "2 #333" or "#333 2" |
| `stroke-color` | string | "#e0e0e0" | Shape border color |
| `stroke-width` | number | 1 | Shape border width |

### Zero Value Handling

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `zero-style` | string | "ghost" | How to render value=0 stages |

**Zero style options:**
- **"ghost"**: Semi-transparent, dashed border, small fixed size (default)
- **"hidden"**: Stage not rendered, connector bridges to next stage
- **"dot"**: Small fixed-size circle marker (ignores shape setting)
- **"normal"**: Render normally (may be invisible if area calculates to 0)

**Palette-based zero styling** (alternative to `zero-style`):
```html
<dc-palette id="with-zeros">
  <dc-fill value="0" fill="#f5f5f5" stroke="#ccc" stroke-dasharray="4 2"></dc-fill>
  <dc-fill fill="#4285f4"></dc-fill>
</dc-palette>
<dc-stage-chart palette="with-zeros" zero-style="normal">
```

### Display Options (inherited from BaseChart)

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `show-value` | string | "true" | Show values: "true", "false", or conditional |
| `show-label` | string | "true" | Show labels: "true", "false", or conditional |
| `show-percent` | string | "false" | Show percentages |
| `value-format` | string | - | Number format (e.g., "compact 1", "currency USD") |
| `auto-popup` | boolean | false | Show popup on hover |
| `legend` | string | "none" | Legend: "none", "auto", or position |
| `legend-position` | string | "bottom" | Legend position |
| `logging` | boolean | false | Enable debug logging |

### Slots

- Default slot: `<dc-title>`, `<dc-stage>`, `<dc-legend>`, `<dc-palette>`

---

## Element: `<dc-stage>`

Child element representing a single stage in the chart.

### Data Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `value` | number | Yes | Numeric value for this stage |
| `label` | string | Yes | Stage label/name |

### Shape Override

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `shape` | string | (inherit) | Override chart's shape for this stage |
| `corner-radius` | string | (inherit) | Override corner radius (rectangles only) |

### Display Overrides

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `show-value` | string | (inherit) | Override chart's show-value |
| `show-label` | string | (inherit) | Override chart's show-label |
| `show-percent` | string | (inherit) | Override chart's show-percent |
| `value-format` | string | (inherit) | Override number format |
| `auto-popup` | boolean | (inherit) | Override auto-popup |

### Styling (inherited from BaseShape)

| Attribute | Type | Description |
|-----------|------|-------------|
| `fill` | string | Fill color (overrides palette) |
| `stroke` | string | Stroke shorthand |
| `stroke-color` | string | Border color |
| `stroke-width` | number | Border width |
| `pattern` | string | Pattern name or ID |
| `pattern-stroke` | string | Pattern stroke color |
| `pattern-fill` | string | Pattern fill color |
| `pattern-scale` | number | Pattern scale factor |

### Slots

- `<dc-popup>`: Custom popup content

---

## Examples

### Basic Stage Chart (Values Increase and Decrease)

```html
<dc-stage-chart width="400" height="500" stage-size="value">
  <dc-title>Project Pipeline</dc-title>
  <dc-stage value="50" label="Backlog"></dc-stage>
  <dc-stage value="120" label="In Progress"></dc-stage>  <!-- Increases -->
  <dc-stage value="80" label="Review"></dc-stage>        <!-- Decreases -->
  <dc-stage value="200" label="Done"></dc-stage>         <!-- Increases -->
</dc-stage-chart>
```

### Horizontal with Arrows

```html
<dc-stage-chart orientation="horizontal" connector="arrow 2 #666" gap="30px">
  <dc-stage value="100" label="Q1"></dc-stage>
  <dc-stage value="150" label="Q2"></dc-stage>   <!-- Growth -->
  <dc-stage value="130" label="Q3"></dc-stage>   <!-- Dip -->
  <dc-stage value="200" label="Q4"></dc-stage>   <!-- Recovery -->
</dc-stage-chart>
```

### Circles with Value-Proportional Sizing

```html
<dc-stage-chart shape="circle" stage-size="value" palette="category10">
  <dc-stage value="200" label="Awareness"></dc-stage>
  <dc-stage value="350" label="Interest"></dc-stage>      <!-- Peak -->
  <dc-stage value="150" label="Evaluation"></dc-stage>    <!-- Drop -->
  <dc-stage value="100" label="Purchase"></dc-stage>
</dc-stage-chart>
```

### Mixed Shapes Per Stage

```html
<dc-stage-chart stage-size="value" connector="arrow">
  <dc-stage value="100" label="Start" shape="circle" fill="#4caf50"></dc-stage>
  <dc-stage value="250" label="Peak" shape="rectangle" fill="#2196f3"></dc-stage>
  <dc-stage value="75" label="End" shape="circle" fill="#f44336"></dc-stage>
</dc-stage-chart>
```

### Rounded Rectangles with Constraints

```html
<dc-stage-chart
  shape="rectangle"
  corner-radius="12px"
  aspect-ratio="2.5"
  stage-size="value 40px 180px"
  stroke="2 #333"
>
  <dc-stage value="100" label="Step 1"></dc-stage>
  <dc-stage value="500" label="Step 2"></dc-stage>   <!-- Would be capped at 180px -->
  <dc-stage value="50" label="Step 3"></dc-stage>    <!-- Would be at min 40px -->
  <dc-stage value="300" label="Step 4"></dc-stage>
</dc-stage-chart>
```

### Handling Zero Values

```html
<dc-stage-chart zero-style="ghost" connector="arrow">
  <dc-stage value="100" label="Started"></dc-stage>
  <dc-stage value="0" label="Blocked"></dc-stage>     <!-- Ghost appearance -->
  <dc-stage value="75" label="Completed"></dc-stage>
</dc-stage-chart>
```

### Zero Value with Hidden Style

```html
<dc-stage-chart zero-style="hidden" connector="line">
  <dc-stage value="100" label="A"></dc-stage>
  <dc-stage value="0" label="B"></dc-stage>   <!-- Not rendered, line bridges A→C -->
  <dc-stage value="50" label="C"></dc-stage>
</dc-stage-chart>
```

---

## Visual Reference

### Vertical with Non-Monotonic Values

```
Values: 50 → 120 → 80 → 200 (up, down, up)

         ┌───────┐
         │ Backlog│   ← Small (50)
         │   50   │
         └───────┘
              │
              ▼
    ┌─────────────────┐
    │   In Progress   │   ← Larger (120) - EXPANDS
    │       120       │
    └─────────────────┘
              │
              ▼
       ┌───────────┐
       │   Review  │      ← Smaller (80) - CONTRACTS
       │     80    │
       └───────────┘
              │
              ▼
┌─────────────────────────┐
│          Done           │   ← Largest (200) - EXPANDS
│          200            │
└─────────────────────────┘
```

### Horizontal with Growth and Dips

```
Values: 100 → 150 → 130 → 200

┌────────┐       ┌────────────┐       ┌──────────┐       ┌────────────────┐
│        │       │            │       │          │       │                │
│  Q1    │──────▶│     Q2     │──────▶│    Q3    │──────▶│       Q4       │
│  100   │       │    150     │       │   130    │       │      200       │
│        │       │            │       │          │       │                │
└────────┘       └────────────┘       └──────────┘       └────────────────┘
   ↑                  ↑                    ↑                    ↑
 Base              Growth               Dip                 Recovery
```

### Circle Shapes with Variable Sizes

```
Values: 200 → 350 → 150 → 100

       ●●●●●●●
      ●       ●
     ●  200    ●
      ●       ●
       ●●●●●●●
           │
           ▼
     ●●●●●●●●●●●
    ●           ●
   ●     350     ●      ← Largest circle
    ●           ●
     ●●●●●●●●●●●
           │
           ▼
        ●●●●●
       ●     ●
       ● 150 ●          ← Contracts
       ●     ●
        ●●●●●
           │
           ▼
         ●●●
        ● 100●          ← Smallest
         ●●●
```

### Ghost Zero Value

```
Values: 100 → 0 → 75

    ┌─────────────┐
    │   Started   │      ← Normal shape
    │     100     │
    └─────────────┘
           │
           ▼
    ┌ ─ ─ ─ ─ ─ ─┐
    ╎   Blocked  ╎       ← Ghost (dashed, faded, small fixed size)
    ╎      0     ╎
    └ ─ ─ ─ ─ ─ ─┘
           │
           ▼
      ┌─────────┐
      │Completed│        ← Normal shape
      │    75   │
      └─────────┘
```

---

## Implementation Notes

### Area Calculation for Proportional Sizing

```typescript
// Given: values[], maxWidth (chart width - padding), shape, aspectRatio
const totalValue = values.reduce((sum, v) => sum + v, 0);

// For each stage, calculate area relative to total
for (const stage of stages) {
  const areaRatio = stage.value / totalValue;

  // Available area budget (distribute chart area among stages)
  const availableArea = maxWidth * stageHeight * areaRatio;

  switch (shape) {
    case 'square':
      stage.side = Math.sqrt(availableArea);
      break;
    case 'circle':
      stage.radius = Math.sqrt(availableArea / Math.PI);
      break;
    case 'rectangle':
      // width = sqrt(area * aspectRatio)
      // height = sqrt(area / aspectRatio)
      stage.width = Math.min(maxWidth, Math.sqrt(availableArea * aspectRatio));
      stage.height = availableArea / stage.width;
      break;
    case 'oval':
      // Same as rectangle but rendered as ellipse
      stage.rx = Math.min(maxWidth / 2, Math.sqrt(availableArea * aspectRatio) / 2);
      stage.ry = availableArea / (Math.PI * stage.rx);
      break;
  }

  // Apply min/max constraints
  applyConstraints(stage, minSize, maxSize);
}
```

### Connector Rendering

```typescript
// Vertical orientation:
// Line from (centerX, shape1.bottom) to (centerX, shape2.top)

// Horizontal orientation:
// Line from (shape1.right, centerY) to (shape2.left, centerY)

// Arrow head: equilateral triangle pointing in flow direction
function drawArrowHead(x: number, y: number, direction: 'down' | 'right', size: number) {
  // Returns SVG path for triangle
}
```

### Ghost Style Rendering

```typescript
const GHOST_STYLE = {
  fill: 'rgba(200, 200, 200, 0.2)',
  stroke: '#ccc',
  strokeDasharray: '4 2',
  opacity: 0.6,
  fixedSize: 30  // pixels, regardless of value
};
```

---

## Comparison with Funnel Chart

| Feature | Funnel Chart | Stage Chart |
|---------|--------------|-------------|
| Shape | Trapezoids (narrowing) | Rectangles, squares, circles, ovals |
| Sizing | Width based on position | Area based on value |
| Trend | Typically decreasing | Any direction (up/down) |
| Connectors | Shapes touch | Gap with connecting lines |
| Use case | Conversion funnels | Pipelines, workflows, metrics |

---

## Future Considerations

1. **Branching**: Multiple paths (splits/merges)
2. **Animations**: Value change transitions
3. **Status badges**: Icons on stages
4. **Horizontal scrolling**: For many stages
5. **Sub-stages**: Nested groupings
