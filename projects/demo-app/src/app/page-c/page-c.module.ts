import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PageCRoutingModule } from './page-c-routing.module';
import { PageCComponent } from './page-c.component';


@NgModule({
  declarations: [
    PageCComponent
  ],
  imports: [
    CommonModule,
    PageCRoutingModule
  ]
})
export class PageCModule { }
