import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PageBRoutingModule } from './page-b-routing.module';
import { PageBComponent } from './page-b.component';
import { NgxScrollPositionRestorationModule } from 'ngx-scroll-position-restoration';
import { PageBTabAComponent } from './page-b-tab-a/page-b-tab-a.component';
import { PageBTabBComponent } from './page-b-tab-b/page-b-tab-b.component';


@NgModule({
  declarations: [
    PageBComponent,
    PageBTabAComponent,
    PageBTabBComponent
  ],
  imports: [
    CommonModule,
    PageBRoutingModule,
    NgxScrollPositionRestorationModule
  ]
})
export class PageBModule { }
