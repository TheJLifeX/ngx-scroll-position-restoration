export declare const WINDOW_SELECTOR = "__window-selector__";
export declare type Target = Window | Element;
/**
 * DomUtils
 *
 * I provide a unified interface for dealing with scroll offsets across different types of targets (elements vs. windows).
 */
/**
 * I get the scroll-top of the given target in the active DOM.
 */
export declare function getScrollTop(target: Target): number;
/**
 * I return the CSS selector for the given target.
 * ___
 * NOTE: The generated selector is intended to be consumed by this class only - it may not produce a valid CSS selector.
 */
export declare function getSelector(target: Target): string | null;
/**
 *  I get the scrollable target for the given 'scroll' event.
 * ___
 * NOTE: If you want to ignore (ie, not reinstate the scroll) of a particular type of DOM element, return NULL from this method.
 */
export declare function getTargetFromScrollEvent(event: Event): Target | null;
/**
 * I attempt to scroll the given target to the given scrollTop and return the resultant value presented by the target.
 * @param target
 * @param scrollTop
 * @returns resultant scroll top.
 */
export declare function scrollTo(target: Target, scrollTop: number): number | null;
/**
 * I return the target accessible at the given CSS selector.
 */
export declare function select(selector: string): Target | null;
/**
 * Source:
 * - https://www.bennadel.com/blog/3534-restoring-and-resetting-the-scroll-position-using-the-navigationstart-event-in-angular-7-0-4.htm
 * - http://bennadel.github.io/JavaScript-Demos/demos/router-retain-scroll-polyfill-angular7/
 * - https://github.com/bennadel/JavaScript-Demos/tree/master/demos/router-retain-scroll-polyfill-angular7
 */ 
