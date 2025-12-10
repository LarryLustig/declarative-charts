# Future Feature Ideas

This file tracks potential features and enhancements to consider for future development.

## Responsive/Scaling

- [ ] **Responsive SVG mode** - Add opt-in `responsive` attribute that sets `width="100%"` with `viewBox` for container-filling charts. Requires fixing popup positioning to account for SVG scaling via CTM (Current Transformation Matrix).

## Chart Types

- [ ] **Scatter Chart** - Plot individual data points by x/y coordinates
- [ ] **Area Chart** - Filled line chart variant
- [ ] **Stacked Bar Chart** - Bars stacked on top of each other
- [ ] **Radial/Gauge Chart** - Semi-circular progress indicators
- [ ] **Treemap** - Hierarchical data visualization

## Interactivity

- [ ] **Click events on shapes** - Beyond popups, allow custom click handlers
- [ ] **Zoom/pan support** - For data-dense charts
- [ ] **Animated transitions** - Smooth updates when data changes

## Accessibility

- [ ] **ARIA labels** - Screen reader support for chart data
- [ ] **Keyboard navigation** - Tab through data points
- [ ] **High contrast mode** - Alternative color schemes

## Data Features

- [ ] **Data labels** - Optional labels directly on chart elements
- [ ] **Axis customization** - Custom tick marks, labels, formatting
- [ ] **Secondary Y-axis** - For dual-scale charts
- [ ] **Null/gap handling** - How to render missing data points in lines

## Export

- [ ] **PNG/SVG export** - Download chart as image
- [ ] **Print styles** - Optimized rendering for print

---

*Add ideas here as they come up. Move items to GitHub issues when ready for implementation.*
