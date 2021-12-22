import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PageARoutingModule } from './page-a-routing.module';
import { PageAComponent } from './page-a.component';

@NgModule({
  declarations: [
    PageAComponent
  ],
  imports: [
    CommonModule,
    PageARoutingModule
  ]
})
export class PageAModule { }
