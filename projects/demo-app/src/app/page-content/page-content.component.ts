import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';

@Component({
  selector: 'app-page-content',
  templateUrl: './page-content.component.html',
  styleUrls: ['./page-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageContentComponent implements OnInit {

  @Input() pageName!: string;
  @Input() loading!: boolean;
  @Input() actionRouterLink?: any[];
  @Input() actionName?: string;
  /**
   * actionRouterLink with card id.
   */
  @Input() withCardId: boolean = false;

  items = new Array(100);

  constructor() { }

  ngOnInit(): void { }
}
