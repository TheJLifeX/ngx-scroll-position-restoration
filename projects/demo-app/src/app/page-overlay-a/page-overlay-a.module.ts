import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageOverlayARoutingModule } from './page-overlay-a-routing.module';
import { PageOverlayAComponent } from './page-overlay-a.component';
import { PageContentModule } from '../page-content/page-content.module';

@NgModule({
  declarations: [
    PageOverlayAComponent
  ],
  imports: [
    CommonModule,
    PageOverlayARoutingModule,
    PageContentModule
  ]
})
export class PageOverlayAModule { }
