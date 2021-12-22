import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PageOverlayBRoutingModule } from './page-overlay-b-routing.module';
import { PageOverlayBComponent } from './page-overlay-b.component';


@NgModule({
  declarations: [
    PageOverlayBComponent
  ],
  imports: [
    CommonModule,
    PageOverlayBRoutingModule
  ]
})
export class PageOverlayBModule { }
