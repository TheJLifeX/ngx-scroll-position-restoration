import { ModuleWithProviders } from '@angular/core';
import { NgxScrollPositionRestorationConfig } from './ngx-scroll-position-restoration-config';
import { NgxScrollPositionRestorationService } from './ngx-scroll-position-restoration.service';
import * as i0 from "@angular/core";
import * as i1 from "./custom-router-outlet.directive";
export declare class NgxScrollPositionRestorationModule {
    /**
     * Since NgxScrollPositionRestorationModule can be imported in child modules, it is needed to track if the ngxScrollPositionRestorationService has been already initialized to avoid duplicate calls of the `initialize` method.
     */
    private static serviceInitialized;
    constructor(ngxScrollPositionRestorationService: NgxScrollPositionRestorationService);
    static forRoot(config?: NgxScrollPositionRestorationConfig): ModuleWithProviders<NgxScrollPositionRestorationModule>;
    static ɵfac: i0.ɵɵFactoryDeclaration<NgxScrollPositionRestorationModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<NgxScrollPositionRestorationModule, [typeof i1.CustomRouterOutletDirective], never, [typeof i1.CustomRouterOutletDirective]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<NgxScrollPositionRestorationModule>;
}
