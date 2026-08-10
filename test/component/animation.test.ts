import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  DEFAULT_ANIMATION_OPTIONS,
  animateBars,
  animateLines,
  animateAreas,
  animatePieSlices,
  animatePoints,
  animateChartEntry,
  prefersReducedMotion,
  supportsWebAnimations,
  type AnimationOptions
} from '../../src/animation';

/**
 * Tests for the animation entry points.
 *
 * These run in happy-dom, which provides `Element.prototype.animate` — the
 * pure helpers are covered separately in `test/unit/animation.test.ts`, which
 * runs in node with no DOM at all.
 *
 * The animators are driven against hand-built SVG rather than real charts, so a
 * failure points at the animation code rather than at whatever a chart happened
 * to render. What matters here is the contract every one of them shares: find
 * the right elements, skip the ones already animating, and hand back an
 * `Animation` per element so the caller can cancel them.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const opts: AnimationOptions = { ...DEFAULT_ANIMATION_OPTIONS };

/** Build a detached <svg> containing `count` elements of `tag` with `attrs`. */
function svgWith(tag: string, count: number, attrs: Record<string, string> = {}): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  for (let i = 0; i < count; i++) {
    const el = document.createElementNS(SVG_NS, tag);
    el.setAttribute('data-shape-index', String(i));
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.appendChild(el);
  }
  document.body.appendChild(svg);
  return svg;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('the environment these tests assume', () => {
  it('provides the Web Animations API', () => {
    expect(supportsWebAnimations()).toBe(true);
  });

  it('does not claim a reduced-motion preference by default', () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('animateBars', () => {
  it('returns one animation per bar', () => {
    expect(animateBars(svgWith('rect', 3), opts)).toHaveLength(3);
  });

  it('marks each bar while it animates', () => {
    const svg = svgWith('rect', 2);
    animateBars(svg, opts);
    const marked = svg.querySelectorAll('rect[data-animated]');
    expect(marked).toHaveLength(2);
  });

  // Re-entrancy matters: a chart re-renders on any child mutation, and
  // restarting an in-flight animation makes bars visibly stutter.
  it('skips bars that are already animating', () => {
    const svg = svgWith('rect', 3);
    animateBars(svg, opts);
    expect(animateBars(svg, opts)).toHaveLength(0);
  });

  it('grows vertical bars from the bottom', () => {
    const svg = svgWith('rect', 1);
    animateBars(svg, opts, false);
    const rect = svg.querySelector('rect') as SVGRectElement;
    expect(rect.style.transformOrigin).toBe('center bottom');
    expect(rect.style.transformBox).toBe('fill-box');
  });

  it('grows horizontal bars from the left', () => {
    const svg = svgWith('rect', 1);
    animateBars(svg, opts, true);
    const rect = svg.querySelector('rect') as SVGRectElement;
    expect(rect.style.transformOrigin).toBe('left center');
  });

  it('ignores rects that are not data shapes', () => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.appendChild(document.createElementNS(SVG_NS, 'rect')); // no data-shape-index
    document.body.appendChild(svg);
    expect(animateBars(svg, opts)).toHaveLength(0);
  });

  it('does nothing to an empty chart', () => {
    expect(animateBars(svgWith('rect', 0), opts)).toEqual([]);
  });
});

describe('animateLines', () => {
  /**
   * happy-dom's `getTotalLength()` always returns 0, and the animator treats a
   * zero-length path as nothing to draw. Stubbing it is what makes the real
   * drawing path reachable at all here.
   */
  const linesWith = (count: number, length = 100) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    for (let i = 0; i < count; i++) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', 'line-path');
      path.setAttribute('d', 'M 0 0 L 100 100');
      (path as unknown as { getTotalLength: () => number }).getTotalLength = () => length;
      svg.appendChild(path);
    }
    document.body.appendChild(svg);
    return svg;
  };

  it('returns one animation per line', () => {
    expect(animateLines(linesWith(2), opts)).toHaveLength(2);
  });

  it('hides the line before drawing it', () => {
    const svg = linesWith(1, 250);
    animateLines(svg, opts);
    const path = svg.querySelector('path') as SVGPathElement;
    expect(path.style.strokeDasharray).toBe('250');
    expect(path.style.strokeDashoffset).toBe('250');
  });

  // A zero-length path has nothing to draw, and dividing the dash pattern by it
  // would leave the line permanently invisible.
  it('skips a zero-length path', () => {
    expect(animateLines(linesWith(1, 0), opts)).toHaveLength(0);
  });

  it('skips lines that are already animating', () => {
    const svg = linesWith(2);
    animateLines(svg, opts);
    expect(animateLines(svg, opts)).toHaveLength(0);
  });

  it('ignores paths that are not lines', () => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'area-path');
    svg.appendChild(path);
    document.body.appendChild(svg);
    expect(animateLines(svg, opts)).toHaveLength(0);
  });
});

