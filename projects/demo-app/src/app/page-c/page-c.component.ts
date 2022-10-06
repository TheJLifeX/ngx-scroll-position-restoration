import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DemoApiService } from '../demo-api.service';

@Component({
  templateUrl: './page-c.component.html',
  styleUrls: ['./page-c.component.scss']
})
export class PageCComponent implements OnInit, OnDestroy {

  loading: boolean = false;
  pageName: string = 'Page C';

  private componentDestroyed$ = new Subject<void>();

  constructor(private demoApiService: DemoApiService) { }

  ngOnInit(): void {
    this.loading = true;
    this.demoApiService.simulateLoadData().pipe(
      takeUntil(this.componentDestroyed$)
    ).subscribe(() => this.loading = false);
  }

  ngOnDestroy(): void {
    this.componentDestroyed$.next();
    this.componentDestroyed$.complete();
  }
}
