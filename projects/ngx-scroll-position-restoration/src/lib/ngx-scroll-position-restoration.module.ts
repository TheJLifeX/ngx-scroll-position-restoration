import { ModuleWithProviders, NgModule } from '@angular/core';
import { CustomRouterOutletDirective } from './custom-router-outlet.directive';
import { defaultNgxScrollPositionRestorationConfig } from './default-ngx-scroll-position-restoration-config';
import { NgxScrollPositionRestorationConfig } from './ngx-scroll-position-restoration-config';
import { NGX_SCROLL_POSITION_RESTORATION_CONFIG_INJECTION_TOKEN } from './ngx-scroll-position-restoration-config-injection-token';
import { NgxScrollPositionRestorationService } from './ngx-scroll-position-restoration.service';

@NgModule({
  declarations: [
    CustomRouterOutletDirective
  ],
  exports: [
    CustomRouterOutletDirective
  ],
  providers: [
    NgxScrollPositionRestorationService
  ]
})
export class NgxScrollPositionRestorationModule {

  /**
   * Since NgxScrollPositionRestorationModule can be imported in child modules, it is needed to track if the ngxScrollPositionRestorationService has been already initialized to avoid duplicate calls of the `initialize` method. 
   */
  private static serviceInitialized = false;

  constructor(ngxScrollPositionRestorationService: NgxScrollPositionRestorationService) {
    if (!NgxScrollPositionRestorationModule.serviceInitialized) {
      ngxScrollPositionRestorationService.initialize();
      NgxScrollPositionRestorationModule.serviceInitialized = true;
    }
  }

  static forRoot(config?: NgxScrollPositionRestorationConfig): ModuleWithProviders<NgxScrollPositionRestorationModule> {
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
