import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DetailsPageRoutingModule } from './details-page-routing.module';
import { DetailsPageComponent } from './details-page.component';


@NgModule({
  declarations: [DetailsPageComponent],
  imports: [
    CommonModule,
    DetailsPageRoutingModule
  ]
})
export class DetailsPageModule { }
