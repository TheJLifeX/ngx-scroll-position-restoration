import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PageOverlayBRoutingModule } from './page-overlay-b-routing.module';
import { PageOverlayBComponent } from './page-overlay-b.component';
import { PageContentModule } from '../page-content/page-content.module';

@NgModule({
  declarations: [
    PageOverlayBComponent
  ],
  imports: [
    CommonModule,
    PageOverlayBRoutingModule,
    PageContentModule
  ]
})
export class PageOverlayBModule { }
