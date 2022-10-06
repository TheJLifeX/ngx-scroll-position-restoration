import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  templateUrl: './page-b-tab-a.component.html',
  styleUrls: ['./page-b-tab-a.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageBTabAComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
