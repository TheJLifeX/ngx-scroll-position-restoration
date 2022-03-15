import * as i0 from '@angular/core';
import { InjectionToken, PLATFORM_ID, Injectable, Inject, Directive, NgModule } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import * as i1 from '@angular/router';
import { NavigationStart, NavigationEnd } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { finder } from '@medv/finder';

const WINDOW_SELECTOR = '__window-selector__';
/**
 * DomUtils
 *
 * I provide a unified interface for dealing with scroll offsets across different types of targets (elements vs. windows).
 */
/**
 * I get the scroll-top of the given target in the active DOM.
 */
function getScrollTop(target) {
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
function getSelector(target) {
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
function getTargetFromScrollEvent(event) {
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
function scrollTo(target, scrollTop) {
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
function select(selector) {
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

const NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN = new InjectionToken('ngx_scroll_position_restoration_config_injection_token');

class NgxScrollPositionRestorationService {
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
            if (this.config.debug && this.pageStates[lastNavigationId][WINDOW_SELECTOR]) {
                console.log('Navigation in a "secondary" router-outlet - Remove window scroll position from recorded scroll positions.');
            }
            delete (this.pageStates[lastNavigationId][WINDOW_SELECTOR]);
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
                    const target = select(selector);
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
                        const resultantScrollTop = scrollTo(target, scrollTop);
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
            const selector = getSelector(target);
            // If the given Target is no longer part of the active DOM, the selector
            // will be null.
            if (selector) {
                pageState[selector] = getScrollTop(target);
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
                const target = select(selector);
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
                if (getScrollTop(target) !== previousPageState[selector]) {
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
                target = getTargetFromScrollEvent(event);
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

const ANGULAR_DEFAULT_ROUTER_OUTLET_NAME = 'primary';
/**
 * I co-opt the <router-outlet> element selector so that I can tap into the life-cycle of the core RouterOutlet directive.
 *
 * REASON: When the user clicks on a link, it's quite hard to differentiate between a primary navigation, which should probably scroll the user back to the top of the viewport; and, something like a tabbed-navigation, which should probably keep the user's scroll around the offset associated with the tab. As such, we are going to rely on the inherent scroll-position of the view as the router-outlet target is pulled out of the DOM.
 * PS: Keep in mind in Angular per default scroll position is maintained on navigation.
 */
class CustomRouterOutletDirective {
    constructor(elementRef, router, routerOutlet, ngxScrollPositionRestorationService, platformId, config) {
        this.elementRef = elementRef;
        this.router = router;
        this.routerOutlet = routerOutlet;
        this.ngxScrollPositionRestorationService = ngxScrollPositionRestorationService;
        this.platformId = platformId;
        this.config = config;
        this.recordedScrollPositions = [];
        this.directiveDestroyed$ = new Subject();
    }
    ngOnInit() {
        if (isPlatformServer(this.platformId)) {
            return;
        }
        this.routerOutlet.activateEvents.pipe(takeUntil(this.directiveDestroyed$)).subscribe(() => this.handleActivateEvent());
        this.routerOutlet.deactivateEvents.pipe(takeUntil(this.directiveDestroyed$)).subscribe(() => this.handleDectivateEvent());
        this.router.events.pipe(takeUntil(this.directiveDestroyed$)).subscribe((event) => this.handleNavigationEvent(event));
    }
    ngOnDestroy() {
        this.directiveDestroyed$.next();
        this.directiveDestroyed$.complete();
    }
    /**
     * Called when a router-outlet component has been rendered.
     */
    handleActivateEvent() {
        const currentRouterOutletName = this.routerOutlet.activatedRoute.outlet;
        const currentNavigation = this.router.getCurrentNavigation();
        if (currentRouterOutletName !== ANGULAR_DEFAULT_ROUTER_OUTLET_NAME
            && !(currentNavigation?.extras?.skipLocationChange)) {
            this.ngxScrollPositionRestorationService.clearSavedWindowScrollTopInLastNavigation();
        }
        const isRootRouterOutlet = this.isRootRouterOutlet(this.routerOutlet.activatedRoute);
        if (isRootRouterOutlet
            && this.navigationTrigger === 'imperative'
            && this.routerOutlet.activatedRoute.outlet === ANGULAR_DEFAULT_ROUTER_OUTLET_NAME) {
            scrollTo(window, 0);
            if (this.config.debug) {
                console.log('Imperative navigation: scrolled to the top (scrollTop = 0) of the window.');
            }
        }
        else {
            // At this point, the View-in-question has been mounted in the DOM (Document
            // Object Model). We can now walk back up the DOM and make sure that the
            // previously-recorded offsets (in the last 'deactivate' event) are being applied
            // to the ancestral elements. This will prevent the browser's native desire to 
            // auto-scroll-down a document once the view has been injected. Essentially, this
            // ensures that we scroll back to the 'expected top' as the user clicks through
            // the application.
            if (this.config.debug) {
                console.group(`router-outlet ("${this.elementRef.nativeElement.getAttribute('name') || ANGULAR_DEFAULT_ROUTER_OUTLET_NAME}") - Reapply recorded scroll positions.`);
                console.log(this.recordedScrollPositions.slice());
                console.groupEnd();
            }
            if (this.recordedScrollPositions.length === 0) {
                return;
            }
            for (const { elementSelector, scrollPosition } of this.recordedScrollPositions) {
                if (elementSelector) {
                    const element = select(elementSelector);
                    if (element) {
                        scrollTo(element, scrollPosition);
                    }
                }
            }
            this.recordedScrollPositions = [];
        }
    }
    /**
     * Called when a router-outlet component has been destroyed from the DOM. This means, at this point, the scroll position of the scrollable element containing the router-outlet component should be `0` (@todo: (BUG) but this seems not to work in Angular@13.1.1: component is not destroyed at this point).
     */
    handleDectivateEvent() {
        // At this point, the View-in-question has already been removed from the 
        // document. Let's walk up the DOM (Document Object Model) and record the scroll
        // position of all scrollable elements. This will give us a sense of what the DOM
        // should look like after the next View is injected.
        let node = this.elementRef.nativeElement.parentNode;
        while (node && node.tagName !== 'BODY') {
            // If this is an "Element" node, capture its offset.
            if (node.nodeType === 1) {
                const scrollTop = getScrollTop(node);
                const elementSelector = getSelector(node);
                this.recordedScrollPositions.push({
                    elementSelector,
                    target: node,
                    scrollPosition: scrollTop
                });
            }
            node = node.parentNode;
        }
        if (this.config.debug) {
            console.group(`router-outlet ("${this.elementRef.nativeElement.getAttribute('name') || ANGULAR_DEFAULT_ROUTER_OUTLET_NAME}") - Recorded scroll positions.`);
            console.log(this.recordedScrollPositions.slice());
            console.groupEnd();
        }
    }
    /**
     * I get called whenever a router event is raised.
     */
    handleNavigationEvent(event) {
        if (event instanceof NavigationStart) {
            this.navigationTrigger = event.navigationTrigger;
        }
        // The 'offsets' are only meant to be used across a single navigation. As such,
        // let's clear out the offsets at the end of each navigation in order to ensure
        // that old offsets don't accidentally get applied to a future view mounted by
        // the current router-outlet.
        if (event instanceof NavigationEnd) {
            this.recordedScrollPositions = [];
        }
    }
    /**
     * Is root "primary" (or any secondary) router-outet.
     */
    isRootRouterOutlet(actvitedRoute) {
        const currentComponent = actvitedRoute.component;
        const parentChildren = actvitedRoute.parent?.routeConfig?.children;
        if (!Array.isArray(parentChildren)) {
            return true;
        }
        for (const route of parentChildren) {
            if (route.component === currentComponent) {
                return false;
            }
        }
        return true;
        // Alternative: solution 02 (but not valid for secondary router-outlet)
        // if (actvitedRoute.parent?.component) {
        //   return false;
        // } else {
        //   return true;
        // }
    }
}
CustomRouterOutletDirective.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: CustomRouterOutletDirective, deps: [{ token: i0.ElementRef }, { token: i1.Router }, { token: i1.RouterOutlet }, { token: NgxScrollPositionRestorationService }, { token: PLATFORM_ID }, { token: NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN }], target: i0.ɵɵFactoryTarget.Directive });
CustomRouterOutletDirective.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "12.0.0", version: "13.1.1", type: CustomRouterOutletDirective, selector: "router-outlet", ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: CustomRouterOutletDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: 'router-outlet'
                }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: i1.Router }, { type: i1.RouterOutlet }, { type: NgxScrollPositionRestorationService }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN]
                }] }]; } });

