import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DemoApiService {

  constructor() { }

  getData(pageName: string): Observable<string[]> {
    return new Observable((subcriber) => {
      const simulatedRequestTime = Math.floor(300 + (Math.random() * 1000));
      setTimeout(() => {
        const items = [];
        for (var i = 0; i < 100; i++) {
          items.push(`Item ${i} for: ${pageName}.`);
        }
        subcriber.next(items);
      }, simulatedRequestTime);
    });
  }
}
