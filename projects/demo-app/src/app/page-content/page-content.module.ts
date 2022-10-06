import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageContentComponent } from './page-content.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    PageContentComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    PageContentComponent
  ]
})
export class PageContentModule { }
