import { NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NgxScrollPositionRestorationConfig } from './ngx-scroll-position-restoration-config';
import * as i0 from "@angular/core";
export declare class NgxScrollPositionRestorationService implements OnDestroy {
    private router;
    private zone;
    private platformId;
    private config;
    private applyStateToDomTimer;
    private currentPageState;
    private lastNavigationStartAt;
    private navigationIDs;
    private pageStates;
    private scrolledElements;
    private navigationID;
    private restoredNavigationID;
    private maximumNumberOfCachedPageStates;
    private serviceDestroyed$;
    constructor(router: Router, zone: NgZone, platformId: string, config: NgxScrollPositionRestorationConfig);
    /**
     * Initialize NgxScrollPositionRestorationService.
     */
    initialize(): void;
    ngOnDestroy(): void;
    clearSavedWindowScrollTopInLastNavigation(): void;
    /**
     * I attempt to apply the given page-state to the rendered DOM. I will continue to poll the document until all states have been reinstated; or, until the poll duration has been exceeded; or, until a subsequent navigation takes place.
     */
    private applyPageStateToDom;
    /**
     * I get the page state from the given set of nodes. This extracts the CSS selectors and offsets from the recorded elements.
     */
    private getPageStateFromNodes;
    /**
     * I determine if the given object is empty (ie, has no keys).
     */
    private objectIsEmpty;
    private handleNavigationStart;
    private handleNavigationEnd;
    /**
     * I bind to the scroll event and keep track of any elements that are scrolled in the rendered document.
     */
    private setupScrollBinding;
    private debugPageState;
    /**
     * Disable browser default scroll restoration.
     *
     * Documentation:
     * - https://developer.mozilla.org/en-US/docs/Web/API/History/scrollRestoration
     */
    private disableBrowserDefaultScrollRestoration;
    static ɵfac: i0.ɵɵFactoryDeclaration<NgxScrollPositionRestorationService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<NgxScrollPositionRestorationService>;
}
