# NgxScrollPositionRestoration

[![NPM](https://img.shields.io/npm/v/ngx-scroll-position-restoration?label=NPM&color=blue)](https://www.npmjs.com/package/ngx-scroll-position-restoration "View this project on NPM.") [![NPM downloads](https://img.shields.io/npm/dt/ngx-scroll-position-restoration?label=NPM%20downloads)](https://www.npmjs.com/package/ngx-scroll-position-restoration "View this project on NPM.")

## Scroll position restoration in Angular.

The library supports scroll position restoration on:
- Any scrollable element
- Lazy loading content
- Named router-outlets (multiple router-outlets)
- Child routes (nested router-outlets)
- Backward and forward navigation

## [View the demo](https://thejlifex.github.io/ngx-scroll-position-restoration/)

## Installation
```sh
npm install ngx-scroll-position-restoration --save
```

## Usage
### Step 01: Import the `NgxScrollPositionRestorationModule` to your root module.
**app.module.ts**
```ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';

// Import NgxScrollPositionRestorationModule
import { NgxScrollPositionRestorationModule } from 'ngx-scroll-position-restoration';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    NgxScrollPositionRestorationModule.forRoot() // Import NgxScrollPositionRestorationModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```
### Step 02: In your `AppRoutingModule` disable the Angular default scroll position restoration.
**app-routing.module.ts**
```ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [];

@NgModule({
  imports: [
    RouterModule.forRoot(
      routes,
      {
        scrollPositionRestoration: 'disabled' // Here
      }
    )
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
```
### Optional Step 03: Import the `NgxScrollPositionRestorationModule` to any child module containing child routes. For example:
**page-b.module.ts**
```ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PageBRoutingModule } from './page-b-routing.module';
import { PageBComponent } from './page-b.component';

// Import NgxScrollPositionRestorationModule
import { NgxScrollPositionRestorationModule } from 'ngx-scroll-position-restoration';

@NgModule({
  declarations: [
    PageBComponent
  ],
  imports: [
    CommonModule,
    PageBRoutingModule,
    NgxScrollPositionRestorationModule // Import NgxScrollPositionRestorationModule
  ]
})
export class PageBModule { }
```
**page-b-routing.module.ts**
```ts
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
```
See: [projects\demo-app\src\app\page-b\\](https://github.com/TheJLifeX/ngx-scroll-position-restoration/tree/17fcc4aeb2c7ca0220467e00632628a86311b79b/projects/demo-app/src/app/page-b) folder.

## Documentation
### NgxScrollPositionRestorationModule class
```ts
class NgxScrollPositionRestorationModule {
    static forRoot(config?: NgxScrollPositionRestorationConfig);
}
```

### NgxScrollPositionRestorationConfig interface
```ts
interface NgxScrollPositionRestorationConfig {
  /**
   * Define how long to poll the document after a route change in order to look for elements that need to be restored to a previous scroll position. Value in milliseconds.
   * 
   * @default
   * 3000 // 3 seconds
   */
  pollDuration?: number;
  /**
   * Define the cadence to pool the document to restore previous scroll positions (maximum until the `pollDuration`). Value in milliseconds.
   * 
   * @default
   * 50
   */
  pollCadence?: number;
  /**
   * Debugging.
   * 
   * @default
   * false
   */
  debug?: boolean;
}
```

## License
MIT