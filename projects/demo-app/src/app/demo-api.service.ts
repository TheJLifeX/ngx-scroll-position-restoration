import { Injectable, OnDestroy } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { delay, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DemoApiService implements OnDestroy {

  private serviceDestroyed$ = new Subject();

  constructor() { }

  simulateLoadData(): Observable<string[]> {
    const simulatedRequestTime = Math.floor(150 + (Math.random() * 300));
    return of([]).pipe(
      takeUntil(this.serviceDestroyed$),
      delay(simulatedRequestTime)
    );
  }

  ngOnDestroy(): void {
    this.serviceDestroyed$.next();
    this.serviceDestroyed$.complete();
  }
}
