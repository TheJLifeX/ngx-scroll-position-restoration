import { finder } from '@medv/finder';
export const WINDOW_SELECTOR = '__window-selector__';
/**
 * DomUtils
 *
 * I provide a unified interface for dealing with scroll offsets across different types of targets (elements vs. windows).
 */
/**
 * I get the scroll-top of the given target in the active DOM.
 */
export function getScrollTop(target) {
    if (target instanceof Window) {
        return window.scrollY;
    }
    else {
        return target.scrollTop;
    }
}
/**
 * I return the CSS selector for the given target.
 * ___
 * NOTE: The generated selector is intended to be consumed by this class only - it may not produce a valid CSS selector.
 */
export function getSelector(target) {
    // NOTE: I am breaking this apart because TypeScript was having trouble dealing
    // with type-guard. I believe this is part of this bug:
    // --
    // https://github.com/Microsoft/TypeScript/issues/7271#issuecomment-360123191
    if (target instanceof Window) {
        return WINDOW_SELECTOR;
    }
    else {
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
export function getTargetFromScrollEvent(event) {
    const node = event.target;
    if (node instanceof HTMLDocument) {
        return window;
    }
    else if (node instanceof Element) {
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
export function scrollTo(target, scrollTop) {
    if (target instanceof Window) {
        target.scrollTo(0, scrollTop);
        return target.scrollY;
    }
    else if (target instanceof Element) {
        target.scrollTop = scrollTop;
        return target.scrollTop;
    }
    return null;
}
/**
 * I return the target accessible at the given CSS selector.
 */
export function select(selector) {
    if (selector === WINDOW_SELECTOR) {
        return window;
    }
    else {
        return document.querySelector(selector);
    }
}
/**
 * Source:
 * - https://www.bennadel.com/blog/3534-restoring-and-resetting-the-scroll-position-using-the-navigationstart-event-in-angular-7-0-4.htm
 * - http://bennadel.github.io/JavaScript-Demos/demos/router-retain-scroll-polyfill-angular7/
 * - https://github.com/bennadel/JavaScript-Demos/tree/master/demos/router-retain-scroll-polyfill-angular7
 */ 
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLXV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LXNjcm9sbC1wb3NpdGlvbi1yZXN0b3JhdGlvbi9zcmMvbGliL2RvbS11dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRXRDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxxQkFBcUIsQ0FBQztBQUlyRDs7OztHQUlHO0FBRUg7O0dBRUc7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLE1BQWM7SUFDekMsSUFBSSxNQUFNLFlBQVksTUFBTSxFQUFFO1FBQzVCLE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQztLQUN2QjtTQUFNO1FBQ0wsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDO0tBQ3pCO0FBQ0gsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsV0FBVyxDQUFDLE1BQWM7SUFFeEMsK0VBQStFO0lBQy9FLHVEQUF1RDtJQUN2RCxLQUFLO0lBQ0wsNkVBQTZFO0lBQzdFLElBQUksTUFBTSxZQUFZLE1BQU0sRUFBRTtRQUM1QixPQUFPLGVBQWUsQ0FBQztLQUN4QjtTQUFNO1FBQ0wsaUZBQWlGO1FBQ2pGLGtDQUFrQztRQUNsQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbkMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ3ZCO0FBQ0gsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsS0FBWTtJQUNuRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQzFCLElBQUksSUFBSSxZQUFZLFlBQVksRUFBRTtRQUNoQyxPQUFPLE1BQU0sQ0FBQztLQUNmO1NBQU0sSUFBSSxJQUFJLFlBQVksT0FBTyxFQUFFO1FBQ2xDLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxRQUFRLENBQUMsTUFBYyxFQUFFLFNBQWlCO0lBQ3hELElBQUksTUFBTSxZQUFZLE1BQU0sRUFBRTtRQUM1QixNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM5QixPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUM7S0FDdkI7U0FBTSxJQUFJLE1BQU0sWUFBWSxPQUFPLEVBQUU7UUFDcEMsTUFBTSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDN0IsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDO0tBQ3pCO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDYixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsTUFBTSxDQUFDLFFBQWdCO0lBQ3JDLElBQUksUUFBUSxLQUFLLGVBQWUsRUFBRTtRQUNoQyxPQUFPLE1BQU0sQ0FBQztLQUNmO1NBQU07UUFDTCxPQUFPLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDekM7QUFDSCxDQUFDO0FBR0Q7Ozs7O0dBS0ciLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7IGZpbmRlciB9IGZyb20gJ0BtZWR2L2ZpbmRlcic7XG5cbmV4cG9ydCBjb25zdCBXSU5ET1dfU0VMRUNUT1IgPSAnX193aW5kb3ctc2VsZWN0b3JfXyc7XG5cbmV4cG9ydCB0eXBlIFRhcmdldCA9IFdpbmRvdyB8IEVsZW1lbnQ7XG5cbi8qKlxuICogRG9tVXRpbHNcbiAqIFxuICogSSBwcm92aWRlIGEgdW5pZmllZCBpbnRlcmZhY2UgZm9yIGRlYWxpbmcgd2l0aCBzY3JvbGwgb2Zmc2V0cyBhY3Jvc3MgZGlmZmVyZW50IHR5cGVzIG9mIHRhcmdldHMgKGVsZW1lbnRzIHZzLiB3aW5kb3dzKS5cbiAqL1xuXG4vKipcbiAqIEkgZ2V0IHRoZSBzY3JvbGwtdG9wIG9mIHRoZSBnaXZlbiB0YXJnZXQgaW4gdGhlIGFjdGl2ZSBET00uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTY3JvbGxUb3AodGFyZ2V0OiBUYXJnZXQpOiBudW1iZXIge1xuICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgV2luZG93KSB7XG4gICAgcmV0dXJuIHdpbmRvdy5zY3JvbGxZO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0YXJnZXQuc2Nyb2xsVG9wO1xuICB9XG59XG5cbi8qKlxuICogSSByZXR1cm4gdGhlIENTUyBzZWxlY3RvciBmb3IgdGhlIGdpdmVuIHRhcmdldC5cbiAqIF9fX1xuICogTk9URTogVGhlIGdlbmVyYXRlZCBzZWxlY3RvciBpcyBpbnRlbmRlZCB0byBiZSBjb25zdW1lZCBieSB0aGlzIGNsYXNzIG9ubHkgLSBpdCBtYXkgbm90IHByb2R1Y2UgYSB2YWxpZCBDU1Mgc2VsZWN0b3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTZWxlY3Rvcih0YXJnZXQ6IFRhcmdldCk6IHN0cmluZyB8IG51bGwge1xuXG4gIC8vIE5PVEU6IEkgYW0gYnJlYWtpbmcgdGhpcyBhcGFydCBiZWNhdXNlIFR5cGVTY3JpcHQgd2FzIGhhdmluZyB0cm91YmxlIGRlYWxpbmdcbiAgLy8gd2l0aCB0eXBlLWd1YXJkLiBJIGJlbGlldmUgdGhpcyBpcyBwYXJ0IG9mIHRoaXMgYnVnOlxuICAvLyAtLVxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzcyNzEjaXNzdWVjb21tZW50LTM2MDEyMzE5MVxuICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgV2luZG93KSB7XG4gICAgcmV0dXJuIFdJTkRPV19TRUxFQ1RPUjtcbiAgfSBlbHNlIHtcbiAgICAvLyBJZiB0aGUgZ2l2ZW4gZWxlbWVudCBpcyBub3QgcGFydCBvZiB0aGUgYWN0aXZlIGRvY3VtZW50LCB0aGVyZSdzIG5vIHdheSBmb3IgdXNcbiAgICAvLyB0byBjYWxjdWxhdGUgYSBzZWxlY3RvciBmb3IgaXQuXG4gICAgaWYgKCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHRhcmdldCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZmluZGVyKHRhcmdldCk7XG4gIH1cbn1cblxuLyoqXG4gKiAgSSBnZXQgdGhlIHNjcm9sbGFibGUgdGFyZ2V0IGZvciB0aGUgZ2l2ZW4gJ3Njcm9sbCcgZXZlbnQuXG4gKiBfX19cbiAqIE5PVEU6IElmIHlvdSB3YW50IHRvIGlnbm9yZSAoaWUsIG5vdCByZWluc3RhdGUgdGhlIHNjcm9sbCkgb2YgYSBwYXJ0aWN1bGFyIHR5cGUgb2YgRE9NIGVsZW1lbnQsIHJldHVybiBOVUxMIGZyb20gdGhpcyBtZXRob2QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUYXJnZXRGcm9tU2Nyb2xsRXZlbnQoZXZlbnQ6IEV2ZW50KTogVGFyZ2V0IHwgbnVsbCB7XG4gIGNvbnN0IG5vZGUgPSBldmVudC50YXJnZXQ7XG4gIGlmIChub2RlIGluc3RhbmNlb2YgSFRNTERvY3VtZW50KSB7XG4gICAgcmV0dXJuIHdpbmRvdztcbiAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEkgYXR0ZW1wdCB0byBzY3JvbGwgdGhlIGdpdmVuIHRhcmdldCB0byB0aGUgZ2l2ZW4gc2Nyb2xsVG9wIGFuZCByZXR1cm4gdGhlIHJlc3VsdGFudCB2YWx1ZSBwcmVzZW50ZWQgYnkgdGhlIHRhcmdldC5cbiAqIEBwYXJhbSB0YXJnZXQgXG4gKiBAcGFyYW0gc2Nyb2xsVG9wIFxuICogQHJldHVybnMgcmVzdWx0YW50IHNjcm9sbCB0b3AuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzY3JvbGxUbyh0YXJnZXQ6IFRhcmdldCwgc2Nyb2xsVG9wOiBudW1iZXIpOiBudW1iZXIgfCBudWxsIHtcbiAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIFdpbmRvdykge1xuICAgIHRhcmdldC5zY3JvbGxUbygwLCBzY3JvbGxUb3ApO1xuICAgIHJldHVybiB0YXJnZXQuc2Nyb2xsWTtcbiAgfSBlbHNlIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgdGFyZ2V0LnNjcm9sbFRvcCA9IHNjcm9sbFRvcDtcbiAgICByZXR1cm4gdGFyZ2V0LnNjcm9sbFRvcDtcbiAgfVxuICByZXR1cm4gbnVsbFxufVxuXG4vKipcbiAqIEkgcmV0dXJuIHRoZSB0YXJnZXQgYWNjZXNzaWJsZSBhdCB0aGUgZ2l2ZW4gQ1NTIHNlbGVjdG9yLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2VsZWN0KHNlbGVjdG9yOiBzdHJpbmcpOiBUYXJnZXQgfCBudWxsIHtcbiAgaWYgKHNlbGVjdG9yID09PSBXSU5ET1dfU0VMRUNUT1IpIHtcbiAgICByZXR1cm4gd2luZG93O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxufVxuXG5cbi8qKlxuICogU291cmNlOlxuICogLSBodHRwczovL3d3dy5iZW5uYWRlbC5jb20vYmxvZy8zNTM0LXJlc3RvcmluZy1hbmQtcmVzZXR0aW5nLXRoZS1zY3JvbGwtcG9zaXRpb24tdXNpbmctdGhlLW5hdmlnYXRpb25zdGFydC1ldmVudC1pbi1hbmd1bGFyLTctMC00Lmh0bVxuICogLSBodHRwOi8vYmVubmFkZWwuZ2l0aHViLmlvL0phdmFTY3JpcHQtRGVtb3MvZGVtb3Mvcm91dGVyLXJldGFpbi1zY3JvbGwtcG9seWZpbGwtYW5ndWxhcjcvXG4gKiAtIGh0dHBzOi8vZ2l0aHViLmNvbS9iZW5uYWRlbC9KYXZhU2NyaXB0LURlbW9zL3RyZWUvbWFzdGVyL2RlbW9zL3JvdXRlci1yZXRhaW4tc2Nyb2xsLXBvbHlmaWxsLWFuZ3VsYXI3XG4gKi8iXX0=