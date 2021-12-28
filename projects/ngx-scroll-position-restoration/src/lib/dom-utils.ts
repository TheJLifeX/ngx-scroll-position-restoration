
import { finder } from '@medv/finder';

export const WINDOW_SELECTOR = '__window-selector__';

export type Target = Window | Element;

/**
 * DomUtils
 * 
 * I provide a unified interface for dealing with scroll offsets across different types of targets (elements vs. windows).
 */

/**
 * I get the scroll-top of the given target in the active DOM.
 */
export function getScrollTop(target: Target): number {
  if (target instanceof Window) {
    return window.scrollY;
  } else {
    return target.scrollTop;
  }
}

/**
 * I return the CSS selector for the given target.
 * ___
 * NOTE: The generated selector is intended to be consumed by this class only - it may not produce a valid CSS selector.
 */
export function getSelector(target: Target): string | null {

  // NOTE: I am breaking this apart because TypeScript was having trouble dealing
  // with type-guard. I believe this is part of this bug:
  // --
  // https://github.com/Microsoft/TypeScript/issues/7271#issuecomment-360123191
  if (target instanceof Window) {
    return WINDOW_SELECTOR;
  } else {
    // If the given element is not part of the active document, there's no way for us
    // to calculate a selector for it.
    if (!document.body.contains(target)) {
      return null;
    }
    return finder(target);
  }
}

/**
 *  I get the scrollable target for the given 'scroll' event.
 * ___
 * NOTE: If you want to ignore (ie, not reinstate the scroll) of a particular type of DOM element, return NULL from this method.
 */
export function getTargetFromScrollEvent(event: Event): Target | null {
  const node = event.target;
  if (node instanceof HTMLDocument) {
    return window;
  } else if (node instanceof Element) {
    return node;
  }
  return null;
}

/**
 * I attempt to scroll the given target to the given scrollTop and return the resultant value presented by the target.
 * @param target 
 * @param scrollTop 
 * @returns resultant scroll top.
 */
export function scrollTo(target: Target, scrollTop: number): number | null {
  if (target instanceof Window) {
    target.scrollTo(0, scrollTop);
    return target.scrollY;
  } else if (target instanceof Element) {
    target.scrollTop = scrollTop;
    return target.scrollTop;
  }
  return null
}

/**
 * I return the target accessible at the given CSS selector.
 */
export function select(selector: string): Target | null {
  if (selector === WINDOW_SELECTOR) {
    return window;
  } else {
    return document.querySelector(selector);
  }
}


/**
 * Source:
 * - https://www.bennadel.com/blog/3534-restoring-and-resetting-the-scroll-position-using-the-navigationstart-event-in-angular-7-0-4.htm
 * - http://bennadel.github.io/JavaScript-Demos/demos/router-retain-scroll-polyfill-angular7/
 * - https://github.com/bennadel/JavaScript-Demos/tree/master/demos/router-retain-scroll-polyfill-angular7
 */