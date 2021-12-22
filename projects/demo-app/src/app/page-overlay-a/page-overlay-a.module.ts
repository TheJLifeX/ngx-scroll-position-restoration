import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PageOverlayARoutingModule } from './page-overlay-a-routing.module';
import { PageOverlayAComponent } from './page-overlay-a.component';


@NgModule({
  declarations: [
    PageOverlayAComponent
  ],
  imports: [
    CommonModule,
    PageOverlayARoutingModule
  ]
})
export class PageOverlayAModule { }
