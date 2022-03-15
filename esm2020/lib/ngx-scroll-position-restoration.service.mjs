import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NavigationStart, NavigationEnd } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import * as DomUtils from './dom-utils';
import { NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN } from './ngx-scroll-position-restoration-config-injection-token';
import * as i0 from "@angular/core";
import * as i1 from "@angular/router";
export class NgxScrollPositionRestorationService {
    constructor(router, zone, platformId, config) {
        this.router = router;
        this.zone = zone;
        this.platformId = platformId;
        this.config = config;
        this.applyStateToDomTimer = 0;
        this.currentPageState = {};
        this.lastNavigationStartAt = 0;
        this.navigationIDs = [];
        this.pageStates = {};
        this.scrolledElements = new Set();
        this.maximumNumberOfCachedPageStates = 20;
        this.serviceDestroyed$ = new Subject();
    }
    /**
     * Initialize NgxScrollPositionRestorationService.
     */
    initialize() {
        if (isPlatformServer(this.platformId)) {
            return;
        }
        this.setupScrollBinding();
        // this.setupRouterBinding();
        // I bind to the router events and perform to primary actions:
        // --
        // NAVIGATION START: When the user is about to navigate away from the current view,
        // I inspect the current DOM state and commit any scrolled-element offsets to the
        // in-memory cache of the page state (scroll events were recorded during the lifetime
        // of the current router state).
        // --
        // NAVIGATION END: When the user completes a navigation to a new view, I check to see
        // if the new view is really the restoration of a previously cached page state; and,
        // if so, I try to reinstate the old scrolled-element offsets in the rendered DOM.
        this.router.events.pipe(takeUntil(this.serviceDestroyed$)).subscribe((event) => {
            // Filter navigation event streams to the appropriate event handlers.
            if (event instanceof NavigationStart) {
                this.handleNavigationStart(event);
            }
            else if (event instanceof NavigationEnd) {
                this.handleNavigationEnd();
            }
        });
        // Since we're going to be implementing a custom scroll retention algorithm,
        // let's disable the one that is provided by the browser. This will keep our
        // polyfill the source of truth.
        this.disableBrowserDefaultScrollRestoration();
    }
    ngOnDestroy() {
        this.serviceDestroyed$.next();
        this.serviceDestroyed$.complete();
    }
    clearSavedWindowScrollTopInLastNavigation() {
        const lastNavigationId = this.navigationIDs[this.navigationIDs.length - 1];
        if (lastNavigationId) {
            if (this.config.debug && this.pageStates[lastNavigationId][DomUtils.WINDOW_SELECTOR]) {
                console.log('Navigation in a "secondary" router-outlet - Remove window scroll position from recorded scroll positions.');
            }
            delete (this.pageStates[lastNavigationId][DomUtils.WINDOW_SELECTOR]);
        }
    }
    /**
     * I attempt to apply the given page-state to the rendered DOM. I will continue to poll the document until all states have been reinstated; or, until the poll duration has been exceeded; or, until a subsequent navigation takes place.
     */
    applyPageStateToDom(pageState) {
        if (this.config.debug) {
            this.debugPageState(pageState, 'Attempting to reapply scroll positions after a popstate navigation (backward or forward).');
        }
        if (this.objectIsEmpty(pageState)) {
            return;
        }
        // Let's create a copy of the page state so that we can safely delete keys from
        // it as we successfully apply them to the rendered DOM.
        const pendingPageState = { ...pageState };
        // Setup the scroll retention timer outside of the Angular Zone so that it
        // doesn't trigger any additional change-detection digests.
        this.zone.runOutsideAngular(() => {
            const startedAt = Date.now();
            this.applyStateToDomTimer = setInterval(() => {
                for (const selector in pendingPageState) {
                    const target = DomUtils.select(selector);
                    // If the target element doesn't exist in the DOM yet, it
                    // could be an indication of asynchronous loading and
                    // rendering. Move onto the next selector while we still
                    // have time.
                    if (!target) {
                        continue;
                    }
                    // If the element in question has been scrolled (by the user)
                    // while we're attempting to reinstate the previous scroll
                    // offsets, then ignore this state - the user's action should
                    // take precedence.
                    if (this.scrolledElements.has(target)) {
                        delete (pendingPageState[selector]);
                        // Otherwise, let's try to restore the scroll for the target.
                    }
                    else {
                        const scrollTop = pendingPageState[selector];
                        const resultantScrollTop = DomUtils.scrollTo(target, scrollTop);
                        // If the attempt to restore the element to its previous
                        // offset resulted in a match, then stop tracking this
                        // element. Otherwise, we'll continue to try and scroll
                        // it in the subsequent tick.
                        // --
                        // NOTE: We continue to try and update it because the
                        // target element may exist in the DOM but also be
                        // loading asynchronous data that is required for the
                        // previous scroll offset.
                        if (resultantScrollTop === scrollTop) {
                            delete (pendingPageState[selector]);
                        }
                    }
                }
                // If there are no more elements to scroll or, we've exceeded our
                // poll duration, then stop watching the DOM.
                if (this.objectIsEmpty(pendingPageState)
                    || ((Date.now() - startedAt) >= this.config.pollDuration)) {
                    clearTimeout(this.applyStateToDomTimer);
                    if (this.config.debug) {
                        if (this.objectIsEmpty(pendingPageState)) {
                            console.log('%c Successfully reapplied all recorded scroll positions to the DOM.', 'color: #2ecc71');
                        }
                        else {
                            console.warn(`Could not reapply following recorded scroll positions to the DOM after a poll duration of: ${this.config.pollDuration} milliseconds:`);
                            this.debugPageState(pendingPageState);
                        }
                    }
                }
            }, this.config.pollCadence);
        });
    }
    /**
     * I get the page state from the given set of nodes. This extracts the CSS selectors and offsets from the recorded elements.
     */
    getPageStateFromNodes(nodes) {
        const pageState = {};
        nodes.forEach(target => {
            // Generate a CSS selector from the given target.
            // --
            // TODO: Right now, this algorithm creates the selector by walking up the
            // DOM tree and using the simulated encapsulation attributes. But, it
            // would be cool to have a configuration option that tells this algorithm
            // to look for a specific id-prefix or attribute or something. This would
            // require the developer to provide those; but it would be optimal.
            const selector = DomUtils.getSelector(target);
            // If the given Target is no longer part of the active DOM, the selector
            // will be null.
            if (selector) {
                pageState[selector] = DomUtils.getScrollTop(target);
            }
        });
        return pageState;
    }
    /**
     * I determine if the given object is empty (ie, has no keys).
     */
    objectIsEmpty(object) {
        for (const key in object) {
            return false;
        }
        return true;
    }
    // The goal of the NavigationStart event is to take changes that have been made
    // to the current DOM and store them in the render-state tree so they can be
    // reinstated at a future date.
    handleNavigationStart(event) {
        this.lastNavigationStartAt = Date.now();
        // Get the navigation ID and the restored navigation ID for use in the
        // NavigationEnd event handler.
        this.navigationID = event.id;
        /**
         * Maybe in future update @todo: use ngx-navigation-trigger here, like:
         * (event.restoredState && this.whenShouldScrollPositionBeRestored.has(this.navigationTrigger))
         */
        this.restoredNavigationID = event.restoredState ? event.restoredState.navigationId : null;
        // If the user is navigating away from the current view, kill any timers that
        // may be trying to reinstate a page-state.
        clearTimeout(this.applyStateToDomTimer);
        // Before we navigate away from the current page state, let's commit any
        // scroll-elements to the current page state.
        Object.assign(this.currentPageState, this.getPageStateFromNodes(this.scrolledElements));
        this.scrolledElements.clear();
        if (this.config.debug) {
            this.debugPageState(this.currentPageState, 'Recorded scroll positions.');
        }
    }
    ;
    // The primary goal of the NavigationEnd event is to reinstate a cached page
    // state in the event that the navigation is restoring a previously rendered page
    // as the result of a popstate event (ex, the user hit the Back or Forward
    // buttons).
    handleNavigationEnd() {
        const previousPageState = this.currentPageState;
        // Now that we know the navigation was successful, let's start and store a
        // new page state to track future scrolling.
        this.currentPageState = this.pageStates[this.navigationID] = {};
        // While we are going to track elements that will be scrolled during the
        // current page rendering, it is possible that there are elements that were
        // scrolled during a prior page rendering that still exist on the page, but
        // were not scrolled recently (such as a secondary router-outlet). As such,
        // let's look at the previous page state and 'pull forward' any state that
        // still pertains to the current page.
        if (!this.restoredNavigationID) {
            for (const selector in previousPageState) {
                const target = DomUtils.select(selector);
                // Only pull the selector forward if it corresponds to an element
                // that still exists in the rendered page.
                if (!target) {
                    continue;
                }
                // Only pull the selector forward if the target is still at the same
                // offset after the navigation has taken place. In other words, if
                // the offset has somehow changed in between the NavigationStart and
                // NavigationEnd events, then ignore it. To be honest, this really
                // only applies to the WINDOW, which can change in offset due to the
                // change in what the Router is actively rendering in the DOM.
                if (DomUtils.getScrollTop(target) !== previousPageState[selector]) {
                    continue;
                }
                this.currentPageState[selector] = previousPageState[selector];
                if (this.config.debug) {
                    console.group('Pulling scroll position from previous page state in current page state.');
                    console.log({
                        selector,
                        scrollPosition: this.currentPageState[selector]
                    });
                    console.groupEnd();
                }
            }
            // If we're restoring a previous page state AND we have that previous page
            // state cached in-memory, let's copy the previous state and then restore the
            // offsets in the DOM.
        }
        else if (this.restoredNavigationID && this.pageStates[this.restoredNavigationID]) {
            // NOTE: We're copying the offsets from the restored state into the
            // current state instead of just swapping the references because these
            // navigations are different in the Router history. Since each navigation
            // - imperative or popstate - gets a unique ID, we never truly 'go back'
            // in history; the Router only 'goes forward', with the notion that we're
            // recreating a previous state sometimes.
            this.applyPageStateToDom(Object.assign(this.currentPageState, this.pageStates[this.restoredNavigationID]));
        }
        // Keep track of the navigation event so we can limit the size of our
        // in-memory page state cache.
        this.navigationIDs.push(this.navigationID);
        // Trim the oldest page states as we go so that the in-memory cache doesn't
        // grow, unbounded.
        while (this.navigationIDs.length > this.maximumNumberOfCachedPageStates) {
            delete (this.pageStates[this.navigationIDs.shift()]);
        }
    }
    ;
    /**
     * I bind to the scroll event and keep track of any elements that are scrolled in the rendered document.
     */
    setupScrollBinding() {
        /**
         * Maybe @todo: You should try to find a way to get scrollable (scrolled) elements only during NavigationStart.
         * Advantages:
         * - Better performance: no need to listen to the scroll event the whole time.
         * - Some elements might be added to the `scrolledElements` are not part of the DOM any more.
         * Disavantages:
         * - during NavigationStart scrollable elements that are maybe present after the intialization of page (before any user-interactions that can remove them) might be not part DOM any more.
         *
         */
        // Add scroll-binding outside of the Angular Zone so it doesn't trigger any
        // additional change-detection digests.
        this.zone.runOutsideAngular(() => {
            // When navigating, the browser emits some scroll events as the DOM 
            // (Document Object Model) changes shape in a way that forces the various
            // scroll offsets to change. Since these scroll events are not indicative
            // of a user's actual scrolling intent, we're going to ignore them. This
            // needs to be done on both sides of the navigation event (for reasons
            // that are not fully obvious or logical -- basically, the window's
            // scroll changes at a time that is not easy to tap into). Ignoring these
            // scroll events is important because the polyfilly stops trying to
            // reinstate a scroll-offset if it sees that the given element has
            // already been scrolled during the current rendering.
            const scrollBufferWindow = 100;
            let target;
            window.addEventListener('scroll', event => {
                // If the scroll event happens immediately following a
                // navigation event, then ignore it - it is likely a scroll that
                // was forced by the browser's native behavior.
                if ((Date.now() - this.lastNavigationStartAt) < scrollBufferWindow) {
                    return;
                }
                // The target will return NULL for elements that have irrelevant
                // scroll behaviors (like textarea inputs). As such, we have to
                // check to see if the domUtils returned anything.
                target = DomUtils.getTargetFromScrollEvent(event);
                if (target) {
                    this.scrolledElements.add(target);
                }
            }, 
            // We have to use the CAPTURING phase. Scroll events DO NOT BUBBLE.
            // As such, if we want to listen for all scroll events in the 
            // document, we have to use the capturing phase (as the event travels
            // down through the DOM tree).
            true);
        });
    }
    debugPageState(pageState, message) {
        if (this.objectIsEmpty(pageState)) {
            return;
        }
        console.group(message || '');
        for (const [selector, scrollPosition] of Object.entries(pageState)) {
            console.log({
                selector,
                scrollPosition
            });
        }
        console.groupEnd();
    }
    /**
     * Disable browser default scroll restoration.
     *
     * Documentation:
     * - https://developer.mozilla.org/en-US/docs/Web/API/History/scrollRestoration
     */
    disableBrowserDefaultScrollRestoration() {
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
    }
}
NgxScrollPositionRestorationService.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: NgxScrollPositionRestorationService, deps: [{ token: i1.Router }, { token: i0.NgZone }, { token: PLATFORM_ID }, { token: NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN }], target: i0.ɵɵFactoryTarget.Injectable });
NgxScrollPositionRestorationService.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: NgxScrollPositionRestorationService });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: NgxScrollPositionRestorationService, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i1.Router }, { type: i0.NgZone }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN]
                }] }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmd4LXNjcm9sbC1wb3NpdGlvbi1yZXN0b3JhdGlvbi5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LXNjcm9sbC1wb3NpdGlvbi1yZXN0b3JhdGlvbi9zcmMvbGliL25neC1zY3JvbGwtcG9zaXRpb24tcmVzdG9yYXRpb24uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBcUIsV0FBVyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQTBDLGFBQWEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQzFDLE9BQU8sS0FBSyxRQUFRLE1BQU0sYUFBYSxDQUFDO0FBRXhDLE9BQU8sRUFBRSxzREFBc0QsRUFBRSxNQUFNLDBEQUEwRCxDQUFDOzs7QUFHbEksTUFBTSxPQUFPLG1DQUFtQztJQWlCOUMsWUFDVSxNQUFjLEVBQ2QsSUFBWSxFQUNTLFVBQWtCLEVBQ3lCLE1BQTBDO1FBSDFHLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1MsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUN5QixXQUFNLEdBQU4sTUFBTSxDQUFvQztRQW5CNUcseUJBQW9CLEdBQVcsQ0FBQyxDQUFDO1FBQ2pDLHFCQUFnQixHQUFjLEVBQUUsQ0FBQztRQUNqQywwQkFBcUIsR0FBVyxDQUFDLENBQUM7UUFDbEMsa0JBQWEsR0FBYSxFQUFFLENBQUM7UUFDN0IsZUFBVSxHQUFlLEVBQUUsQ0FBQztRQUM1QixxQkFBZ0IsR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQU0xQyxvQ0FBK0IsR0FBVyxFQUFFLENBQUM7UUFFN0Msc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztJQU81QyxDQUFDO0lBRUw7O09BRUc7SUFDSCxVQUFVO1FBQ1IsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDckMsT0FBTztTQUNSO1FBRUQsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFFMUIsNkJBQTZCO1FBQzdCLDhEQUE4RDtRQUM5RCxLQUFLO1FBQ0wsbUZBQW1GO1FBQ25GLGlGQUFpRjtRQUNqRixxRkFBcUY7UUFDckYsZ0NBQWdDO1FBQ2hDLEtBQUs7UUFDTCxxRkFBcUY7UUFDckYsb0ZBQW9GO1FBQ3BGLGtGQUFrRjtRQUNsRixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ3JCLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FDbEMsQ0FBQyxTQUFTLENBQ1QsQ0FBQyxLQUE0QixFQUFFLEVBQUU7WUFDL0IscUVBQXFFO1lBQ3JFLElBQUksS0FBSyxZQUFZLGVBQWUsRUFBRTtnQkFDcEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ25DO2lCQUFNLElBQUksS0FBSyxZQUFZLGFBQWEsRUFBRTtnQkFDekMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7YUFDNUI7UUFDSCxDQUFDLENBQ0YsQ0FBQztRQUVGLDRFQUE0RTtRQUM1RSw0RUFBNEU7UUFDNUUsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxDQUFDO0lBQ2hELENBQUM7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0lBRUQseUNBQXlDO1FBQ3ZDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzRSxJQUFJLGdCQUFnQixFQUFFO1lBQ3BCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFDcEYsT0FBTyxDQUFDLEdBQUcsQ0FBQywyR0FBMkcsQ0FBQyxDQUFDO2FBQzFIO1lBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztTQUN0RTtJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLG1CQUFtQixDQUFDLFNBQW9CO1FBQzlDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7WUFDckIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsMkZBQTJGLENBQUMsQ0FBQztTQUM3SDtRQUVELElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNqQyxPQUFPO1NBQ1I7UUFFRCwrRUFBK0U7UUFDL0Usd0RBQXdEO1FBQ3hELE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxHQUFHLFNBQVMsRUFBRSxDQUFDO1FBRTFDLDBFQUEwRTtRQUMxRSwyREFBMkQ7UUFDM0QsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FDekIsR0FBUyxFQUFFO1lBQ1QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBRTdCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxXQUFXLENBQ3JDLEdBQUcsRUFBRTtnQkFDSCxLQUFLLE1BQU0sUUFBUSxJQUFJLGdCQUFnQixFQUFFO29CQUN2QyxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUV6Qyx5REFBeUQ7b0JBQ3pELHFEQUFxRDtvQkFDckQsd0RBQXdEO29CQUN4RCxhQUFhO29CQUNiLElBQUksQ0FBQyxNQUFNLEVBQUU7d0JBQ1gsU0FBUztxQkFDVjtvQkFFRCw2REFBNkQ7b0JBQzdELDBEQUEwRDtvQkFDMUQsNkRBQTZEO29CQUM3RCxtQkFBbUI7b0JBQ25CLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTt3QkFDckMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7d0JBQ3BDLDZEQUE2RDtxQkFDOUQ7eUJBQU07d0JBQ0wsTUFBTSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQzdDLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7d0JBRWhFLHdEQUF3RDt3QkFDeEQsc0RBQXNEO3dCQUN0RCx1REFBdUQ7d0JBQ3ZELDZCQUE2Qjt3QkFDN0IsS0FBSzt3QkFDTCxxREFBcUQ7d0JBQ3JELGtEQUFrRDt3QkFDbEQscURBQXFEO3dCQUNyRCwwQkFBMEI7d0JBQzFCLElBQUksa0JBQWtCLEtBQUssU0FBUyxFQUFFOzRCQUNwQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQzt5QkFDckM7cUJBQ0Y7aUJBQ0Y7Z0JBRUQsaUVBQWlFO2dCQUNqRSw2Q0FBNkM7Z0JBQzdDLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQzt1QkFDbkMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQWEsQ0FBQyxFQUMxRDtvQkFDQSxZQUFZLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7b0JBQ3hDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7d0JBQ3JCLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFOzRCQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLHFFQUFxRSxFQUFFLGdCQUFnQixDQUFDLENBQUM7eUJBQ3RHOzZCQUFNOzRCQUNMLE9BQU8sQ0FBQyxJQUFJLENBQUMsOEZBQThGLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxnQkFBZ0IsQ0FBQyxDQUFDOzRCQUNySixJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUM7eUJBQ3ZDO3FCQUNGO2lCQUNGO1lBQ0gsQ0FBQyxFQUNELElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUN4QixDQUFDO1FBQ0osQ0FBQyxDQUNGLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSyxxQkFBcUIsQ0FBQyxLQUFrQjtRQUM5QyxNQUFNLFNBQVMsR0FBYyxFQUFFLENBQUM7UUFFaEMsS0FBSyxDQUFDLE9BQU8sQ0FDWCxNQUFNLENBQUMsRUFBRTtZQUNQLGlEQUFpRDtZQUNqRCxLQUFLO1lBQ0wseUVBQXlFO1lBQ3pFLHFFQUFxRTtZQUNyRSx5RUFBeUU7WUFDekUseUVBQXlFO1lBQ3pFLG1FQUFtRTtZQUNuRSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTlDLHdFQUF3RTtZQUN4RSxnQkFBZ0I7WUFDaEIsSUFBSSxRQUFRLEVBQUU7Z0JBQ1osU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDckQ7UUFDSCxDQUFDLENBQ0YsQ0FBQztRQUNGLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFRDs7T0FFRztJQUNLLGFBQWEsQ0FBQyxNQUFjO1FBQ2xDLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFO1lBQ3hCLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCwrRUFBK0U7SUFDL0UsNEVBQTRFO0lBQzVFLCtCQUErQjtJQUN2QixxQkFBcUIsQ0FBQyxLQUFzQjtRQUNsRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRXhDLHNFQUFzRTtRQUN0RSwrQkFBK0I7UUFDL0IsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzdCOzs7V0FHRztRQUNILElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRTFGLDZFQUE2RTtRQUM3RSwyQ0FBMkM7UUFDM0MsWUFBWSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRXhDLHdFQUF3RTtRQUN4RSw2Q0FBNkM7UUFDN0MsTUFBTSxDQUFDLE1BQU0sQ0FDWCxJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FDbEQsQ0FBQztRQUVGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUU5QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLDRCQUE0QixDQUFDLENBQUM7U0FDMUU7SUFDSCxDQUFDO0lBQUEsQ0FBQztJQUVGLDRFQUE0RTtJQUM1RSxpRkFBaUY7SUFDakYsMEVBQTBFO0lBQzFFLFlBQVk7SUFDSixtQkFBbUI7UUFFekIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7UUFFaEQsMEVBQTBFO1FBQzFFLDRDQUE0QztRQUM1QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRWhFLHdFQUF3RTtRQUN4RSwyRUFBMkU7UUFDM0UsMkVBQTJFO1FBQzNFLDJFQUEyRTtRQUMzRSwwRUFBMEU7UUFDMUUsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7WUFDOUIsS0FBSyxNQUFNLFFBQVEsSUFBSSxpQkFBaUIsRUFBRTtnQkFDeEMsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFFekMsaUVBQWlFO2dCQUNqRSwwQ0FBMEM7Z0JBQzFDLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ1gsU0FBUztpQkFDVjtnQkFFRCxvRUFBb0U7Z0JBQ3BFLGtFQUFrRTtnQkFDbEUsb0VBQW9FO2dCQUNwRSxrRUFBa0U7Z0JBQ2xFLG9FQUFvRTtnQkFDcEUsOERBQThEO2dCQUM5RCxJQUFJLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEtBQUssaUJBQWlCLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ2pFLFNBQVM7aUJBQ1Y7Z0JBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxHQUFHLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUU5RCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO29CQUNyQixPQUFPLENBQUMsS0FBSyxDQUFDLHlFQUF5RSxDQUFDLENBQUM7b0JBQ3pGLE9BQU8sQ0FBQyxHQUFHLENBQUM7d0JBQ1YsUUFBUTt3QkFDUixjQUFjLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQztxQkFDaEQsQ0FBQyxDQUFDO29CQUNILE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztpQkFDcEI7YUFDRjtZQUVELDBFQUEwRTtZQUMxRSw2RUFBNkU7WUFDN0Usc0JBQXNCO1NBQ3ZCO2FBQU0sSUFBSSxJQUFJLENBQUMsb0JBQW9CLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsRUFBRTtZQUVsRixtRUFBbUU7WUFDbkUsc0VBQXNFO1lBQ3RFLHlFQUF5RTtZQUN6RSx3RUFBd0U7WUFDeEUseUVBQXlFO1lBQ3pFLHlDQUF5QztZQUN6QyxJQUFJLENBQUMsbUJBQW1CLENBQ3RCLE1BQU0sQ0FBQyxNQUFNLENBQ1gsSUFBSSxDQUFDLGdCQUFnQixFQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUMzQyxDQUNGLENBQUM7U0FDSDtRQUVELHFFQUFxRTtRQUNyRSw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRTNDLDJFQUEyRTtRQUMzRSxtQkFBbUI7UUFDbkIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsK0JBQStCLEVBQUU7WUFDdkUsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQVksQ0FBQyxDQUFDLENBQUM7U0FDaEU7SUFDSCxDQUFDO0lBQUEsQ0FBQztJQUVGOztPQUVHO0lBQ0ssa0JBQWtCO1FBRXhCOzs7Ozs7OztXQVFHO1FBQ0gsMkVBQTJFO1FBQzNFLHVDQUF1QztRQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRTtZQUMvQixvRUFBb0U7WUFDcEUseUVBQXlFO1lBQ3pFLHlFQUF5RTtZQUN6RSx3RUFBd0U7WUFDeEUsc0VBQXNFO1lBQ3RFLG1FQUFtRTtZQUNuRSx5RUFBeUU7WUFDekUsbUVBQW1FO1lBQ25FLGtFQUFrRTtZQUNsRSxzREFBc0Q7WUFDdEQsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUM7WUFDL0IsSUFBSSxNQUFxQixDQUFDO1lBRTFCLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDckIsUUFBUSxFQUNSLEtBQUssQ0FBQyxFQUFFO2dCQUVOLHNEQUFzRDtnQkFDdEQsZ0VBQWdFO2dCQUNoRSwrQ0FBK0M7Z0JBQy9DLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsa0JBQWtCLEVBQUU7b0JBQ2xFLE9BQU87aUJBQ1I7Z0JBRUQsZ0VBQWdFO2dCQUNoRSwrREFBK0Q7Z0JBQy9ELGtEQUFrRDtnQkFDbEQsTUFBTSxHQUFHLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbEQsSUFBSSxNQUFNLEVBQUU7b0JBQ1YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDbkM7WUFDSCxDQUFDO1lBQ0QsbUVBQW1FO1lBQ25FLDhEQUE4RDtZQUM5RCxxRUFBcUU7WUFDckUsOEJBQThCO1lBQzlCLElBQUksQ0FDTCxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sY0FBYyxDQUFDLFNBQW9CLEVBQUUsT0FBZ0I7UUFDM0QsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2pDLE9BQU87U0FDUjtRQUNELE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzdCLEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2xFLE9BQU8sQ0FBQyxHQUFHLENBQUM7Z0JBQ1YsUUFBUTtnQkFDUixjQUFjO2FBQ2YsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssc0NBQXNDO1FBQzVDLElBQUksbUJBQW1CLElBQUksT0FBTyxFQUFFO1lBQ2xDLE9BQU8sQ0FBQyxpQkFBaUIsR0FBRyxRQUFRLENBQUM7U0FDdEM7SUFDSCxDQUFDOztnSUExWVUsbUNBQW1DLDhEQW9CcEMsV0FBVyxhQUNYLHNEQUFzRDtvSUFyQnJELG1DQUFtQzsyRkFBbkMsbUNBQW1DO2tCQUQvQyxVQUFVOzswQkFxQk4sTUFBTTsyQkFBQyxXQUFXOzswQkFDbEIsTUFBTTsyQkFBQyxzREFBc0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBpc1BsYXRmb3JtU2VydmVyIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7IEluamVjdCwgSW5qZWN0YWJsZSwgTmdab25lLCBPbkRlc3Ryb3ksIFBMQVRGT1JNX0lEIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBOYXZpZ2F0aW9uU3RhcnQsIFJvdXRlciwgRXZlbnQgYXMgUm91dGVyTmF2aWdhdGlvbkV2ZW50LCBOYXZpZ2F0aW9uRW5kIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IFN1YmplY3QsIHRha2VVbnRpbCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgRG9tVXRpbHMgZnJvbSAnLi9kb20tdXRpbHMnO1xuaW1wb3J0IHsgTmd4U2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbkNvbmZpZyB9IGZyb20gJy4vbmd4LXNjcm9sbC1wb3NpdGlvbi1yZXN0b3JhdGlvbi1jb25maWcnO1xuaW1wb3J0IHsgTkdYX1NDUk9MTF9QT1NJVElPTl9SRVNUT1JBVElPTl9DT05GSUdfSU5KRUNUSU9OX1RPS0VOIH0gZnJvbSAnLi9uZ3gtc2Nyb2xsLXBvc2l0aW9uLXJlc3RvcmF0aW9uLWNvbmZpZy1pbmplY3Rpb24tdG9rZW4nO1xuXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgTmd4U2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvblNlcnZpY2UgaW1wbGVtZW50cyBPbkRlc3Ryb3kge1xuXG4gIHByaXZhdGUgYXBwbHlTdGF0ZVRvRG9tVGltZXI6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgY3VycmVudFBhZ2VTdGF0ZTogUGFnZVN0YXRlID0ge307XG4gIHByaXZhdGUgbGFzdE5hdmlnYXRpb25TdGFydEF0OiBudW1iZXIgPSAwO1xuICBwcml2YXRlIG5hdmlnYXRpb25JRHM6IG51bWJlcltdID0gW107XG4gIHByaXZhdGUgcGFnZVN0YXRlczogUGFnZVN0YXRlcyA9IHt9O1xuICBwcml2YXRlIHNjcm9sbGVkRWxlbWVudHM6IFNldDxUYXJnZXQ+ID0gbmV3IFNldCgpO1xuXG4gIC8vIFdlIG5lZWQgdG8ga2VlcCB0cmFjayBvZiB0aGVzZSB2YWx1ZXMgYWNyb3NzIHRoZSBTdGFydCAvIEVuZCBldmVudHMuXG4gIHByaXZhdGUgbmF2aWdhdGlvbklEITogbnVtYmVyO1xuICBwcml2YXRlIHJlc3RvcmVkTmF2aWdhdGlvbklEITogbnVtYmVyIHwgbnVsbDtcblxuICBwcml2YXRlIG1heGltdW1OdW1iZXJPZkNhY2hlZFBhZ2VTdGF0ZXM6IG51bWJlciA9IDIwO1xuXG4gIHByaXZhdGUgc2VydmljZURlc3Ryb3llZCQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsXG4gICAgcHJpdmF0ZSB6b25lOiBOZ1pvbmUsXG4gICAgQEluamVjdChQTEFURk9STV9JRCkgcHJpdmF0ZSBwbGF0Zm9ybUlkOiBzdHJpbmcsXG4gICAgQEluamVjdChOR1hfU0NST0xMX1BPU0lUSU9OX1JFU1RPUkFUSU9OX0NPTkZJR19JTkpFQ1RJT05fVE9LRU4pIHByaXZhdGUgY29uZmlnOiBOZ3hTY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uQ29uZmlnXG4gICkgeyB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgTmd4U2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvblNlcnZpY2UuXG4gICAqL1xuICBpbml0aWFsaXplKCk6IHZvaWQge1xuICAgIGlmIChpc1BsYXRmb3JtU2VydmVyKHRoaXMucGxhdGZvcm1JZCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNldHVwU2Nyb2xsQmluZGluZygpO1xuXG4gICAgLy8gdGhpcy5zZXR1cFJvdXRlckJpbmRpbmcoKTtcbiAgICAvLyBJIGJpbmQgdG8gdGhlIHJvdXRlciBldmVudHMgYW5kIHBlcmZvcm0gdG8gcHJpbWFyeSBhY3Rpb25zOlxuICAgIC8vIC0tXG4gICAgLy8gTkFWSUdBVElPTiBTVEFSVDogV2hlbiB0aGUgdXNlciBpcyBhYm91dCB0byBuYXZpZ2F0ZSBhd2F5IGZyb20gdGhlIGN1cnJlbnQgdmlldyxcbiAgICAvLyBJIGluc3BlY3QgdGhlIGN1cnJlbnQgRE9NIHN0YXRlIGFuZCBjb21taXQgYW55IHNjcm9sbGVkLWVsZW1lbnQgb2Zmc2V0cyB0byB0aGVcbiAgICAvLyBpbi1tZW1vcnkgY2FjaGUgb2YgdGhlIHBhZ2Ugc3RhdGUgKHNjcm9sbCBldmVudHMgd2VyZSByZWNvcmRlZCBkdXJpbmcgdGhlIGxpZmV0aW1lXG4gICAgLy8gb2YgdGhlIGN1cnJlbnQgcm91dGVyIHN0YXRlKS5cbiAgICAvLyAtLVxuICAgIC8vIE5BVklHQVRJT04gRU5EOiBXaGVuIHRoZSB1c2VyIGNvbXBsZXRlcyBhIG5hdmlnYXRpb24gdG8gYSBuZXcgdmlldywgSSBjaGVjayB0byBzZWVcbiAgICAvLyBpZiB0aGUgbmV3IHZpZXcgaXMgcmVhbGx5IHRoZSByZXN0b3JhdGlvbiBvZiBhIHByZXZpb3VzbHkgY2FjaGVkIHBhZ2Ugc3RhdGU7IGFuZCxcbiAgICAvLyBpZiBzbywgSSB0cnkgdG8gcmVpbnN0YXRlIHRoZSBvbGQgc2Nyb2xsZWQtZWxlbWVudCBvZmZzZXRzIGluIHRoZSByZW5kZXJlZCBET00uXG4gICAgdGhpcy5yb3V0ZXIuZXZlbnRzLnBpcGUoXG4gICAgICB0YWtlVW50aWwodGhpcy5zZXJ2aWNlRGVzdHJveWVkJClcbiAgICApLnN1YnNjcmliZShcbiAgICAgIChldmVudDogUm91dGVyTmF2aWdhdGlvbkV2ZW50KSA9PiB7XG4gICAgICAgIC8vIEZpbHRlciBuYXZpZ2F0aW9uIGV2ZW50IHN0cmVhbXMgdG8gdGhlIGFwcHJvcHJpYXRlIGV2ZW50IGhhbmRsZXJzLlxuICAgICAgICBpZiAoZXZlbnQgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uU3RhcnQpIHtcbiAgICAgICAgICB0aGlzLmhhbmRsZU5hdmlnYXRpb25TdGFydChldmVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZXZlbnQgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgICAgdGhpcy5oYW5kbGVOYXZpZ2F0aW9uRW5kKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gU2luY2Ugd2UncmUgZ29pbmcgdG8gYmUgaW1wbGVtZW50aW5nIGEgY3VzdG9tIHNjcm9sbCByZXRlbnRpb24gYWxnb3JpdGhtLFxuICAgIC8vIGxldCdzIGRpc2FibGUgdGhlIG9uZSB0aGF0IGlzIHByb3ZpZGVkIGJ5IHRoZSBicm93c2VyLiBUaGlzIHdpbGwga2VlcCBvdXJcbiAgICAvLyBwb2x5ZmlsbCB0aGUgc291cmNlIG9mIHRydXRoLlxuICAgIHRoaXMuZGlzYWJsZUJyb3dzZXJEZWZhdWx0U2Nyb2xsUmVzdG9yYXRpb24oKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuc2VydmljZURlc3Ryb3llZCQubmV4dCgpO1xuICAgIHRoaXMuc2VydmljZURlc3Ryb3llZCQuY29tcGxldGUoKTtcbiAgfVxuXG4gIGNsZWFyU2F2ZWRXaW5kb3dTY3JvbGxUb3BJbkxhc3ROYXZpZ2F0aW9uKCk6IHZvaWQge1xuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uSWQgPSB0aGlzLm5hdmlnYXRpb25JRHNbdGhpcy5uYXZpZ2F0aW9uSURzLmxlbmd0aCAtIDFdO1xuICAgIGlmIChsYXN0TmF2aWdhdGlvbklkKSB7XG4gICAgICBpZiAodGhpcy5jb25maWcuZGVidWcgJiYgdGhpcy5wYWdlU3RhdGVzW2xhc3ROYXZpZ2F0aW9uSWRdW0RvbVV0aWxzLldJTkRPV19TRUxFQ1RPUl0pIHtcbiAgICAgICAgY29uc29sZS5sb2coJ05hdmlnYXRpb24gaW4gYSBcInNlY29uZGFyeVwiIHJvdXRlci1vdXRsZXQgLSBSZW1vdmUgd2luZG93IHNjcm9sbCBwb3NpdGlvbiBmcm9tIHJlY29yZGVkIHNjcm9sbCBwb3NpdGlvbnMuJyk7XG4gICAgICB9XG4gICAgICBkZWxldGUgKHRoaXMucGFnZVN0YXRlc1tsYXN0TmF2aWdhdGlvbklkXVtEb21VdGlscy5XSU5ET1dfU0VMRUNUT1JdKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSSBhdHRlbXB0IHRvIGFwcGx5IHRoZSBnaXZlbiBwYWdlLXN0YXRlIHRvIHRoZSByZW5kZXJlZCBET00uIEkgd2lsbCBjb250aW51ZSB0byBwb2xsIHRoZSBkb2N1bWVudCB1bnRpbCBhbGwgc3RhdGVzIGhhdmUgYmVlbiByZWluc3RhdGVkOyBvciwgdW50aWwgdGhlIHBvbGwgZHVyYXRpb24gaGFzIGJlZW4gZXhjZWVkZWQ7IG9yLCB1bnRpbCBhIHN1YnNlcXVlbnQgbmF2aWdhdGlvbiB0YWtlcyBwbGFjZS5cbiAgICovXG4gIHByaXZhdGUgYXBwbHlQYWdlU3RhdGVUb0RvbShwYWdlU3RhdGU6IFBhZ2VTdGF0ZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLmNvbmZpZy5kZWJ1Zykge1xuICAgICAgdGhpcy5kZWJ1Z1BhZ2VTdGF0ZShwYWdlU3RhdGUsICdBdHRlbXB0aW5nIHRvIHJlYXBwbHkgc2Nyb2xsIHBvc2l0aW9ucyBhZnRlciBhIHBvcHN0YXRlIG5hdmlnYXRpb24gKGJhY2t3YXJkIG9yIGZvcndhcmQpLicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9iamVjdElzRW1wdHkocGFnZVN0YXRlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIExldCdzIGNyZWF0ZSBhIGNvcHkgb2YgdGhlIHBhZ2Ugc3RhdGUgc28gdGhhdCB3ZSBjYW4gc2FmZWx5IGRlbGV0ZSBrZXlzIGZyb21cbiAgICAvLyBpdCBhcyB3ZSBzdWNjZXNzZnVsbHkgYXBwbHkgdGhlbSB0byB0aGUgcmVuZGVyZWQgRE9NLlxuICAgIGNvbnN0IHBlbmRpbmdQYWdlU3RhdGUgPSB7IC4uLnBhZ2VTdGF0ZSB9O1xuXG4gICAgLy8gU2V0dXAgdGhlIHNjcm9sbCByZXRlbnRpb24gdGltZXIgb3V0c2lkZSBvZiB0aGUgQW5ndWxhciBab25lIHNvIHRoYXQgaXRcbiAgICAvLyBkb2Vzbid0IHRyaWdnZXIgYW55IGFkZGl0aW9uYWwgY2hhbmdlLWRldGVjdGlvbiBkaWdlc3RzLlxuICAgIHRoaXMuem9uZS5ydW5PdXRzaWRlQW5ndWxhcihcbiAgICAgICgpOiB2b2lkID0+IHtcbiAgICAgICAgY29uc3Qgc3RhcnRlZEF0ID0gRGF0ZS5ub3coKTtcblxuICAgICAgICB0aGlzLmFwcGx5U3RhdGVUb0RvbVRpbWVyID0gc2V0SW50ZXJ2YWwoXG4gICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBzZWxlY3RvciBpbiBwZW5kaW5nUGFnZVN0YXRlKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IERvbVV0aWxzLnNlbGVjdChzZWxlY3Rvcik7XG5cbiAgICAgICAgICAgICAgLy8gSWYgdGhlIHRhcmdldCBlbGVtZW50IGRvZXNuJ3QgZXhpc3QgaW4gdGhlIERPTSB5ZXQsIGl0XG4gICAgICAgICAgICAgIC8vIGNvdWxkIGJlIGFuIGluZGljYXRpb24gb2YgYXN5bmNocm9ub3VzIGxvYWRpbmcgYW5kXG4gICAgICAgICAgICAgIC8vIHJlbmRlcmluZy4gTW92ZSBvbnRvIHRoZSBuZXh0IHNlbGVjdG9yIHdoaWxlIHdlIHN0aWxsXG4gICAgICAgICAgICAgIC8vIGhhdmUgdGltZS5cbiAgICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIElmIHRoZSBlbGVtZW50IGluIHF1ZXN0aW9uIGhhcyBiZWVuIHNjcm9sbGVkIChieSB0aGUgdXNlcilcbiAgICAgICAgICAgICAgLy8gd2hpbGUgd2UncmUgYXR0ZW1wdGluZyB0byByZWluc3RhdGUgdGhlIHByZXZpb3VzIHNjcm9sbFxuICAgICAgICAgICAgICAvLyBvZmZzZXRzLCB0aGVuIGlnbm9yZSB0aGlzIHN0YXRlIC0gdGhlIHVzZXIncyBhY3Rpb24gc2hvdWxkXG4gICAgICAgICAgICAgIC8vIHRha2UgcHJlY2VkZW5jZS5cbiAgICAgICAgICAgICAgaWYgKHRoaXMuc2Nyb2xsZWRFbGVtZW50cy5oYXModGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSAocGVuZGluZ1BhZ2VTdGF0ZVtzZWxlY3Rvcl0pO1xuICAgICAgICAgICAgICAgIC8vIE90aGVyd2lzZSwgbGV0J3MgdHJ5IHRvIHJlc3RvcmUgdGhlIHNjcm9sbCBmb3IgdGhlIHRhcmdldC5cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBwZW5kaW5nUGFnZVN0YXRlW3NlbGVjdG9yXTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHRhbnRTY3JvbGxUb3AgPSBEb21VdGlscy5zY3JvbGxUbyh0YXJnZXQsIHNjcm9sbFRvcCk7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgYXR0ZW1wdCB0byByZXN0b3JlIHRoZSBlbGVtZW50IHRvIGl0cyBwcmV2aW91c1xuICAgICAgICAgICAgICAgIC8vIG9mZnNldCByZXN1bHRlZCBpbiBhIG1hdGNoLCB0aGVuIHN0b3AgdHJhY2tpbmcgdGhpc1xuICAgICAgICAgICAgICAgIC8vIGVsZW1lbnQuIE90aGVyd2lzZSwgd2UnbGwgY29udGludWUgdG8gdHJ5IGFuZCBzY3JvbGxcbiAgICAgICAgICAgICAgICAvLyBpdCBpbiB0aGUgc3Vic2VxdWVudCB0aWNrLlxuICAgICAgICAgICAgICAgIC8vIC0tXG4gICAgICAgICAgICAgICAgLy8gTk9URTogV2UgY29udGludWUgdG8gdHJ5IGFuZCB1cGRhdGUgaXQgYmVjYXVzZSB0aGVcbiAgICAgICAgICAgICAgICAvLyB0YXJnZXQgZWxlbWVudCBtYXkgZXhpc3QgaW4gdGhlIERPTSBidXQgYWxzbyBiZVxuICAgICAgICAgICAgICAgIC8vIGxvYWRpbmcgYXN5bmNocm9ub3VzIGRhdGEgdGhhdCBpcyByZXF1aXJlZCBmb3IgdGhlXG4gICAgICAgICAgICAgICAgLy8gcHJldmlvdXMgc2Nyb2xsIG9mZnNldC5cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0YW50U2Nyb2xsVG9wID09PSBzY3JvbGxUb3ApIHtcbiAgICAgICAgICAgICAgICAgIGRlbGV0ZSAocGVuZGluZ1BhZ2VTdGF0ZVtzZWxlY3Rvcl0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gbW9yZSBlbGVtZW50cyB0byBzY3JvbGwgb3IsIHdlJ3ZlIGV4Y2VlZGVkIG91clxuICAgICAgICAgICAgLy8gcG9sbCBkdXJhdGlvbiwgdGhlbiBzdG9wIHdhdGNoaW5nIHRoZSBET00uXG4gICAgICAgICAgICBpZiAodGhpcy5vYmplY3RJc0VtcHR5KHBlbmRpbmdQYWdlU3RhdGUpXG4gICAgICAgICAgICAgIHx8ICgoRGF0ZS5ub3coKSAtIHN0YXJ0ZWRBdCkgPj0gdGhpcy5jb25maWcucG9sbER1cmF0aW9uISlcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5hcHBseVN0YXRlVG9Eb21UaW1lcik7XG4gICAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5kZWJ1Zykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9iamVjdElzRW1wdHkocGVuZGluZ1BhZ2VTdGF0ZSkpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCclYyBTdWNjZXNzZnVsbHkgcmVhcHBsaWVkIGFsbCByZWNvcmRlZCBzY3JvbGwgcG9zaXRpb25zIHRvIHRoZSBET00uJywgJ2NvbG9yOiAjMmVjYzcxJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgQ291bGQgbm90IHJlYXBwbHkgZm9sbG93aW5nIHJlY29yZGVkIHNjcm9sbCBwb3NpdGlvbnMgdG8gdGhlIERPTSBhZnRlciBhIHBvbGwgZHVyYXRpb24gb2Y6ICR7dGhpcy5jb25maWcucG9sbER1cmF0aW9ufSBtaWxsaXNlY29uZHM6YCk7XG4gICAgICAgICAgICAgICAgICB0aGlzLmRlYnVnUGFnZVN0YXRlKHBlbmRpbmdQYWdlU3RhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdGhpcy5jb25maWcucG9sbENhZGVuY2VcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEkgZ2V0IHRoZSBwYWdlIHN0YXRlIGZyb20gdGhlIGdpdmVuIHNldCBvZiBub2Rlcy4gVGhpcyBleHRyYWN0cyB0aGUgQ1NTIHNlbGVjdG9ycyBhbmQgb2Zmc2V0cyBmcm9tIHRoZSByZWNvcmRlZCBlbGVtZW50cy5cbiAgICovXG4gIHByaXZhdGUgZ2V0UGFnZVN0YXRlRnJvbU5vZGVzKG5vZGVzOiBTZXQ8VGFyZ2V0Pik6IFBhZ2VTdGF0ZSB7XG4gICAgY29uc3QgcGFnZVN0YXRlOiBQYWdlU3RhdGUgPSB7fTtcblxuICAgIG5vZGVzLmZvckVhY2goXG4gICAgICB0YXJnZXQgPT4ge1xuICAgICAgICAvLyBHZW5lcmF0ZSBhIENTUyBzZWxlY3RvciBmcm9tIHRoZSBnaXZlbiB0YXJnZXQuXG4gICAgICAgIC8vIC0tXG4gICAgICAgIC8vIFRPRE86IFJpZ2h0IG5vdywgdGhpcyBhbGdvcml0aG0gY3JlYXRlcyB0aGUgc2VsZWN0b3IgYnkgd2Fsa2luZyB1cCB0aGVcbiAgICAgICAgLy8gRE9NIHRyZWUgYW5kIHVzaW5nIHRoZSBzaW11bGF0ZWQgZW5jYXBzdWxhdGlvbiBhdHRyaWJ1dGVzLiBCdXQsIGl0XG4gICAgICAgIC8vIHdvdWxkIGJlIGNvb2wgdG8gaGF2ZSBhIGNvbmZpZ3VyYXRpb24gb3B0aW9uIHRoYXQgdGVsbHMgdGhpcyBhbGdvcml0aG1cbiAgICAgICAgLy8gdG8gbG9vayBmb3IgYSBzcGVjaWZpYyBpZC1wcmVmaXggb3IgYXR0cmlidXRlIG9yIHNvbWV0aGluZy4gVGhpcyB3b3VsZFxuICAgICAgICAvLyByZXF1aXJlIHRoZSBkZXZlbG9wZXIgdG8gcHJvdmlkZSB0aG9zZTsgYnV0IGl0IHdvdWxkIGJlIG9wdGltYWwuXG4gICAgICAgIGNvbnN0IHNlbGVjdG9yID0gRG9tVXRpbHMuZ2V0U2VsZWN0b3IodGFyZ2V0KTtcblxuICAgICAgICAvLyBJZiB0aGUgZ2l2ZW4gVGFyZ2V0IGlzIG5vIGxvbmdlciBwYXJ0IG9mIHRoZSBhY3RpdmUgRE9NLCB0aGUgc2VsZWN0b3JcbiAgICAgICAgLy8gd2lsbCBiZSBudWxsLlxuICAgICAgICBpZiAoc2VsZWN0b3IpIHtcbiAgICAgICAgICBwYWdlU3RhdGVbc2VsZWN0b3JdID0gRG9tVXRpbHMuZ2V0U2Nyb2xsVG9wKHRhcmdldCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApO1xuICAgIHJldHVybiBwYWdlU3RhdGU7XG4gIH1cblxuICAvKipcbiAgICogSSBkZXRlcm1pbmUgaWYgdGhlIGdpdmVuIG9iamVjdCBpcyBlbXB0eSAoaWUsIGhhcyBubyBrZXlzKS5cbiAgICovXG4gIHByaXZhdGUgb2JqZWN0SXNFbXB0eShvYmplY3Q6IE9iamVjdCk6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3Qga2V5IGluIG9iamVjdCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIFRoZSBnb2FsIG9mIHRoZSBOYXZpZ2F0aW9uU3RhcnQgZXZlbnQgaXMgdG8gdGFrZSBjaGFuZ2VzIHRoYXQgaGF2ZSBiZWVuIG1hZGVcbiAgLy8gdG8gdGhlIGN1cnJlbnQgRE9NIGFuZCBzdG9yZSB0aGVtIGluIHRoZSByZW5kZXItc3RhdGUgdHJlZSBzbyB0aGV5IGNhbiBiZVxuICAvLyByZWluc3RhdGVkIGF0IGEgZnV0dXJlIGRhdGUuXG4gIHByaXZhdGUgaGFuZGxlTmF2aWdhdGlvblN0YXJ0KGV2ZW50OiBOYXZpZ2F0aW9uU3RhcnQpOiB2b2lkIHtcbiAgICB0aGlzLmxhc3ROYXZpZ2F0aW9uU3RhcnRBdCA9IERhdGUubm93KCk7XG5cbiAgICAvLyBHZXQgdGhlIG5hdmlnYXRpb24gSUQgYW5kIHRoZSByZXN0b3JlZCBuYXZpZ2F0aW9uIElEIGZvciB1c2UgaW4gdGhlXG4gICAgLy8gTmF2aWdhdGlvbkVuZCBldmVudCBoYW5kbGVyLlxuICAgIHRoaXMubmF2aWdhdGlvbklEID0gZXZlbnQuaWQ7XG4gICAgLyoqXG4gICAgICogTWF5YmUgaW4gZnV0dXJlIHVwZGF0ZSBAdG9kbzogdXNlIG5neC1uYXZpZ2F0aW9uLXRyaWdnZXIgaGVyZSwgbGlrZTogXG4gICAgICogKGV2ZW50LnJlc3RvcmVkU3RhdGUgJiYgdGhpcy53aGVuU2hvdWxkU2Nyb2xsUG9zaXRpb25CZVJlc3RvcmVkLmhhcyh0aGlzLm5hdmlnYXRpb25UcmlnZ2VyKSlcbiAgICAgKi9cbiAgICB0aGlzLnJlc3RvcmVkTmF2aWdhdGlvbklEID0gZXZlbnQucmVzdG9yZWRTdGF0ZSA/IGV2ZW50LnJlc3RvcmVkU3RhdGUubmF2aWdhdGlvbklkIDogbnVsbDtcblxuICAgIC8vIElmIHRoZSB1c2VyIGlzIG5hdmlnYXRpbmcgYXdheSBmcm9tIHRoZSBjdXJyZW50IHZpZXcsIGtpbGwgYW55IHRpbWVycyB0aGF0XG4gICAgLy8gbWF5IGJlIHRyeWluZyB0byByZWluc3RhdGUgYSBwYWdlLXN0YXRlLlxuICAgIGNsZWFyVGltZW91dCh0aGlzLmFwcGx5U3RhdGVUb0RvbVRpbWVyKTtcblxuICAgIC8vIEJlZm9yZSB3ZSBuYXZpZ2F0ZSBhd2F5IGZyb20gdGhlIGN1cnJlbnQgcGFnZSBzdGF0ZSwgbGV0J3MgY29tbWl0IGFueVxuICAgIC8vIHNjcm9sbC1lbGVtZW50cyB0byB0aGUgY3VycmVudCBwYWdlIHN0YXRlLlxuICAgIE9iamVjdC5hc3NpZ24oXG4gICAgICB0aGlzLmN1cnJlbnRQYWdlU3RhdGUsXG4gICAgICB0aGlzLmdldFBhZ2VTdGF0ZUZyb21Ob2Rlcyh0aGlzLnNjcm9sbGVkRWxlbWVudHMpXG4gICAgKTtcblxuICAgIHRoaXMuc2Nyb2xsZWRFbGVtZW50cy5jbGVhcigpO1xuXG4gICAgaWYgKHRoaXMuY29uZmlnLmRlYnVnKSB7XG4gICAgICB0aGlzLmRlYnVnUGFnZVN0YXRlKHRoaXMuY3VycmVudFBhZ2VTdGF0ZSwgJ1JlY29yZGVkIHNjcm9sbCBwb3NpdGlvbnMuJyk7XG4gICAgfVxuICB9O1xuXG4gIC8vIFRoZSBwcmltYXJ5IGdvYWwgb2YgdGhlIE5hdmlnYXRpb25FbmQgZXZlbnQgaXMgdG8gcmVpbnN0YXRlIGEgY2FjaGVkIHBhZ2VcbiAgLy8gc3RhdGUgaW4gdGhlIGV2ZW50IHRoYXQgdGhlIG5hdmlnYXRpb24gaXMgcmVzdG9yaW5nIGEgcHJldmlvdXNseSByZW5kZXJlZCBwYWdlXG4gIC8vIGFzIHRoZSByZXN1bHQgb2YgYSBwb3BzdGF0ZSBldmVudCAoZXgsIHRoZSB1c2VyIGhpdCB0aGUgQmFjayBvciBGb3J3YXJkXG4gIC8vIGJ1dHRvbnMpLlxuICBwcml2YXRlIGhhbmRsZU5hdmlnYXRpb25FbmQoKTogdm9pZCB7XG5cbiAgICBjb25zdCBwcmV2aW91c1BhZ2VTdGF0ZSA9IHRoaXMuY3VycmVudFBhZ2VTdGF0ZTtcblxuICAgIC8vIE5vdyB0aGF0IHdlIGtub3cgdGhlIG5hdmlnYXRpb24gd2FzIHN1Y2Nlc3NmdWwsIGxldCdzIHN0YXJ0IGFuZCBzdG9yZSBhXG4gICAgLy8gbmV3IHBhZ2Ugc3RhdGUgdG8gdHJhY2sgZnV0dXJlIHNjcm9sbGluZy5cbiAgICB0aGlzLmN1cnJlbnRQYWdlU3RhdGUgPSB0aGlzLnBhZ2VTdGF0ZXNbdGhpcy5uYXZpZ2F0aW9uSURdID0ge307XG5cbiAgICAvLyBXaGlsZSB3ZSBhcmUgZ29pbmcgdG8gdHJhY2sgZWxlbWVudHMgdGhhdCB3aWxsIGJlIHNjcm9sbGVkIGR1cmluZyB0aGVcbiAgICAvLyBjdXJyZW50IHBhZ2UgcmVuZGVyaW5nLCBpdCBpcyBwb3NzaWJsZSB0aGF0IHRoZXJlIGFyZSBlbGVtZW50cyB0aGF0IHdlcmVcbiAgICAvLyBzY3JvbGxlZCBkdXJpbmcgYSBwcmlvciBwYWdlIHJlbmRlcmluZyB0aGF0IHN0aWxsIGV4aXN0IG9uIHRoZSBwYWdlLCBidXRcbiAgICAvLyB3ZXJlIG5vdCBzY3JvbGxlZCByZWNlbnRseSAoc3VjaCBhcyBhIHNlY29uZGFyeSByb3V0ZXItb3V0bGV0KS4gQXMgc3VjaCxcbiAgICAvLyBsZXQncyBsb29rIGF0IHRoZSBwcmV2aW91cyBwYWdlIHN0YXRlIGFuZCAncHVsbCBmb3J3YXJkJyBhbnkgc3RhdGUgdGhhdFxuICAgIC8vIHN0aWxsIHBlcnRhaW5zIHRvIHRoZSBjdXJyZW50IHBhZ2UuXG4gICAgaWYgKCF0aGlzLnJlc3RvcmVkTmF2aWdhdGlvbklEKSB7XG4gICAgICBmb3IgKGNvbnN0IHNlbGVjdG9yIGluIHByZXZpb3VzUGFnZVN0YXRlKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IERvbVV0aWxzLnNlbGVjdChzZWxlY3Rvcik7XG5cbiAgICAgICAgLy8gT25seSBwdWxsIHRoZSBzZWxlY3RvciBmb3J3YXJkIGlmIGl0IGNvcnJlc3BvbmRzIHRvIGFuIGVsZW1lbnRcbiAgICAgICAgLy8gdGhhdCBzdGlsbCBleGlzdHMgaW4gdGhlIHJlbmRlcmVkIHBhZ2UuXG4gICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPbmx5IHB1bGwgdGhlIHNlbGVjdG9yIGZvcndhcmQgaWYgdGhlIHRhcmdldCBpcyBzdGlsbCBhdCB0aGUgc2FtZVxuICAgICAgICAvLyBvZmZzZXQgYWZ0ZXIgdGhlIG5hdmlnYXRpb24gaGFzIHRha2VuIHBsYWNlLiBJbiBvdGhlciB3b3JkcywgaWZcbiAgICAgICAgLy8gdGhlIG9mZnNldCBoYXMgc29tZWhvdyBjaGFuZ2VkIGluIGJldHdlZW4gdGhlIE5hdmlnYXRpb25TdGFydCBhbmRcbiAgICAgICAgLy8gTmF2aWdhdGlvbkVuZCBldmVudHMsIHRoZW4gaWdub3JlIGl0LiBUbyBiZSBob25lc3QsIHRoaXMgcmVhbGx5XG4gICAgICAgIC8vIG9ubHkgYXBwbGllcyB0byB0aGUgV0lORE9XLCB3aGljaCBjYW4gY2hhbmdlIGluIG9mZnNldCBkdWUgdG8gdGhlXG4gICAgICAgIC8vIGNoYW5nZSBpbiB3aGF0IHRoZSBSb3V0ZXIgaXMgYWN0aXZlbHkgcmVuZGVyaW5nIGluIHRoZSBET00uXG4gICAgICAgIGlmIChEb21VdGlscy5nZXRTY3JvbGxUb3AodGFyZ2V0KSAhPT0gcHJldmlvdXNQYWdlU3RhdGVbc2VsZWN0b3JdKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmN1cnJlbnRQYWdlU3RhdGVbc2VsZWN0b3JdID0gcHJldmlvdXNQYWdlU3RhdGVbc2VsZWN0b3JdO1xuXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5kZWJ1Zykge1xuICAgICAgICAgIGNvbnNvbGUuZ3JvdXAoJ1B1bGxpbmcgc2Nyb2xsIHBvc2l0aW9uIGZyb20gcHJldmlvdXMgcGFnZSBzdGF0ZSBpbiBjdXJyZW50IHBhZ2Ugc3RhdGUuJyk7XG4gICAgICAgICAgY29uc29sZS5sb2coe1xuICAgICAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgICAgICBzY3JvbGxQb3NpdGlvbjogdGhpcy5jdXJyZW50UGFnZVN0YXRlW3NlbGVjdG9yXVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNvbnNvbGUuZ3JvdXBFbmQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB3ZSdyZSByZXN0b3JpbmcgYSBwcmV2aW91cyBwYWdlIHN0YXRlIEFORCB3ZSBoYXZlIHRoYXQgcHJldmlvdXMgcGFnZVxuICAgICAgLy8gc3RhdGUgY2FjaGVkIGluLW1lbW9yeSwgbGV0J3MgY29weSB0aGUgcHJldmlvdXMgc3RhdGUgYW5kIHRoZW4gcmVzdG9yZSB0aGVcbiAgICAgIC8vIG9mZnNldHMgaW4gdGhlIERPTS5cbiAgICB9IGVsc2UgaWYgKHRoaXMucmVzdG9yZWROYXZpZ2F0aW9uSUQgJiYgdGhpcy5wYWdlU3RhdGVzW3RoaXMucmVzdG9yZWROYXZpZ2F0aW9uSURdKSB7XG5cbiAgICAgIC8vIE5PVEU6IFdlJ3JlIGNvcHlpbmcgdGhlIG9mZnNldHMgZnJvbSB0aGUgcmVzdG9yZWQgc3RhdGUgaW50byB0aGVcbiAgICAgIC8vIGN1cnJlbnQgc3RhdGUgaW5zdGVhZCBvZiBqdXN0IHN3YXBwaW5nIHRoZSByZWZlcmVuY2VzIGJlY2F1c2UgdGhlc2VcbiAgICAgIC8vIG5hdmlnYXRpb25zIGFyZSBkaWZmZXJlbnQgaW4gdGhlIFJvdXRlciBoaXN0b3J5LiBTaW5jZSBlYWNoIG5hdmlnYXRpb25cbiAgICAgIC8vIC0gaW1wZXJhdGl2ZSBvciBwb3BzdGF0ZSAtIGdldHMgYSB1bmlxdWUgSUQsIHdlIG5ldmVyIHRydWx5ICdnbyBiYWNrJ1xuICAgICAgLy8gaW4gaGlzdG9yeTsgdGhlIFJvdXRlciBvbmx5ICdnb2VzIGZvcndhcmQnLCB3aXRoIHRoZSBub3Rpb24gdGhhdCB3ZSdyZVxuICAgICAgLy8gcmVjcmVhdGluZyBhIHByZXZpb3VzIHN0YXRlIHNvbWV0aW1lcy5cbiAgICAgIHRoaXMuYXBwbHlQYWdlU3RhdGVUb0RvbShcbiAgICAgICAgT2JqZWN0LmFzc2lnbihcbiAgICAgICAgICB0aGlzLmN1cnJlbnRQYWdlU3RhdGUsXG4gICAgICAgICAgdGhpcy5wYWdlU3RhdGVzW3RoaXMucmVzdG9yZWROYXZpZ2F0aW9uSURdXG4gICAgICAgIClcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgbmF2aWdhdGlvbiBldmVudCBzbyB3ZSBjYW4gbGltaXQgdGhlIHNpemUgb2Ygb3VyXG4gICAgLy8gaW4tbWVtb3J5IHBhZ2Ugc3RhdGUgY2FjaGUuXG4gICAgdGhpcy5uYXZpZ2F0aW9uSURzLnB1c2godGhpcy5uYXZpZ2F0aW9uSUQpO1xuXG4gICAgLy8gVHJpbSB0aGUgb2xkZXN0IHBhZ2Ugc3RhdGVzIGFzIHdlIGdvIHNvIHRoYXQgdGhlIGluLW1lbW9yeSBjYWNoZSBkb2Vzbid0XG4gICAgLy8gZ3JvdywgdW5ib3VuZGVkLlxuICAgIHdoaWxlICh0aGlzLm5hdmlnYXRpb25JRHMubGVuZ3RoID4gdGhpcy5tYXhpbXVtTnVtYmVyT2ZDYWNoZWRQYWdlU3RhdGVzKSB7XG4gICAgICBkZWxldGUgKHRoaXMucGFnZVN0YXRlc1t0aGlzLm5hdmlnYXRpb25JRHMuc2hpZnQoKSBhcyBudW1iZXJdKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEkgYmluZCB0byB0aGUgc2Nyb2xsIGV2ZW50IGFuZCBrZWVwIHRyYWNrIG9mIGFueSBlbGVtZW50cyB0aGF0IGFyZSBzY3JvbGxlZCBpbiB0aGUgcmVuZGVyZWQgZG9jdW1lbnQuXG4gICAqL1xuICBwcml2YXRlIHNldHVwU2Nyb2xsQmluZGluZygpOiB2b2lkIHtcblxuICAgIC8qKlxuICAgICAqIE1heWJlIEB0b2RvOiBZb3Ugc2hvdWxkIHRyeSB0byBmaW5kIGEgd2F5IHRvIGdldCBzY3JvbGxhYmxlIChzY3JvbGxlZCkgZWxlbWVudHMgb25seSBkdXJpbmcgTmF2aWdhdGlvblN0YXJ0LiBcbiAgICAgKiBBZHZhbnRhZ2VzOlxuICAgICAqIC0gQmV0dGVyIHBlcmZvcm1hbmNlOiBubyBuZWVkIHRvIGxpc3RlbiB0byB0aGUgc2Nyb2xsIGV2ZW50IHRoZSB3aG9sZSB0aW1lLlxuICAgICAqIC0gU29tZSBlbGVtZW50cyBtaWdodCBiZSBhZGRlZCB0byB0aGUgYHNjcm9sbGVkRWxlbWVudHNgIGFyZSBub3QgcGFydCBvZiB0aGUgRE9NIGFueSBtb3JlLlxuICAgICAqIERpc2F2YW50YWdlczpcbiAgICAgKiAtIGR1cmluZyBOYXZpZ2F0aW9uU3RhcnQgc2Nyb2xsYWJsZSBlbGVtZW50cyB0aGF0IGFyZSBtYXliZSBwcmVzZW50IGFmdGVyIHRoZSBpbnRpYWxpemF0aW9uIG9mIHBhZ2UgKGJlZm9yZSBhbnkgdXNlci1pbnRlcmFjdGlvbnMgdGhhdCBjYW4gcmVtb3ZlIHRoZW0pIG1pZ2h0IGJlIG5vdCBwYXJ0IERPTSBhbnkgbW9yZS5cbiAgICAgKiBcbiAgICAgKi9cbiAgICAvLyBBZGQgc2Nyb2xsLWJpbmRpbmcgb3V0c2lkZSBvZiB0aGUgQW5ndWxhciBab25lIHNvIGl0IGRvZXNuJ3QgdHJpZ2dlciBhbnlcbiAgICAvLyBhZGRpdGlvbmFsIGNoYW5nZS1kZXRlY3Rpb24gZGlnZXN0cy5cbiAgICB0aGlzLnpvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4ge1xuICAgICAgLy8gV2hlbiBuYXZpZ2F0aW5nLCB0aGUgYnJvd3NlciBlbWl0cyBzb21lIHNjcm9sbCBldmVudHMgYXMgdGhlIERPTSBcbiAgICAgIC8vIChEb2N1bWVudCBPYmplY3QgTW9kZWwpIGNoYW5nZXMgc2hhcGUgaW4gYSB3YXkgdGhhdCBmb3JjZXMgdGhlIHZhcmlvdXNcbiAgICAgIC8vIHNjcm9sbCBvZmZzZXRzIHRvIGNoYW5nZS4gU2luY2UgdGhlc2Ugc2Nyb2xsIGV2ZW50cyBhcmUgbm90IGluZGljYXRpdmVcbiAgICAgIC8vIG9mIGEgdXNlcidzIGFjdHVhbCBzY3JvbGxpbmcgaW50ZW50LCB3ZSdyZSBnb2luZyB0byBpZ25vcmUgdGhlbS4gVGhpc1xuICAgICAgLy8gbmVlZHMgdG8gYmUgZG9uZSBvbiBib3RoIHNpZGVzIG9mIHRoZSBuYXZpZ2F0aW9uIGV2ZW50IChmb3IgcmVhc29uc1xuICAgICAgLy8gdGhhdCBhcmUgbm90IGZ1bGx5IG9idmlvdXMgb3IgbG9naWNhbCAtLSBiYXNpY2FsbHksIHRoZSB3aW5kb3cnc1xuICAgICAgLy8gc2Nyb2xsIGNoYW5nZXMgYXQgYSB0aW1lIHRoYXQgaXMgbm90IGVhc3kgdG8gdGFwIGludG8pLiBJZ25vcmluZyB0aGVzZVxuICAgICAgLy8gc2Nyb2xsIGV2ZW50cyBpcyBpbXBvcnRhbnQgYmVjYXVzZSB0aGUgcG9seWZpbGx5IHN0b3BzIHRyeWluZyB0b1xuICAgICAgLy8gcmVpbnN0YXRlIGEgc2Nyb2xsLW9mZnNldCBpZiBpdCBzZWVzIHRoYXQgdGhlIGdpdmVuIGVsZW1lbnQgaGFzXG4gICAgICAvLyBhbHJlYWR5IGJlZW4gc2Nyb2xsZWQgZHVyaW5nIHRoZSBjdXJyZW50IHJlbmRlcmluZy5cbiAgICAgIGNvbnN0IHNjcm9sbEJ1ZmZlcldpbmRvdyA9IDEwMDtcbiAgICAgIGxldCB0YXJnZXQ6IFRhcmdldCB8IG51bGw7XG5cbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgICAnc2Nyb2xsJyxcbiAgICAgICAgZXZlbnQgPT4ge1xuXG4gICAgICAgICAgLy8gSWYgdGhlIHNjcm9sbCBldmVudCBoYXBwZW5zIGltbWVkaWF0ZWx5IGZvbGxvd2luZyBhXG4gICAgICAgICAgLy8gbmF2aWdhdGlvbiBldmVudCwgdGhlbiBpZ25vcmUgaXQgLSBpdCBpcyBsaWtlbHkgYSBzY3JvbGwgdGhhdFxuICAgICAgICAgIC8vIHdhcyBmb3JjZWQgYnkgdGhlIGJyb3dzZXIncyBuYXRpdmUgYmVoYXZpb3IuXG4gICAgICAgICAgaWYgKChEYXRlLm5vdygpIC0gdGhpcy5sYXN0TmF2aWdhdGlvblN0YXJ0QXQpIDwgc2Nyb2xsQnVmZmVyV2luZG93KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVGhlIHRhcmdldCB3aWxsIHJldHVybiBOVUxMIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgaXJyZWxldmFudFxuICAgICAgICAgIC8vIHNjcm9sbCBiZWhhdmlvcnMgKGxpa2UgdGV4dGFyZWEgaW5wdXRzKS4gQXMgc3VjaCwgd2UgaGF2ZSB0b1xuICAgICAgICAgIC8vIGNoZWNrIHRvIHNlZSBpZiB0aGUgZG9tVXRpbHMgcmV0dXJuZWQgYW55dGhpbmcuXG4gICAgICAgICAgdGFyZ2V0ID0gRG9tVXRpbHMuZ2V0VGFyZ2V0RnJvbVNjcm9sbEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICBpZiAodGFyZ2V0KSB7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbGVkRWxlbWVudHMuYWRkKHRhcmdldCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvLyBXZSBoYXZlIHRvIHVzZSB0aGUgQ0FQVFVSSU5HIHBoYXNlLiBTY3JvbGwgZXZlbnRzIERPIE5PVCBCVUJCTEUuXG4gICAgICAgIC8vIEFzIHN1Y2gsIGlmIHdlIHdhbnQgdG8gbGlzdGVuIGZvciBhbGwgc2Nyb2xsIGV2ZW50cyBpbiB0aGUgXG4gICAgICAgIC8vIGRvY3VtZW50LCB3ZSBoYXZlIHRvIHVzZSB0aGUgY2FwdHVyaW5nIHBoYXNlIChhcyB0aGUgZXZlbnQgdHJhdmVsc1xuICAgICAgICAvLyBkb3duIHRocm91Z2ggdGhlIERPTSB0cmVlKS5cbiAgICAgICAgdHJ1ZVxuICAgICAgKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZGVidWdQYWdlU3RhdGUocGFnZVN0YXRlOiBQYWdlU3RhdGUsIG1lc3NhZ2U/OiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5vYmplY3RJc0VtcHR5KHBhZ2VTdGF0ZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc29sZS5ncm91cChtZXNzYWdlIHx8ICcnKTtcbiAgICBmb3IgKGNvbnN0IFtzZWxlY3Rvciwgc2Nyb2xsUG9zaXRpb25dIG9mIE9iamVjdC5lbnRyaWVzKHBhZ2VTdGF0ZSkpIHtcbiAgICAgIGNvbnNvbGUubG9nKHtcbiAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgIHNjcm9sbFBvc2l0aW9uXG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc29sZS5ncm91cEVuZCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIERpc2FibGUgYnJvd3NlciBkZWZhdWx0IHNjcm9sbCByZXN0b3JhdGlvbi5cbiAgICogXG4gICAqIERvY3VtZW50YXRpb246XG4gICAqIC0gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0hpc3Rvcnkvc2Nyb2xsUmVzdG9yYXRpb25cbiAgICovXG4gIHByaXZhdGUgZGlzYWJsZUJyb3dzZXJEZWZhdWx0U2Nyb2xsUmVzdG9yYXRpb24oKTogdm9pZCB7XG4gICAgaWYgKCdzY3JvbGxSZXN0b3JhdGlvbicgaW4gaGlzdG9yeSkge1xuICAgICAgaGlzdG9yeS5zY3JvbGxSZXN0b3JhdGlvbiA9ICdtYW51YWwnO1xuICAgIH1cbiAgfVxufVxuXG50eXBlIFRhcmdldCA9IFdpbmRvdyB8IEVsZW1lbnQ7XG5cbmludGVyZmFjZSBQYWdlU3RhdGVzIHtcbiAgW25hdmlnYXRpb25JRDogbnVtYmVyXTogUGFnZVN0YXRlO1xufVxuXG5pbnRlcmZhY2UgUGFnZVN0YXRlIHtcbiAgLyoqXG4gICAqIFNjcm9sbCBwb3NpdGlvbiAobnVtYmVyKS5cbiAgICovXG4gIFtzZWxlY3Rvcjogc3RyaW5nXTogbnVtYmVyO1xufVxuXG4vKipcbiAqIFNvdXJjZTpcbiAqIC0gaHR0cHM6Ly93d3cuYmVubmFkZWwuY29tL2Jsb2cvMzUzNC1yZXN0b3JpbmctYW5kLXJlc2V0dGluZy10aGUtc2Nyb2xsLXBvc2l0aW9uLXVzaW5nLXRoZS1uYXZpZ2F0aW9uc3RhcnQtZXZlbnQtaW4tYW5ndWxhci03LTAtNC5odG1cbiAqIC0gaHR0cDovL2Jlbm5hZGVsLmdpdGh1Yi5pby9KYXZhU2NyaXB0LURlbW9zL2RlbW9zL3JvdXRlci1yZXRhaW4tc2Nyb2xsLXBvbHlmaWxsLWFuZ3VsYXI3L1xuICogLSBodHRwczovL2dpdGh1Yi5jb20vYmVubmFkZWwvSmF2YVNjcmlwdC1EZW1vcy90cmVlL21hc3Rlci9kZW1vcy9yb3V0ZXItcmV0YWluLXNjcm9sbC1wb2x5ZmlsbC1hbmd1bGFyN1xuICovIl19