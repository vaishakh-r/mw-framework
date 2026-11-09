import type { Screen } from 'mobilewright';
import { currentDevice } from './currentDevice';
import type { Loc } from '../locators/selector';

export interface ScrollOptions {
  /** Height of a fixed header to keep the element below (points). */
  topInset?: number;
  /** Height of a fixed footer / tab bar to keep the element above (points). */
  bottomInset?: number;
  /** Swipe direction while the element is not on screen yet. 'up' scrolls content down. */
  direction?: 'up' | 'down';
  maxSwipes?: number;
  /** Slow swipes avoid fling, so the scroll distance is predictable. */
  duration?: number;
  /** x of the swipe path; move it off a horizontal carousel if needed. */
  startX?: number;
}

export interface ScrollToCenterOptions extends ScrollOptions {
  /** Close enough to the centre, as a fraction of the visible height. */
  tolerance?: number;
}

export interface ScrollToVisibleViewOptions extends ScrollOptions {
  /** Gap to keep between the element and the header / footer edge (points). */
  margin?: number;
}

type Box = { y: number; height: number };
type Area = { top: number; bottom: number; middle: number; span: number };

/**
 * Swipes until `offset` returns 0. `offset` gets the element's box and the visible area and returns how far the
 * element must move up (> 0) or down (< 0) to be where the caller wants it.
 */
async function scrollUntil(
  name: string,
  screen: Screen,
  target: Loc,
  opts: ScrollOptions,
  offset: (box: Box, area: Area) => number,
  extra = 0,
) {
  const { topInset = 0, bottomInset = 0, direction = 'up', maxSwipes = 10, duration = 800 } = opts;
  const size = await currentDevice().screenSize();
  const top = topInset;
  const bottom = size.height - bottomInset;
  const area: Area = { top, bottom, middle: (top + bottom) / 2, span: bottom - top };
  const x = opts.startX ?? size.width / 2;

  for (let i = 0; i <= maxSwipes; i++) {
    const box = await target.boundingBox({ timeout: 0 }).catch(() => null);
    if (!box) {
      // Not in the tree yet: scroll half a screen and look again.
      const startY = area.middle + (direction === 'up' ? area.span / 4 : -area.span / 4);
      if (i < maxSwipes) await screen.swipe(direction, { startX: x, startY, distance: area.span / 2, duration });
      continue;
    }
    const delta = offset(box, area);
    if (delta === 0) return;
    if (i === maxSwipes) break;

    // Swipe path centred on the middle, so it never starts on the header or footer.
    const distance = Math.min(Math.abs(delta) + extra, area.span * 0.6);
    const swipeUp = delta > 0;
    await screen.swipe(swipeUp ? 'up' : 'down', {
      startX: x,
      startY: area.middle + (swipeUp ? distance / 2 : -distance / 2),
      distance,
      duration,
    });
  }
  throw new Error(`${name}: element not in place after ${maxSwipes} swipes`);
}

/** Scroll until `target` sits in the vertical centre of the area between header and footer. */
export async function scrollToCenter(screen: Screen, target: Loc, opts: ScrollToCenterOptions = {}) {
  const { tolerance = 0.1 } = opts;
  await scrollUntil('scrollToCenter', screen, target, opts, (box, { top, bottom, middle, span }) => {
    const delta = box.y + box.height / 2 - middle; // > 0: element is below the centre
    const inside = box.y >= top && box.y + box.height <= bottom;
    return inside && Math.abs(delta) <= span * tolerance ? 0 : delta;
  });
}

/**
 * Scroll as little as needed to bring `target` fully inside the area between header and footer.
 * Does nothing when it already is. An element taller than that area is aligned to its top edge.
 */
export async function scrollToVisibleView(screen: Screen, target: Loc, opts: ScrollToVisibleViewOptions = {}) {
  const { margin = 16 } = opts;
  await scrollUntil(
    'scrollToVisibleView',
    screen,
    target,
    opts,
    (box, { top, bottom }) => {
      // Aim `margin` inside the area, but accept anything inside it, so a swipe that lands a little off
      // does not trigger another one.
      const minY = top + margin;
      const maxY = bottom - margin;
      if (box.height > maxY - minY) {
        // Too tall to fit: show its top edge.
        return Math.abs(box.y - minY) <= margin ? 0 : box.y - minY;
      }
      if (box.y >= top && box.y + box.height <= bottom) return 0;
      if (box.y < top) return box.y - minY; // above or behind the header: move it down
      return box.y + box.height - maxY; // below or behind the footer: move it up
    },
    // Swipe a margin further than the exact gap: absorbs the touch slop, and the element still fits.
    margin,
  );
}
