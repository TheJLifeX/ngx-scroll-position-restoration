import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PageBTabAComponent } from './page-b-tab-a/page-b-tab-a.component';
import { PageBTabBComponent } from './page-b-tab-b/page-b-tab-b.component';
import { PageBComponent } from './page-b.component';

const routes: Routes = [
  {
    path: '', component: PageBComponent,
    children: [
      {
        path: 'tab-a',
        component: PageBTabAComponent
      },
      {
        path: 'tab-b',
        component: PageBTabBComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PageBRoutingModule { }
