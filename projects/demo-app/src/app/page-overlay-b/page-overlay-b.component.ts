import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DemoApiService } from '../demo-api.service';

@Component({
  selector: 'app-page-overlay-b',
  templateUrl: './page-overlay-b.component.html',
  styleUrls: ['./page-overlay-b.component.scss']
})
export class PageOverlayBComponent implements OnInit, OnDestroy {

  loading!: boolean;
  items!: string[];

  private componentDestroyed$ = new Subject<void>();

  constructor(private demoApiService: DemoApiService) { }

  ngOnInit(): void {
    this.loading = true;
    this.demoApiService.getData('Page Overlay B').pipe(
      takeUntil(this.componentDestroyed$)
    ).subscribe(items => {
      this.items = items;
      this.loading = false;
    });
  }

  ngOnDestroy(): void {
    this.componentDestroyed$.next();
    this.componentDestroyed$.complete();
  }

}
