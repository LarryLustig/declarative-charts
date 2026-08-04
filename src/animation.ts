/**
 * Animation utilities for declarative charts.
 *
 * This module is isolated from chart internals - it only operates on
 * rendered SVG elements via DOM queries. All animation logic lives here,
 * keeping the core chart rendering pure and stateless.
 *
 * Uses the Web Animations API (WAAPI) for performance and control.
 */

/**
 * Animation configuration options.
 */
export interface AnimationOptions {
  /** Duration in milliseconds */
  duration: number;
  /** CSS easing function */
  easing: string;
  /** Delay between sequential element animations in ms */
  stagger: number;
}

/**
 * Default animation settings.
 */
export const DEFAULT_ANIMATION_OPTIONS: AnimationOptions = {
  duration: 300,
  easing: 'ease-out',
  stagger: 30,
};

/**
 * Chart types for animation dispatch.
 */
export type AnimatableChartType = 'bar' | 'line' | 'area' | 'pie' | 'funnel' | 'stage' | 'mixed';

/**
 * Check if user prefers reduced motion.
 * Returns true if the user has enabled reduced motion in their OS settings.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check whether the Web Animations API is available.
 *
 * Absent in non-browser DOM implementations (jsdom, happy-dom) and in older
 * browsers. Charts must still render there, so every animation entry point
 * degrades to a no-op rather than throwing.
 */
export function supportsWebAnimations(): boolean {
  return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
}

/**
 * Parse the animate attribute value.
 *
 * @param value - The attribute value
 * @returns Duration in ms, or null if animation is disabled
 *
 * @example
 * parseAnimateAttribute(null)      // null (no attribute)
 * parseAnimateAttribute('false')   // null (explicitly disabled)
 * parseAnimateAttribute('')        // 300 (default)
 * parseAnimateAttribute('true')    // 300 (default)
 * parseAnimateAttribute('500ms')   // 500
 * parseAnimateAttribute('0.5s')    // 500
 * parseAnimateAttribute('500')     // 500 (assumes ms)
 */
export function parseAnimateAttribute(value: string | null): number | null {
  if (value === null || value === 'false') return null;
  if (value === '' || value === 'true') return DEFAULT_ANIMATION_OPTIONS.duration;

  // Parse duration string: "500ms", "0.5s", or just "500"
  const match = value.match(/^(\d+(?:\.\d+)?)(ms|s)?$/);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2] || 'ms';
    return unit === 's' ? num * 1000 : num;
  }

  return DEFAULT_ANIMATION_OPTIONS.duration;
}

/**
 * Animate bars growing from their baseline.
 * Vertical bars grow upward, horizontal bars grow rightward.
 */
export function animateBars(
  container: Element,
  options: AnimationOptions,
  horizontal: boolean = false
): Animation[] {
  if (!supportsWebAnimations()) return [];
  const bars = container.querySelectorAll('rect[data-shape-index]');
  const animations: Animation[] = [];

  bars.forEach((bar, index) => {
    const rect = bar as SVGRectElement;

    // Skip if already animated or hidden
    if (rect.hasAttribute('data-animated')) return;
    rect.setAttribute('data-animated', 'true');

    // Set transform origin based on orientation
    // For vertical bars: grow from bottom
    // For horizontal bars: grow from left
    if (horizontal) {
      rect.style.transformOrigin = 'left center';
    } else {
      rect.style.transformOrigin = 'center bottom';
    }
    rect.style.transformBox = 'fill-box';

    const anim = rect.animate(
      [
        { transform: horizontal ? 'scaleX(0)' : 'scaleY(0)' },
        { transform: 'scale(1)' }
      ],
      {
        duration: options.duration,
        easing: options.easing,
        delay: index * options.stagger,
        fill: 'backwards'
      }
    );

    anim.onfinish = () => {
      rect.removeAttribute('data-animated');
    };

    animations.push(anim);
  });

  return animations;
}

/**
 * Animate lines drawing along their path.
 * Uses the stroke-dasharray/dashoffset technique for a "drawing" effect.
 */
