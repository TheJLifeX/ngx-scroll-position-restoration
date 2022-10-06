import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DemoApiService } from '../demo-api.service';

@Component({
  templateUrl: './page-a.component.html',
  styleUrls: ['./page-a.component.scss']
})
export class PageAComponent implements OnInit {

  loading: boolean = false;
  pageName: string = 'Page A';

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
