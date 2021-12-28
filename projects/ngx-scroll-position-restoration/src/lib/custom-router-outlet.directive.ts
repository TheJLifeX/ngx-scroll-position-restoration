
import { isPlatformServer } from '@angular/common';
import { Directive, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { ElementRef } from '@angular/core';
import { ActivatedRoute, Event as RouterNavigationEvent, NavigationStart } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import * as DomUtils from './dom-utils';
import { NgxScrollPositionRestorationConfig } from './ngx-scroll-position-restoration-config';
import { NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN } from './ngx-scroll-position-restoration-config-injection-token';
import { NgxScrollPositionRestorationService } from './ngx-scroll-position-restoration.service';

const ANGULAR_DEFAULT_ROUTER_OUTLET_NAME = 'primary';

/**
 * I co-opt the <router-outlet> element selector so that I can tap into the life-cycle of the core RouterOutlet directive.
 * 
 * REASON: When the user clicks on a link, it's quite hard to differentiate between a primary navigation, which should probably scroll the user back to the top of the viewport; and, something like a tabbed-navigation, which should probably keep the user's scroll around the offset associated with the tab. As such, we are going to rely on the inherent scroll-position of the view as the router-outlet target is pulled out of the DOM.
 * PS: Keep in mind in Angular per default scroll position is maintained on navigation.
 */
@Directive({
  selector: 'router-outlet'
})
export class CustomRouterOutletDirective implements OnDestroy {

  private recordedScrollPositions: RecordedScrollPosition[] = [];

  private directiveDestroyed$ = new Subject<void>();

  private navigationTrigger: 'imperative' | 'popstate' | 'hashchange' | undefined;

  constructor(
    private elementRef: ElementRef<Element>,
    private router: Router,
    private routerOutlet: RouterOutlet,
    private ngxScrollPositionRestorationService: NgxScrollPositionRestorationService,
    @Inject(PLATFORM_ID) private platformId: string,
    @Inject(NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN) private config: NgxScrollPositionRestorationConfig
  ) { }

  ngOnInit(): void {
    if (isPlatformServer(this.platformId)) {
      return;
    }

    this.routerOutlet.activateEvents.pipe(
      takeUntil(this.directiveDestroyed$)
    ).subscribe(() => this.handleActivateEvent());

    this.routerOutlet.deactivateEvents.pipe(
      takeUntil(this.directiveDestroyed$)
    ).subscribe(() => this.handleDectivateEvent());

    this.router.events.pipe(
      takeUntil(this.directiveDestroyed$)
    ).subscribe((event: RouterNavigationEvent) => this.handleNavigationEvent(event));
  }

  ngOnDestroy(): void {
    this.directiveDestroyed$.next();
    this.directiveDestroyed$.complete();
  }

  /**
   * Called when a router-outlet component has been rendered.
   */
  private handleActivateEvent(): void {
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
      DomUtils.scrollTo(window, 0);
      if (this.config.debug) {
        console.log('Imperative navigation: scrolled to the top (scrollTop = 0) of the window.');
      }
    } else {

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
          const element = DomUtils.select(elementSelector);
          if (element) {
            DomUtils.scrollTo(element, scrollPosition);
          }
        }
      }

      this.recordedScrollPositions = [];
    }
  }

  /**
   * Called when a router-outlet component has been destroyed from the DOM. This means, at this point, the scroll position of the scrollable element containing the router-outlet component should be `0` (@todo: (BUG) but this seems not to work in Angular@13.1.1: component is not destroyed at this point).
   */
  private handleDectivateEvent(): void {

    // At this point, the View-in-question has already been removed from the 
    // document. Let's walk up the DOM (Document Object Model) and record the scroll
    // position of all scrollable elements. This will give us a sense of what the DOM
    // should look like after the next View is injected.
    let node = this.elementRef.nativeElement.parentNode as Element;
    while (node && node.tagName !== 'BODY') {
      // If this is an "Element" node, capture its offset.
      if (node.nodeType === 1) {
        const scrollTop = DomUtils.getScrollTop(node);
        const elementSelector = DomUtils.getSelector(node);
        this.recordedScrollPositions.push({
          elementSelector,
          target: node,
          scrollPosition: scrollTop
        });
      }
      node = node.parentNode as Element;
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
  private handleNavigationEvent(event: RouterNavigationEvent): void {
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
  private isRootRouterOutlet(actvitedRoute: ActivatedRoute): boolean {
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

interface RecordedScrollPosition {
  elementSelector: string | null;
  scrollPosition: number;
  target: any
}

/**
 * Source:
 * - https://www.bennadel.com/blog/3534-restoring-and-resetting-the-scroll-position-using-the-navigationstart-event-in-angular-7-0-4.htm
 * - http://bennadel.github.io/JavaScript-Demos/demos/router-retain-scroll-polyfill-angular7/
 * - https://github.com/bennadel/JavaScript-Demos/tree/master/demos/router-retain-scroll-polyfill-angular7
 */