export function animateLines(
  container: Element,
  options: AnimationOptions
): Animation[] {
  if (!supportsWebAnimations()) return [];
  const paths = container.querySelectorAll('path.line-path');
  const animations: Animation[] = [];

  paths.forEach((path, index) => {
    const pathEl = path as SVGPathElement;

    // Skip if already animated
    if (pathEl.hasAttribute('data-animated')) return;
    pathEl.setAttribute('data-animated', 'true');

    // Get the total length of the path
    const length = pathEl.getTotalLength();
    if (length === 0) return;

    // Set up the dash array to hide the entire line initially
    pathEl.style.strokeDasharray = `${length}`;
    pathEl.style.strokeDashoffset = `${length}`;

    const anim = pathEl.animate(
      [
        { strokeDashoffset: length },
        { strokeDashoffset: 0 }
      ],
      {
        duration: options.duration * 1.5, // Lines take a bit longer to draw
        easing: options.easing,
        delay: index * options.stagger,
        fill: 'forwards'
      }
    );

    // Clean up dash styles after animation completes
    anim.onfinish = () => {
      pathEl.style.strokeDasharray = '';
      pathEl.style.strokeDashoffset = '';
      pathEl.removeAttribute('data-animated');
    };

    animations.push(anim);
  });

  return animations;
}

/**
 * Animate area fills fading in with a subtle vertical grow.
 */
export function animateAreas(
  container: Element,
  options: AnimationOptions
): Animation[] {
  if (!supportsWebAnimations()) return [];
  const areas = container.querySelectorAll('path.area-path');
  const animations: Animation[] = [];

  areas.forEach((area, index) => {
    const pathEl = area as SVGPathElement;

    if (pathEl.hasAttribute('data-animated')) return;
    pathEl.setAttribute('data-animated', 'true');

    // Set transform origin at bottom for grow effect
    pathEl.style.transformOrigin = 'center bottom';
    pathEl.style.transformBox = 'fill-box';

    const anim = pathEl.animate(
      [
        { opacity: 0, transform: 'scaleY(0.85)' },
        { opacity: 1, transform: 'scaleY(1)' }
      ],
      {
        duration: options.duration,
        easing: options.easing,
        delay: index * options.stagger,
        fill: 'backwards'
      }
    );

    anim.onfinish = () => {
      pathEl.removeAttribute('data-animated');
    };

    animations.push(anim);
  });

  return animations;
}

/**
 * Animate pie slices appearing with a sequential fade-in effect.
 * We use opacity only (no scale) to avoid distorting donut holes.
 */
export function animatePieSlices(
  container: Element,
  options: AnimationOptions
): Animation[] {
  if (!supportsWebAnimations()) return [];
  const slices = container.querySelectorAll('path[data-shape-index]');
  const animations: Animation[] = [];

  slices.forEach((slice, index) => {
    const pathEl = slice as SVGPathElement;

    if (pathEl.hasAttribute('data-animated')) return;
    pathEl.setAttribute('data-animated', 'true');

    // Fade in only - scale would distort donut holes since each slice
    // scales from its own center, not the pie's center
    const anim = pathEl.animate(
      [
        { opacity: 0 },
        { opacity: 1 }
      ],
      {
        duration: options.duration,
        easing: options.easing,
        delay: index * options.stagger * 2,
        fill: 'backwards'
      }
    );

    anim.onfinish = () => {
      pathEl.removeAttribute('data-animated');
    };

    animations.push(anim);
  });

  return animations;
}

/**
 * Animate points and bubbles scaling up from zero.
 */