const defaultNgxScrollPositionRestorationConfig = {
    pollDuration: 3000,
    pollCadence: 50,
    debug: false
};

class NgxScrollPositionRestorationModule {
    constructor(ngxScrollPositionRestorationService) {
        if (!NgxScrollPositionRestorationModule.serviceInitialized) {
            ngxScrollPositionRestorationService.initialize();
            NgxScrollPositionRestorationModule.serviceInitialized = true;
        }
    }
    static forRoot(config) {
        return ({
            ngModule: NgxScrollPositionRestorationModule,
            providers: [
                {
                    provide: NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN,
                    useValue: Object.assign(defaultNgxScrollPositionRestorationConfig, config)
                }
            ]
        });
    }
}
/**
 * Since NgxScrollPositionRestorationModule can be imported in child modules, it is needed to track if the ngxScrollPositionRestorationService has been already initialized to avoid duplicate calls of the `initialize` method.
 */
NgxScrollPositionRestorationModule.serviceInitialized = false;
NgxScrollPositionRestorationModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: NgxScrollPositionRestorationModule, deps: [{ token: NgxScrollPositionRestorationService }], target: i0.ɵɵFactoryTarget.NgModule });
NgxScrollPositionRestorationModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: NgxScrollPositionRestorationModule, declarations: [CustomRouterOutletDirective], exports: [CustomRouterOutletDirective] });
NgxScrollPositionRestorationModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: NgxScrollPositionRestorationModule, providers: [
        NgxScrollPositionRestorationService
    ] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: NgxScrollPositionRestorationModule, decorators: [{
            type: NgModule,
            args: [{
                    declarations: [
                        CustomRouterOutletDirective
                    ],
                    exports: [
                        CustomRouterOutletDirective
                    ],
                    providers: [
                        NgxScrollPositionRestorationService
                    ]
                }]
        }], ctorParameters: function () { return [{ type: NgxScrollPositionRestorationService }]; } });

/*
 * Public API Surface of ngx-scroll-position-restoration
 */

/**
 * Generated bundle index. Do not edit.
 */

export { CustomRouterOutletDirective, NgxScrollPositionRestorationModule };
//# sourceMappingURL=ngx-scroll-position-restoration.mjs.map
