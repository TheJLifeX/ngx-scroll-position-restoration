import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  templateUrl: './page-b-tab-b.component.html',
  styleUrls: ['./page-b-tab-b.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageBTabBComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
