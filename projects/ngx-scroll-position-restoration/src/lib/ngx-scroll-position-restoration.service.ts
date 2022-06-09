import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';
import { NavigationStart, Router, Event as RouterNavigationEvent, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as DomUtils from './dom-utils';
import { NgxScrollPositionRestorationConfig } from './ngx-scroll-position-restoration-config';
import { NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN } from './ngx-scroll-position-restoration-config-injection-token';

@Injectable()
export class NgxScrollPositionRestorationService implements OnDestroy {

  private applyStateToDomTimer: number = 0;
  private currentPageState: PageState = {};
  private lastNavigationStartAt: number = 0;
  private navigationIDs: number[] = [];
  private pageStates: PageStates = {};
  private scrolledElements: Set<Target> = new Set();

  // We need to keep track of these values across the Start / End events.
  private navigationID!: number;
  private restoredNavigationID!: number | null;

  private maximumNumberOfCachedPageStates: number = 20;

  private serviceDestroyed$ = new Subject<void>();

  constructor(
    private router: Router,
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: string,
    @Inject(NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN) private config: NgxScrollPositionRestorationConfig
  ) { }

  /**
   * Initialize NgxScrollPositionRestorationService.
   */
  initialize(): void {
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
    this.router.events.pipe(
      takeUntil(this.serviceDestroyed$)
    ).subscribe(
      (event: RouterNavigationEvent) => {
        // Filter navigation event streams to the appropriate event handlers.
        if (event instanceof NavigationStart) {
          this.handleNavigationStart(event);
        } else if (event instanceof NavigationEnd) {
          this.handleNavigationEnd();
        }
      }
    );

    // Since we're going to be implementing a custom scroll retention algorithm,
    // let's disable the one that is provided by the browser. This will keep our
    // polyfill the source of truth.
    this.disableBrowserDefaultScrollRestoration();
  }

  ngOnDestroy(): void {
    this.serviceDestroyed$.next();
    this.serviceDestroyed$.complete();
  }

  clearSavedWindowScrollTopInLastNavigation(): void {
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
  private applyPageStateToDom(pageState: PageState): void {
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
    this.zone.runOutsideAngular(
      (): void => {
        const startedAt = Date.now();

        this.applyStateToDomTimer = setInterval(
          () => {
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
              } else {
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
              || ((Date.now() - startedAt) >= this.config.pollDuration!)
            ) {
              clearTimeout(this.applyStateToDomTimer);
              if (this.config.debug) {
                if (this.objectIsEmpty(pendingPageState)) {
                  console.log('%c Successfully reapplied all recorded scroll positions to the DOM.', 'color: #2ecc71');
                } else {
                  console.warn(`Could not reapply following recorded scroll positions to the DOM after a poll duration of: ${this.config.pollDuration} milliseconds:`);
                  this.debugPageState(pendingPageState);
                }
              }
            }
          },
          this.config.pollCadence
        );
      }
    );
  }

  /**
   * I get the page state from the given set of nodes. This extracts the CSS selectors and offsets from the recorded elements.
   */
  private getPageStateFromNodes(nodes: Set<Target>): PageState {
    const pageState: PageState = {};

    nodes.forEach(
      target => {
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
      }
    );
    return pageState;
  }

  /**
   * I determine if the given object is empty (ie, has no keys).
   */
  private objectIsEmpty(object: Object): boolean {
    for (const key in object) {
      return false;
    }
    return true;
  }

  // The goal of the NavigationStart event is to take changes that have been made
  // to the current DOM and store them in the render-state tree so they can be
  // reinstated at a future date.
  private handleNavigationStart(event: NavigationStart): void {
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
    Object.assign(
      this.currentPageState,
      this.getPageStateFromNodes(this.scrolledElements)
    );

    this.scrolledElements.clear();

    if (this.config.debug) {
      this.debugPageState(this.currentPageState, 'Recorded scroll positions.');
    }
  };

  // The primary goal of the NavigationEnd event is to reinstate a cached page
  // state in the event that the navigation is restoring a previously rendered page
  // as the result of a popstate event (ex, the user hit the Back or Forward
  // buttons).
  private handleNavigationEnd(): void {

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
    } else if (this.restoredNavigationID && this.pageStates[this.restoredNavigationID]) {

      // NOTE: We're copying the offsets from the restored state into the
      // current state instead of just swapping the references because these
      // navigations are different in the Router history. Since each navigation
      // - imperative or popstate - gets a unique ID, we never truly 'go back'
      // in history; the Router only 'goes forward', with the notion that we're
      // recreating a previous state sometimes.
      this.applyPageStateToDom(
        Object.assign(
          this.currentPageState,
          this.pageStates[this.restoredNavigationID]
        )
      );
    }

    // Keep track of the navigation event so we can limit the size of our
    // in-memory page state cache.
    this.navigationIDs.push(this.navigationID);

    // Trim the oldest page states as we go so that the in-memory cache doesn't
    // grow, unbounded.
    while (this.navigationIDs.length > this.maximumNumberOfCachedPageStates) {
      delete (this.pageStates[this.navigationIDs.shift() as number]);
    }
  };

  /**
   * I bind to the scroll event and keep track of any elements that are scrolled in the rendered document.
   */
  private setupScrollBinding(): void {

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
      let target: Target | null;

      window.addEventListener(
        'scroll',
        event => {

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
        true
      );
    });
  }

  private debugPageState(pageState: PageState, message?: string) {
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
  private disableBrowserDefaultScrollRestoration(): void {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }
}

type Target = Window | Element;

interface PageStates {
  [navigationID: number]: PageState;
}

interface PageState {
  /**
   * Scroll position (number).
   */
  [selector: string]: number;
}

/**
 * Source:
 * - https://www.bennadel.com/blog/3534-restoring-and-resetting-the-scroll-position-using-the-navigationstart-event-in-angular-7-0-4.htm
 * - http://bennadel.github.io/JavaScript-Demos/demos/router-retain-scroll-polyfill-angular7/
 * - https://github.com/bennadel/JavaScript-Demos/tree/master/demos/router-retain-scroll-polyfill-angular7
 */