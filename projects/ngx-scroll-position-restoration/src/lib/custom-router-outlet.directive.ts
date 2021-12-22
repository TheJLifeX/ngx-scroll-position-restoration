
import { isPlatformServer } from '@angular/common';
import { Directive, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { ElementRef } from '@angular/core';
import { Event as RouterNavigationEvent } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import * as DomUtils from './dom-utils';

/**
 * @todo: I am not sure if this CustomRouterOutletDirective is really necessary (I could not find the case when it is usefull).
 * 
 * I think, it used to preserve scroll position of the "window" when you navigated within a named router-outlet.
 */
// I co-opt the <router-outlet> element selector so that I can tap into the life-cycle
// of the core RouterOutlet directive.
// --
// REASON: When the user clicks on a link, it's quite hard to differentiate between a
// primary navigation, which should probably scroll the user back to the top of the
// viewport; and, something like a tabbed-navigation, which should probably keep the
// user's scroll around the offset associated with the tab. As such, we are going to
// rely on the inherent scroll-position of the view as the router-outlet target is
// pulled out of the DOM.
@Directive({
  selector: 'router-outlet'
})
export class CustomRouterOutletDirective implements OnDestroy {

  private scrollTopPositions: number[] = [];

  private directiveDestroyed$ = new Subject<void>();

  constructor(
    private elementRef: ElementRef<Node>,
    private router: Router,
    private routerOutlet: RouterOutlet,
    @Inject(PLATFORM_ID) private platformId: string
  ) { }

  ngOnInit(): void {
    if (isPlatformServer(this.platformId)) {
      return;
    }

    // In order to help with natural scroll behavior, we have to listen for the
    // creation and destruction of router View component.s		
    this.routerOutlet.activateEvents.pipe(
      takeUntil(this.directiveDestroyed$)
    ).subscribe(() => this.handleActivateEvent());

    this.routerOutlet.deactivateEvents.pipe(
      takeUntil(this.directiveDestroyed$)
    ).subscribe(() => this.handleDectivateEvent());

    // In order to make sure the offsets don't get applied inappropriately in the
    // future, we have to listen for navigation events.
    this.router.events.pipe(
      takeUntil(this.directiveDestroyed$)
    ).subscribe((event: RouterNavigationEvent) => this.handleNavigationEvent(event));
  }

  ngOnDestroy(): void {
    this.directiveDestroyed$.next();
    this.directiveDestroyed$.complete();
  }

  /**
   * I get called when a new router view component is being rendered.
   */
  private handleActivateEvent(): void {
    if (!this.scrollTopPositions.length) {
      return;
    }

    // console.group('Ensuring ancestral scroll offsets in new navigation');
    // console.log(this.scrollTopPositions.slice());
    // console.groupEnd();

    // At this point, the View-in-question has been mounted in the DOM (Document
    // Object Model). We can now walk back up the DOM and make sure that the
    // previously-recorded offsets (in the last 'deactivate' event) are being applied
    // to the ancestral elements. This will prevent the browser's native desire to 
    // auto-scroll-down a document once the view has been injected. Essentially, this
    // ensures that we scroll back to the 'expected top' as the user clicks through
    // the application.
    let node = this.elementRef.nativeElement.parentNode;

    while (node) {
      // If this is an "Element" node, set its offset.
      if (node.nodeType === 1) {
        DomUtils.scrollTo(node as Element, this.scrollTopPositions.shift() || 0);
      }
      node = node.parentNode;
    }

    // At the top, we'll always set the window's scroll.
    DomUtils.scrollTo(window, this.scrollTopPositions.shift() || 0);
  }

  /**
   * I get called when an existing router view component is being unmounted.
   */
  private handleDectivateEvent(): void {

    // At this point, the View-in-question has already been removed from the 
    // document. Let's walk up the DOM (Document Object Model) and record the scroll
    // position of all scrollable elements. This will give us a sense of what the DOM
    // should look like after the next View is injected.
    let node = this.elementRef.nativeElement.parentNode;
    while (node) {
      // If this is an "Element" node, capture its offset.
      if (node.nodeType === 1) {
        const scrollTop = DomUtils.getScrollTop(node as Element);
        this.scrollTopPositions.push(scrollTop);
      }
      node = node.parentNode;
    }

    // At the top, we'll always record the window's scroll.
    const scrollTop = DomUtils.getScrollTop(window);
    this.scrollTopPositions.push(scrollTop);
  }

  /**
   * I get called whenever a router event is raised.
   */
  private handleNavigationEvent(event: RouterNavigationEvent): void {

    // The 'offsets' are only meant to be used across a single navigation. As such,
    // let's clear out the offsets at the end of each navigation in order to ensure
    // that old offsets don't accidentally get applied to a future view mounted by
    // the current router-outlet.
    if (event instanceof NavigationEnd) {
      this.scrollTopPositions = [];
    }
  }
}

/**
 * Source:
 * - https://www.bennadel.com/blog/3534-restoring-and-resetting-the-scroll-position-using-the-navigationstart-event-in-angular-7-0-4.htm
 * - http://bennadel.github.io/JavaScript-Demos/demos/router-retain-scroll-polyfill-angular7/
 * - https://github.com/bennadel/JavaScript-Demos/tree/master/demos/router-retain-scroll-polyfill-angular7
 */