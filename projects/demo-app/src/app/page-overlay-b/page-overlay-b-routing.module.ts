import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PageOverlayBComponent } from './page-overlay-b.component';

const routes: Routes = [{ path: '', component: PageOverlayBComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PageOverlayBRoutingModule { }