describe('animateAreas', () => {
  const areasWith = (count: number) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    for (let i = 0; i < count; i++) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', 'area-path');
      svg.appendChild(path);
    }
    document.body.appendChild(svg);
    return svg;
  };

  it('returns one animation per area', () => {
    expect(animateAreas(areasWith(3), opts)).toHaveLength(3);
  });

  it('skips areas that are already animating', () => {
    const svg = areasWith(2);
    animateAreas(svg, opts);
    expect(animateAreas(svg, opts)).toHaveLength(0);
  });
});

describe('animatePieSlices', () => {
  it('returns one animation per slice', () => {
    expect(animatePieSlices(svgWith('path', 4), opts)).toHaveLength(4);
  });

  it('skips slices that are already animating', () => {
    const svg = svgWith('path', 4);
    animatePieSlices(svg, opts);
    expect(animatePieSlices(svg, opts)).toHaveLength(0);
  });
});

describe('animatePoints', () => {
  it('returns one animation per point', () => {
    expect(animatePoints(svgWith('circle', 5), opts)).toHaveLength(5);
  });

  it('skips points that are already animating', () => {
    const svg = svgWith('circle', 5);
    animatePoints(svg, opts);
    expect(animatePoints(svg, opts)).toHaveLength(0);
  });
});

describe('animateChartEntry', () => {
  /** A shadow root containing one <svg> with the given children. */
  const rootWith = (build: (svg: SVGSVGElement) => void): ShadowRoot => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    build(svg);
    root.appendChild(svg);
    return root;
  };

  const add = (svg: SVGSVGElement, tag: string, count: number, cls?: string) => {
    for (let i = 0; i < count; i++) {
      const el = document.createElementNS(SVG_NS, tag);
      if (cls) el.setAttribute('class', cls);
      else el.setAttribute('data-shape-index', String(i));
      svg.appendChild(el);
    }
  };

  it('animates the bars it finds', () => {
    const root = rootWith(svg => add(svg, 'rect', 3));
    expect(animateChartEntry(root, 'bar')).toHaveLength(3);
  });

  it('animates points alongside bars in a mixed chart', () => {
    const root = rootWith(svg => {
      add(svg, 'rect', 2);
      add(svg, 'circle', 3);
    });
    expect(animateChartEntry(root, 'mixed')).toHaveLength(5);
  });

  /**
   * Pie, funnel and stage charts draw `<path data-shape-index>` too, and a bar
   * animation on a pie slice would scale it from the wrong origin. The bar
   * branch is deliberately excluded for those types.
   */
  it('uses the slice animation for a pie, not the bar one', () => {
    const root = rootWith(svg => {
      add(svg, 'path', 4);
      add(svg, 'rect', 2); // e.g. a legend swatch, not data
    });
    expect(animateChartEntry(root, 'pie')).toHaveLength(4);
  });

  it('cascades a funnel', () => {
    const root = rootWith(svg => add(svg, 'path', 3));
    expect(animateChartEntry(root, 'funnel')).toHaveLength(3);
  });

  it('cascades a stage chart over every shape, whatever the tag', () => {
    const root = rootWith(svg => {
      add(svg, 'rect', 2);
      add(svg, 'circle', 1);
    });
    expect(animateChartEntry(root, 'stage')).toHaveLength(3);
  });

  it('returns nothing when there is no svg', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    expect(animateChartEntry(host.attachShadow({ mode: 'open' }), 'bar')).toEqual([]);
  });

  it('returns nothing for an svg with no shapes', () => {
    expect(animateChartEntry(rootWith(() => {}), 'bar')).toEqual([]);
  });

  /**
   * happy-dom's `animate()` returns a stub with no `effect`, so the timing
   * cannot be read back off the returned Animation. Spying on the call is the
   * honest check anyway: it asserts what the animator *asks for*, rather than
   * what a stand-in chooses to report.
   */
  it('passes a caller-supplied duration through to animate()', () => {
    const spy = vi.spyOn(Element.prototype, 'animate');
    const root = rootWith(svg => add(svg, 'rect', 1));
    animateChartEntry(root, 'bar', { duration: 1234 });

    expect(spy).toHaveBeenCalledTimes(1);
    const timing = spy.mock.calls[0][1] as KeyframeAnimationOptions;
    expect(timing.duration).toBe(1234);
    expect(timing.easing).toBe(DEFAULT_ANIMATION_OPTIONS.easing);
  });

  it('staggers each element by its index', () => {
    const spy = vi.spyOn(Element.prototype, 'animate');
    const root = rootWith(svg => add(svg, 'rect', 3));
    animateChartEntry(root, 'bar', { stagger: 40 });

    const delays = spy.mock.calls.map(c => (c[1] as KeyframeAnimationOptions).delay);
    expect(delays).toEqual([0, 40, 80]);
  });

  // Animation is decoration. Someone who has asked their operating system to
  // stop moving things should get the chart, not the motion.
  it('animates nothing when reduced motion is preferred', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {}
        }) as unknown as MediaQueryList
    );
    const root = rootWith(svg => add(svg, 'rect', 3));
    expect(animateChartEntry(root, 'bar')).toEqual([]);
  });
});
