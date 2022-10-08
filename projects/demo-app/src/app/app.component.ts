import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  secondaryRouterOutletContainer: boolean = false;

  links = [
    {
      name: 'Page A',
      url: '/page-a'
    },
    {
      name: 'Page B (with Tabs)',
      url: '/page-b'
    },
    {
      name: 'Page C',
      url: '/page-c'
    },
    {
      name: 'Page Overlay A',
      url: ['/', { outlets: { secondary: 'page-overlay-a' } }]
    }
  ];

  constructor(
    private titleService: Title,
    private locationService: Location
  ) { }

  ngOnInit(): void {
    this.locationService.onUrlChange((url) => {
      this.titleService.setTitle(`${url.replace('/ngx-scroll-position-restoration', '')} - Demo app - NgxScrollPositionRestoration`);
    });
  }
}
