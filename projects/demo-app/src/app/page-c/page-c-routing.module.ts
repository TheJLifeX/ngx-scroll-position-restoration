import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PageCComponent } from './page-c.component';

const routes: Routes = [{ path: '', component: PageCComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PageCRoutingModule { }
