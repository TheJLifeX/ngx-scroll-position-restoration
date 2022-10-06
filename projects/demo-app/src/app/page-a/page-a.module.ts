import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageARoutingModule } from './page-a-routing.module';
import { PageAComponent } from './page-a.component';
import { PageContentModule } from '../page-content/page-content.module';

@NgModule({
  declarations: [
    PageAComponent
  ],
  imports: [
    CommonModule,
    PageARoutingModule,
    PageContentModule
  ]
})
export class PageAModule { }
