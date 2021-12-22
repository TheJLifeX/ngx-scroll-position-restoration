import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PageOverlayAComponent } from './page-overlay-a.component';

const routes: Routes = [{ path: '', component: PageOverlayAComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PageOverlayARoutingModule { }
