import { OnDestroy } from '@angular/core';
import { ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { NgxScrollPositionRestorationConfig } from './ngx-scroll-position-restoration-config';
import { NgxScrollPositionRestorationService } from './ngx-scroll-position-restoration.service';
import * as i0 from "@angular/core";
/**
 * I co-opt the <router-outlet> element selector so that I can tap into the life-cycle of the core RouterOutlet directive.
 *
 * REASON: When the user clicks on a link, it's quite hard to differentiate between a primary navigation, which should probably scroll the user back to the top of the viewport; and, something like a tabbed-navigation, which should probably keep the user's scroll around the offset associated with the tab. As such, we are going to rely on the inherent scroll-position of the view as the router-outlet target is pulled out of the DOM.
 * PS: Keep in mind in Angular per default scroll position is maintained on navigation.
 */
export declare class CustomRouterOutletDirective implements OnDestroy {
    private elementRef;
    private router;
    private routerOutlet;
    private ngxScrollPositionRestorationService;
    private platformId;
    private config;
    private recordedScrollPositions;
    private directiveDestroyed$;
    private navigationTrigger;
    constructor(elementRef: ElementRef<Element>, router: Router, routerOutlet: RouterOutlet, ngxScrollPositionRestorationService: NgxScrollPositionRestorationService, platformId: string, config: NgxScrollPositionRestorationConfig);
    ngOnInit(): void;
    ngOnDestroy(): void;
    /**
     * Called when a router-outlet component has been rendered.
     */
    private handleActivateEvent;
    /**
     * Called when a router-outlet component has been destroyed from the DOM. This means, at this point, the scroll position of the scrollable element containing the router-outlet component should be `0` (@todo: (BUG) but this seems not to work in Angular@13.1.1: component is not destroyed at this point).
     */
    private handleDectivateEvent;
    /**
     * I get called whenever a router event is raised.
     */
    private handleNavigationEvent;
    /**
     * Is root "primary" (or any secondary) router-outet.
     */
    private isRootRouterOutlet;
    static ɵfac: i0.ɵɵFactoryDeclaration<CustomRouterOutletDirective, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<CustomRouterOutletDirective, "router-outlet", never, {}, {}, never>;
}
