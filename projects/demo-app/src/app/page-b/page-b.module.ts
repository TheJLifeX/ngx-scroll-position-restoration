import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PageBRoutingModule } from './page-b-routing.module';
import { PageBComponent } from './page-b.component';


@NgModule({
  declarations: [
    PageBComponent
  ],
  imports: [
    CommonModule,
    PageBRoutingModule
  ]
})
export class PageBModule { }
