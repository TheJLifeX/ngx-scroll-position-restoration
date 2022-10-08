import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  templateUrl: './details-page.component.html',
  styleUrls: ['./details-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailsPageComponent implements OnInit {

  cardId!: string;

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.cardId = this.route.snapshot.params['id'];
  }
}
