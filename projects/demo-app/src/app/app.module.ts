import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxScrollPositionRestorationModule } from 'ngx-scroll-position-restoration';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxScrollPositionRestorationModule.forRoot({
      debug: true
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
