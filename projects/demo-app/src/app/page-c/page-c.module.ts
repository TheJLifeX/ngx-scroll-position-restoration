import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageCRoutingModule } from './page-c-routing.module';
import { PageCComponent } from './page-c.component';
import { PageContentModule } from '../page-content/page-content.module';

@NgModule({
  declarations: [
    PageCComponent
  ],
  imports: [
    CommonModule,
    PageCRoutingModule,
    PageContentModule
  ]
})
export class PageCModule { }
