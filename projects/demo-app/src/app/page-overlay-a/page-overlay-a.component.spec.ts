import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageOverlayAComponent } from './page-overlay-a.component';

describe('PageOverlayAComponent', () => {
  let component: PageOverlayAComponent;
  let fixture: ComponentFixture<PageOverlayAComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PageOverlayAComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PageOverlayAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
