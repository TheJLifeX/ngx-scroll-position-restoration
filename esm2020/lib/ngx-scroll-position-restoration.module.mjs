import { NgModule } from '@angular/core';
import { CustomRouterOutletDirective } from './custom-router-outlet.directive';
import { defaultNgxScrollPositionRestorationConfig } from './default-ngx-scroll-position-restoration-config';
import { NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN } from './ngx-scroll-position-restoration-config-injection-token';
import { NgxScrollPositionRestorationService } from './ngx-scroll-position-restoration.service';
import * as i0 from "@angular/core";
import * as i1 from "./ngx-scroll-position-restoration.service";
export class NgxScrollPositionRestorationModule {
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
NgxScrollPositionRestorationModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: NgxScrollPositionRestorationModule, deps: [{ token: i1.NgxScrollPositionRestorationService }], target: i0.ɵɵFactoryTarget.NgModule });
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
        }], ctorParameters: function () { return [{ type: i1.NgxScrollPositionRestorationService }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmd4LXNjcm9sbC1wb3NpdGlvbi1yZXN0b3JhdGlvbi5tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtc2Nyb2xsLXBvc2l0aW9uLXJlc3RvcmF0aW9uL3NyYy9saWIvbmd4LXNjcm9sbC1wb3NpdGlvbi1yZXN0b3JhdGlvbi5tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUF1QixRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDOUQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0UsT0FBTyxFQUFFLHlDQUF5QyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFN0csT0FBTyxFQUFFLHNEQUFzRCxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDbEksT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7OztBQWFoRyxNQUFNLE9BQU8sa0NBQWtDO0lBTzdDLFlBQVksbUNBQXdFO1FBQ2xGLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxrQkFBa0IsRUFBRTtZQUMxRCxtQ0FBbUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqRCxrQ0FBa0MsQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7U0FDOUQ7SUFDSCxDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUEyQztRQUN4RCxPQUFPLENBQUM7WUFDTixRQUFRLEVBQUUsa0NBQWtDO1lBQzVDLFNBQVMsRUFBRTtnQkFDVDtvQkFDRSxPQUFPLEVBQUUsc0RBQXNEO29CQUMvRCxRQUFRLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyx5Q0FBeUMsRUFBRSxNQUFNLENBQUM7aUJBQzNFO2FBQ0Y7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDOztBQXRCRDs7R0FFRztBQUNZLHFEQUFrQixHQUFHLEtBQU0sQ0FBQTsrSEFML0Isa0NBQWtDO2dJQUFsQyxrQ0FBa0MsaUJBVDNDLDJCQUEyQixhQUczQiwyQkFBMkI7Z0lBTWxCLGtDQUFrQyxhQUpsQztRQUNULG1DQUFtQztLQUNwQzsyRkFFVSxrQ0FBa0M7a0JBWDlDLFFBQVE7bUJBQUM7b0JBQ1IsWUFBWSxFQUFFO3dCQUNaLDJCQUEyQjtxQkFDNUI7b0JBQ0QsT0FBTyxFQUFFO3dCQUNQLDJCQUEyQjtxQkFDNUI7b0JBQ0QsU0FBUyxFQUFFO3dCQUNULG1DQUFtQztxQkFDcEM7aUJBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNb2R1bGVXaXRoUHJvdmlkZXJzLCBOZ01vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgQ3VzdG9tUm91dGVyT3V0bGV0RGlyZWN0aXZlIH0gZnJvbSAnLi9jdXN0b20tcm91dGVyLW91dGxldC5kaXJlY3RpdmUnO1xuaW1wb3J0IHsgZGVmYXVsdE5neFNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb25Db25maWcgfSBmcm9tICcuL2RlZmF1bHQtbmd4LXNjcm9sbC1wb3NpdGlvbi1yZXN0b3JhdGlvbi1jb25maWcnO1xuaW1wb3J0IHsgTmd4U2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbkNvbmZpZyB9IGZyb20gJy4vbmd4LXNjcm9sbC1wb3NpdGlvbi1yZXN0b3JhdGlvbi1jb25maWcnO1xuaW1wb3J0IHsgTkdYX1NDUk9MTF9QT1NJVElPTl9SRVNUT1JBVElPTl9DT05GSUdfSU5KRUNUSU9OX1RPS0VOIH0gZnJvbSAnLi9uZ3gtc2Nyb2xsLXBvc2l0aW9uLXJlc3RvcmF0aW9uLWNvbmZpZy1pbmplY3Rpb24tdG9rZW4nO1xuaW1wb3J0IHsgTmd4U2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvblNlcnZpY2UgfSBmcm9tICcuL25neC1zY3JvbGwtcG9zaXRpb24tcmVzdG9yYXRpb24uc2VydmljZSc7XG5cbkBOZ01vZHVsZSh7XG4gIGRlY2xhcmF0aW9uczogW1xuICAgIEN1c3RvbVJvdXRlck91dGxldERpcmVjdGl2ZVxuICBdLFxuICBleHBvcnRzOiBbXG4gICAgQ3VzdG9tUm91dGVyT3V0bGV0RGlyZWN0aXZlXG4gIF0sXG4gIHByb3ZpZGVyczogW1xuICAgIE5neFNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb25TZXJ2aWNlXG4gIF1cbn0pXG5leHBvcnQgY2xhc3MgTmd4U2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbk1vZHVsZSB7XG5cbiAgLyoqXG4gICAqIFNpbmNlIE5neFNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb25Nb2R1bGUgY2FuIGJlIGltcG9ydGVkIGluIGNoaWxkIG1vZHVsZXMsIGl0IGlzIG5lZWRlZCB0byB0cmFjayBpZiB0aGUgbmd4U2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvblNlcnZpY2UgaGFzIGJlZW4gYWxyZWFkeSBpbml0aWFsaXplZCB0byBhdm9pZCBkdXBsaWNhdGUgY2FsbHMgb2YgdGhlIGBpbml0aWFsaXplYCBtZXRob2QuIFxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0aWMgc2VydmljZUluaXRpYWxpemVkID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3Iobmd4U2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvblNlcnZpY2U6IE5neFNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb25TZXJ2aWNlKSB7XG4gICAgaWYgKCFOZ3hTY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uTW9kdWxlLnNlcnZpY2VJbml0aWFsaXplZCkge1xuICAgICAgbmd4U2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvblNlcnZpY2UuaW5pdGlhbGl6ZSgpO1xuICAgICAgTmd4U2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbk1vZHVsZS5zZXJ2aWNlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBmb3JSb290KGNvbmZpZz86IE5neFNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb25Db25maWcpOiBNb2R1bGVXaXRoUHJvdmlkZXJzPE5neFNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb25Nb2R1bGU+IHtcbiAgICByZXR1cm4gKHtcbiAgICAgIG5nTW9kdWxlOiBOZ3hTY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uTW9kdWxlLFxuICAgICAgcHJvdmlkZXJzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBwcm92aWRlOiBOR1hfU0NST0xMX1BPU0lUSU9OX1JFU1RPUkFUSU9OX0NPTkZJR19JTkpFQ1RJT05fVE9LRU4sXG4gICAgICAgICAgdXNlVmFsdWU6IE9iamVjdC5hc3NpZ24oZGVmYXVsdE5neFNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb25Db25maWcsIGNvbmZpZylcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG59XG4iXX0=