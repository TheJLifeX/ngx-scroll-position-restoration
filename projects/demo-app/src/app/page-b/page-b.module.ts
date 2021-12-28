import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PageBRoutingModule } from './page-b-routing.module';
import { PageBComponent } from './page-b.component';
import { NgxScrollPositionRestorationModule } from 'ngx-scroll-position-restoration';


@NgModule({
  declarations: [
    PageBComponent
  ],
  imports: [
    CommonModule,
    PageBRoutingModule,
    NgxScrollPositionRestorationModule
  ]
})
export class PageBModule { }
