import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'page-a'
  },
  { path: 'page-a', loadChildren: () => import('./page-a/page-a.module').then(m => m.PageAModule) },
  { path: 'page-b', loadChildren: () => import('./page-b/page-b.module').then(m => m.PageBModule) },
  { path: 'page-c', loadChildren: () => import('./page-c/page-c.module').then(m => m.PageCModule) },
  {
    outlet: 'secondary',
    path: 'page-overlay-a',
    loadChildren: () => import('./page-overlay-a/page-overlay-a.module').then(m => m.PageOverlayAModule)
  },
  {
    outlet: 'secondary',
    path: 'page-overlay-b',
    loadChildren: () => import('./page-overlay-b/page-overlay-b.module').then(m => m.PageOverlayBModule)
  },
  { path: 'details-page/:id', loadChildren: () => import('./details-page/details-page.module').then(m => m.DetailsPageModule) },
  {
    path: '**',
    redirectTo: 'page-a'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(
      routes,
      {
        scrollPositionRestoration: 'disabled',
        /**
         * @todo: Check if the library supports (works well with) anchor scrolling (enabled).
         */
        anchorScrolling: 'enabled'
      }
    )
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
