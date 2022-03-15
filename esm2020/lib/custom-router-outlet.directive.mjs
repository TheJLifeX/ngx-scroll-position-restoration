import { isPlatformServer } from '@angular/common';
import { Directive, Inject, PLATFORM_ID } from '@angular/core';
import { NavigationStart } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import * as DomUtils from './dom-utils';
import { NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN } from './ngx-scroll-position-restoration-config-injection-token';
import * as i0 from "@angular/core";
import * as i1 from "@angular/router";
import * as i2 from "./ngx-scroll-position-restoration.service";
const ANGULAR_DEFAULT_ROUTER_OUTLET_NAME = 'primary';
/**
 * I co-opt the <router-outlet> element selector so that I can tap into the life-cycle of the core RouterOutlet directive.
 *
 * REASON: When the user clicks on a link, it's quite hard to differentiate between a primary navigation, which should probably scroll the user back to the top of the viewport; and, something like a tabbed-navigation, which should probably keep the user's scroll around the offset associated with the tab. As such, we are going to rely on the inherent scroll-position of the view as the router-outlet target is pulled out of the DOM.
 * PS: Keep in mind in Angular per default scroll position is maintained on navigation.
 */
export class CustomRouterOutletDirective {
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
            DomUtils.scrollTo(window, 0);
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
    handleDectivateEvent() {
        // At this point, the View-in-question has already been removed from the 
        // document. Let's walk up the DOM (Document Object Model) and record the scroll
        // position of all scrollable elements. This will give us a sense of what the DOM
        // should look like after the next View is injected.
        let node = this.elementRef.nativeElement.parentNode;
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
CustomRouterOutletDirective.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: CustomRouterOutletDirective, deps: [{ token: i0.ElementRef }, { token: i1.Router }, { token: i1.RouterOutlet }, { token: i2.NgxScrollPositionRestorationService }, { token: PLATFORM_ID }, { token: NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN }], target: i0.ɵɵFactoryTarget.Directive });
CustomRouterOutletDirective.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "12.0.0", version: "13.1.1", type: CustomRouterOutletDirective, selector: "router-outlet", ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: CustomRouterOutletDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: 'router-outlet'
                }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: i1.Router }, { type: i1.RouterOutlet }, { type: i2.NgxScrollPositionRestorationService }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN]
                }] }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tLXJvdXRlci1vdXRsZXQuZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LXNjcm9sbC1wb3NpdGlvbi1yZXN0b3JhdGlvbi9zcmMvbGliL2N1c3RvbS1yb3V0ZXItb3V0bGV0LmRpcmVjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBYSxXQUFXLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFMUUsT0FBTyxFQUFrRCxlQUFlLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDMUMsT0FBTyxLQUFLLFFBQVEsTUFBTSxhQUFhLENBQUM7QUFFeEMsT0FBTyxFQUFFLHNEQUFzRCxFQUFFLE1BQU0sMERBQTBELENBQUM7Ozs7QUFHbEksTUFBTSxrQ0FBa0MsR0FBRyxTQUFTLENBQUM7QUFFckQ7Ozs7O0dBS0c7QUFJSCxNQUFNLE9BQU8sMkJBQTJCO0lBUXRDLFlBQ1UsVUFBK0IsRUFDL0IsTUFBYyxFQUNkLFlBQTBCLEVBQzFCLG1DQUF3RSxFQUNuRCxVQUFrQixFQUN5QixNQUEwQztRQUwxRyxlQUFVLEdBQVYsVUFBVSxDQUFxQjtRQUMvQixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsaUJBQVksR0FBWixZQUFZLENBQWM7UUFDMUIsd0NBQW1DLEdBQW5DLG1DQUFtQyxDQUFxQztRQUNuRCxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ3lCLFdBQU0sR0FBTixNQUFNLENBQW9DO1FBWjVHLDRCQUF1QixHQUE2QixFQUFFLENBQUM7UUFFdkQsd0JBQW1CLEdBQUcsSUFBSSxPQUFPLEVB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QUFXOzswQkFDbEIsTUFBTTsyQkFBQyxzREFBc0QiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7IGlzUGxhdGZvcm1TZXJ2ZXIgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHsgRGlyZWN0aXZlLCBJbmplY3QsIE9uRGVzdHJveSwgUExBVEZPUk1fSUQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEVsZW1lbnRSZWYgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEFjdGl2YXRlZFJvdXRlLCBFdmVudCBhcyBSb3V0ZXJOYXZpZ2F0aW9uRXZlbnQsIE5hdmlnYXRpb25TdGFydCB9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5pbXBvcnQgeyBOYXZpZ2F0aW9uRW5kIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IFJvdXRlciB9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5pbXBvcnQgeyBSb3V0ZXJPdXRsZXQgfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHsgU3ViamVjdCwgdGFrZVVudGlsIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBEb21VdGlscyBmcm9tICcuL2RvbS11dGlscyc7XG5pbXBvcnQgeyBOZ3hTY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uQ29uZmlnIH0gZnJvbSAnLi9uZ3gtc2Nyb2xsLXBvc2l0aW9uLXJlc3RvcmF0aW9uLWNvbmZpZyc7XG5pbXBvcnQgeyBOR1hfU0NST0xMX1BPU0lUSU9OX1JFU1RPUkFUSU9OX0NPTkZJR19JTkpFQ1RJT05fVE9LRU4gfSBmcm9tICcuL25neC1zY3JvbGwtcG9zaXRpb24tcmVzdG9yYXRpb24tY29uZmlnLWluamVjdGlvbi10b2tlbic7XG5pbXBvcnQgeyBOZ3hTY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uU2VydmljZSB9IGZyb20gJy4vbmd4LXNjcm9sbC1wb3NpdGlvbi1yZXN0b3JhdGlvbi5zZXJ2aWNlJztcblxuY29uc3QgQU5HVUxBUl9ERUZBVUxUX1JPVVRFUl9PVVRMRVRfTkFNRSA9ICdwcmltYXJ5JztcblxuLyoqXG4gKiBJIGNvLW9wdCB0aGUgPHJvdXRlci1vdXRsZXQ+IGVsZW1lbnQgc2VsZWN0b3Igc28gdGhhdCBJIGNhbiB0YXAgaW50byB0aGUgbGlmZS1jeWNsZSBvZiB0aGUgY29yZSBSb3V0ZXJPdXRsZXQgZGlyZWN0aXZlLlxuICogXG4gKiBSRUFTT046IFdoZW4gdGhlIHVzZXIgY2xpY2tzIG9uIGEgbGluaywgaXQncyBxdWl0ZSBoYXJkIHRvIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBhIHByaW1hcnkgbmF2aWdhdGlvbiwgd2hpY2ggc2hvdWxkIHByb2JhYmx5IHNjcm9sbCB0aGUgdXNlciBiYWNrIHRvIHRoZSB0b3Agb2YgdGhlIHZpZXdwb3J0OyBhbmQsIHNvbWV0aGluZyBsaWtlIGEgdGFiYmVkLW5hdmlnYXRpb24sIHdoaWNoIHNob3VsZCBwcm9iYWJseSBrZWVwIHRoZSB1c2VyJ3Mgc2Nyb2xsIGFyb3VuZCB0aGUgb2Zmc2V0IGFzc29jaWF0ZWQgd2l0aCB0aGUgdGFiLiBBcyBzdWNoLCB3ZSBhcmUgZ29pbmcgdG8gcmVseSBvbiB0aGUgaW5oZXJlbnQgc2Nyb2xsLXBvc2l0aW9uIG9mIHRoZSB2aWV3IGFzIHRoZSByb3V0ZXItb3V0bGV0IHRhcmdldCBpcyBwdWxsZWQgb3V0IG9mIHRoZSBET00uXG4gKiBQUzogS2VlcCBpbiBtaW5kIGluIEFuZ3VsYXIgcGVyIGRlZmF1bHQgc2Nyb2xsIHBvc2l0aW9uIGlzIG1haW50YWluZWQgb24gbmF2aWdhdGlvbi5cbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAncm91dGVyLW91dGxldCdcbn0pXG5leHBvcnQgY2xhc3MgQ3VzdG9tUm91dGVyT3V0bGV0RGlyZWN0aXZlIGltcGxlbWVudHMgT25EZXN0cm95IHtcblxuICBwcml2YXRlIHJlY29yZGVkU2Nyb2xsUG9zaXRpb25zOiBSZWNvcmRlZFNjcm9sbFBvc2l0aW9uW10gPSBbXTtcblxuICBwcml2YXRlIGRpcmVjdGl2ZURlc3Ryb3llZCQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xuXG4gIHByaXZhdGUgbmF2aWdhdGlvblRyaWdnZXI6ICdpbXBlcmF0aXZlJyB8ICdwb3BzdGF0ZScgfCAnaGFzaGNoYW5nZScgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBlbGVtZW50UmVmOiBFbGVtZW50UmVmPEVsZW1lbnQ+LFxuICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsXG4gICAgcHJpdmF0ZSByb3V0ZXJPdXRsZXQ6IFJvdXRlck91dGxldCxcbiAgICBwcml2YXRlIG5neFNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb25TZXJ2aWNlOiBOZ3hTY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uU2VydmljZSxcbiAgICBASW5qZWN0KFBMQVRGT1JNX0lEKSBwcml2YXRlIHBsYXRmb3JtSWQ6IHN0cmluZyxcbiAgICBASW5qZWN0KE5HWF9TQ1JPTExfUE9TSVRJT05fUkVTVE9SQVRJT05fQ09ORklHX0lOSkVDVElPTl9UT0tFTikgcHJpdmF0ZSBjb25maWc6IE5neFNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb25Db25maWdcbiAgKSB7IH1cblxuICBuZ09uSW5pdCgpOiB2b2lkIHtcbiAgICBpZiAoaXNQbGF0Zm9ybVNlcnZlcih0aGlzLnBsYXRmb3JtSWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5yb3V0ZXJPdXRsZXQuYWN0aXZhdGVFdmVudHMucGlwZShcbiAgICAgIHRha2VVbnRpbCh0aGlzLmRpcmVjdGl2ZURlc3Ryb3llZCQpXG4gICAgKS5zdWJzY3JpYmUoKCkgPT4gdGhpcy5oYW5kbGVBY3RpdmF0ZUV2ZW50KCkpO1xuXG4gICAgdGhpcy5yb3V0ZXJPdXRsZXQuZGVhY3RpdmF0ZUV2ZW50cy5waXBlKFxuICAgICAgdGFrZVVudGlsKHRoaXMuZGlyZWN0aXZlRGVzdHJveWVkJClcbiAgICApLnN1YnNjcmliZSgoKSA9PiB0aGlzLmhhbmRsZURlY3RpdmF0ZUV2ZW50KCkpO1xuXG4gICAgdGhpcy5yb3V0ZXIuZXZlbnRzLnBpcGUoXG4gICAgICB0YWtlVW50aWwodGhpcy5kaXJlY3RpdmVEZXN0cm95ZWQkKVxuICAgICkuc3Vic2NyaWJlKChldmVudDogUm91dGVyTmF2aWdhdGlvbkV2ZW50KSA9PiB0aGlzLmhhbmRsZU5hdmlnYXRpb25FdmVudChldmVudCkpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kaXJlY3RpdmVEZXN0cm95ZWQkLm5leHQoKTtcbiAgICB0aGlzLmRpcmVjdGl2ZURlc3Ryb3llZCQuY29tcGxldGUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiBhIHJvdXRlci1vdXRsZXQgY29tcG9uZW50IGhhcyBiZWVuIHJlbmRlcmVkLlxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVBY3RpdmF0ZUV2ZW50KCk6IHZvaWQge1xuICAgIGNvbnN0IGN1cnJlbnRSb3V0ZXJPdXRsZXROYW1lID0gdGhpcy5yb3V0ZXJPdXRsZXQuYWN0aXZhdGVkUm91dGUub3V0bGV0O1xuICAgIGNvbnN0IGN1cnJlbnROYXZpZ2F0aW9uID0gdGhpcy5yb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb24oKTtcbiAgICBpZiAoY3VycmVudFJvdXRlck91dGxldE5hbWUgIT09IEFOR1VMQVJfREVGQVVMVF9ST1VURVJfT1VUTEVUX05BTUVcbiAgICAgICYmICEoY3VycmVudE5hdmlnYXRpb24/LmV4dHJhcz8uc2tpcExvY2F0aW9uQ2hhbmdlKSkge1xuICAgICAgdGhpcy5uZ3hTY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uU2VydmljZS5jbGVhclNhdmVkV2luZG93U2Nyb2xsVG9wSW5MYXN0TmF2aWdhdGlvbigpO1xuICAgIH1cblxuICAgIGNvbnN0IGlzUm9vdFJvdXRlck91dGxldCA9IHRoaXMuaXNSb290Um91dGVyT3V0bGV0KHRoaXMucm91dGVyT3V0bGV0LmFjdGl2YXRlZFJvdXRlKTtcbiAgICBpZiAoaXNSb290Um91dGVyT3V0bGV0XG4gICAgICAmJiB0aGlzLm5hdmlnYXRpb25UcmlnZ2VyID09PSAnaW1wZXJhdGl2ZSdcbiAgICAgICYmIHRoaXMucm91dGVyT3V0bGV0LmFjdGl2YXRlZFJvdXRlLm91dGxldCA9PT0gQU5HVUxBUl9ERUZBVUxUX1JPVVRFUl9PVVRMRVRfTkFNRSkge1xuICAgICAgRG9tVXRpbHMuc2Nyb2xsVG8od2luZG93LCAwKTtcbiAgICAgIGlmICh0aGlzLmNvbmZpZy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmxvZygnSW1wZXJhdGl2ZSBuYXZpZ2F0aW9uOiBzY3JvbGxlZCB0byB0aGUgdG9wIChzY3JvbGxUb3AgPSAwKSBvZiB0aGUgd2luZG93LicpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG5cbiAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIHRoZSBWaWV3LWluLXF1ZXN0aW9uIGhhcyBiZWVuIG1vdW50ZWQgaW4gdGhlIERPTSAoRG9jdW1lbnRcbiAgICAgIC8vIE9iamVjdCBNb2RlbCkuIFdlIGNhbiBub3cgd2FsayBiYWNrIHVwIHRoZSBET00gYW5kIG1ha2Ugc3VyZSB0aGF0IHRoZVxuICAgICAgLy8gcHJldmlvdXNseS1yZWNvcmRlZCBvZmZzZXRzIChpbiB0aGUgbGFzdCAnZGVhY3RpdmF0ZScgZXZlbnQpIGFyZSBiZWluZyBhcHBsaWVkXG4gICAgICAvLyB0byB0aGUgYW5jZXN0cmFsIGVsZW1lbnRzLiBUaGlzIHdpbGwgcHJldmVudCB0aGUgYnJvd3NlcidzIG5hdGl2ZSBkZXNpcmUgdG8gXG4gICAgICAvLyBhdXRvLXNjcm9sbC1kb3duIGEgZG9jdW1lbnQgb25jZSB0aGUgdmlldyBoYXMgYmVlbiBpbmplY3RlZC4gRXNzZW50aWFsbHksIHRoaXNcbiAgICAgIC8vIGVuc3VyZXMgdGhhdCB3ZSBzY3JvbGwgYmFjayB0byB0aGUgJ2V4cGVjdGVkIHRvcCcgYXMgdGhlIHVzZXIgY2xpY2tzIHRocm91Z2hcbiAgICAgIC8vIHRoZSBhcHBsaWNhdGlvbi5cblxuICAgICAgaWYgKHRoaXMuY29uZmlnLmRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUuZ3JvdXAoYHJvdXRlci1vdXRsZXQgKFwiJHt0aGlzLmVsZW1lbnRSZWYubmF0aXZlRWxlbWVudC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSB8fCBBTkdVTEFSX0RFRkFVTFRfUk9VVEVSX09VVExFVF9OQU1FfVwiKSAtIFJlYXBwbHkgcmVjb3JkZWQgc2Nyb2xsIHBvc2l0aW9ucy5gKTtcbiAgICAgICAgY29uc29sZS5sb2codGhpcy5yZWNvcmRlZFNjcm9sbFBvc2l0aW9ucy5zbGljZSgpKTtcbiAgICAgICAgY29uc29sZS5ncm91cEVuZCgpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5yZWNvcmRlZFNjcm9sbFBvc2l0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHsgZWxlbWVudFNlbGVjdG9yLCBzY3JvbGxQb3NpdGlvbiB9IG9mIHRoaXMucmVjb3JkZWRTY3JvbGxQb3NpdGlvbnMpIHtcbiAgICAgICAgaWYgKGVsZW1lbnRTZWxlY3Rvcikge1xuICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBEb21VdGlscy5zZWxlY3QoZWxlbWVudFNlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgRG9tVXRpbHMuc2Nyb2xsVG8oZWxlbWVudCwgc2Nyb2xsUG9zaXRpb24pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLnJlY29yZGVkU2Nyb2xsUG9zaXRpb25zID0gW107XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIGEgcm91dGVyLW91dGxldCBjb21wb25lbnQgaGFzIGJlZW4gZGVzdHJveWVkIGZyb20gdGhlIERPTS4gVGhpcyBtZWFucywgYXQgdGhpcyBwb2ludCwgdGhlIHNjcm9sbCBwb3NpdGlvbiBvZiB0aGUgc2Nyb2xsYWJsZSBlbGVtZW50IGNvbnRhaW5pbmcgdGhlIHJvdXRlci1vdXRsZXQgY29tcG9uZW50IHNob3VsZCBiZSBgMGAgKEB0b2RvOiAoQlVHKSBidXQgdGhpcyBzZWVtcyBub3QgdG8gd29yayBpbiBBbmd1bGFyQDEzLjEuMTogY29tcG9uZW50IGlzIG5vdCBkZXN0cm95ZWQgYXQgdGhpcyBwb2ludCkuXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZURlY3RpdmF0ZUV2ZW50KCk6IHZvaWQge1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIFZpZXctaW4tcXVlc3Rpb24gaGFzIGFscmVhZHkgYmVlbiByZW1vdmVkIGZyb20gdGhlIFxuICAgIC8vIGRvY3VtZW50LiBMZXQncyB3YWxrIHVwIHRoZSBET00gKERvY3VtZW50IE9iamVjdCBNb2RlbCkgYW5kIHJlY29yZCB0aGUgc2Nyb2xsXG4gICAgLy8gcG9zaXRpb24gb2YgYWxsIHNjcm9sbGFibGUgZWxlbWVudHMuIFRoaXMgd2lsbCBnaXZlIHVzIGEgc2Vuc2Ugb2Ygd2hhdCB0aGUgRE9NXG4gICAgLy8gc2hvdWxkIGxvb2sgbGlrZSBhZnRlciB0aGUgbmV4dCBWaWV3IGlzIGluamVjdGVkLlxuICAgIGxldCBub2RlID0gdGhpcy5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQucGFyZW50Tm9kZSBhcyBFbGVtZW50O1xuICAgIHdoaWxlIChub2RlICYmIG5vZGUudGFnTmFtZSAhPT0gJ0JPRFknKSB7XG4gICAgICAvLyBJZiB0aGlzIGlzIGFuIFwiRWxlbWVudFwiIG5vZGUsIGNhcHR1cmUgaXRzIG9mZnNldC5cbiAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIGNvbnN0IHNjcm9sbFRvcCA9IERvbVV0aWxzLmdldFNjcm9sbFRvcChub2RlKTtcbiAgICAgICAgY29uc3QgZWxlbWVudFNlbGVjdG9yID0gRG9tVXRpbHMuZ2V0U2VsZWN0b3Iobm9kZSk7XG4gICAgICAgIHRoaXMucmVjb3JkZWRTY3JvbGxQb3NpdGlvbnMucHVzaCh7XG4gICAgICAgICAgZWxlbWVudFNlbGVjdG9yLFxuICAgICAgICAgIHRhcmdldDogbm9kZSxcbiAgICAgICAgICBzY3JvbGxQb3NpdGlvbjogc2Nyb2xsVG9wXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZSBhcyBFbGVtZW50O1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5kZWJ1Zykge1xuICAgICAgY29uc29sZS5ncm91cChgcm91dGVyLW91dGxldCAoXCIke3RoaXMuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LmdldEF0dHJpYnV0ZSgnbmFtZScpIHx8IEFOR1VMQVJfREVGQVVMVF9ST1VURVJfT1VUTEVUX05BTUV9XCIpIC0gUmVjb3JkZWQgc2Nyb2xsIHBvc2l0aW9ucy5gKTtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMucmVjb3JkZWRTY3JvbGxQb3NpdGlvbnMuc2xpY2UoKSk7XG4gICAgICBjb25zb2xlLmdyb3VwRW5kKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEkgZ2V0IGNhbGxlZCB3aGVuZXZlciBhIHJvdXRlciBldmVudCBpcyByYWlzZWQuXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZU5hdmlnYXRpb25FdmVudChldmVudDogUm91dGVyTmF2aWdhdGlvbkV2ZW50KTogdm9pZCB7XG4gICAgaWYgKGV2ZW50IGluc3RhbmNlb2YgTmF2aWdhdGlvblN0YXJ0KSB7XG4gICAgICB0aGlzLm5hdmlnYXRpb25UcmlnZ2VyID0gZXZlbnQubmF2aWdhdGlvblRyaWdnZXI7XG4gICAgfVxuXG4gICAgLy8gVGhlICdvZmZzZXRzJyBhcmUgb25seSBtZWFudCB0byBiZSB1c2VkIGFjcm9zcyBhIHNpbmdsZSBuYXZpZ2F0aW9uLiBBcyBzdWNoLFxuICAgIC8vIGxldCdzIGNsZWFyIG91dCB0aGUgb2Zmc2V0cyBhdCB0aGUgZW5kIG9mIGVhY2ggbmF2aWdhdGlvbiBpbiBvcmRlciB0byBlbnN1cmVcbiAgICAvLyB0aGF0IG9sZCBvZmZzZXRzIGRvbid0IGFjY2lkZW50YWxseSBnZXQgYXBwbGllZCB0byBhIGZ1dHVyZSB2aWV3IG1vdW50ZWQgYnlcbiAgICAvLyB0aGUgY3VycmVudCByb3V0ZXItb3V0bGV0LlxuICAgIGlmIChldmVudCBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgIHRoaXMucmVjb3JkZWRTY3JvbGxQb3NpdGlvbnMgPSBbXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSXMgcm9vdCBcInByaW1hcnlcIiAob3IgYW55IHNlY29uZGFyeSkgcm91dGVyLW91dGV0LlxuICAgKi9cbiAgcHJpdmF0ZSBpc1Jvb3RSb3V0ZXJPdXRsZXQoYWN0dml0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUpOiBib29sZWFuIHtcbiAgICBjb25zdCBjdXJyZW50Q29tcG9uZW50ID0gYWN0dml0ZWRSb3V0ZS5jb21wb25lbnQ7XG4gICAgY29uc3QgcGFyZW50Q2hpbGRyZW4gPSBhY3R2aXRlZFJvdXRlLnBhcmVudD8ucm91dGVDb25maWc/LmNoaWxkcmVuO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShwYXJlbnRDaGlsZHJlbikpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGZvciAoY29uc3Qgcm91dGUgb2YgcGFyZW50Q2hpbGRyZW4pIHtcbiAgICAgIGlmIChyb3V0ZS5jb21wb25lbnQgPT09IGN1cnJlbnRDb21wb25lbnQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIEFsdGVybmF0aXZlOiBzb2x1dGlvbiAwMiAoYnV0IG5vdCB2YWxpZCBmb3Igc2Vjb25kYXJ5IHJvdXRlci1vdXRsZXQpXG4gICAgLy8gaWYgKGFjdHZpdGVkUm91dGUucGFyZW50Py5jb21wb25lbnQpIHtcbiAgICAvLyAgIHJldHVybiBmYWxzZTtcbiAgICAvLyB9IGVsc2Uge1xuICAgIC8vICAgcmV0dXJuIHRydWU7XG4gICAgLy8gfVxuICB9XG59XG5cbmludGVyZmFjZSBSZWNvcmRlZFNjcm9sbFBvc2l0aW9uIHtcbiAgZWxlbWVudFNlbGVjdG9yOiBzdHJpbmcgfCBudWxsO1xuICBzY3JvbGxQb3NpdGlvbjogbnVtYmVyO1xuICB0YXJnZXQ6IGFueVxufVxuXG4vKipcbiAqIFNvdXJjZTpcbiAqIC0gaHR0cHM6Ly93d3cuYmVubmFkZWwuY29tL2Jsb2cvMzUzNC1yZXN0b3JpbmctYW5kLXJlc2V0dGluZy10aGUtc2Nyb2xsLXBvc2l0aW9uLXVzaW5nLXRoZS1uYXZpZ2F0aW9uc3RhcnQtZXZlbnQtaW4tYW5ndWxhci03LTAtNC5odG1cbiAqIC0gaHR0cDovL2Jlbm5hZGVsLmdpdGh1Yi5pby9KYXZhU2NyaXB0LURlbW9zL2RlbW9zL3JvdXRlci1yZXRhaW4tc2Nyb2xsLXBvbHlmaWxsLWFuZ3VsYXI3L1xuICogLSBodHRwczovL2dpdGh1Yi5jb20vYmVubmFkZWwvSmF2YVNjcmlwdC1EZW1vcy90cmVlL21hc3Rlci9kZW1vcy9yb3V0ZXItcmV0YWluLXNjcm9sbC1wb2x5ZmlsbC1hbmd1bGFyN1xuICovIl19