export function animatePoints(
  container: Element,
  options: AnimationOptions
): Animation[] {
  if (!supportsWebAnimations()) return [];
  const points = container.querySelectorAll('circle[data-shape-index]');
  const animations: Animation[] = [];

  points.forEach((point, index) => {
    const circle = point as SVGCircleElement;

    if (circle.hasAttribute('data-animated')) return;
    circle.setAttribute('data-animated', 'true');

    const anim = circle.animate(
      [
        { transform: 'scale(0)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 }
      ],
      {
        duration: options.duration * 0.6,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Slight overshoot
        delay: index * options.stagger,
        fill: 'backwards'
      }
    );

    anim.onfinish = () => {
      circle.removeAttribute('data-animated');
    };

    animations.push(anim);
  });

  return animations;
}

/**
 * Animate elements in a cascading sequence (for funnel and stage charts).
 */
export function animateCascade(
  container: Element,
  selector: string,
  options: AnimationOptions
): Animation[] {
  if (!supportsWebAnimations()) return [];
  const elements = container.querySelectorAll(selector);
  const animations: Animation[] = [];

  elements.forEach((el, index) => {
    if (el.hasAttribute('data-animated')) return;
    el.setAttribute('data-animated', 'true');

    const anim = el.animate(
      [
        { opacity: 0, transform: 'translateX(-15px)' },
        { opacity: 1, transform: 'translateX(0)' }
      ],
      {
        duration: options.duration,
        easing: options.easing,
        delay: index * options.stagger * 2.5,
        fill: 'backwards'
      }
    );

    anim.onfinish = () => {
      el.removeAttribute('data-animated');
    };

    animations.push(anim);
  });

  return animations;
}

/**
 * Main entry point: trigger entry animations for all chart elements.
 *
 * This function detects what types of elements are present in the chart
 * and applies the appropriate animations. It respects the user's
 * reduced motion preference.
 *
 * @param shadowRoot - The chart's shadow root containing the SVG
 * @param chartType - The type of chart for type-specific animations
 * @param options - Animation configuration (partial, merged with defaults)
 * @param horizontal - Whether the chart is in horizontal orientation
 * @returns Array of Animation objects that can be used to track/cancel animations
 */
export function animateChartEntry(
  shadowRoot: ShadowRoot,
  chartType: AnimatableChartType,
  options: Partial<AnimationOptions> = {},
  horizontal: boolean = false
): Animation[] {
  // Respect user's reduced motion preference
  if (prefersReducedMotion()) {
    return [];
  }

  const opts: AnimationOptions = { ...DEFAULT_ANIMATION_OPTIONS, ...options };
  const svg = shadowRoot.querySelector('svg');
  if (!svg) return [];

  const allAnimations: Animation[] = [];

  // Detect what elements are present and animate them
  const hasBars = svg.querySelectorAll('rect[data-shape-index]').length > 0;
  const hasLines = svg.querySelectorAll('path.line-path').length > 0;
  const hasAreas = svg.querySelectorAll('path.area-path').length > 0;
  const hasPoints = svg.querySelectorAll('circle[data-shape-index]').length > 0;

  // Chart-type specific detection
  const isPie = chartType === 'pie';
  const isFunnel = chartType === 'funnel';
  const isStage = chartType === 'stage';

  // Apply animations in visual order (back to front)
  // Areas first (background), then bars, then lines, then points (foreground)

  if (hasAreas) {
    allAnimations.push(...animateAreas(svg, opts));
  }

  if (hasBars && !isPie && !isFunnel && !isStage) {
    allAnimations.push(...animateBars(svg, opts, horizontal));
  }

  if (hasLines) {
    allAnimations.push(...animateLines(svg, opts));
  }

  if (hasPoints) {
    allAnimations.push(...animatePoints(svg, opts));
  }

  // Special chart types
  if (isPie) {
    allAnimations.push(...animatePieSlices(svg, opts));
  }

  if (isFunnel) {
    allAnimations.push(...animateCascade(svg, 'path[data-shape-index]', opts));
  }

  if (isStage) {
    allAnimations.push(...animateCascade(svg, '[data-shape-index]', opts));
  }

  return allAnimations;
}

/**
 * Cancel all running animations on a chart.
 * Useful when data changes before animations complete.
 */
export function cancelAnimations(animations: Animation[]): void {
  for (const anim of animations) {
    // Cancel animations that haven't finished
    if (anim.playState !== 'finished' && anim.playState !== 'idle') {
      anim.cancel();
    }
  }
}
